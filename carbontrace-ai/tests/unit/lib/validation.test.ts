import { describe, it, expect } from "vitest";
import { 
  billScanSchema, 
  simulationInputSchema, 
  chatMessageSchema, 
  userProfileSchema 
} from "@/lib/utils/validation";

describe("Validation Schemas", () => {
  describe("billScanSchema", () => {
    it("accepts valid bill scans", () => {
      const valid = { kwh: 500, amount: 75.5, period: "2023-10" };
      expect(billScanSchema.parse(valid)).toEqual(valid);
    });

    it("rejects negative values", () => {
      expect(() => billScanSchema.parse({ kwh: -10, amount: 50 })).toThrow();
      expect(() => billScanSchema.parse({ kwh: 100, amount: -5 })).toThrow();
    });

    it("rejects non-numeric values", () => {
      expect(() => billScanSchema.parse({ kwh: "500", amount: 75.5 })).toThrow();
    });
  });

  describe("simulationInputSchema", () => {
    it("accepts valid simulation input", () => {
      const valid = {
        baseline: 15000,
        changes: {
          diet: "vegan",
          transportation: "electric",
          energy: "solar",
        },
      };
      // Need to suppress strict type checking if schema is more permissive
      const result = simulationInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("enforces numeric baseline bounds", () => {
      expect(() => simulationInputSchema.parse({ baseline: -1, changes: {} })).toThrow();
    });
  });

  describe("chatMessageSchema", () => {
    it("accepts valid chat messages", () => {
      const valid = { text: "Hello AI!" };
      expect(chatMessageSchema.parse(valid)).toEqual(valid);
    });

    it("strips HTML injection", () => {
      const xss = { text: "<script>alert(1)</script>Hello" };
      const parsed = chatMessageSchema.parse(xss);
      expect(parsed.text).toBe("&lt;script&gt;alert(1)&lt;/script&gt;Hello");
    });

    it("prevents empty messages", () => {
      expect(() => chatMessageSchema.parse({ text: "   " })).toThrow();
    });

    it("prevents extremely long messages (DOS prevention)", () => {
      expect(() => chatMessageSchema.parse({ text: "A".repeat(501) })).toThrow();
    });
  });
});
