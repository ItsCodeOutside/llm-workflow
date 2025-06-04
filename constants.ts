
import { AppSettings, Node, NodeType } from './types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  apiKey: '', 
  geminiModel: 'gemini-2.5-flash-preview-04-17',
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
};

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
  VARIABLE: 'bg-teal-600 hover:bg-teal-700', // Added Variable color
  ERROR: 'bg-red-700',
  RUNNING: 'bg-purple-600 animate-pulse',
};

export const INITIAL_START_NODE_PROMPT = ''; 
export const INITIAL_NODE_NAME = ''; 
export const INITIAL_NODE_PROMPT = ''; 
export const INITIAL_CONCLUSION_NODE_TITLE = 'Final Output'; 
export const INITIAL_VARIABLE_NODE_NAME = 'myVariable'; // Default name for Variable node
