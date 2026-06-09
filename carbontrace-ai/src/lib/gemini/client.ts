import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentRequest,
  GenerateContentResult,
  ChatSession,
} from "@google/generative-ai";
import { VertexAI } from "@google-cloud/vertexai";

const MODEL_NAME = "gemini-3.5-flash";
const FALLBACK_MODEL_NAME = "gemini-1.5-flash";

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

class GeminiClientSingleton {
  private primaryClient: GoogleGenerativeAI;
  private vertexAi?: VertexAI;

  constructor() {
    this.primaryClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
  }

  /**
   * Helper to delay execution (exponential backoff)
   */
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Centralized retry logic with exponential backoff for 429 and 503 errors
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        const status = error?.status || error?.response?.status;
        if ((status === 429 || status === 503) && attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          console.warn(`Gemini API rate limit/unavailable (attempt ${attempt}). Retrying in ${backoff}ms...`);
          await this.delay(backoff);
          continue;
        }
        throw error; // Re-throw if not 429/503 or max retries reached
      }
    }
    throw new Error("Max retries exceeded");
  }

  /**
   * Log token usage if in development environment
   */
  private logTokenUsage(result: GenerateContentResult, operationName: string) {
    if (process.env.NODE_ENV === "development" && result.response.usageMetadata) {
      console.log(`[Gemini Token Usage - ${operationName}]:`, result.response.usageMetadata);
    }
  }

  /**
   * Initializes the Vertex AI fallback client if not already initialized
   */
  private getVertexClient() {
    if (!this.vertexAi) {
      this.vertexAi = new VertexAI({
        project: process.env.VERTEX_AI_PROJECT || "carbontrace-ai",
        location: process.env.VERTEX_AI_LOCATION || "us-central1",
      });
    }
    return this.vertexAi;
  }

  /**
   * Core generate content method with primary and fallback support
   */
  async generateContent(request: GenerateContentRequest, isVision: boolean = false): Promise<GenerateContentResult> {
    return this.withRetry(async () => {
      try {
        // Try Primary (Google Generative AI Developer API)
        const model = this.primaryClient.getGenerativeModel({
          model: MODEL_NAME,
          safetySettings,
        });
        const result = await model.generateContent(request);
        this.logTokenUsage(result, "generateContent");
        return result;
      } catch (primaryError: any) {
        console.warn("Primary Gemini client failed. Checking if fallback is needed.", primaryError.message);
        
        // If it's a 4xx error (other than 429) it's likely a bad request, not a service outage. 
        // But if the model name is not found (e.g. 3.5 doesn't exist), we should fallback to 1.5.
        const isModelNotFoundError = primaryError.message?.includes("models/gemini-3.5-flash is not found");
        const useFallbackModel = isModelNotFoundError ? FALLBACK_MODEL_NAME : MODEL_NAME;

        try {
          console.log(`Attempting fallback using Vertex AI with model: ${useFallbackModel}...`);
          const vertex = this.getVertexClient();
          const vertexModel = vertex.getGenerativeModel({
            model: useFallbackModel,
            safetySettings: safetySettings as any,
          });
          const vertexResult = await vertexModel.generateContent(request as any);
          
          // Normalize Vertex response to match EnhancedGenerateContentResponse
          const normalizedResponse = {
            ...vertexResult.response,
            text: () => {
              const parts = vertexResult.response.candidates?.[0]?.content?.parts || [];
              return parts.map((p: any) => p.text).filter(Boolean).join("");
            },
            functionCalls: () => {
              const parts = vertexResult.response.candidates?.[0]?.content?.parts || [];
              return parts.map((p: any) => p.functionCall).filter(Boolean);
            },
            functionCall: () => {
              const parts = vertexResult.response.candidates?.[0]?.content?.parts || [];
              return parts.find((p: any) => p.functionCall)?.functionCall;
            }
          };

          const result = { response: normalizedResponse } as unknown as GenerateContentResult;
          this.logTokenUsage(result, "generateContent (Vertex Fallback)");
          return result;
        } catch (fallbackError: any) {
          console.error("Vertex AI Fallback also failed:", fallbackError);
          throw primaryError; // Throw original error if both fail
        }
      }
    });
  }

  /**
   * Start a chat session (mostly for onboarding)
   */
  getChatSession(history: any[] = [], tools?: any[]): ChatSession {
    // Note: If chat session encounters transient errors during sendMessage, 
    // we would ideally wrap sendMessage in withRetry at the call site.
    const model = this.primaryClient.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings,
      tools,
    });
    return model.startChat({ history });
  }
}

export const geminiClient = new GeminiClientSingleton();
