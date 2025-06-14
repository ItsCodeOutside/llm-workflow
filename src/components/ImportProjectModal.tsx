
// src/components/ImportProjectModal.tsx
import React, { useState } from 'react';
import Modal from './Modal';
import type { ImportProjectModalProps } from '../types';

const ImportProjectModal: React.FC<ImportProjectModalProps> = ({ isOpen, onClose, onImport, errorMessage }) => {
  const [jsonInput, setJsonInput] = useState('');

  const handleImportClick = () => {
    if (jsonInput.trim()) {
      onImport(jsonInput);
    }
  };

  const footerContent = (
    <>
      <button
        type="button"
        className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
        onClick={handleImportClick}
        disabled={!jsonInput.trim()}
      >
        Import Project
      </button>
      <button
        type="button"
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
        onClick={() => { setJsonInput(''); onClose();}} // Clear input on close
      >
        Cancel
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => { setJsonInput(''); onClose();}} title="Import Project" footerContent={footerContent} widthClass="sm:max-w-2xl">
      <div className="space-y-4 text-slate-300">
        <p>Paste the JSON data for the project you want to import below.</p>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste project JSON here..."
          className="w-full h-64 p-2 rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono custom-scroll"
          aria-label="Project JSON input area"
        />
        {errorMessage && (
          <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md border border-red-700">{errorMessage}</p>
        )}
      </div>
    </Modal>
  );
};

export default ImportProjectModal;