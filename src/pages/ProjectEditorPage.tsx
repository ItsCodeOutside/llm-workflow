
// src/pages/ProjectEditorPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import Header from '../components/Header';
import NodeEditModal from '../components/NodeEditModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import RunHistoryModal from '../components/RunHistoryModal';
import HelpModal from '../components/HelpModal';
import ConfirmationModal from '../components/ConfirmationModal';
import UnsavedChangesModal from '../components/UnsavedChangesModal'; 
import ExecutionStatusPanel from '../components/ExecutionStatusPanel';

import { useProjects, useAppSettings } from '../hooks';
import { executePrompt } from '../../geminiService';
import { deepClone, generateId } from '../utils';
import { 
    MAX_RUN_HISTORY, NODE_WIDTH, NODE_HEIGHT, GRID_CELL_SIZE, 
    NODE_COLORS, MAX_CLICK_MOVEMENT, INITIAL_NODE_NAME, INITIAL_NODE_PROMPT,
    INITIAL_START_NODE_PROMPT, INITIAL_CONCLUSION_NODE_TITLE, INITIAL_VARIABLE_NODE_NAME
} from '../../constants';
import { 
    type Project, type Node, NodeType, type ProjectRun, type RunStep, 
    type Link as VisualLink, type GeminiExecutePromptResponse, type NodeExecutionLog 
} from '../../types';


const ProjectEditorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProjectById, updateProject } = useProjects();
  const { appSettings } = useAppSettings();
  const navigate = useNavigate();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedNodeState, setSelectedNodeState] = useState<Node | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] = useState(false);
  const [isRunHistoryModalOpen, setIsRunHistoryModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const isStopRequestedRef = useRef(false);
  
  const [deleteNodeConfirm, setDeleteNodeConfirm] = useState<{ isOpen: boolean; nodeId: string | null; nodeName: string | null }>({ isOpen: false, nodeId: null, nodeName: null });
  const [apiKeyMissingModalOpen, setApiKeyMissingModalOpen] = useState(false);
  const [deleteActionInitiated, setDeleteActionInitiated] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);

  const [executionLogs, setExecutionLogs] = useState<NodeExecutionLog[]>([]);
  const [currentExecutingNodeId, setCurrentExecutingNodeId] = useState<string | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [runEndTime, setRunEndTime] = useState<number | null>(null);
  const [totalTokensThisRun, setTotalTokensThisRun] = useState<number>(0);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState<boolean>(false);

  const editorAreaRef = useRef<HTMLDivElement>(null);
  const [draggingNode, setDraggingNode] = useState<{ id: string, offset: { x: number, y: number } } | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isActuallyDraggingRef = useRef(false);
  
  const [visualLinks, setVisualLinks] = useState<VisualLink[]>([]);

  // Helper function to filter out null/undefined nodes
  const getValidNodes = (nodes: (Node | null | undefined)[] | undefined): Node[] => {
    return nodes?.filter((n): n is Node => n !== null && n !== undefined) || [];
  };

  useEffect(() => {
    if (!projectId) {
      navigate('/');
      return;
    }
    const project = getProjectById(projectId);
    if (project) {
      // Sanitize nodes when loading the project
      const sanitizedProject = {
        ...project,
        nodes: getValidNodes(project.nodes),
      };
      setCurrentProject(deepClone(sanitizedProject));
      setHasUnsavedChanges(false); 
    } else {
      console.warn(`Project with ID ${projectId} not found.`);
      navigate('/');
    }
  }, [projectId, getProjectById, navigate]); 

  useEffect(() => {
    if (currentProject) {
      const newVisualLinks: VisualLink[] = [];
      const validNodes = getValidNodes(currentProject.nodes); // Use validated nodes
      validNodes.forEach(sourceNode => {
        const processLink = (targetNodeId: string | null | undefined, condition?: string) => {
          if (targetNodeId) {
            const targetNode = validNodes.find(n => n.id === targetNodeId);
            if (targetNode) {
                 newVisualLinks.push({ id: `${sourceNode.id}-${targetNodeId}-${condition || 'direct'}`, sourceId: sourceNode.id, targetId: targetNodeId, condition });
            }
          }
        };

        if (sourceNode.type === NodeType.PROMPT || sourceNode.type === NodeType.START || sourceNode.type === NodeType.VARIABLE) {
          processLink(sourceNode.nextNodeId);
        } else if (sourceNode.type === NodeType.CONDITIONAL && sourceNode.branches) {
          sourceNode.branches.forEach(branch => {
            processLink(branch.nextNodeId, branch.condition);
          });
        }
      });
      setVisualLinks(newVisualLinks);
    }
  }, [currentProject]);

  const saveProjectState = useCallback((projectState: Project | null, skipSetCurrent: boolean = false) => {
      if (!projectState) return;
      const projectToSave = { 
          ...projectState, 
          nodes: getValidNodes(projectState.nodes), // Ensure nodes are valid before saving
          updatedAt: new Date().toISOString() 
      };
      updateProject(projectToSave); 
      if (!skipSetCurrent) {
        setCurrentProject(projectToSave); 
      }
      setHasUnsavedChanges(false); 
  }, [updateProject]);


  const handleAddNode = (type: NodeType) => {
    if (!currentProject) return;
    const editorWidth = editorAreaRef.current?.clientWidth || 800;
    const editorHeight = editorAreaRef.current?.clientHeight || 600;
    
    let nodeName = INITIAL_NODE_NAME;
    let nodePrompt = INITIAL_NODE_PROMPT;
    if (type === NodeType.START) nodePrompt = INITIAL_START_NODE_PROMPT;
    if (type === NodeType.CONCLUSION) nodePrompt = INITIAL_CONCLUSION_NODE_TITLE;
    if (type === NodeType.VARIABLE) {
        nodeName = INITIAL_VARIABLE_NODE_NAME;
        nodePrompt = ''; 
    }


    const newNode: Node = {
      id: generateId(),
      type,
      name: nodeName, 
      prompt: nodePrompt, 
      position: { 
        x: Math.max(0, Math.min(Math.random() * editorWidth * 0.7, editorWidth - NODE_WIDTH)), 
        y: Math.max(0, Math.min(Math.random() * editorHeight * 0.7, editorHeight - NODE_HEIGHT))
      },
      branches: type === NodeType.CONDITIONAL ? [{id: generateId(), condition: "default", nextNodeId: null}] : undefined,
      nextNodeId: (type === NodeType.PROMPT || type === NodeType.START || type === NodeType.VARIABLE) ? null : undefined,
    };
    const updatedProject = { ...currentProject, nodes: [...getValidNodes(currentProject.nodes), newNode] };
    setCurrentProject(updatedProject);
    setHasUnsavedChanges(true); 
  };

  const handleSaveNode = (updatedNode: Node) => {
    if (!currentProject) return;
    const validNodes = getValidNodes(currentProject.nodes);
    const newNodes = validNodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    const updatedProject = { ...currentProject, nodes: newNodes };
    saveProjectState(updatedProject); 
    setIsNodeModalOpen(false);
    setSelectedNodeState(null);
  };

  const handleSaveProjectSettings = (settings: Pick<Project, 'name' | 'description' | 'author'>) => {
    if (!currentProject) return;
    const updatedProject = { ...currentProject, ...settings };
    saveProjectState(updatedProject); 
    setIsProjectSettingsModalOpen(false);
  };
  
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (deleteActionInitiated) return;
    if (!currentProject || !editorAreaRef.current) return;
    const node = getValidNodes(currentProject.nodes).find(n => n.id === nodeId);
    if (!node) return;

    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isActuallyDraggingRef.current = false;

    const editorRect = editorAreaRef.current.getBoundingClientRect();
    const offsetX = e.clientX - editorRect.left - node.position.x;
    const offsetY = e.clientY - editorRect.top - node.position.y;
    
    setDraggingNode({ id: nodeId, offset: { x: offsetX, y: offsetY } });
    (e.currentTarget as HTMLElement).classList.add('dragging');
    e.preventDefault();
  };

  const handleNodeDrag = useCallback((e: MouseEvent) => {
    if (!draggingNode || !currentProject || !editorAreaRef.current) return;

    if (!isActuallyDraggingRef.current && dragStartPosRef.current) {
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > MAX_CLICK_MOVEMENT) {
            isActuallyDraggingRef.current = true;
        }
    }
    
    if (isActuallyDraggingRef.current) { 
        const editorRect = editorAreaRef.current.getBoundingClientRect();
        let newX = e.clientX - editorRect.left - draggingNode.offset.x;
        let newY = e.clientY - editorRect.top - draggingNode.offset.y;

        newX = Math.round(newX / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        newY = Math.round(newY / GRID_CELL_SIZE) * GRID_CELL_SIZE;

        newX = Math.max(0, Math.min(newX, editorRect.width - NODE_WIDTH));
        newY = Math.max(0, Math.min(newY, editorRect.height - NODE_HEIGHT));

        setCurrentProject(prev => {
          if (!prev) return null;
          const validPrevNodes = getValidNodes(prev.nodes);
          const originalNode = validPrevNodes.find(n => n.id === draggingNode.id);
          if (originalNode && (originalNode.position.x !== newX || originalNode.position.y !== newY)) {
            setHasUnsavedChanges(true); 
          }
          const updatedNodes = validPrevNodes.map(n => 
            n.id === draggingNode.id ? { ...n, position: { x: newX, y: newY } } : n
          );
          return { ...prev, nodes: updatedNodes };
        });
    }
  }, [draggingNode, currentProject]); 

  const handleNodeDragEnd = useCallback(() => {
    if (!draggingNode || !currentProject) return;

    const nodeElement = document.querySelector(`.node-${draggingNode.id}`);
    if(nodeElement) nodeElement.classList.remove('dragging');
    
    if (deleteActionInitiated) {
        setDeleteActionInitiated(false); 
        setDraggingNode(null);
        dragStartPosRef.current = null;
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
    dragStartPosRef.current = null;
    isActuallyDraggingRef.current = false;
  }, [draggingNode, currentProject, deleteActionInitiated]);


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
  
  const confirmDeleteNode = () => {
    if (!currentProject || !deleteNodeConfirm.nodeId) return;
    
    let validNodes = getValidNodes(currentProject.nodes);
    let updatedNodes = validNodes.filter(n => n.id !== deleteNodeConfirm.nodeId);
    
    updatedNodes = updatedNodes.map(n => {
        let modified = false;
        const newNodeData = { ...n }; 
        if (newNodeData.nextNodeId === deleteNodeConfirm.nodeId) {
            newNodeData.nextNodeId = null;
            modified = true;
        }
        if (newNodeData.branches) {
            const originalBranches = newNodeData.branches;
            newNodeData.branches = newNodeData.branches.map(b => 
                b.nextNodeId === deleteNodeConfirm.nodeId ? { ...b, nextNodeId: null } : b
            );
            if (JSON.stringify(originalBranches) !== JSON.stringify(newNodeData.branches)) modified = true;
        }
        return modified ? newNodeData : n; 
    });
    const updatedProject = { ...currentProject, nodes: updatedNodes };
    setCurrentProject(updatedProject);
    setHasUnsavedChanges(true); 
  };

  const handleDeleteNodeRequest = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!currentProject) return;
    const nodeToDelete = getValidNodes(currentProject.nodes).find(n => n.id === nodeId);
    if (!nodeToDelete) return;
    setDeleteActionInitiated(true); 
    setDeleteNodeConfirm({ isOpen: true, nodeId, nodeName: nodeToDelete.name || nodeToDelete.type });
  };

  const handleRequestCloseProject = () => {
    if (isWorkflowRunning) return;

    if (hasUnsavedChanges) {
      setIsUnsavedChangesModalOpen(true);
    } else {
      navigate('/');
    }
  };

  const handleSaveAndClose = () => {
    if (currentProject) {
      saveProjectState(currentProject); 
    }
    setIsUnsavedChangesModalOpen(false);
    navigate('/');
  };

  const handleCloseWithoutSaving = () => {
    setIsUnsavedChangesModalOpen(false);
    navigate('/');
  };


  const handleStopWorkflow = () => {
    isStopRequestedRef.current = true;
  };

  const runWorkflow = async () => {
    if (!currentProject || isWorkflowRunning) return;
    
    const initialValidNodes = getValidNodes(currentProject.nodes);
    if (initialValidNodes.length === 0 && currentProject.nodes.length > 0) {
        console.error("Workflow run aborted: Project contains only invalid node data before cloning.");
        return;
    }

    const needsApiCall = initialValidNodes.some(n => 
        n.type === NodeType.PROMPT || n.type === NodeType.CONDITIONAL || n.type === NodeType.START
    );
    if (!appSettings.apiKey && needsApiCall) {
        setApiKeyMissingModalOpen(true);
        return;
    }

    setIsWorkflowRunning(true);
    isStopRequestedRef.current = false;
    
    if (hasUnsavedChanges) {
        saveProjectState(currentProject, true); 
    }

    setExecutionLogs([]);
    setCurrentExecutingNodeId(null);
    const startTime = Date.now();
    setRunStartTime(startTime);
    setRunEndTime(null);
    setTotalTokensThisRun(0);
    setIsExecutionPanelOpen(true); 

    let tempCurrentProject = deepClone(currentProject); 
    
    tempCurrentProject.nodes = getValidNodes(tempCurrentProject.nodes).map(n => ({ 
        ...n, 
        isRunning: false, 
        hasError: false, 
        lastRunOutput: undefined 
    }));

    const nodesForLogic: Node[] = tempCurrentProject.nodes.filter((n): n is Node => {
        if (n === null || n === undefined) {
            console.warn("CRITICAL WARNING: Null/undefined node found in tempCurrentProject.nodes AFTER initial mapping. This indicates a deeper issue.", tempCurrentProject.nodes);
            return false;
        }
        if (typeof n.type !== 'string' || typeof n.id !== 'string' || !Object.values(NodeType).includes(n.type as NodeType)) { 
            console.warn("CRITICAL WARNING: Node with invalid structure or type found AFTER initial mapping:", n, tempCurrentProject.nodes);
            return false;
        }
        return true;
    });

    if (nodesForLogic.length === 0 && tempCurrentProject.nodes.length > 0) {
        console.error("Workflow run aborted: Project contains no structurally valid nodes after detailed filtering for logic loop.");
        setIsWorkflowRunning(false);
        setRunStartTime(null); // Reset run time if aborted early
        return;
    }
    tempCurrentProject.nodes = nodesForLogic; 

    setCurrentProject(prev => {
      if (!prev) return null;
      const uiNodesReset = getValidNodes(prev.nodes).map(n => ({...n, isRunning: false, hasError: false, lastRunOutput: undefined}));
      return {...prev, nodes: uiNodesReset };
    });


    const currentRun: ProjectRun = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      status: 'running',
      steps: [],
      totalTokensUsed: 0,
    };
    
    tempCurrentProject.runHistory = [currentRun, ...(tempCurrentProject.runHistory || [])].slice(0, MAX_RUN_HISTORY);

    let currentNode: Node | null | undefined = tempCurrentProject.nodes.find(n => n.type === NodeType.START);
    let previousOutput: string | undefined = undefined;
    let accumulatedTokens = 0;
    const workflowVariables: { [key: string]: string } = {};

    while (currentNode) {
      if (isStopRequestedRef.current) {
        currentRun.status = 'stopped';
        currentRun.error = 'Manually stopped by user.';
        setExecutionLogs(prevLogs => prevLogs.map(log => log.status === 'running' ? {...log, status: 'skipped', endTime: new Date().toISOString()} : log));
        break; 
      }

      const activeNodeId = currentNode.id;
      setCurrentExecutingNodeId(activeNodeId); 
      const nodeLogEntry: NodeExecutionLog = { 
          nodeId: activeNodeId, 
          nodeName: currentNode.name || currentNode.type, 
          startTime: new Date().toISOString(), 
          status: 'running' 
      };
      setExecutionLogs(prevLogs => [...prevLogs, nodeLogEntry]);
      
      setCurrentProject(prev => {
          if(!prev) return null;
          const validPrevNodes = getValidNodes(prev.nodes);
          const updatedNodes = validPrevNodes.map(n => n.id === activeNodeId ? { ...n, isRunning: true, hasError: false } : {...n, isRunning: false});
          return {...prev, nodes: updatedNodes};
      });
      
      let promptForLLM = currentNode.prompt;
      let stepPromptSent = currentNode.prompt; 

      if (currentNode.type === NodeType.START || currentNode.type === NodeType.PROMPT || currentNode.type === NodeType.CONDITIONAL) {
        let tempPrompt = currentNode.prompt;
        for (const [varName, varValue] of Object.entries(workflowVariables)) {
          const safeVarName = varName.replace(/[^a-zA-Z0-9_]/g, '');
          if (safeVarName) { 
            tempPrompt = tempPrompt.replace(new RegExp(`\\{${safeVarName}\\}`, 'gi'), varValue);
          }
        }
        promptForLLM = tempPrompt.replace(/{PREVIOUS_OUTPUT}/gi, previousOutput || '');
        stepPromptSent = promptForLLM; 
      }


      if (currentNode.type === NodeType.CONCLUSION) {
        stepPromptSent = `Displaying output for: ${currentNode.name || 'Conclusion'}`; 
      } else if (currentNode.type === NodeType.VARIABLE) {
        stepPromptSent = `Storing input as '${currentNode.name}'`;
      }


      const step: RunStep = {
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        promptSent: stepPromptSent,
        responseReceived: '',
        timestamp: new Date().toISOString(),
      };

      try {
        let resultText: string;
        let usageData: GeminiExecutePromptResponse['usageMetadata'] = undefined;
        let currentStepTokens: number | undefined = undefined;

        if (currentNode.type === NodeType.START || currentNode.type === NodeType.PROMPT || currentNode.type === NodeType.CONDITIONAL) {
            if (!appSettings.apiKey) throw new Error("Gemini API Key is not configured.");
            const result: GeminiExecutePromptResponse = await executePrompt(promptForLLM, appSettings);
            resultText = result.text;
            usageData = result.usageMetadata;
        } else if (currentNode.type === NodeType.CONCLUSION) {
            resultText = previousOutput || '(No input to display)';
        } else if (currentNode.type === NodeType.VARIABLE) {
            resultText = previousOutput || ''; 
            workflowVariables[currentNode.name.replace(/[^a-zA-Z0-9_]/g, '')] = resultText; 
            step.responseReceived = resultText; 
        } else {
            // This case should ideally not be reached if nodesForLogic filtering is correct
            throw new Error(`Unknown or invalid node type encountered: ${ (currentNode as any)?.type }`);
        }
        
        if (usageData && typeof usageData.totalTokenCount === 'number') {
            currentStepTokens = usageData.totalTokenCount;
            accumulatedTokens += currentStepTokens;
        }
        step.tokensUsed = currentStepTokens;
        step.responseReceived = resultText;

        previousOutput = resultText; 
        
        const nodeInTemp = tempCurrentProject.nodes.find(n => n.id === activeNodeId);
        if (nodeInTemp) nodeInTemp.lastRunOutput = resultText;
        
        setExecutionLogs(prevLogs => prevLogs.map(log => log.nodeId === activeNodeId && log.status === 'running' ? 
            {...log, endTime: new Date().toISOString(), status: currentNode?.type === NodeType.VARIABLE ? 'variable_set' : 'completed', output: resultText, tokensUsed: step.tokensUsed} : log
        ));
        
        currentRun.steps.push(step);
        setCurrentProject(prev => {
            if(!prev) return null;
            const validPrevNodes = getValidNodes(prev.nodes);
            const updatedNodes = validPrevNodes.map(n => n.id === activeNodeId ? { ...n, isRunning: false, lastRunOutput: resultText, hasError: false } : n);
            return {...prev, nodes: updatedNodes};
        });

        if (currentNode.type === NodeType.CONCLUSION) {
            currentNode = null; 
        } else if (currentNode.type === NodeType.CONDITIONAL && currentNode.branches) {
          let nextNodeIdFound: string | null = null;
          const lcResponse = resultText.toLowerCase();
          for (const branch of currentNode.branches) {
            const lcCondition = branch.condition.toLowerCase();
            let match = false;
            if (lcCondition.startsWith("contains '") && lcCondition.endsWith("'")) {
                match = lcResponse.includes(lcCondition.substring(10, lcCondition.length -1));
            } else if (lcCondition.startsWith("starts with '") && lcCondition.endsWith("'")) {
                match = lcResponse.startsWith(lcCondition.substring(13, lcCondition.length -1));
            } else if (lcCondition === "default" || lcCondition === "") { 
                match = true; 
            } else { 
                match = lcResponse === lcCondition;
            }
            if (match) {
              nextNodeIdFound = branch.nextNodeId;
              break;
            }
          }
          if (!nextNodeIdFound && currentNode.branches.some(b => b.condition.toLowerCase() === "default" || b.condition === "")) {
             const defaultBranch = currentNode.branches.find(b => b.condition.toLowerCase() === "default" || b.condition === "");
             if (defaultBranch) nextNodeIdFound = defaultBranch.nextNodeId;
          }
          currentNode = tempCurrentProject.nodes.find(n => n.id === nextNodeIdFound) || null;

        } else { 
          currentNode = tempCurrentProject.nodes.find(n => n.id === currentNode?.nextNodeId) || null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        step.error = errorMessage;
        step.responseReceived = 'ERROR';
        currentRun.steps.push(step);
        currentRun.status = 'failed';
        currentRun.error = errorMessage;

        const nodeInTemp = tempCurrentProject.nodes.find(n => n.id === activeNodeId);
        if (nodeInTemp) nodeInTemp.lastRunOutput = errorMessage;

        setExecutionLogs(prevLogs => prevLogs.map(log => log.nodeId === activeNodeId && log.status === 'running' ? 
            {...log, endTime: new Date().toISOString(), status: 'failed', error: errorMessage} : log
        ));
         setCurrentProject(prev => {
            if(!prev) return null;
            const validPrevNodes = getValidNodes(prev.nodes);
            const updatedNodes = validPrevNodes.map(n => n.id === activeNodeId ? { ...n, isRunning: false, hasError: true, lastRunOutput: errorMessage } : n);
            return {...prev, nodes: updatedNodes};
        });
        currentNode = null; 
        break; 
      }
    } 

    if (isStopRequestedRef.current) { 
        // currentRun.status is already 'stopped'
    } else if (currentRun.status === 'running') { // If loop completed naturally and not stopped by error
        currentRun.status = 'completed';
    }
    // If loop exited due to error, currentRun.status is already 'failed'

    currentRun.finalOutput = previousOutput; 
    currentRun.totalTokensUsed = accumulatedTokens;
    const runEndTimeActual = Date.now();
    currentRun.durationMs = runEndTimeActual - (startTime || runEndTimeActual); 
    
    setRunEndTime(runEndTimeActual);
    setTotalTokensThisRun(accumulatedTokens);
    setCurrentExecutingNodeId(null); 
    
    const finalProjectStateForSave = {
      ...tempCurrentProject,
      nodes: getValidNodes(tempCurrentProject.nodes) 
    };
    saveProjectState(finalProjectStateForSave);

    setIsWorkflowRunning(false);
    isStopRequestedRef.current = false;
  };


  if (!currentProject) {
    return <div className="p-4 text-center text-slate-300 h-screen flex flex-col justify-center items-center bg-slate-900">Loading project or project not found... <RouterLink to="/" className="text-sky-400 hover:text-sky-300 mt-2">Go Home</RouterLink></div>;
  }
  
  const validNodesOnCanvas = Array.isArray(currentProject?.nodes) 
    ? currentProject.nodes.filter((n): n is Node => {
        const isValid = n !== null && n !== undefined;
        // Optional: more detailed logging for debugging if needed in future
        // if (!isValid) {
        //   console.warn("Filtering out null/undefined node during validNodesOnCanvas creation:", n);
        // } else if (typeof n.type !== 'string' || !Object.values(NodeType).includes(n.type as NodeType)) {
        //   console.warn("Filtering out node with invalid/unexpected type during validNodesOnCanvas creation:", n, "Expected one of:", Object.values(NodeType));
        //    return false; 
        // }
        return isValid;
      })
    : [];

  const getNodeById = (id: string): Node | undefined => validNodesOnCanvas.find(n => n.id === id);

  const getLineToRectangleIntersectionPoint = (
    lineP1: { x: number; y: number }, 
    lineP2: { x: number; y: number }, 
    rect: { x: number; y: number; width: number; height: number }
  ): { x: number; y: number } => {
    const { x: rectX, y: rectY, width: rectW, height: rectH } = rect;
    const sides = [
      { p3: { x: rectX, y: rectY }, p4: { x: rectX + rectW, y: rectY } }, 
      { p3: { x: rectX + rectW, y: rectY }, p4: { x: rectX + rectW, y: rectY + rectH } }, 
      { p3: { x: rectX, y: rectY + rectH }, p4: { x: rectX + rectW, y: rectY + rectH } }, 
      { p3: { x: rectX, y: rectY }, p4: { x: rectX, y: rectY + rectH } }, 
    ];
    let closestIntersection = lineP2; 
    let minT = Infinity; 
    for (const side of sides) {
      const { p3, p4 } = side; 
      const den = (lineP1.x - lineP2.x) * (p3.y - p4.y) - (lineP1.y - lineP2.y) * (p3.x - p4.x);
      if (den === 0) continue; 
      const tNum = (lineP1.x - p3.x) * (p3.y - p4.y) - (lineP1.y - p3.y) * (p3.x - p4.x);
      const uNum = -((lineP1.x - lineP2.x) * (lineP1.y - p3.y) - (lineP1.y - lineP2.y) * (lineP1.x - p3.x));
      const t = tNum / den; 
      const u = uNum / den; 
      if (u >= 0 && u <= 1 && t >= 0 && t <= 1) { 
        if (t < minT) {
            minT = t;
            closestIntersection = { 
                x: lineP1.x + t * (lineP2.x - lineP1.x), 
                y: lineP1.y + t * (lineP2.y - lineP1.y) 
            };
        }
      }
    }
    return closestIntersection;
  };


  return (
    <div className="flex h-screen flex-col">
      <Header 
        onRunProject={runWorkflow} 
        onStopProject={handleStopWorkflow}
        currentProjectName={currentProject.name} 
        isWorkflowRunning={isWorkflowRunning}
      />
      <div className="flex flex-1 overflow-hidden pb-12"> 
        <aside className="w-60 sm:w-64 bg-slate-800 p-3 sm:p-4 space-y-3 overflow-y-auto custom-scroll shadow-lg flex flex-col">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Node Tools</h3>
            <button onClick={() => handleAddNode(NodeType.PROMPT)} className="w-full rounded bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700">Add Prompt Node</button>
            <button onClick={() => handleAddNode(NodeType.CONDITIONAL)} className="w-full rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 mt-2">Add Conditional Node</button>
            <button onClick={() => handleAddNode(NodeType.VARIABLE)} className="w-full rounded bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 mt-2">Add Variable Node</button>
            <button onClick={() => handleAddNode(NodeType.CONCLUSION)} className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 mt-2">Add Conclusion Node</button>
            
            <hr className="border-slate-700 my-4"/>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Project Actions</h3>
            <button onClick={() => setIsProjectSettingsModalOpen(true)} className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">Project Settings</button>
            <button onClick={() => setIsRunHistoryModalOpen(true)} className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 mt-2">View Run History ({currentProject.runHistory.length})</button>
          </div>
          
           <div className="mt-auto pt-4 space-y-2"> 
            <button 
              onClick={handleRequestCloseProject} 
              disabled={isWorkflowRunning}
              className="w-full rounded bg-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-500 flex items-center justify-center disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
              <i className="fas fa-times-circle mr-2"></i>Close Project
            </button>
            <button 
              onClick={() => setIsHelpModalOpen(true)} 
              className="w-full rounded bg-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-500 flex items-center justify-center"
            >
              <i className="fas fa-question-circle mr-2"></i>Help
            </button>
          </div>
        </aside>

        <main ref={editorAreaRef} className="flex-1 bg-slate-850 p-4 relative overflow-auto custom-scroll" style={{ backgroundImage: `radial-gradient(${getComputedStyle(document.documentElement).getPropertyValue('--tw-colors-slate-700') || '#374151'} 1px, transparent 1px)`, backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`}}>
          {validNodesOnCanvas.map(node => {
             if (!node || typeof node.type !== 'string' || !Object.values(NodeType).includes(node.type as NodeType)) {
                console.error("ProjectEditorPage: Encountered invalid node data during render. Node object:", JSON.stringify(node));
                return (
                  <div 
                    key={node?.id || `invalid-node-${Math.random().toString(36).substr(2, 9)}`} 
                    className="absolute rounded-lg shadow-xl p-3 border-2 border-red-700 bg-red-900 text-white flex flex-col justify-center items-center text-xs"
                    style={{ 
                      left: node?.position?.x || 0, 
                      top: node?.position?.y || 0, 
                      width: NODE_WIDTH, 
                      height: NODE_HEIGHT,
                      boxSizing: 'border-box'
                    }}
                  >
                    <p className="font-bold mb-1">Error: Invalid Node</p>
                    <p>ID: {node?.id || 'Unknown'}</p>
                    <p>Type: {node?.type || 'Unknown'}</p>
                  </div>
                );
             }
             const nodeBaseColorClass = NODE_COLORS[node.type] || NODE_COLORS.PROMPT; 
             const borderColorClass = node.isRunning ? 'border-purple-500 animate-pulse' : (node.hasError ? 'border-red-500' : 'border-transparent');
             const finalNodeClass = `${nodeBaseColorClass} ${borderColorClass}`;
            return (
            <div
              key={node.id}
              className={`node-${node.id} absolute rounded-lg shadow-xl p-3 border-2 
                ${finalNodeClass} 
                transition-all duration-150 cursor-grab flex flex-col justify-between items-center`}
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
                        className="text-red-300 hover:text-red-100 text-xs p-0.5 rounded-full hover:bg-red-500/50 absolute top-1 right-1 z-10"
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
                  <div className="mt-auto pt-1 border-t border-slate-500/50 w-full overflow-hidden"> {/* ADDED overflow-hidden HERE */}
                    <p className={`text-xs ${node.hasError ? 'text-red-300' : 'text-green-300'} truncate text-center`}>Last Out: {node.lastRunOutput}</p>
                  </div>
              )}
            </div>
          );})}

          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" aria-hidden="true">
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
              const midX = startPoint.x + dx * 0.5;
              const midY = startPoint.y + dy * 0.5;
              const normalX = -dy * curveFactor;
              const normalY = dx * curveFactor;
              const cpX = midX + normalX;
              const cpY = midY + normalY;

              const path = `M ${startPoint.x},${startPoint.y} Q ${cpX},${cpY} ${endPoint.x},${endPoint.y}`;

              return (
                <g key={link.id}>
                  <path d={path} stroke="#0EA5E9" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  {link.condition && (
                    <text x={midX} y={midY - 8} fill="#94A3B8" fontSize="10px" textAnchor="middle" className="pointer-events-auto bg-slate-850 px-1 rounded">
                      {link.condition}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </main>
      </div>
      
      {currentProject && 
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
      }

      {selectedNodeState && currentProject && <NodeEditModal node={selectedNodeState} isOpen={isNodeModalOpen} onClose={() => { setIsNodeModalOpen(false); setSelectedNodeState(null); }} onSave={handleSaveNode} allNodes={validNodesOnCanvas} />}
      {currentProject && <ProjectSettingsModal project={currentProject} isOpen={isProjectSettingsModalOpen} onClose={() => setIsProjectSettingsModalOpen(false)} onSave={handleSaveProjectSettings} />}
      {currentProject && <RunHistoryModal runHistory={currentProject.runHistory} isOpen={isRunHistoryModalOpen} onClose={() => setIsRunHistoryModalOpen(false)} />}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      
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
        isOpen={apiKeyMissingModalOpen}
        onClose={() => setApiKeyMissingModalOpen(false)}
        onConfirm={() => { 
            setApiKeyMissingModalOpen(false); 
        }}
        title="API Key Required"
        message={<p>Your Gemini API Key is not set. Please configure it in <strong>App Settings</strong> before running a workflow that requires API calls.</p>}
        confirmText="OK"
        confirmButtonClass="bg-sky-600 hover:bg-sky-700" 
        cancelText="Close" 
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
