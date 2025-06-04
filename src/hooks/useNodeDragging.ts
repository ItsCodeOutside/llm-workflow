// src/hooks/useNodeDragging.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Project } from '../../types';
import { GRID_CELL_SIZE, NODE_WIDTH, NODE_HEIGHT, MAX_CLICK_MOVEMENT } from '../../constants';
import { getValidNodes } from '../utils';

interface UseNodeDraggingProps {
  currentProject: Project | null;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  editorAreaRef: React.RefObject<HTMLDivElement>;
  setSelectedNodeState: (node: Node | null) => void;
  setIsNodeModalOpen: (isOpen: boolean) => void;
  deleteActionInitiated: boolean; // From useNodeManagement
  setDeleteActionInitiated: (isInitiated: boolean) => void; // From useNodeManagement
}

export const useNodeDragging = ({
  currentProject,
  setCurrentProject,
  editorAreaRef,
  setSelectedNodeState,
  setIsNodeModalOpen,
  deleteActionInitiated,
  setDeleteActionInitiated,
}: UseNodeDraggingProps) => {
  const [draggingNode, setDraggingNode] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isActuallyDraggingRef = useRef(false);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (deleteActionInitiated) return;
    if (!currentProject || !editorAreaRef.current) return;
    const node = getValidNodes(currentProject.nodes).find(n => n.id === nodeId);
    if (!node) return;

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isActuallyDraggingRef.current = false;

    const editorRect = editorAreaRef.current.getBoundingClientRect();
    const offsetX = e.clientX - editorRect.left - node.position.x;
    const offsetY = e.clientY - editorRect.top - node.position.y;

    setDraggingNode({ id: nodeId, offset: { x: offsetX, y: offsetY } });
    (e.currentTarget as HTMLElement).classList.add('dragging');
    e.preventDefault();
  }, [currentProject, editorAreaRef, deleteActionInitiated]);

  const handleNodeDrag = useCallback((e: MouseEvent) => {
    if (!draggingNode || !currentProject || !editorAreaRef.current) return;

    if (!isActuallyDraggingRef.current && dragStartPosRef.current) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MAX_CLICK_MOVEMENT) {
        isActuallyDraggingRef.current = true;
      }
    }

    if (isActuallyDraggingRef.current) {
      const editorRect = editorAreaRef.current.getBoundingClientRect();
      let newX = e.clientX - editorRect.left - draggingNode.offset.x;
      let newY = e.clientY - editorRect.top - draggingNode.offset.y;

      newX = Math.round(newX / GRID_CELL_SIZE) * GRID_CELL_SIZE;
      newY = Math.round(newY / GRID_CELL_SIZE) * GRID_CELL_SIZE;

      newX = Math.max(0, Math.min(newX, editorRect.width - NODE_WIDTH));
      newY = Math.max(0, Math.min(newY, editorRect.height - NODE_HEIGHT));
      
      setCurrentProject(prev => {
        if (!prev) return null;
        const validPrevNodes = getValidNodes(prev.nodes);
        const updatedNodes = validPrevNodes.map(n =>
          n.id === draggingNode.id ? { ...n, position: { x: newX, y: newY } } : n
        );
        return { ...prev, nodes: updatedNodes };
      });
    }
  }, [draggingNode, currentProject, setCurrentProject, editorAreaRef]);

  const handleNodeDragEnd = useCallback(() => {
    if (!draggingNode || !currentProject) return;

    const nodeElement = document.querySelector(`.node-${draggingNode.id}`);
    if (nodeElement) nodeElement.classList.remove('dragging');

    if (deleteActionInitiated) {
      setDeleteActionInitiated(false);
      setDraggingNode(null);
      dragStartPosRef.current = null;
      isActuallyDraggingRef.current = false;
      return;
    }

    if (!isActuallyDraggingRef.current) {
      const clickedNode = getValidNodes(currentProject.nodes).find(n => n.id === draggingNode.id);
      if (clickedNode) {
        setSelectedNodeState(clickedNode);
        setIsNodeModalOpen(true);
      }
    }
    
    setDraggingNode(null);
    dragStartPosRef.current = null;
    isActuallyDraggingRef.current = false;
  }, [draggingNode, currentProject, deleteActionInitiated, setDeleteActionInitiated, setSelectedNodeState, setIsNodeModalOpen]);

  useEffect(() => {
    if (draggingNode) {
      document.addEventListener('mousemove', handleNodeDrag);
      document.addEventListener('mouseup', handleNodeDragEnd);
    } else {
      document.removeEventListener('mousemove', handleNodeDrag);
      document.removeEventListener('mouseup', handleNodeDragEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleNodeDrag);
      document.removeEventListener('mouseup', handleNodeDragEnd);
    };
  }, [draggingNode, handleNodeDrag, handleNodeDragEnd]);

  return {
    handleNodeMouseDown,
    // draggingNode state is managed internally by the hook
  };
};