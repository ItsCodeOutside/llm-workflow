"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_SYNCHRONIZE_NODE_DESCRIPTION = exports.INITIAL_SYNCHRONIZE_NODE_NAME = exports.INITIAL_PARALLEL_NODE_DESCRIPTION = exports.INITIAL_PARALLEL_NODE_NAME = exports.INITIAL_JAVASCRIPT_NODE_CODE = exports.INITIAL_JAVASCRIPT_NODE_NAME = exports.INITIAL_QUESTION_NODE_PROMPT = exports.INITIAL_VARIABLE_NODE_NAME = exports.INITIAL_CONCLUSION_NODE_TITLE = exports.INITIAL_NODE_PROMPT = exports.INITIAL_NODE_NAME = exports.INITIAL_START_NODE_PROMPT = exports.NODE_COLORS = exports.LOCAL_STORAGE_SETTINGS_KEY = exports.LOCAL_STORAGE_PROJECTS_KEY = exports.MAX_PARALLEL_BRANCHES = exports.MAX_CLICK_MOVEMENT = exports.GRID_CELL_SIZE = exports.NODE_HEIGHT = exports.NODE_WIDTH = exports.MAX_RUN_HISTORY = exports.ALLOWED_CHATGPT_TEXT_MODELS = exports.DEFAULT_APP_SETTINGS = void 0;
// constants.ts
const types_1 = require("./types");
exports.DEFAULT_APP_SETTINGS = {
    llmProvider: types_1.LLMProvider.OLLAMA, // Changed to Ollama
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    chatGptModel: 'gpt-3.5-turbo',
    chatGptApiKey: '',
    ollamaBaseUrl: 'https://development.test',
    ollamaModel: 'gemma3:4b',
    ollamaKeepAlive: '1h',
};
exports.ALLOWED_CHATGPT_TEXT_MODELS = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-4o'];
exports.MAX_RUN_HISTORY = 20;
exports.NODE_WIDTH = 200;
exports.NODE_HEIGHT = 120;
exports.GRID_CELL_SIZE = 20;
exports.MAX_CLICK_MOVEMENT = 5;
exports.MAX_PARALLEL_BRANCHES = 4; // Max branches for Parallel Node
exports.LOCAL_STORAGE_PROJECTS_KEY = 'llmWorkflowProjects';
exports.LOCAL_STORAGE_SETTINGS_KEY = 'llmWorkflowAppSettings';
exports.NODE_COLORS = {
    [types_1.NodeType.START]: 'bg-green-600 hover:bg-green-700',
    [types_1.NodeType.PROMPT]: 'bg-sky-600 hover:bg-sky-700',
    [types_1.NodeType.CONDITIONAL]: 'bg-amber-600 hover:bg-amber-700',
    [types_1.NodeType.CONCLUSION]: 'bg-indigo-600 hover:bg-indigo-700',
    [types_1.NodeType.VARIABLE]: 'bg-teal-600 hover:bg-teal-700',
    [types_1.NodeType.QUESTION]: 'bg-cyan-600 hover:bg-cyan-700',
    [types_1.NodeType.JAVASCRIPT]: 'bg-purple-600 hover:bg-purple-700',
    [types_1.NodeType.PARALLEL]: 'bg-rose-600 hover:bg-rose-700', // Added Parallel color
    [types_1.NodeType.SYNCHRONIZE]: 'bg-lime-600 hover:bg-lime-700', // Added Synchronize color
    ERROR: 'bg-red-700',
    RUNNING: 'bg-purple-600 animate-pulse', // Consider a different running color or combine with existing
};
exports.INITIAL_START_NODE_PROMPT = '';
exports.INITIAL_NODE_NAME = '';
exports.INITIAL_NODE_PROMPT = '';
exports.INITIAL_CONCLUSION_NODE_TITLE = 'Final Output';
exports.INITIAL_VARIABLE_NODE_NAME = 'myVariable';
exports.INITIAL_QUESTION_NODE_PROMPT = 'Please provide your input:';
exports.INITIAL_JAVASCRIPT_NODE_NAME = 'JavaScript Function';
exports.INITIAL_JAVASCRIPT_NODE_CODE = `// Available variables:
// - previousOutput (string): Output from the previous node.
// - nodeVariables (object): Key-value pairs from Variable Nodes.
// - projectVariables (object): Key-value pairs from Project Settings.
// Your function must be an async function body.
// Example:
// const combinedOutput = \`Prev: \${previousOutput}, MyVar: \${nodeVariables.my_var || 'N/A'}\`;
// return combinedOutput;

return previousOutput;`;
exports.INITIAL_PARALLEL_NODE_NAME = 'Parallel Split'; // Added
exports.INITIAL_PARALLEL_NODE_DESCRIPTION = 'Executes multiple downstream paths concurrently.'; // Added
exports.INITIAL_SYNCHRONIZE_NODE_NAME = 'Synchronize Paths'; // Added
exports.INITIAL_SYNCHRONIZE_NODE_DESCRIPTION = 'Waits for parallel paths to complete before continuing.'; // Added
