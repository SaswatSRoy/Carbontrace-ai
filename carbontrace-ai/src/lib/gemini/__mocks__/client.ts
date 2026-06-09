import { vi } from "vitest";

// Mock implementation of GeminiClientSingleton
export const mockGenerateContent = vi.fn();
export const mockSendMessage = vi.fn();

export const geminiClient = {
  generateContent: mockGenerateContent,
  getChatSession: vi.fn(() => ({
    sendMessage: mockSendMessage,
  })),
};
