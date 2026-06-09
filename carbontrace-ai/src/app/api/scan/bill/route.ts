import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "../../../../lib/utils/auth";
import { checkRateLimit } from "../../../../lib/utils/rate-limit";
import { geminiClient } from "../../../../lib/gemini/client";
import { BILL_EXTRACTION_PROMPT } from "../../../../lib/gemini/prompts";
import { BillExtractionSchema, BillExtractionZod } from "../../../../lib/gemini/schemas";
import { adminDb, adminStorage } from "../../../../lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Security Checks
    const authResult = await verifyRequest(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { uid } = authResult;

    // 2. Rate Limiting
    const rateLimit = await checkRateLimit(uid, "scan_bill");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", retryAfter: rateLimit.resetAt },
        { status: 429 }
      );
    }

    // 3. Extract File from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type & size
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Must be an image." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    // 4. Convert to Buffer and upload to Firebase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `users/${uid}/bills/${timestamp}_${filename}`;

    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(storagePath);
    await storageFile.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    // 5. Call Gemini Vision
    const base64Data = buffer.toString("base64");
    const mimeType = file.type;

    const request = {
      contents: [
        {
          role: "user",
          parts: [
            { text: BILL_EXTRACTION_PROMPT },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: BillExtractionSchema,
      },
    };

    const result = await geminiClient.generateContent(request, true);
    const jsonString = result.response.text();
    
    // Parse and Validate JSON
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", e);
      return NextResponse.json({ error: "Failed to read bill data" }, { status: 500 });
    }

    const validation = BillExtractionZod.safeParse(parsedData);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data extracted from bill" }, { status: 400 });
    }

    const extracted = validation.data;
    if (extracted.error === "not_a_utility_bill") {
      return NextResponse.json({ error: "Image does not appear to be a utility bill" }, { status: 400 });
    }

    // 6. Calculate CO2e contribution for the period (Optional/Example logic)
    let carbonKgThisPeriod = 0;
    let message = "Bill scanned successfully.";

    // Example calculation if electricity is present
    if (extracted.electricity_kwh) {
      // In a real app we'd fetch the user's grid emission factor here from Firestore
      // For this step, we use a generic average or calculate it if we had the factor.
      carbonKgThisPeriod = extracted.electricity_kwh * 0.5; // Default 0.5 factor
      message = `Found ${extracted.electricity_kwh} kWh. Added ${carbonKgThisPeriod} kg CO2e to your log.`;
    }

    // 7. Save log to Firestore
    await adminDb.collection("users").doc(uid).collection("logs").add({
      type: "bill_scan",
      data: extracted,
      carbonKgThisPeriod,
      storagePath,
      createdAt: new Date(),
    });

    return NextResponse.json({ extracted, carbonKgThisPeriod, message }, { status: 200 });

  } catch (error: any) {
    console.error("Scan API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
