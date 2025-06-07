
// src/components/editor/Sidebar.tsx
import React from 'react';
import { NodeType, type SidebarProps } from '../../../types';

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  toggleSidebar,
  onAddNode,
  onOpenProjectSettingsModal,
  onOpenRunHistoryModal,
  projectRunHistoryCount,
  onCloseProject,
  isWorkflowRunning,
  onOpenHelpModal,
}) => {
  return (
    <aside 
      className={`bg-slate-800 shadow-lg flex flex-col custom-scroll transition-all duration-300 ease-in-out
                  ${isSidebarOpen ? 'w-60 sm:w-64 p-3 sm:p-4 space-y-3' : 'w-16 sm:w-20 p-2 items-center'}`}
    >
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 self-stretch sm:self-auto"
        aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <i className={`fas fa-lg ${isSidebarOpen ? 'fa-angle-double-left' : 'fa-angle-double-right'}`}></i>
      </button>

      {isSidebarOpen && (
        <>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Node Tools</h3>
            <button onClick={() => onAddNode(NodeType.PROMPT)} className="w-full rounded bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700">Add Prompt Node</button>
            <button onClick={() => onAddNode(NodeType.CONDITIONAL)} className="w-full rounded bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 mt-2">Add Conditional Node</button>
            <button onClick={() => onAddNode(NodeType.VARIABLE)} className="w-full rounded bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 mt-2">Add Variable Node</button>
            <button onClick={() => onAddNode(NodeType.QUESTION)} className="w-full rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-700 mt-2">Add Question Node</button>
            <button onClick={() => onAddNode(NodeType.CONCLUSION)} className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 mt-2">Add Conclusion Node</button>

            <hr className="border-slate-700 my-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Project Actions</h3>
            <button onClick={onOpenProjectSettingsModal} className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">Project Settings</button>
            <button onClick={onOpenRunHistoryModal} className="w-full rounded bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 mt-2">View Run History ({projectRunHistoryCount})</button>
          </div>

          <div className="mt-auto pt-4 space-y-2">
            <button
              onClick={onCloseProject}
              disabled={isWorkflowRunning}
              className="w-full rounded bg-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-500 flex items-center justify-center disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
              <i className="fas fa-times-circle mr-2"></i>Close Project
            </button>
            <button
              onClick={onOpenHelpModal}
              className="w-full rounded bg-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-500 flex items-center justify-center"
            >
              <i className="fas fa-question-circle mr-2"></i>Help
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
