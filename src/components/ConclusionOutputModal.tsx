// src/components/ConclusionOutputModal.tsx
import React from 'react';
import Modal from './Modal';
import type { ConclusionOutputModalProps } from '../types'; // Updated path

const ConclusionOutputModal: React.FC<ConclusionOutputModalProps> = ({ isOpen, data, onClose }) => {
  if (!isOpen || !data) return null;

  const footerContent = (
    <button
      type="button"
      className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
      onClick={onClose}
    >
      Close
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={data.title}
      footerContent={footerContent}
      widthClass="sm:max-w-xl"
    >
      <div className="text-slate-300 max-h-[60vh] overflow-y-auto custom-scroll">
        <pre className="whitespace-pre-wrap break-all text-sm bg-slate-700 p-3 rounded-md">
          {data.content}
        </pre>
      </div>
    </Modal>
  );
};

export default ConclusionOutputModal;
