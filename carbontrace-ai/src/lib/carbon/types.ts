/**
 * Global carbon calculation types
 */

export interface UserProfile {
  userId: string;
  location: {
    country: string;
    city: string;
    gridEmissionFactor: number;
  };
  transport: {
    carKmPerWeek: number;
    fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'none';
    publicTransportTripsPerWeek: number;
    flightsPerYear: number;
    avgFlightDurationHours: number;
    cycleKmPerWeek: number;
  };
  homeEnergy: {
    electricityKwhPerMonth: number;
    heatingType: 'gas' | 'electric' | 'oil' | 'heat_pump' | 'none';
    numOccupants: number;
    renewableEnergyPercent: number; // 0-100
  };
  diet: 'vegan' | 'vegetarian' | 'low_meat' | 'medium_meat' | 'heavy_meat';
  shoppingIntensity: 'minimal' | 'average' | 'heavy';
  createdAt: Date;
  updatedAt: Date;
}

export interface CarbonScore {
  totalKgCO2eYear: number;
  breakdown: {
    transport: number;
    homeEnergy: number;
    food: number;
    shopping: number;
    waste: number;
  };
  nationalAverageKg: number;
  targetKg: number; // 2300 kg for 1.5°C
  percentileVsNational: number; // 0-100 (lower = better)
  equivalences: {
    treesNeededToOffset: number;
    kmsDrivenEquivalent: number;
    flightsEquivalent: number;
  };
}

export interface SimulationInput {
  profile: UserProfile;
  changes: Partial<
    UserProfile['transport'] &
      UserProfile['homeEnergy'] & {
        diet: UserProfile['diet'];
        shoppingIntensity: UserProfile['shoppingIntensity'];
      }
  >;
}

export interface SimulationResult {
  originalScore: CarbonScore;
  simulatedScore: CarbonScore;
  deltakgCO2eYear: number; // negative = reduction
  percentageChange: number;
}

export type ActionStatus = 'pending' | 'accepted' | 'dismissed' | 'completed';

export interface Action {
  id?: string;
  title: string;
  description: string;
  annual_saving_kg: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cost_impact: 'saves_money' | 'free' | 'small_cost' | 'investment';
  category: string;
  why_this_applies_to_user: string;
  status?: ActionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CarbonLog {
  id?: string;
  userId: string;
  date: Date;
  kgCO2e: number;
  category: string;
  source: 'bill_scan' | 'manual_entry' | 'system';
  description: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}
