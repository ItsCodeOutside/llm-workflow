// src/hooks/useWorkflowExecution.ts
/*
// Old version of file
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useAppSettings } from '../hooks';
import {
  type Project, NodeType, type ProjectRun, type RunStep, type Node, ProjectVariable, type NodeExecutionLog, LLMProvider, ConclusionOutputModalData, NextStepInfo, type AppSettings
} from '../../types';
import { deepClone, generateId, getValidNodes, sanitizeVariableName } from '../utils';
import { MAX_RUN_HISTORY } from '../../constants';

import { useExecutionState } from './workflow/useExecutionState';
import { useExecutionLogger } from './workflow/useExecutionLogger';
import { executeWorkflowPath, processNode as processSingleNode, substitutePlaceholders } from './workflow/workflowLogic';


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
    activeExecutionCount, setActiveExecutionCount, 
    incrementActiveExecutionCount, decrementActiveExecutionCount, getActiveExecutionCount,
    // Step-through specific state
    isSteppingActive, setIsSteppingActive,
    nextStepInfo, setNextStepInfo,
    currentRunSteps, setCurrentRunSteps,
  } = useExecutionState();

  const {
    executionLogs, setExecutionLogs, addLogEntry,
  } = useExecutionLogger();

  const hasNextStep = useMemo(() => nextStepInfo !== null, [nextStepInfo]);

  useEffect(() => { 
    if (!isWorkflowRunning) {
        isStopRequestedRef.current = false;
        if (!isSteppingActive) { 
             setNextStepInfo(null);
        }
    }
  }, [isWorkflowRunning, isSteppingActive, isStopRequestedRef, setNextStepInfo]);

  const initializeRunShared = useCallback((projectForRun: Project): {
    initialNodes: Node[];
    appSettingsToUse: AppSettings;
    baseNodeVariables: Map<string, string>;
    projectVariablesMap: Map<string, string>;
    systemVariablesMap: Map<string, string>;
  } => {
    if (hasUnsavedChanges && currentProject) {
      saveProjectState(currentProject, true); 
    }
    
    setCurrentProject(prev => { 
        if (!prev) return null;
        return {
            ...prev,
            nodes: getValidNodes(prev.nodes).map(n => ({ ...n, isRunning: false, hasError: false, lastRunOutput: undefined }))
        };
    });

    setExecutionLogs([]);
    setCurrentExecutingNodeId(null); 
    const startTimeValue = Date.now();
    setRunStartTime(startTimeValue);
    setRunEndTime(null);
    setTotalTokensThisRun(0);
    setIsExecutionPanelOpen(true);
    isStopRequestedRef.current = false;
    setConclusionModalContent(null);
    setCurrentRunSteps([]); 

    const initialNodes = getValidNodes(projectForRun.nodes);
    const appSettingsToUse = deepClone(appSettings);
    const baseNodeVariables = new Map<string, string>(); 
    const projectVariablesMap = new Map<string, string>(
      projectForRun.projectVariables?.map((pv: ProjectVariable) => [sanitizeVariableName(pv.name), pv.value]) || []
    );
    const systemVariablesMap = new Map<string, string>();
    const now = new Date();
    systemVariablesMap.set('CurrentDateTime', now.toLocaleString());
    systemVariablesMap.set('DayOfWeek', now.toLocaleDateString(undefined, { weekday: 'long' }));
    systemVariablesMap.set('LLMProvider', appSettingsToUse.llmProvider);
    let currentModelName = 'N/A';
    switch (appSettingsToUse.llmProvider) {
      case LLMProvider.CHATGPT: currentModelName = appSettingsToUse.chatGptModel || 'Not Set'; break;
      case LLMProvider.OLLAMA: currentModelName = appSettingsToUse.ollamaModel || 'Not Set'; break;
    }
    systemVariablesMap.set('LLMModel', currentModelName);

    return { initialNodes, appSettingsToUse, baseNodeVariables, projectVariablesMap, systemVariablesMap };

  }, [appSettings, currentProject, saveProjectState, setCurrentProject, hasUnsavedChanges, setExecutionLogs, setCurrentExecutingNodeId, setRunStartTime, setRunEndTime, setTotalTokensThisRun, setIsExecutionPanelOpen, isStopRequestedRef, setConclusionModalContent, setCurrentRunSteps]);


  const finalizeRun = useCallback((status: ProjectRun['status'], finalOutput?: string, error?: string) => {
    const endTime = Date.now();
    setRunEndTime(endTime);
    setIsWorkflowRunning(false);
    setIsSteppingActive(false); 
    setCurrentExecutingNodeId(null); 

    setCurrentProject(prevProject => {
      if (!prevProject) return null;
      const finalNodesState = getValidNodes(prevProject.nodes).map(n => ({...n, isRunning: false})); 

      const runEntry: ProjectRun = { 
        id: generateId(), 
        timestamp: new Date(runStartTime!).toISOString(), 
        status, 
        steps: currentRunSteps, 
        finalOutput,
        error,
        totalTokensUsed: totalTokensThisRun,
        durationMs: runStartTime ? endTime - runStartTime : 0,
      };
      const updatedHistory = [...(prevProject.runHistory || []), runEntry].slice(-MAX_RUN_HISTORY);
      
      const projectToSave = { ...prevProject, nodes: finalNodesState, runHistory: updatedHistory };
      saveProjectState(projectToSave, false); 
      return projectToSave;
    });
    isStopRequestedRef.current = false;
  }, [runStartTime, currentRunSteps, totalTokensThisRun, saveProjectState, setCurrentProject, setIsWorkflowRunning, setIsSteppingActive, setCurrentExecutingNodeId, setRunEndTime]);


  const runWorkflow = useCallback(async () => {
    if (!currentProject || isWorkflowRunning || isSteppingActive) { 
      return Promise.reject(new Error("Workflow already running or in stepping mode, or no project."));
    }
    
    setIsWorkflowRunning(true);
    setActiveExecutionCount(0); 

    const projectClone = deepClone(currentProject);
    const { initialNodes, appSettingsToUse, baseNodeVariables, projectVariablesMap, systemVariablesMap } = initializeRunShared(projectClone);
    
    const startNode = initialNodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      finalizeRun('failed', undefined, 'No Start Node found.');
      return Promise.reject(new Error("No Start Node found."));
    }

    let overallRunStatus: ProjectRun['status'] = 'running';
    let overallFinalOutput: string | undefined = undefined;
    let accumulatedSteps: RunStep[] = [];
    let accumulatedTokens = 0;

    try {
      const mainPathResult = await executeWorkflowPath(
        startNode, '', projectClone, appSettingsToUse, baseNodeVariables, projectVariablesMap, systemVariablesMap,
        isStopRequestedRef, addLogEntry, setCurrentProject, setCurrentExecutingNodeId, setConclusionModalContent, requestUserInput,
        getActiveExecutionCount, incrementActiveExecutionCount, decrementActiveExecutionCount,
        `main-${startNode.id.substring(0,4)}`
      );
      
      accumulatedSteps.push(...mainPathResult.steps);
      accumulatedTokens += mainPathResult.tokens;
      overallFinalOutput = mainPathResult.finalOutput;
      overallRunStatus = mainPathResult.status;

      if (mainPathResult.status === 'failed') throw new Error("Main workflow path failed.");
      if (mainPathResult.status === 'stopped') throw new Error("Workflow stopped by user.");

    } catch (error) {
      console.error("Workflow execution error:", error);
      if (isStopRequestedRef.current || (error instanceof Error && error.message.includes("stopped by user"))) {
        overallRunStatus = 'stopped';
      } else {
        overallRunStatus = 'failed';
      }
    } finally {
      setCurrentRunSteps(prev => [...prev, ...accumulatedSteps]); 
      setTotalTokensThisRun(prev => prev + accumulatedTokens); 
      finalizeRun(overallRunStatus, overallFinalOutput, overallRunStatus === 'failed' ? "Workflow failed (see logs for details)" : (overallRunStatus === 'stopped' ? "Workflow stopped" : undefined));
      setActiveExecutionCount(0); 
    }
    if (overallRunStatus === 'failed' || overallRunStatus === 'stopped') return Promise.reject(new Error(overallRunStatus === 'failed' ? "Run failed" : "Run stopped"));
    return Promise.resolve();
     
  }, [
      currentProject, isWorkflowRunning, isSteppingActive, initializeRunShared, finalizeRun, addLogEntry, setCurrentProject, setCurrentExecutingNodeId, setConclusionModalContent, requestUserInput,
      setActiveExecutionCount, incrementActiveExecutionCount, decrementActiveExecutionCount, getActiveExecutionCount,
      setCurrentRunSteps, setTotalTokensThisRun
  ]);

  const processAndAdvanceStep = useCallback(async (
      projectOverride?: Project,
      baseNodeVariablesOverride?: Map<string, string>,
      projectVariablesMapOverride?: Map<string, string>,
      systemVariablesMapOverride?: Map<string, string>,
      nextStepInfoOverride?: NextStepInfo,
      isAutoSteppingThisCall?: boolean // New flag
  ) => {
    const currentInternalNextStepInfo = nextStepInfoOverride || nextStepInfo;
    const projectForThisStep = projectOverride || currentProject;

    if (isAutoSteppingThisCall) {
        if (!currentInternalNextStepInfo || !projectForThisStep) {
            const errorMsg = `Initial step processing failed: ${!currentInternalNextStepInfo ? 'No initial step info. ' : ''}${!projectForThisStep ? 'No project for initial step. ' : ''}`;
            addLogEntry({ 
                nodeId: currentInternalNextStepInfo?.nodeId || 'workflow_start_error', 
                nodeName: projectForThisStep?.nodes.find(n => n.id === currentInternalNextStepInfo?.nodeId)?.name || 'Workflow Start Error', 
                status: 'failed', 
                error: errorMsg, 
                pathId: currentInternalNextStepInfo?.pathId || 'initial_step', 
                endTime: new Date().toISOString() 
            });
            finalizeRun('failed', undefined, errorMsg.trim());
            return;
        }
    } else { // Manual step (user clicked "Next Step")
        if (!isSteppingActive || !currentInternalNextStepInfo || !projectForThisStep) {
            let warnMsg = "Cannot process step: ";
            if (!isSteppingActive) warnMsg += "Not in stepping mode. ";
            if (!currentInternalNextStepInfo) warnMsg += "No next step info available. ";
            if (!projectForThisStep) warnMsg += "No current project. ";
            console.warn(warnMsg.trim());

            if (isSteppingActive && !currentInternalNextStepInfo) { 
                finalizeRun('completed', projectForThisStep?.nodes.find(n => n.id === currentExecutingNodeId)?.lastRunOutput);
            }
            return;
        }
    }
    
    // Ensure projectForThisStep has nodes if it exists
    if (!projectForThisStep?.nodes) {
        const errorMsg = "Project data is invalid or missing nodes for step processing.";
        addLogEntry({ nodeId: currentInternalNextStepInfo.nodeId, nodeName: 'Unknown Node', status: 'failed', error: errorMsg, pathId: currentInternalNextStepInfo.pathId, endTime: new Date().toISOString() });
        finalizeRun('failed', undefined, errorMsg);
        setNextStepInfo(null);
        return;
    }

    const nodeToExecute = getValidNodes(projectForThisStep.nodes).find(n => n.id === currentInternalNextStepInfo.nodeId);

    if (!nodeToExecute) {
        addLogEntry({ nodeId: currentInternalNextStepInfo.nodeId, nodeName: 'Unknown Node', status: 'failed', error: 'Node to step not found.', pathId: currentInternalNextStepInfo.pathId, endTime: new Date().toISOString() });
        finalizeRun('failed', undefined, 'Node to step not found.');
        setNextStepInfo(null);
        return;
    }

    const currentProjectVariablesMap = projectVariablesMapOverride || new Map<string, string>(
        projectForThisStep.projectVariables?.map((pv: ProjectVariable) => [sanitizeVariableName(pv.name), pv.value]) || []
    );
    const currentSystemVariablesMap = systemVariablesMapOverride || new Map<string,string>([['CurrentDateTime', new Date().toLocaleString()]]); 

    try {
        const processResult = await processSingleNode({
            node: nodeToExecute,
            previousOutput: currentInternalNextStepInfo.input,
            settings: appSettings,
            nodeVariables: currentInternalNextStepInfo.nodeVariables, 
            projectVariablesMap: currentProjectVariablesMap,
            systemVariablesMap: currentSystemVariablesMap,
            isStopRequestedRef,
            addLogEntry,
            setCurrentProject,
            setCurrentExecutingNodeId,
            setConclusionModalContent,
            requestUserInput,
            getActiveExecutionCount, 
            incrementActiveExecutionCount,
            decrementActiveExecutionCount,
            pathId: currentInternalNextStepInfo.pathId,
        });

        setCurrentRunSteps(prev => [...prev, {
            nodeId: nodeToExecute.id,
            nodeName: nodeToExecute.name,
            promptSent: processResult.promptSent,
            responseReceived: processResult.output,
            timestamp: new Date().toISOString(),
            tokensUsed: processResult.tokensUsed,
            pathId: currentInternalNextStepInfo.pathId,
        }]);
        setTotalTokensThisRun(prev => prev + (processResult.tokensUsed || 0));
        
        let nextActualNodeId: string | null | undefined = null;
        let nextInput = processResult.output;

        if (nodeToExecute.type === NodeType.CONDITIONAL) {
            const branches = nodeToExecute.branches || [];
            let matchedBranch = branches.find(branch => {
                const condition = branch.condition.toLowerCase();
                const llmOutput = processResult.output.toLowerCase();
                if (condition.startsWith('contains ')) return llmOutput.includes(condition.substring(9).trim());
                if (condition.startsWith('starts with ')) return llmOutput.startsWith(condition.substring(12).trim());
                return llmOutput === condition;
            });
            if (!matchedBranch) matchedBranch = branches.find(b => b.condition.toLowerCase() === 'default');
            nextActualNodeId = matchedBranch?.nextNodeId;
        } else if (nodeToExecute.type === NodeType.PARALLEL) {
            nextActualNodeId = null; 
        } else if (nodeToExecute.type !== NodeType.CONCLUSION) {
            nextActualNodeId = nodeToExecute.nextNodeId;
        } else { 
            nextActualNodeId = null;
        }

        if (nextActualNodeId) {
            const foundNode = getValidNodes(projectForThisStep.nodes).find(n => n.id === nextActualNodeId);
            if (foundNode) {
                setNextStepInfo({
                    nodeId: nextActualNodeId,
                    input: nextInput,
                    nodeVariables: currentInternalNextStepInfo.nodeVariables, 
                    pathId: currentInternalNextStepInfo.pathId, 
                });
            } else {
                addLogEntry({ nodeId: nextActualNodeId, nodeName: "Unknown Node", status: 'skipped', error: "Next node ID not found.", pathId: currentInternalNextStepInfo.pathId, endTime: new Date().toISOString() });
                setNextStepInfo(null);
                finalizeRun('completed', nextInput); 
            }
        } else { 
            setNextStepInfo(null);
            finalizeRun('completed', nextInput); 
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLogEntry({ nodeId: nodeToExecute.id, nodeName: nodeToExecute.name, status: 'failed', error: errorMessage, pathId: currentInternalNextStepInfo.pathId, endTime: new Date().toISOString() });
        finalizeRun('failed', undefined, errorMessage);
        setNextStepInfo(null);
    }
  }, [
    isSteppingActive, nextStepInfo, currentProject, appSettings, isStopRequestedRef, addLogEntry, setCurrentProject, 
    setCurrentExecutingNodeId, setConclusionModalContent, requestUserInput, finalizeRun,
    getActiveExecutionCount, incrementActiveExecutionCount, decrementActiveExecutionCount,
    setCurrentRunSteps, setTotalTokensThisRun, currentExecutingNodeId
  ]);

  const startStepThrough = useCallback(async () => {
    if (!currentProject || isWorkflowRunning) { 
        console.warn("Cannot start step-through: project not loaded or workflow already running.");
        return;
    }

    setIsWorkflowRunning(true);
    setIsSteppingActive(true);

    const projectClone = deepClone(currentProject);
    const { initialNodes, baseNodeVariables, projectVariablesMap, systemVariablesMap } = initializeRunShared(projectClone);
    
    const startNode = initialNodes.find(n => n.type === NodeType.START);
    if (!startNode) {
        addLogEntry({ nodeId: 'workflow', nodeName: 'Workflow Error', status: 'failed', error: 'No Start Node found.', endTime: new Date().toISOString() });
        finalizeRun('failed', undefined, 'No Start Node found for stepping.');
        return;
    }
    
    const firstStepInfo: NextStepInfo = { 
        nodeId: startNode.id, 
        input: '', 
        nodeVariables: new Map(baseNodeVariables),
        pathId: `step-${startNode.id.substring(0,4)}`
    };
    setNextStepInfo(firstStepInfo); 
    
    await processAndAdvanceStep(
        projectClone, 
        baseNodeVariables, 
        projectVariablesMap, 
        systemVariablesMap,
        firstStepInfo, 
        true // isAutoSteppingThisCall = true
    );

  }, [currentProject, isWorkflowRunning, initializeRunShared, finalizeRun, addLogEntry, setNextStepInfo, setIsWorkflowRunning, setIsSteppingActive, processAndAdvanceStep]);


  const handleStopWorkflow = useCallback(() => {
    isStopRequestedRef.current = true;
    if (isSteppingActive) {
        const lastOutput = currentRunSteps.length > 0 ? currentRunSteps[currentRunSteps.length - 1].responseReceived : undefined;
        finalizeRun('stopped', lastOutput, 'Run stopped by user during stepping.');
        setNextStepInfo(null); 
    } else if (isWorkflowRunning) {
        addLogEntry({nodeId: 'workflow', nodeName: 'Workflow Control', status:'failed', error:'Stop request issued for full run.', endTime: new Date().toISOString()});
        // FinalizeRun will be called by the runWorkflow function's error handling or finally block.
    }
    setCurrentExecutingNodeId(null);
  }, [isSteppingActive, isWorkflowRunning, isStopRequestedRef, finalizeRun, currentRunSteps, addLogEntry, setCurrentExecutingNodeId, setNextStepInfo]);


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
    // Step-through
    isSteppingActive,
    hasNextStep, 
    startStepThrough,
    processAndAdvanceStep,
  };
};
*/