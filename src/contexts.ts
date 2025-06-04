// src/contexts.ts
import { createContext } from 'react';
import type { AppSettings, Project } from '../types';

export interface AppSettingsContextType {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}
export const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export interface ProjectsContextType {
  projects: Project[];
  addProject: (project: Project) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  getProjectById: (projectId: string) => Project | undefined;
}
export const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);
