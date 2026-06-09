import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as ChatPOST } from "../../../src/app/api/onboard/chat/route";
import { POST as SimulatePOST } from "../../../src/app/api/carbon/simulate/route";
import { mockProfileExtraction, mockSimulationNarratorResponse } from "../../fixtures/gemini-responses";
import { geminiClient } from "../../../src/lib/gemini/client";

// Mock utilities
vi.mock("../../../src/lib/utils/auth", () => ({
  verifyRequest: vi.fn(async () => ({ uid: "test-user-123", status: 200 })),
}));

vi.mock("../../../src/lib/utils/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 })),
}));

// Mock Gemini Client
vi.mock("../../../src/lib/gemini/client", () => {
  return {
    geminiClient: {
      generateContent: vi.fn(),
      getChatSession: vi.fn(() => ({
        sendMessage: vi.fn(),
      })),
    },
  };
});

// Mock Firestore
vi.mock("../../../src/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn(async () => ({})),
        get: vi.fn(async () => ({
          exists: true,
          data: () => ({
            location: { country: "US", city: "Seattle", gridEmissionFactor: 0.42 },
            transport: {
              carKmPerWeek: 100,
              fuelType: "petrol",
              publicTransportTripsPerWeek: 2,
              flightsPerYear: 1,
              avgFlightDurationHours: 4,
              cycleKmPerWeek: 0,
            },
            homeEnergy: {
              electricityKwhPerMonth: 300,
              heatingType: "gas",
              numOccupants: 2,
              renewableEnergyPercent: 0,
            },
            diet: "medium_meat",
            shoppingIntensity: "average",
          }),
        })),
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            set: vi.fn(async () => ({})),
            get: vi.fn(async () => ({
              exists: true,
              data: () => ({
                location: { country: "US", city: "Seattle", gridEmissionFactor: 0.42 },
                transport: {
                  carKmPerWeek: 100,
                  fuelType: "petrol",
                  publicTransportTripsPerWeek: 2,
                  flightsPerYear: 1,
                  avgFlightDurationHours: 4,
                  cycleKmPerWeek: 0,
                },
                homeEnergy: {
                  electricityKwhPerMonth: 300,
                  heatingType: "gas",
                  numOccupants: 2,
                  renewableEnergyPercent: 0,
                },
                diet: "medium_meat",
                shoppingIntensity: "average",
              }),
            })),
          })),
        })),
      })),
      add: vi.fn(async () => ({ id: "mock-id" })),
    })),
  },
  adminStorage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn(async () => ({})),
      })),
    })),
  },
  adminAuth: {},
}));

describe("API Routes with Gemini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/onboard/chat", () => {
    it("should successfully extract profile via function calling", async () => {
      const mockSendMessage = vi.fn().mockResolvedValueOnce({ response: mockProfileExtraction });
      (geminiClient.getChatSession as any).mockReturnValueOnce({ sendMessage: mockSendMessage });

      const req = new NextRequest("http://localhost/api/onboard/chat", {
        method: "POST",
        body: JSON.stringify({ message: "I drive 100km a week" }),
        headers: {
          "Authorization": "Bearer mock-token",
          "X-Firebase-AppCheck": "mock-appcheck",
        },
      });

      const res = await ChatPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.profileExtracted).toBe(true);
      expect(data.score).toBeDefined();
    });
  });

  describe("POST /api/carbon/simulate", () => {
    it("should return simulation results synchronously without narration", async () => {
      const req = new NextRequest("http://localhost/api/carbon/simulate", {
        method: "POST",
        body: JSON.stringify({
          changes: { diet: "vegan" },
          includeNarration: false,
        }),
      });

      const res = await SimulatePOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deltakgCO2eYear).toBeDefined();
      expect(data.narration).toBeNull();
    });

    it("should include narration when requested", async () => {
      (geminiClient.generateContent as any).mockResolvedValueOnce({
        response: { text: () => mockSimulationNarratorResponse },
      });

      const req = new NextRequest("http://localhost/api/carbon/simulate", {
        method: "POST",
        body: JSON.stringify({
          changes: { diet: "vegan" },
          includeNarration: true,
        }),
      });

      const res = await SimulatePOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deltakgCO2eYear).toBeDefined();
      expect(data.narration).toBe("Wow, switching to a vegan diet makes a huge difference! You've saved over 1,000 kg of CO2 per year. That's equivalent to planting nearly 50 trees.");
    });
  });
});
