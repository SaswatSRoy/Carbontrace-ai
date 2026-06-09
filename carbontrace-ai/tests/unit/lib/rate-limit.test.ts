import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// Mock FieldValue.increment
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((val) => ({ _increment: val })),
  },
}));

describe("checkRateLimit", () => {
  let mockDocRef: any;
  let mockTransaction: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDocRef = {};
    (adminDb.collection as any).mockReturnValue({
      doc: vi.fn(() => mockDocRef),
    });

    mockTransaction = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
    };

    (adminDb.runTransaction as any).mockImplementation(async (callback: any) => {
      return callback(mockTransaction);
    });
  });

  it("allows the first request", async () => {
    mockTransaction.get.mockResolvedValue({ exists: false });

    const result = await checkRateLimit("user1", "chat");
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // 10 - 1
    expect(mockTransaction.set).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      count: 1,
      resetAt: expect.any(Number),
    }));
  });

  it("allows requests up to the limit", async () => {
    const now = Date.now();
    mockTransaction.get.mockResolvedValue({
      exists: true,
      data: () => ({ count: 9, resetAt: now + 10000 }), // 1 call remaining
    });

    const result = await checkRateLimit("user1", "chat");
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(mockTransaction.update).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      count: { _increment: 1 },
    }));
  });

  it("rejects the 11th call within the window", async () => {
    const now = Date.now();
    mockTransaction.get.mockResolvedValue({
      exists: true,
      data: () => ({ count: 10, resetAt: now + 10000 }), // Limit reached
    });

    const result = await checkRateLimit("user1", "chat");
    
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(mockTransaction.update).not.toHaveBeenCalled();
    expect(mockTransaction.set).not.toHaveBeenCalled();
  });

  it("allows calls after the window resets", async () => {
    const now = Date.now();
    mockTransaction.get.mockResolvedValue({
      exists: true,
      data: () => ({ count: 10, resetAt: now - 1000 }), // Window expired 1s ago
    });

    const result = await checkRateLimit("user1", "chat");
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockTransaction.set).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
      count: 1,
      resetAt: expect.any(Number),
    }));
  });

  it("fails open if transaction fails", async () => {
    (adminDb.runTransaction as any).mockRejectedValue(new Error("Firestore down"));

    const result = await checkRateLimit("user1", "chat");
    
    expect(result.allowed).toBe(true); // Should fail open
  });
});
