// src/components/Modal.tsx
import React, { useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
  footerContent?: React.ReactNode;
  isMaximized?: boolean; // New prop for maximization state
  onToggleMaximize?: () => void; // New prop for toggling maximization
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  widthClass = "sm:max-w-lg", 
  footerContent,
  isMaximized,
  onToggleMaximize 
}) => {
  const backdropMouseDownTargetRef = useRef<EventTarget | null>(null);

  if (!isOpen) return null;

  const modalPanelClasses = isMaximized 
    ? "w-full h-full sm:rounded-none bg-slate-800 text-left shadow-xl flex flex-col" // Maximized state
    : `transform overflow-hidden sm:rounded-lg bg-slate-800 text-left shadow-xl transition-all w-full h-full flex flex-col sm:h-auto sm:my-8 sm:align-middle ${widthClass}`; // Normal state

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      backdropMouseDownTargetRef.current = e.target;
    } else {
      // If mousedown is on a child of the backdrop (i.e., the modal panel or its contents),
      // we don't want to consider this a backdrop mousedown.
      backdropMouseDownTargetRef.current = null;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // A click event fires on mouseup.
    // We only close if the mousedown target was also the backdrop.
    if (e.target === e.currentTarget && backdropMouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
    // Always reset the mousedown target after a click attempt.
    backdropMouseDownTargetRef.current = null;
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900 bg-opacity-75 transition-opacity flex flex-col sm:items-center sm:justify-center" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div 
        className={modalPanelClasses}
        // Stop propagation for mousedown and click events on the modal panel itself.
        // This prevents these events from bubbling up to the backdrop and causing
        // an unintended close, especially if the mousedown was on the panel.
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Header */}
        <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-700 relative">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-slate-100" id="modal-title">
                {title}
              </h3>
            </div>
          </div>
          {onToggleMaximize && (
            <button 
              onClick={onToggleMaximize} 
              className="absolute top-3 right-12 sm:top-4 sm:right-14 p-2 text-slate-400 hover:text-slate-200 focus:outline-none rounded-full hover:bg-slate-700"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              <i className={`fas ${isMaximized ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
            </button>
          )}
           <button 
            onClick={onClose} // This close button is explicit and should work as expected
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-200 focus:outline-none rounded-full hover:bg-slate-700"
            aria-label="Close modal"
           >
             <i className="fas fa-times"></i>
           </button>
        </div>

        {/* Body */}
        <div className={`bg-slate-800 px-4 sm:p-6 flex-grow overflow-y-auto custom-scroll ${isMaximized ? 'h-0' : ''}`}> {/* h-0 on maximized allows flex-grow to take full space */}
          <div className="mt-2">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          {footerContent ? footerContent : (
               <button
               type="button"
               className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
               onClick={onClose} // This close button is explicit
             >
               Close
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
