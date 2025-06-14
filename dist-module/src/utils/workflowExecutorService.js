"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWorkflow = exports.processNodeInExecutor = exports.substitutePlaceholdersInExecutor = void 0;
// src/utils/workflowExecutorService.ts
const engineTypes_1 = require("../engineTypes"); // Changed from ../../types
const llmService_1 = require("../llmService"); // Changed from ../../llmService
const utils_1 = require("../utils"); // Changed from ../../utils
const constants_1 = require("../constants"); // Changed from ../../constants
const substitutePlaceholdersInExecutor = (textToSubstitute, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap, allProjectNodes // New optional parameter
) => {
    let resultText = textToSubstitute;
    const allKnownVars = new Map([
        ...systemVariablesMap,
        ...projectVariablesMap,
        ...nodeVariables
    ]);
    const placeholderRegex = /{(\w+)}/g;
    resultText = resultText.replace(placeholderRegex, (match, key) => {
        // match is the full placeholder e.g. "{varName}"
        // key is the variable name e.g. "varName"
        if (key === 'PREVIOUS_OUTPUT') {
            return previousOutput;
        }
        if (allKnownVars.has(key)) {
            return allKnownVars.get(key);
        }
        if (allProjectNodes) {
            // Fallback: Check VARIABLE nodes in the entire project by their name
            const variableNode = allProjectNodes.find(n => n.type === engineTypes_1.NodeType.VARIABLE && n.name === key);
            if (variableNode && typeof variableNode.lastRunOutput === 'string') {
                return variableNode.lastRunOutput;
            }
        }
        return match; // Return original placeholder if not found
    });
    return resultText;
};
exports.substitutePlaceholdersInExecutor = substitutePlaceholdersInExecutor;
const processNodeInExecutor = async ({ node, previousOutput, settings, nodeVariables, projectVariablesMap, systemVariablesMap, callbacks, pathId, projectNodes, // This parameter already exists and contains all project nodes
onPathCounterManagedByNode, }) => {
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
        if (node.type === engineTypes_1.NodeType.START || node.type === engineTypes_1.NodeType.PROMPT || node.type === engineTypes_1.NodeType.CONDITIONAL) {
            promptSent = (0, exports.substitutePlaceholdersInExecutor)(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap, projectNodes);
            const llmResponse = await (0, llmService_1.executePrompt)(promptSent, settings);
            output = llmResponse.text;
            tokensUsedThisStep = llmResponse.usageMetadata?.totalTokenCount || 0;
        }
        else if (node.type === engineTypes_1.NodeType.VARIABLE) {
            const sanitizedVarName = (0, utils_1.sanitizeVariableName)(node.name);
            if (!sanitizedVarName)
                throw new Error(`Variable node "${node.name}" has invalid name.`);
            nodeVariables.set(sanitizedVarName, previousOutput);
            output = previousOutput;
            promptSent = `Stored input as '${sanitizedVarName}'`;
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'variable_set', output, endTime: new Date().toISOString(), pathId });
        }
        else if (node.type === engineTypes_1.NodeType.QUESTION) {
            promptSent = (0, exports.substitutePlaceholdersInExecutor)(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap, projectNodes);
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'awaiting_input', output: 'Waiting for user...', pathId });
            const userInput = await callbacks.onRequestUserInput(promptSent, node.id);
            if (callbacks.isStopRequested())
                throw new Error('Workflow stopped by user during question input.');
            output = userInput;
        }
        else if (node.type === engineTypes_1.NodeType.JAVASCRIPT) {
            const userCode = node.code || constants_1.INITIAL_JAVASCRIPT_NODE_CODE;
            promptSent = `Executing JavaScript: ${node.prompt || node.name}`;
            const nodeVarsObject = Object.fromEntries(nodeVariables.entries());
            const projectVarsObject = Object.fromEntries(projectVariablesMap.entries());
            const func = new Function('previousOutput', 'nodeVariables', 'projectVariables', `return (async (previousOutput, nodeVariables, projectVariables) => { ${userCode} })(previousOutput, nodeVariables, projectVariables);`);
            const result = await func(previousOutput, nodeVarsObject, projectVarsObject);
            output = (typeof result === 'string') ? result : (result === undefined || result === null) ? '' : JSON.stringify(result);
            callbacks.onLogEntry({ nodeId: node.id, nodeName: node.name, status: 'javascript_executed', output, endTime: new Date().toISOString(), pathId });
        }
        else if (node.type === engineTypes_1.NodeType.PARALLEL) {
            promptSent = `Forking execution from: ${node.prompt || constants_1.INITIAL_PARALLEL_NODE_DESCRIPTION}`;
            output = previousOutput;
            const branchCount = node.parallelNextNodeIds?.length || 0;
            if (branchCount > 0) {
                callbacks.incrementParallelPathCounter(branchCount);
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
        else if (node.type === engineTypes_1.NodeType.SYNCHRONIZE) {
            callbacks.decrementParallelPathCounter();
            onPathCounterManagedByNode();
            const counterAfterDecrement = callbacks.getParallelPathCounter();
            callbacks.decrementActiveExecutionCount();
            const logMessage = `PATH ${pathId.split('-').pop()}: Arrived. PARALLEL_COUNTER_IS_NOW: ${counterAfterDecrement}. Waiting for other paths. ActiveExec: ${callbacks.getActiveExecutionCount()}`;
            callbacks.onLogEntry({
                nodeId: node.id,
                nodeName: node.name,
                status: 'synchronize_awaiting',
                output: logMessage,
                pathId
            });
            while (callbacks.getParallelPathCounter() > 0 && !callbacks.isStopRequested()) {
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            if (callbacks.isStopRequested()) {
                callbacks.incrementActiveExecutionCount();
                throw new Error("Workflow stopped by user while at synchronize node.");
            }
            callbacks.incrementActiveExecutionCount();
            output = "continue";
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
        }
        else if (node.type === engineTypes_1.NodeType.CONCLUSION) {
            callbacks.decrementParallelPathCounter();
            onPathCounterManagedByNode();
            const counterAfterDecrementConclusion = callbacks.getParallelPathCounter();
            const template = node.outputFormatTemplate || '{PREVIOUS_OUTPUT}';
            // Pass `projectNodes` to enable fallback lookup for CONCLUSION nodes
            output = (0, exports.substitutePlaceholdersInExecutor)(template, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap, projectNodes);
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
            const exhaustiveCheck = node.type;
            throw new Error(`Unknown or unhandled node type ${exhaustiveCheck}`);
        }
        callbacks.onTokenUpdate(tokensUsedThisStep);
        if (node.type !== engineTypes_1.NodeType.VARIABLE && node.type !== engineTypes_1.NodeType.JAVASCRIPT && node.type !== engineTypes_1.NodeType.PARALLEL && node.type !== engineTypes_1.NodeType.SYNCHRONIZE && node.type !== engineTypes_1.NodeType.CONCLUSION) {
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
            if (currentNode.type === engineTypes_1.NodeType.PARALLEL) {
                const parallelNodeIdsToExecute = currentNode.parallelNextNodeIds || [];
                const parallelPromises = [];
                for (const pNodeId of parallelNodeIdsToExecute) {
                    const nextNodeForBranch = projectNodes.find(n => n.id === pNodeId);
                    if (nextNodeForBranch) {
                        parallelPromises.push(executePathInExecutor({
                            initialNode: nextNodeForBranch,
                            initialInput: currentOutput, // Pass current output to each branch
                            projectNodes, settings,
                            baseNodeVariables: new Map(pathNodeVariables), // Give each branch a copy of current variables
                            projectVariablesMap, systemVariablesMap,
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
                        // Note: We are not merging finalOutputs or nodeVariables from parallel branches here.
                        // The main path effectively ends, and the parallel paths become independent.
                    }
                    else {
                        callbacks.onLogEntry({ nodeId: currentNode?.id || 'parallel_node', nodeName: currentNode?.name || 'Parallel Node', status: 'failed', error: `A parallel branch failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`, pathId });
                    }
                });
                currentNode = undefined; // This path (the one that hit PARALLEL) terminates here.
            }
            else if (currentNode.type === engineTypes_1.NodeType.CONDITIONAL) {
                const branches = currentNode.branches || [];
                let matchedBranch = branches.find((branch) => {
                    const condition = branch.condition.toLowerCase();
                    const llmOutput = currentOutput.toLowerCase();
                    if (condition.startsWith('contains '))
                        return llmOutput.includes(condition.substring(9).trim());
                    if (condition.startsWith('starts with '))
                        return llmOutput.startsWith(condition.substring(12).trim());
                    return llmOutput === condition;
                });
                if (!matchedBranch) {
                    matchedBranch = branches.find((branch) => branch.condition.toLowerCase() === 'default');
                }
                nextNodeId = matchedBranch?.nextNodeId;
            }
            else if (currentNode.type !== engineTypes_1.NodeType.CONCLUSION) {
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
                currentNode = undefined; // Path ends if no next node (e.g., after CONCLUSION or unlinked node)
            }
        }
        return { finalOutput: currentOutput, steps: pathSteps, tokens: pathTokens, status: 'completed' };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { finalOutput: currentOutput, steps: pathSteps, tokens: pathTokens, status: message === 'Workflow stopped by user.' ? 'stopped' : 'failed' };
    }
    finally {
        if (!pathCounterDecrementedByNodeInPath && lastProcessedActualNode && lastProcessedActualNode.type !== engineTypes_1.NodeType.PARALLEL) { // PARALLEL manages its own counter effect via its branches
            if (lastProcessedActualNode.type === engineTypes_1.NodeType.CONCLUSION || lastProcessedActualNode.type === engineTypes_1.NodeType.SYNCHRONIZE) {
                // These nodes already called onPathCounterManagedByNode via processNodeInExecutor
            }
            else {
                // If a path ends without hitting a conclusion or synchronize node that explicitly decrements,
                // it means this parallel path is concluding implicitly.
                // However, the main decrement for parallel paths should happen when they naturally end or hit a conclusion/sync.
                // The PARALLEL node increments the counter by the number of branches. Each branch is responsible for decrementing once.
            }
        }
        callbacks.decrementActiveExecutionCount();
    }
};
const executeWorkflow = async (project, appSettings, callbacks) => {
    const projectCloneForExecution = (0, utils_1.deepClone)(project);
    projectCloneForExecution.nodes = (0, utils_1.getValidNodes)(projectCloneForExecution.nodes).map(n => ({ ...n, isRunning: false, hasError: false, lastRunOutput: undefined }));
    const initialNodesForRun = projectCloneForExecution.nodes;
    const baseNodeVariables = new Map();
    const projectVariablesMap = new Map(projectCloneForExecution.projectVariables?.map((pv) => [(0, utils_1.sanitizeVariableName)(pv.name), pv.value]) || []);
    const systemVariablesMap = new Map();
    const now = new Date();
    systemVariablesMap.set('CurrentDateTime', now.toLocaleString());
    systemVariablesMap.set('LLMProvider', appSettings.llmProvider);
    let currentModelName = 'N/A';
    switch (appSettings.llmProvider) {
        case engineTypes_1.LLMProvider.CHATGPT:
            currentModelName = appSettings.chatGptModel || 'Not Set';
            break;
        case engineTypes_1.LLMProvider.OLLAMA:
            currentModelName = appSettings.ollamaModel || 'Not Set';
            break;
        default:
            const _exhaustiveCheck = appSettings.llmProvider;
            currentModelName = `Unknown (${String(_exhaustiveCheck)})`;
            break;
    }
    systemVariablesMap.set('LLMModel', currentModelName);
    const startNode = initialNodesForRun.find(n => n.type === engineTypes_1.NodeType.START);
    if (!startNode) {
        const errorMsg = 'No Start Node found.';
        callbacks.onLogEntry({ nodeId: 'workflow_error', nodeName: 'Workflow Error', status: 'failed', error: errorMsg, endTime: new Date().toISOString(), pathId: 'main' });
        return { status: 'failed', error: errorMsg, steps: [], totalTokensUsed: 0, updatedNodes: initialNodesForRun };
    }
    // Reset global parallel path counter at the start of a full workflow run
    while (callbacks.getParallelPathCounter() > 0) {
        callbacks.decrementParallelPathCounter();
    }
    if (callbacks.getActiveExecutionCount() > 0) { // Should be 0, but reset just in case
        let safety = 0;
        while (callbacks.getActiveExecutionCount() > 0 && safety < 100) {
            callbacks.decrementActiveExecutionCount();
            safety++;
        }
    }
    let overallPathTokens = 0;
    let overallPathSteps = [];
    try {
        const result = await executePathInExecutor({
            initialNode: startNode,
            initialInput: '',
            projectNodes: initialNodesForRun, // Pass all nodes for context
            settings: appSettings,
            baseNodeVariables,
            projectVariablesMap,
            systemVariablesMap,
            callbacks,
            pathId: `main-${startNode.id.substring(0, 4)}`,
        });
        overallPathSteps.push(...result.steps);
        overallPathTokens += result.tokens;
        // After main execution (which might include parallel branches), ensure counter is zero if run didn't stop.
        if (result.status !== 'stopped' && result.status !== 'failed') {
            let safetyCounter = 0; // Prevent infinite loop if logic is flawed
            while (callbacks.getParallelPathCounter() > 0 && safetyCounter < (initialNodesForRun.length * 2) && !callbacks.isStopRequested()) {
                callbacks.onLogEntry({ nodeId: 'workflow_cleanup', nodeName: 'Workflow Cleanup', status: 'skipped', error: `Path counter was ${callbacks.getParallelPathCounter()} at end of run, decrementing. This might indicate an unjoined parallel branch.`, pathId: 'cleanup' });
                callbacks.decrementParallelPathCounter();
                safetyCounter++;
            }
        }
        const finalNodesAfterExecution = initialNodesForRun.map(n => ({
            ...n,
            isRunning: false, // Ensure all nodes are marked not running
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
            isRunning: false, // Ensure all nodes are marked not running
        }));
        return { status: 'failed', error: errorMsg, steps: overallPathSteps, totalTokensUsed: overallPathTokens, updatedNodes: finalUpdatedNodesOnError };
    }
};
exports.executeWorkflow = executeWorkflow;
