
// src/components/node_edit_modal_parts/ConditionalBranchEditor.tsx
import React from 'react';
import { type Node as WorkflowNode, NodeType } from '../../types'; // Renamed Node to WorkflowNode

interface ConditionalBranch {
  id: string;
  condition: string;
  nextNodeId: string | null;
}

interface ConditionalBranchEditorProps {
  branches: ConditionalBranch[];
  allNodes: WorkflowNode[]; // Use WorkflowNode type
  onBranchChange: (index: number, field: 'condition' | 'nextNodeId', value: string) => void;
  onAddBranch: () => void;
  onRemoveBranch: (index: number) => void;
}

const ConditionalBranchEditor: React.FC<ConditionalBranchEditorProps> = ({
  branches,
  allNodes,
  onBranchChange,
  onAddBranch,
  onRemoveBranch,
}) => {
  // Available nodes for branching (excluding START nodes and current node itself, handled by allNodes prop)
  const availableNextNodes = allNodes;

  return (
    <div className="space-y-3">
      <h4 className="text-md font-medium">Branches (Conditions & Next Nodes)</h4>
      {branches.map((branch, index) => (
        <div key={branch.id} className="rounded-md border border-slate-600 p-3 space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Condition (e.g., contains 'YES', default)"
              value={branch.condition}
              onChange={(e) => onBranchChange(index, 'condition', e.target.value)}
              className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              aria-label={`Condition for branch ${index + 1}`}
            />
            <button
              onClick={() => onRemoveBranch(index)}
              className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-slate-700"
              aria-label={`Remove branch ${index + 1}`}
              title={`Remove branch ${index + 1}`}
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <select
            value={branch.nextNodeId || ''}
            onChange={(e) => onBranchChange(index, 'nextNodeId', e.target.value)}
            className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            aria-label={`Next node for branch ${index + 1}`}
          >
            <option value="">None (End branch)</option>
            {availableNextNodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.name || `${n.type} (${n.id.substring(0, 4)})`}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        onClick={onAddBranch}
        className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 flex items-center"
      >
       <i className="fas fa-plus mr-2"></i> Add Branch
      </button>
    </div>
  );
};

export default ConditionalBranchEditor;