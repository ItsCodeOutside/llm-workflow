
// src/hooks/workflow/workflowLogic.ts
import {
  type Node, NodeType, type Project, type AppSettings, type RunStep,
  type LLMExecutePromptResponse, type NodeExecutionLog, type ProjectVariable,
  type ConclusionOutputModalData, LLMProvider
} from '../../../types'; // Corrected path, Added LLMProvider
import { executePrompt } from '../../../llmService';
import { getValidNodes, sanitizeVariableName } from '../../utils';
import { INITIAL_CONCLUSION_NODE_TITLE } from '../../../constants';

export const substitutePlaceholders = (
  text: string,
  previousOutput: string,
  nodeVariables: Map<string, string>,
  projectVariablesMap: Map<string, string>,
  systemVariablesMap: Map<string, string> // New parameter
): string => {
  let substitutedText = text;
  // Order of map spreading determines precedence: last one wins for duplicate keys.
  // System vars -> Project vars -> Node vars. Node vars can override Project, which can override System.
  const allVars = new Map([
    ...systemVariablesMap,
    ...projectVariablesMap,
    ...nodeVariables
  ]);

  allVars.forEach((value, key) => {
    const placeholder = `{${key}}`;
    // Ensure special characters in variable names are escaped for regex
    substitutedText = substitutedText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  });

  substitutedText = substitutedText.replace(/{PREVIOUS_OUTPUT}/g, previousOutput);
  return substitutedText;
};

interface ProcessNodeParams {
  node: Node;
  previousOutput: string;
  settings: AppSettings;
  nodeVariables: Map<string, string>;
  projectVariablesMap: Map<string, string>;
  systemVariablesMap: Map<string, string>; // Added systemVariablesMap
  currentRunSteps: RunStep[];
  runTokensAccumulator: { count: number };
  isStopRequestedRef: React.RefObject<boolean>;
  setCurrentExecutingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  addLogEntry: (logEntry: Partial<NodeExecutionLog> & { nodeId: string, nodeName: string }) => void;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  setConclusionModalContent: React.Dispatch<React.SetStateAction<ConclusionOutputModalData | null>>;
  requestUserInput: (question: string, nodeId: string) => Promise<string>;
}

export const processNode = async ({
  node,
  previousOutput,
  settings,
  nodeVariables,
  projectVariablesMap,
  systemVariablesMap, // Added systemVariablesMap
  currentRunSteps,
  runTokensAccumulator,
  isStopRequestedRef,
  setCurrentExecutingNodeId,
  addLogEntry,
  setCurrentProject,
  setConclusionModalContent,
  requestUserInput,
}: ProcessNodeParams): Promise<string> => {
  if (isStopRequestedRef.current) throw new Error('Workflow stopped by user.');

  setCurrentExecutingNodeId(node.id);
  // Ensure a log entry is started with 'running' status
  addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'running', startTime: new Date().toISOString() });
  
  setCurrentProject(prev => {
      if (!prev) return null;
      return {
          ...prev,
          nodes: getValidNodes(prev.nodes).map(n =>
              n.id === node.id ? { ...n, isRunning: true, hasError: false } : n
          )
      };
  });

  let output = previousOutput;
  let promptSent = previousOutput;
  let tokensUsedThisStep = 0;

  try {
    if (node.type === NodeType.START || node.type === NodeType.PROMPT) {
      promptSent = substitutePlaceholders(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
      const llmResponse: LLMExecutePromptResponse = await executePrompt(promptSent, settings);
      output = llmResponse.text;
      tokensUsedThisStep = llmResponse.usageMetadata?.totalTokenCount || 0;
    } else if (node.type === NodeType.CONDITIONAL) {
      promptSent = substitutePlaceholders(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
      const llmResponse: LLMExecutePromptResponse = await executePrompt(promptSent, settings);
      output = llmResponse.text;
      tokensUsedThisStep = llmResponse.usageMetadata?.totalTokenCount || 0;
    } else if (node.type === NodeType.VARIABLE) {
      const sanitizedVarName = sanitizeVariableName(node.name);
      if (!sanitizedVarName) {
          throw new Error(`Variable node "${node.name}" has an invalid or empty name after sanitization.`);
      }
      nodeVariables.set(sanitizedVarName, previousOutput);
      output = previousOutput;
      promptSent = `Stored input as '${sanitizedVarName}'`; // This is a description, not a prompt sent to LLM
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'variable_set', output: previousOutput, endTime: new Date().toISOString() });
    } else if (node.type === NodeType.QUESTION) {
      promptSent = substitutePlaceholders(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'awaiting_input', output: 'Waiting for user...' });
      const userInput = await requestUserInput(promptSent, node.id);
      if (isStopRequestedRef.current) throw new Error('Workflow stopped by user during question input.');
      output = userInput;
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output: userInput, endTime: new Date().toISOString() });
    } else if (node.type === NodeType.CONCLUSION) {
      const template = node.outputFormatTemplate || '{PREVIOUS_OUTPUT}';
      output = substitutePlaceholders(template, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
      promptSent = `Displaying output...`; // This is a description
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output: output, endTime: new Date().toISOString() });
      setConclusionModalContent({ title: node.prompt || INITIAL_CONCLUSION_NODE_TITLE, content: output });
    } else {
      console.error(`processNode: Unknown or unhandled node type ${node.type} for node ${node.name}`);
      throw new Error(`processNode: Unknown or unhandled node type ${node.type}`);
    }

    runTokensAccumulator.count += tokensUsedThisStep;
    currentRunSteps.push({ nodeId: node.id, nodeName: node.name, promptSent, responseReceived: output, timestamp: new Date().toISOString(), tokensUsed: tokensUsedThisStep });
    
    if (node.type !== NodeType.VARIABLE && node.type !== NodeType.QUESTION && node.type !== NodeType.CONCLUSION) {
        addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output, tokensUsed: tokensUsedThisStep, endTime: new Date().toISOString() });
    }
    
    setCurrentProject(prev => {
      if (!prev) return null;
      return {
          ...prev,
          nodes: getValidNodes(prev.nodes).map(n =>
              n.id === node.id ? { ...n, isRunning: false, lastRunOutput: output } : n
          )
      };
    });
    return output;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    currentRunSteps.push({ nodeId: node.id, nodeName: node.name, promptSent, responseReceived: '', error: errorMessage, timestamp: new Date().toISOString() });
    addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'failed', error: errorMessage, endTime: new Date().toISOString() });
    setCurrentProject(prev => {
      if (!prev) return null;
      return {
          ...prev,
          nodes: getValidNodes(prev.nodes).map(n =>
              n.id === node.id ? { ...n, isRunning: false, hasError: true, lastRunOutput: `Error: ${errorMessage}` } : n
          )
      };
    });
    throw error;
  }
};


interface ExecuteWorkflowLogicParams {
  project: Project;
  startNode: Node;
  settings: AppSettings;
  nodeVariables: Map<string, string>;
  projectVariablesMap: Map<string, string>;
  systemVariablesMap: Map<string, string>; // Added systemVariablesMap
  isStopRequestedRef: React.RefObject<boolean>;
  processNodeFn: (params: ProcessNodeParams) => Promise<string>;
  addLogEntry: (logEntry: Partial<NodeExecutionLog> & { nodeId: string, nodeName: string }) => void;
  setCurrentExecutingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  setConclusionModalContent: React.Dispatch<React.SetStateAction<ConclusionOutputModalData | null>>;
  requestUserInput: (question: string, nodeId: string) => Promise<string>;
}

export const executeWorkflowLogic = async ({
  project,
  startNode,
  settings,
  nodeVariables,
  projectVariablesMap,
  systemVariablesMap, // Added systemVariablesMap
  isStopRequestedRef,
  processNodeFn,
  addLogEntry,
  setCurrentExecutingNodeId,
  setCurrentProject,
  setConclusionModalContent,
  requestUserInput,
}: ExecuteWorkflowLogicParams) => {
  let currentNode: Node | undefined = startNode;
  let currentOutput: string = '';
  const visitCounts = new Map<string, number>();
  const MAX_VISITS = 10;
  const currentRunSteps: RunStep[] = [];
  let runTokensAccumulator = { count: 0 };

  while (currentNode) {
    if (isStopRequestedRef.current) throw new Error('Workflow stopped by user.');

    const visitCount = (visitCounts.get(currentNode.id) || 0) + 1;
    if (visitCount > MAX_VISITS) {
      throw new Error(`Loop detected or node "${currentNode.name}" executed too many times (${MAX_VISITS}). Halting execution.`);
    }
    visitCounts.set(currentNode.id, visitCount);

    currentOutput = await processNodeFn({
        node: currentNode,
        previousOutput: currentOutput,
        settings,
        nodeVariables,
        projectVariablesMap,
        systemVariablesMap, // Pass systemVariablesMap
        currentRunSteps,
        runTokensAccumulator,
        isStopRequestedRef,
        setCurrentExecutingNodeId,
        addLogEntry,
        setCurrentProject,
        setConclusionModalContent,
        requestUserInput,
    });
    
    let nextNodeId: string | null | undefined = null;
    if (currentNode.type === NodeType.CONDITIONAL) {
      const branches = currentNode.branches || [];
      let matchedBranch = branches.find(branch => {
        const condition = branch.condition.toLowerCase();
        const llmOutput = currentOutput.toLowerCase();
        if (condition.startsWith('contains ')) {
          return llmOutput.includes(condition.substring(9).trim());
        } else if (condition.startsWith('starts with ')) {
          return llmOutput.startsWith(condition.substring(12).trim());
        } else {
          return llmOutput === condition;
        }
      });
      if (!matchedBranch) {
          matchedBranch = branches.find(branch => branch.condition.toLowerCase() === 'default');
      }
      nextNodeId = matchedBranch?.nextNodeId;
    } else if (currentNode.type !== NodeType.CONCLUSION) {
      nextNodeId = currentNode.nextNodeId;
    }

    if (nextNodeId) {
      currentNode = getValidNodes(project.nodes).find(n => n.id === nextNodeId);
      if (!currentNode) {
          addLogEntry({ nodeId: nextNodeId, nodeName: "Unknown Node", status: 'skipped', error: "Next node ID not found in project.", endTime: new Date().toISOString() });
      }
    } else {
      currentNode = undefined;
    }
  }
  return { finalOutput: currentOutput, steps: currentRunSteps, totalTokens: runTokensAccumulator.count };
};
