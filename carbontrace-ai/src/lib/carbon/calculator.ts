/**
 * Core carbon footprint calculation engine
 */

import { UserProfile, CarbonScore, SimulationInput, SimulationResult } from "./types";
import {
  TRANSPORT_FACTORS,
  DIET_ANNUAL_KG,
  SHOPPING_ANNUAL_KG,
  HEATING_ANNUAL_KG,
  NATIONAL_AVERAGES,
} from "./factors";

/**
 * Calculate annual transport emissions in kg CO₂e
 * Handles car, public transport, flights, and cycling (zero emissions)
 * 
 * @param transport User transport profile
 * @param countryCode Country code (e.g., "US")
 * @returns Annual transport emissions in kg CO₂e
 */
export function calculateTransportEmissions(
  transport: UserProfile["transport"],
  countryCode: string
): number {
  let carEmissions = 0;
  if (transport.fuelType !== "none") {
    const carFactorKey = `${transport.fuelType}_car` as keyof typeof TRANSPORT_FACTORS;
    const carFactor = TRANSPORT_FACTORS[carFactorKey] || 0;
    carEmissions = transport.carKmPerWeek * 52 * carFactor;
  }

  // Estimate public transport: 10 km per trip using bus factor as standard
  const publicTransportEmissions =
    transport.publicTransportTripsPerWeek * 52 * 10 * TRANSPORT_FACTORS.bus;

  // Flight calculations
  const flightDistance = transport.flightsPerYear * transport.avgFlightDurationHours * 800;
  let flightEmissions = 0;
  if (transport.avgFlightDurationHours > 0) {
    if (transport.avgFlightDurationHours < 3) {
      // Short-haul
      flightEmissions = flightDistance * TRANSPORT_FACTORS.short_flight_per_km;
    } else {
      // Long-haul with radiative forcing multiplier (1.9x)
      flightEmissions = flightDistance * TRANSPORT_FACTORS.long_flight_per_km * 1.9;
    }
  }

  // Cycling is zero emissions (included in type signature implicitly as it contributes 0)
  return carEmissions + publicTransportEmissions + flightEmissions;
}

/**
 * Calculate annual home energy emissions in kg CO₂e
 * Adjusts for grid emission factor by country and renewable energy percentage
 * 
 * @param homeEnergy User home energy profile
 * @param gridEmissionFactor Grid emission factor of the location
 * @returns Annual home energy emissions in kg CO₂e
 */
export function calculateEnergyEmissions(
  homeEnergy: UserProfile["homeEnergy"],
  gridEmissionFactor: number
): number {
  const annualElectricity = homeEnergy.electricityKwhPerMonth * 12;
  const nonRenewableFraction = 1 - homeEnergy.renewableEnergyPercent / 100;
  const electricityEmissions =
    annualElectricity * nonRenewableFraction * gridEmissionFactor;

  let heatingEmissions = 0;
  const baselineHeating = HEATING_ANNUAL_KG[homeEnergy.heatingType] || 0;

  if (homeEnergy.heatingType === "electric" || homeEnergy.heatingType === "heat_pump") {
    // Electric heating scaled by grid clean energy factor relative to baseline (0.5 kg/kWh) and renewable fraction
    heatingEmissions =
      baselineHeating * (gridEmissionFactor / 0.5) * nonRenewableFraction;
  } else {
    // Gas/Oil/None are static local emissions (gas/oil)
    heatingEmissions = baselineHeating;
  }

  return (electricityEmissions + heatingEmissions) / homeEnergy.numOccupants;
}

/**
 * Calculate annual food emissions in kg CO₂e
 * 
 * @param diet User diet type
 * @returns Annual food emissions in kg CO₂e
 */
export function calculateFoodEmissions(diet: UserProfile["diet"]): number {
  return DIET_ANNUAL_KG[diet] || 0;
}

/**
 * Calculate annual shopping emissions in kg CO₂e
 * 
 * @param intensity User shopping intensity
 * @returns Annual shopping emissions in kg CO₂e
 */
export function calculateShoppingEmissions(
  intensity: UserProfile["shoppingIntensity"]
): number {
  return SHOPPING_ANNUAL_KG[intensity] || 0;
}

/**
 * Calculate annual waste emissions (estimated from shopping + diet)
 * 
 * @param profile User profile
 * @returns Annual waste emissions in kg CO₂e
 */
export function calculateWasteEmissions(profile: UserProfile): number {
  const foodEmissions = calculateFoodEmissions(profile.diet);
  const shoppingEmissions = calculateShoppingEmissions(profile.shoppingIntensity);
  return 300 + foodEmissions * 0.05 + shoppingEmissions * 0.05;
}

/**
 * Calculate human-readable equivalences
 * 
 * @param kgCO2e Total emissions in kg CO₂e
 * @returns Equivalences structure
 */
export function calculateEquivalences(kgCO2e: number): CarbonScore["equivalences"] {
  return {
    treesNeededToOffset: Math.round(kgCO2e / 22),
    kmsDrivenEquivalent: Math.round(kgCO2e / 0.192),
    flightsEquivalent: Math.round(kgCO2e / 1000), // ~1 ton of CO2 per long flight
  };
}

/**
 * Master function: compute full CarbonScore from UserProfile
 * 
 * @param profile User profile
 * @returns Complete CarbonScore
 */
export function calculateCarbonScore(profile: UserProfile): CarbonScore {
  const transport = calculateTransportEmissions(profile.transport, profile.location.country);
  const homeEnergy = calculateEnergyEmissions(profile.homeEnergy, profile.location.gridEmissionFactor);
  const food = calculateFoodEmissions(profile.diet);
  const shopping = calculateShoppingEmissions(profile.shoppingIntensity);
  const waste = calculateWasteEmissions(profile);

  const totalKgCO2eYear = transport + homeEnergy + food + shopping + waste;
  const nationalAverageKg =
    NATIONAL_AVERAGES[profile.location.country] || NATIONAL_AVERAGES.DEFAULT;
  const targetKg = 2300; // 1.5°C target

  // Calculate percentile using logistic approximation of CDF (sd = 40% of mean)
  const z = (totalKgCO2eYear - nationalAverageKg) / (0.4 * nationalAverageKg);
  const percentileVsNational = Math.min(
    99.9,
    Math.max(0.1, Math.round((100 / (1 + Math.exp(-1.654 * z))) * 10) / 10)
  );

  const equivalences = calculateEquivalences(totalKgCO2eYear);

  return {
    totalKgCO2eYear,
    breakdown: {
      transport,
      homeEnergy,
      food,
      shopping,
      waste,
    },
    nationalAverageKg,
    targetKg,
    percentileVsNational,
    equivalences,
  };
}

/**
 * Simulate the impact of profile changes
 * Returns both original and simulated scores with delta
 * 
 * @param input Simulation input containing original profile and changes
 * @returns Complete SimulationResult
 */
export function simulateChanges(input: SimulationInput): SimulationResult {
  const originalScore = calculateCarbonScore(input.profile);

  // Deep clone transport and home energy to avoid mutating the original profile
  const simulatedProfile: UserProfile = {
    ...input.profile,
    transport: {
      ...input.profile.transport,
    },
    homeEnergy: {
      ...input.profile.homeEnergy,
    },
  };

  // Apply changes
  const changes = input.changes;
  
  if (changes.carKmPerWeek !== undefined) simulatedProfile.transport.carKmPerWeek = changes.carKmPerWeek;
  if (changes.fuelType !== undefined) simulatedProfile.transport.fuelType = changes.fuelType;
  if (changes.publicTransportTripsPerWeek !== undefined) {
    simulatedProfile.transport.publicTransportTripsPerWeek = changes.publicTransportTripsPerWeek;
  }
  if (changes.flightsPerYear !== undefined) simulatedProfile.transport.flightsPerYear = changes.flightsPerYear;
  if (changes.avgFlightDurationHours !== undefined) {
    simulatedProfile.transport.avgFlightDurationHours = changes.avgFlightDurationHours;
  }
  if (changes.cycleKmPerWeek !== undefined) simulatedProfile.transport.cycleKmPerWeek = changes.cycleKmPerWeek;

  if (changes.electricityKwhPerMonth !== undefined) {
    simulatedProfile.homeEnergy.electricityKwhPerMonth = changes.electricityKwhPerMonth;
  }
  if (changes.heatingType !== undefined) simulatedProfile.homeEnergy.heatingType = changes.heatingType;
  if (changes.numOccupants !== undefined) simulatedProfile.homeEnergy.numOccupants = changes.numOccupants;
  if (changes.renewableEnergyPercent !== undefined) {
    simulatedProfile.homeEnergy.renewableEnergyPercent = changes.renewableEnergyPercent;
  }

  if (changes.diet !== undefined) simulatedProfile.diet = changes.diet;
  if (changes.shoppingIntensity !== undefined) simulatedProfile.shoppingIntensity = changes.shoppingIntensity;

  // Calculate new score
  const simulatedScore = calculateCarbonScore(simulatedProfile);
  const deltakgCO2eYear = simulatedScore.totalKgCO2eYear - originalScore.totalKgCO2eYear;
  const percentageChange =
    originalScore.totalKgCO2eYear === 0
      ? 0
      : (deltakgCO2eYear / originalScore.totalKgCO2eYear) * 100;

  return {
    originalScore,
    simulatedScore,
    deltakgCO2eYear,
    percentageChange,
  };
}
