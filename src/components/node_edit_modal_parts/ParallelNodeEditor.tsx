
// src/components/node_edit_modal_parts/ParallelNodeEditor.tsx
import React from 'react';
import { type Node as WorkflowNode } from '../../types';

interface ParallelNodeEditorProps {
  parallelNextNodeIds: string[];
  allNodes: WorkflowNode[];
  onNodeIdChange: (index: number, value: string | null) => void;
  onAddPath: () => void;
  onRemovePath: (index: number) => void;
  maxPaths: number;
}

const ParallelNodeEditor: React.FC<ParallelNodeEditorProps> = ({
  parallelNextNodeIds,
  allNodes,
  onNodeIdChange,
  onAddPath,
  onRemovePath,
  maxPaths,
}) => {
  const availableNextNodes = allNodes; // Assuming allNodes is already filtered (no Start, no self)

  // We need to render enough dropdowns for existing paths + one empty for adding if not at max
  const pathsToRenderCount = Math.min(maxPaths, parallelNextNodeIds.length + (parallelNextNodeIds.length < maxPaths ? 1 : 0));
  
  const currentSelections = parallelNextNodeIds.filter(id => id && id.trim() !== '');

  return (
    <div className="space-y-3">
      <h4 className="text-md font-medium">Parallel Next Nodes (up to {maxPaths})</h4>
      <p className="text-xs text-slate-400 -mt-2 mb-2">The output of this Parallel node will be sent to each selected node simultaneously.</p>
      
      {Array.from({ length: pathsToRenderCount }).map((_, index) => {
        const selectedNodeId = parallelNextNodeIds[index] || '';
        
        // If this is an "extra" slot for adding a new path, only render if we haven't filled all slots with actual selections.
        // And ensure it's not beyond maxPaths.
        if (index >= parallelNextNodeIds.length && index >= maxPaths) {
            return null;
        }

        return (
          <div key={`parallel-path-${index}`} className="rounded-md border border-slate-600 p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <select
                value={selectedNodeId}
                onChange={(e) => onNodeIdChange(index, e.target.value || null)} // Pass null if "None" selected
                className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                aria-label={`Next node for parallel path ${index + 1}`}
              >
                <option value="">None (Remove/End Path)</option>
                {availableNextNodes.map(n => {
                  // Disable option if it's already selected in another path, unless it's the current path's selection
                  const isDisabled = currentSelections.includes(n.id) && selectedNodeId !== n.id;
                  return (
                    <option key={n.id} value={n.id} disabled={isDisabled} title={isDisabled ? "Already selected in another path" : ""}>
                      {n.name || `${n.type} (${n.id.substring(0, 4)})`} {isDisabled ? "(Selected)" : ""}
                    </option>
                  );
                })}
              </select>
              { (selectedNodeId || index < parallelNextNodeIds.length) && /* Show remove only if it's an existing path or an empty slot that was explicitly added */
                 (index < parallelNextNodeIds.length || (selectedNodeId === '' && index < pathsToRenderCount)) && (
                <button
                    onClick={() => onRemovePath(index)}
                    className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-slate-700"
                    aria-label={`Remove parallel path ${index + 1}`}
                    title={`Remove parallel path ${index + 1}`}
                >
                    <i className="fas fa-trash"></i>
                </button>
               )}
            </div>
          </div>
        );
      })}

      {parallelNextNodeIds.length < maxPaths && pathsToRenderCount <= parallelNextNodeIds.length && (
        <button
          onClick={onAddPath}
          className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 flex items-center"
        >
          <i className="fas fa-plus mr-2"></i> Add Path
        </button>
      )}
       {parallelNextNodeIds.length >= maxPaths && (
        <p className="text-xs text-slate-400">Maximum {maxPaths} parallel paths reached.</p>
      )}
    </div>
  );
};

export default ParallelNodeEditor;