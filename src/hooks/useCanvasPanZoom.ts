// src/hooks/useCanvasPanZoom.ts
import { useState, useCallback, useEffect } from 'react';

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY = 0.001;

interface UseCanvasPanZoomProps {
  editorAreaRef: React.RefObject<HTMLDivElement>;
}

export const useCanvasPanZoom = ({ editorAreaRef }: UseCanvasPanZoomProps) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPoint, setPanStartPoint] = useState({ x: 0, y: 0 });

  const handleWheelOnCanvas = useCallback((e: React.WheelEvent) => {
    if (!editorAreaRef.current) return;
    e.preventDefault();
    const delta = e.deltaY * ZOOM_SENSITIVITY * -1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
    
    const rect = editorAreaRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTranslate(prevTranslate => ({
      x: mouseX - (mouseX - prevTranslate.x) * (newScale / scale),
      y: mouseY - (mouseY - prevTranslate.y) * (newScale / scale),
    }));
    setScale(newScale);
  }, [scale, editorAreaRef]);

  const handleMouseDownOnCanvas = useCallback((e: React.MouseEvent) => {
    // Check if the mousedown event is directly on the canvas or its content wrapper, not on a node.
    // The check for e.target === canvasContentRef.current might be too restrictive if canvasContentRef is not the direct event target.
    // Relying on nodes having their own onMouseDown that stops propagation or specific class checks might be better.
    // For now, if it's on editorArea and not handled by a node's mousedown, it's a pan.
     if (editorAreaRef.current && (e.target === editorAreaRef.current || (e.target as HTMLElement).parentElement === editorAreaRef.current) ) {
      setIsPanning(true);
      setPanStartPoint({ x: e.clientX - translate.x, y: e.clientY - translate.y });
      editorAreaRef.current.style.cursor = 'grabbing';
    }
  }, [translate.x, translate.y, editorAreaRef]);
  
  const handleMouseMoveOnCanvas = useCallback((e: MouseEvent) => { // e type should be MouseEvent for document listeners
    if (isPanning) {
      setTranslate({ x: e.clientX - panStartPoint.x, y: e.clientY - panStartPoint.y });
    }
  }, [isPanning, panStartPoint.x, panStartPoint.y]);

  const handleMouseUpOnCanvas = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      if (editorAreaRef.current) editorAreaRef.current.style.cursor = 'grab';
    }
  }, [isPanning, editorAreaRef]);
  
  useEffect(() => {
    const editorElement = editorAreaRef.current;
    if (isPanning && editorElement) {
      document.addEventListener('mousemove', handleMouseMoveOnCanvas);
      document.addEventListener('mouseup', handleMouseUpOnCanvas);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveOnCanvas);
        document.removeEventListener('mouseup', handleMouseUpOnCanvas);
        if (editorElement) editorElement.style.cursor = 'grab';
      };
    } else if (editorElement) {
        editorElement.style.cursor = 'grab';
    }
  }, [isPanning, handleMouseMoveOnCanvas, handleMouseUpOnCanvas, editorAreaRef]);


  const zoomIn = useCallback(() => {
    const newScale = Math.min(MAX_SCALE, scale * 1.2);
    if (editorAreaRef.current) {
        const rect = editorAreaRef.current.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        setTranslate(prevTranslate => ({
            x: viewportCenterX - (viewportCenterX - prevTranslate.x) * (newScale / scale),
            y: viewportCenterY - (viewportCenterY - prevTranslate.y) * (newScale / scale),
        }));
    }
    setScale(newScale);
  }, [scale, editorAreaRef]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(MIN_SCALE, scale / 1.2);
     if (editorAreaRef.current) {
        const rect = editorAreaRef.current.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        setTranslate(prevTranslate => ({
            x: viewportCenterX - (viewportCenterX - prevTranslate.x) * (newScale / scale),
            y: viewportCenterY - (viewportCenterY - prevTranslate.y) * (newScale / scale),
        }));
    }
    setScale(newScale);
  }, [scale, editorAreaRef]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  return {
    scale,
    translate,
    isPanning,
    panStartPoint,
    handleWheelOnCanvas,
    handleMouseDownOnCanvas,
    // handleMouseMoveOnCanvas, // These are typically managed by useEffect
    // handleMouseUpOnCanvas,   // and don't need to be returned unless specifically needed outside
    zoomIn,
    zoomOut,
    resetZoom,
    MIN_SCALE,
    MAX_SCALE
  };
};
