import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/onboard/chat/route";
import { NextRequest } from "next/server";
import { verifyRequest } from "@/lib/utils/auth";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { geminiClient } from "@/lib/gemini/client";

vi.mock("@/lib/utils/auth", () => ({
  verifyRequest: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/gemini/client", () => ({
  geminiClient: {
    getChatSession: vi.fn(),
  },
}));

// We mock firebase admin globally in setup.ts

describe("POST /api/onboard/chat", () => {
  let mockSendMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    (verifyRequest as any).mockResolvedValue({ uid: "user123" });
    (checkRateLimit as any).mockResolvedValue({ allowed: true, remaining: 9, resetAt: 0 });

    mockSendMessage = vi.fn().mockResolvedValue({
      response: {
        functionCalls: () => [],
        text: () => "AI Response",
      },
    });

    (geminiClient.getChatSession as any).mockReturnValue({
      sendMessage: mockSendMessage,
    });
  });

  function createRequest(body: any) {
    return new NextRequest("http://localhost:3000/api/onboard/chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  it("returns 200 with reply for valid message", async () => {
    const req = createRequest({ message: "Hello", conversationHistory: [] });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reply).toBe("AI Response");
    expect(json.profileExtracted).toBe(false);
  });

  it("returns 401 when missing auth", async () => {
    (verifyRequest as any).mockResolvedValue({ error: "Missing auth", status: 401 });
    
    const req = createRequest({ message: "Hello" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Missing auth");
  });

  it("returns 400 for message > 500 chars", async () => {
    const req = createRequest({ message: "A".repeat(501) });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("length");
  });

  it("returns 503 when Gemini errors", async () => {
    mockSendMessage.mockRejectedValue(new Error("Gemini down"));
    
    const req = createRequest({ message: "Hello" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toBe("AI service unavailable");
  });

  it("returns 429 when rate limit exceeded", async () => {
    (checkRateLimit as any).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() });
    
    const req = createRequest({ message: "Hello" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain("Rate limit exceeded");
  });
});
