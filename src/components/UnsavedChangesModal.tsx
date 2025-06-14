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

  // Order for flex-row-reverse: Primary, Secondary, Tertiary
  // Visual order L-R: Tertiary, Secondary, Primary
  const footer = (
    <>
      {/* Primary Action: Save & Close (Rightmost on sm screens) */}
      <button
        onClick={onSaveAndClose}
        className="inline-flex w-full justify-center rounded-md bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:w-auto sm:text-sm"
      >
        Save & Close
      </button>
      {/* Secondary Action: Close without Saving (Middle on sm screens) */}
      <button
        onClick={onCloseWithoutSaving}
        className="mt-3 inline-flex w-full justify-center rounded-md bg-yellow-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
      >
        Close without Saving
      </button>
      {/* Tertiary Action: Cancel (Leftmost on sm screens) */}
      <button
        onClick={onClose} 
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
      >
        Cancel
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose} 
      title="Unsaved Changes"
      footerContent={footer}
    >
      <p className="text-slate-300">You have unsaved changes. What would you like to do?</p>
    </Modal>
  );
};

export default UnsavedChangesModal;
