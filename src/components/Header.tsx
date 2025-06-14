// src/components/Header.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppSettings, useIsMobile } from '../hooks';
import AppSettingsModal from './AppSettingsModal';
import type { AppSettings } from '../types'; // Updated path
import { LLMProvider } from '../types'; // Updated path

interface HeaderProps {
  onRunProject?: () => void;
  onStopProject?: () => void;
  onStartStepThrough?: () => void;
  onProcessNextStep?: () => void;
  currentProjectName?: string;
  isWorkflowRunning?: boolean;
  isSteppingActive?: boolean;
  hasNextStep?: boolean;
  onToggleSidebar?: () => void;
  onNavigateHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onRunProject, 
  onStopProject, 
  onStartStepThrough,
  onProcessNextStep,
  currentProjectName, 
  isWorkflowRunning, 
  isSteppingActive,
  hasNextStep,
  onToggleSidebar,
  onNavigateHome 
}) => {
  const [isAppSettingsModalOpen, setIsAppSettingsModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const { appSettings, setAppSettings } = useAppSettings();
  const isMobile = useIsMobile();
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSaveAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    setIsAppSettingsModalOpen(false);
  };

  const toggleMoreMenu = () => setIsMoreMenuOpen(prev => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigateHome) {
      event.preventDefault(); 
      onNavigateHome();
    }
  };

  const { providerName, modelName } = useMemo(() => {
    if (!appSettings) return { providerName: "N/A", modelName: "N/A" };
    let prov = "";
    let mod = "Not Selected";
    switch (appSettings.llmProvider) {
        case LLMProvider.CHATGPT:
            prov = "ChatGPT";
            mod = appSettings.chatGptModel || "Not Selected";
            break;
        case LLMProvider.OLLAMA:
            prov = "Ollama";
            mod = appSettings.ollamaModel || "Not Selected";
            break;
        default:
            const exhaustiveCheck: never = appSettings.llmProvider;
            prov = `Unknown (${exhaustiveCheck})`;
            mod = "Error";
    }
    return { providerName: prov, modelName: mod };
  }, [appSettings]);

  const fullLlmInfo = `${providerName}: ${modelName}`;
  const displayedLlmInfo = `${providerName}: ${isMobile && modelName.length > 10 ? modelName.substring(0,7) + '...' : modelName}`;
  
  const stepButtonText = isSteppingActive ? (hasNextStep ? "Next Step" : "Stepping Done") : "Step";
  const stepButtonIcon = isSteppingActive ? (hasNextStep ? "fas fa-shoe-prints" : "fas fa-check-circle") : "fas fa-step-forward";
  const isStepButtonDisabled = (isWorkflowRunning && !isSteppingActive) || (isSteppingActive && !hasNextStep);
  const isRunButtonDisabled = isSteppingActive || (isWorkflowRunning && !isSteppingActive);


  return (
    <>
      <header className="bg-slate-800 p-3 sm:p-4 shadow-md flex justify-between items-center z-30 relative">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isMobile && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Toggle sidebar"
            >
              <i className="fas fa-bars fa-lg"></i>
            </button>
          )}
          <RouterLink 
            to="/" 
            className="text-xl sm:text-2xl font-bold text-sky-400 hover:text-sky-300 flex items-center"
            onClick={handleLogoClick}
          >
            <i className="fas fa-cogs mr-2"></i>
            <span className={isMobile ? "hidden sm:inline" : "inline"}>LLM Workflow</span>
          </RouterLink>
          {currentProjectName && <span className="text-slate-400 text-sm sm:text-lg hidden md:inline">| {currentProjectName}</span>}
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span 
            className="text-xs text-slate-400 truncate hidden sm:block" 
            title={fullLlmInfo}
            style={{ maxWidth: '150px' }} 
            aria-label={`Current LLM: ${fullLlmInfo}`}
          >
            {displayedLlmInfo}
          </span>
           <span 
            className="text-xs text-slate-400 truncate sm:hidden" 
            title={fullLlmInfo}
            style={{ maxWidth: '100px' }} 
            aria-label={`Current LLM: ${fullLlmInfo}`}
          >
            {displayedLlmInfo}
          </span>

          {onRunProject && onStopProject && (
            isWorkflowRunning ? (
              <button
                onClick={onStopProject}
                className="rounded-md bg-red-600 px-2 py-1.5 sm:px-3 sm:py-2 text-white hover:bg-red-700 flex items-center text-xs sm:text-sm"
                aria-label="Stop Project Run"
              >
                <i className="fas fa-stop sm:mr-1"></i><span className="hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button
                onClick={onRunProject}
                disabled={isRunButtonDisabled}
                className={`rounded-md px-2 py-1.5 sm:px-3 sm:py-2 text-white flex items-center text-xs sm:text-sm ${
                    isRunButtonDisabled ? 'bg-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
                aria-label="Run Project"
              >
                <i className="fas fa-play sm:mr-1"></i><span className="hidden sm:inline">Run</span>
              </button>
            )
          )}

          {onStartStepThrough && onProcessNextStep && (
            <button
                onClick={isSteppingActive ? onProcessNextStep : onStartStepThrough}
                disabled={isStepButtonDisabled}
                className={`rounded-md px-2 py-1.5 sm:px-3 sm:py-2 text-white flex items-center text-xs sm:text-sm ${
                    isStepButtonDisabled
                        ? 'bg-slate-500 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-700'
                }`}
                aria-label={stepButtonText}
                title={stepButtonText}
            >
                <i className={`${stepButtonIcon} ${isMobile && stepButtonText !== "Step" ? "" : "sm:mr-1"}`}></i>
                <span className={`hidden ${isMobile && stepButtonText !== "Step" ? "" : "sm:inline"}`}>{stepButtonText}</span>
            </button>
          )}
          
          {isMobile ? (
            <div className="relative" ref={moreMenuRef}>
              <button 
                onClick={toggleMoreMenu}
                className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="More options"
              >
                <i className="fas fa-ellipsis-v fa-lg"></i>
              </button>
              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-lg py-1 z-40">
                  <button
                    onClick={() => { setIsAppSettingsModalOpen(true); setIsMoreMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
                  >
                    <i className="fas fa-cog mr-2"></i>App Settings
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsAppSettingsModalOpen(true)}
              className="rounded-md bg-slate-700 px-3 py-2 sm:px-4 text-slate-200 hover:bg-slate-600 flex items-center text-sm"
              aria-label="Application Settings"
            >
              <i className="fas fa-cog mr-1 sm:mr-2"></i><span className="hidden sm:inline">Settings</span>
            </button>
          )}
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
