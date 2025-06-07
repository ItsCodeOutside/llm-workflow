
// llmService.ts
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AppSettings, LLMExecutePromptResponse, LLMUsageMetadata, LLMProvider } from './types';

const executeGeminiPrompt = async (prompt: string, settings: AppSettings): Promise<LLMExecutePromptResponse> => {
  if (!settings.geminiApiKey) {
    throw new Error("Gemini API Error: API key is missing. Please configure it in Application Settings.");
  }
  const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: prompt,
      config: {
        temperature: settings.temperature,
        topK: settings.topK,
        topP: settings.topP,
      }
    });
    
    const text = response.text;
    if (typeof text !== 'string') {
        console.warn("Gemini API response.text was not a string:", text);
        throw new Error('Received invalid or empty response from Gemini API.');
    }

    let extractedUsage: LLMUsageMetadata | undefined = undefined;
    if (response.usageMetadata) {
        extractedUsage = {
            promptTokenCount: response.usageMetadata.promptTokenCount,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
            totalTokenCount: response.usageMetadata.totalTokenCount,
        };
    }
    
    return { text, usageMetadata: extractedUsage };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid") || 
            error.message.toLowerCase().includes("api_key_invalid") || 
            error.message.includes("permission denied") ||
            error.message.toLowerCase().includes("api key is missing")) { // Catch our own error too
             throw new Error(`Gemini API Error: API key issue. Please check your API Key in Application Settings. Original: ${error.message}`);
        }
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};

const executeOllamaPrompt = async (prompt: string, settings: AppSettings): Promise<LLMExecutePromptResponse> => {
  const { ollamaBaseUrl, ollamaModel, ollamaKeepAlive, temperature, topK, topP } = settings;
  const endpoint = `${ollamaBaseUrl.replace(/\/$/, '')}/api/generate`;

  const payload = {
    model: ollamaModel,
    prompt: prompt,
    stream: false,
    keep_alive: ollamaKeepAlive,
    options: {
      temperature: temperature,
      top_k: topK,
      top_p: topP,
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    if (!data.response || typeof data.response !== 'string') {
      throw new Error('Received invalid or empty response from Ollama API.');
    }
    
    const usageMetadata: LLMUsageMetadata = {
      promptTokenCount: data.prompt_eval_count,
      candidatesTokenCount: data.eval_count,
      totalTokenCount: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    };

    return { text: data.response, usageMetadata };

  } catch (error) {
    console.error("Error calling Ollama API:", error);
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        throw new Error(`Ollama Network Error: Could not connect to Ollama server at ${ollamaBaseUrl}. Ensure it's running and the URL is correct.`);
      }
      throw new Error(`Ollama API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Ollama API.");
  }
};


export const executePrompt = async (prompt: string, settings: AppSettings): Promise<LLMExecutePromptResponse> => {
  if (settings.llmProvider === 'gemini') {
    return executeGeminiPrompt(prompt, settings);
  } else if (settings.llmProvider === 'ollama') {
    return executeOllamaPrompt(prompt, settings);
  } else {
    throw new Error(`Unsupported LLM provider: ${settings.llmProvider}`);
  }
};