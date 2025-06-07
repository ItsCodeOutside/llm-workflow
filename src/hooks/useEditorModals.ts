// src/hooks/useEditorModals.ts
import { useState, useCallback } from 'react';
import React from 'react';

export const useEditorModals = () => {
  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] = useState(false);
  const [isRunHistoryModalOpen, setIsRunHistoryModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLlmErrorModalOpen, setIsLlmErrorModalOpen] = useState(false);
  const [llmErrorMessage, setLlmErrorMessage] = useState<React.ReactNode>('');

  const openProjectSettingsModal = useCallback(() => setIsProjectSettingsModalOpen(true), []);
  const closeProjectSettingsModal = useCallback(() => setIsProjectSettingsModalOpen(false), []);

  const openRunHistoryModal = useCallback(() => setIsRunHistoryModalOpen(true), []);
  const closeRunHistoryModal = useCallback(() => setIsRunHistoryModalOpen(false), []);

  const openHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
  const closeHelpModal = useCallback(() => setIsHelpModalOpen(false), []);

  const openLlmErrorModal = useCallback((message: React.ReactNode) => {
    setLlmErrorMessage(message);
    setIsLlmErrorModalOpen(true);
  }, []);
  const closeLlmErrorModal = useCallback(() => setIsLlmErrorModalOpen(false), []);

  return {
    isProjectSettingsModalOpen,
    openProjectSettingsModal,
    closeProjectSettingsModal,
    isRunHistoryModalOpen,
    openRunHistoryModal,
    closeRunHistoryModal,
    isHelpModalOpen,
    openHelpModal,
    closeHelpModal,
    isLlmErrorModalOpen,
    llmErrorMessage,
    openLlmErrorModal,
    closeLlmErrorModal,
  };
};
