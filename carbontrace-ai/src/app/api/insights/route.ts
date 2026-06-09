import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "../../../lib/utils/auth";
import { checkRateLimit } from "../../../lib/utils/rate-limit";
import { geminiClient } from "../../../lib/gemini/client";
import { INSIGHT_SYSTEM_PROMPT } from "../../../lib/gemini/prompts";
import { ActionPlanSchema, ActionPlanZod } from "../../../lib/gemini/schemas";
import { adminDb } from "../../../lib/firebase/admin";
import { UserProfile, CarbonScore } from "../../../lib/carbon/types";
import { calculateCarbonScore } from "../../../lib/carbon/calculator";

export async function GET(req: NextRequest) {
  try {
    // 1. Security Checks
    const authResult = await verifyRequest(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { uid } = authResult;

    // 2. Check Cache
    const insightsDocRef = adminDb.collection("users").doc(uid).collection("insights").doc("current");
    const insightsDoc = await insightsDocRef.get();

    if (insightsDoc.exists) {
      const data = insightsDoc.data();
      if (data && data.createdAt) {
        const ageHours = (Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          return NextResponse.json(data.actions, { status: 200 });
        }
      }
    }

    // 3. Rate Limiting (only if cache miss)
    const rateLimit = await checkRateLimit(uid, "insights");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", retryAfter: rateLimit.resetAt },
        { status: 429 }
      );
    }

    // 4. Load Profile
    const profileDoc = await adminDb.collection("users").doc(uid).collection("profiles").doc("current").get();
    if (!profileDoc.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = profileDoc.data() as UserProfile;
    const score = calculateCarbonScore(profile);

    // 5. Prepare Gemini Prompt
    // Find the biggest emission category
    const entries = Object.entries(score.breakdown) as [string, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const topCategory = entries[0][0];
    const topKg = entries[0][1];

    let prompt = INSIGHT_SYSTEM_PROMPT;
    prompt = prompt.replace("{{PROFILE_JSON}}", JSON.stringify(profile));
    prompt = prompt.replace("{{TOTAL_KG}}", score.totalKgCO2eYear.toFixed(0));
    prompt = prompt.replace("{{COUNTRY}}", profile.location.country);
    prompt = prompt.replace("{{NATIONAL_AVG}}", score.nationalAverageKg.toString());
    prompt = prompt.replace("{{TOP_CATEGORY}}", topCategory);
    prompt = prompt.replace("{{TOP_KG}}", topKg.toFixed(0));

    // 6. Call Gemini
    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ActionPlanSchema,
      },
    };

    const result = await geminiClient.generateContent(request);
    const jsonString = result.response.text();

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse Insights JSON:", e);
      return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
    }

    const validation = ActionPlanZod.safeParse(parsedData);
    if (!validation.success) {
      console.error("Invalid action plan schema:", validation.error);
      return NextResponse.json({ error: "Invalid action plan format from AI" }, { status: 500 });
    }

    const actions = validation.data;

    // 7. Save to Cache
    await insightsDocRef.set({
      actions,
      createdAt: new Date(),
    });

    return NextResponse.json(actions, { status: 200 });

  } catch (error: any) {
    console.error("Insights API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
