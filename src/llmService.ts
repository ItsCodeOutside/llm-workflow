// src/llmService.ts
import { AppSettings, LLMExecutePromptResponse, LLMUsageMetadata, LLMProvider } from './engineTypes';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Interfaces for OpenAI API
interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  // eslint-disable-next-line camelcase
  finish_reason: string;
}

interface OpenAIUsage {
  // eslint-disable-next-line camelcase
  prompt_tokens: number;
  // eslint-disable-next-line camelcase
  completion_tokens: number;
  // eslint-disable-next-line camelcase
  total_tokens: number;
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
  error?: { // Added for error responses
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

// Interfaces for Ollama API
interface OllamaGenerateResponse {
  model: string;
  // eslint-disable-next-line camelcase
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  // eslint-disable-next-line camelcase
  total_duration?: number;
  // eslint-disable-next-line camelcase
  load_duration?: number;
  // eslint-disable-next-line camelcase
  prompt_eval_count?: number;
  // eslint-disable-next-line camelcase
  prompt_eval_duration?: number;
  // eslint-disable-next-line camelcase
  eval_count?: number;
  // eslint-disable-next-line camelcase
  eval_duration?: number;
  error?: string; // For simple error messages from Ollama
}


const executeChatGptPrompt = async (prompt: string, settings: AppSettings): Promise<LLMExecutePromptResponse> => {
  if (!settings.chatGptApiKey) {
    throw new Error('ChatGPT API Error: API key is not set. Please configure it in Application Settings.');
  }
  if (!settings.chatGptModel) {
    throw new Error('ChatGPT API Error: Model name is not selected. Please select a model in Application Settings.');
  }

  const payload = {
    model: settings.chatGptModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: settings.temperature,
    top_p: settings.topP,
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.chatGptApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData: Partial<OpenAIChatCompletionResponse> = {}; // Use partial for error data
      try {
        errorData = await response.json() as OpenAIChatCompletionResponse;
      } catch (jsonError) {
        // If parsing error JSON fails, use statusText
      }
      
      let errorMessage = `ChatGPT API request failed with status ${response.status}`;
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage += `: ${errorData.error.message}`;
      } else {
         errorMessage += `: ${response.statusText}`;
      }
      
      if (response.status === 401) { 
        throw new Error(`ChatGPT API Error: API key is invalid or not authorized. Please check your API key in Application Settings. Original: ${errorMessage}`);
      }
      if (response.status === 429) { 
        throw new Error(`ChatGPT API Error: Rate limit exceeded. Please check your OpenAI plan and usage. Original: ${errorMessage}`);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json() as OpenAIChatCompletionResponse;

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Received invalid or empty response from ChatGPT API.');
    }
    
    const text = data.choices[0].message.content;
    let usageMetadata: LLMUsageMetadata | undefined = undefined;

    if (data.usage) {
      usageMetadata = {
        promptTokenCount: data.usage.prompt_tokens,
        candidatesTokenCount: data.usage.completion_tokens,
        totalTokenCount: data.usage.total_tokens,
      };
    }

    return { text, usageMetadata };

  } catch (error) {
    console.error("Error calling ChatGPT API:", error);
    if (error instanceof Error) {
      throw error; 
    }
    throw new Error("An unknown error occurred while communicating with the ChatGPT API.");
  }
};


const executeOllamaPrompt = async (prompt: string, settings: AppSettings): Promise<LLMExecutePromptResponse> => {
  const { ollamaBaseUrl, ollamaModel, ollamaKeepAlive, temperature, topK, topP } = settings;
  const endpoint = `${ollamaBaseUrl.replace(/\/$/, '')}/api/generate`;

  if (!ollamaModel) {
    throw new Error("Ollama API Error: Model name is not selected. Please select a model in Application Settings.");
  }

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
      let errorBodyText = response.statusText;
      try {
        const errorJson = await response.json() as OllamaGenerateResponse;
        if (errorJson.error) {
            errorBodyText = errorJson.error;
        }
      } catch (e) {
        // If JSON parsing fails, use the raw text if available, or fallback to statusText
        const rawText = await response.text().catch(() => response.statusText);
        errorBodyText = rawText || response.statusText;
      }
      throw new Error(`Ollama API request failed with status ${response.status}: ${errorBodyText}`);
    }

    const data = await response.json() as OllamaGenerateResponse;

    if (data.error) { // Check for error property in successful HTTP response from Ollama
        throw new Error(`Ollama API Error: ${data.error}`);
    }
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
  if (settings.llmProvider === LLMProvider.CHATGPT) {
    return executeChatGptPrompt(prompt, settings);
  } else if (settings.llmProvider === LLMProvider.OLLAMA) {
    return executeOllamaPrompt(prompt, settings);
  } 
  else {
    const exhaustiveCheck: never = settings.llmProvider;
    throw new Error(`Unsupported LLM provider: ${exhaustiveCheck}`);
  }
};
