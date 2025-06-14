"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWorkflow = exports.processNodeInExecutor = void 0;
// src/utils/workflowExecutorService.ts
const types_1 = require("../../types");
const llmService_1 = require("../../llmService");
const utils_1 = require("../utils");
const constants_1 = require("../../constants");
const substitutePlaceholdersInExecutor = (text, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap) => {
    let substitutedText = text;
    const allVars = new Map([
        ...systemVariablesMap,
        ...projectVariablesMap,
        ...nodeVariables
    ]);
    allVars.forEach((value, key) => {
        const placeholder = `{${key}}`;
        substitutedText = substitutedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    substitutedText = substitutedText.replace(/{PREVIOUS_OUTPUT}/g, previousOutput);
    return substitutedText;
};
const processNodeInExecutor = async ({ node, previousOutput, settings, nodeVariables, projectVariablesMap, systemVariablesMap, callbacks, pathId, projectNodes, onPathCounterManagedByNode, }) => {
    if (callbacks.isStopRequested())
        throw new Error('Workflow stopped by user.');
    node.isRunning = true;
    node.hasError = false;
    callbacks.onNodeStatusUpdate(node.id, { isRunning: true, hasError: false });
    callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'running', startTime: new Date().toISOString(), pathId });
    let output = previousOutput;
    let promptSent = `Input: ${previousOutput}`;
    let tokensUsedThisStep = 0;
    try {
        if (node.type === types_1.NodeType.START || node.type === types_1.NodeType.PROMPT || node.type === types_1.NodeType.CONDITIONAL) {
            promptSent = substitutePlaceholdersInExecutor(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
            const llmResponse = await (0, llmService_1.executePrompt)(promptSent, settings);
            output = llmResponse.text;
            tokensUsedThisStep = llmResponse.usageMetadata?.totalTokenCount || 0;
        }
        else if (node.type === types_1.NodeType.VARIABLE) {
            const sanitizedVarName = (0, utils_1.sanitizeVariableName)(node.name);
            if (!sanitizedVarName)
                throw new Error(`Variable node "${node.name}" has invalid name.`);
            nodeVariables.set(sanitizedVarName, previousOutput);
            output = previousOutput;
            promptSent = `Stored input as '${sanitizedVarName}'`;
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'variable_set', output, endTime: new Date().toISOString(), pathId });
        }
        else if (node.type === types_1.NodeType.QUESTION) {
            promptSent = substitutePlaceholdersInExecutor(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'awaiting_input', output: 'Waiting for user...', pathId });
            const userInput = await callbacks.onRequestUserInput(promptSent, node.id);
            if (callbacks.isStopRequested())
                throw new Error('Workflow stopped by user during question input.');
            output = userInput;
        }
        else if (node.type === types_1.NodeType.JAVASCRIPT) {
            const userCode = node.code || constants_1.INITIAL_JAVASCRIPT_NODE_CODE;
            promptSent = `Executing JavaScript: ${node.prompt || node.name}`;
            const nodeVarsObject = Object.fromEntries(nodeVariables.entries());
            const projectVarsObject = Object.fromEntries(projectVariablesMap.entries());
            const func = new Function('previousOutput', 'nodeVariables', 'projectVariables', `return (async (previousOutput, nodeVariables, projectVariables) => { ${userCode} })(previousOutput, nodeVariables, projectVariables);`);
            const result = await func(previousOutput, nodeVarsObject, projectVarsObject);
            output = (typeof result === 'string') ? result : (result === undefined || result === null) ? '' : JSON.stringify(result);
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'javascript_executed', output, endTime: new Date().toISOString(), pathId });
        }
        else if (node.type === types_1.NodeType.PARALLEL) {
            promptSent = `Forking execution from: ${node.prompt || constants_1.INITIAL_PARALLEL_NODE_DESCRIPTION}`;
            output = previousOutput;
            const branchCount = node.parallelNextNodeIds?.length || 0;
            if (branchCount > 0) {
                // console.log(`[[[[SVC_PARALLEL_INC]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}). Counter BEFORE INCREMENT (from CB): ${callbacks.getParallelPathCounter()}`);
                callbacks.incrementParallelPathCounter(branchCount);
                // console.log(`[[[[SVC_PARALLEL_AFTER_INC]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}). Counter AFTER INCREMENT by ${branchCount} (from CB): ${callbacks.getParallelPathCounter()}`);
                callbacks.onLogEntry({
                    nodeId: node.id, nodeName: node.name,
                    status: 'parallel_executed',
                    output: `Incremented parallel counter by ${branchCount}. PARALLEL_COUNTER_IS_NOW: ${callbacks.getParallelPathCounter()}`,
                    endTime: new Date().toISOString(), pathId
                });
            }
            else {
                callbacks.onLogEntry({
                    nodeId: node.id, nodeName: node.name,
                    status: 'parallel_executed',
                    output: 'No branches to fork. Parallel counter unchanged.',
                    endTime: new Date().toISOString(), pathId
                });
            }
            onPathCounterManagedByNode();
        }
        else if (node.type === types_1.NodeType.SYNCHRONIZE) {
            // console.log(`[[[[SVC_SYNC_ARRIVE]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}). Counter BEFORE DECREMENT (from CB): ${callbacks.getParallelPathCounter()}`);
            callbacks.decrementParallelPathCounter();
            onPathCounterManagedByNode();
            const counterAfterDecrement = callbacks.getParallelPathCounter();
            // console.log(`[[[[SVC_SYNC_AFTER_DEC]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}). Counter AFTER DECREMENT (from CB): ${counterAfterDecrement}`);
            callbacks.decrementActiveExecutionCount(); // Path is now waiting
            const logMessage = `PATH ${pathId.split('-').pop()}: Arrived. PARALLEL_COUNTER_IS_NOW: ${counterAfterDecrement}. Waiting for other paths. ActiveExec: ${callbacks.getActiveExecutionCount()}`;
            callbacks.onLogEntry({
                nodeId: node.id,
                nodeName: node.name,
                status: 'synchronize_awaiting',
                output: logMessage,
                pathId
            });
            // console.log(`[[[[SVC_SYNC_WAITING_LOOP_START]]]] Path: ${pathId}, Node: ${node.name}. Current Parallel Counter (from CB): ${callbacks.getParallelPathCounter()}, ActiveExec: ${callbacks.getActiveExecutionCount()}`);
            while (callbacks.getParallelPathCounter() > 0 && !callbacks.isStopRequested()) {
                await new Promise(resolve => setTimeout(resolve, 150));
                // console.log(`[[[[SVC_SYNC_POLLING]]]] Path: ${pathId}, Node: ${node.name}. Still waiting. Parallel Counter (from CB): ${callbacks.getParallelPathCounter()}`);
            }
            // console.log(`[[[[SVC_SYNC_WAITING_LOOP_END]]]] Path: ${pathId}, Node: ${node.name}. Loop finished. Stop Requested: ${callbacks.isStopRequested()}, Parallel Counter (from CB): ${callbacks.getParallelPathCounter()}`);
            if (callbacks.isStopRequested()) {
                callbacks.incrementActiveExecutionCount(); // Balance the earlier decrement before throwing
                throw new Error("Workflow stopped by user while at synchronize node.");
            }
            callbacks.incrementActiveExecutionCount(); // Path is resuming
            output = "continue"; // Synchronize nodes typically don't merge outputs, just signal continuation
            const finalCounterVal = callbacks.getParallelPathCounter();
            promptSent = `All parallel paths globally completed (counter from CB: ${finalCounterVal}). Path ${pathId.split('-').pop()} resuming. Outputting "${output}". Active executions: ${callbacks.getActiveExecutionCount()}`;
            callbacks.onLogEntry({
                nodeId: node.id,
                nodeName: node.name,
                status: 'synchronize_resumed',
                output: promptSent,
                endTime: new Date().toISOString(),
                pathId
            });
            // console.log(`[[[[SVC_SYNC_RESUMED]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}) resumed. Parallel counter (from CB): ${finalCounterVal}, Active executions: ${callbacks.getActiveExecutionCount()}`);
        }
        else if (node.type === types_1.NodeType.CONCLUSION) {
            // console.log(`[[[[SVC_CONCLUSION_DEC_BEFORE]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}). Counter BEFORE DECREMENT (from CB): ${callbacks.getParallelPathCounter()}`);
            callbacks.decrementParallelPathCounter();
            onPathCounterManagedByNode();
            const counterAfterDecrementConclusion = callbacks.getParallelPathCounter();
            // console.log(`[[[[SVC_CONCLUSION_DEC_AFTER]]]] Path: ${pathId}, Node: ${node.name} (ID: ${node.id}). Counter AFTER DECREMENT (from CB): ${counterAfterDecrementConclusion}`);
            const template = node.outputFormatTemplate || '{PREVIOUS_OUTPUT}';
            output = substitutePlaceholdersInExecutor(template, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
            promptSent = `Displaying output for: ${node.prompt || constants_1.INITIAL_CONCLUSION_NODE_TITLE}`;
            callbacks.onLogEntry({
                nodeId: node.id,
                nodeName: node.name,
                status: 'completed',
                output: `Conclusion reached. PARALLEL_COUNTER_IS_NOW: ${counterAfterDecrementConclusion}. Output: ${output.substring(0, 100)}${output.length > 100 ? "..." : ""}`,
                endTime: new Date().toISOString(),
                pathId
            });
            callbacks.onConclusion({ title: node.prompt || constants_1.INITIAL_CONCLUSION_NODE_TITLE, content: output });
        }
        else {
            throw new Error(`Unknown or unhandled node type ${node.type}`);
        }
        callbacks.onTokenUpdate(tokensUsedThisStep);
        if (node.type !== types_1.NodeType.VARIABLE && node.type !== types_1.NodeType.JAVASCRIPT && node.type !== types_1.NodeType.PARALLEL && node.type !== types_1.NodeType.SYNCHRONIZE && node.type !== types_1.NodeType.CONCLUSION) {
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output, tokensUsed: tokensUsedThisStep, endTime: new Date().toISOString(), pathId });
        }
        node.lastRunOutput = output;
        node.isRunning = false;
        node.hasError = false;
        callbacks.onNodeStatusUpdate(node.id, { isRunning: false, hasError: false, lastRunOutput: output });
        return { output, tokensUsed: tokensUsedThisStep, promptSent };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'failed', error: errorMessage, endTime: new Date().toISOString(), pathId });
        node.lastRunOutput = `Error: ${errorMessage}`;
        node.isRunning = false;
        node.hasError = true;
        callbacks.onNodeStatusUpdate(node.id, { isRunning: false, hasError: true, lastRunOutput: `Error: ${errorMessage}` });
        throw error;
    }
};
exports.processNodeInExecutor = processNodeInExecutor;
const executePathInExecutor = async ({ initialNode, initialInput, projectNodes, settings, baseNodeVariables, projectVariablesMap, systemVariablesMap, callbacks, pathId, }) => {
    callbacks.incrementActiveExecutionCount();
    const pathNodeVariables = new Map(baseNodeVariables);
    const pathSteps = [];
    let pathTokens = 0;
    let currentOutput = initialInput;
    let currentNode = initialNode;
    const visitCounts = new Map();
    const MAX_VISITS = 10;
    let lastProcessedActualNode = undefined;
    let pathCounterDecrementedByNodeInPath = false;
    // console.log(`[[[[SVC_PATH_START]]]] Path: ${pathId} STARTING execution. Initial Node: ${initialNode.name} (ID: ${initialNode.id}). Active executions: ${callbacks.getActiveExecutionCount()}`);
    try {
        while (currentNode) {
            if (callbacks.isStopRequested())
                throw new Error('Workflow stopped by user.');
            const visitCount = (visitCounts.get(currentNode.id) || 0) + 1;
            if (visitCount > MAX_VISITS)
                throw new Error(`Loop detected or node "${currentNode.name}" (Path: ${pathId}) executed > ${MAX_VISITS} times.`);
            visitCounts.set(currentNode.id, visitCount);
            lastProcessedActualNode = currentNode;
            pathCounterDecrementedByNodeInPath = false;
            const processResult = await (0, exports.processNodeInExecutor)({
                node: currentNode,
                previousOutput: currentOutput,
                settings,
                nodeVariables: pathNodeVariables,
                projectVariablesMap,
                systemVariablesMap,
                callbacks,
                pathId,
                projectNodes,
                onPathCounterManagedByNode: () => {
                    // console.log(`[[[[SVC_PATH_NODE_MANAGED_COUNTER]]]] Path: ${pathId}, Node: ${lastProcessedActualNode?.name} (ID: ${lastProcessedActualNode?.id}) is managing counter. Flag set.`);
                    pathCounterDecrementedByNodeInPath = true;
                }
            });
            currentOutput = processResult.output;
            pathTokens += processResult.tokensUsed;
            pathSteps.push({
                nodeId: currentNode.id,
                nodeName: currentNode.name,
                promptSent: processResult.promptSent,
                responseReceived: currentOutput,
                timestamp: new Date().toISOString(),
                tokensUsed: processResult.tokensUsed,
                pathId,
            });
            let nextNodeId = null;
            if (currentNode.type === types_1.NodeType.PARALLEL) {
                const parallelNodeIdsToExecute = currentNode.parallelNextNodeIds || [];
                const parallelPromises = [];
                for (const pNodeId of parallelNodeIdsToExecute) {
                    const nextNodeForBranch = projectNodes.find(n => n.id === pNodeId);
                    if (nextNodeForBranch) {
                        parallelPromises.push(executePathInExecutor({
                            initialNode: nextNodeForBranch,
                            initialInput: currentOutput,
                            projectNodes, settings, baseNodeVariables: pathNodeVariables, projectVariablesMap, systemVariablesMap,
                            callbacks,
                            pathId: `${pathId}-branch-${pNodeId.substring(0, 4)}`,
                        }));
                    }
                }
                const parallelResults = await Promise.allSettled(parallelPromises);
                parallelResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        pathSteps.push(...result.value.steps);
                        pathTokens += result.value.tokens;
                    }
                    else {
                        callbacks.onLogEntry({ nodeId: currentNode?.id || 'parallel_node', nodeName: currentNode?.name || 'Parallel Node', status: 'failed', error: `A parallel branch failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`, pathId });
                    }
                });
                currentNode = undefined;
            }
            else if (currentNode.type === types_1.NodeType.CONDITIONAL) {
                const branches = currentNode.branches || [];
                let matchedBranch = branches.find(branch => {
                    const condition = branch.condition.toLowerCase();
                    const llmOutput = currentOutput.toLowerCase();
                    if (condition.startsWith('contains '))
                        return llmOutput.includes(condition.substring(9).trim());
                    if (condition.startsWith('starts with '))
                        return llmOutput.startsWith(condition.substring(12).trim());
                    return llmOutput === condition;
                });
                if (!matchedBranch)
                    matchedBranch = branches.find(branch => branch.condition.toLowerCase() === 'default');
                nextNodeId = matchedBranch?.nextNodeId;
            }
            else if (currentNode.type !== types_1.NodeType.CONCLUSION) {
                nextNodeId = currentNode.nextNodeId;
            }
            if (nextNodeId) {
                const foundNode = projectNodes.find(n => n.id === nextNodeId);
                if (!foundNode) {
                    callbacks.onLogEntry({ nodeId: nextNodeId, nodeName: "Unknown Node", status: 'skipped', error: "Next node ID not found.", pathId, endTime: new Date().toISOString() });
                    currentNode = undefined;
                }
                else {
                    currentNode = foundNode;
                }
            }
            else {
                // if (currentNode && currentNode.type !== NodeType.PARALLEL) {
                //      console.log(`[[[[SVC_PATH_END_SEGMENT]]]] Path: ${pathId}, Node: ${currentNode.name} (ID: ${currentNode.id}) is end of this segment. Output: ${currentOutput.substring(0,50)}...`);
                // }
                currentNode = undefined;
            }
        }
        return { finalOutput: currentOutput, steps: pathSteps, tokens: pathTokens, status: 'completed' };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { finalOutput: currentOutput, steps: pathSteps, tokens: pathTokens, status: message === 'Workflow stopped by user.' ? 'stopped' : 'failed' };
    }
    finally {
        // console.log(`[[[[SVC_PATH_FINALLY]]]] Path: ${pathId}, LastProcessedNode: ${lastProcessedActualNode?.name} (Type: ${lastProcessedActualNode?.type}), DecrementedByNodeFlag: ${pathCounterDecrementedByNodeInPath}`);
        if (!pathCounterDecrementedByNodeInPath) {
            // const oldFinallyCounter = callbacks.getParallelPathCounter();
            callbacks.decrementParallelPathCounter(); // This is the fallback decrement
            // console.log(`[[[[SVC_PATH_FINALLY_DEC]]]] Path: ${pathId} DECREMENTING via finally. Old (CB): ${oldFinallyCounter}, New (CB): ${callbacks.getParallelPathCounter()}`);
        }
        // else {
        //   console.log(`[[[[SVC_PATH_FINALLY_NO_DEC]]]] Path: ${pathId}, Counter ALREADY handled by node. Current Counter (CB): ${callbacks.getParallelPathCounter()}`);
        // }
        callbacks.decrementActiveExecutionCount();
        // console.log(`[[[[SVC_PATH_END]]]] Path: ${pathId}, LastProcessedNode: ${lastProcessedActualNode?.name}. ActiveExec: ${callbacks.getActiveExecutionCount()}, ParallelCounter (CB): ${callbacks.getParallelPathCounter()}`);
    }
};
const executeWorkflow = async (project, appSettings, // Added appSettings parameter
callbacks) => {
    const projectCloneForExecution = (0, utils_1.deepClone)(project);
    projectCloneForExecution.nodes = (0, utils_1.getValidNodes)(projectCloneForExecution.nodes).map(n => ({ ...n, isRunning: false, hasError: false, lastRunOutput: undefined }));
    const initialNodesForRun = projectCloneForExecution.nodes;
    const baseNodeVariables = new Map();
    const projectVariablesMap = new Map(projectCloneForExecution.projectVariables?.map((pv) => [(0, utils_1.sanitizeVariableName)(pv.name), pv.value]) || []);
    const systemVariablesMap = new Map();
    const now = new Date();
    systemVariablesMap.set('CurrentDateTime', now.toLocaleString());
    // Add other system variables from appSettings if needed
    systemVariablesMap.set('LLMProvider', appSettings.llmProvider);
    let currentModelName = 'N/A';
    switch (appSettings.llmProvider) {
        case 'chatgpt':
            currentModelName = appSettings.chatGptModel || 'Not Set';
            break;
        case 'ollama':
            currentModelName = appSettings.ollamaModel || 'Not Set';
            break;
    }
    systemVariablesMap.set('LLMModel', currentModelName);
    const startNode = initialNodesForRun.find(n => n.type === types_1.NodeType.START);
    if (!startNode) {
        const errorMsg = 'No Start Node found.';
        callbacks.onLogEntry({ nodeId: 'workflow_error', nodeName: 'Workflow Error', status: 'failed', error: errorMsg, endTime: new Date().toISOString(), pathId: 'main' });
        return { status: 'failed', error: errorMsg, steps: [], totalTokensUsed: 0, updatedNodes: initialNodesForRun };
    }
    let overallPathTokens = 0;
    let overallPathSteps = [];
    try {
        const result = await executePathInExecutor({
            initialNode: startNode,
            initialInput: '',
            projectNodes: initialNodesForRun,
            settings: appSettings, // Pass appSettings here
            baseNodeVariables,
            projectVariablesMap,
            systemVariablesMap,
            callbacks,
            pathId: `main-${startNode.id.substring(0, 4)}`,
        });
        overallPathSteps.push(...result.steps);
        overallPathTokens += result.tokens;
        const finalNodesAfterExecution = initialNodesForRun.map(n => ({
            ...n,
            isRunning: false, // Ensure all nodes are marked not running
            // lastRunOutput is already updated by processNodeInExecutor for each node
        }));
        return {
            status: result.status,
            finalOutput: result.finalOutput,
            error: result.status === 'failed' ? 'Workflow path failed.' : (result.status === 'stopped' ? 'Workflow stopped.' : undefined),
            steps: overallPathSteps,
            totalTokensUsed: overallPathTokens,
            updatedNodes: finalNodesAfterExecution,
        };
    }
    catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown workflow execution error.';
        const finalUpdatedNodesOnError = initialNodesForRun.map(n => ({
            ...n,
            isRunning: false,
        }));
        return { status: 'failed', error: errorMsg, steps: overallPathSteps, totalTokensUsed: overallPathTokens, updatedNodes: finalUpdatedNodesOnError };
    }
};
exports.executeWorkflow = executeWorkflow;
