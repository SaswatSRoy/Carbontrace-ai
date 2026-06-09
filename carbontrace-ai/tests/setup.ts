import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project-id";
process.env.GEMINI_API_KEY = "test-gemini-key";

// Mock Firebase Client globally so tests don't try to connect to real Firebase
vi.mock("@/lib/firebase/client", () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
  },
  db: {},
  storage: {},
  appCheck: {},
}));

// Mock Firebase Admin globally
vi.mock("@/lib/firebase/admin", () => ({
  adminApp: {},
  adminAuth: {
    verifyIdToken: vi.fn(),
    createSessionCookie: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
      })),
    })),
    runTransaction: vi.fn(),
  },
}));

// Polyfill global fetch for Node testing environment if needed
if (!global.fetch) {
  global.fetch = vi.fn() as any;
}
