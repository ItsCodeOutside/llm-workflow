// src/hooks/workflow/useExecutionState.ts
import { useState, useRef, useCallback } from 'react';
import type { ConclusionOutputModalData } from '../../../types';

export const useExecutionState = () => {
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const isStopRequestedRef = useRef(false);
  const [currentExecutingNodeId, setCurrentExecutingNodeId] = useState<string | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [runEndTime, setRunEndTime] = useState<number | null>(null);
  const [totalTokensThisRun, setTotalTokensThisRun] = useState<number>(0);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState<boolean>(true);
  const [conclusionModalContent, setConclusionModalContent] = useState<ConclusionOutputModalData | null>(null);

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
  };
};
