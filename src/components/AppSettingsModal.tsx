// src/components/AppSettingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { LLMProvider, type AppSettings, type AppSettingsModalProps } from '../types'; // Updated path
import { DEFAULT_APP_SETTINGS, ALLOWED_CHATGPT_TEXT_MODELS } from '../constants'; // Updated path

interface OllamaModelInfo {
  name: string;
  // eslint-disable-next-line camelcase
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    // eslint-disable-next-line camelcase
    parameter_size: string;
    // eslint-disable-next-line camelcase
    quantization_level: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaModelInfo[];
}

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ settings, isOpen, onClose, onSave }) => {
  const [editableSettings, setEditableSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const [ollamaModelsList, setOllamaModelsList] = useState<string[]>([]);
  const [isFetchingOllamaModels, setIsFetchingOllamaModels] = useState<boolean>(false);
  const [ollamaFetchError, setOllamaFetchError] = useState<string | null>(null);

  const [chatGptModelsList, setChatGptModelsList] = useState<string[]>([]);
  const [isFetchingChatGptModels, setIsFetchingChatGptModels] = useState<boolean>(false);
  const [chatGptFetchError, setChatGptFetchError] = useState<string | null>(null);

  useEffect(() => {
    const initialSettings = { ...DEFAULT_APP_SETTINGS, ...settings };
    setEditableSettings(initialSettings);

    if (!isOpen) { 
      setOllamaModelsList([]);
      setIsFetchingOllamaModels(false);
      setOllamaFetchError(null);
      setChatGptModelsList([]);
      setIsFetchingChatGptModels(false);
      setChatGptFetchError(null);
    }
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

    setEditableSettings(prev => {
      const newSettings = { ...prev, [name]: processedValue };

      if (name === 'ollamaBaseUrl' && prev.ollamaBaseUrl !== processedValue) {
        setOllamaModelsList([]);
        newSettings.ollamaModel = '';
        setOllamaFetchError(null);
      }

      if (name === 'llmProvider') {
        const newProvider = processedValue as LLMProvider;
        if (prev.llmProvider === LLMProvider.OLLAMA && newProvider !== LLMProvider.OLLAMA) {
          setOllamaModelsList([]);
          setOllamaFetchError(null);
          setIsFetchingOllamaModels(false);
        }
        if (prev.llmProvider === LLMProvider.CHATGPT && newProvider !== LLMProvider.CHATGPT) {
          setChatGptModelsList([]);
          setChatGptFetchError(null);
          setIsFetchingChatGptModels(false);
        }
        
        if (newProvider === LLMProvider.CHATGPT) {
            if (chatGptModelsList.length > 0 && !chatGptModelsList.includes(newSettings.chatGptModel) ) {
                 newSettings.chatGptModel = chatGptModelsList[0];
            } else if (chatGptModelsList.length === 0) {
                newSettings.chatGptModel = '';
            }
        } else if (newProvider === LLMProvider.OLLAMA) {
             if (ollamaModelsList.length > 0 && !ollamaModelsList.includes(newSettings.ollamaModel) ) {
                 newSettings.ollamaModel = ollamaModelsList[0];
            } else if (ollamaModelsList.length === 0) {
                newSettings.ollamaModel = '';
            }
        }
      }
      return newSettings;
    });
  };

  const handleFetchChatGptModels = useCallback(async () => {
    setIsFetchingChatGptModels(true);
    setChatGptFetchError(null);
    setChatGptModelsList([]);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const modelNames = [...ALLOWED_CHATGPT_TEXT_MODELS].sort();
      setChatGptModelsList(modelNames);
      if (modelNames.length > 0) {
        setEditableSettings(prev => {
           const currentChatGptModel = prev.chatGptModel;
           if (!modelNames.includes(currentChatGptModel) || !currentChatGptModel) {
            return { ...prev, chatGptModel: modelNames[0] };
           }
           return prev;
        });
      } else {
         setChatGptFetchError("No predefined ChatGPT models found.");
         setEditableSettings(prev => ({ ...prev, chatGptModel: '' }));
      }
    } catch (error) {
      console.error("Error 'fetching' ChatGPT models:", error);
      setChatGptFetchError(error instanceof Error ? error.message : "An unknown error occurred.");
      setEditableSettings(prev => ({ ...prev, chatGptModel: '' }));
    } finally {
      setIsFetchingChatGptModels(false);
    }
  }, []);

  const handleFetchOllamaModels = useCallback(async (baseUrl?: string) => {
    const urlToFetch = baseUrl || editableSettings.ollamaBaseUrl;
    if (!urlToFetch) {
      setOllamaFetchError("Ollama Base URL is not set.");
      return;
    }
    setIsFetchingOllamaModels(true);
    setOllamaFetchError(null);
    setOllamaModelsList([]);
    try {
      const response = await fetch(`${urlToFetch.replace(/\/$/, '')}/api/tags`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch Ollama models: ${response.status} ${response.statusText}. ${errorText}`);
      }
      const data: OllamaTagsResponse = await response.json();
      const modelNames = data.models.map(m => m.name).sort();
      setOllamaModelsList(modelNames);
      if (modelNames.length > 0) {
        setEditableSettings(prev => {
           const currentOllamaModel = prev.ollamaModel;
           if (!modelNames.includes(currentOllamaModel) || !currentOllamaModel) {
            return { ...prev, ollamaModel: modelNames[0] };
           }
           return prev;
        });
      } else {
         setOllamaFetchError("No models found at this Ollama instance.");
         setEditableSettings(prev => ({ ...prev, ollamaModel: '' }));
      }
    } catch (error) {
      console.error("Error fetching Ollama models:", error);
      setOllamaFetchError(error instanceof Error ? error.message : "An unknown error occurred while fetching models.");
      setEditableSettings(prev => ({ ...prev, ollamaModel: '' }));
    } finally {
      setIsFetchingOllamaModels(false);
    }
  }, [editableSettings.ollamaBaseUrl]);

  const handleSave = () => {
    onSave(editableSettings);
    onClose(); 
  };

  if (!isOpen) return null;

  const currentProvider = editableSettings.llmProvider;
  let tempMax = "1";
  if (currentProvider === LLMProvider.CHATGPT) tempMax = "2";

  const footerContent = (
    <>
      <button
        onClick={handleSave}
        className="inline-flex w-full justify-center rounded-md bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:ml-3 sm:w-auto sm:text-sm"
      >
        Save App Settings
      </button>
      <button
        type="button"
        className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        onClick={onClose}
      >
        Close
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings" footerContent={footerContent}>
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
            <option value={LLMProvider.CHATGPT}>ChatGPT (OpenAI)</option>
            <option value={LLMProvider.OLLAMA}>Ollama (Local)</option>
          </select>
        </div>

        {editableSettings.llmProvider === LLMProvider.CHATGPT && (
          <div className="space-y-4 p-4 border border-slate-700 rounded-md">
            <h4 className="text-md font-semibold text-sky-400">ChatGPT Configuration</h4>
            <div>
              <label htmlFor="chatGptApiKey" className="block text-sm font-medium">ChatGPT API Key</label>
              <input
                type="password"
                name="chatGptApiKey"
                id="chatGptApiKey"
                value={editableSettings.chatGptApiKey}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                placeholder="Enter your OpenAI API Key (sk-...)"
              />
               <p className="mt-1 text-xs text-slate-400">
                Your API key is stored in your browser's local storage.
                Refer to the <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">OpenAI API Keys page</a> for how to get an API key.
              </p>
              <p className="mt-1 text-xs text-slate-400">
              <strong>Warning:</strong> Check the <a href="https://openai.com/api/pricing/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">cost of tokens</a> for the model you want to use.
              </p>
            </div>
            <div>
              <label htmlFor="chatGptModel" className="block text-sm font-medium">ChatGPT Model</label>
              <div className="flex items-center space-x-2 mt-1">
                <select
                  name="chatGptModel"
                  id="chatGptModel"
                  value={editableSettings.chatGptModel}
                  onChange={handleChange}
                  className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                  aria-describedby="chatgpt-model-description"
                  disabled={isFetchingChatGptModels || (chatGptModelsList.length === 0 && !chatGptFetchError)}
                >
                  {isFetchingChatGptModels && <option value="">Loading models...</option>}
                  {!isFetchingChatGptModels && chatGptModelsList.length === 0 && !chatGptFetchError && <option value="">Click "Fetch" to load models</option>}
                  {!isFetchingChatGptModels && chatGptModelsList.length === 0 && chatGptFetchError && <option value="">No models found or error</option>}
                  {chatGptModelsList.map(modelName => (
                    <option key={modelName} value={modelName}>{modelName}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleFetchChatGptModels}
                  disabled={isFetchingChatGptModels}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 disabled:bg-slate-500 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isFetchingChatGptModels ? (
                    <i className="fas fa-spinner fa-spin mr-1"></i>
                  ) : (
                    <i className="fas fa-sync-alt mr-1"></i>
                  )}
                  Fetch
                </button>
              </div>
              {chatGptFetchError && <p className="mt-1 text-xs text-red-400">{chatGptFetchError}</p>}
              <p id="chatgpt-model-description" className="mt-1 text-xs text-slate-400">
                Click "Fetch" to load available ChatGPT models.
              </p>
            </div>
          </div>
        )}

        {editableSettings.llmProvider === LLMProvider.OLLAMA && (
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
              <div className="flex items-center space-x-2 mt-1">
                <select
                  name="ollamaModel"
                  id="ollamaModel"
                  value={editableSettings.ollamaModel}
                  onChange={handleChange}
                  className="block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                  disabled={isFetchingOllamaModels || (ollamaModelsList.length === 0 && !ollamaFetchError)}
                >
                  {isFetchingOllamaModels && <option value="">Loading models...</option>}
                  {!isFetchingOllamaModels && ollamaModelsList.length === 0 && !ollamaFetchError && <option value="">Click "Fetch" to load models</option>}
                  {!isFetchingOllamaModels && ollamaModelsList.length === 0 && ollamaFetchError && <option value="">No models found or error</option>}
                  {ollamaModelsList.map(modelName => (
                    <option key={modelName} value={modelName}>{modelName}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleFetchOllamaModels()}
                  disabled={isFetchingOllamaModels || !editableSettings.ollamaBaseUrl}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 disabled:bg-slate-500 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isFetchingOllamaModels ? (
                    <i className="fas fa-spinner fa-spin mr-1"></i>
                  ) : (
                    <i className="fas fa-sync-alt mr-1"></i>
                  )}
                  Fetch
                </button>
              </div>
              {ollamaFetchError && <p className="mt-1 text-xs text-red-400">{ollamaFetchError}</p>}
               <p className="mt-1 text-xs text-slate-400">Ensure Ollama is running and accessible at the Base URL. Then, fetch available models.</p>
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
              <label htmlFor="temperature" className="block text-sm font-medium">Temperature (0.0 - {tempMax})</label>
              <input
                type="number"
                name="temperature"
                id="temperature"
                value={editableSettings.temperature}
                onChange={handleChange}
                step="0.1"
                min="0"
                max={tempMax}
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-slate-400">Controls randomness. Lower is more deterministic. OpenAI uses 0-2, Ollama typically 0-1.</p>
            </div>
            <div>
              <label htmlFor="topP" className="block text-sm font-medium">Top P (0.0 - 1.0)</label>
              <input
                type="number"
                name="topP"
                id="topP"
                value={editableSettings.topP}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="1"
                className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-slate-400">Nucleus sampling: considers tokens with top_p probability mass.</p>
            </div>
            { (editableSettings.llmProvider === LLMProvider.OLLAMA) && (
                 <div>
                    <label htmlFor="topK" className="block text-sm font-medium">Top K</label>
                    <input type="number" name="topK" id="topK" value={editableSettings.topK} onChange={handleChange} step="1" min="1" className="mt-1 block w-full rounded-md border-slate-600 bg-slate-700 p-2 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                    <p className="mt-1 text-xs text-slate-400">Limit the selection pool to a fixed number of most likely options (Ollama).</p>
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default AppSettingsModal;
