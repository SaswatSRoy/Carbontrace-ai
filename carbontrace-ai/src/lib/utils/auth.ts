import { adminAuth, adminApp } from "../firebase/admin";
import { getAppCheck } from "firebase-admin/app-check";

/**
 * Server-side auth verification middleware:
 * Verifies both App Check token and ID token.
 */
export async function verifyRequest(request: Request): Promise<{ uid: string } | { error: string, status: number }> {
    // 1. Extract Authorization: Bearer {idToken} header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return { error: "Missing or invalid Authorization header", status: 401 };
    }
    const idToken = authHeader.split("Bearer ")[1];

    // 2. Extract X-Firebase-AppCheck: {appCheckToken} header
    const appCheckToken = request.headers.get("X-Firebase-AppCheck");

    // Bypass App Check in dev if no site key is provided
    const requiresAppCheck = process.env.NODE_ENV !== "development" || !!process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;

    if (requiresAppCheck) {
        if (!appCheckToken) {
            return { error: "Missing X-Firebase-AppCheck header", status: 403 };
        }

        // 3. Verify App Check token
        try {
            await getAppCheck(adminApp).verifyToken(appCheckToken);
        } catch (error) {
            console.error("App Check verification failed:", error);
            return { error: "Invalid App Check token", status: 403 };
        }
    }

    // 4. Verify idToken
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        // 5. Return uid
        return { uid: decodedToken.uid };
    } catch (error) {
        console.error("Auth verification failed:", error);
        return { error: "Invalid token", status: 401 };
    }
}
