// src/components/Modal.tsx
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
  footerContent?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, widthClass = "sm:max-w-lg", footerContent }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900 bg-opacity-75 transition-opacity flex flex-col sm:items-center sm:justify-center" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
      onClick={(e) => {
        // Close on backdrop click only if the click is on the direct parent of the modal content area
        if (e.target === e.currentTarget) {
            onClose();
        }
      }}
    >
      {/* Modal Panel: Full screen on mobile, sized with widthClass on sm+ */}
      <div 
        className={`transform overflow-hidden sm:rounded-lg bg-slate-800 text-left shadow-xl transition-all w-full h-full flex flex-col sm:h-auto sm:my-8 sm:align-middle ${widthClass}`}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from propagating from content
      >
        {/* Header */}
        <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-700">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-slate-100" id="modal-title">
                {title}
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-slate-800 px-4 sm:p-6 flex-grow overflow-y-auto custom-scroll">
          <div className="mt-2"> {/* Ensure some spacing for children */}
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          {footerContent ? footerContent : (
               <button
               type="button"
               className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
               onClick={onClose}
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