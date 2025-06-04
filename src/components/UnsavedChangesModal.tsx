
// src/components/UnsavedChangesModal.tsx
import React from 'react';
import Modal from './Modal';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void; // For "Cancel" or clicking outside/escape
  onSaveAndClose: () => void;
  onCloseWithoutSaving: () => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onClose,
  onSaveAndClose,
  onCloseWithoutSaving,
}) => {
  if (!isOpen) return null;

  const footer = (
    <>
      <button
        onClick={onClose} // Cancel action
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:w-auto"
      >
        Cancel
      </button>
      <button
        onClick={onCloseWithoutSaving}
        className="ml-3 mt-3 inline-flex w-full justify-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:w-auto"
      >
        Close without Saving
      </button>
      <button
        onClick={onSaveAndClose}
        className="ml-3 mt-3 inline-flex w-full justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:w-auto"
      >
        Save & Close
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose} // Clicking overlay or escape should also trigger the cancel action
      title="Unsaved Changes"
      footerContent={footer}
    >
      <p className="text-slate-300">You have unsaved changes. What would you like to do?</p>
    </Modal>
  );
};

export default UnsavedChangesModal;
