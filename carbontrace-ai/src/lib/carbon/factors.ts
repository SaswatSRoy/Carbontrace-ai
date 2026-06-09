/**
 * Carbon emission factors constants
 */

export const GRID_EMISSION_FACTORS: Record<string, number> = {
  IN: 0.82,
  US: 0.42,
  GB: 0.23,
  DE: 0.38,
  FR: 0.06,
  AU: 0.65,
  CA: 0.15,
  CN: 0.56,
  JP: 0.47,
  BR: 0.12,
  ZA: 0.87,
  DEFAULT: 0.50,
};

export const NATIONAL_AVERAGES: Record<string, number> = {
  IN: 2000,
  US: 16000,
  GB: 8500,
  DE: 10000,
  FR: 7200,
  AU: 15500,
  CA: 15000,
  CN: 8000,
  JP: 9000,
  DEFAULT: 7000,
};

export const TRANSPORT_FACTORS = {
  petrol_car: 0.192,
  diesel_car: 0.171,
  hybrid_car: 0.114,
  electric_car: 0.053,
  bus: 0.089,
  train: 0.041,
  metro: 0.028,
  short_flight_per_km: 0.255,
  long_flight_per_km: 0.195,
  rideshare_per_km: 0.149,
};

export const DIET_ANNUAL_KG = {
  vegan: 1100,
  vegetarian: 1600,
  low_meat: 1900,
  medium_meat: 2500,
  heavy_meat: 3300,
};

export const SHOPPING_ANNUAL_KG = {
  minimal: 800,
  average: 1600,
  heavy: 2800,
};

export const HEATING_ANNUAL_KG = {
  gas: 1800,
  oil: 2600,
  heat_pump: 600,
  electric: 1200,
  none: 0,
};
