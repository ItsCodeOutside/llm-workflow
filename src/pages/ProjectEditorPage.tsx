
// src/pages/ProjectEditorPage.tsx
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import Header from '../components/Header';
import NodeEditModal from '../components/NodeEditModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import RunHistoryModal from '../components/RunHistoryModal';
import HelpModal from '../components/HelpModal';
import ConfirmationModal from '../components/ConfirmationModal';
import UnsavedChangesModal from '../components/UnsavedChangesModal';
import ExecutionStatusPanel from '../components/ExecutionStatusPanel';
import ZoomControls from '../components/ZoomControls'; // New

import { useProjects } from '../hooks'; 
import { useProjectStateManagement } from '../hooks/useProjectStateManagement';
import { useNodeManagement } from '../hooks/useNodeManagement';
import { useNodeDragging } from '../hooks/useNodeDragging';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useEditorModals } from '../hooks/useEditorModals';
import { useVisualLinks } from '../hooks/useVisualLinks';

import { getValidNodes } from '../utils';
import {
  NODE_WIDTH, NODE_HEIGHT, GRID_CELL_SIZE,
  NODE_COLORS, INITIAL_CONCLUSION_NODE_TITLE,
} from '../../constants';
import {
  type Project, type Node, NodeType, type Link as VisualLink,
} from '../../types';


const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY = 0.001; // Adjust for desired zoom speed

const ProjectEditorPage: React.FC = () => {
  const editorAreaRef = useRef<HTMLDivElement>(null); // This is the outer viewport
  const canvasContentRef = useRef<HTMLDivElement>(null); // This is the pannable/zoomable content

  // Pan and Zoom State
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPoint, setPanStartPoint] = useState({ x: 0, y: 0 });


  // Core State Management and Project Data
  const {
    projectId, 
    currentProject,
    setCurrentProject, 
    isLoading,
    hasUnsavedChanges,
    saveProjectState,
    isUnsavedChangesModalOpen,
    setIsUnsavedChangesModalOpen, 
    handleRequestCloseProject,
    handleSaveAndClose,
    handleCloseWithoutSaving,
  } = useProjectStateManagement();

  // Modal States (ProjectSettings, RunHistory, Help, LlmError)
  const {
    isProjectSettingsModalOpen, openProjectSettingsModal, closeProjectSettingsModal,
    isRunHistoryModalOpen, openRunHistoryModal, closeRunHistoryModal,
    isHelpModalOpen, openHelpModal, closeHelpModal,
    isLlmErrorModalOpen, llmErrorMessage, openLlmErrorModal, closeLlmErrorModal
  } = useEditorModals();

  // Node Management (Add, Edit, Delete, NodeModal)
  const {
    selectedNodeState, setSelectedNodeState,
    isNodeModalOpen, setIsNodeModalOpen,
    deleteNodeConfirm, setDeleteNodeConfirm,
    deleteActionInitiated, setDeleteActionInitiated,
    handleAddNode,
    handleSaveNode,
    confirmDeleteNode,
    handleDeleteNodeRequest,
  } = useNodeManagement({ currentProject, setCurrentProject, saveProjectState, editorAreaRef, scale, translate }); // Pass scale/translate

  // Node Dragging Logic
  const { handleNodeMouseDown } = useNodeDragging({
    currentProject,
    setCurrentProject,
    editorAreaRef, // This should be the ref of the element whose getBoundingClientRect() is used for mouse coords
    setSelectedNodeState,
    setIsNodeModalOpen,
    deleteActionInitiated,
    setDeleteActionInitiated,
    scale, // Pass scale
    translate, // Pass translate
  });

  // Workflow Execution Logic
  const {
    isWorkflowRunning,
    executionLogs,
    currentExecutingNodeId,
    runStartTime,
    runEndTime,
    totalTokensThisRun,
    isExecutionPanelOpen,
    setIsExecutionPanelOpen,
    runWorkflow: executeWorkflowFromHook, 
    handleStopWorkflow,
  } = useWorkflowExecution({ currentProject, saveProjectState, setCurrentProject, hasUnsavedChanges });


  // Visual Links
  const validNodesOnCanvas = useMemo(() => getValidNodes(currentProject?.nodes), [currentProject?.nodes]);
  const { visualLinks, getLineToRectangleIntersectionPoint } = useVisualLinks(validNodesOnCanvas);

  // Panning and Zooming Handlers
  const handleWheelOnCanvas = useCallback((e: React.WheelEvent) => {
    if (!editorAreaRef.current) return;
    e.preventDefault();
    const delta = e.deltaY * ZOOM_SENSITIVITY * -1; // Invert deltaY for natural zoom
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
    
    const rect = editorAreaRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left; // Mouse position relative to editor viewport
    const mouseY = e.clientY - rect.top;

    // Point on canvas before zoom: (mouseX - translateX) / oldScale
    // Point on canvas after zoom: (mouseX - newTranslateX) / newScale
    // These must be equal for zooming towards mouse.
    // newTranslateX = mouseX - (mouseX - translateX) * (newScale / oldScale)
    // newTranslateY = mouseY - (mouseY - translateY) * (newScale / oldScale)

    setTranslate(prevTranslate => ({
      x: mouseX - (mouseX - prevTranslate.x) * (newScale / scale),
      y: mouseY - (mouseY - prevTranslate.y) * (newScale / scale),
    }));
    setScale(newScale);
  }, [scale, translate.x, translate.y]);

  const handleMouseDownOnCanvas = useCallback((e: React.MouseEvent) => {
    // Only pan if clicking directly on the canvas background, not on a node or other element.
    if (e.target === editorAreaRef.current || e.target === canvasContentRef.current) {
      setIsPanning(true);
      setPanStartPoint({ x: e.clientX - translate.x, y: e.clientY - translate.y });
      if (editorAreaRef.current) editorAreaRef.current.style.cursor = 'grabbing';
    }
  }, [translate.x, translate.y]);
  
  const handleMouseMoveOnCanvas = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setTranslate({ x: e.clientX - panStartPoint.x, y: e.clientY - panStartPoint.y });
    }
  }, [isPanning, panStartPoint.x, panStartPoint.y]);

  const handleMouseUpOnCanvas = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      if (editorAreaRef.current) editorAreaRef.current.style.cursor = 'grab';
    }
  }, [isPanning]);

  useEffect(() => {
    const editorElement = editorAreaRef.current;
    if (isPanning && editorElement) {
      document.addEventListener('mousemove', handleMouseMoveOnCanvas as any);
      document.addEventListener('mouseup', handleMouseUpOnCanvas as any);
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveOnCanvas as any);
        document.removeEventListener('mouseup', handleMouseUpOnCanvas as any);
        if (editorElement) editorElement.style.cursor = 'grab';
      };
    } else if (editorElement) {
        editorElement.style.cursor = 'grab';
    }
  }, [isPanning, handleMouseMoveOnCanvas, handleMouseUpOnCanvas]);


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
  }, [scale]);

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
  }, [scale]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);


  const handleRunWorkflow = async () => {
    if (!currentProject) return;
    try {
      await executeWorkflowFromHook();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes("gemini api error: api key issue")) {
            openLlmErrorModal(
                <>
                    <strong>Gemini API Key Error:</strong> The API key may be missing, invalid, or lacks permissions.
                    Please check your Gemini API Key in "Application Settings".
                    <p className="text-xs mt-2">Original error: {errorMessage.replace("Gemini API Error: API key issue. ", "")}</p>
                </>
            );
        } else if (errorMessage.toLowerCase().includes("ollama")) {
             openLlmErrorModal(
                <>
                    <strong>Ollama Error:</strong> {errorMessage.replace("Ollama API Error:", "").replace("Ollama Network Error:", "")}
                    <p className="text-xs mt-2">Please check your Ollama server status and settings in "App Settings".</p>
                </>
            );
        } else {
            openLlmErrorModal(`An unexpected LLM error occurred: ${errorMessage}`);
        }
    }
  };
  
  const handleSaveProjectSettingsAndCloseModal = (settings: Pick<Project, 'name' | 'description' | 'author'>) => {
    if (!currentProject) return;
    const updatedProject = { ...currentProject, ...settings };
    saveProjectState(updatedProject); 
    closeProjectSettingsModal();
  };


  if (isLoading) {
    return <div className="p-4 text-center text-slate-300 h-screen flex flex-col justify-center items-center bg-slate-900">Loading project...</div>;
  }

  if (!currentProject) {
    return <div className="p-4 text-center text-slate-300 h-screen flex flex-col justify-center items-center bg-slate-900">Project not found. <RouterLink to="/" className="text-sky-400 hover:text-sky-300 mt-2">Go Home</RouterLink></div>;
  }

  const getNodeById = (id: string): Node | undefined => validNodesOnCanvas.find(n => n.id === id);

  return (
    <div className="flex h-screen flex-col">
      <Header
        onRunProject={handleRunWorkflow}
        onStopProject={handleStopWorkflow}
        currentProjectName={currentProject.name}
        isWorkflowRunning={isWorkflowRunning}
      />
      <div className="flex flex-1 overflow-hidden pb-12"> {/* pb-12 for ExecutionStatusPanel */}
        <aside className="w-60 sm:w-64 bg-slate-800 p-3 sm:p-4 space-y-3 overflow-y-auto custom-scroll shadow-lg flex flex-col">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Node Tools</h3>
            <button onClick={() => handleAddNode(NodeType.PROMPT)} className="w-full rounded bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700">Add Prompt Node</button>
            <button onClick={() => handleAddNode(NodeType.CONDITIONAL)} className="w-full rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 mt-2">Add Conditional Node</button>
            <button onClick={() => handleAddNode(NodeType.VARIABLE)} className="w-full rounded bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 mt-2">Add Variable Node</button>
            <button onClick={() => handleAddNode(NodeType.CONCLUSION)} className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 mt-2">Add Conclusion Node</button>

            <hr className="border-slate-700 my-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Project Actions</h3>
            <button onClick={openProjectSettingsModal} className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">Project Settings</button>
            <button onClick={openRunHistoryModal} className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 mt-2">View Run History ({currentProject.runHistory.length})</button>
          </div>

          <div className="mt-auto pt-4 space-y-2">
            <button
              onClick={() => handleRequestCloseProject(isWorkflowRunning)}
              disabled={isWorkflowRunning}
              className="w-full rounded bg-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-500 flex items-center justify-center disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
              <i className="fas fa-times-circle mr-2"></i>Close Project
            </button>
            <button
              onClick={openHelpModal}
              className="w-full rounded bg-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-500 flex items-center justify-center"
            >
              <i className="fas fa-question-circle mr-2"></i>Help
            </button>
          </div>
        </aside>

        <main 
            ref={editorAreaRef} 
            className="flex-1 bg-slate-850 p-0 relative overflow-hidden custom-scroll" /* p-0 to let content fill */
            style={{ 
                backgroundImage: `radial-gradient(${getComputedStyle(document.documentElement).getPropertyValue('--tw-colors-slate-700') || '#374151'} 1px, transparent 1px)`, 
                backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
                cursor: 'grab' // Default cursor for panning
            }}
            onWheel={handleWheelOnCanvas}
            onMouseDown={handleMouseDownOnCanvas} // Pan initiated here
            // onMouseMove and onMouseUp are global if isPanning is true for better UX
        >
          <div 
            ref={canvasContentRef}
            className="absolute top-0 left-0" // Content starts at origin
            style={{ 
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transformOrigin: '0 0', // Crucial for zooming towards top-left
                // width: '100%', height: '100%' // Not needed, let content define size
            }}
          >
            {validNodesOnCanvas.map(node => {
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
                return (
                <div
                key={node.id}
                className={`node-${node.id} absolute rounded-lg shadow-xl p-3 border-2 ${finalNodeClass} transition-all duration-150 cursor-grab flex flex-col justify-between items-center`}
                style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                title={node.type === NodeType.CONCLUSION ? node.lastRunOutput || 'Conclusion node displays output here.' : (node.type === NodeType.VARIABLE ? `Variable: ${node.name}. Value: ${node.lastRunOutput || '(not set)'}` : node.prompt || 'Node has no prompt yet.')}
                >
                <div className="w-full">
                    <div className="flex justify-between items-start w-full">
                    <h4 className="font-bold text-sm text-white mb-1 truncate max-w-[calc(100%-20px)]">{node.name || `(${node.type.toLowerCase()} node)`}</h4>
                    {node.type !== NodeType.START &&
                        <button
                            onClick={(e) => handleDeleteNodeRequest(node.id, e)}
                            className="node-delete-button text-red-300 hover:text-red-100 text-xs p-0.5 rounded-full hover:bg-red-500/50 absolute top-1 right-1 z-10"
                            aria-label={`Delete node ${node.name || node.type}`}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    }
                    </div>
                    {node.type === NodeType.CONCLUSION ? (
                        <div className="text-xs text-slate-200 mb-1 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                            <p className="font-semibold italic">{node.prompt || INITIAL_CONCLUSION_NODE_TITLE}</p>
                            {node.lastRunOutput ?
                                <p className="mt-1 text-green-300">{node.lastRunOutput}</p> :
                                <p className="mt-1 text-slate-400">(Awaiting output)</p>
                            }
                        </div>
                    ) : node.type === NodeType.VARIABLE ? (
                        <div className="text-xs text-slate-200 mb-1 h-14 overflow-y-auto custom-scroll w-full text-center px-1">
                            <p className="font-semibold italic">Stores as: {'{'+node.name+'}'}</p>
                            {node.lastRunOutput ?
                                <p className="mt-1 text-green-300">Last Value: {node.lastRunOutput}</p> :
                                <p className="mt-1 text-slate-400">(No value captured yet)</p>
                            }
                        </div>
                    ) : (
                        <p className="text-xs text-slate-200 mb-1 h-10 overflow-y-auto custom-scroll line-clamp-3 w-full text-center px-1">{node.prompt || '(No prompt configured)'}</p>
                    )}
                </div>
                {(node.type !== NodeType.CONCLUSION && node.type !== NodeType.VARIABLE) && node.lastRunOutput && (
                    <div className="mt-auto pt-1 border-t border-slate-500/50 w-full overflow-hidden">
                        <p className={`text-xs ${node.hasError ? 'text-red-300' : 'text-green-300'} truncate text-center`}>Last Out: {node.lastRunOutput}</p>
                    </div>
                )}
                </div>
            );})}

            <svg 
                className="absolute top-0 left-0 pointer-events-none" 
                // The SVG needs to be large enough to contain all links.
                // Since its parent (canvasContentRef) is transformed, its 100% width/height 
                // might not cover the entire "world" if nodes are panned far.
                // A very large fixed size or dynamically calculated size would be more robust.
                // For now, assume nodes don't go extremely far, or links might get clipped.
                // The 'absolute top-0 left-0' ensures its coordinate system aligns with canvasContentRef.
                style={{ width: '10000px', height: '10000px' }} // Example large size
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
                const normalX = -dy * curveFactor; // Perpendicular vector component
                const normalY = dx * curveFactor;  // Perpendicular vector component
                
                // Adjust control point slightly if it's a self-referencing loop (source === target, less likely with current logic but for robustness)
                // or if it's a direct back-link between two nodes, make the curve more pronounced.
                // This simple curvature is for general links. More complex routing might be needed for very dense graphs.
                let cpX = midX + normalX;
                let cpY = midY + normalY;
                
                // Add a slight offset if the start and end points are too close or perfectly aligned, to ensure visibility of the curve
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { // Points are virtually identical
                   cpX += 20; cpY += 20; // Add arbitrary offset for tiny/overlapping nodes
                }


                const path = `M ${startPoint.x},${startPoint.y} Q ${cpX},${cpY} ${endPoint.x},${endPoint.y}`;

                // Calculate midpoint for text label
                // For a quadratic Bezier, the point at t=0.5 is:
                // B(0.5) = (1-0.5)^2 P0 + 2(1-0.5)0.5 P1 + 0.5^2 P2
                // B(0.5) = 0.25 P0 + 0.5 P1 + 0.25 P2
                const labelX = 0.25 * startPoint.x + 0.5 * cpX + 0.25 * endPoint.x;
                const labelY = 0.25 * startPoint.y + 0.5 * cpY + 0.25 * endPoint.y;


                return (
                    <g key={link.id}>
                    <path d={path} stroke="#0EA5E9" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                    {link.condition && (
                        <text 
                            x={labelX} 
                            y={labelY - 5} // Adjusted y for better positioning above the line
                            fill="#94A3B8" 
                            fontSize="10px" 
                            textAnchor="middle" 
                            className="pointer-events-auto"
                            // Background for text, SVG doesn't directly support bg. Could use a rect under text.
                            // Or rely on parent background if text is sparse.
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
            scale={scale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetZoom}
            minScale={MIN_SCALE}
            maxScale={MAX_SCALE}
          />
        </main>
      </div>

      <ExecutionStatusPanel
        logs={executionLogs}
        currentExecutingNodeId={currentExecutingNodeId}
        nodes={validNodesOnCanvas}
        runStartTime={runStartTime}
        runEndTime={runEndTime}
        totalTokensThisRun={totalTokensThisRun}
        isOpen={isExecutionPanelOpen}
        onToggle={() => setIsExecutionPanelOpen(prev => !prev)}
        currentProjectName={currentProject.name}
      />

      <NodeEditModal node={selectedNodeState} isOpen={isNodeModalOpen} onClose={() => { setIsNodeModalOpen(false); setSelectedNodeState(null); }} onSave={handleSaveNode} allNodes={validNodesOnCanvas} />
      <ProjectSettingsModal project={currentProject} isOpen={isProjectSettingsModalOpen} onClose={closeProjectSettingsModal} onSave={handleSaveProjectSettingsAndCloseModal} />
      <RunHistoryModal runHistory={currentProject.runHistory} isOpen={isRunHistoryModalOpen} onClose={closeRunHistoryModal} />
      <HelpModal isOpen={isHelpModalOpen} onClose={closeHelpModal} />

      <ConfirmationModal
        isOpen={deleteNodeConfirm.isOpen}
        onClose={() => {
          setDeleteNodeConfirm({ isOpen: false, nodeId: null, nodeName: null });
          setDeleteActionInitiated(false);
        }}
        onConfirm={() => {
            confirmDeleteNode(); 
        }}
        title="Confirm Delete Node"
        message={<>Are you sure you want to delete node "<strong>{deleteNodeConfirm.nodeName || 'this node'}</strong>"? This cannot be undone.</>}
        confirmText="Delete"
      />
       <ConfirmationModal
        isOpen={isLlmErrorModalOpen}
        onClose={closeLlmErrorModal}
        onConfirm={closeLlmErrorModal}
        title="LLM Configuration / API Error"
        message={llmErrorMessage}
        confirmText="OK"
        confirmButtonClass="bg-sky-600 hover:bg-sky-700"
      />
      <UnsavedChangesModal
        isOpen={isUnsavedChangesModalOpen}
        onClose={() => setIsUnsavedChangesModalOpen(false)}
        onSaveAndClose={handleSaveAndClose}
        onCloseWithoutSaving={handleCloseWithoutSaving}
      />
    </div>
  );
};

export default ProjectEditorPage;
