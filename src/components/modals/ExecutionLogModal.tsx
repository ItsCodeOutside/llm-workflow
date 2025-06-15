import React from 'react';
import Modal from '../Modal';
import type { Node, NodeExecutionLog } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ExecutionLogModalProps {
  logs: NodeExecutionLog[];
  currentExecutingNodeId: string | null;
  nodes: Node[];
  runStartTime: number | null;
  runEndTime: number | null;
  totalTokensThisRun: number;
  isOpen: boolean;
  onClose: () => void;
  currentProjectName: string;
}

const ExecutionLogModal: React.FC<ExecutionLogModalProps> = ({
  logs, currentExecutingNodeId, nodes, runStartTime, runEndTime, totalTokensThisRun, isOpen, onClose, currentProjectName
}) => {
  const isMobile = useIsMobile();

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Execution Log - ${currentProjectName}`}> 
      <div className="space-y-2 text-xs sm:text-sm max-h-[60vh] overflow-y-auto custom-scroll">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">{currentExecutingNode ? `Running: ${currentExecutingNode.name}` : (runStartTime && !runEndTime ? 'Running...' : (runEndTime ? 'Finished' : 'Idle'))}</span>
          <span className="truncate">Dur: {runDuration}</span>
          {totalTokensThisRun > 0 && <span className="truncate">Tokens: {totalTokensThisRun}</span>}
        </div>
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
    </Modal>
  );
};

export default ExecutionLogModal;