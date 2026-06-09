import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { geminiClient } from "@/lib/gemini/client";
import pkg from "../../../../package.json";

export async function GET() {
  const status = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: pkg.version || process.env.npm_package_version || "unknown",
    services: {
      firebase: "error",
      gemini: "error",
    },
  };

  let hasError = false;

  // 1. Check Firebase
  try {
    // A simple read query to verify Firebase Admin is connected
    await adminDb.collection("system").doc("health").get();
    status.services.firebase = "connected";
  } catch (error: any) {
    // NOT_FOUND (code 5) means Firestore IS reachable, the doc just doesn't exist
    if (error?.code === 5) {
      status.services.firebase = "connected";
    } else {
      console.error("Health Check: Firebase error", error);
      hasError = true;
    }
  }

  // 2. Check Gemini
  try {
    const request = {
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: {
        maxOutputTokens: 1, // minimal request
      },
    };
    await geminiClient.generateContent(request);
    status.services.gemini = "available";
  } catch (error) {
    console.error("Health Check: Gemini error", error);
    hasError = true;
  }

  if (hasError) {
    status.status = "degraded";
  }

  return NextResponse.json(status, { status: hasError ? 503 : 200 });
}
