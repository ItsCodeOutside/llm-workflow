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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900 bg-opacity-75 transition-opacity" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        {/* Background overlay, click to close */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0"></div> {/* Removed bg-gray-500 opacity-75, handled by parent */}
        </div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className={`inline-block transform overflow-hidden rounded-lg bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full ${widthClass} sm:align-middle`}>
          <div className="bg-slate-800 px-4 pb-4 pt-5 sm:p-6">
            <div className="sm:flex sm:items-start">
              {/* Icon can be added here if needed */}
              <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-slate-100" id="modal-title">
                  {title}
                </h3>
                <div className="mt-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default Modal;
