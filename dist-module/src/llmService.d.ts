import { AppSettings, LLMExecutePromptResponse } from './engineTypes';
export declare const executePrompt: (prompt: string, settings: AppSettings) => Promise<LLMExecutePromptResponse>;
