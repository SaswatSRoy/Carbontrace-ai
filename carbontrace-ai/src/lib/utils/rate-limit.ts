import { adminDb } from "../firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const LIMIT = 10;
const WINDOW_MS = 60 * 1000; // 60 seconds

/**
 * Check and enforce rate limits for a user on a specific endpoint using Firestore.
 * 
 * @param userId User ID
 * @param endpoint Endpoint identifier (e.g., 'onboard_chat')
 * @returns RateLimitResult with allowed status and reset time
 */
export async function checkRateLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
  const docRef = adminDb.collection("rate_limits").doc(`${userId}_${endpoint}`);
  const now = Date.now();

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        // First request in the window
        const resetAt = now + WINDOW_MS;
        transaction.set(docRef, {
          count: 1,
          resetAt,
        });
        return { allowed: true, remaining: LIMIT - 1, resetAt };
      }

      const data = doc.data() as { count: number; resetAt: number };

      if (now > data.resetAt) {
        // Window expired, reset
        const resetAt = now + WINDOW_MS;
        transaction.set(docRef, {
          count: 1,
          resetAt,
        });
        return { allowed: true, remaining: LIMIT - 1, resetAt };
      }

      if (data.count >= LIMIT) {
        // Rate limit exceeded
        return { allowed: false, remaining: 0, resetAt: data.resetAt };
      }

      // Increment count
      transaction.update(docRef, {
        count: FieldValue.increment(1),
      });

      return { allowed: true, remaining: LIMIT - data.count - 1, resetAt: data.resetAt };
    });
  } catch (error) {
    console.error("Rate limit transaction failed:", error);
    // Fail open if Firestore is temporarily down, to avoid completely breaking the app
    return { allowed: true, remaining: 0, resetAt: now + WINDOW_MS };
  }
}
