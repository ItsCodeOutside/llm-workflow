// src/hooks/useNodeManagement.ts
import { useState, useCallback } from 'react';
import type { Node, Project, NodeType } from '../../types';
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
  editorAreaRef: React.RefObject<HTMLDivElement>;
}

export const useNodeManagement = ({
  currentProject,
  setCurrentProject,
  saveProjectState,
  editorAreaRef,
}: UseNodeManagementProps) => {
  const [selectedNodeState, setSelectedNodeState] = useState<Node | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [deleteNodeConfirm, setDeleteNodeConfirm] = useState<{ isOpen: boolean; nodeId: string | null; nodeName: string | null }>({ isOpen: false, nodeId: null, nodeName: null });
  const [deleteActionInitiated, setDeleteActionInitiated] = useState(false);

  const handleAddNode = useCallback((type: NodeType) => {
    if (!currentProject) return;
    const editorWidth = editorAreaRef.current?.clientWidth || 800;
    const editorHeight = editorAreaRef.current?.clientHeight || 600;

    let nodeName = INITIAL_NODE_NAME;
    let nodePrompt = INITIAL_NODE_PROMPT;
    if (type === 'START' as NodeType.START) nodePrompt = INITIAL_START_NODE_PROMPT;
    if (type === 'CONCLUSION' as NodeType.CONCLUSION) nodePrompt = INITIAL_CONCLUSION_NODE_TITLE;
    if (type === 'VARIABLE' as NodeType.VARIABLE) {
      nodeName = INITIAL_VARIABLE_NODE_NAME;
      nodePrompt = '';
    }

    const newNode: Node = {
      id: generateId(),
      type,
      name: nodeName,
      prompt: nodePrompt,
      position: {
        x: Math.max(0, Math.min(Math.random() * editorWidth * 0.7, editorWidth - NODE_WIDTH)),
        y: Math.max(0, Math.min(Math.random() * editorHeight * 0.7, editorHeight - NODE_HEIGHT)),
      },
      branches: type === 'CONDITIONAL' as NodeType.CONDITIONAL ? [{ id: generateId(), condition: "default", nextNodeId: null }] : undefined,
      nextNodeId: (type === 'PROMPT' as NodeType.PROMPT || type === 'START' as NodeType.START || type === 'VARIABLE' as NodeType.VARIABLE) ? null : undefined,
    };

    setCurrentProject(prev => {
      if (!prev) return null;
      return { ...prev, nodes: [...getValidNodes(prev.nodes), newNode] };
    });
  }, [currentProject, setCurrentProject, editorAreaRef]);

  const handleSaveNode = useCallback((updatedNode: Node) => {
    if (!currentProject) return;
    const validNodes = getValidNodes(currentProject.nodes);
    const newNodes = validNodes.map(n => (n.id === updatedNode.id ? updatedNode : n));
    // Create a new project object for saving, ensuring the main project object is updated for `saveProjectState`
    const updatedProjectForSave = { ...currentProject, nodes: newNodes };
    saveProjectState(updatedProjectForSave); // This will also call setCurrentProject internally if not skipped
    setIsNodeModalOpen(false);
    setSelectedNodeState(null);
  }, [currentProject, saveProjectState]); // Removed setCurrentProject as saveProjectState handles it

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
    // setHasUnsavedChanges is handled by setCurrentProject wrapper
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