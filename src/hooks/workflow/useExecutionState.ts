// src/hooks/workflow/useExecutionState.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import type { ConclusionOutputModalData, NextStepInfo, RunStep } from '../../types'; // Updated path

export const useExecutionState = () => {
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const isStopRequestedRef = useRef(false);
  const [currentExecutingNodeId, setCurrentExecutingNodeId] = useState<string | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [runEndTime, setRunEndTime] = useState<number | null>(null);
  const [totalTokensThisRun, setTotalTokensThisRun] = useState<number>(0);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState<boolean>(true);
  const [conclusionModalContent, setConclusionModalContent] = useState<ConclusionOutputModalData | null>(null);
  
  const [activeExecutionCount, setActiveExecutionCount] = useState(0);
  const activeExecutionCountRef = useRef(activeExecutionCount); 
  useEffect(() => {
    activeExecutionCountRef.current = activeExecutionCount;
  }, [activeExecutionCount]);

  const [isSteppingActive, setIsSteppingActive] = useState(false);
  const [nextStepInfo, setNextStepInfo] = useState<NextStepInfo | null>(null);
  const [currentRunSteps, setCurrentRunSteps] = useState<RunStep[]>([]); 


  const incrementActiveExecutionCount = useCallback(() => {
    setActiveExecutionCount(prev => prev + 1);
  }, []);

  const decrementActiveExecutionCount = useCallback(() => {
    setActiveExecutionCount(prev => Math.max(0, prev - 1));
  }, []);

  const getActiveExecutionCount = useCallback(() => {
    return activeExecutionCountRef.current;
  }, []);

  const clearConclusionModalContent = useCallback(() => {
    setConclusionModalContent(null);
  }, []);

  return {
    isWorkflowRunning,
    setIsWorkflowRunning,
    isStopRequestedRef,
    currentExecutingNodeId,
    setCurrentExecutingNodeId,
    runStartTime,
    setRunStartTime,
    runEndTime,
    setRunEndTime,
    totalTokensThisRun,
    setTotalTokensThisRun,
    isExecutionPanelOpen,
    setIsExecutionPanelOpen,
    conclusionModalContent,
    setConclusionModalContent,
    clearConclusionModalContent,
    activeExecutionCount, 
    setActiveExecutionCount, 
    incrementActiveExecutionCount,
    decrementActiveExecutionCount,
    getActiveExecutionCount,
    isSteppingActive,
    setIsSteppingActive,
    nextStepInfo,
    setNextStepInfo,
    currentRunSteps, 
    setCurrentRunSteps,
  };
};
