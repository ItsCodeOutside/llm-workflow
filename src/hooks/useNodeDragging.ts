// src/hooks/useNodeDragging.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Project } from '../types'; // Updated path
import { GRID_CELL_SIZE, MAX_CLICK_MOVEMENT } from '../constants'; // Updated path
import { getValidNodes } from '../utils';

const LONG_PRESS_DURATION = 500; 
const DOUBLE_TAP_THRESHOLD = 300; 
const TOUCH_MOVE_THRESHOLD = 10; 

interface UseNodeDraggingProps {
  currentProject: Project | null;
  setCurrentProject: (updater: Project | ((prev: Project | null) => Project | null)) => void;
  editorAreaRef: React.RefObject<HTMLDivElement>;
  setSelectedNodeState: (node: Node | null) => void;
  setIsNodeModalOpen: (isOpen: boolean) => void;
  deleteActionInitiated: boolean; 
  setDeleteActionInitiated: (isInitiated: boolean) => void; 
  scale: number;
  translate: { x: number; y: number };
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
  const [draggingNode, setDraggingNode] = useState<{ id: string; offset: { x: number; y: number }; method: 'mouse' | 'touch' } | null>(null);
  
  const dragStartScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const isActuallyMouseDraggingRef = useRef(false);

  const longPressTimeoutRef = useRef<number | null>(null); 
  const lastTapTimeRef = useRef(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentTouchNodeIdRef = useRef<string | null>(null);


  const startDrag = useCallback((nodeId: string, clientX: number, clientY: number, method: 'mouse' | 'touch') => {
    if (!currentProject || !editorAreaRef.current) return;
    const node = getValidNodes(currentProject.nodes).find(n => n.id === nodeId);
    if (!node) return;

    const editorRect = editorAreaRef.current.getBoundingClientRect();
    const worldMouseX = (clientX - editorRect.left - translate.x) / scale;
    const worldMouseY = (clientY - editorRect.top - translate.y) / scale;

    const offsetX = worldMouseX - node.position.x;
    const offsetY = worldMouseY - node.position.y;

    setDraggingNode({ id: nodeId, offset: { x: offsetX, y: offsetY }, method });
    const nodeElement = document.querySelector(`.node-${nodeId}`);
    if (nodeElement) nodeElement.classList.add('dragging');
  }, [currentProject, editorAreaRef, scale, translate]);


  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.node-delete-button')) return;
    if (deleteActionInitiated) { e.preventDefault(); return; }
    
    dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
    isActuallyMouseDraggingRef.current = false;
    startDrag(nodeId, e.clientX, e.clientY, 'mouse');
    e.preventDefault(); 
  }, [deleteActionInitiated, startDrag]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingNode || draggingNode.method !== 'mouse' || !currentProject || !editorAreaRef.current) return;

    if (!isActuallyMouseDraggingRef.current && dragStartScreenPosRef.current) {
      const dx = e.clientX - dragStartScreenPosRef.current.x;
      const dy = e.clientY - dragStartScreenPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MAX_CLICK_MOVEMENT) {
        isActuallyMouseDraggingRef.current = true;
      }
    }

    if (isActuallyMouseDraggingRef.current) {
      const editorRect = editorAreaRef.current.getBoundingClientRect();
      const worldMouseX = (e.clientX - editorRect.left - translate.x) / scale;
      const worldMouseY = (e.clientY - editorRect.top - translate.y) / scale;
      
      let newWorldX = Math.round((worldMouseX - draggingNode.offset.x) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
      let newWorldY = Math.round((worldMouseY - draggingNode.offset.y) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
      newWorldX = Math.max(0, newWorldX);
      newWorldY = Math.max(0, newWorldY);
      
      setCurrentProject(prev => {
        if (!prev) return null;
        const updatedNodes = getValidNodes(prev.nodes).map(n =>
          n.id === draggingNode.id ? { ...n, position: { x: newWorldX, y: newWorldY } } : n
        );
        return { ...prev, nodes: updatedNodes };
      });
    }
  }, [draggingNode, currentProject, setCurrentProject, editorAreaRef, scale, translate]);

  const handleGlobalMouseUp = useCallback(() => {
    if (!draggingNode || draggingNode.method !== 'mouse' || !currentProject) return;

    const nodeElement = document.querySelector(`.node-${draggingNode.id}`);
    if (nodeElement) nodeElement.classList.remove('dragging');

    if (deleteActionInitiated) {
      setDeleteActionInitiated(false);
    } else if (!isActuallyMouseDraggingRef.current) {
      const clickedNode = getValidNodes(currentProject.nodes).find(n => n.id === draggingNode.id);
      if (clickedNode) {
        setSelectedNodeState(clickedNode);
        setIsNodeModalOpen(true);
      }
    }
    
    setDraggingNode(null);
    dragStartScreenPosRef.current = null;
    isActuallyMouseDraggingRef.current = false;
  }, [draggingNode, currentProject, deleteActionInitiated, setDeleteActionInitiated, setSelectedNodeState, setIsNodeModalOpen]);

  useEffect(() => {
    if (draggingNode && draggingNode.method === 'mouse') {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingNode, handleGlobalMouseMove, handleGlobalMouseUp]);


  const handleNodeTouchStart = useCallback((nodeId: string, e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; 
    const touch = e.touches[0];
    currentTouchNodeIdRef.current = nodeId; 
    
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.node-delete-button')) return;
    if (deleteActionInitiated) { e.preventDefault(); return; }

    e.stopPropagation(); 

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    const currentTime = Date.now();
    if (currentTime - lastTapTimeRef.current < DOUBLE_TAP_THRESHOLD) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      lastTapTimeRef.current = 0; 
      
      const nodeToEdit = getValidNodes(currentProject?.nodes).find(n => n.id === nodeId);
      if (nodeToEdit) {
        setSelectedNodeState(nodeToEdit);
        setIsNodeModalOpen(true);
      }
      return; 
    }
    lastTapTimeRef.current = currentTime;


    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = window.setTimeout(() => { 
      if (touchStartPosRef.current) { 
         startDrag(nodeId, touchStartPosRef.current.x, touchStartPosRef.current.y, 'touch');
      }
      longPressTimeoutRef.current = null;
    }, LONG_PRESS_DURATION);

  }, [deleteActionInitiated, startDrag, currentProject, setSelectedNodeState, setIsNodeModalOpen]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return; 
    const touch = e.touches[0];

    if (longPressTimeoutRef.current && touchStartPosRef.current) {
      const dx = touch.clientX - touchStartPosRef.current.x;
      const dy = touch.clientY - touchStartPosRef.current.y;
      if (Math.hypot(dx, dy) > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
    
    if (draggingNode && draggingNode.method === 'touch' && currentProject && editorAreaRef.current) {
      e.preventDefault(); 
      const editorRect = editorAreaRef.current.getBoundingClientRect();
      const worldMouseX = (touch.clientX - editorRect.left - translate.x) / scale;
      const worldMouseY = (touch.clientY - editorRect.top - translate.y) / scale;
      
      let newWorldX = Math.round((worldMouseX - draggingNode.offset.x) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
      let newWorldY = Math.round((worldMouseY - draggingNode.offset.y) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
      newWorldX = Math.max(0, newWorldX);
      newWorldY = Math.max(0, newWorldY);
      
      setCurrentProject(prev => {
        if (!prev) return null;
        const updatedNodes = getValidNodes(prev.nodes).map(n =>
          n.id === draggingNode.id ? { ...n, position: { x: newWorldX, y: newWorldY } } : n
        );
        return { ...prev, nodes: updatedNodes };
      });
    }
  }, [draggingNode, currentProject, setCurrentProject, editorAreaRef, scale, translate]);

  const handleGlobalTouchEnd = useCallback((e: TouchEvent) => {
    if (currentTouchNodeIdRef.current === null && !draggingNode) return;

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (draggingNode && draggingNode.method === 'touch') {
      const nodeElement = document.querySelector(`.node-${draggingNode.id}`);
      if (nodeElement) nodeElement.classList.remove('dragging');
      if (deleteActionInitiated) setDeleteActionInitiated(false);
      setDraggingNode(null);
    }
    
    touchStartPosRef.current = null;
    currentTouchNodeIdRef.current = null; 
  }, [deleteActionInitiated, setDeleteActionInitiated, draggingNode]);

  useEffect(() => {
    if (currentTouchNodeIdRef.current || (draggingNode && draggingNode.method === 'touch')) {
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false }); 
        document.addEventListener('touchend', handleGlobalTouchEnd);
        document.addEventListener('touchcancel', handleGlobalTouchEnd);
    } else {
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
        document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    }
    return () => {
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
        document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [currentTouchNodeIdRef.current, draggingNode, handleGlobalTouchMove, handleGlobalTouchEnd]);

  return {
    handleNodeMouseDown,
    handleNodeTouchStart, 
  };
};
