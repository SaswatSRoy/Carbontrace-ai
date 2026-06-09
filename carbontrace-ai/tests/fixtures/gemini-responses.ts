export const mockProfileExtraction = {
  functionCalls: () => [
    {
      name: "extract_profile",
      args: {
        location: { country: "US", city: "Seattle" },
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
      },
    },
  ],
  text: () => "",
};

export const mockInsightsResponse = JSON.stringify([
  {
    title: "Switch to a Plant-Based Diet",
    description: "Reducing meat consumption significantly lowers your footprint. Try meatless days.",
    annual_saving_kg: 500,
    difficulty: "medium",
    cost_impact: "saves_money",
    category: "food",
    why_this_applies_to_user: "Since you eat a medium amount of meat, this is your biggest area for improvement.",
  },
  {
    title: "Use Public Transport",
    description: "Take the bus or train to work.",
    annual_saving_kg: 200,
    difficulty: "easy",
    cost_impact: "saves_money",
    category: "transport",
    why_this_applies_to_user: "You drive 100km per week, replacing some of this helps.",
  },
  {
    title: "LED Bulbs",
    description: "Switch all bulbs to LED.",
    annual_saving_kg: 50,
    difficulty: "easy",
    cost_impact: "investment",
    category: "homeEnergy",
    why_this_applies_to_user: "Your electricity usage is moderate.",
  },
  {
    title: "Buy Second Hand",
    description: "Purchase used electronics and clothes.",
    annual_saving_kg: 100,
    difficulty: "medium",
    cost_impact: "saves_money",
    category: "shopping",
    why_this_applies_to_user: "Your shopping intensity is average.",
  },
  {
    title: "Green Energy",
    description: "Switch to a green energy provider.",
    annual_saving_kg: 300,
    difficulty: "easy",
    cost_impact: "small_cost",
    category: "homeEnergy",
    why_this_applies_to_user: "You currently use 0% renewable energy.",
  },
]);

export const mockBillExtractionResponse = JSON.stringify({
  billing_period_start: "2023-01-01",
  billing_period_end: "2023-01-31",
  electricity_kwh: 350,
  gas_units: null,
  gas_unit_type: null,
  total_amount: 55.2,
  currency: "USD",
  provider_name: "City Power",
  fuel_type: "electricity",
});

export const mockSimulationNarratorResponse = JSON.stringify({
  narration: "Wow, switching to a vegan diet makes a huge difference! You've saved over 1,000 kg of CO2 per year. That's equivalent to planting nearly 50 trees.",
});
