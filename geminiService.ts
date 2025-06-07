// llmService.ts (This comment was in the original user-provided geminiService.ts)
// import { GoogleGenAI, GenerateContentResponse } from "@google/genai"; // Removed @google/genai import
import { AppSettings, LLMExecutePromptResponse, LLMUsageMetadata, LLMProvider } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
    // Note: top_k is not typically used with OpenAI's chat completions API directly in this manner.
    // It's more common in completion endpoints or some other providers.
    // If you need to include it, ensure it's supported by the specific model/API version.
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
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      let errorMessage = `ChatGPT API request failed with status ${response.status}`;
      if (errorBody && errorBody.error && errorBody.error.message) {
        errorMessage += `: ${errorBody.error.message}`;
      } else if (typeof errorBody.message === 'string') {
        errorMessage += `: ${errorBody.message}`;
      }

      if (response.status === 401) {
        throw new Error(`ChatGPT API Error: API key is invalid or not authorized. Please check your API key in Application Settings. Original: ${errorMessage}`);
      }
      if (response.status === 429) {
        throw new Error(`ChatGPT API Error: Rate limit exceeded. Please check your OpenAI plan and usage. Original: ${errorMessage}`);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

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

// Removed executeGeminiPrompt function
/*
const executeGeminiPrompt = async (prompt: string, settings: AppSettings): Promise<LLMExecutePromptResponse> => {
  // API key is expected to be in process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!settings.geminiModel) { // This line caused an error because geminiModel is removed from AppSettings
    throw new Error('Gemini API Error: Model name is not selected. Please select a model in Application Settings.');
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: settings.geminiModel, // This line caused an error
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
        if (error.message.includes("API key not valid") || error.message.toLowerCase().includes("api_key_invalid") || error.message.includes("permission denied") || error.message.includes("API_KEY_INVALID")) {
             throw new Error(`Gemini API Error: API key issue. Please ensure API_KEY is correctly configured in the environment. Original: ${error.message}`);
        }
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};
*/

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
  if (settings.llmProvider === LLMProvider.CHATGPT) {
    return executeChatGptPrompt(prompt, settings);
  } 
  // else if (settings.llmProvider === LLMProvider.GEMINI) { // This block caused an error as LLMProvider.GEMINI is removed
  //   return executeGeminiPrompt(prompt, settings);
  // } 
  else if (settings.llmProvider === LLMProvider.OLLAMA) {
    return executeOllamaPrompt(prompt, settings);
  } else {
    // This case should ideally not be reached if llmProvider is correctly typed and handled
    console.error(`Unsupported LLM provider: ${settings.llmProvider}`);
    throw new Error(`Unsupported LLM provider: ${settings.llmProvider}`);
  }
};
