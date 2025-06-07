
// src/hooks/useWorkflowExecution.ts
import { useState, useRef, useCallback } from 'react';
import type { Project, Node, NodeType, ProjectRun, RunStep, AppSettings, LLMExecutePromptResponse, NodeExecutionLog } from '../../types';
import { useAppSettings } from '../hooks'; // Corrected import path
import { executePrompt } from '../../llmService'; // Ensured correct relative path
import { deepClone, generateId, getValidNodes } from '../utils';
import { MAX_RUN_HISTORY } from '../../constants';

interface UseWorkflowExecutionProps {
  currentProject: Project | null;
  saveProjectState: (projectState: Project | null, skipSetCurrent?: boolean) => void;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  hasUnsavedChanges: boolean;
}

export const useWorkflowExecution = ({
  currentProject,
  saveProjectState,
  setCurrentProject,
  hasUnsavedChanges,
}: UseWorkflowExecutionProps) => {
  const { appSettings } = useAppSettings();
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const isStopRequestedRef = useRef(false);
  const [executionLogs, setExecutionLogs] = useState<NodeExecutionLog[]>([]);
  const [currentExecutingNodeId, setCurrentExecutingNodeId] = useState<string | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [runEndTime, setRunEndTime] = useState<number | null>(null);
  const [totalTokensThisRun, setTotalTokensThisRun] = useState<number>(0);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState<boolean>(true); 
  
  const handleStopWorkflow = useCallback(() => {
    isStopRequestedRef.current = true;
  }, []);

  const runWorkflow = useCallback(async () => {
    if (!currentProject || isWorkflowRunning) return Promise.reject(new Error("Workflow already running or no project."));

    const initialValidNodes = getValidNodes(currentProject.nodes);
    if (initialValidNodes.length === 0 && currentProject.nodes.length > 0) {
      console.error("Workflow run aborted: Project contains only invalid node data before cloning.");
      return Promise.reject(new Error("Project contains invalid node data."));
    }
    
    setIsWorkflowRunning(true);
    isStopRequestedRef.current = false;

    if (hasUnsavedChanges && currentProject) {
      saveProjectState(currentProject, true); 
    }
    
    setExecutionLogs([]);
    setCurrentExecutingNodeId(null);
    const startTime = Date.now();
    setRunStartTime(startTime);
    setRunEndTime(null);
    setTotalTokensThisRun(0);
    setIsExecutionPanelOpen(true);

    let tempCurrentProject = deepClone(currentProject);
     tempCurrentProject.nodes = getValidNodes(tempCurrentProject.nodes).map(n => ({
      ...n,
      isRunning: false,
      hasError: false,
      lastRunOutput: undefined,
    }));
    
    setCurrentProject(prev => {
        if (!prev) return null;
        const uiNodesReset = getValidNodes(prev.nodes).map(n => ({...n, isRunning: false, hasError: false, lastRunOutput: undefined}));
        return {...prev, nodes: uiNodesReset };
    });


    const currentRun: ProjectRun = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      status: 'running',
      steps: [],
      totalTokensUsed: 0,
    };
    tempCurrentProject.runHistory = [currentRun, ...(tempCurrentProject.runHistory || [])].slice(0, MAX_RUN_HISTORY);

    let currentNode: Node | null | undefined = tempCurrentProject.nodes.find(n => n.type === 'START' as NodeType.START);
    let previousOutput: string | undefined = undefined;
    let accumulatedTokens = 0;
    const workflowVariables: { [key: string]: string } = {};

    try { 
        while (currentNode) {
          if (isStopRequestedRef.current) {
            currentRun.status = 'stopped';
            currentRun.error = 'Manually stopped by user.';
            setExecutionLogs(prevLogs => prevLogs.map(log => log.status === 'running' ? { ...log, status: 'skipped', endTime: new Date().toISOString() } : log));
            break;
          }

          const activeNodeId = currentNode.id;
          setCurrentExecutingNodeId(activeNodeId);
          const nodeLogEntry: NodeExecutionLog = {
            nodeId: activeNodeId,
            nodeName: currentNode.name || currentNode.type, // Use node's actual name
            startTime: new Date().toISOString(),
            status: 'running',
          };
          setExecutionLogs(prevLogs => [...prevLogs, nodeLogEntry]);

          setCurrentProject(prev => {
            if (!prev) return null;
            const validPrevNodes = getValidNodes(prev.nodes);
            const updatedNodes = validPrevNodes.map(n =>
              n.id === activeNodeId ? { ...n, isRunning: true, hasError: false } : { ...n, isRunning: false }
            );
            return { ...prev, nodes: updatedNodes };
          });

          let promptForLLM = currentNode.prompt; // Used for LLM call
          let stepPromptSent = currentNode.prompt; // Logged as "Prompt Sent"

          if (currentNode.type === 'START' as NodeType.START || currentNode.type === 'PROMPT' as NodeType.PROMPT || currentNode.type === 'CONDITIONAL' as NodeType.CONDITIONAL) {
            let tempPrompt = currentNode.prompt;
            for (const [varName, varValue] of Object.entries(workflowVariables)) {
              const safeVarName = varName.replace(/[^a-zA-Z0-9_]/g, '');
              if (safeVarName) {
                 tempPrompt = tempPrompt.replace(new RegExp(`\\{${safeVarName}\\}`, 'gi'), varValue);
              }
            }
            promptForLLM = tempPrompt.replace(/{PREVIOUS_OUTPUT}/gi, previousOutput || '');
            stepPromptSent = promptForLLM; // Log the fully resolved prompt
          } else if (currentNode.type === 'CONCLUSION' as NodeType.CONCLUSION) {
            // For Conclusion, "prompt" is the display title. The "prompt sent" for logging is conceptual.
            stepPromptSent = `Displaying output for: ${currentNode.name || 'Conclusion'} (Title: ${currentNode.prompt})`;
          } else if (currentNode.type === 'VARIABLE' as NodeType.VARIABLE) {
            stepPromptSent = `Storing input as '${currentNode.name}'`;
          }

          const step: RunStep = {
            nodeId: currentNode.id,
            nodeName: currentNode.name, // Use node's actual name for the step
            promptSent: stepPromptSent,
            responseReceived: '',
            timestamp: new Date().toISOString(),
          };

            let resultText: string;
            let usageData: LLMExecutePromptResponse['usageMetadata'] = undefined;
            let currentStepTokens: number | undefined = undefined;

            if (currentNode.type === 'START' as NodeType.START || currentNode.type === 'PROMPT' as NodeType.PROMPT || currentNode.type === 'CONDITIONAL' as NodeType.CONDITIONAL) {
              const result: LLMExecutePromptResponse = await executePrompt(promptForLLM, appSettings);
              resultText = result.text;
              usageData = result.usageMetadata;
            } else if (currentNode.type === 'CONCLUSION' as NodeType.CONCLUSION) {
              let tempOutput = currentNode.outputFormatTemplate || '{PREVIOUS_OUTPUT}';
              for (const [varName, varValue] of Object.entries(workflowVariables)) {
                console.log(tempOutput);
                const safeVarName = varName.replace(/[^a-zA-Z0-9_]/g, '');
                if (safeVarName) {
                  tempOutput = tempOutput.replace(new RegExp(`\\{${safeVarName}\\}`, 'gi'), varValue);
                }
              }
              console.log(tempOutput);
              tempOutput = tempOutput.replace(/{PREVIOUS_OUTPUT}/gi, previousOutput);
              resultText = tempOutput || '(No input to display)';
            } else if (currentNode.type === 'VARIABLE' as NodeType.VARIABLE) {
              resultText = previousOutput || '';
              const sanitizedVarName = currentNode.name.replace(/[^a-zA-Z0-9_]/g, '');
              if (sanitizedVarName) {
                workflowVariables[sanitizedVarName] = resultText;
              }
            } else {
              throw new Error(`Unknown or invalid node type encountered: ${(currentNode as any)?.type}`);
            }
            
            if (usageData && typeof usageData.totalTokenCount === 'number') {
              currentStepTokens = usageData.totalTokenCount;
              accumulatedTokens += currentStepTokens;
            }
            step.tokensUsed = currentStepTokens;
            step.responseReceived = resultText;

            previousOutput = resultText; 
            
            const nodeInTemp = tempCurrentProject.nodes.find(n => n.id === activeNodeId);
            if (nodeInTemp) nodeInTemp.lastRunOutput = resultText;
            
            setExecutionLogs(prevLogs => prevLogs.map(log => log.nodeId === activeNodeId && log.status === 'running' ? 
                {...log, endTime: new Date().toISOString(), status: currentNode?.type === ('VARIABLE' as NodeType.VARIABLE) ? 'variable_set' : 'completed', output: resultText, tokensUsed: step.tokensUsed} : log
            ));
            
            currentRun.steps.push(step);
            setCurrentProject(prev => {
                if(!prev) return null;
                const validPrevNodes = getValidNodes(prev.nodes);
                const updatedNodes = validPrevNodes.map(n => n.id === activeNodeId ? { ...n, isRunning: false, lastRunOutput: resultText, hasError: false } : n);
                return {...prev, nodes: updatedNodes};
            });

            if (currentNode.type === 'CONCLUSION' as NodeType.CONCLUSION) {
                currentNode = null; 
            } else if (currentNode.type === 'CONDITIONAL' as NodeType.CONDITIONAL && currentNode.branches) {
              let nextNodeIdFound: string | null = null;
              const lcResponse = resultText.toLowerCase();
              for (const branch of currentNode.branches) {
                const lcCondition = branch.condition.toLowerCase().trim();
                let match = false;
                if (lcCondition.startsWith("contains '") && lcCondition.endsWith("'")) {
                    const keyword = lcCondition.substring(10, lcCondition.length -1).trim();
                    match = lcResponse.includes(keyword);
                } else if (lcCondition.startsWith("starts with '") && lcCondition.endsWith("'")) {
                    const prefix = lcCondition.substring(13, lcCondition.length -1).trim();
                    match = lcResponse.startsWith(prefix);
                } else if (lcCondition === "default" || lcCondition === "") { 
                    match = true; 
                } else { 
                    match = lcResponse === lcCondition;
                }
                if (match) {
                  nextNodeIdFound = branch.nextNodeId;
                  break;
                }
              }
              if (!nextNodeIdFound) { 
                 const defaultBranch = currentNode.branches.find(b => b.condition.toLowerCase().trim() === "default" || b.condition.trim() === "");
                 if (defaultBranch) nextNodeIdFound = defaultBranch.nextNodeId;
              }
              currentNode = tempCurrentProject.nodes.find(n => n.id === nextNodeIdFound) || null;
            } else { 
              currentNode = tempCurrentProject.nodes.find(n => n.id === currentNode?.nextNodeId) || null;
            }
        } 

    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        currentRun.status = 'failed';
        currentRun.error = errorMessage;

        if (currentExecutingNodeId) {
            const nodeInTemp = tempCurrentProject.nodes.find(n => n.id === currentExecutingNodeId);
            if (nodeInTemp) {
                nodeInTemp.lastRunOutput = errorMessage;
                nodeInTemp.hasError = true; 
            }
            const lastStep = currentRun.steps.length > 0 ? currentRun.steps[currentRun.steps.length - 1] : null;
            if (lastStep && lastStep.nodeId === currentExecutingNodeId && !lastStep.error) {
                lastStep.error = errorMessage;
                lastStep.responseReceived = 'ERROR';
            } else if (!lastStep || lastStep.nodeId !== currentExecutingNodeId) { 
                 currentRun.steps.push({
                    nodeId: currentExecutingNodeId,
                    nodeName: tempCurrentProject.nodes.find(n=>n.id === currentExecutingNodeId)?.name || 'Unknown Node',
                    promptSent: 'N/A due to error before/during call',
                    responseReceived: 'ERROR',
                    error: errorMessage,
                    timestamp: new Date().toISOString()
                 });
            }


            setExecutionLogs(prevLogs => prevLogs.map(log => log.nodeId === currentExecutingNodeId && log.status === 'running' ? 
                {...log, endTime: new Date().toISOString(), status: 'failed', error: errorMessage} : log
            ));
            setCurrentProject(prev => { 
                if(!prev) return null;
                const validPrevNodes = getValidNodes(prev.nodes);
                const updatedNodes = validPrevNodes.map(n => n.id === currentExecutingNodeId ? { ...n, isRunning: false, hasError: true, lastRunOutput: errorMessage } : n);
                return {...prev, nodes: updatedNodes};
            });
        }
        
        setIsWorkflowRunning(false);
        throw error; 
    } finally {
        if (isStopRequestedRef.current && currentRun.status !== 'stopped') { 
             currentRun.status = 'stopped';
             if (!currentRun.error) currentRun.error = 'Manually stopped by user.';
        } else if (currentRun.status === 'running') { 
            currentRun.status = 'completed';
        }

        currentRun.finalOutput = previousOutput; 
        currentRun.totalTokensUsed = accumulatedTokens;
        const runEndTimeActual = Date.now();
        currentRun.durationMs = runEndTimeActual - (startTime || runEndTimeActual); 
        
        setRunEndTime(runEndTimeActual);
        setTotalTokensThisRun(accumulatedTokens);
        setCurrentExecutingNodeId(null); 
        
        const finalProjectStateForSave = {
          ...tempCurrentProject,
          nodes: getValidNodes(tempCurrentProject.nodes) 
        };
        saveProjectState(finalProjectStateForSave);

        setIsWorkflowRunning(false);
        isStopRequestedRef.current = false; 
    }
     return Promise.resolve(); 
  }, [currentProject, isWorkflowRunning, appSettings, hasUnsavedChanges, saveProjectState, setCurrentProject]);


  return {
    isWorkflowRunning,
    executionLogs,
    currentExecutingNodeId,
    runStartTime,
    runEndTime,
    totalTokensThisRun,
    isExecutionPanelOpen,
    setIsExecutionPanelOpen,
    runWorkflow,
    handleStopWorkflow,
  };
};
