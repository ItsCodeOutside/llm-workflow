// src/components/editor/Sidebar.tsx
import React from 'react';
import { NodeType, type SidebarProps } from '../../types'; // Updated path
import { useIsMobile } from '../../hooks/useIsMobile'; 

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
  const nodeButtonClasses = "mb-2"; 
  const actionButtonClasses = "bg-slate-700 hover:bg-slate-600 text-slate-200 mb-2"; 
  const destructiveButtonClasses = "bg-red-700 hover:bg-red-600 text-white"; 

  const iconMargin = "mr-2 sm:mr-3";

  if (isMobile) {
    return (
      <>
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          ></div>
        )}
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
            <button onClick={() => { onAddNode(NodeType.JAVASCRIPT); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-purple-600 hover:bg-purple-700`}><i className={`fas fa-code ${iconMargin}`}></i>Add JavaScript</button>
            <button onClick={() => { onAddNode(NodeType.PARALLEL); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-rose-600 hover:bg-rose-700`}><i className={`fas fa-project-diagram ${iconMargin}`}></i>Add Parallel</button>
            <button onClick={() => { onAddNode(NodeType.SYNCHRONIZE); toggleSidebar(); }} className={`${commonButtonClasses} ${nodeButtonClasses} bg-lime-600 hover:bg-lime-700`}><i className={`fas fa-hourglass-half ${iconMargin}`}></i>Add Synchronize</button>
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
             <button onClick={() => { onOpenHelpModal(); toggleSidebar(); }} className={`${commonButtonClasses} ${actionButtonClasses} bg-blue-600 hover:bg-blue-700`}><i className={`fas fa-question-circle ${iconMargin}`}></i>Help</button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop/Non-Mobile Sidebar (always visible or collapsible based on isSidebarOpen)
  return (
    <div className="relative bg-slate-800 shadow-xl">
      <aside 
        className={`flex flex-col custom-scroll transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'w-60 p-4 space-y-3' : 'w-0 p-0 opacity-0 overflow-hidden'}`}
      >
        {isSidebarOpen && (
          <>
            <div>
              <h3 
                className="text-lg font-semibold text-slate-100 mb-3 cursor-pointer select-none" 
                onClick={toggleSidebar}
                title="Collapse Sidebar"
                style={{ userSelect: 'none' }}
              >
                <i className={`fas ${isSidebarOpen ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i> Node Tools
              </h3>
              <button onClick={() => onAddNode(NodeType.PROMPT)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-sky-600 hover:bg-sky-700`}><i className={`fas fa-comment-dots ${iconMargin}`}></i>Add Prompt</button>
              <button onClick={() => onAddNode(NodeType.CONDITIONAL)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-amber-600 hover:bg-amber-700`}><i className={`fas fa-code-branch ${iconMargin}`}></i>Add Conditional</button>
              <button onClick={() => onAddNode(NodeType.VARIABLE)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-teal-600 hover:bg-teal-700`}><i className={`fas fa-database ${iconMargin}`}></i>Add Variable</button>
              <button onClick={() => onAddNode(NodeType.QUESTION)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-cyan-600 hover:bg-cyan-700`}><i className={`fas fa-question ${iconMargin}`}></i>Add Question</button>
              <button onClick={() => onAddNode(NodeType.JAVASCRIPT)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-purple-600 hover:bg-purple-700`}><i className={`fas fa-code ${iconMargin}`}></i>Add JavaScript</button>
              <button onClick={() => onAddNode(NodeType.PARALLEL)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-rose-600 hover:bg-rose-700`}><i className={`fas fa-project-diagram ${iconMargin}`}></i>Add Parallel</button>
              <button onClick={() => onAddNode(NodeType.SYNCHRONIZE)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-lime-600 hover:bg-lime-700`}><i className={`fas fa-hourglass-half ${iconMargin}`}></i>Add Synchronize</button>
              <button onClick={() => onAddNode(NodeType.CONCLUSION)} className={`${commonButtonClasses} ${nodeButtonClasses} bg-indigo-600 hover:bg-indigo-700`}><i className={`fas fa-flag-checkered ${iconMargin}`}></i>Add Conclusion</button>
              
              <hr className="border-slate-700 my-4" />
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Project Actions</h3>
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
              <button onClick={onOpenHelpModal} className={`${commonButtonClasses} ${actionButtonClasses} bg-blue-600 hover:bg-blue-700`}><i className={`fas fa-question-circle ${iconMargin}`}></i>Help</button>
            </div>
          </>
        )}
      </aside>
      {/* Toggle button rendered outside the aside so it is always visible */}
      {!isMobile && !isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 left-0 -translate-y-1/2 w-6 h-16 bg-slate-700 hover:bg-slate-600 text-white rounded-r-md flex items-center justify-center focus:outline-none z-50"
          title="Expand Sidebar"
          aria-label="Expand Sidebar"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      )}
    </div>
  );
};

export default Sidebar;