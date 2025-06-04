
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AppSettings, GeminiExecutePromptResponse, GeminiUsageMetadata } from './types';

export const executePrompt = async (prompt: string, settings: AppSettings): Promise<GeminiExecutePromptResponse> => {
  if (!settings.apiKey) {
    console.error("Gemini API Key is not configured in App Settings.");
    throw new Error("Gemini API Key is not configured in App Settings. Please set it in the App Settings modal.");
  }

  const ai = new GoogleGenAI({ apiKey: settings.apiKey });

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

    // Extract token usage if available
    // Note: The exact structure of usageMetadata might vary or need specific type from SDK if available.
    // Based on general knowledge of Gemini API, it often includes totalTokenCount.
    const usageMetadata: GeminiUsageMetadata | undefined = response.candidates?.[0]?.tokenCount 
      ? { totalTokenCount: response.candidates[0].tokenCount } // if tokenCount is directly on candidate
      : (response as any).usageMetadata; // or if it's on the response object itself (more common for Vertex AI style)
                                        // The @google/genai SDK `GenerateContentResponse` should have `usageMetadata`
                                        // but it's not directly typed in current simplified `GenerateContentResponse` import.
                                        // Let's assume `response.usageMetadata` or extract from candidate if needed.
                                        // For @google/genai, `response.usageMetadata` should be present.
                                        // If `response.usageMetadata` is not directly available, we might need to dig into `response.candidates[0].usageMetadata`
                                        // The prompt stated that GenerateContentResponse.text is the way to get text.
                                        // The Gemini docs for the client library show `response.usageMetadata`.

    let extractedUsage: GeminiUsageMetadata | undefined = undefined;
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
        if (error.message.includes("API key not valid")) {
             throw new Error(`Gemini API Error: API key not valid. Please check your API key in App Settings. Original: ${error.message}`);
        }
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
};
