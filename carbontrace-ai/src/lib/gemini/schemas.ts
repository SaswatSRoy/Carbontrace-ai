import { z } from "zod";
import { Schema, SchemaType } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// 1. Profile Extraction
// ---------------------------------------------------------------------------

export const ProfileExtractionZod = z.object({
  location: z.object({
    country: z.string().describe("ISO 3166-1 alpha-2 country code (e.g. US, IN, GB)"),
    city: z.string(),
  }),
  transport: z.object({
    carKmPerWeek: z.number(),
    fuelType: z.enum(["petrol", "diesel", "electric", "hybrid", "none"]),
    publicTransportTripsPerWeek: z.number(),
    flightsPerYear: z.number(),
    avgFlightDurationHours: z.number(),
    cycleKmPerWeek: z.number(),
  }),
  homeEnergy: z.object({
    electricityKwhPerMonth: z.number(),
    heatingType: z.enum(["gas", "electric", "oil", "heat_pump", "none"]),
    numOccupants: z.number().min(1),
    renewableEnergyPercent: z.number().min(0).max(100),
  }),
  diet: z.enum(["vegan", "vegetarian", "low_meat", "medium_meat", "heavy_meat"]),
  shoppingIntensity: z.enum(["minimal", "average", "heavy"]),
});

export const ProfileExtractionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    location: {
      type: SchemaType.OBJECT,
      properties: {
        country: { type: SchemaType.STRING, description: "ISO 2-letter country code (e.g., US, IN, GB)" },
        city: { type: SchemaType.STRING },
      },
      required: ["country", "city"],
    },
    transport: {
      type: SchemaType.OBJECT,
      properties: {
        carKmPerWeek: { type: SchemaType.NUMBER },
        fuelType: { type: SchemaType.STRING, description: "One of: petrol, diesel, electric, hybrid, none" },
        publicTransportTripsPerWeek: { type: SchemaType.NUMBER },
        flightsPerYear: { type: SchemaType.NUMBER },
        avgFlightDurationHours: { type: SchemaType.NUMBER },
        cycleKmPerWeek: { type: SchemaType.NUMBER },
      },
      required: [
        "carKmPerWeek",
        "fuelType",
        "publicTransportTripsPerWeek",
        "flightsPerYear",
        "avgFlightDurationHours",
        "cycleKmPerWeek",
      ],
    },
    homeEnergy: {
      type: SchemaType.OBJECT,
      properties: {
        electricityKwhPerMonth: { type: SchemaType.NUMBER },
        heatingType: { type: SchemaType.STRING, description: "One of: gas, electric, oil, heat_pump, none" },
        numOccupants: { type: SchemaType.NUMBER },
        renewableEnergyPercent: { type: SchemaType.NUMBER },
      },
      required: ["electricityKwhPerMonth", "heatingType", "numOccupants", "renewableEnergyPercent"],
    },
    diet: {
      type: SchemaType.STRING,
      description: "One of: vegan, vegetarian, low_meat, medium_meat, heavy_meat",
    },
    shoppingIntensity: {
      type: SchemaType.STRING,
      description: "One of: minimal, average, heavy",
    },
  },
  required: ["location", "transport", "homeEnergy", "diet", "shoppingIntensity"],
};

// ---------------------------------------------------------------------------
// 2. Action Plan
// ---------------------------------------------------------------------------

export const ActionPlanZod = z.array(
  z.object({
    title: z.string(),
    description: z.string(),
    annual_saving_kg: z.number(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    cost_impact: z.enum(["saves_money", "free", "small_cost", "investment"]),
    category: z.string(),
    why_this_applies_to_user: z.string(),
  })
).length(5);

export const ActionPlanSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING, description: "2 sentences max" },
      annual_saving_kg: { type: SchemaType.NUMBER },
      difficulty: { type: SchemaType.STRING, description: "easy, medium, or hard" },
      cost_impact: { type: SchemaType.STRING, description: "saves_money, free, small_cost, or investment" },
      category: { type: SchemaType.STRING },
      why_this_applies_to_user: { type: SchemaType.STRING, description: "1 sentence specific to profile" },
    },
    required: [
      "title",
      "description",
      "annual_saving_kg",
      "difficulty",
      "cost_impact",
      "category",
      "why_this_applies_to_user",
    ],
  },
};

// ---------------------------------------------------------------------------
// 3. Bill Extraction
// ---------------------------------------------------------------------------

export const BillExtractionZod = z.object({
  billing_period_start: z.string().nullable(),
  billing_period_end: z.string().nullable(),
  electricity_kwh: z.number().nullable(),
  gas_units: z.number().nullable(),
  gas_unit_type: z.enum(["therm", "m3", "kWh"]).nullable(),
  total_amount: z.number().nullable(),
  currency: z.string().nullable(),
  provider_name: z.string().nullable(),
  fuel_type: z.enum(["electricity", "gas", "dual", "other"]).nullable(),
  error: z.string().optional(),
});

export const BillExtractionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    billing_period_start: { type: SchemaType.STRING, nullable: true },
    billing_period_end: { type: SchemaType.STRING, nullable: true },
    electricity_kwh: { type: SchemaType.NUMBER, nullable: true },
    gas_units: { type: SchemaType.NUMBER, nullable: true },
    gas_unit_type: { type: SchemaType.STRING, nullable: true, description: "therm, m3, or kWh" },
    total_amount: { type: SchemaType.NUMBER, nullable: true },
    currency: { type: SchemaType.STRING, nullable: true },
    provider_name: { type: SchemaType.STRING, nullable: true },
    fuel_type: { type: SchemaType.STRING, nullable: true, description: "electricity, gas, dual, or other" },
    error: { type: SchemaType.STRING, nullable: true, description: "Set this if the image is not a utility bill" },
  },
};

// ---------------------------------------------------------------------------
// 4. Simulation Narrator
// ---------------------------------------------------------------------------

export const SimulationNarratorZod = z.object({
  narration: z.string(),
});

export const SimulationNarratorSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    narration: { type: SchemaType.STRING, description: "2-3 sentences engaging narrative" },
  },
  required: ["narration"],
};
