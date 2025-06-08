// src/hooks/workflow/useExecutionLogger.ts
import { useState, useCallback } from 'react';
import type { NodeExecutionLog } from '../../../types';

export const useExecutionLogger = () => {
  const [executionLogs, setExecutionLogs] = useState<NodeExecutionLog[]>([]);

  const addLogEntry = useCallback((logEntry: Partial<NodeExecutionLog> & { nodeId: string, nodeName: string }) => {
    setExecutionLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.nodeId === logEntry.nodeId && log.status === 'running');
      if (existingLogIndex !== -1) {
        const updatedLogs = [...prevLogs];
        // Merge with existing log, but ensure startTime is not overwritten if new entry doesn't have it
        const newLogData = { ...updatedLogs[existingLogIndex], ...logEntry };
        if (!logEntry.startTime && updatedLogs[existingLogIndex].startTime) {
            newLogData.startTime = updatedLogs[existingLogIndex].startTime;
        }
        updatedLogs[existingLogIndex] = newLogData;
        return updatedLogs;
      } else {
        return [...prevLogs, {
          startTime: new Date().toISOString(),
          status: 'running', // Default status if not provided
          ...logEntry,
        } as NodeExecutionLog];
      }
    });
  }, []);

  return {
    executionLogs,
    setExecutionLogs,
    addLogEntry,
  };
};
