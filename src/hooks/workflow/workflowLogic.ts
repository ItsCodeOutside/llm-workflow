// src/hooks/workflow/workflowLogic.ts
import {
  type Node, NodeType, type Project, type AppSettings, type RunStep,
  type LLMExecutePromptResponse, type NodeExecutionLog, type ProjectVariable,
  type ConclusionOutputModalData, LLMProvider
} from '../../engineTypes'; // Use engineTypes
import { executePrompt } from '../../llmService'; // Updated path
import { getValidNodes, sanitizeVariableName } from '../../utils'; // Updated path
import { INITIAL_CONCLUSION_NODE_TITLE, INITIAL_JAVASCRIPT_NODE_CODE, INITIAL_PARALLEL_NODE_DESCRIPTION, INITIAL_SYNCHRONIZE_NODE_DESCRIPTION } from '../../constants'; // Updated path

export const substitutePlaceholders = (
  text: string,
  previousOutput: string,
  nodeVariables: Map<string, string>,
  projectVariablesMap: Map<string, string>,
  systemVariablesMap: Map<string, string> 
): string => {
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

interface ProcessNodeParams {
  node: Node;
  previousOutput: string;
  settings: AppSettings;
  nodeVariables: Map<string, string>; 
  projectVariablesMap: Map<string, string>;
  systemVariablesMap: Map<string, string>; 
  isStopRequestedRef: React.RefObject<boolean>;
  setCurrentExecutingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  addLogEntry: (logEntry: Partial<NodeExecutionLog> & { nodeId: string, nodeName: string, pathId?: string }) => void;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  setConclusionModalContent: React.Dispatch<React.SetStateAction<ConclusionOutputModalData | null>>;
  requestUserInput: (question: string, nodeId: string) => Promise<string>;
  getActiveExecutionCount: () => number;
  incrementActiveExecutionCount: () => void;
  decrementActiveExecutionCount: () => void;
  pathId: string; 
}

export const processNode = async ({
  node,
  previousOutput,
  settings,
  nodeVariables, 
  projectVariablesMap,
  systemVariablesMap, 
  isStopRequestedRef,
  setCurrentExecutingNodeId,
  addLogEntry,
  setCurrentProject,
  setConclusionModalContent,
  requestUserInput,
  getActiveExecutionCount,
  incrementActiveExecutionCount, 
  decrementActiveExecutionCount, 
  pathId,
}: ProcessNodeParams): Promise<{output: string, tokensUsed: number, promptSent: string}> => {
  if (isStopRequestedRef.current) throw new Error('Workflow stopped by user.');

  setCurrentExecutingNodeId(node.id);
  
  addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'running', startTime: new Date().toISOString(), pathId });
  
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
  let promptSent = `Input: ${previousOutput}`; 
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
      promptSent = `Stored input as '${sanitizedVarName}'`; 
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'variable_set', output: previousOutput, endTime: new Date().toISOString(), pathId });
    } else if (node.type === NodeType.QUESTION) {
      promptSent = substitutePlaceholders(node.prompt, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'awaiting_input', output: 'Waiting for user...', pathId });
      const userInput = await requestUserInput(promptSent, node.id);
      if (isStopRequestedRef.current) throw new Error('Workflow stopped by user during question input.');
      output = userInput;
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output: userInput, endTime: new Date().toISOString(), pathId });
    } else if (node.type === NodeType.JAVASCRIPT) {
      const userCode = node.code || INITIAL_JAVASCRIPT_NODE_CODE;
      promptSent = `Executing JavaScript: ${node.prompt || node.name}`; 

      const nodeVarsObject = Object.fromEntries(nodeVariables.entries());
      const projectVarsObject = Object.fromEntries(projectVariablesMap.entries());

      try {
        const func = new Function('previousOutput', 'nodeVariables', 'projectVariables', `
          return (async (previousOutput, nodeVariables, projectVariables) => {
            ${userCode}
          })(previousOutput, nodeVariables, projectVariables);
        `);
        
        const result = await func(previousOutput, nodeVarsObject, projectVarsObject);
        
        if (typeof result === 'string') {
          output = result;
        } else if (result === undefined || result === null) {
          output = '';
        } else {
          output = JSON.stringify(result);
        }
      } catch (e) { 
        throw new Error(`JavaScript processing error in node "${node.name || 'Unnamed JavaScript Node'}": ${e instanceof Error ? e.message : String(e)}`);
      }
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'javascript_executed', output, endTime: new Date().toISOString(), pathId });
    } else if (node.type === NodeType.PARALLEL) {
        promptSent = `Forking execution from: ${node.prompt || INITIAL_PARALLEL_NODE_DESCRIPTION}`;
        output = previousOutput; 
        addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'parallel_executed', output, endTime: new Date().toISOString(), pathId });
    } else if (node.type === NodeType.SYNCHRONIZE) {
        promptSent = `Synchronizing at: ${node.prompt || INITIAL_SYNCHRONIZE_NODE_DESCRIPTION}. Input: ${previousOutput}`;
        
        decrementActiveExecutionCount();
        addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'synchronize_awaiting', output: `Waiting for ${getActiveExecutionCount()} other paths.`, pathId });

        while(getActiveExecutionCount() > 0 && !isStopRequestedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 150)); 
        }

        if (isStopRequestedRef.current) throw new Error("Workflow stopped by user while synchronizing.");

        incrementActiveExecutionCount(); 
        output = previousOutput; 
        addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'synchronize_resumed', output, endTime: new Date().toISOString(), pathId });
    } else if (node.type === NodeType.CONCLUSION) {
      const template = node.outputFormatTemplate || '{PREVIOUS_OUTPUT}';
      output = substitutePlaceholders(template, previousOutput, nodeVariables, projectVariablesMap, systemVariablesMap);
      promptSent = `Displaying output for: ${node.prompt || INITIAL_CONCLUSION_NODE_TITLE}`; 
      addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output: output, endTime: new Date().toISOString(), pathId });
      setConclusionModalContent({ title: node.prompt || INITIAL_CONCLUSION_NODE_TITLE, content: output });
    } else {
      const exhaustiveCheck: never = node.type;
      throw new Error(`processNode: Unknown or unhandled node type ${exhaustiveCheck}`);
    }
    
    if (node.type !== NodeType.VARIABLE && node.type !== NodeType.QUESTION && node.type !== NodeType.JAVASCRIPT && node.type !== NodeType.PARALLEL && node.type !== NodeType.SYNCHRONIZE && node.type !== NodeType.CONCLUSION) {
        addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'completed', output, tokensUsed: tokensUsedThisStep, endTime: new Date().toISOString(), pathId });
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
    return {output, tokensUsed: tokensUsedThisStep, promptSent};

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLogEntry({ nodeId: node.id, nodeName: node.name, status: 'failed', error: errorMessage, endTime: new Date().toISOString(), pathId });
    setCurrentProject(prev => {
      if (!prev) return null;
      return {
          ...prev,
          nodes: getValidNodes(prev.nodes).map(n =>
              n.id === node.id ? { ...n, isRunning: false, hasError: true, lastRunOutput: `Error: ${errorMessage}` } : n
          )
      };
    });
    setCurrentExecutingNodeId(null); 
    throw error;
  }
};
