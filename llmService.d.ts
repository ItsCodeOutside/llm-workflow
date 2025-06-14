import { AppSettings, LLMExecutePromptResponse } from './types';
export declare const executePrompt: (prompt: string, settings: AppSettings) => Promise<LLMExecutePromptResponse>;
