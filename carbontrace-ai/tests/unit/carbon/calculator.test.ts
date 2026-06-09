import { describe, it, expect } from "vitest";
import {
  calculateTransportEmissions,
  calculateEnergyEmissions,
  calculateFoodEmissions,
  calculateShoppingEmissions,
  calculateWasteEmissions,
  calculateCarbonScore,
  simulateChanges,
} from "../../../src/lib/carbon/calculator";
import { UserProfile } from "../../../src/lib/carbon/types";

// Helper to create a baseline profile
function createBaseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: "test-user-123",
    location: {
      country: "US",
      city: "San Francisco",
      gridEmissionFactor: 0.42,
    },
    transport: {
      carKmPerWeek: 0,
      fuelType: "none",
      publicTransportTripsPerWeek: 0,
      flightsPerYear: 0,
      avgFlightDurationHours: 0,
      cycleKmPerWeek: 0,
    },
    homeEnergy: {
      electricityKwhPerMonth: 0,
      heatingType: "none",
      numOccupants: 1,
      renewableEnergyPercent: 0,
    },
    diet: "vegan",
    shoppingIntensity: "minimal",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Carbon Calculation Engine", () => {
  describe("Transport Emissions", () => {
    it("should verify a petrol car driving 200km/week = ~1,997 kg CO2e/year", () => {
      const transport = {
        carKmPerWeek: 200,
        fuelType: "petrol" as const,
        publicTransportTripsPerWeek: 0,
        flightsPerYear: 0,
        avgFlightDurationHours: 0,
        cycleKmPerWeek: 0,
      };
      const emissions = calculateTransportEmissions(transport, "US");
      // 200 * 52 * 0.192 = 1996.8
      expect(Math.round(emissions)).toBe(1997);
    });

    it("should verify electric car emits less than petrol by at least 60%", () => {
      const petrolTransport = {
        carKmPerWeek: 200,
        fuelType: "petrol" as const,
        publicTransportTripsPerWeek: 0,
        flightsPerYear: 0,
        avgFlightDurationHours: 0,
        cycleKmPerWeek: 0,
      };
      const electricTransport = {
        ...petrolTransport,
        fuelType: "electric" as const,
      };

      const petrolEmissions = calculateTransportEmissions(petrolTransport, "US");
      const electricEmissions = calculateTransportEmissions(electricTransport, "US");

      const reductionPercent = ((petrolEmissions - electricEmissions) / petrolEmissions) * 100;
      expect(reductionPercent).toBeGreaterThanOrEqual(60);
    });

    it("should verify zero-emission for cycling", () => {
      const cyclingTransport = {
        carKmPerWeek: 0,
        fuelType: "none" as const,
        publicTransportTripsPerWeek: 0,
        flightsPerYear: 0,
        avgFlightDurationHours: 0,
        cycleKmPerWeek: 300, // active cycling
      };
      const emissions = calculateTransportEmissions(cyclingTransport, "US");
      expect(emissions).toBe(0);
    });

    it("should verify long-haul flights use radiative forcing multiplier (1.9x)", () => {
      // 1 flight of 5 hours (long-haul)
      const longHaul = {
        carKmPerWeek: 0,
        fuelType: "none" as const,
        publicTransportTripsPerWeek: 0,
        flightsPerYear: 1,
        avgFlightDurationHours: 5,
        cycleKmPerWeek: 0,
      };

      // 1 flight of 2.5 hours (short-haul)
      const shortHaul = {
        ...longHaul,
        avgFlightDurationHours: 2.5,
      };

      const longEmissions = calculateTransportEmissions(longHaul, "US");
      const shortEmissions = calculateTransportEmissions(shortHaul, "US");

      // Long emissions = 1 * 5 * 800 * 0.195 * 1.9 = 1482
      // Short emissions = 1 * 2.5 * 800 * 0.255 = 510
      // Check ratio to confirm long-haul utilizes the multiplier
      expect(longEmissions).toBe(1482);
      expect(shortEmissions).toBe(510);
    });

    it("should handle edge cases: zero values, maximum realistic values", () => {
      const zeroTransport = {
        carKmPerWeek: 0,
        fuelType: "none" as const,
        publicTransportTripsPerWeek: 0,
        flightsPerYear: 0,
        avgFlightDurationHours: 0,
        cycleKmPerWeek: 0,
      };
      expect(calculateTransportEmissions(zeroTransport, "US")).toBe(0);

      const maxTransport = {
        carKmPerWeek: 2000, // Extreme commuter
        fuelType: "diesel" as const,
        publicTransportTripsPerWeek: 50,
        flightsPerYear: 52, // Weekly business traveler
        avgFlightDurationHours: 12,
        cycleKmPerWeek: 100,
      };
      const maxEmissions = calculateTransportEmissions(maxTransport, "US");
      expect(maxEmissions).toBeGreaterThan(50000); // Should be very high but calculated
    });
  });

  describe("Energy Emissions", () => {
    it("should verify French electricity (0.06) << Indian electricity (0.82) for same kWh", () => {
      const homeEnergy = {
        electricityKwhPerMonth: 300,
        heatingType: "none" as const,
        numOccupants: 1,
        renewableEnergyPercent: 0,
      };

      const frenchEmissions = calculateEnergyEmissions(homeEnergy, 0.06);
      const indianEmissions = calculateEnergyEmissions(homeEnergy, 0.82);

      expect(frenchEmissions).toBeLessThan(indianEmissions);
      expect(frenchEmissions).toBe(300 * 12 * 0.06);
      expect(indianEmissions).toBe(300 * 12 * 0.82);
    });

    it("should verify 100% renewable = near-zero grid emissions component", () => {
      const homeEnergy = {
        electricityKwhPerMonth: 500,
        heatingType: "none" as const,
        numOccupants: 1,
        renewableEnergyPercent: 100,
      };
      const emissions = calculateEnergyEmissions(homeEnergy, 0.42);
      expect(emissions).toBe(0);
    });

    it("should verify shared occupancy reduces per-person emissions", () => {
      const singleOccupant = {
        electricityKwhPerMonth: 400,
        heatingType: "gas" as const,
        numOccupants: 1,
        renewableEnergyPercent: 0,
      };

      const multiOccupant = {
        ...singleOccupant,
        numOccupants: 4,
      };

      const singleEmissions = calculateEnergyEmissions(singleOccupant, 0.42);
      const multiEmissions = calculateEnergyEmissions(multiOccupant, 0.42);

      expect(multiEmissions).toBe(singleEmissions / 4);
    });
  });

  describe("Diet Emissions", () => {
    it("should verify vegan < vegetarian < low_meat < medium_meat < heavy_meat", () => {
      const vegan = calculateFoodEmissions("vegan");
      const vegetarian = calculateFoodEmissions("vegetarian");
      const lowMeat = calculateFoodEmissions("low_meat");
      const mediumMeat = calculateFoodEmissions("medium_meat");
      const heavyMeat = calculateFoodEmissions("heavy_meat");

      expect(vegan).toBeLessThan(vegetarian);
      expect(vegetarian).toBeLessThan(lowMeat);
      expect(lowMeat).toBeLessThan(mediumMeat);
      expect(mediumMeat).toBeLessThan(heavyMeat);
    });
  });

  describe("Full Score Calculations", () => {
    it("should verify a typical US profile scores 14,000–18,000 kg", () => {
      const usProfile = createBaseProfile({
        location: {
          country: "US",
          city: "New York",
          gridEmissionFactor: 0.42,
        },
        transport: {
          carKmPerWeek: 300,
          fuelType: "petrol",
          publicTransportTripsPerWeek: 5,
          flightsPerYear: 2,
          avgFlightDurationHours: 6,
          cycleKmPerWeek: 10,
        },
        homeEnergy: {
          electricityKwhPerMonth: 900,
          heatingType: "gas",
          numOccupants: 2,
          renewableEnergyPercent: 10,
        },
        diet: "medium_meat",
        shoppingIntensity: "average",
      });

      const score = calculateCarbonScore(usProfile);
      expect(score.totalKgCO2eYear).toBeGreaterThanOrEqual(14000);
      expect(score.totalKgCO2eYear).toBeLessThanOrEqual(18000);
    });

    it("should verify a typical Indian profile scores 1,500–4,000 kg", () => {
      const inProfile = createBaseProfile({
        location: {
          country: "IN",
          city: "Mumbai",
          gridEmissionFactor: 0.82,
        },
        transport: {
          carKmPerWeek: 0,
          fuelType: "none",
          publicTransportTripsPerWeek: 10,
          flightsPerYear: 0,
          avgFlightDurationHours: 0,
          cycleKmPerWeek: 50,
        },
        homeEnergy: {
          electricityKwhPerMonth: 100,
          heatingType: "none",
          numOccupants: 4,
          renewableEnergyPercent: 0,
        },
        diet: "vegetarian",
        shoppingIntensity: "minimal",
      });

      const score = calculateCarbonScore(inProfile);
      expect(score.totalKgCO2eYear).toBeGreaterThanOrEqual(1500);
      expect(score.totalKgCO2eYear).toBeLessThanOrEqual(4000);
    });

    it("should verify the 1.5°C target is always 2,300 kg", () => {
      const profile = createBaseProfile();
      const score = calculateCarbonScore(profile);
      expect(score.targetKg).toBe(2300);
    });
  });

  describe("Simulation Engine", () => {
    it("should verify switching from heavy_meat to vegan saves ~2,200 kg directly, plus waste reduction", () => {
      const profile = createBaseProfile({
        diet: "heavy_meat",
      });

      const result = simulateChanges({
        profile,
        changes: {
          diet: "vegan",
        },
      });

      // 3300 (heavy) -> 1100 (vegan) = 2200 kg saved directly
      // Waste saved: (3300 * 0.05) - (1100 * 0.05) = 110 kg
      // Total saved = 2310 kg
      expect(result.deltakgCO2eYear).toBe(-2310);
      expect(result.percentageChange).toBeLessThan(0);
    });

    it("should verify removing 2 long-haul flights saves the correct amount", () => {
      const profile = createBaseProfile({
        transport: {
          carKmPerWeek: 0,
          fuelType: "none",
          publicTransportTripsPerWeek: 0,
          flightsPerYear: 2,
          avgFlightDurationHours: 5,
          cycleKmPerWeek: 0,
        },
      });

      const result = simulateChanges({
        profile,
        changes: {
          flightsPerYear: 0,
        },
      });

      // Flight emissions: 2 * 5 * 800 * 0.195 * 1.9 = 2964 kg
      expect(result.deltakgCO2eYear).toBe(-2964);
    });

    it("should verify delta is always simulatedScore - originalScore", () => {
      const profile = createBaseProfile({
        diet: "medium_meat",
      });

      const result = simulateChanges({
        profile,
        changes: {
          diet: "vegetarian",
        },
      });

      expect(result.deltakgCO2eYear).toBe(
        result.simulatedScore.totalKgCO2eYear - result.originalScore.totalKgCO2eYear
      );
    });

    it("should simulate all possible parameter changes to hit branches", () => {
      const profile = createBaseProfile();
      const result = simulateChanges({
        profile,
        changes: {
          carKmPerWeek: 10,
          fuelType: "petrol",
          publicTransportTripsPerWeek: 2,
          flightsPerYear: 1,
          avgFlightDurationHours: 4,
          cycleKmPerWeek: 5,
          electricityKwhPerMonth: 200,
          heatingType: "electric",
          numOccupants: 2,
          renewableEnergyPercent: 50,
          diet: "vegan",
          shoppingIntensity: "heavy",
        },
      });
      expect(result.simulatedScore.totalKgCO2eYear).not.toBe(result.originalScore.totalKgCO2eYear);
    });
  });
});
