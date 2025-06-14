// src/hooks.ts
import { useContext } from 'react';
import { AppSettingsContext, ProjectsContext, AppSettingsContextType, ProjectsContextType } from './contexts';

export const useAppSettings = (): AppSettingsContextType => {
  const context = useContext(AppSettingsContext);
  if (!context) throw new Error('useAppSettings must be used within an AppSettingsProvider');
  return context;
};

export const useProjects = (): ProjectsContextType => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used within a ProjectsProvider');
  return context;
};

// Exporting other hooks from this central file
export { useProjectStateManagement } from './hooks/useProjectStateManagement';
export { useNodeManagement } from './hooks/useNodeManagement';
export { useNodeDragging } from './hooks/useNodeDragging';
export { useWorkflowExecution } from './hooks/workflow/useWorkflowExecution'; // Corrected path
export { useEditorModals } from './hooks/useEditorModals';
export { useVisualLinks } from './hooks/useVisualLinks';
export { useCanvasPanZoom } from './hooks/useCanvasPanZoom';
export { useIsMobile } from './hooks/useIsMobile'; // New export