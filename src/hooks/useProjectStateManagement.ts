// src/hooks/useProjectStateManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../hooks'; // Corrected import path
import type { Project } from '../../types';
import { deepClone, getValidNodes } from '../utils';

export const useProjectStateManagement = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProjectById, updateProject } = useProjects();
  const navigate = useNavigate();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      navigate('/');
      setIsLoading(false);
      return;
    }
    const project = getProjectById(projectId);
    if (project) {
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
    setIsLoading(false);
  }, [projectId, getProjectById, navigate]);

  const saveProjectState = useCallback((projectState: Project | null, skipSetCurrent: boolean = false) => {
    if (!projectState) return;
    const projectToSave = {
      ...projectState,
      nodes: getValidNodes(projectState.nodes),
      updatedAt: new Date().toISOString(),
    };
    updateProject(projectToSave);
    if (!skipSetCurrent) {
      setCurrentProject(projectToSave);
    }
    setHasUnsavedChanges(false);
  }, [updateProject]);

  const handleRequestCloseProject = (isWorkflowRunning: boolean) => {
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
  
  const updateCurrentProject = useCallback((updater: Project | ((prev: Project | null) => Project | null)) => {
    setCurrentProject(prevProject => {
        const newProject = typeof updater === 'function' ? updater(prevProject) : updater;
        if (newProject && JSON.stringify(prevProject) !== JSON.stringify(newProject)) {
            setHasUnsavedChanges(true);
        }
        return newProject;
    });
  }, []);


  return {
    projectId,
    currentProject,
    setCurrentProject: updateCurrentProject, // Use the wrapped setter
    isLoading,
    hasUnsavedChanges,
    setHasUnsavedChanges, // Expose directly if needed by other hooks for complex state updates
    saveProjectState,
    isUnsavedChangesModalOpen,
    setIsUnsavedChangesModalOpen,
    handleRequestCloseProject,
    handleSaveAndClose,
    handleCloseWithoutSaving,
  };
};