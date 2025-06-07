
// src/components/ZoomControls.tsx
import React from 'react';
import type { ZoomControlsProps } from '../../types';

const ZoomControls: React.FC<ZoomControlsProps> = ({ 
    scale, 
    onZoomIn, 
    onZoomOut, 
    onReset,
    minScale = 0.25,
    maxScale = 2
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center space-y-2 p-2 bg-slate-700 bg-opacity-80 rounded-lg shadow-lg">
      <button
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        className="w-8 h-8 flex items-center justify-center rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed"
        aria-label="Zoom In"
        title="Zoom In"
      >
        <i className="fas fa-plus"></i>
      </button>
      <div 
        className="text-xs text-slate-100 bg-slate-600 px-2 py-1 rounded-md w-full text-center cursor-pointer"
        onClick={onReset}
        title="Reset Zoom (Current:)"
      >
        {Math.round(scale * 100)}%
      </div>
      <button
        onClick={onZoomOut}
        disabled={scale <= minScale}
        className="w-8 h-8 flex items-center justify-center rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed"
        aria-label="Zoom Out"
        title="Zoom Out"
      >
        <i className="fas fa-minus"></i>
      </button>
    </div>
  );
};

export default ZoomControls;
