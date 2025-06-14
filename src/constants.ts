// src/constants.ts
import { AppSettings, LLMProvider, Node, NodeType } from './engineTypes';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  llmProvider: LLMProvider.OLLAMA, // Changed to Ollama
  temperature: 0.7,
  topK: 40, 
  topP: 0.95,
  chatGptModel: 'gpt-3.5-turbo',
  chatGptApiKey: '',
  ollamaBaseUrl: 'https://development.test',
  ollamaModel: 'gemma3:4b',
  ollamaKeepAlive: '1h',
};

export const ALLOWED_CHATGPT_TEXT_MODELS = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-4o'];

export const MAX_RUN_HISTORY = 20;
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 120;
export const GRID_CELL_SIZE = 20;
export const MAX_CLICK_MOVEMENT = 5;
export const MAX_PARALLEL_BRANCHES = 4; // Max branches for Parallel Node

export const LOCAL_STORAGE_PROJECTS_KEY = 'llmWorkflowProjects';
export const LOCAL_STORAGE_SETTINGS_KEY = 'llmWorkflowAppSettings';

export const NODE_COLORS: { [key: string]: string } = {
  [NodeType.START]: 'bg-green-600 hover:bg-green-700',
  [NodeType.PROMPT]: 'bg-sky-600 hover:bg-sky-700',
  [NodeType.CONDITIONAL]: 'bg-amber-600 hover:bg-amber-700',
  [NodeType.CONCLUSION]: 'bg-indigo-600 hover:bg-indigo-700',
  [NodeType.VARIABLE]: 'bg-teal-600 hover:bg-teal-700',
  [NodeType.QUESTION]: 'bg-cyan-600 hover:bg-cyan-700',
  [NodeType.JAVASCRIPT]: 'bg-purple-600 hover:bg-purple-700',
  [NodeType.PARALLEL]: 'bg-rose-600 hover:bg-rose-700', // Added Parallel color
  [NodeType.SYNCHRONIZE]: 'bg-lime-600 hover:bg-lime-700', // Added Synchronize color
  ERROR: 'bg-red-700',
  RUNNING: 'bg-purple-600 animate-pulse', // Consider a different running color or combine with existing
};

export const INITIAL_START_NODE_PROMPT = '';
export const INITIAL_NODE_NAME = '';
export const INITIAL_NODE_PROMPT = '';
export const INITIAL_CONCLUSION_NODE_TITLE = 'Final Output';
export const INITIAL_VARIABLE_NODE_NAME = 'myVariable'; 
export const INITIAL_QUESTION_NODE_PROMPT = 'Please provide your input:';
export const INITIAL_JAVASCRIPT_NODE_NAME = 'JavaScript Function';
export const INITIAL_JAVASCRIPT_NODE_CODE = 
`// Available variables:
// - previousOutput (string): Output from the previous node.
// - nodeVariables (object): Key-value pairs from Variable Nodes.
// - projectVariables (object): Key-value pairs from Project Settings.
// Your function must be an async function body.
// Example:
// const combinedOutput = \`Prev: \${previousOutput}, MyVar: \${nodeVariables.my_var || 'N/A'}\`;
// return combinedOutput;

return previousOutput;`;
export const INITIAL_PARALLEL_NODE_NAME = 'Parallel Split'; // Added
export const INITIAL_PARALLEL_NODE_DESCRIPTION = 'Executes multiple downstream paths concurrently.'; // Added
export const INITIAL_SYNCHRONIZE_NODE_NAME = 'Synchronize Paths'; // Added
export const INITIAL_SYNCHRONIZE_NODE_DESCRIPTION = 'Waits for parallel paths to complete before continuing.'; // Added
