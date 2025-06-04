
// src/components/AppSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { AppSettings, AppSettingsModalProps } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ settings, isOpen, onClose, onSave }) => {
  const [editableSettings, setEditableSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

  useEffect(() => {
    // When the modal opens or the external settings prop changes, update local editable state
    // This ensures the modal reflects the current app settings when opened.
    // If the user makes changes, they are local to editableSettings until saved.
    setEditableSettings(prev => ({ ...DEFAULT_APP_SETTINGS, ...settings }));
  }, [settings, isOpen]); // Re-sync if modal is re-opened or settings prop changes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: string | number = value;
    if (type === 'number') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) { 
         if (name === 'temperature' || name === 'topP') processedValue = 0;
         else if (name === 'topK') processedValue = 1;
      }
    }

    setEditableSettings(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };
  
  const handleSave = () => {
    // Only when "Save App Settings" is clicked, call onSave with the locally edited settings
    onSave(editableSettings);
    // onClose(); // Parent component usually handles closing after save
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings">
      <div className="space-y-4 text-slate-300">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium">Gemini API Key</label>
          <div className="relative mt-1">
            <input 
              type={isApiKeyVisible ? "text" : "password"}
              name="apiKey" 
              id="apiKey" 
              value={editableSettings.apiKey || ''} 
              onChange={handleChange} 
              className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm pr-10" 
              placeholder="Enter your Gemini API Key"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
              aria-label={isApiKeyVisible ? "Hide API key" : "Show API key"}
            >
              <i className={`fas ${isApiKeyVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
           <p className="mt-1 text-xs text-slate-400">Your API key is stored locally in your browser.</p>
        </div>
        <div>
          <label htmlFor="geminiModel" className="block text-sm font-medium">Gemini Model</label>
          <select name="geminiModel" id="geminiModel" value={editableSettings.geminiModel} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm">
            <option value="gemini-2.5-flash-preview-04-17">gemini-2.5-flash-preview-04-17</option>
          </select>
        </div>
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium">Temperature (0.0 - 1.0)</label>
          <input type="number" name="temperature" id="temperature" value={editableSettings.temperature} onChange={handleChange} step="0.1" min="0" max="1" className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="topK" className="block text-sm font-medium">Top K</label>
          <input type="number" name="topK" id="topK" value={editableSettings.topK} onChange={handleChange} step="1" min="1" className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="topP" className="block text-sm font-medium">Top P (0.0 - 1.0)</label>
          <input type="number" name="topP" id="topP" value={editableSettings.topP} onChange={handleChange} step="0.01" min="0" max="1" className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
        </div>
        <button onClick={handleSave} className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">Save App Settings</button>
      </div>
    </Modal>
  );
};

export default AppSettingsModal;
