// App.tsx
import React, { useState, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

import { AppSettingsContext, ProjectsContext } from './src/contexts';
import { LocalStorageService } from './src/services';

import HomePage from './src/pages/HomePage';
import ProjectEditorPage from './src/pages/ProjectEditorPage';

import type { AppSettings, Project } from './src/types'; // Updated path
import { DEFAULT_APP_SETTINGS } from './src/constants'; // Updated path


const App: React.FC = () => {
  const [appSettings, setAppSettingsState] = useState<AppSettings>(() => LocalStorageService.getAppSettings());
  const [projects, setProjectsState] = useState<Project[]>(() => LocalStorageService.getProjects());

  const setAppSettingsCb = useCallback((newSettings: AppSettings) => {
    const completeSettings = { ...DEFAULT_APP_SETTINGS, ...newSettings };
    setAppSettingsState(completeSettings);
    LocalStorageService.saveAppSettings(completeSettings);
  }, []);

  const addProjectCb = useCallback((project: Project) => {
    setProjectsState(prevProjects => {
      const newProjects = [...prevProjects, project];
      LocalStorageService.saveProjects(newProjects);
      return newProjects;
    });
  }, []);

  const updateProjectCb = useCallback((updatedProject: Project) => {
    setProjectsState(prevProjects => {
      const projectWithTimestamp = { ...updatedProject, updatedAt: new Date().toISOString() };
      const newProjects = prevProjects.map(p => p.id === projectWithTimestamp.id ? projectWithTimestamp : p);
      LocalStorageService.saveProjects(newProjects);
      return newProjects;
    });
  }, []);
  
  const deleteProjectCb = useCallback((projectId: string) => {
    setProjectsState(prevProjects => {
      const newProjects = prevProjects.filter(p => p.id !== projectId);
      LocalStorageService.saveProjects(newProjects);
      return newProjects;
    });
  }, []);

  const getProjectByIdCb = useCallback((projectId: string): Project | undefined => {
    return projects.find(p => p.id === projectId);
  }, [projects]); 

  return (
    <AppSettingsContext.Provider value={{ appSettings, setAppSettings: setAppSettingsCb }}>
      <ProjectsContext.Provider value={{ projects, addProject: addProjectCb, updateProject: updateProjectCb, deleteProject: deleteProjectCb, getProjectById: getProjectByIdCb }}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:projectId" element={<ProjectEditorPage />} />
          </Routes>
        </HashRouter>
      </ProjectsContext.Provider>
    </AppSettingsContext.Provider>
  );
};

export default App;
