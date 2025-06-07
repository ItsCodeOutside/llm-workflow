
// src/components/AppSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { AppSettings, AppSettingsModalProps, LLMProvider } from '../../types';
import { DEFAULT_APP_SETTINGS } from '../../constants';

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ settings, isOpen, onClose, onSave }) => {
  const [editableSettings, setEditableSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    // Ensure all keys from DEFAULT_APP_SETTINGS are present, then merge with potentially partial 'settings' from props
    const initialSettings = { ...DEFAULT_APP_SETTINGS, ...settings };
    setEditableSettings(initialSettings);
  }, [settings, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: string | number | LLMProvider = value;
    if (type === 'number') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) { 
         if (name === 'temperature' || name === 'topP') processedValue = 0;
         else if (name === 'topK') processedValue = 1;
      }
    } else if (name === 'llmProvider') {
      processedValue = value as LLMProvider;
    }


    setEditableSettings(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };
  
  const handleSave = () => {
    onSave(editableSettings);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings">
      <div className="space-y-4 text-slate-300">
        <div>
          <label htmlFor="llmProvider" className="block text-sm font-medium">LLM Provider</label>
          <select 
            name="llmProvider" 
            id="llmProvider" 
            value={editableSettings.llmProvider} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
          >
            <option value="gemini">Gemini</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>

        {editableSettings.llmProvider === 'gemini' && (
          <div className="space-y-4 p-4 border border-slate-700 rounded-md">
            <h4 className="text-md font-semibold text-sky-400">Gemini Configuration</h4>
            <div>
              <label htmlFor="geminiModel" className="block text-sm font-medium">Gemini Model</label>
              <select 
                name="geminiModel" 
                id="geminiModel" 
                value={editableSettings.geminiModel} 
                onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              >
                <option value="gemini-2.5-flash-preview-04-17">gemini-2.5-flash-preview-04-17</option>
                {/* Add other Gemini models here if needed */}
              </select>
            </div>
            <div>
              <label htmlFor="geminiApiKey" className="block text-sm font-medium">Gemini API Key</label>
              <input
                type="password"
                name="geminiApiKey"
                id="geminiApiKey"
                value={editableSettings.geminiApiKey || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                placeholder="Enter your Gemini API Key"
                aria-describedby="gemini-api-key-description"
              />
              <p id="gemini-api-key-description" className="mt-1 text-xs text-slate-400">
                Your API key is stored locally in your browser's local storage.
              </p>
            </div>
          </div>
        )}

        {editableSettings.llmProvider === 'ollama' && (
          <div className="space-y-4 p-4 border border-slate-700 rounded-md">
            <h4 className="text-md font-semibold text-sky-400">Ollama Configuration</h4>
            <div>
              <label htmlFor="ollamaBaseUrl" className="block text-sm font-medium">Ollama Base URL</label>
              <input 
                type="text" 
                name="ollamaBaseUrl" 
                id="ollamaBaseUrl" 
                value={editableSettings.ollamaBaseUrl} 
                onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" 
                placeholder="e.g., http://localhost:11434"
              />
            </div>
            <div>
              <label htmlFor="ollamaModel" className="block text-sm font-medium">Ollama Model Name</label>
              <input 
                type="text" 
                name="ollamaModel" 
                id="ollamaModel" 
                value={editableSettings.ollamaModel} 
                onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" 
                placeholder="e.g., llama3, codellama, mistral"
              />
            </div>
            <div>
              <label htmlFor="ollamaKeepAlive" className="block text-sm font-medium">Keep Alive Duration</label>
              <input 
                type="text" 
                name="ollamaKeepAlive" 
                id="ollamaKeepAlive" 
                value={editableSettings.ollamaKeepAlive} 
                onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" 
                placeholder="e.g., 5m, 1h, -1 (unlimited)"
              />
              <p className="mt-1 text-xs text-slate-400">How long Ollama keeps the model loaded. Use '5m' for 5 minutes, '1h' for 1 hour, '-1' for indefinitely.</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4 pt-4 border-t border-slate-700">
             <h4 className="text-md font-semibold text-slate-200">Common LLM Parameters</h4>
             <p className="text-xs text-slate-400 -mt-2">These settings apply to the selected LLM provider where applicable.</p>
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
        </div>

        <button onClick={handleSave} className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">Save App Settings</button>
      </div>
    </Modal>
  );
};

export default AppSettingsModal;