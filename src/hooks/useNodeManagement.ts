// src/hooks/useNodeManagement.ts
import { useState, useCallback } from 'react';
import { type Node, type Project, NodeType } from '../types'; // Updated path
import { generateId, getValidNodes } from '../utils';
import { 
    NODE_WIDTH, NODE_HEIGHT, 
    INITIAL_NODE_NAME, INITIAL_NODE_PROMPT, INITIAL_START_NODE_PROMPT, 
    INITIAL_CONCLUSION_NODE_TITLE, INITIAL_VARIABLE_NODE_NAME, INITIAL_QUESTION_NODE_PROMPT,
    INITIAL_JAVASCRIPT_NODE_NAME, INITIAL_JAVASCRIPT_NODE_CODE,
    INITIAL_PARALLEL_NODE_NAME, INITIAL_PARALLEL_NODE_DESCRIPTION,
    INITIAL_SYNCHRONIZE_NODE_NAME, INITIAL_SYNCHRONIZE_NODE_DESCRIPTION
} from '../constants'; // Updated path

interface UseNodeManagementProps {
  currentProject: Project | null;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  saveProjectState: (projectState: Project | null, skipSetCurrent?: boolean) => void;
  editorAreaRef: React.RefObject<HTMLDivElement>; 
  scale: number;
  translate: { x: number; y: number };
}

export const useNodeManagement = ({
  currentProject,
  setCurrentProject,
  saveProjectState,
  editorAreaRef,
  scale,
  translate,
}: UseNodeManagementProps) => {
  const [selectedNodeState, setSelectedNodeState] = useState<Node | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [deleteNodeConfirm, setDeleteNodeConfirm] = useState<{ isOpen: boolean; nodeId: string | null; nodeName: string | null }>({ isOpen: false, nodeId: null, nodeName: null });
  const [deleteActionInitiated, setDeleteActionInitiated] = useState(false);

  const handleAddNode = useCallback((type: NodeType) => {
    if (!currentProject || !editorAreaRef.current) return;
    
    const viewportWidth = editorAreaRef.current.clientWidth;
    const viewportHeight = editorAreaRef.current.clientHeight;

    const viewportCenterXInWorld = (viewportWidth / 2 - translate.x) / scale;
    const viewportCenterYInWorld = (viewportHeight / 2 - translate.y) / scale;
    
    const newNodeX = viewportCenterXInWorld - NODE_WIDTH / 2 + (Math.random() - 0.5) * 50; 
    const newNodeY = viewportCenterYInWorld - NODE_HEIGHT / 2 + (Math.random() - 0.5) * 50;


    let nodeName = INITIAL_NODE_NAME;
    let nodePrompt = INITIAL_NODE_PROMPT; 
    let nodeCode: string | undefined = undefined;
    let outputFormatTemplate: string | undefined = undefined;
    let parallelNextNodeIds: string[] | undefined = undefined;

    if (type === NodeType.START) nodePrompt = INITIAL_START_NODE_PROMPT;
    if (type === NodeType.CONCLUSION) {
        nodePrompt = INITIAL_CONCLUSION_NODE_TITLE;
        outputFormatTemplate = '{PREVIOUS_OUTPUT}';
    }
    if (type === NodeType.VARIABLE) {
      nodeName = INITIAL_VARIABLE_NODE_NAME;
      nodePrompt = ''; 
    }
    if (type === NodeType.QUESTION) {
      nodePrompt = INITIAL_QUESTION_NODE_PROMPT;
    }
    if (type === NodeType.JAVASCRIPT) {
      nodeName = INITIAL_JAVASCRIPT_NODE_NAME;
      nodePrompt = 'Custom JavaScript function.'; 
      nodeCode = INITIAL_JAVASCRIPT_NODE_CODE;
    }
    if (type === NodeType.PARALLEL) {
      nodeName = INITIAL_PARALLEL_NODE_NAME;
      nodePrompt = INITIAL_PARALLEL_NODE_DESCRIPTION;
      parallelNextNodeIds = [];
    }
    if (type === NodeType.SYNCHRONIZE) {
      nodeName = INITIAL_SYNCHRONIZE_NODE_NAME;
      nodePrompt = INITIAL_SYNCHRONIZE_NODE_DESCRIPTION;
    }


    const newNode: Node = {
      id: generateId(),
      type,
      name: nodeName,
      prompt: nodePrompt,
      code: nodeCode,
      outputFormatTemplate: outputFormatTemplate,
      parallelNextNodeIds: parallelNextNodeIds,
      position: {
        x: Math.max(0, newNodeX), 
        y: Math.max(0, newNodeY),
      },
      branches: type === NodeType.CONDITIONAL ? [{ id: generateId(), condition: "default", nextNodeId: null }] : undefined,
      nextNodeId: (type === NodeType.PROMPT || type === NodeType.START || type === NodeType.VARIABLE || type === NodeType.QUESTION || type === NodeType.JAVASCRIPT || type === NodeType.SYNCHRONIZE) ? null : undefined,
    };
    
    if (type === NodeType.PARALLEL) {
        delete newNode.nextNodeId;
    }


    setCurrentProject(prev => {
      if (!prev) return null;
      return { ...prev, nodes: [...getValidNodes(prev.nodes), newNode] };
    });
  }, [currentProject, setCurrentProject, editorAreaRef, scale, translate]);

  const handleSaveNode = useCallback((updatedNode: Node) => {
    if (!currentProject) return;
    
    let nodeToSave = { ...updatedNode };
    if (nodeToSave.type === NodeType.VARIABLE && nodeToSave.name) {
      nodeToSave.name = nodeToSave.name.replace(/[{}]/g, '').trim();
    }
    if (nodeToSave.type === NodeType.CONCLUSION && (!nodeToSave.outputFormatTemplate || nodeToSave.outputFormatTemplate.trim() === '')) {
        nodeToSave.outputFormatTemplate = '{PREVIOUS_OUTPUT}';
    }
    if (nodeToSave.type === NodeType.PARALLEL) {
        nodeToSave.parallelNextNodeIds = (nodeToSave.parallelNextNodeIds || []).filter(id => id && id.trim() !== '');
        if (nodeToSave.parallelNextNodeIds.length > 0) {
            delete nodeToSave.nextNodeId;
        }
    }


    const validNodes = getValidNodes(currentProject.nodes);
    const newNodes = validNodes.map(n => (n.id === nodeToSave.id ? nodeToSave : n));
    
    const updatedProjectForSave = { ...currentProject, nodes: newNodes };
    saveProjectState(updatedProjectForSave);
    setIsNodeModalOpen(false);
    setSelectedNodeState(null);
  }, [currentProject, saveProjectState]);

  const confirmDeleteNode = useCallback(() => {
    if (!currentProject || !deleteNodeConfirm.nodeId) return;

    setCurrentProject(prev => {
      if (!prev) return null;
      let validNodes = getValidNodes(prev.nodes);
      let updatedNodes = validNodes.filter(n => n.id !== deleteNodeConfirm.nodeId);

      updatedNodes = updatedNodes.map(n => {
        let modified = false;
        const newNodeData = { ...n }; 

        if (newNodeData.nextNodeId === deleteNodeConfirm.nodeId) {
          newNodeData.nextNodeId = null;
          modified = true;
        }

        if (newNodeData.branches) {
          const originalBranches = JSON.stringify(newNodeData.branches); 
          newNodeData.branches = newNodeData.branches.map(b =>
            b.nextNodeId === deleteNodeConfirm.nodeId ? { ...b, nextNodeId: null } : b
          );
          if (JSON.stringify(newNodeData.branches) !== originalBranches) modified = true;
        }
        
        if (newNodeData.parallelNextNodeIds && newNodeData.parallelNextNodeIds.includes(deleteNodeConfirm.nodeId!)) {
            newNodeData.parallelNextNodeIds = newNodeData.parallelNextNodeIds.filter(id => id !== deleteNodeConfirm.nodeId);
            modified = true;
        }

        return modified ? newNodeData : n; 
      });
      return { ...prev, nodes: updatedNodes };
    });
  }, [currentProject, setCurrentProject, deleteNodeConfirm.nodeId]);


  const handleDeleteNodeRequest = useCallback((nodeId: string, e: React.MouseEvent | React.TouchEvent) => { 
    e.stopPropagation();
    if (!currentProject) return;
    const nodeToDelete = getValidNodes(currentProject.nodes).find(n => n.id === nodeId);
    if (!nodeToDelete) return;
    setDeleteActionInitiated(true);
    setDeleteNodeConfirm({ isOpen: true, nodeId, nodeName: nodeToDelete.name || nodeToDelete.type });
  }, [currentProject]);

  return {
    selectedNodeState,
    setSelectedNodeState,
    isNodeModalOpen,
    setIsNodeModalOpen,
    deleteNodeConfirm,
    setDeleteNodeConfirm,
    deleteActionInitiated,
    setDeleteActionInitiated,
    handleAddNode,
    handleSaveNode,
    confirmDeleteNode,
    handleDeleteNodeRequest,
  };
};
