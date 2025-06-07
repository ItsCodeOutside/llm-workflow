
// src/components/ExportProjectModal.tsx
import React, { useState } from 'react';
import Modal from './Modal';
import type { ExportProjectModalProps } from '../../types';

const ExportProjectModal: React.FC<ExportProjectModalProps> = ({ isOpen, onClose, projectJson, projectName }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(projectJson);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy project JSON:', err);
      setCopyStatus('failed');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const footerContent = (
    <>
      <button
        type="button"
        className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
        onClick={handleCopyToClipboard}
      >
        {copyStatus === 'copied' ? 'Copied!' : (copyStatus === 'failed' ? 'Copy Failed' : 'Copy to Clipboard')}
      </button>
      <button
        type="button"
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
        onClick={onClose}
      >
        Close
      </button>
    </>
  );
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Export Project: ${projectName}`} footerContent={footerContent} widthClass="sm:max-w-2xl">
      <div className="space-y-4 text-slate-300">
        <p>Copy the JSON below to export your project. You can then import it back into this application or store it externally.</p>
        <textarea
          readOnly
          value={projectJson}
          className="w-full h-64 p-2 rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono custom-scroll"
          aria-label="Project JSON content"
        />
         {copyStatus === 'failed' && <p className="text-xs text-red-400 text-center">Could not copy to clipboard. Please copy manually.</p>}
      </div>
    </Modal>
  );
};

export default ExportProjectModal;
