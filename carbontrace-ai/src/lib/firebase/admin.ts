import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Initialize Firebase Admin SDK for server-side verification and Firestore
 */
let app: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (app) return app;
  if (admin.apps.length > 0) {
    app = admin.apps[0] as admin.app.App;
    return app;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let credential;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      credential = admin.credential.cert(serviceAccount);
    } catch {
      throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON. Ensure it is a valid JSON string.");
    }
  } else {
    // Fallback to individual variables if service account string is not provided
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin SDK credentials are missing. Provide FIREBASE_SERVICE_ACCOUNT_KEY.");
    }

    credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  try {
    app = admin.initializeApp({
      credential,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return app;
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error);
    throw error;
  }
}

export const adminApp = new Proxy({} as admin.app.App, {
  get(_, prop) {
    const val = Reflect.get(getAdminApp(), prop);
    return typeof val === "function" ? val.bind(getAdminApp()) : val;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    const authService = getAdminApp().auth();
    const val = Reflect.get(authService, prop);
    return typeof val === "function" ? val.bind(authService) : val;
  }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    const firestoreService = getFirestore(getAdminApp(), "carbontrace-ai");
    const val = Reflect.get(firestoreService, prop);
    return typeof val === "function" ? val.bind(firestoreService) : val;
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    const storageService = getAdminApp().storage();
    const val = Reflect.get(storageService, prop);
    return typeof val === "function" ? val.bind(storageService) : val;
  }
});
