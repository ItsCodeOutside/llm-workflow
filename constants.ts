
import { AppSettings, LLMProvider, Node, NodeType } from './types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  llmProvider: LLMProvider.CHATGPT, // Default to ChatGPT using enum
  temperature: 0.7,
  topK: 40, // Retained for Ollama
  topP: 0.95,

  // ChatGPT specific
  chatGptModel: 'gpt-3.5-turbo',
  chatGptApiKey: '',

  // Ollama specific
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  ollamaKeepAlive: '5m',

  // Gemini specific (Removed)
  // geminiModel: 'gemini-2.5-flash-preview-04-17', 
};

export const ALLOWED_CHATGPT_TEXT_MODELS = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-4o'];
// export const ALLOWED_GEMINI_TEXT_MODELS = ['gemini-2.5-flash-preview-04-17']; // Removed
// Future: Potentially add image models for relevant providers if supported


export const MAX_RUN_HISTORY = 20;
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 120;
export const GRID_CELL_SIZE = 20;
export const MAX_CLICK_MOVEMENT = 5;

export const LOCAL_STORAGE_PROJECTS_KEY = 'llmWorkflowProjects';
export const LOCAL_STORAGE_SETTINGS_KEY = 'llmWorkflowAppSettings';

export const NODE_COLORS: { [key: string]: string } = {
  START: 'bg-green-600 hover:bg-green-700',
  PROMPT: 'bg-sky-600 hover:bg-sky-700',
  CONDITIONAL: 'bg-amber-600 hover:bg-amber-700',
  CONCLUSION: 'bg-indigo-600 hover:bg-indigo-700',
  VARIABLE: 'bg-teal-600 hover:bg-teal-700',
  QUESTION: 'bg-cyan-600 hover:bg-cyan-700', // Added Question color
  ERROR: 'bg-red-700',
  RUNNING: 'bg-purple-600 animate-pulse',
};

export const INITIAL_START_NODE_PROMPT = '';
export const INITIAL_NODE_NAME = '';
export const INITIAL_NODE_PROMPT = '';
export const INITIAL_CONCLUSION_NODE_TITLE = 'Final Output';
export const INITIAL_VARIABLE_NODE_NAME = 'myVariable'; // Default name for Variable node
export const INITIAL_QUESTION_NODE_PROMPT = 'Please provide your input:'; // Default question for Question node
