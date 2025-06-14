// src/components/RunHistoryModal.tsx
import React from 'react';
import Modal from './Modal';
import type { ProjectRun, RunHistoryModalProps } from '../types'; // Updated path

const RunHistoryModal: React.FC<RunHistoryModalProps> = ({ runHistory, isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Run History" widthClass="sm:max-w-4xl">
      <div className="max-h-[70vh] overflow-y-auto space-y-4 custom-scroll">
        {runHistory.length === 0 && <p className="text-slate-400">No runs recorded yet.</p>}
        {runHistory.slice().reverse().map((run: ProjectRun) => ( 
          <div key={run.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="mb-2 flex flex-wrap justify-between items-center text-sm text-slate-400 gap-x-4 gap-y-1">
              <span>Run ID: {run.id.substring(0,6)}</span>
              <span>Status: <span className={`font-semibold ${run.status === 'completed' ? 'text-green-400' : (run.status === 'running' ? 'text-yellow-400' : (run.status === 'stopped' ? 'text-orange-400' : 'text-red-400'))}`}>{run.status}</span></span>
              <span>{new Date(run.timestamp).toLocaleString()}</span>
              {run.durationMs !== undefined && <span>Duration: {(run.durationMs / 1000).toFixed(2)}s</span>}
              {run.totalTokensUsed !== undefined && <span>Tokens: {run.totalTokensUsed}</span>}
            </div>
            {run.steps.map(step => (
              <details key={step.nodeId + step.timestamp} className="mb-2 rounded bg-slate-700 p-2">
                <summary className="cursor-pointer font-medium text-slate-200">
                  Node: {step.nodeName || step.nodeId} {step.error ? <span className="text-red-400">(Error)</span> : ''}
                  {step.tokensUsed !== undefined && <span className="text-xs text-slate-400 ml-2">({step.tokensUsed} tokens)</span>}
                </summary>
                <div className="mt-2 space-y-1 pl-4 text-xs text-slate-300">
                  <p><strong>Prompt:</strong> <pre className="whitespace-pre-wrap break-all bg-slate-600 p-1 rounded">{step.promptSent}</pre></p>
                  <p><strong>Response:</strong> <pre className="whitespace-pre-wrap break-all bg-slate-600 p-1 rounded">{step.responseReceived}</pre></p>
                  {step.error && <p><strong>Error:</strong> <span className="text-red-300">{step.error}</span></p>}
                </div>
              </details>
            ))}
            {run.finalOutput && !run.error && <p className="mt-2 text-sm"><strong>Final Output:</strong> {run.finalOutput}</p>}
            {run.error && <p className="mt-2 text-sm text-red-400"><strong>Run Error:</strong> {run.error}</p>}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default RunHistoryModal;
