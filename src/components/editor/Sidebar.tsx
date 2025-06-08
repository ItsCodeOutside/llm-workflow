// src/components/editor/Sidebar.tsx
import React from 'react';
import { NodeType, type SidebarProps } from '../../../types';
import { useIsMobile } from '../../hooks/useIsMobile'; // Import useIsMobile

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
  const isMobile = useIsMobile();

  const commonButtonClasses = "w-full rounded px-3 py-2 text-sm text-white text-left flex items-center";
  const nodeButtonClasses = "mb-2"; // Applied to node type buttons
  const actionButtonClasses = "bg-slate-700 hover:bg-slate-600 text-slate-200 mb-2"; // Applied to project/app action buttons
  const destructiveButtonClasses = "bg-red-700 hover:bg-red-600 text-white"; // For close project

  const iconMargin = "mr-2 sm:mr-3";

  if (isMobile) {
    return (
      <>
        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          ></div>
        )}
        {/* Mobile Drawer */}
        <aside 
          className={`fixed top-0 left-0 h-full bg-slate-800 shadow-xl flex flex-col custom-scroll transition-transform duration-300 ease-in-out z-40
                      ${isSidebarOpen ? 'translate-x-0 w-64 p-4 space-y-3' : '-translate-x-full w-64 p-4 space-y-3'}`}
        >
           <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 self-end mb-2"
            aria-label="Close sidebar"
          >
            <i className="fas fa-times fa-lg"></i>
          </button>

          <div>
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Node Tools</h3>
            <button onClick={() => { onAddNode(NodeType.PROMPT); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-sky-600 hover:bg-sky-700`}><i className={`fas fa-comment-dots ${iconMargin}`}></i>Add Prompt</button>
            <button onClick={() => { onAddNode(NodeType.CONDITIONAL); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-amber-600 hover:bg-amber-700`}><i className={`fas fa-code-branch ${iconMargin}`}></i>Add Conditional</button>
            <button onClick={() => { onAddNode(NodeType.VARIABLE); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-teal-600 hover:bg-teal-700`}><i className={`fas fa-database ${iconMargin}`}></i>Add Variable</button>
            <button onClick={() => { onAddNode(NodeType.QUESTION); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-cyan-600 hover:bg-cyan-700`}><i className={`fas fa-question ${iconMargin}`}></i>Add Question</button>
            <button onClick={() => { onAddNode(NodeType.CONCLUSION); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-indigo-600 hover:bg-indigo-700`}><i className={`fas fa-flag-checkered ${iconMargin}`}></i>Add Conclusion</button>

            <hr className="border-slate-700 my-4" />
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Project Actions</h3>
            <button onClick={() => { onOpenProjectSettingsModal(); toggleSidebar(); }} className={`${commonButtonClasses} ${actionButtonClasses}`}><i className={`fas fa-sliders-h ${iconMargin}`}></i>Project Settings</button>
            <button onClick={() => { onOpenRunHistoryModal(); toggleSidebar(); }} className={`${commonButtonClasses} ${actionButtonClasses}`}><i className={`fas fa-history ${iconMargin}`}></i>Run History ({projectRunHistoryCount})</button>
          </div>

          <div className="mt-auto pt-4 space-y-2">
            <button
              onClick={() => { onCloseProject(); toggleSidebar(); }}
              disabled={isWorkflowRunning}
              className={`${commonButtonClasses} ${destructiveButtonClasses} disabled:bg-slate-500 disabled:cursor-not-allowed`}
            >
              <i className={`fas fa-times-circle ${iconMargin}`}></i>Close Project
            </button>
            <button
              onClick={() => { onOpenHelpModal(); toggleSidebar(); }}
              className={`${commonButtonClasses} ${actionButtonClasses}`}
            >
              <i className={`fas fa-question-circle ${iconMargin}`}></i>Help
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop Sidebar (existing logic, with minor class consistency)
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

      {isSidebarOpen ? (
        <>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Node Tools</h3>
            <button onClick={() => onAddNode(NodeType.PROMPT)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-sky-600 hover:bg-sky-700`}><i className={`fas fa-comment-dots ${iconMargin}`}></i>Add Prompt</button>
            <button onClick={() => onAddNode(NodeType.CONDITIONAL)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-amber-600 hover:bg-amber-700`}><i className={`fas fa-code-branch ${iconMargin}`}></i>Add Conditional</button>
            <button onClick={() => onAddNode(NodeType.VARIABLE)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-teal-600 hover:bg-teal-700`}><i className={`fas fa-database ${iconMargin}`}></i>Add Variable</button>
            <button onClick={() => onAddNode(NodeType.QUESTION)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-cyan-600 hover:bg-cyan-700`}><i className={`fas fa-question ${iconMargin}`}></i>Add Question</button>
            <button onClick={() => onAddNode(NodeType.CONCLUSION)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-indigo-600 hover:bg-indigo-700`}><i className={`fas fa-flag-checkered ${iconMargin}`}></i>Add Conclusion</button>

            <hr className="border-slate-700 my-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3">Project Actions</h3>
            <button onClick={onOpenProjectSettingsModal} className={`${commonButtonClasses} ${actionButtonClasses}`}><i className={`fas fa-sliders-h ${iconMargin}`}></i>Project Settings</button>
            <button onClick={onOpenRunHistoryModal} className={`${commonButtonClasses} ${actionButtonClasses}`}><i className={`fas fa-history ${iconMargin}`}></i>Run History ({projectRunHistoryCount})</button>
          </div>

          <div className="mt-auto pt-4 space-y-2">
            <button
              onClick={onCloseProject}
              disabled={isWorkflowRunning}
              className={`${commonButtonClasses} ${destructiveButtonClasses} disabled:bg-slate-500 disabled:cursor-not-allowed`}
            >
              <i className={`fas fa-times-circle ${iconMargin}`}></i>Close Project
            </button>
            <button
              onClick={onOpenHelpModal}
              className={`${commonButtonClasses} ${actionButtonClasses}`}
            >
              <i className={`fas fa-question-circle ${iconMargin}`}></i>Help
            </button>
          </div>
        </>
      ) : (
        // Collapsed icons for desktop
        <div className="flex flex-col space-y-3 mt-4 items-center">
            <button onClick={() => onAddNode(NodeType.PROMPT)} className="p-2 rounded-md bg-sky-600 text-white hover:bg-sky-700" title="Add Prompt Node"><i className="fas fa-comment-dots"></i></button>
            <button onClick={() => onAddNode(NodeType.CONDITIONAL)} className="p-2 rounded-md bg-amber-600 text-white hover:bg-amber-700" title="Add Conditional Node"><i className="fas fa-code-branch"></i></button>
            <button onClick={() => onAddNode(NodeType.VARIABLE)} className="p-2 rounded-md bg-teal-600 text-white hover:bg-teal-700" title="Add Variable Node"><i className="fas fa-database"></i></button>
            <button onClick={() => onAddNode(NodeType.QUESTION)} className="p-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700" title="Add Question Node"><i className="fas fa-question"></i></button>
            <button onClick={() => onAddNode(NodeType.CONCLUSION)} className="p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700" title="Add Conclusion Node"><i className="fas fa-flag-checkered"></i></button>
            <hr className="border-slate-700 w-4/5 my-2"/>
            <button onClick={onOpenProjectSettingsModal} className="p-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600" title="Project Settings"><i className="fas fa-sliders-h"></i></button>
            <button onClick={onOpenRunHistoryModal} className="p-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600" title={`View Run History (${projectRunHistoryCount})`}><i className="fas fa-history"></i></button>
            <div className="mt-auto flex flex-col space-y-3 items-center">
                <button onClick={onCloseProject} disabled={isWorkflowRunning} className="p-2 rounded-md bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:bg-slate-500 disabled:cursor-not-allowed" title="Close Project"><i className="fas fa-times-circle"></i></button>
                <button onClick={onOpenHelpModal} className="p-2 rounded-md bg-slate-600 text-slate-200 hover:bg-slate-500" title="Help"><i className="fas fa-question-circle"></i></button>
            </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;