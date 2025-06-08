// src/pages/HomePage.tsx
import React, { useState, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks';
import Header from '../components/Header';
import ConfirmationModal from '../components/ConfirmationModal';
import ExportProjectModal from '../components/ExportProjectModal'; // New
import ImportProjectModal from '../components/ImportProjectModal'; // New
// Changed 'import type' for NodeType as it's used as a value
// Aliased 'Node' to 'WorkflowNode' to avoid conflict with global DOM Node
import { type Project, NodeType, type Node as WorkflowNode, type Link as VisualLink, type ProjectVariable } from '../../types'; 
import { generateId, deepClone, getValidNodes, sanitizeVariableName } from '../utils'; // Import sanitizeVariableName
import { INITIAL_START_NODE_PROMPT } from '../../constants';


const HomePage: React.FC = () => {
  const { projects, addProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<{ isOpen: boolean; projectId: string | null; projectName: string | null }>({ isOpen: false, projectId: null, projectName: null });
  const [exportModalState, setExportModalState] = useState<{ isOpen: boolean; projectJson: string; projectName: string }>({ isOpen: false, projectJson: '', projectName: '' });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);


  const handleCreateProject = () => {
    const startNodeId = generateId();
    const newProject: Project = {
      id: generateId(),
      name: 'New Project', 
      description: 'A new LLM workflow project.',
      author: 'User',
      nodes: [{ 
        id: startNodeId, 
        type: NodeType.START, // NodeType used as a value here
        name: 'Start Here', 
        prompt: INITIAL_START_NODE_PROMPT, 
        position: { x: 50, y: 50 },
        nextNodeId: null 
      }],
      links: [],
      runHistory: [],
      projectVariables: [], // Initialize with empty project variables
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
  };

  const handleOpenExportModal = (project: Project) => {
    const projectToExport = deepClone(project);
    
    // Remove runHistory and lastRunOutput from nodes
    projectToExport.runHistory = [];
    projectToExport.nodes = projectToExport.nodes.map(node => {
      const { lastRunOutput, ...nodeWithoutLastOutput } = node;
      return nodeWithoutLastOutput;
    });
    // projectVariables are fine to export as is.
    
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
      
      const newProject = deepClone(parsedProject) as Project; // Assume structure is mostly correct after basic check

      // Regenerate IDs and update references
      newProject.id = generateId();
      const nodeIdMap: { [oldId: string]: string } = {};
      
      // Use WorkflowNode for the type annotation of 'node'
      newProject.nodes = getValidNodes(newProject.nodes).map((node: WorkflowNode) => {
        const oldNodeId = node.id;
        const newNodeId = generateId();
        nodeIdMap[oldNodeId] = newNodeId;
        node.id = newNodeId;
        // Ensure lastRunOutput is not present on imported nodes
        delete node.lastRunOutput;

        // Sanitize variable node names
        if (node.type === NodeType.VARIABLE) { // NodeType used as a value
          node.name = sanitizeVariableName(node.name || `var_${newNodeId.substring(0,4)}`); // Ensure name exists before sanitizing
        }


        if (node.branches && Array.isArray(node.branches)) {
            node.branches = node.branches.map(branch => ({
                ...branch,
                id: generateId() // Regenerate branch ID
            }));
        }
        return node;
      });

      // Use WorkflowNode for the type annotation of 'node'
      newProject.nodes = newProject.nodes.map((node: WorkflowNode) => {
        if (node.nextNodeId && nodeIdMap[node.nextNodeId]) {
          node.nextNodeId = nodeIdMap[node.nextNodeId];
        } else if (node.nextNodeId) { // If old ID not in map, link is broken
          node.nextNodeId = null;
        }
        if (node.branches && Array.isArray(node.branches)) {
          node.branches = node.branches.map(branch => {
            if (branch.nextNodeId && nodeIdMap[branch.nextNodeId]) {
              return { ...branch, nextNodeId: nodeIdMap[branch.nextNodeId] };
            } else if (branch.nextNodeId) {
              return { ...branch, nextNodeId: null }; // Broken link
            }
            return branch;
          });
        }
        return node;
      });
      
      // Update links based on new node IDs
      if (Array.isArray(newProject.links)) {
        newProject.links = newProject.links.map((link: VisualLink) => ({
            id: generateId(), // New link ID
            sourceId: nodeIdMap[link.sourceId] || link.sourceId, // Use new ID if available
            targetId: nodeIdMap[link.targetId] || link.targetId, // Use new ID if available
            condition: link.condition
        })).filter(link => nodeIdMap[link.sourceId] && nodeIdMap[link.targetId]); // Keep only valid links
      } else {
        newProject.links = [];
      }

      // Handle projectVariables: regenerate IDs and sanitize names
      if (Array.isArray(newProject.projectVariables)) {
        newProject.projectVariables = newProject.projectVariables.map((pv: ProjectVariable, index: number) => ({
          id: generateId(),
          name: sanitizeVariableName(pv.name || `proj_var_${index}`), 
          value: pv.value || '', 
        })).filter(pv => pv.name.trim() !== ''); 
      } else {
        newProject.projectVariables = [];
      }


      newProject.runHistory = []; // Clear run history for imported project
      const now = new Date().toISOString();
      newProject.createdAt = now;
      newProject.updatedAt = now;
      newProject.name = newProject.name || "Imported Project";
      newProject.description = newProject.description || "Imported workflow.";
      newProject.author = newProject.author || "User";


      addProject(newProject);
      setIsImportModalOpen(false);
      // Optionally navigate to the new project: navigate(`/project/${newProject.id}`);

    } catch (error) {
      console.error("Import failed:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import project. Ensure JSON is valid.");
    }
  }, [addProject, navigate]);


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
          {projects.map(project => (
            <div key={project.id} className="rounded-xl bg-slate-800 p-6 shadow-lg hover:shadow-sky-500/30 transition-shadow duration-300 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-sky-400 mb-2 truncate">{project.name}</h2>
                <p className="text-slate-400 mb-1 text-sm">Author: {project.author}</p>
                <p className="text-slate-300 mb-4 line-clamp-3 h-16">{project.description}</p> {/* Fixed height for description */}
                 {project.projectVariables && project.projectVariables.length > 0 && (
                  <p className="text-xs text-slate-500 mb-1">Project Variables: {project.projectVariables.length}</p>
                )}
              </div>
              <div className="mt-auto">
                 <p className="text-xs text-slate-500 mb-3">Last updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
                <div className="flex space-x-3">
                  <RouterLink
                    to={`/project/${project.id}`}
                    className="flex-1 rounded-md bg-sky-600 px-4 py-2 text-center text-white hover:bg-sky-700"
                  >
                    Open
                  </RouterLink>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleOpenExportModal(project);
                    }}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                    aria-label={`Export project ${project.name}`}
                  >
                    <i className="fas fa-download"></i>
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setDeleteProjectConfirm({ isOpen: true, projectId: project.id, projectName: project.name });
                    }}
                    className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    aria-label={`Delete project ${project.name}`}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default HomePage;