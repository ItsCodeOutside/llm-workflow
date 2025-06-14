
// src/hooks/workflow/useWorkflowExecution.ts
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useAppSettings } from '../../hooks';
import {
  type Project, NodeType, type ProjectRun, type RunStep, type Node, ProjectVariable, type NodeExecutionLog, LLMProvider, ConclusionOutputModalData, NextStepInfo, type AppSettings, WorkflowExecutionCallbacks
} from '../../types';
import { deepClone, generateId, getValidNodes, sanitizeVariableName } from '../../utils';
import { MAX_RUN_HISTORY } from '../../constants';

import { useExecutionState } from './useExecutionState';
import { useExecutionLogger } from './useExecutionLogger';
import { executeWorkflow as executeWorkflowFromService, processNodeInExecutor, ExecuteWorkflowResult } from '../../utils/workflowExecutorService';


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
    getActiveExecutionCount, incrementActiveExecutionCount, decrementActiveExecutionCount,
    isSteppingActive, setIsSteppingActive,
    nextStepInfo, setNextStepInfo,
    currentRunSteps, setCurrentRunSteps,
  } = useExecutionState();

  const {
    executionLogs, setExecutionLogs, addLogEntry: addLogEntryToHookState,
  } = useExecutionLogger();

  const hasNextStep = useMemo(() => nextStepInfo !== null, [nextStepInfo]);

  const runSpecificParallelPathCounterRef = useRef(0);


  useEffect(() => {
    if (!isWorkflowRunning) {
        isStopRequestedRef.current = false;
        if (!isSteppingActive) {
             setNextStepInfo(null);
        }
    }
  }, [isWorkflowRunning, isSteppingActive, isStopRequestedRef, setNextStepInfo]);


  const executorCallbacks = useMemo((): WorkflowExecutionCallbacks => ({
    onLogEntry: (log) => {
      addLogEntryToHookState(log);
      if (log.status === 'running' && log.nodeId) {
        setCurrentExecutingNodeId(log.nodeId);
      }
    },
    onNodeStatusUpdate: (nodeId, updates) => {
      setCurrentProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: getValidNodes(prev.nodes).map(n => n.id === nodeId ? { ...n, ...updates } : n)
        };
      });
    },
    onConclusion: setConclusionModalContent,
    onRequestUserInput: requestUserInput,
    onTokenUpdate: (tokens) => setTotalTokensThisRun(prev => prev + tokens),
    getActiveExecutionCount: getActiveExecutionCount,
    incrementActiveExecutionCount: incrementActiveExecutionCount,
    decrementActiveExecutionCount: decrementActiveExecutionCount,
    getParallelPathCounter: () => runSpecificParallelPathCounterRef.current,
    incrementParallelPathCounter: (count: number) => {
        runSpecificParallelPathCounterRef.current += count;
    },
    decrementParallelPathCounter: () => {
        runSpecificParallelPathCounterRef.current = Math.max(0, runSpecificParallelPathCounterRef.current - 1);
    },
    isStopRequested: () => isStopRequestedRef.current,
  }), [
      addLogEntryToHookState, setCurrentProject, setConclusionModalContent, requestUserInput,
      setTotalTokensThisRun, getActiveExecutionCount, incrementActiveExecutionCount,
      decrementActiveExecutionCount, isStopRequestedRef, setCurrentExecutingNodeId,
  ]);


  const initializeRunForHook = useCallback(() => {
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
    setRunStartTime(Date.now());
    setRunEndTime(null);
    setTotalTokensThisRun(0);
    setIsExecutionPanelOpen(true);
    isStopRequestedRef.current = false;
    setConclusionModalContent(null);
    setCurrentRunSteps([]);
    runSpecificParallelPathCounterRef.current = 0;
  }, [
    currentProject, hasUnsavedChanges, saveProjectState, setCurrentProject, setExecutionLogs,
    setCurrentExecutingNodeId, setRunStartTime, setRunEndTime, setTotalTokensThisRun,
    setIsExecutionPanelOpen, isStopRequestedRef, setConclusionModalContent, setCurrentRunSteps,
  ]);


  const finalizeRunForHook = useCallback((result: ExecuteWorkflowResult) => {
    const endTime = Date.now();
    setRunEndTime(endTime);
    setIsWorkflowRunning(false);
    setIsSteppingActive(false); // Ensure stepping is also deactivated
    setCurrentExecutingNodeId(null);

    setCurrentProject(prevProject => {
      if (!prevProject) return null;
      
      let finalNodesSource = prevProject.nodes;
      if (result.updatedNodes && Array.isArray(result.updatedNodes) && result.updatedNodes.every(n => n && n.id)) {
        finalNodesSource = result.updatedNodes;
      }
      const finalNodesState = getValidNodes(finalNodesSource).map(n => ({...n, isRunning: false}));

      const runEntry: ProjectRun = {
        id: generateId(),
        timestamp: new Date(runStartTime!).toISOString(),
        status: result.status,
        steps: result.steps, 
        finalOutput: result.finalOutput,
        error: result.error,
        totalTokensUsed: result.totalTokensUsed, 
        durationMs: runStartTime ? endTime - runStartTime : 0,
      };
      const updatedHistory = [...(prevProject.runHistory || []), runEntry].slice(-MAX_RUN_HISTORY);

      const projectToSave = { ...prevProject, nodes: finalNodesState, runHistory: updatedHistory };
      saveProjectState(projectToSave, false);
      return projectToSave;
    });
    isStopRequestedRef.current = false;
    setNextStepInfo(null); 
  }, [runStartTime, saveProjectState, setCurrentProject, setIsWorkflowRunning, setIsSteppingActive, setCurrentExecutingNodeId, setRunEndTime, setNextStepInfo]);


  const runWorkflow = useCallback(async () => {
    const guardCurrentProject = !!currentProject;
    if (!guardCurrentProject || isWorkflowRunning || isSteppingActive) {
      return Promise.reject(new Error("Workflow already running or in stepping mode, or no project."));
    }

    initializeRunForHook();
    setIsWorkflowRunning(true);

    let result: ExecuteWorkflowResult;
    try {
        if (!currentProject) { 
            throw new Error("Current project is null immediately before calling executor service.");
        }
        result = await executeWorkflowFromService(currentProject, appSettings, executorCallbacks); // Pass appSettings
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown critical error from executor service call";
        const nodesForErrorResult = currentProject ? currentProject.nodes : [];
        result = { status: 'failed', error: errorMsg, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: nodesForErrorResult };
    }
    
    setTotalTokensThisRun(result.totalTokensUsed);
    setCurrentRunSteps(result.steps);

    finalizeRunForHook(result);

    if (result.status === 'failed' || result.status === 'stopped') {
      return Promise.reject(new Error(result.error || result.status));
    }
    return Promise.resolve();
  }, [
    currentProject, isWorkflowRunning, isSteppingActive, appSettings, // Added appSettings
    initializeRunForHook, executorCallbacks, finalizeRunForHook, setIsWorkflowRunning,
    currentRunSteps, totalTokensThisRun, setCurrentRunSteps, setTotalTokensThisRun
  ]);

  const startStepThrough = useCallback(async () => {
    if (!currentProject || isWorkflowRunning) { 
        console.warn("Cannot start step-through: project not loaded or workflow already running/stepping.");
        return;
    }
    
    initializeRunForHook();
    setIsWorkflowRunning(true);
    setIsSteppingActive(true);

    const projectClone = deepClone(currentProject);
    const startNode = getValidNodes(projectClone.nodes).find(n => n.type === NodeType.START);

    if (!startNode) {
        const errorMsg = 'No Start Node found for stepping.';
        executorCallbacks.onLogEntry({ nodeId: 'workflow_error', nodeName: 'Workflow Error', status: 'failed', error: errorMsg, pathId:'main-step', endTime: new Date().toISOString() });
        finalizeRunForHook({ status: 'failed', error: errorMsg, steps: [], totalTokensUsed: 0, updatedNodes: projectClone.nodes });
        return;
    }

    const currentPathNodeVariables = new Map<string, string>(); 
     const projectVariablesMap = new Map<string, string>(
        projectClone.projectVariables?.map((pv: ProjectVariable) => [sanitizeVariableName(pv.name), pv.value]) || []
    );
    const systemVariablesMap = new Map<string, string>([['CurrentDateTime', new Date().toLocaleString()]]);
    const stepPathId = `step-main-${startNode.id.substring(0,4)}`;

    try {
        const processResult = await processNodeInExecutor({
            node: startNode,
            previousOutput: '', 
            settings: appSettings, // Pass appSettings
            nodeVariables: currentPathNodeVariables,
            projectVariablesMap,
            systemVariablesMap,
            callbacks: executorCallbacks,
            pathId: stepPathId,
            projectNodes: projectClone.nodes,
            onPathCounterManagedByNode: () => {}
        });

        setCurrentRunSteps(prev => [...prev, {
            nodeId: startNode.id, nodeName: startNode.name, promptSent: processResult.promptSent,
            responseReceived: processResult.output, timestamp: new Date().toISOString(),
            tokensUsed: processResult.tokensUsed, pathId: stepPathId
        }]);
        
        if (startNode.nextNodeId) {
            setNextStepInfo({
                nodeId: startNode.nextNodeId,
                input: processResult.output,
                nodeVariables: new Map(currentPathNodeVariables), 
                pathId: stepPathId
            });
        } else {
            setNextStepInfo(null);
            finalizeRunForHook({ status: 'completed', finalOutput: processResult.output, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: projectClone.nodes });
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error processing START node for stepping.";
        finalizeRunForHook({ status: 'failed', error: errorMsg, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: projectClone.nodes });
    }

  }, [
    currentProject, isWorkflowRunning, appSettings, // Added appSettings
    initializeRunForHook, executorCallbacks, finalizeRunForHook, setIsWorkflowRunning, setIsSteppingActive, setNextStepInfo,
    currentRunSteps, totalTokensThisRun, setCurrentRunSteps
  ]);

  const processAndAdvanceStep = useCallback(async () => {
    if (!isSteppingActive || !nextStepInfo || !currentProject) {
        if (isSteppingActive && !nextStepInfo) { 
             const finalResult: ExecuteWorkflowResult = { status: 'completed', finalOutput: currentRunSteps.length > 0 ? currentRunSteps[currentRunSteps.length-1].responseReceived : undefined, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: currentProject?.nodes || [] };
            finalizeRunForHook(finalResult);
        }
        return;
    }

    const projectClone = deepClone(currentProject); 
    const nodeToExecute = getValidNodes(projectClone.nodes).find(n => n.id === nextStepInfo.nodeId);

    if (!nodeToExecute) {
        const errorMsg = `Node to step (ID: ${nextStepInfo.nodeId}) not found.`;
        executorCallbacks.onLogEntry({ nodeId: nextStepInfo.nodeId, nodeName: 'Unknown Node', status: 'failed', error: errorMsg, pathId: nextStepInfo.pathId, endTime: new Date().toISOString() });
        finalizeRunForHook({ status: 'failed', error: errorMsg, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: projectClone.nodes });
        return;
    }

    const currentPathNodeVariables = new Map(nextStepInfo.nodeVariables); 
    const projectVariablesMap = new Map<string, string>(
        projectClone.projectVariables?.map((pv: ProjectVariable) => [sanitizeVariableName(pv.name), pv.value]) || []
    );
    const systemVariablesMap = new Map<string, string>([['CurrentDateTime', new Date().toLocaleString()]]);

    try {
        const processResult = await processNodeInExecutor({
            node: nodeToExecute,
            previousOutput: nextStepInfo.input,
            settings: appSettings, // Pass appSettings
            nodeVariables: currentPathNodeVariables,
            projectVariablesMap,
            systemVariablesMap,
            callbacks: executorCallbacks,
            pathId: nextStepInfo.pathId,
            projectNodes: projectClone.nodes,
            onPathCounterManagedByNode: () => {} 
        });

        setCurrentRunSteps(prev => [...prev, {
            nodeId: nodeToExecute.id, nodeName: nodeToExecute.name, promptSent: processResult.promptSent,
            responseReceived: processResult.output, timestamp: new Date().toISOString(),
            tokensUsed: processResult.tokensUsed, pathId: nextStepInfo.pathId
        }]);

        let nextNodeIdForStep: string | null | undefined = null;

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
            nextNodeIdForStep = matchedBranch?.nextNodeId;
        } else if (nodeToExecute.type === NodeType.PARALLEL) {
            nextNodeIdForStep = null;
            executorCallbacks.onLogEntry({
                nodeId: nodeToExecute.id, nodeName: nodeToExecute.name, status: 'completed',
                output: "Parallel node processed. Stepping pauses here. Run full workflow to execute branches.",
                pathId: nextStepInfo.pathId, endTime: new Date().toISOString()
            });
        } else if (nodeToExecute.type === NodeType.SYNCHRONIZE) {
            nextNodeIdForStep = nodeToExecute.nextNodeId;
        } else if (nodeToExecute.type !== NodeType.CONCLUSION) {
            nextNodeIdForStep = nodeToExecute.nextNodeId;
        }
        
        if (nodeToExecute.type === NodeType.CONCLUSION || !nextNodeIdForStep) {
            setNextStepInfo(null);
            finalizeRunForHook({ status: 'completed', finalOutput: processResult.output, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: projectClone.nodes });
        } else {
             const nextNodeExists = getValidNodes(projectClone.nodes).find(n => n.id === nextNodeIdForStep);
             if (!nextNodeExists) {
                executorCallbacks.onLogEntry({ nodeId: nextNodeIdForStep, nodeName: 'Unknown Node', status: 'skipped', error: "Next node for step not found in project.", pathId: nextStepInfo.pathId, endTime: new Date().toISOString() });
                setNextStepInfo(null);
                finalizeRunForHook({ status: 'completed', finalOutput: processResult.output, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: projectClone.nodes });
             } else {
                setNextStepInfo({
                    nodeId: nextNodeIdForStep,
                    input: processResult.output,
                    nodeVariables: new Map(currentPathNodeVariables),
                    pathId: nextStepInfo.pathId 
                });
             }
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error processing step.";
        finalizeRunForHook({ status: 'failed', error: errorMsg, steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: projectClone.nodes });
    }

  }, [
    isSteppingActive, nextStepInfo, currentProject, appSettings, // Added appSettings
    executorCallbacks, finalizeRunForHook,
    currentRunSteps, totalTokensThisRun, setCurrentRunSteps
  ]);


  const handleStopWorkflow = useCallback(() => {
    isStopRequestedRef.current = true;
    if (isSteppingActive) {
        const lastOutput = currentRunSteps.length > 0 ? currentRunSteps[currentRunSteps.length - 1].responseReceived : undefined;
        const result: ExecuteWorkflowResult = { status: 'stopped', finalOutput: lastOutput, error: 'Run stopped by user during stepping.', steps: currentRunSteps, totalTokensUsed: totalTokensThisRun, updatedNodes: currentProject?.nodes || [] };
        finalizeRunForHook(result);
    } else if (isWorkflowRunning) {
         executorCallbacks.onLogEntry({nodeId: 'workflow_control', nodeName: 'Workflow Control', status:'failed', error:'Stop request issued for full run.', endTime: new Date().toISOString(), pathId: 'main'});
    }
  }, [isSteppingActive, isWorkflowRunning, isStopRequestedRef, currentRunSteps, totalTokensThisRun, currentProject, finalizeRunForHook, executorCallbacks]);

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
    isSteppingActive,
    hasNextStep,
    startStepThrough,
    processAndAdvanceStep,
  };
};
