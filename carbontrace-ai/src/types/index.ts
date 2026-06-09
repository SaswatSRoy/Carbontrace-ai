/**
 * Global TypeScript types for CarbonTrace AI
 */

/**
 * Represents a user in the system
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

/**
 * Represents a generic carbon footprint calculation
 */
export interface CarbonScore {
  totalEmissions: number;
  category: string;
  timestamp: string;
}
