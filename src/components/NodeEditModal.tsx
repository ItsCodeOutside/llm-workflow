// src/components/NodeEditModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { type Node, type NodeModalProps, NodeType } from '../types'; // Updated path
import { deepClone, generateId, sanitizeVariableName } from '../utils';
import { useIsMobile } from '../hooks/useIsMobile';
import JavaScriptEditor from './node_edit_modal_parts/JavaScriptEditor';
import ConditionalBranchEditor from './node_edit_modal_parts/ConditionalBranchEditor';
import ParallelNodeEditor from './node_edit_modal_parts/ParallelNodeEditor'; 
import { MAX_PARALLEL_BRANCHES } from '../constants'; // Updated path


const NodeEditModal: React.FC<NodeModalProps> = ({ node, isOpen, onClose, onSave, allNodes }) => {
  const [editableNode, setEditableNode] = useState<Node | null>(null);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (node) {
      const clonedNode = deepClone(node);
      if (clonedNode.type === NodeType.CONCLUSION && (!clonedNode.outputFormatTemplate || clonedNode.outputFormatTemplate.trim() === '')) {
        clonedNode.outputFormatTemplate = '{PREVIOUS_OUTPUT}';
      }
      if (clonedNode.type === NodeType.VARIABLE) {
        clonedNode.name = sanitizeVariableName(clonedNode.name);
      }
      if (clonedNode.type === NodeType.JAVASCRIPT && clonedNode.code === undefined) {
        clonedNode.code = ''; 
      }
      if (clonedNode.type === NodeType.PARALLEL && !Array.isArray(clonedNode.parallelNextNodeIds)) {
        clonedNode.parallelNextNodeIds = [];
      }
      setEditableNode(clonedNode);
      validateNode(clonedNode);
    } else {
      setEditableNode(null);
      setIsSaveDisabled(true);
    }
    setIsModalMaximized(false); 
  }, [node, isOpen]);

  const validateNode = (nodeToValidate: Node | null) => {
    if (!nodeToValidate) {
      setIsSaveDisabled(true);
      return;
    }
    let isDisabled = !nodeToValidate.name?.trim();
    if (nodeToValidate.type === NodeType.VARIABLE) {
      isDisabled = isDisabled || (nodeToValidate.name !== sanitizeVariableName(nodeToValidate.name)) || !nodeToValidate.name.trim();
    } else if (nodeToValidate.type === NodeType.CONCLUSION) {
      isDisabled = isDisabled || !nodeToValidate.prompt?.trim() || !nodeToValidate.outputFormatTemplate?.trim();
    } else if (nodeToValidate.type === NodeType.JAVASCRIPT) {
      isDisabled = isDisabled || !nodeToValidate.code?.trim(); 
    } else if (nodeToValidate.type === NodeType.PARALLEL) {
      // Name is required for parallel node
    } else if (nodeToValidate.type === NodeType.SYNCHRONIZE) {
      // Name is required for synchronize node
    } else { 
      // For Start, Prompt, Conditional, Question
      isDisabled = isDisabled || !nodeToValidate.prompt?.trim();
    }
    setIsSaveDisabled(isDisabled);
  };

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

  const handleCodeChange = (newCode: string) => {
    setEditableNode(prev => {
      if (!prev || prev.type !== NodeType.JAVASCRIPT) return prev;
      const updated = { ...prev, code: newCode };
      validateNode(updated);
      return updated;
    });
  };

  const handleSave = () => {
    if (editableNode && !isSaveDisabled) {
      let nodeToSave = { ...editableNode };
      if (nodeToSave.type === NodeType.VARIABLE && nodeToSave.name) {
        nodeToSave.name = sanitizeVariableName(nodeToSave.name);
         if (!nodeToSave.name.trim()) { 
            return; 
         }
      }
      if (nodeToSave.type === NodeType.CONCLUSION && (!nodeToSave.outputFormatTemplate || nodeToSave.outputFormatTemplate.trim() === '')) {
          nodeToSave.outputFormatTemplate = '{PREVIOUS_OUTPUT}';
      }
      if (nodeToSave.type === NodeType.JAVASCRIPT && (nodeToSave.code === undefined || !nodeToSave.code.trim())) {
        return;
      }
      if (nodeToSave.type === NodeType.PARALLEL) {
        nodeToSave.parallelNextNodeIds = (nodeToSave.parallelNextNodeIds || []).filter(id => id && id.trim() !== '');
      }
      onSave(nodeToSave);
      setIsModalMaximized(false); 
      onClose();
    }
  };

  const handleBranchChange = (index: number, field: 'condition' | 'nextNodeId', value: string) => {
    setEditableNode(prev => {
      if (!prev || !prev.branches) return prev;
      const newBranches = [...prev.branches];
      newBranches[index] = { ...newBranches[index], [field]: value || null };
      const updatedNode = { ...prev, branches: newBranches };
      validateNode(updatedNode);
      return updatedNode;
    });
  };

  const addBranch = () => {
    setEditableNode(prev => {
      if (!prev) return prev;
      const newBranches = [...(prev.branches || []), { id: generateId(), condition: '', nextNodeId: null }];
      const updatedNode = { ...prev, branches: newBranches };
      validateNode(updatedNode);
      return updatedNode;
    });
  };

  const removeBranch = (index: number) => {
    setEditableNode(prev => {
      if (!prev || !prev.branches) return prev;
      const newBranches = prev.branches.filter((_, i) => i !== index);
      const updatedNode = { ...prev, branches: newBranches };
      validateNode(updatedNode);
      return updatedNode;
    });
  };

  const handleParallelNodeIdChange = (index: number, value: string | null) => {
    setEditableNode(prev => {
        if (!prev || prev.type !== NodeType.PARALLEL) return prev;
        const newParallelNextNodeIds = [...(prev.parallelNextNodeIds || [])];
        if (value === null || value === '') {
            if (index < newParallelNextNodeIds.length) {
                newParallelNextNodeIds.splice(index, 1);
            }
        } else {
             if (index < newParallelNextNodeIds.length) {
                newParallelNextNodeIds[index] = value;
             } else {
                 newParallelNextNodeIds.push(value);
             }
        }
        const uniqueIds = Array.from(new Set(newParallelNextNodeIds.filter(id => id && id.trim() !== '')));
        const updatedNode = { ...prev, parallelNextNodeIds: uniqueIds };
        validateNode(updatedNode);
        return updatedNode;
    });
  };
  
  const addParallelPath = () => {
    setEditableNode(prev => {
        if (!prev || prev.type !== NodeType.PARALLEL) return prev;
        const currentPaths = prev.parallelNextNodeIds || [];
        if (currentPaths.length >= MAX_PARALLEL_BRANCHES) return prev;
        const updatedNode = { ...prev, parallelNextNodeIds: [...currentPaths, ''] };
        validateNode(updatedNode);
        return updatedNode;
    });
  };

  const removeParallelPath = (index: number) => {
    setEditableNode(prev => {
        if (!prev || prev.type !== NodeType.PARALLEL || !prev.parallelNextNodeIds) return prev;
        const newParallelNextNodeIds = prev.parallelNextNodeIds.filter((_, i) => i !== index);
        const updatedNode = { ...prev, parallelNextNodeIds: newParallelNextNodeIds };
        validateNode(updatedNode);
        return updatedNode;
    });
  };
  
  const toggleModalMaximize = () => {
    if (editableNode?.type === NodeType.JAVASCRIPT && !isMobile) {
      setIsModalMaximized(prev => !prev);
    }
  };

  if (!isOpen || !editableNode) return null;
  
  const availableNextNodes = allNodes.filter(n => n.id !== editableNode.id && n.type !== NodeType.START);

  const isPromptRelevant = editableNode.type === NodeType.START || 
                           editableNode.type === NodeType.PROMPT || 
                           editableNode.type === NodeType.CONDITIONAL ||
                           editableNode.type === NodeType.CONCLUSION ||
                           editableNode.type === NodeType.QUESTION;
  
  const isDescriptionRelevant = editableNode.type === NodeType.VARIABLE ||
                                editableNode.type === NodeType.JAVASCRIPT ||
                                editableNode.type === NodeType.PARALLEL ||
                                editableNode.type === NodeType.SYNCHRONIZE;

  const promptLabel = editableNode.type === NodeType.CONCLUSION 
                      ? 'Display Title' 
                      : (editableNode.type === NodeType.QUESTION
                          ? 'Question for User (use {PREVIOUS_OUTPUT} or {varName} for context)'
                          : `Prompt (use {PREVIOUS_OUTPUT} or {varName})`);
  
  const descriptionLabel = editableNode.type === NodeType.VARIABLE 
                            ? 'Variable Description (Optional)'
                            : (editableNode.type === NodeType.JAVASCRIPT
                                ? 'Function Description (Optional)'
                                : (editableNode.type === NodeType.PARALLEL
                                    ? 'Parallel Node Description (Optional)'
                                    : (editableNode.type === NodeType.SYNCHRONIZE
                                        ? 'Synchronize Node Description (Optional)'
                                        : 'Description')));

  const promptPlaceholder = editableNode.type === NodeType.CONCLUSION 
                            ? 'Enter a title for the displayed output' 
                            : (editableNode.type === NodeType.QUESTION
                                ? 'Enter the question to ask the user'
                                : "Enter the LLM prompt here...");

  const descriptionPlaceholder = editableNode.type === NodeType.VARIABLE 
                                  ? 'Describe what this variable represents'
                                  : (editableNode.type === NodeType.JAVASCRIPT
                                      ? 'Describe what this JavaScript function does'
                                      : (editableNode.type === NodeType.PARALLEL
                                          ? 'Describe the purpose of this parallel split'
                                          : (editableNode.type === NodeType.SYNCHRONIZE
                                              ? 'Describe when this synchronization occurs'
                                              : 'Enter a description...')));

  const showMaximizeButton = editableNode.type === NodeType.JAVASCRIPT && !isMobile;
  const nodeTypeNameForLabel = editableNode.type === NodeType.VARIABLE ? 'Variable Name' 
                             : (editableNode.type === NodeType.JAVASCRIPT ? 'Function Name' 
                             : (editableNode.type === NodeType.PARALLEL ? 'Parallel Node Name'
                             : (editableNode.type === NodeType.SYNCHRONIZE ? 'Synchronize Node Name'
                             : 'Node Name')));
  const nodeNamePlaceholder = editableNode.type === NodeType.VARIABLE ? "e.g., customer_name" 
                            : (editableNode.type === NodeType.JAVASCRIPT ? "e.g., processUserData" 
                            : (editableNode.type === NodeType.PARALLEL ? "e.g., ProcessInParallel"
                            : (editableNode.type === NodeType.SYNCHRONIZE ? "e.g., WaitForAllTasks"
                            : "Enter a descriptive name")));

  const footerContent = (
    <>
      <button
        onClick={handleSave}
        disabled={isSaveDisabled}
        className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:w-auto sm:text-sm ${
          isSaveDisabled
            ? 'bg-slate-500 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        }`}
      >
        Save Node
      </button>
      <button
        type="button"
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        onClick={() => { onClose(); setIsModalMaximized(false); }}
      >
        Close
      </button>
    </>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { onClose(); setIsModalMaximized(false); }} 
      title={`Edit Node: ${editableNode.name || editableNode.type}`}
      isMaximized={isModalMaximized}
      onToggleMaximize={showMaximizeButton ? toggleModalMaximize : undefined}
      footerContent={footerContent}
    >
      <div className={`space-y-4 text-slate-300 ${isModalMaximized && editableNode.type === NodeType.JAVASCRIPT ? 'flex flex-col h-full' : ''}`}>
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {nodeTypeNameForLabel}
          </label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            value={editableNode.name} 
            onChange={handleChange} 
            placeholder={nodeNamePlaceholder} 
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
              rows={editableNode.type === NodeType.CONCLUSION ? 2 : (editableNode.type === NodeType.QUESTION ? 2 : 4)} 
              value={editableNode.prompt} 
              onChange={handleChange} 
              placeholder={promptPlaceholder}
              className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm custom-scroll" 
            />
            {editableNode.type === NodeType.CONCLUSION && <p className="text-xs text-slate-400 mt-1">This title will appear above the final output displayed by this node.</p>}
            {editableNode.type === NodeType.QUESTION && <p className="text-xs text-slate-400 mt-1">This question will be shown to the user during the run. Their input becomes the output of this node.</p>}
          </div>
        )}

        {isDescriptionRelevant && (
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium">{descriptionLabel}</label>
                <textarea
                    name="prompt" 
                    id="description"
                    rows={2}
                    value={editableNode.prompt} 
                    onChange={handleChange}
                    placeholder={descriptionPlaceholder}
                    className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm custom-scroll"
                />
                <p className="text-xs text-slate-400 mt-1">This description is for your reference only.</p>
            </div>
        )}


        {editableNode.type === NodeType.JAVASCRIPT && (
          <div className={`mt-2 ${isModalMaximized ? 'flex-grow flex flex-col' : ''}`}>
            <label htmlFor="code" className="block text-sm font-medium">
              JavaScript Code (Async Function Body)
            </label>
            <JavaScriptEditor
              value={editableNode.code || ''}
              onChange={handleCodeChange}
              isMaximized={isModalMaximized}
              placeholder={`// async function(previousOutput, nodeVariables, projectVariables) { \n//  Write your JS code here...\n//  return "some value";\n// }`}
              textareaId="code"
            />
            <p className="text-xs text-slate-400 mt-1">
              Access <code className="text-xs bg-slate-600 px-1 rounded">previousOutput</code>, <code className="text-xs bg-slate-600 px-1 rounded">nodeVariables</code> (object), <code className="text-xs bg-slate-600 px-1 rounded">projectVariables</code> (object). Return a string.
            </p>
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
                <p className="text-xs text-slate-400 mt-1">
                  Define how the final output is displayed. {'{PREVIOUS_OUTPUT}'} will be replaced by the input to this node. 
                  You can also use project variables (e.g., {'{project_var}'}), node variables (e.g., {'{node_var}'}), and system variables (e.g., {'{CurrentDateTime}'}).
                </p>
            </div>
        )}

        {(editableNode.type === NodeType.PROMPT || editableNode.type === NodeType.START || editableNode.type === NodeType.VARIABLE || editableNode.type === NodeType.QUESTION || editableNode.type === NodeType.JAVASCRIPT || editableNode.type === NodeType.SYNCHRONIZE) && (
          <div className={`${isModalMaximized && editableNode.type === NodeType.JAVASCRIPT ? 'mt-auto pt-4' : ''}`}>
            <label htmlFor="nextNodeId" className="block text-sm font-medium">Next Node</label>
            <select name="nextNodeId" id="nextNodeId" value={editableNode.nextNodeId || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm">
              <option value="">None (End of workflow path)</option>
              {availableNextNodes.map(n => <option key={n.id} value={n.id}>{n.name || `${n.type} (${n.id.substring(0,4)})`}</option>)}
            </select>
          </div>
        )}
        
        {editableNode.type === NodeType.PARALLEL && (
          <ParallelNodeEditor
            parallelNextNodeIds={editableNode.parallelNextNodeIds || []}
            allNodes={availableNextNodes}
            onNodeIdChange={handleParallelNodeIdChange}
            onAddPath={addParallelPath}
            onRemovePath={removeParallelPath}
            maxPaths={MAX_PARALLEL_BRANCHES}
          />
        )}

        {editableNode.type === NodeType.CONDITIONAL && editableNode.branches && (
          <ConditionalBranchEditor
            branches={editableNode.branches}
            allNodes={availableNextNodes} 
            onBranchChange={handleBranchChange}
            onAddBranch={addBranch}
            onRemoveBranch={removeBranch}
          />
        )}
        
        {editableNode.lastRunOutput && (
          <div className="mt-4 pt-4 border-t border-slate-700">
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
