// src/components/NodeEditModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { type Node, type NodeModalProps, NodeType } from '../../types'; 
import { deepClone, generateId } from '../utils';

const NodeEditModal: React.FC<NodeModalProps> = ({ node, isOpen, onClose, onSave, allNodes }) => {
  const [editableNode, setEditableNode] = useState<Node | null>(null);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);

  useEffect(() => {
    if (node) {
      const clonedNode = deepClone(node);
      setEditableNode(clonedNode);
      
      // Validation logic for save button
      let isDisabled = !clonedNode.name?.trim(); // Name is always required
      if (clonedNode.type === NodeType.CONCLUSION) {
        isDisabled = isDisabled || !clonedNode.prompt?.trim(); // Prompt (as title) is required for Conclusion
      } else if (clonedNode.type !== NodeType.VARIABLE) { // START, PROMPT, CONDITIONAL
        isDisabled = isDisabled || !clonedNode.prompt?.trim(); // Prompt is required for these
      }
      // For VARIABLE node, only name is strictly required by this logic. Prompt is not used for LLM.
      setIsSaveDisabled(isDisabled);
    } else {
      setEditableNode(null);
      setIsSaveDisabled(true);
    }
  }, [node]);

  if (!isOpen || !editableNode) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableNode(prev => {
      if (!prev) return null;
      const updated = { ...prev, [name]: value };
      
      let isDisabled = !updated.name?.trim();
      if (updated.type === NodeType.CONCLUSION) {
        isDisabled = isDisabled || !updated.prompt?.trim();
      } else if (updated.type !== NodeType.VARIABLE) {
        isDisabled = isDisabled || !updated.prompt?.trim();
      }
      setIsSaveDisabled(isDisabled);
      return updated;
    });
  };

  const handleSave = () => {
    if (editableNode && !isSaveDisabled) {
      // Sanitize variable name: remove {}
      if (editableNode.type === NodeType.VARIABLE && editableNode.name) {
        editableNode.name = editableNode.name.replace(/[{}]/g, '').trim();
        if (!editableNode.name) {
            // Handle error or set a default name if it becomes empty after sanitization
            // For now, this might lead to save button being re-disabled if validation was more complex.
            // Assuming name validation primarily checks for emptiness.
        }
      }
      onSave(editableNode);
    }
  };

  const handleBranchChange = (index: number, field: 'condition' | 'nextNodeId', value: string) => {
    setEditableNode(prev => {
      if (!prev || !prev.branches) return prev;
      const newBranches = [...prev.branches];
      newBranches[index] = { ...newBranches[index], [field]: value || null };
      return { ...prev, branches: newBranches };
    });
  };

  const addBranch = () => {
    setEditableNode(prev => {
      if (!prev) return prev;
      const newBranches = [...(prev.branches || []), { id: generateId(), condition: '', nextNodeId: null }];
      return { ...prev, branches: newBranches };
    });
  };

  const removeBranch = (index: number) => {
    setEditableNode(prev => {
      if (!prev || !prev.branches) return prev;
      const newBranches = prev.branches.filter((_, i) => i !== index);
      return { ...prev, branches: newBranches };
    });
  };
  
  const availableNextNodes = allNodes.filter(n => n.id !== editableNode.id && n.type !== NodeType.START);

  const isPromptRelevant = editableNode.type === NodeType.START || 
                           editableNode.type === NodeType.PROMPT || 
                           editableNode.type === NodeType.CONDITIONAL ||
                           editableNode.type === NodeType.CONCLUSION;

  const promptLabel = editableNode.type === NodeType.CONCLUSION 
                      ? 'Display Title' 
                      : (editableNode.type === NodeType.VARIABLE 
                          ? 'Variable Description (Optional)' 
                          : `Prompt (use {PREVIOUS_OUTPUT} or a variable {varName})`);
  
  const promptPlaceholder = editableNode.type === NodeType.CONCLUSION 
                            ? 'Enter a title for the displayed output' 
                            : (editableNode.type === NodeType.VARIABLE 
                                ? 'Describe what this variable represents'
                                : "Enter the LLM prompt here...");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Node: ${editableNode.name || editableNode.type}`}>
      <div className="space-y-4 text-slate-300">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {editableNode.type === NodeType.VARIABLE ? 'Variable Name (no spaces or special chars e.g. myVar)' : 'Node Name'}
          </label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            value={editableNode.name} 
            onChange={handleChange} 
            placeholder={editableNode.type === NodeType.VARIABLE ? "e.g., customerName, storyIdea" : "Enter a descriptive name"} 
            className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" 
          />
          {editableNode.type === NodeType.VARIABLE && <p className="text-xs text-slate-400 mt-1">This name will be used in curly braces, like {'{'+ (editableNode.name || 'variableName') + '}'}, in other nodes' prompts.</p>}
        </div>

        {isPromptRelevant && (
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium">{promptLabel}</label>
            <textarea 
              name="prompt" 
              id="prompt" 
              rows={editableNode.type === NodeType.CONCLUSION ? 2 : (editableNode.type === NodeType.VARIABLE ? 2 : 4)} 
              value={editableNode.prompt} 
              onChange={handleChange} 
              placeholder={promptPlaceholder}
              className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm custom-scroll" 
            />
            {editableNode.type === NodeType.CONCLUSION && <p className="text-xs text-slate-400 mt-1">This title will appear above the final output displayed by this node.</p>}
            {editableNode.type === NodeType.VARIABLE && <p className="text-xs text-slate-400 mt-1">This description is for your reference only.</p>}
          </div>
        )}

        {(editableNode.type === NodeType.PROMPT || editableNode.type === NodeType.START || editableNode.type === NodeType.VARIABLE) && (
          <div>
            <label htmlFor="nextNodeId" className="block text-sm font-medium">Next Node</label>
            <select name="nextNodeId" id="nextNodeId" value={editableNode.nextNodeId || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm">
              <option value="">None (End of workflow path)</option>
              {availableNextNodes.map(n => <option key={n.id} value={n.id}>{n.name || `${n.type} (${n.id.substring(0,4)})`}</option>)}
            </select>
          </div>
        )}

        {editableNode.type === NodeType.CONDITIONAL && (
          <div className="space-y-3">
            <h4 className="text-md font-medium">Branches (Conditions & Next Nodes)</h4>
            {editableNode.branches?.map((branch, index) => (
              <div key={branch.id} className="rounded-md border border-slate-600 p-3 space-y-2">
                <div className="flex items-center space-x-2">
                   <input
                    type="text"
                    placeholder="Condition (e.g., contains 'YES', default)"
                    value={branch.condition}
                    onChange={(e) => handleBranchChange(index, 'condition', e.target.value)}
                    className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                  />
                  <button onClick={() => removeBranch(index)} className="text-red-500 hover:text-red-400 p-1"><i className="fas fa-trash"></i></button>
                </div>
                <select
                  value={branch.nextNodeId || ''}
                  onChange={(e) => handleBranchChange(index, 'nextNodeId', e.target.value)}
                  className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                >
                  <option value="">None (End branch)</option>
                  {availableNextNodes.map(n => <option key={n.id} value={n.id}>{n.name || `${n.type} (${n.id.substring(0,4)})`}</option>)}
                </select>
              </div>
            ))}
            <button onClick={addBranch} className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700">Add Branch</button>
          </div>
        )}
        <button onClick={handleSave} disabled={isSaveDisabled} className={`w-full rounded-md px-4 py-2 font-medium text-white ${isSaveDisabled ? 'bg-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>Save Node</button>
        
        {editableNode.lastRunOutput && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300">Last Run Output:</label>
            <pre className="mt-1 block w-full rounded-md bg-slate-600 p-2 text-xs text-slate-200 custom-scroll whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
              {editableNode.lastRunOutput}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NodeEditModal;