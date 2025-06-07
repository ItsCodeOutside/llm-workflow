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
import Sidebar from '../components/editor/Sidebar'; // New
import CanvasArea from '../components/editor/CanvasArea'; // New
import QuestionInputModal from '../components/QuestionInputModal'; // New


import { 
    useProjects,
    useProjectStateManagement,
    useNodeManagement,
    useNodeDragging,
    useWorkflowExecution,
    useEditorModals,
    useVisualLinks,
    useCanvasPanZoom // New
} from '../hooks'; 

import { getValidNodes } from '../utils';
import { type Project, type Node, NodeType, QuestionInputModalProps } from '../../types';


const ProjectEditorPage: React.FC = () => {
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // Modal States
  const {
    isProjectSettingsModalOpen, openProjectSettingsModal, closeProjectSettingsModal,
    isRunHistoryModalOpen, openRunHistoryModal, closeRunHistoryModal,
    isHelpModalOpen, openHelpModal, closeHelpModal,
    isLlmErrorModalOpen, llmErrorMessage, openLlmErrorModal, closeLlmErrorModal
  } = useEditorModals();

  // Canvas Pan and Zoom
   const {
    scale,
    translate,
    handleWheelOnCanvas,
    handleMouseDownOnCanvas, 
    zoomIn,
    zoomOut,
    resetZoom,
    MIN_SCALE, 
    MAX_SCALE  
  } = useCanvasPanZoom({ editorAreaRef });

  // Question Input Modal State
  const [questionInputModalData, setQuestionInputModalData] = useState<Omit<QuestionInputModalProps, 'isOpen'> & { resolve: (answer: string) => void; reject: (reason?: any) => void } | null>(null);


  const requestUserInputCallback = useCallback((question: string, nodeId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setQuestionInputModalData({
        questionText: question,
        onSubmit: (answer) => {
          setQuestionInputModalData(null);
          resolve(answer);
        },
        onEndRun: () => {
          setQuestionInputModalData(null);
          reject(new Error("User ended the run."));
        },
        resolve, 
        reject
      });
    });
  }, []);

  // Node Management
  const {
    selectedNodeState, setSelectedNodeState,
    isNodeModalOpen, setIsNodeModalOpen,
    deleteNodeConfirm, setDeleteNodeConfirm,
    deleteActionInitiated, setDeleteActionInitiated, 
    handleAddNode,
    handleSaveNode,
    confirmDeleteNode,
    handleDeleteNodeRequest,
  } = useNodeManagement({ 
      currentProject, 
      setCurrentProject, 
      saveProjectState, 
      editorAreaRef, 
      scale, 
      translate 
    });

  // Node Dragging Logic
  const { handleNodeMouseDown } = useNodeDragging({ 
    currentProject,
    setCurrentProject,
    editorAreaRef,
    setSelectedNodeState,
    setIsNodeModalOpen,
    deleteActionInitiated,
    setDeleteActionInitiated,
    scale,
    translate,
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
  } = useWorkflowExecution({ currentProject, saveProjectState, setCurrentProject, hasUnsavedChanges, requestUserInput: requestUserInputCallback });


  // Visual Links
  const validNodesOnCanvas = useMemo(() => getValidNodes(currentProject?.nodes), [currentProject?.nodes]);
  const { visualLinks, getLineToRectangleIntersectionPoint } = useVisualLinks(validNodesOnCanvas);


  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);


  const handleRunWorkflow = async () => {
    if (!currentProject) return;
    try {
      await executeWorkflowFromHook();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("User ended the run")) {
        console.info("Workflow execution was ended by the user.");
      } else if (errorMessage.toLowerCase().includes("chatgpt api error: api key")) {
            openLlmErrorModal(
                <>
                    <strong>ChatGPT API Error:</strong> The API key may be missing, invalid, or not authorized.
                    Please ensure your ChatGPT API Key is correctly configured in "Application Settings".
                    <p className="text-xs mt-2">Original error: {errorMessage.replace("ChatGPT API Error: API key is invalid or not authorized. ", "").replace("ChatGPT API Error: API key is not set. ", "")}</p>
                </>
            );
        } else if (errorMessage.toLowerCase().includes("chatgpt api error")) {
            openLlmErrorModal(
                <>
                    <strong>ChatGPT API Error:</strong> {errorMessage.replace("ChatGPT API Error: ", "")}
                    <p className="text-xs mt-2">Please check your OpenAI account status or try again later.</p>
                </>
            );
        } else if (errorMessage.toLowerCase().includes("ollama")) {
             openLlmErrorModal(
                <>
                    <strong>Ollama Error:</strong> {errorMessage.replace("Ollama API Error:", "").replace("Ollama Network Error:", "")}
                    <p className="text-xs mt-2">Please check your Ollama server status and settings in "App Settings".</p>
                </>
            );
        } 
        // Removed Gemini specific error handling block
        else {
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

  return (
    <div className="flex h-screen flex-col">
      <Header
        onRunProject={handleRunWorkflow}
        onStopProject={handleStopWorkflow}
        currentProjectName={currentProject.name}
        isWorkflowRunning={isWorkflowRunning}
      />
      <div className="flex flex-1 overflow-hidden pb-12"> {/* pb-12 for ExecutionStatusPanel */}
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          onAddNode={handleAddNode}
          onOpenProjectSettingsModal={openProjectSettingsModal}
          onOpenRunHistoryModal={openRunHistoryModal}
          projectRunHistoryCount={currentProject.runHistory.length}
          onCloseProject={() => handleRequestCloseProject(isWorkflowRunning)}
          isWorkflowRunning={isWorkflowRunning}
          onOpenHelpModal={openHelpModal}
        />
        <CanvasArea
          nodes={validNodesOnCanvas}
          visualLinks={visualLinks}
          getLineToRectangleIntersectionPoint={getLineToRectangleIntersectionPoint}
          scale={scale}
          translate={translate}
          editorAreaRef={editorAreaRef}
          canvasContentRef={canvasContentRef}
          onNodeMouseDown={handleNodeMouseDown} 
          onWheel={handleWheelOnCanvas} 
          onCanvasMouseDown={handleMouseDownOnCanvas} 
          zoomControls={{
            scale,
            onZoomIn: zoomIn,
            onZoomOut: zoomOut,
            onReset: resetZoom,
            minScale: MIN_SCALE,
            maxScale: MAX_SCALE,
          }}
          handleDeleteNodeRequest={handleDeleteNodeRequest} // <-- Add this line
        />
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
      {questionInputModalData && (
        <QuestionInputModal
          isOpen={true}
          questionText={questionInputModalData.questionText}
          onSubmit={questionInputModalData.onSubmit}
          onEndRun={questionInputModalData.onEndRun}
        />
      )}

      <ConfirmationModal
        isOpen={deleteNodeConfirm.isOpen}
        onClose={() => {
          setDeleteNodeConfirm({ isOpen: false, nodeId: null, nodeName: null });
          setDeleteActionInitiated(false);
        }}
        onConfirm={confirmDeleteNode}
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
