// src/hooks/useNodeDragging.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Project } from '../../types';
import { GRID_CELL_SIZE, MAX_CLICK_MOVEMENT } from '../../constants';
import { getValidNodes } from '../utils';

const LONG_PRESS_DURATION = 500; // ms
const DOUBLE_TAP_THRESHOLD = 300; // ms
const TOUCH_MOVE_THRESHOLD = 10; // pixels

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
  
  // Mouse dragging state
  const dragStartScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const isActuallyMouseDraggingRef = useRef(false);

  // Touch interaction state
  const longPressTimeoutRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number
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


  // --- Mouse Drag Logic ---
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.node-delete-button')) return;
    if (deleteActionInitiated) { e.preventDefault(); return; }
    
    dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
    isActuallyMouseDraggingRef.current = false;
    startDrag(nodeId, e.clientX, e.clientY, 'mouse');
    e.preventDefault(); // Prevent text selection, etc.
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
      // This was a click, not a drag. For mouse, double-click might be preferred for edit if single click is for selection.
      // However, user asked for double-tap for mobile. For consistency, let's make double-click edit for mouse too.
      // The current logic opens modal on simple click. If we want double-click, this needs to change.
      // For now, let's keep single-click-opens-modal for mouse, and double-tap for touch.
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


  // --- Touch Drag & Tap Logic ---
  const handleNodeTouchStart = useCallback((nodeId: string, e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch for node interactions
    const touch = e.touches[0];
    currentTouchNodeIdRef.current = nodeId; // Store nodeId for touch end
    
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.node-delete-button')) return;
    if (deleteActionInitiated) { e.preventDefault(); return; }

    e.stopPropagation(); // Prevent canvas pan/zoom while interacting with node

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    // Double tap detection
    const currentTime = Date.now();
    if (currentTime - lastTapTimeRef.current < DOUBLE_TAP_THRESHOLD) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
      lastTapTimeRef.current = 0; // Reset for next double tap
      
      const nodeToEdit = getValidNodes(currentProject?.nodes).find(n => n.id === nodeId);
      if (nodeToEdit) {
        setSelectedNodeState(nodeToEdit);
        setIsNodeModalOpen(true);
      }
      return; // Double tap handled
    }
    // Not a double tap, set time for potential next tap.
    lastTapTimeRef.current = currentTime;


    // Long press for drag
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = window.setTimeout(() => { // Use window.setTimeout for browser context
      if (touchStartPosRef.current) { // Check if touch is still active and hasn't moved much
         startDrag(nodeId, touchStartPosRef.current.x, touchStartPosRef.current.y, 'touch');
      }
      longPressTimeoutRef.current = null;
    }, LONG_PRESS_DURATION);

  }, [deleteActionInitiated, startDrag, currentProject, setSelectedNodeState, setIsNodeModalOpen]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch moves
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
      e.preventDefault(); // Prevent page scroll if dragging a node
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
     // Check if the touch end corresponds to the node we were interacting with
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
    currentTouchNodeIdRef.current = null; // Reset after handling
  }, [deleteActionInitiated, setDeleteActionInitiated, draggingNode]);

  useEffect(() => {
    // Add global touchmove and touchend listeners when a touch starts on a node
    // or when a drag is active. This helps capture movement/release outside the node element.
    // This is a simplified approach; more robust would be conditional on currentTouchNodeIdRef.current being set
    // or draggingNode.method === 'touch'.
    if (currentTouchNodeIdRef.current || (draggingNode && draggingNode.method === 'touch')) {
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false }); // passive: false to allow preventDefault
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
    handleNodeTouchStart, // Expose this for nodes to attach
  };
};