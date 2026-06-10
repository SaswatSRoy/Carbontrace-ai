import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "../../../../lib/utils/auth";
import { checkRateLimit } from "../../../../lib/utils/rate-limit";
import { geminiClient } from "../../../../lib/gemini/client";
import { ONBOARDING_SYSTEM_PROMPT } from "../../../../lib/gemini/prompts";
import { ProfileExtractionSchema, ProfileExtractionZod } from "../../../../lib/gemini/schemas";
import { calculateCarbonScore } from "../../../../lib/carbon/calculator";
import { adminDb } from "../../../../lib/firebase/admin";
import { UserProfile } from "../../../../lib/carbon/types";
import { GRID_EMISSION_FACTORS } from "../../../../lib/carbon/factors";

export async function POST(req: NextRequest) {
  try {
    // 1. Security Checks
    const authResult = await verifyRequest(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { uid } = authResult;

    // 2. Rate Limiting
    const rateLimit = await checkRateLimit(uid, "onboard_chat");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", retryAfter: rateLimit.resetAt },
        { status: 429 }
      );
    }

    // 3. Input Validation
    const body = await req.json();
    const { message, conversationHistory = [] } = body;

    if (typeof message !== "string" || message.length > 500) {
      return NextResponse.json({ error: "Invalid message format or length" }, { status: 400 });
    }

    // Ensure conversation history isn't too long to prevent token exhaustion
    if (conversationHistory.length > 20) {
      return NextResponse.json({ error: "Conversation too long. Please restart." }, { status: 400 });
    }

    // 4. Gemini Chat Invocation
    // Strip simple HTML tags if any (basic sanitization)
    const sanitizedMessage = message.replace(/<[^>]*>?/gm, "");

    interface ChatMessage {
      role: string;
      content: string;
    }

    // Prepare system instructions via history if needed, or we just pass it as the first message
    const formattedHistory = [
      { role: "user", parts: [{ text: ONBOARDING_SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood. I am EcoGuide. Hello! Where are you from?" }] },
      ...conversationHistory.map((msg: ChatMessage) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    ];

    const chatSession = geminiClient.getChatSession(formattedHistory, [
      {
        functionDeclarations: [
          {
            name: "extract_profile",
            description: "Saves the extracted carbon profile when enough information has been gathered from the user.",
            parameters: ProfileExtractionSchema as unknown as import("@google/generative-ai").FunctionDeclarationSchema,
          },
        ],
      },
    ]);

    const result = await chatSession.sendMessage(sanitizedMessage);
    const response = result.response;

    // 5. Handle Function Calling
    const functionCall = response.functionCalls()?.[0];
    if (functionCall && functionCall.name === "extract_profile") {
      const args = functionCall.args;
      
      // Validate args with Zod
      const parseResult = ProfileExtractionZod.safeParse(args);
      if (!parseResult.success) {
        console.error("Gemini provided invalid profile data:", parseResult.error);
        return NextResponse.json(
          { reply: "I tried to calculate your footprint but missed some details. Could we clarify your energy use?", profileExtracted: false },
          { status: 200 }
        );
      }

      // We have a valid profile! Let's calculate the score and save it.
      const countryCode = parseResult.data.location.country.toUpperCase();
      const gridFactor = GRID_EMISSION_FACTORS[countryCode] || GRID_EMISSION_FACTORS.DEFAULT;
      
      const profileData: UserProfile = {
        ...parseResult.data,
        location: {
          ...parseResult.data.location,
          gridEmissionFactor: gridFactor,
        },
        userId: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = calculateCarbonScore(profileData);

      // Save to Firestore
      await adminDb.collection("users").doc(uid).collection("profiles").doc("current").set(profileData);
      await adminDb.collection("users").doc(uid).collection("scores").doc("current").set(score);

      return NextResponse.json(
        { 
          reply: "Great! I have everything I need. Your carbon footprint has been calculated.", 
          profileExtracted: true, 
          score 
        },
        { status: 200 }
      );
    }

    // 6. Return normal conversational reply
    const replyText = response.text();
    return NextResponse.json({ reply: replyText, profileExtracted: false }, { status: 200 });

  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
