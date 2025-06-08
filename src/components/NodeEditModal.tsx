// src/components/NodeEditModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { type Node, type NodeModalProps, NodeType } from '../../types'; 
import { deepClone, generateId, sanitizeVariableName } from '../utils'; // Import sanitizeVariableName

const NodeEditModal: React.FC<NodeModalProps> = ({ node, isOpen, onClose, onSave, allNodes }) => {
  const [editableNode, setEditableNode] = useState<Node | null>(null);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);

  useEffect(() => {
    if (node) {
      const clonedNode = deepClone(node);
      // Ensure outputFormatTemplate has a default for CONCLUSION nodes if undefined/empty
      if (clonedNode.type === NodeType.CONCLUSION && (!clonedNode.outputFormatTemplate || clonedNode.outputFormatTemplate.trim() === '')) {
        clonedNode.outputFormatTemplate = '{PREVIOUS_OUTPUT}';
      }
      // Sanitize name if it's a variable node on load
      if (clonedNode.type === NodeType.VARIABLE) {
        clonedNode.name = sanitizeVariableName(clonedNode.name);
      }
      setEditableNode(clonedNode);
      validateNode(clonedNode);
    } else {
      setEditableNode(null);
      setIsSaveDisabled(true);
    }
  }, [node]);

  const validateNode = (nodeToValidate: Node | null) => {
    if (!nodeToValidate) {
      setIsSaveDisabled(true);
      return;
    }
    let isDisabled = !nodeToValidate.name?.trim();
    if (nodeToValidate.type === NodeType.VARIABLE) {
      // For variable nodes, name must be alphanumeric_ and not empty.
      // It's invalid if the name after sanitization is different from current, or if it's empty.
      isDisabled = isDisabled || (nodeToValidate.name !== sanitizeVariableName(nodeToValidate.name)) || !nodeToValidate.name.trim();
    } else if (nodeToValidate.type === NodeType.CONCLUSION) {
      isDisabled = isDisabled || !nodeToValidate.prompt?.trim() || !nodeToValidate.outputFormatTemplate?.trim();
    } else { // START, PROMPT, CONDITIONAL, QUESTION
      isDisabled = isDisabled || !nodeToValidate.prompt?.trim();
    }
    setIsSaveDisabled(isDisabled);
  };


  if (!isOpen || !editableNode) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableNode(prev => {
      if (!prev) return null;
      let updatedValue = value;
      if (name === 'name' && prev.type === NodeType.VARIABLE) {
        updatedValue = sanitizeVariableName(value);
      }
      const updated = { ...prev, [name]: updatedValue };
      validateNode(updated);
      return updated;
    });
  };

  const handleSave = () => {
    if (editableNode && !isSaveDisabled) {
      let nodeToSave = { ...editableNode };
      // Ensure variable name is sanitized one last time on save
      if (nodeToSave.type === NodeType.VARIABLE && nodeToSave.name) {
        nodeToSave.name = sanitizeVariableName(nodeToSave.name);
         // This re-validation might be redundant if validateNode in handleChange is sufficient,
         // but acts as a final safeguard. The button should already be disabled if the name is invalid.
         if (!nodeToSave.name.trim()) { 
            // Name became empty after final sanitization, which should be caught by isSaveDisabled
            // If somehow not, prevent save. (Alert is removed as UI should prevent this state)
            return; 
         }
      }
      // Default outputFormatTemplate for Conclusion nodes if empty
      if (nodeToSave.type === NodeType.CONCLUSION && (!nodeToSave.outputFormatTemplate || nodeToSave.outputFormatTemplate.trim() === '')) {
          nodeToSave.outputFormatTemplate = '{PREVIOUS_OUTPUT}';
      }
      onSave(nodeToSave);
    }
  };

  const handleBranchChange = (index: number, field: 'condition' | 'nextNodeId', value: string) => {
    setEditableNode(prev => {
      if (!prev || !prev.branches) return prev;
      const newBranches = [...prev.branches];
      newBranches[index] = { ...newBranches[index], [field]: value || null };
      // No specific validation change here unless branches have required fields
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
                           editableNode.type === NodeType.CONCLUSION ||
                           editableNode.type === NodeType.QUESTION;

  const promptLabel = editableNode.type === NodeType.CONCLUSION 
                      ? 'Display Title' 
                      : (editableNode.type === NodeType.VARIABLE 
                          ? 'Variable Description (Optional)' 
                          : (editableNode.type === NodeType.QUESTION
                              ? 'Question for User (use {PREVIOUS_OUTPUT} or {varName} for context)'
                              : `Prompt (use {PREVIOUS_OUTPUT} or {varName})`));
  
  const promptPlaceholder = editableNode.type === NodeType.CONCLUSION 
                            ? 'Enter a title for the displayed output' 
                            : (editableNode.type === NodeType.VARIABLE 
                                ? 'Describe what this variable represents'
                                : (editableNode.type === NodeType.QUESTION
                                    ? 'Enter the question to ask the user'
                                    : "Enter the LLM prompt here..."));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Node: ${editableNode.name || editableNode.type}`}>
      <div className="space-y-4 text-slate-300">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {editableNode.type === NodeType.VARIABLE ? 'Variable Name' : 'Node Name'}
          </label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            value={editableNode.name} 
            onChange={handleChange} 
            placeholder={editableNode.type === NodeType.VARIABLE ? "e.g., customer_name, story_idea" : "Enter a descriptive name"} 
            className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" 
          />
          {editableNode.type === NodeType.VARIABLE && (
            <>
              <p className="text-xs text-slate-400 mt-1">Use only letters, numbers, and underscores (e.g., my_variable_1).</p>
              <p className="text-xs text-slate-400 mt-1">This name will be used in curly braces, like {'{'+ (sanitizeVariableName(editableNode.name) || 'variableName') + '}'}, in other nodes' prompts.</p>
            </>
          )}
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
             {editableNode.type === NodeType.QUESTION && <p className="text-xs text-slate-400 mt-1">This question will be shown to the user during the run. Their input becomes the output of this node.</p>}
          </div>
        )}

        {editableNode.type === NodeType.CONCLUSION && (
            <div>
                <label htmlFor="outputFormatTemplate" className="block text-sm font-medium">Output Formatting (use {'{PREVIOUS_OUTPUT}'})</label>
                <textarea
                    name="outputFormatTemplate"
                    id="outputFormatTemplate"
                    rows={2}
                    value={editableNode.outputFormatTemplate || ''}
                    onChange={handleChange}
                    placeholder="Default: {PREVIOUS_OUTPUT}"
                    className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm custom-scroll"
                />
                <p className="text-xs text-slate-400 mt-1">Define how the final output is displayed. {'{PREVIOUS_OUTPUT}'} will be replaced by the input to this node. You can also use project and node variables like {'{my_var}'}.</p>
            </div>
        )}

        {(editableNode.type === NodeType.PROMPT || editableNode.type === NodeType.START || editableNode.type === NodeType.VARIABLE || editableNode.type === NodeType.QUESTION) && (
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