// src/hooks/useCanvasPanZoom.ts
import { useState, useCallback, useEffect, useRef } from 'react';

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY_MOUSE = 0.001;
const ZOOM_SENSITIVITY_TOUCH = 0.005; // Adjusted for touch

interface UseCanvasPanZoomProps {
  editorAreaRef: React.RefObject<HTMLDivElement>;
}

export const useCanvasPanZoom = ({ editorAreaRef }: UseCanvasPanZoomProps) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  
  // Mouse Panning
  const [isMousePanning, setIsMousePanning] = useState(false);
  const [panStartPoint, setPanStartPoint] = useState({ x: 0, y: 0 });

  // Touch Panning & Zooming
  const [isTouchInteraction, setIsTouchInteraction] = useState(false);
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialTouchMidpointRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchPointsRef = useRef<TouchList | null>(null);


  const zoom = useCallback((delta: number, clientX: number, clientY: number) => {
    if (!editorAreaRef.current) return;
    
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
    const rect = editorAreaRef.current.getBoundingClientRect();
    const mouseXInElement = clientX - rect.left;
    const mouseYInElement = clientY - rect.top;

    setTranslate(prevTranslate => ({
      x: mouseXInElement - (mouseXInElement - prevTranslate.x) * (newScale / scale),
      y: mouseYInElement - (mouseYInElement - prevTranslate.y) * (newScale / scale),
    }));
    setScale(newScale);
  }, [scale, editorAreaRef]);


  const handleWheelOnCanvas = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * ZOOM_SENSITIVITY_MOUSE * -1;
    zoom(delta, e.clientX, e.clientY);
  }, [zoom]);

  const handleMouseDownOnCanvas = useCallback((e: React.MouseEvent) => {
    if (editorAreaRef.current && (e.target === editorAreaRef.current || (e.target as HTMLElement).parentElement === editorAreaRef.current)) {
      setIsMousePanning(true);
      setPanStartPoint({ x: e.clientX - translate.x, y: e.clientY - translate.y });
      editorAreaRef.current.style.cursor = 'grabbing';
    }
  }, [translate.x, translate.y, editorAreaRef]);
  
  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    if (isMousePanning) {
      setTranslate({ x: e.clientX - panStartPoint.x, y: e.clientY - panStartPoint.y });
    }
  }, [isMousePanning, panStartPoint.x, panStartPoint.y]);

  const handleMouseUpGlobal = useCallback(() => {
    if (isMousePanning) {
      setIsMousePanning(false);
      if (editorAreaRef.current) editorAreaRef.current.style.cursor = 'grab';
    }
  }, [isMousePanning, editorAreaRef]);
  
  // Mouse Pan Effect
  useEffect(() => {
    const editorElement = editorAreaRef.current;
    if (isMousePanning && editorElement) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveGlobal);
        document.removeEventListener('mouseup', handleMouseUpGlobal);
        if (editorElement) editorElement.style.cursor = 'grab';
      };
    } else if (editorElement) {
        editorElement.style.cursor = 'grab';
    }
  }, [isMousePanning, handleMouseMoveGlobal, handleMouseUpGlobal, editorAreaRef]);


  // Touch Events
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!editorAreaRef.current || !editorAreaRef.current.contains(e.target as Node)) return;
     // Prevent default only if target is the canvas itself or its direct content wrapper,
     // not a child element like a node that might have its own touch handlers.
    if (e.target === editorAreaRef.current || (e.target as HTMLElement).parentElement === editorAreaRef.current) {
        e.preventDefault();
    }

    setIsTouchInteraction(true);
    lastTouchPointsRef.current = e.touches;

    if (e.touches.length === 2) { // Pinch Zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialTouchDistanceRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialTouchMidpointRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    } else if (e.touches.length === 1) { // One-finger Pan
      setPanStartPoint({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
    }
  }, [translate.x, translate.y, editorAreaRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isTouchInteraction || !editorAreaRef.current) return;
     if (e.target === editorAreaRef.current || (e.target as HTMLElement).parentElement === editorAreaRef.current) {
        e.preventDefault();
    }

    if (e.touches.length === 2 && initialTouchDistanceRef.current && initialTouchMidpointRef.current) { // Pinch Zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleChange = (currentDistance - initialTouchDistanceRef.current) * ZOOM_SENSITIVITY_TOUCH;
      
      zoom(scaleChange, initialTouchMidpointRef.current.x, initialTouchMidpointRef.current.y);
      initialTouchDistanceRef.current = currentDistance; // Update for continuous zoom
    
    } else if (e.touches.length === 1) { // One-finger Pan
      setTranslate({ x: e.touches[0].clientX - panStartPoint.x, y: e.touches[0].clientY - panStartPoint.y });
    }
    lastTouchPointsRef.current = e.touches;
  }, [isTouchInteraction, panStartPoint, zoom, editorAreaRef]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Check if any touches are left. If e.touches.length > 0, it means one finger was lifted during a multi-touch.
    // In this case, we might want to reset the interaction or adapt. For simplicity now, end interaction if no specific handling.
    if (e.touches.length === 0) {
        setIsTouchInteraction(false);
        initialTouchDistanceRef.current = null;
        initialTouchMidpointRef.current = null;
        lastTouchPointsRef.current = null;
    } else {
        // If fingers are still down (e.g., went from 2 to 1), re-initialize for one-finger pan
        // This helps make transition from zoom to pan smoother
        if (e.touches.length === 1) {
            setPanStartPoint({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
        }
        lastTouchPointsRef.current = e.touches; // update last touch points
    }
  }, [translate.x, translate.y]);
  
  // Touch Event Listeners Effect
  useEffect(() => {
    const editorEl = editorAreaRef.current;
    if (editorEl) {
      editorEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      editorEl.addEventListener('touchmove', handleTouchMove, { passive: false });
      editorEl.addEventListener('touchend', handleTouchEnd, { passive: false });
      editorEl.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      return () => {
        editorEl.removeEventListener('touchstart', handleTouchStart);
        editorEl.removeEventListener('touchmove', handleTouchMove);
        editorEl.removeEventListener('touchend', handleTouchEnd);
        editorEl.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [editorAreaRef, handleTouchStart, handleTouchMove, handleTouchEnd]);


  const manualZoomIn = useCallback(() => {
    if (editorAreaRef.current) {
        const rect = editorAreaRef.current.getBoundingClientRect();
        zoom(scale * 0.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [scale, editorAreaRef, zoom]);

  const manualZoomOut = useCallback(() => {
    if (editorAreaRef.current) {
        const rect = editorAreaRef.current.getBoundingClientRect();
        zoom(scale * -0.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [scale, editorAreaRef, zoom]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  return {
    scale,
    translate,
    isPanning: isMousePanning || (isTouchInteraction && lastTouchPointsRef.current?.length === 1), // Consider touch pan as panning
    panStartPoint, // This is mostly for mouse, touch pan is handled internally
    handleWheelOnCanvas,
    handleMouseDownOnCanvas,
    zoomIn: manualZoomIn,
    zoomOut: manualZoomOut,
    resetZoom,
    MIN_SCALE,
    MAX_SCALE
  };
};