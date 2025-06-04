// src/components/ConfirmationModal.tsx
import React from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode; // Allow JSX for message
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-600 hover:bg-red-700" // Default to red for destructive actions
}) => {
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    onConfirm();
    onClose(); // Close modal after confirmation
  };

  const footer = (
    <>
      <button 
        onClick={handleConfirm} 
        className={`inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-medium text-white ${confirmButtonClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:w-auto ${confirmButtonClass.includes('red') ? 'focus:ring-red-500' : 'focus:ring-sky-500'}`}
      >
        {confirmText}
      </button>
      <button 
        onClick={onClose} 
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:w-auto"
      >
        {cancelText}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footerContent={footer}>
      <div className="text-slate-300">
        {message}
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
