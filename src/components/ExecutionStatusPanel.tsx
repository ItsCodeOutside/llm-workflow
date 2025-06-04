// src/components/ExecutionStatusPanel.tsx
import React, { useEffect, useRef } from 'react';
import type { Node, NodeExecutionLog } from '../../types';

interface ExecutionStatusPanelProps {
  logs: NodeExecutionLog[];
  currentExecutingNodeId: string | null;
  nodes: Node[]; // To get node names if not in log
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

  useEffect(() => {
    // Scroll to bottom when new logs are added or panel is opened
    if (isOpen && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      // Fallback for environments where toLocaleTimeString with fractionalSecondDigits might error
      const timePart = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Use 24-hour format for consistency
      });
      const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
      return `${timePart}.${milliseconds}`;
    } catch (e) {
        // Basic fallback if toLocaleTimeString fails unexpectedly
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

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-2xl z-40 transition-all duration-300 ease-in-out ${isOpen ? 'max-h-72' : 'max-h-12 hover:max-h-14'} overflow-hidden`}>
      <div className="flex justify-between items-center p-2 px-4 cursor-pointer bg-slate-750 hover:bg-slate-700" onClick={onToggle}>
        <h3 className="text-md font-semibold text-slate-100 truncate">
          Execution: {currentProjectName} {currentExecutingNode ? `(Running: ${currentExecutingNode.name || 'Unnamed Node'})` : (runStartTime && !runEndTime ? '(Running...)' : (runEndTime ? '(Finished)' : '(Idle)'))}
        </h3>
        <div className="flex items-center space-x-4 text-slate-300 text-sm flex-shrink-0">
            {runStartTime && <span className="truncate">Duration: {runDuration}</span>}
            {totalTokensThisRun > 0 && <span className="truncate">Tokens: {totalTokensThisRun}</span>}
            <button className="text-slate-300 hover:text-white">
            <i className={`fas ${isOpen ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
            </button>
        </div>
      </div>
      {isOpen && (
        <div ref={panelRef} className="p-4 max-h-[calc(18rem-3rem)] /* Adjusted max-h for 72-12 = 60 */ overflow-y-auto custom-scroll space-y-2 text-sm">
          {logs.length === 0 && <p className="text-slate-400">No execution data for this run yet.</p>}
          {logs.map((log, index) => (
            <div key={index} className="p-2 bg-slate-700 rounded-md">
              <div className="flex justify-between items-center">
                <span className={`font-semibold ${getStatusColor(log.status)}`}>{log.nodeName || log.nodeId} - {log.status.toUpperCase()}</span>
                <span className="text-xs text-slate-400">
                  {formatTime(log.startTime)} - {log.endTime ? formatTime(log.endTime) : '...'}
                </span>
              </div>
              {log.output && <pre className="mt-1 text-xs bg-slate-600 p-1 rounded whitespace-pre-wrap break-all max-h-20 overflow-y-auto custom-scroll">{log.output}</pre>}
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
