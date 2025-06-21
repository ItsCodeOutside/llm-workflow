// src/components/ExecutionStatusPanel.tsx
// This file has been replaced by ExecutionLogModal in modals/.

import React, { useEffect, useRef } from 'react';
import type { Node, NodeExecutionLog } from '../types'; // Updated path
import { useIsMobile } from '../hooks/useIsMobile';


interface ExecutionStatusPanelProps {
  logs: NodeExecutionLog[];
  currentExecutingNodeId: string | null;
  nodes: Node[]; 
  runStartTime: number | null;
  runEndTime: number | null;
  totalTokensThisRun: number;
  isOpen: boolean;
  onToggle: () => void;
  currentProjectName: string;
}

const ExecutionStatusPanel: React.FC<ExecutionStatusPanelProps> = ({
  logs, currentExecutingNodeId, nodes, runStartTime, runEndTime, totalTokensThisRun, isOpen, onToggle, currentProjectName
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      const timePart = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      });
      const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
      return `${timePart}.${milliseconds}`;
    } catch (e) {
        const date = new Date(isoString);
        return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }
  };
  
  const getStatusColor = (status: NodeExecutionLog['status']) => {
    switch (status) {
      case 'running': return 'text-yellow-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'skipped': return 'text-slate-500';
      default: return 'text-slate-300';
    }
  };

  const currentExecutingNode = currentExecutingNodeId ? nodes.find(n => n.id === currentExecutingNodeId) : null;
  const runDuration = runStartTime && runEndTime ? ((runEndTime - runStartTime) / 1000).toFixed(2) + 's' : (runStartTime ? 'Running...' : '-');

  const panelMaxHeightClass = isOpen 
    ? (isMobile ? 'max-h-48 sm:max-h-72' : 'max-h-72') 
    : 'max-h-12 hover:max-h-14';
  
  const contentMaxHeight = isMobile ? 'max-h-[calc(12rem-3rem)] sm:max-h-[calc(18rem-3rem)]' : 'max-h-[calc(18rem-3rem)]';


  return (
    <div className={`bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-2xl z-20 transition-all duration-300 ease-in-out ${panelMaxHeightClass} overflow-hidden ${isMobile ? 'sticky' : 'fixed'}`}>
      <div className="flex justify-between items-center p-2 px-3 sm:px-4 cursor-pointer bg-slate-750 hover:bg-slate-700" onClick={onToggle}>
        <h3 className="text-sm sm:text-md font-semibold text-slate-100 truncate">
          Exec: {currentProjectName.substring(0, isMobile? 10: 20)}{isMobile && currentProjectName.length > 10 ? "..." : ""} {currentExecutingNode ? `(Running: ${currentExecutingNode.name.substring(0, isMobile? 5:10) || 'Node'})` : (runStartTime && !runEndTime ? '(Running...)' : (runEndTime ? '(Fin)' : '(Idle)'))}
        </h3>
        <div className="flex items-center space-x-2 sm:space-x-4 text-slate-300 text-xs sm:text-sm flex-shrink-0">
            {runStartTime && <span className="truncate">Dur: {runDuration}</span>}
            {totalTokensThisRun > 0 && <span className="truncate">Tokens: {totalTokensThisRun}</span>}
            <button className="text-slate-300 hover:text-white p-1">
            <i className={`fas ${isOpen ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
            </button>
        </div>
      </div>
      {isOpen && (
        <div ref={panelRef} className={`p-2 sm:p-4 ${contentMaxHeight} overflow-y-auto custom-scroll space-y-2 text-xs sm:text-sm`}>
          {logs.length === 0 && <p className="text-slate-400">No execution data for this run yet.</p>}
          {logs.map((log, index) => (
            <div key={index} className="p-1.5 sm:p-2 bg-slate-700 rounded-md">
              <div className="flex justify-between items-center">
                <span className={`font-semibold ${getStatusColor(log.status)}`}>{log.nodeName || log.nodeId} - {log.status.toUpperCase()}</span>
                <span className="text-xs text-slate-400">
                  {formatTime(log.startTime)} - {log.endTime ? formatTime(log.endTime) : '...'}
                </span>
              </div>
              {log.output && <pre className="mt-1 text-xs bg-slate-600 p-1 rounded whitespace-pre-wrap break-all max-h-16 sm:max-h-20 overflow-y-auto custom-scroll">{log.output}</pre>}
              {log.error && <p className="mt-1 text-xs text-red-300">Error: {log.error}</p>}
              {log.tokensUsed !== undefined && <p className="mt-1 text-xs text-slate-400">Tokens: {log.tokensUsed}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionStatusPanel;
