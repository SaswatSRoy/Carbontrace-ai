import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "../../../../lib/utils/auth";
import { checkRateLimit } from "../../../../lib/utils/rate-limit";
import { geminiClient } from "../../../../lib/gemini/client";
import { SIMULATION_NARRATOR_PROMPT } from "../../../../lib/gemini/prompts";
import { SimulationNarratorSchema, SimulationNarratorZod } from "../../../../lib/gemini/schemas";
import { adminDb } from "../../../../lib/firebase/admin";
import { UserProfile } from "../../../../lib/carbon/types";
import { simulateChanges } from "../../../../lib/carbon/calculator";

export async function POST(req: NextRequest) {
  try {
    // 1. Security Checks
    const authResult = await verifyRequest(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { uid } = authResult;

    // 2. Input Validation
    const body = await req.json();
    const { changes, includeNarration = false } = body;

    if (!changes || typeof changes !== "object") {
      return NextResponse.json({ error: "Invalid changes object" }, { status: 400 });
    }

    // 3. Load Base Profile (Ideally passed from client, but we load from DB to ensure validity)
    // In a highly optimized hot-path, the client might pass the profile directly.
    // For now, we load it from Firestore.
    const profileDoc = await adminDb.collection("users").doc(uid).collection("profiles").doc("current").get();
    if (!profileDoc.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const profile = profileDoc.data() as UserProfile;

    // 4. Synchronous Simulation
    const simulationResult = simulateChanges({
      profile,
      changes,
    });

    let narration = null;

    // 5. Optional Gemini Narration
    if (includeNarration) {
      const rateLimit = await checkRateLimit(uid, "simulate_narrate");
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { ...simulationResult, error: "Rate limit exceeded for narration. Try again later." },
          { status: 200 } // We still return 200 because the simulation worked
        );
      }

      let prompt = SIMULATION_NARRATOR_PROMPT;
      prompt = prompt.replace("{{ORIGINAL_KG}}", simulationResult.originalScore.totalKgCO2eYear.toFixed(0));
      prompt = prompt.replace("{{SIMULATED_KG}}", simulationResult.simulatedScore.totalKgCO2eYear.toFixed(0));
      prompt = prompt.replace("{{DELTA_KG}}", Math.abs(simulationResult.deltakgCO2eYear).toFixed(0));
      prompt = prompt.replace("{{PERCENT}}", Math.abs(simulationResult.percentageChange).toFixed(1));

      try {
        const request = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SimulationNarratorSchema,
          },
        };

        const aiResult = await geminiClient.generateContent(request);
        const jsonString = aiResult.response.text();
        
        const parsedData = JSON.parse(jsonString);
        const validation = SimulationNarratorZod.safeParse(parsedData);
        
        if (validation.success) {
          narration = validation.data.narration;
        }
      } catch (e) {
        console.error("Narration generation failed:", e);
        // Fail silently for narration, client handles missing narration gracefully
      }
    }

    return NextResponse.json({ ...simulationResult, narration }, { status: 200 });

  } catch (error: any) {
    console.error("Simulation API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
