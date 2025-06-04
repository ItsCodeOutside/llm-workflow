// src/pages/HomePage.tsx
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks';
import Header from '../components/Header';
import ConfirmationModal from '../components/ConfirmationModal';
import type { Project, NodeType } from '../../types'; // Ensure NodeType is imported if used (it is for newProject)
import { generateId } from '../utils';
import { INITIAL_START_NODE_PROMPT } from '../../constants';


const HomePage: React.FC = () => {
  const { projects, addProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<{ isOpen: boolean; projectId: string | null; projectName: string | null }>({ isOpen: false, projectId: null, projectName: null });


  const handleCreateProject = () => {
    const startNodeId = generateId();
    const newProject: Project = {
      id: generateId(),
      name: 'New Project', 
      description: 'A new LLM workflow project.',
      author: 'User',
      nodes: [{ 
        id: startNodeId, 
        type: 'START' as NodeType.START, // Explicitly cast or use enum value
        name: 'Start Here', 
        prompt: INITIAL_START_NODE_PROMPT, // Use constant
        position: { x: 50, y: 50 },
        nextNodeId: null // Ensure new start nodes have nextNodeId as null
      }],
      links: [],
      runHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addProject(newProject);
    navigate(`/project/${newProject.id}`);
  };

  const confirmDeleteProject = () => {
    if (deleteProjectConfirm.projectId) {
      deleteProject(deleteProjectConfirm.projectId);
      // setDeleteProjectConfirm({ isOpen: false, projectId: null, projectName: null }); // Modal closes itself via onConfirm
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <Header />
      <div className="my-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-semibold text-slate-100 text-center sm:text-left">My Projects</h1>
        <button
          onClick={handleCreateProject}
          className="rounded-md bg-sky-600 px-6 py-3 text-white hover:bg-sky-700 text-lg font-medium flex items-center"
        >
          <i className="fas fa-plus mr-2"></i>Create New Project
        </button>
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
    </div>
  );
};

export default HomePage;
