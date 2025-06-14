// src/hooks/useProjectStateManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjects } from '../hooks'; 
import type { Project } from '../types'; // Updated path
import { deepClone, getValidNodes } from '../utils';

export const useProjectStateManagement = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProjectById, updateProject } = useProjects();
  const navigate = useNavigate();

  const [currentProject, setCurrentProjectInternal] = useState<Project | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      navigate('/');
      setIsLoading(false);
      return;
    }
    const projectFromContext = getProjectById(projectId);
    if (projectFromContext) {
      const sanitizedProject = deepClone(projectFromContext);
      sanitizedProject.nodes = getValidNodes(sanitizedProject.nodes); 
      setCurrentProjectInternal(sanitizedProject);
      setHasUnsavedChanges(false);
    } else {
      navigate('/');
    }
    setIsLoading(false);
  }, [projectId, getProjectById, navigate]);

  const saveProjectState = useCallback((projectState: Project | null, skipSetCurrent: boolean = false) => {
    if (!projectState) {
      return;
    }
    
    const fullySanitizedProjectState = deepClone(projectState);

    const projectToSaveForUpdate = {
      ...fullySanitizedProjectState,
      nodes: getValidNodes(fullySanitizedProjectState.nodes),
      updatedAt: new Date().toISOString(),
    };
    
    updateProject(projectToSaveForUpdate);

    if (!skipSetCurrent) {
      setCurrentProjectInternal(projectToSaveForUpdate);
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
    setCurrentProjectInternal(prevProjectInternalState => {
        const prevProjectForComparison = prevProjectInternalState ? deepClone(prevProjectInternalState) : null;
        const newProjectCandidate = typeof updater === 'function' ? updater(prevProjectInternalState) : updater;
        const newProjectToSet = newProjectCandidate ? deepClone(newProjectCandidate) : null;

        if (newProjectToSet) {
            newProjectToSet.nodes = getValidNodes(newProjectToSet.nodes); 
            let hasChanged = false;
            try {
                const prevProjectStringToCompare = prevProjectForComparison ? JSON.stringify(prevProjectForComparison) : "null";
                const newProjectStringToCompare = newProjectToSet ? JSON.stringify(newProjectToSet) : "null";

                if (prevProjectStringToCompare !== newProjectStringToCompare) {
                    hasChanged = true;
                }
            } catch (e) {
                hasChanged = true; 
            }
            if (hasChanged) {
                setHasUnsavedChanges(true);
            }
        } else {
             if(prevProjectInternalState !== null) {
                setHasUnsavedChanges(true);
             }
        }
        return newProjectToSet;
    });
  }, []);


  return {
    projectId,
    currentProject,
    setCurrentProject: updateCurrentProject,
    isLoading,
    hasUnsavedChanges,
    setHasUnsavedChanges, 
    saveProjectState,
    isUnsavedChangesModalOpen,
    setIsUnsavedChangesModalOpen,
    handleRequestCloseProject,
    handleSaveAndClose,
    handleCloseWithoutSaving,
  };
};
