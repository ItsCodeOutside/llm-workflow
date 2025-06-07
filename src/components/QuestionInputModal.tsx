
// src/components/QuestionInputModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { QuestionInputModalProps } from '../../types';

const QuestionInputModal: React.FC<QuestionInputModalProps> = ({ isOpen, questionText, onSubmit, onEndRun }) => {
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    // Reset answer when modal is opened for a new question
    if (isOpen) {
      setAnswer('');
    }
  }, [isOpen, questionText]);

  const handleSubmit = () => {
    onSubmit(answer);
  };

  const handleEndRun = () => {
    onEndRun();
  };

  if (!isOpen) return null;

  const footerContent = (
    <>
      <button
        type="button"
        onClick={handleSubmit}
        className="inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:w-auto sm:text-sm"
      >
        Submit
      </button>
      <button
        type="button"
        onClick={handleEndRun}
        className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
      >
        End Run
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={() => { /* Modal should only close via buttons */ }} title="User Input Required" footerContent={footerContent}>
      <div className="space-y-4 text-slate-300">
        <p className="text-sm whitespace-pre-wrap">{questionText}</p>
        <div>
          <label htmlFor="userInput" className="block text-sm font-medium">Your Answer:</label>
          <textarea
            id="userInput"
            name="userInput"
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm custom-scroll"
            placeholder="Enter your response here..."
          />
        </div>
      </div>
    </Modal>
  );
};

export default QuestionInputModal;
