
// src/hooks/useNodeDragging.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Project } from '../../types';
import { GRID_CELL_SIZE, NODE_WIDTH, NODE_HEIGHT, MAX_CLICK_MOVEMENT } from '../../constants';
import { getValidNodes } from '../utils';

interface UseNodeDraggingProps {
  currentProject: Project | null;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  editorAreaRef: React.RefObject<HTMLDivElement>; // Ref to the element whose bounds are used for mouse coord calc
  setSelectedNodeState: (node: Node | null) => void;
  setIsNodeModalOpen: (isOpen: boolean) => void;
  deleteActionInitiated: boolean; 
  setDeleteActionInitiated: (isInitiated: boolean) => void; 
  scale: number; // Current canvas scale
  translate: { x: number; y: number }; // Current canvas translation
}

export const useNodeDragging = ({
  currentProject,
  setCurrentProject,
  editorAreaRef,
  setSelectedNodeState,
  setIsNodeModalOpen,
  deleteActionInitiated,
  setDeleteActionInitiated,
  scale,
  translate,
}: UseNodeDraggingProps) => {
  const [draggingNode, setDraggingNode] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const dragStartScreenPosRef = useRef<{ x: number; y: number } | null>(null); // Mouse position on screen at drag start
  const isActuallyDraggingRef = useRef(false);

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.node-delete-button')) {
      return;
    }

    if (deleteActionInitiated) {
      e.preventDefault();
      return;
    }
    
    if (!currentProject || !editorAreaRef.current) return;
    const node = getValidNodes(currentProject.nodes).find(n => n.id === nodeId);
    if (!node) return;

    dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
    isActuallyDraggingRef.current = false;

    const editorRect = editorAreaRef.current.getBoundingClientRect();
    
    // Mouse position in world coordinates
    const worldMouseX = (e.clientX - editorRect.left - translate.x) / scale;
    const worldMouseY = (e.clientY - editorRect.top - translate.y) / scale;

    // Offset is the difference between mouse world position and node's top-left world position
    const offsetX = worldMouseX - node.position.x;
    const offsetY = worldMouseY - node.position.y;

    setDraggingNode({ id: nodeId, offset: { x: offsetX, y: offsetY } });
    (e.currentTarget as HTMLElement).classList.add('dragging');
    e.preventDefault();
  }, [currentProject, editorAreaRef, scale, translate, deleteActionInitiated]);


  const handleNodeDrag = useCallback((e: MouseEvent) => {
    if (!draggingNode || !currentProject || !editorAreaRef.current) return;

    if (!isActuallyDraggingRef.current && dragStartScreenPosRef.current) {
      const dx = e.clientX - dragStartScreenPosRef.current.x;
      const dy = e.clientY - dragStartScreenPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MAX_CLICK_MOVEMENT) { // Compare screen movement
        isActuallyDraggingRef.current = true;
      }
    }

    if (isActuallyDraggingRef.current) {
      const editorRect = editorAreaRef.current.getBoundingClientRect();
      
      // Current mouse position in world coordinates
      const worldMouseX = (e.clientX - editorRect.left - translate.x) / scale;
      const worldMouseY = (e.clientY - editorRect.top - translate.y) / scale;
      
      // New node top-left position in world coordinates
      let newWorldX = worldMouseX - draggingNode.offset.x;
      let newWorldY = worldMouseY - draggingNode.offset.y;

      // Snap to grid in world coordinates
      newWorldX = Math.round(newWorldX / GRID_CELL_SIZE) * GRID_CELL_SIZE;
      newWorldY = Math.round(newWorldY / GRID_CELL_SIZE) * GRID_CELL_SIZE;

      // Clamping (optional, can be removed if infinite canvas is desired)
      // These clamps are in world coordinates.
      // The "editorRect.width/height" might need to represent a "world boundary" if one exists.
      // For now, let's clamp to positive coordinates, and not beyond a very large conceptual world.
      newWorldX = Math.max(0, newWorldX); // Ensure nodes don't go to negative world coords
      newWorldY = Math.max(0, newWorldY);
      // If you had a fixed world size (e.g., 10000x10000 world units):
      // newWorldX = Math.min(newWorldX, WORLD_CANVAS_WIDTH - NODE_WIDTH);
      // newWorldY = Math.min(newWorldY, WORLD_CANVAS_HEIGHT - NODE_HEIGHT);
      
      setCurrentProject(prev => {
        if (!prev) return null;
        const validPrevNodes = getValidNodes(prev.nodes);
        const updatedNodes = validPrevNodes.map(n =>
          n.id === draggingNode.id ? { ...n, position: { x: newWorldX, y: newWorldY } } : n
        );
        return { ...prev, nodes: updatedNodes };
      });
    }
  }, [draggingNode, currentProject, setCurrentProject, editorAreaRef, scale, translate]);

  const handleNodeDragEnd = useCallback(() => {
    if (!draggingNode || !currentProject) return;

    const nodeElement = document.querySelector(`.node-${draggingNode.id}`);
    if (nodeElement) nodeElement.classList.remove('dragging');

    if (deleteActionInitiated) {
      setDeleteActionInitiated(false); 
      setDraggingNode(null);
      dragStartScreenPosRef.current = null;
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
    dragStartScreenPosRef.current = null;
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
  };
};
