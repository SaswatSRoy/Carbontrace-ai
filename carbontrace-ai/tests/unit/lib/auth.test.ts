import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyRequest } from "@/lib/utils/auth";
import { adminAuth, adminApp } from "@/lib/firebase/admin";
import { getAppCheck } from "firebase-admin/app-check";

// We already mock "@/lib/firebase/admin" globally in setup.ts
// We also need to mock "firebase-admin/app-check"
const mockVerifyToken = vi.fn();
vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: vi.fn(() => ({
    verifyToken: mockVerifyToken,
  })),
}));

describe("verifyRequest middleware", () => {
  let mockRequest: Request;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production'); // force AppCheck requirement
    
    mockRequest = new Request("https://example.com", {
      headers: new Headers({
        "Authorization": "Bearer valid_id_token",
        "X-Firebase-AppCheck": "valid_app_check_token",
      }),
    });
  });

  it("returns uid with valid tokens", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123" });
    mockVerifyToken.mockResolvedValue({});

    const result = await verifyRequest(mockRequest);
    expect(result).toEqual({ uid: "user123" });
  });

  it("returns 401 with missing Authorization header", async () => {
    const req = new Request("https://example.com");
    const result = await verifyRequest(req);
    expect(result).toEqual({ error: "Missing or invalid Authorization header", status: 401 });
  });

  it("returns 401 with expired token", async () => {
    (adminAuth.verifyIdToken as any).mockRejectedValue(new Error("Token expired"));
    mockVerifyToken.mockResolvedValue({});

    const result = await verifyRequest(mockRequest);
    expect(result).toEqual({ error: "Invalid token", status: 401 });
  });

  it("returns 403 with missing App Check token", async () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "Authorization": "Bearer valid_id_token",
      }),
    });

    const result = await verifyRequest(req);
    expect(result).toEqual({ error: "Missing X-Firebase-AppCheck header", status: 403 });
  });

  it("returns 403 with invalid App Check token", async () => {
    mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

    const result = await verifyRequest(mockRequest);
    expect(result).toEqual({ error: "Invalid App Check token", status: 403 });
  });
});
