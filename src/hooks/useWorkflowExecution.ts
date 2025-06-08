
// src/hooks/useWorkflowExecution.ts
import { useCallback } from 'react';
import { useAppSettings } from '../hooks';
import { type Project, NodeType, type ProjectRun, type RunStep, type Node, ProjectVariable, type NodeExecutionLog, LLMProvider, ConclusionOutputModalData } from '../../types';
import { deepClone, generateId, getValidNodes, sanitizeVariableName } from '../utils';
import { MAX_RUN_HISTORY } from '../../constants';

import { useExecutionState } from './workflow/useExecutionState';
import { useExecutionLogger } from './workflow/useExecutionLogger';
import { processNode, executeWorkflowLogic } from './workflow/workflowLogic';


interface UseWorkflowExecutionProps {
  currentProject: Project | null;
  saveProjectState: (projectState: Project | null, skipSetCurrent?: boolean) => void;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  hasUnsavedChanges: boolean;
  requestUserInput: (question: string, nodeId: string) => Promise<string>;
}

export const useWorkflowExecution = ({
  currentProject,
  saveProjectState,
  setCurrentProject,
  hasUnsavedChanges,
  requestUserInput,
}: UseWorkflowExecutionProps) => {
  const { appSettings } = useAppSettings();
  
  const {
    isWorkflowRunning, setIsWorkflowRunning,
    isStopRequestedRef,
    currentExecutingNodeId, setCurrentExecutingNodeId,
    runStartTime, setRunStartTime,
    runEndTime, setRunEndTime,
    totalTokensThisRun, setTotalTokensThisRun,
    isExecutionPanelOpen, setIsExecutionPanelOpen,
    conclusionModalContent, setConclusionModalContent, clearConclusionModalContent,
  } = useExecutionState();

  const {
    executionLogs, setExecutionLogs, addLogEntry,
  } = useExecutionLogger();

  const handleStopWorkflow = useCallback(() => {
    isStopRequestedRef.current = true;
    if (currentExecutingNodeId) {
        addLogEntry({
            nodeId: currentExecutingNodeId,
            nodeName: currentProject?.nodes.find(n => n.id === currentExecutingNodeId)?.name || 'Current Node',
            status: 'failed',
            error: 'Run stopped by user.',
            endTime: new Date().toISOString()
        });
    }
  }, [currentExecutingNodeId, addLogEntry, isStopRequestedRef, currentProject?.nodes]);


  const runWorkflow = useCallback(async () => {
    if (!currentProject || isWorkflowRunning) {
      return Promise.reject(new Error("Workflow already running or no project."));
    }
    
    setIsWorkflowRunning(true);
    isStopRequestedRef.current = false;
    setConclusionModalContent(null);

    if (hasUnsavedChanges) {
      saveProjectState(currentProject, true); 
    }
    
    const initialNodes = getValidNodes(currentProject.nodes);
    setCurrentProject(prev => {
        if (!prev) return null;
        return {
            ...prev,
            nodes: initialNodes.map(n => ({ ...n, isRunning: false, hasError: false, lastRunOutput: undefined }))
        };
    });

    setExecutionLogs([]);
    setCurrentExecutingNodeId(null);
    const startTime = Date.now();
    setRunStartTime(startTime);
    setRunEndTime(null);
    setTotalTokensThisRun(0);
    setIsExecutionPanelOpen(true);

    const tempCurrentProject = deepClone(currentProject); 
    const validNodes = getValidNodes(tempCurrentProject.nodes);
    const startNode = validNodes.find(n => n.type === NodeType.START);

    if (!startNode) {
      setIsWorkflowRunning(false);
      setRunEndTime(Date.now());
      addLogEntry({nodeId: 'workflow', nodeName: 'Workflow Error', status:'failed', error:'No Start Node found.', endTime: new Date().toISOString()});
      return Promise.reject(new Error("No Start Node found."));
    }

    const appSettingsToUse = deepClone(appSettings);
    const nodeVariables = new Map<string, string>();
    const projectVariablesMap = new Map<string, string>(
      tempCurrentProject.projectVariables?.map((pv: ProjectVariable) => [sanitizeVariableName(pv.name), pv.value]) || []
    );

    // Generate System Variables
    const systemVariablesMap = new Map<string, string>();
    const now = new Date();
    systemVariablesMap.set('CurrentDateTime', now.toLocaleString());
    systemVariablesMap.set('DayOfWeek', now.toLocaleDateString(undefined, { weekday: 'long' }));
    systemVariablesMap.set('LLMProvider', appSettingsToUse.llmProvider);
    let currentModelName = 'N/A';
    switch (appSettingsToUse.llmProvider) {
      case LLMProvider.CHATGPT:
        currentModelName = appSettingsToUse.chatGptModel || 'Not Set';
        break;
      case LLMProvider.OLLAMA:
        currentModelName = appSettingsToUse.ollamaModel || 'Not Set';
        break;
      // Gemini case removed
    }
    systemVariablesMap.set('LLMModel', currentModelName);


    let finalRunOutput: string | undefined = undefined;
    let runStatus: ProjectRun['status'] = 'running';
    let runError: string | undefined = undefined;
    let runSteps: RunStep[] = [];
    let tokensForRun = 0;

    try {
      const result = await executeWorkflowLogic({
        project: tempCurrentProject,
        startNode,
        settings: appSettingsToUse,
        nodeVariables,
        projectVariablesMap,
        systemVariablesMap, // Pass system variables
        isStopRequestedRef,
        processNodeFn: processNode, // Pass the actual processNode function
        addLogEntry,
        setCurrentExecutingNodeId,
        setCurrentProject,
        setConclusionModalContent,
        requestUserInput,
      });
      finalRunOutput = result.finalOutput;
      runSteps = result.steps;
      tokensForRun = result.totalTokens;
      runStatus = 'completed';
    } catch (error) {
      console.error("Workflow execution error:", error);
      runStatus = 'failed';
      runError = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.message === 'Workflow stopped by user.') {
        runStatus = 'stopped';
      }
    } finally {
      const endTime = Date.now();
      setRunEndTime(endTime);
      setIsWorkflowRunning(false);
      setCurrentExecutingNodeId(null);
      setTotalTokensThisRun(tokensForRun);

      setCurrentProject(prevProject => {
        if (!prevProject) return null;
        
        const finalNodesWithState = getValidNodes(prevProject.nodes).map(existingNode => {
            const executedNodeInTemp = tempCurrentProject.nodes.find(n => n.id === existingNode.id);
            return executedNodeInTemp
                ? { ...existingNode, lastRunOutput: executedNodeInTemp.lastRunOutput, hasError: executedNodeInTemp.hasError, isRunning: false }
                : { ...existingNode, isRunning: false };
        });

        const updatedHistory = [
          ...(prevProject.runHistory || []),
          { 
            id: generateId(), 
            timestamp: new Date(startTime).toISOString(), 
            status: runStatus, 
            steps: runSteps,
            finalOutput: finalRunOutput,
            error: runError,
            totalTokensUsed: tokensForRun,
            durationMs: endTime - startTime,
          }
        ].slice(-MAX_RUN_HISTORY);
        
        const projectToSave = { ...prevProject, nodes: finalNodesWithState, runHistory: updatedHistory };
        saveProjectState(projectToSave, false); 
        return projectToSave;
      });
      isStopRequestedRef.current = false;
    }
    if (runStatus === 'failed' || runStatus === 'stopped') return Promise.reject(new Error(runError || "Run failed/stopped"));
    return Promise.resolve();
     
  }, [
      currentProject, isWorkflowRunning, appSettings, saveProjectState, setCurrentProject, hasUnsavedChanges, requestUserInput,
      setIsWorkflowRunning, isStopRequestedRef, setConclusionModalContent, setExecutionLogs,
      setCurrentExecutingNodeId, setRunStartTime, setRunEndTime, setTotalTokensThisRun, setIsExecutionPanelOpen, addLogEntry
  ]);

  return {
    isWorkflowRunning,
    executionLogs,
    currentExecutingNodeId,
    runStartTime,
    runEndTime,
    totalTokensThisRun,
    runWorkflow,
    handleStopWorkflow,
    isExecutionPanelOpen,
    setIsExecutionPanelOpen,
    conclusionModalContent,
    clearConclusionModalContent,
  };
};
