// src/pages/HomePage.tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useProjects, useAppSettings } from '../hooks';
import Header from '../components/Header';
import ConfirmationModal from '../components/ConfirmationModal';
import ExportProjectModal from '../components/ExportProjectModal'; 
import ImportProjectModal from '../components/ImportProjectModal'; 
import ConclusionOutputModal from '../components/ConclusionOutputModal';
import { type Project, NodeType, type Node as WorkflowNode, type Link as VisualLink, type ProjectVariable, type ConclusionOutputModalData, type NodeExecutionLog, type WorkflowExecutionCallbacks, type RunStep, type ProjectRun, AppSettings } from '../types'; // Updated path
import { generateId, deepClone, getValidNodes, sanitizeVariableName, projectHasQuestionNodes } from '../utils';
import { INITIAL_START_NODE_PROMPT, MAX_RUN_HISTORY, NODE_HEIGHT } from '../constants'; // Updated path
import { executeWorkflow, ExecuteWorkflowResult } from '../utils/workflowExecutorService';


const HomePage: React.FC = () => {
  const { projects, addProject, deleteProject, getProjectById, updateProject } = useProjects();
  const { appSettings } = useAppSettings(); 
  const navigate = useNavigate();
  
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<{ isOpen: boolean; projectId: string | null; projectName: string | null }>({ isOpen: false, projectId: null, projectName: null });
  const [exportModalState, setExportModalState] = useState<{ isOpen: boolean; projectJson: string; projectName: string }>({ isOpen: false, projectJson: '', projectName: '' });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [runningProjectInfo, setRunningProjectInfo] = useState<{
    id: string;
    name: string;
    statusText: string;
    elapsedTime: number;
    intervalId: number | null;
    stopRequested: boolean;
  } | null>(null);
  const [conclusionModalData, setConclusionModalData] = useState<ConclusionOutputModalData | null>(null);
  const [isConclusionModalOpen, setIsConclusionModalOpen] = useState(false);
  const [homePageRunError, setHomePageRunError] = useState<string | null>(null);
  const runStopRequestedRef = React.useRef(false);
  const activeExecutionCountRef = React.useRef(0);
  const parallelPathCounterRef = React.useRef(0);


  const handleCreateProject = () => {
    const startNodeId = generateId();
    const initialNodeYPosition = 250; 

    const newProject: Project = {
      id: generateId(),
      name: 'New Project', 
      description: 'A new LLM workflow project.',
      author: 'User',
      nodes: [{ 
        id: startNodeId, 
        type: NodeType.START, 
        name: 'Start Here', 
        prompt: INITIAL_START_NODE_PROMPT, 
        position: { x: 50, y: initialNodeYPosition }, 
        nextNodeId: null 
      }],
      links: [],
      runHistory: [],
      projectVariables: [], 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addProject(newProject);
    navigate(`/project/${newProject.id}`);
  };

  const confirmDeleteProject = () => {
    if (deleteProjectConfirm.projectId) {
      deleteProject(deleteProjectConfirm.projectId);
    }
    setDeleteProjectConfirm({ isOpen: false, projectId: null, projectName: null });
  };

  const handleOpenExportModal = (project: Project) => {
    const projectToExport = deepClone(project);
    projectToExport.runHistory = [];
    projectToExport.nodes = projectToExport.nodes.map(node => {
      const { lastRunOutput, isRunning, hasError, ...nodeWithoutRuntimeState } = node;
      return nodeWithoutRuntimeState;
    });
    setExportModalState({ 
      isOpen: true, 
      projectJson: JSON.stringify(projectToExport, null, 2), 
      projectName: project.name 
    });
  };
  
  const handleImportProject = useCallback((jsonString: string) => {
    setImportError(null);
    try {
      const parsedProject = JSON.parse(jsonString) as Partial<Project>;
      if (!parsedProject || typeof parsedProject !== 'object' || !parsedProject.name || !Array.isArray(parsedProject.nodes)) {
        throw new Error("Invalid project structure. Ensure it's a valid project JSON with name and nodes array.");
      }
      
      const newProject = deepClone(parsedProject) as Project; 
      newProject.id = generateId();
      const nodeIdMap: { [oldId: string]: string } = {};
      
      newProject.nodes = getValidNodes(newProject.nodes).map((node: WorkflowNode) => {
        const oldNodeId = node.id;
        const newNodeId = generateId();
        nodeIdMap[oldNodeId] = newNodeId;
        node.id = newNodeId;
        delete node.lastRunOutput; delete node.isRunning; delete node.hasError;
        if (node.type === NodeType.VARIABLE) node.name = sanitizeVariableName(node.name || `var_${newNodeId.substring(0,4)}`); 
        if (node.branches && Array.isArray(node.branches)) node.branches = node.branches.map(branch => ({ ...branch, id: generateId() }));
        return node;
      });

      newProject.nodes = newProject.nodes.map((node: WorkflowNode) => {
        if (node.nextNodeId && nodeIdMap[node.nextNodeId]) node.nextNodeId = nodeIdMap[node.nextNodeId];
        else if (node.nextNodeId) node.nextNodeId = null;
        if (node.branches && Array.isArray(node.branches)) {
          node.branches = node.branches.map(branch => {
            if (branch.nextNodeId && nodeIdMap[branch.nextNodeId]) return { ...branch, nextNodeId: nodeIdMap[branch.nextNodeId] };
            else if (branch.nextNodeId) return { ...branch, nextNodeId: null }; 
            return branch;
          });
        }
        if (node.parallelNextNodeIds && Array.isArray(node.parallelNextNodeIds)) {
            node.parallelNextNodeIds = node.parallelNextNodeIds.map(id => nodeIdMap[id] || null).filter(id => id !== null) as string[];
        }
        return node;
      });
      
      if (Array.isArray(newProject.links)) {
        newProject.links = newProject.links.map((link: VisualLink) => ({
            id: generateId(), 
            sourceId: nodeIdMap[link.sourceId] || link.sourceId, 
            targetId: nodeIdMap[link.targetId] || link.targetId, 
            condition: link.condition
        })).filter(link => nodeIdMap[link.sourceId] && nodeIdMap[link.targetId]); 
      } else newProject.links = [];

      if (Array.isArray(newProject.projectVariables)) {
        newProject.projectVariables = newProject.projectVariables.map((pv: ProjectVariable, index: number) => ({
          id: generateId(), name: sanitizeVariableName(pv.name || `proj_var_${index}`), value: pv.value || '', 
        })).filter(pv => pv.name.trim() !== ''); 
      } else newProject.projectVariables = [];

      newProject.runHistory = []; 
      const now = new Date().toISOString();
      newProject.createdAt = now; newProject.updatedAt = now;
      newProject.name = newProject.name || "Imported Project";
      newProject.description = newProject.description || "Imported workflow.";
      newProject.author = newProject.author || "User";

      addProject(newProject);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error("Import failed:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import project. Ensure JSON is valid.");
    }
  }, [addProject]);


  const handleRunProjectFromHome = async (projectToRun: Project) => {
    if (runningProjectInfo) return; 

    runStopRequestedRef.current = false;
    activeExecutionCountRef.current = 0;
    parallelPathCounterRef.current = 0; 
    setHomePageRunError(null);
    const projectCloneForRun = deepClone(projectToRun);


    const intervalId = window.setInterval(() => {
      setRunningProjectInfo(prev => prev ? { ...prev, elapsedTime: prev.elapsedTime + 1 } : null);
    }, 1000);

    setRunningProjectInfo({
      id: projectToRun.id,
      name: projectToRun.name,
      statusText: "Initializing...",
      elapsedTime: 0,
      intervalId,
      stopRequested: false,
    });

    const callbacks: WorkflowExecutionCallbacks = {
      onLogEntry: (log) => {
        if (log.status === 'running') {
          setRunningProjectInfo(prev => prev ? { ...prev, statusText: `Processing: ${log.nodeName}...` } : null);
        }
      },
      onNodeStatusUpdate: (nodeId, updates) => {
        const nodeInClone = projectCloneForRun.nodes.find(n => n.id === nodeId);
        if (nodeInClone) {
          if (updates.isRunning !== undefined) nodeInClone.isRunning = updates.isRunning;
          if (updates.hasError !== undefined) nodeInClone.hasError = updates.hasError;
          if (updates.lastRunOutput !== undefined) nodeInClone.lastRunOutput = updates.lastRunOutput;
        }
      },
      onConclusion: (data) => {
        setConclusionModalData(data);
        setIsConclusionModalOpen(true);
      },
      onRequestUserInput: (questionText, nodeId) => {
        setHomePageRunError(`Project "${projectToRun.name}" requires user input, which is not supported for runs started from the home page. Please open the project to run it.`);
        runStopRequestedRef.current = true; 
        return Promise.reject(new Error("User input required, not supported in this mode."));
      },
      onTokenUpdate: (tokensUsedThisStep) => {
        // Tokens are accumulated by the service now.
      },
      getActiveExecutionCount: () => activeExecutionCountRef.current,
      incrementActiveExecutionCount: () => { activeExecutionCountRef.current++; },
      decrementActiveExecutionCount: () => { activeExecutionCountRef.current = Math.max(0, activeExecutionCountRef.current - 1); },
      getParallelPathCounter: () => parallelPathCounterRef.current,
      incrementParallelPathCounter: (count: number) => { parallelPathCounterRef.current += count; },
      decrementParallelPathCounter: () => { parallelPathCounterRef.current = Math.max(0, parallelPathCounterRef.current - 1); },
      isStopRequested: () => runStopRequestedRef.current,
    };

    let result: ExecuteWorkflowResult | null = null;
    try {
      result = await executeWorkflow(projectCloneForRun, appSettings, callbacks); 
    } catch (e) { 
        const errorMsg = e instanceof Error ? e.message : "Unknown error during workflow execution.";
        result = { status: 'failed', error: errorMsg, steps: [], totalTokensUsed: 0, updatedNodes: projectCloneForRun.nodes };
    }


    if (runningProjectInfo?.intervalId) { 
      clearInterval(runningProjectInfo.intervalId);
    }
    setRunningProjectInfo(prev => {
        if (prev && prev.intervalId) clearInterval(prev.intervalId);
        return null; 
    });


    if (result) {
        const originalProject = getProjectById(projectToRun.id);
        if (originalProject) {
            const runEntry: ProjectRun = {
                id: generateId(),
                timestamp: new Date().toISOString(), 
                status: result.status,
                steps: result.steps,
                finalOutput: result.finalOutput,
                error: result.error || homePageRunError, 
                totalTokensUsed: result.totalTokensUsed,
                durationMs: runningProjectInfo?.elapsedTime ? runningProjectInfo.elapsedTime * 1000 : 0, 
            };
            const updatedHistory = [...(originalProject.runHistory || []), runEntry].slice(-MAX_RUN_HISTORY);
            
            const finalNodes = originalProject.nodes.map(origNode => {
                const updatedNode = result!.updatedNodes.find(un => un.id === origNode.id);
                return updatedNode ? { ...origNode, lastRunOutput: updatedNode.lastRunOutput, isRunning: false, hasError: updatedNode.hasError } : origNode;
            });

            updateProject({ ...originalProject, nodes: finalNodes, runHistory: updatedHistory, updatedAt: new Date().toISOString() });
        }
        if (result.status === 'failed' && (result.error || homePageRunError) ) {
             setHomePageRunError(prevError => prevError || result?.error || "Workflow failed.");
             setTimeout(() => setHomePageRunError(null), 7000); 
        }
    }
  };
  
  const handleStopRunFromHome = () => {
      if (runningProjectInfo) {
          runStopRequestedRef.current = true;
          setRunningProjectInfo(prev => prev ? {...prev, statusText: "Stopping...", stopRequested: true} : null);
      }
  };

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  return (
    <div className="container mx-auto p-4 sm:p-8">
      <Header />
      <div className="my-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-semibold text-slate-100 text-center sm:text-left">My Projects</h1>
        <div className="flex flex-col sm:flex-row gap-3">
            <button
            onClick={handleCreateProject}
            className="rounded-md bg-sky-600 px-6 py-3 text-white hover:bg-sky-700 text-lg font-medium flex items-center justify-center"
            >
            <i className="fas fa-plus mr-2"></i>Create New Project
            </button>
            <button
            onClick={() => { setIsImportModalOpen(true); setImportError(null); }}
            className="rounded-md bg-teal-600 px-6 py-3 text-white hover:bg-teal-700 text-lg font-medium flex items-center justify-center"
            >
            <i className="fas fa-upload mr-2"></i>Import Project
            </button>
        </div>
      </div>
      {projects.length === 0 ? (
        <p className="text-center text-slate-400 text-xl mt-10">No projects yet. Create one to get started!</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => {
            const hasQuestions = projectHasQuestionNodes(project);
            const isThisProjectRunning = runningProjectInfo?.id === project.id;
            const isAnyProjectRunning = !!runningProjectInfo;

            return (
              <div key={project.id} className={`rounded-xl bg-slate-800 p-6 shadow-lg hover:shadow-sky-500/30 transition-all duration-300 flex flex-col justify-between relative ${isThisProjectRunning ? 'ring-2 ring-sky-500' : ''}`}>
                {isThisProjectRunning && (
                  <div className="absolute inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm rounded-xl z-10 flex flex-col items-center justify-center p-4">
                    <div className="text-center">
                      <i className="fas fa-spinner fa-spin fa-2x text-sky-400 mb-3"></i>
                      <p className="text-lg font-semibold text-sky-300">Running: {runningProjectInfo.name}</p>
                      <p className="text-sm text-slate-300 truncate max-w-xs">{runningProjectInfo.statusText}</p>
                      <p className="text-2xl font-mono text-slate-100 mt-2">{formatTime(runningProjectInfo.elapsedTime)}</p>
                       <button
                        onClick={handleStopRunFromHome}
                        disabled={runningProjectInfo.stopRequested}
                        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:bg-red-800 disabled:text-slate-400"
                      >
                        {runningProjectInfo.stopRequested ? 'Stopping...' : 'Stop Run'}
                      </button>
                    </div>
                  </div>
                )}
                <div className={`${isThisProjectRunning ? 'opacity-30' : ''}`}>
                  <h2 className="text-2xl font-semibold text-sky-400 mb-2 truncate">{project.name}</h2>
                  <p className="text-slate-400 mb-1 text-sm">Author: {project.author}</p>
                  <p className="text-slate-300 mb-4 line-clamp-3 h-16">{project.description}</p>
                  {project.projectVariables && project.projectVariables.length > 0 && (
                    <p className="text-xs text-slate-500 mb-1">Project Variables: {project.projectVariables.length}</p>
                  )}
                   {homePageRunError && project.id === runningProjectInfo?.id && ( 
                    <p className="text-xs text-red-400 mt-1 mb-2 animate-pulse">{homePageRunError}</p>
                  )}
                </div>
                <div className={`mt-auto ${isThisProjectRunning ? 'opacity-30' : ''}`}>
                  <p className="text-xs text-slate-500 mb-3">Last updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleRunProjectFromHome(project)}
                      disabled={hasQuestions || isAnyProjectRunning}
                      title={hasQuestions ? "Run unavailable for projects with Question nodes" : (isAnyProjectRunning && !isThisProjectRunning ? "Another project is running" : `Run project ${project.name}`)}
                      className={`flex-1 rounded-md px-4 py-2 text-center text-white flex items-center justify-center ${
                        hasQuestions || (isAnyProjectRunning && !isThisProjectRunning)
                          ? 'bg-green-800 text-slate-400 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      aria-label={hasQuestions ? "Run disabled for this project" : `Run project ${project.name}`}
                    >
                      <i className="fas fa-play mr-2"></i>Run
                    </button>
                    <RouterLink
                      to={`/project/${project.id}`}
                      className={`flex-1 rounded-md bg-sky-600 px-4 py-2 text-center text-white hover:bg-sky-700 ${isAnyProjectRunning ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      onClick={(e) => { if (isAnyProjectRunning) e.preventDefault(); }}
                    >
                      Open
                    </RouterLink>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenExportModal(project);}}
                      disabled={isAnyProjectRunning}
                      className={`rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 ${isAnyProjectRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={`Export project ${project.name}`}
                    >
                      <i className="fas fa-download"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteProjectConfirm({ isOpen: true, projectId: project.id, projectName: project.name });}}
                      disabled={isAnyProjectRunning}
                      className={`rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 ${isAnyProjectRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={`Delete project ${project.name}`}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteProjectConfirm.isOpen}
        onClose={() => setDeleteProjectConfirm({ isOpen: false, projectId: null, projectName: null })}
        onConfirm={confirmDeleteProject}
        title="Confirm Delete Project"
        message={<>Are you sure you want to delete project "<strong>{deleteProjectConfirm.projectName}</strong>"? This cannot be undone.</>}
        confirmText="Delete"
      />
      <ExportProjectModal 
        isOpen={exportModalState.isOpen}
        onClose={() => setExportModalState({ isOpen: false, projectJson: '', projectName: '' })}
        projectJson={exportModalState.projectJson}
        projectName={exportModalState.projectName}
      />
      <ImportProjectModal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setImportError(null); }}
        onImport={handleImportProject}
        errorMessage={importError}
      />
      <ConclusionOutputModal
        isOpen={isConclusionModalOpen}
        data={conclusionModalData}
        onClose={() => { setIsConclusionModalOpen(false); setConclusionModalData(null); }}
      />
       {homePageRunError && !runningProjectInfo && ( 
            <ConfirmationModal
                isOpen={!!homePageRunError}
                onClose={() => setHomePageRunError(null)}
                onConfirm={() => setHomePageRunError(null)}
                title="Run Error"
                message={homePageRunError}
                confirmText="OK"
                confirmButtonClass="bg-sky-600 hover:bg-sky-700"
            />
        )}
    </div>
  );
};

export default HomePage;
