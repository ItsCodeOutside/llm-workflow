
// src/components/editor/CanvasArea.tsx
import React from 'react';
import ZoomControls from '../ZoomControls';
import { NodeType } from '../../types'; // Changed from import type
import type { Node, CanvasAreaProps as ImportedCanvasAreaProps } from '../../types';
import {
  NODE_WIDTH, NODE_HEIGHT, GRID_CELL_SIZE,
  NODE_COLORS, INITIAL_CONCLUSION_NODE_TITLE, INITIAL_QUESTION_NODE_PROMPT, 
  INITIAL_PARALLEL_NODE_DESCRIPTION, INITIAL_SYNCHRONIZE_NODE_DESCRIPTION
} from '../../constants';

interface ExtendedCanvasAreaProps extends ImportedCanvasAreaProps {
  onNodeTouchStart: (nodeId: string, e: React.TouchEvent) => void; 
  // onDeleteNodeRequest is already in ImportedCanvasAreaProps
}

const NODE_ICONS: { [key in NodeType]?: string } = {
  [NodeType.START]: 'fas fa-play-circle',
  [NodeType.PROMPT]: 'fas fa-comment-dots',
  [NodeType.CONDITIONAL]: 'fas fa-code-branch',
  [NodeType.VARIABLE]: 'fas fa-database',
  [NodeType.QUESTION]: 'fas fa-question-circle',
  [NodeType.JAVASCRIPT]: 'fas fa-code',
  [NodeType.PARALLEL]: 'fas fa-project-diagram', 
  [NodeType.SYNCHRONIZE]: 'fas fa-hourglass-half', 
  [NodeType.CONCLUSION]: 'fas fa-flag-checkered',
};


const CanvasArea: React.FC<ExtendedCanvasAreaProps> = ({ 
  nodes,
  visualLinks,
  getLineToRectangleIntersectionPoint,
  scale,
  translate,
  editorAreaRef,
  canvasContentRef,
  onNodeMouseDown,
  onWheel,
  onCanvasMouseDown,
  zoomControls,
  onNodeTouchStart, 
  onDeleteNodeRequest, 
}) => {

  const getNodeById = (id: string): Node | undefined => nodes.find(n => n.id === id); 

  return (
    <main
      ref={editorAreaRef}
      className="flex-1 bg-slate-850 p-0 relative overflow-hidden custom-scroll" 
      style={{
          backgroundImage: `radial-gradient(${getComputedStyle(document.documentElement).getPropertyValue('--tw-colors-slate-700') || '#374151'} 1px, transparent 1px)`,
          backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
          cursor: 'grab'
      }}
      onWheel={onWheel}
      onMouseDown={onCanvasMouseDown}
    >
      <div
        ref={canvasContentRef}
        className="absolute top-0 left-0"
        style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
        }}
      >
        {nodes.map(node => {
            if (!node || typeof node.type !== 'string' || !Object.values(NodeType).includes(node.type as NodeType)) {
                return (
                <div
                    key={node?.id || `invalid-node-${Math.random().toString(36).substr(2, 9)}`}
                    className="absolute rounded-lg shadow-xl p-3 border-2 border-red-700 bg-red-900 text-white flex flex-col justify-center items-center text-xs"
                    style={{ left: node?.position?.x || 0, top: node?.position?.y || 0, width: NODE_WIDTH, height: NODE_HEIGHT, boxSizing: 'border-box'}}
                >
                    <p className="font-bold mb-1">Error: Invalid Node</p>
                </div>
                );
            }
            const nodeBaseColorClass = NODE_COLORS[node.type] || NODE_COLORS.PROMPT;
            const borderColorClass = node.isRunning ? 'border-purple-500 animate-pulse' : (node.hasError ? 'border-red-500' : 'border-transparent');
            const finalNodeClass = `${nodeBaseColorClass} ${borderColorClass}`;

            let nodeHoverTitle = node.name || node.type;
            if (node.type === NodeType.CONCLUSION) nodeHoverTitle += `: ${node.prompt || INITIAL_CONCLUSION_NODE_TITLE}`;
            else if (node.type === NodeType.VARIABLE) nodeHoverTitle += `: Stores as {${node.name}}`;
            else if (node.type === NodeType.QUESTION) nodeHoverTitle += `: ${node.prompt || INITIAL_QUESTION_NODE_PROMPT}`;
            else if (node.type === NodeType.JAVASCRIPT) nodeHoverTitle += `: JS Function (${node.prompt || 'No description'})`;
            else if (node.type === NodeType.PARALLEL) nodeHoverTitle += `: ${node.prompt || INITIAL_PARALLEL_NODE_DESCRIPTION}`;
            else if (node.type === NodeType.SYNCHRONIZE) nodeHoverTitle += `: ${node.prompt || INITIAL_SYNCHRONIZE_NODE_DESCRIPTION}`;
            else nodeHoverTitle += `: ${node.prompt || '(No prompt)'}`;


            const iconClass = NODE_ICONS[node.type] || 'fas fa-cog'; 

            return (
            <div
              key={node.id}
              className={`node-${node.id} absolute rounded-lg shadow-xl p-3 border-2 ${finalNodeClass} transition-all duration-150 cursor-grab flex flex-col justify-between items-center`}
              style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
              onMouseDown={(e) => onNodeMouseDown(node.id, e)}
              onTouchStart={(e) => onNodeTouchStart(node.id, e)} 
              title={nodeHoverTitle} 
            >
            <div className="w-full">
                <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center overflow-hidden"> 
                        <i className={`${iconClass} text-white mr-2 text-base`} aria-hidden="true"></i>
                        <h4 className="font-bold text-sm text-white truncate">
                             {node.name || node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase().replace('_', ' ')}
                        </h4>
                    </div>
                    {node.type !== NodeType.START &&
                        <button
                            className="node-delete-button text-red-300 hover:text-red-100 text-xs p-0.5 rounded-full hover:bg-red-500/50 z-10" 
                            aria-label={`Delete node ${node.name || node.type}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()} 
                            onClick={(e) => onDeleteNodeRequest(node.id, e as unknown as React.MouseEvent | React.TouchEvent)} 
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    }
                </div>
                {node.type === NodeType.CONCLUSION ? (
                    <div className="text-xs text-slate-200 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                        <p className="font-semibold italic">{node.prompt || INITIAL_CONCLUSION_NODE_TITLE}</p>
                        {node.isRunning ?
                            <p className="mt-1 text-yellow-300">(Running...)</p> :
                           (node.lastRunOutput ?
                            <p className="mt-1 text-green-300">{node.lastRunOutput}</p> :
                            <p className="mt-1 text-slate-400">(Awaiting output)</p>)
                        }
                    </div>
                ) : node.type === NodeType.VARIABLE ? (
                    <div className="text-xs text-slate-200 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                        <p className="font-semibold italic">Stores as: {'{'+node.name+'}'}</p>
                        {node.isRunning ?
                             <p className="mt-1 text-yellow-300">(Processing...)</p> :
                           (node.lastRunOutput ?
                            <p className="mt-1 text-green-300">Last Value: {node.lastRunOutput}</p> :
                            <p className="mt-1 text-slate-400">(No value captured yet)</p>)
                        }
                    </div>
                ) : node.type === NodeType.QUESTION ? (
                     <div className="text-xs text-slate-200 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                        <p className="font-semibold italic line-clamp-2">Q: {node.prompt || INITIAL_QUESTION_NODE_PROMPT}</p>
                        {node.isRunning ?
                             <p className="mt-1 text-yellow-300">(Awaiting user input...)</p>
                           : (node.lastRunOutput ?
                                <p className="mt-1 text-green-300">Last Answer: {node.lastRunOutput}</p> :
                                <p className="mt-1 text-slate-400">(No answer yet)</p>
                        )}
                    </div>
                ) : node.type === NodeType.JAVASCRIPT ? (
                     <div className="text-xs text-slate-200 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                        <p className="font-semibold italic line-clamp-2">JS: {node.prompt || '(No description)'}</p>
                         {node.isRunning ?
                             <p className="mt-1 text-yellow-300">(Executing JS...)</p> :
                           (node.lastRunOutput ?
                                <p className="mt-1 text-green-300">Output: {node.lastRunOutput}</p> :
                                <p className="mt-1 text-slate-400">(No output yet)</p>
                        )}
                    </div>
                ) : node.type === NodeType.PARALLEL ? (
                     <div className="text-xs text-slate-200 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                        <p className="font-semibold italic line-clamp-2">Parallel: {node.prompt || INITIAL_PARALLEL_NODE_DESCRIPTION}</p>
                        {node.isRunning && <p className="mt-1 text-yellow-300">(Forking paths...)</p>}
                        {/* Parallel nodes don't typically show a single "last output" in the same way */}
                        {node.parallelNextNodeIds && node.parallelNextNodeIds.length > 0 &&
                            <p className="mt-1 text-slate-400 text-xxs">Paths: {node.parallelNextNodeIds.length}</p>
                        }
                    </div>
                ) : node.type === NodeType.SYNCHRONIZE ? (
                     <div className="text-xs text-slate-200 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                        <p className="font-semibold italic line-clamp-2">Sync: {node.prompt || INITIAL_SYNCHRONIZE_NODE_DESCRIPTION}</p>
                        {node.isRunning && <p className="mt-1 text-yellow-300">(Synchronizing...)</p>}
                        {node.lastRunOutput && <p className="mt-1 text-green-300">Output: {node.lastRunOutput}</p>}
                    </div>
                ) : ( // START or PROMPT or CONDITIONAL
                    <p className="text-xs text-slate-200 h-10 overflow-y-auto custom-scroll line-clamp-3 w-full text-center px-1">
                        {node.type === NodeType.CONDITIONAL ? `Eval: ${node.prompt || '(No prompt)'}` : (node.prompt || '(No prompt configured)')}
                    </p>
                )}
            </div>
            {(node.type !== NodeType.CONCLUSION && node.type !== NodeType.VARIABLE && node.type !== NodeType.QUESTION && node.type !== NodeType.JAVASCRIPT && node.type !== NodeType.PARALLEL && node.type !== NodeType.SYNCHRONIZE) && node.lastRunOutput && (
                <div className="mt-auto pt-1 border-t border-slate-500/50 w-full overflow-hidden">
                    <p className={`text-xs ${node.hasError ? 'text-red-300' : 'text-green-300'} truncate text-center`}>Last Out: {node.lastRunOutput}</p>
                </div>
            )}
            </div>
        );})}

        <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: '10000px', height: '10000px' }}
            aria-hidden="true"
        >
            <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9.5" refY="3.5" orient="auto" fill="#0EA5E9">
                <polygon points="0 0, 10 3.5, 0 7" />
            </marker>
            </defs>
            {visualLinks.map(link => {
            const sourceNode = getNodeById(link.sourceId);
            const targetNode = getNodeById(link.targetId);
            if (!sourceNode || !targetNode) return null;

            const sourceNodeRect = { x: sourceNode.position.x, y: sourceNode.position.y, width: NODE_WIDTH, height: NODE_HEIGHT };
            const targetNodeRect = { x: targetNode.position.x, y: targetNode.position.y, width: NODE_WIDTH, height: NODE_HEIGHT };

            const sourceCenter = { x: sourceNode.position.x + NODE_WIDTH / 2, y: sourceNode.position.y + NODE_HEIGHT / 2 };
            const targetCenter = { x: targetNode.position.x + NODE_WIDTH / 2, y: targetNode.position.y + NODE_HEIGHT / 2 };

            const startPoint = getLineToRectangleIntersectionPoint(targetCenter, sourceCenter, sourceNodeRect);
            const endPoint = getLineToRectangleIntersectionPoint(sourceCenter, targetCenter, targetNodeRect);

            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const curveFactor = 0.2;
            let midX = startPoint.x + dx * 0.5;
            let midY = startPoint.y + dy * 0.5;
            const normalX = -dy * curveFactor;
            const normalY = dx * curveFactor;

            let cpX = midX + normalX;
            let cpY = midY + normalY;

            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { // Nodes are overlapping or very close, add more curve
                cpX += (Math.random() - 0.5) * 40 + 20 * Math.sign(normalX || 1); // Add more significant curve
                cpY += (Math.random() - 0.5) * 40 + 20 * Math.sign(normalY || 1);
            }


            const path = `M ${startPoint.x},${startPoint.y} Q ${cpX},${cpY} ${endPoint.x},${endPoint.y}`;
            const labelX = 0.25 * startPoint.x + 0.5 * cpX + 0.25 * endPoint.x;
            const labelY = 0.25 * startPoint.y + 0.5 * cpY + 0.25 * endPoint.y;

            return (
                <g key={link.id}>
                <path d={path} stroke="#0EA5E9" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                {link.condition && (
                    <text
                        x={labelX}
                        y={labelY - 5}
                        fill="#94A3B8"
                        fontSize="10px"
                        textAnchor="middle"
                        className="pointer-events-auto"
                    >
                    {link.condition}
                    </text>
                )}
                </g>
            );
            })}
        </svg>
      </div>
      <ZoomControls
        scale={zoomControls.scale}
        onZoomIn={zoomControls.onZoomIn}
        onZoomOut={zoomControls.onZoomOut}
        onReset={zoomControls.onReset}
        minScale={zoomControls.minScale}
        maxScale={zoomControls.maxScale}
      />
    </main>
  );
};

export default CanvasArea;