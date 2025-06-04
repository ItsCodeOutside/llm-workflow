// src/components/Header.tsx
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAppSettings } from '../hooks';
import AppSettingsModal from './AppSettingsModal';
import type { AppSettings } from '../../types';

interface HeaderProps {
  onRunProject?: () => void;
  onStopProject?: () => void;
  currentProjectName?: string;
  isWorkflowRunning?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onRunProject, onStopProject, currentProjectName, isWorkflowRunning }) => {
  const [isAppSettingsModalOpen, setIsAppSettingsModalOpen] = useState(false);
  const { appSettings, setAppSettings } = useAppSettings();

  const handleSaveAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setIsAppSettingsModalOpen(false);
  };
  
  return (
    <>
      <header className="bg-slate-800 p-4 shadow-md flex justify-between items-center z-10 relative">
        <div className="flex items-center space-x-4">
          <RouterLink to="/" className="text-2xl font-bold text-sky-400 hover:text-sky-300">
            <i className="fas fa-cogs mr-2"></i>LLM Workflow
          </RouterLink>
          {currentProjectName && <span className="text-slate-400 text-lg hidden sm:inline">| {currentProjectName}</span>}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {onRunProject && onStopProject && (
            isWorkflowRunning ? (
              <button
                onClick={onStopProject}
                className="rounded-md bg-red-600 px-3 py-2 sm:px-4 text-white hover:bg-red-700 flex items-center text-sm sm:text-base"
                aria-label="Stop Project Run"
              >
                <i className="fas fa-stop mr-1 sm:mr-2"></i>Stop
              </button>
            ) : (
              <button
                onClick={onRunProject}
                className="rounded-md bg-green-600 px-3 py-2 sm:px-4 text-white hover:bg-green-700 flex items-center text-sm sm:text-base"
                aria-label="Run Project"
              >
                <i className="fas fa-play mr-1 sm:mr-2"></i>Run
              </button>
            )
          )}
          <button 
            onClick={() => setIsAppSettingsModalOpen(true)}
            className="rounded-md bg-slate-700 px-3 py-2 sm:px-4 text-slate-200 hover:bg-slate-600 flex items-center text-sm sm:text-base"
            aria-label="Application Settings"
          >
            <i className="fas fa-cog mr-1 sm:mr-2"></i>Settings
          </button>
        </div>
      </header>
      <AppSettingsModal 
        settings={appSettings}
        isOpen={isAppSettingsModalOpen}
        onClose={() => setIsAppSettingsModalOpen(false)}
        onSave={handleSaveAppSettings}
      />
    </>
  );
};

export default Header;
