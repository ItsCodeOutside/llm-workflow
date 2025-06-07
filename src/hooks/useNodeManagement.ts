
// src/hooks/useNodeManagement.ts
import { useState, useCallback } from 'react';
import { type Node, type Project, NodeType } from '../../types'; 
import { generateId, getValidNodes } from '../utils';
import { 
    NODE_WIDTH, NODE_HEIGHT, 
    INITIAL_NODE_NAME, INITIAL_NODE_PROMPT, INITIAL_START_NODE_PROMPT, 
    INITIAL_CONCLUSION_NODE_TITLE, INITIAL_VARIABLE_NODE_NAME 
} from '../../constants';

interface UseNodeManagementProps {
  currentProject: Project | null;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  saveProjectState: (projectState: Project | null, skipSetCurrent?: boolean) => void;
  editorAreaRef: React.RefObject<HTMLDivElement>; // Ref to the viewport element
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
    
    // Calculate the center of the current viewport in world coordinates
    const viewportWidth = editorAreaRef.current.clientWidth;
    const viewportHeight = editorAreaRef.current.clientHeight;

    const viewportCenterXInWorld = (viewportWidth / 2 - translate.x) / scale;
    const viewportCenterYInWorld = (viewportHeight / 2 - translate.y) / scale;
    
    // Position the new node at this world center, adjusted by node dimensions
    const newNodeX = viewportCenterXInWorld - NODE_WIDTH / 2 + (Math.random() - 0.5) * 50; // Add some jitter
    const newNodeY = viewportCenterYInWorld - NODE_HEIGHT / 2 + (Math.random() - 0.5) * 50;


    let nodeName = INITIAL_NODE_NAME;
    let nodePrompt = INITIAL_NODE_PROMPT;
    let outputFormatTemplate: string | undefined = undefined;

    if (type === NodeType.START) nodePrompt = INITIAL_START_NODE_PROMPT;
    if (type === NodeType.CONCLUSION) {
        nodePrompt = INITIAL_CONCLUSION_NODE_TITLE;
        outputFormatTemplate = '{PREVIOUS_OUTPUT}';
    }
    if (type === NodeType.VARIABLE) {
      nodeName = INITIAL_VARIABLE_NODE_NAME;
      nodePrompt = '';
    }

    const newNode: Node = {
      id: generateId(),
      type,
      name: nodeName,
      prompt: nodePrompt,
      outputFormatTemplate: outputFormatTemplate,
      position: {
        x: Math.max(0, newNodeX), // Ensure node position is not negative in world space
        y: Math.max(0, newNodeY),
      },
      branches: type === NodeType.CONDITIONAL ? [{ id: generateId(), condition: "default", nextNodeId: null }] : undefined,
      nextNodeId: (type === NodeType.PROMPT || type === NodeType.START || type === NodeType.VARIABLE) ? null : undefined,
    };

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
          const originalBranches = newNodeData.branches;
          newNodeData.branches = newNodeData.branches.map(b =>
            b.nextNodeId === deleteNodeConfirm.nodeId ? { ...b, nextNodeId: null } : b
          );
          if (JSON.stringify(originalBranches) !== JSON.stringify(newNodeData.branches)) modified = true;
        }
        return modified ? newNodeData : n;
      });
      return { ...prev, nodes: updatedNodes };
    });
  }, [currentProject, setCurrentProject, deleteNodeConfirm.nodeId]);

  const handleDeleteNodeRequest = useCallback((nodeId: string, e: React.MouseEvent) => {
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
