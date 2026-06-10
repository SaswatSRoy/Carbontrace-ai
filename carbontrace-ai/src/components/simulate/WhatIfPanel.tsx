"use client";

import React, { useState, useEffect } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { auth } from "../../lib/firebase/client"; // assuming available
import { SimulationResult, UserProfile } from "../../lib/carbon/types";
import { Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface WhatIfPanelProps {
  baseProfile: UserProfile;
  baseScoreKg: number;
}

export function WhatIfPanel({ baseProfile, baseScoreKg }: WhatIfPanelProps) {
  const [carKm, setCarKm] = useState(baseProfile.transport.carKmPerWeek);
  const [flights, setFlights] = useState(baseProfile.transport.flightsPerYear);
  const [dietIndex, setDietIndex] = useState(dietToIndex(baseProfile.diet));
  const [electricity, setElectricity] = useState(baseProfile.homeEnergy.electricityKwhPerMonth);
  const [shoppingIndex, setShoppingIndex] = useState(shoppingToIndex(baseProfile.shoppingIntensity));

  const debouncedCarKm = useDebounce(carKm, 300);
  const debouncedFlights = useDebounce(flights, 300);
  const debouncedDiet = useDebounce(dietIndex, 300);
  const debouncedElectricity = useDebounce(electricity, 300);
  const debouncedShopping = useDebounce(shoppingIndex, 300);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [narration, setNarration] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);

  // Sync with API when debounced values change
  useEffect(() => {
    const runSimulation = async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const changes: Partial<UserProfile> = {
          transport: { ...baseProfile.transport, carKmPerWeek: debouncedCarKm, flightsPerYear: debouncedFlights },
          diet: indexToDiet(debouncedDiet),
          homeEnergy: { ...baseProfile.homeEnergy, electricityKwhPerMonth: debouncedElectricity },
          shoppingIntensity: indexToShopping(debouncedShopping)
        };

        let appCheckTokenStr = "";
        if (typeof window !== "undefined") {
          try {
            const { appCheck } = await import("../../lib/firebase/client");
            if (appCheck) {
              const { getToken } = await import("firebase/app-check");
              const tokenResult = await getToken(appCheck as any, false);
              appCheckTokenStr = tokenResult.token;
            }
          } catch (e) {
            console.warn("App check token fetch failed", e);
          }
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        };
        
        if (appCheckTokenStr) {
          headers["X-Firebase-AppCheck"] = appCheckTokenStr;
        }

        const response = await fetch("/api/carbon/simulate", {
          method: "POST",
          headers,
          body: JSON.stringify({ changes })
        });
        
        if (response.ok) {
          const data = await response.json();
          setSimResult(data);
          // Clear old narration when values change
          setNarration(null);
        }
      } catch (e) {
        console.error("Simulation failed", e);
      }
    };
    
    runSimulation();
  }, [debouncedCarKm, debouncedFlights, debouncedDiet, debouncedElectricity, debouncedShopping, baseProfile]);

  const handleExplain = async () => {
    setIsNarrating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const changes: Partial<UserProfile> = {
        transport: { ...baseProfile.transport, carKmPerWeek: carKm, flightsPerYear: flights },
        diet: indexToDiet(dietIndex),
        homeEnergy: { ...baseProfile.homeEnergy, electricityKwhPerMonth: electricity },
        shoppingIntensity: indexToShopping(shoppingIndex)
      };

      let appCheckTokenStr = "";
      if (typeof window !== "undefined") {
        try {
          const { appCheck } = await import("../../lib/firebase/client");
          if (appCheck) {
            const { getToken } = await import("firebase/app-check");
            const tokenResult = await getToken(appCheck as any, false);
            appCheckTokenStr = tokenResult.token;
          }
        } catch (e) {
          console.warn("App check token fetch failed", e);
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      };
      
      if (appCheckTokenStr) {
        headers["X-Firebase-AppCheck"] = appCheckTokenStr;
      }

      const response = await fetch("/api/carbon/simulate", {
        method: "POST",
        headers,
        body: JSON.stringify({ changes, includeNarration: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.narration) setNarration(data.narration);
      } else {
        toast.error("Failed to generate explanation");
      }
    } catch (e) {
      toast.error("Error connecting to AI");
    } finally {
      setIsNarrating(false);
    }
  };

  const deltaKg = simResult ? simResult.deltakgCO2eYear : 0;
  const simulatedKg = simResult ? simResult.simulatedScore.totalKgCO2eYear : baseScoreKg;
  const isSaving = deltaKg < 0;

  return (
    <div className="w-full flex flex-col md:flex-row gap-6">
      {/* Sliders Container */}
      <div className="flex-1 bg-surface rounded-xl p-6 shadow-subtle border border-surface-2 space-y-6">
        <h3 className="text-xl font-bold text-text">Simulate Changes</h3>
        
        <SliderRow 
          label="Car Usage" 
          value={carKm} 
          min={0} max={500} step={10} 
          unit="km/week" 
          onChange={setCarKm} 
        />
        <SliderRow 
          label="Flights" 
          value={flights} 
          min={0} max={10} step={1} 
          unit="per year" 
          onChange={setFlights} 
        />
        <SliderRow 
          label="Diet (Meat level)" 
          value={dietIndex} 
          min={0} max={4} step={1} 
          unit="" 
          displayValue={indexToDietDisplay(dietIndex)}
          onChange={setDietIndex} 
        />
        <SliderRow 
          label="Electricity" 
          value={electricity} 
          min={0} max={1000} step={50} 
          unit="kWh/mo" 
          onChange={setElectricity} 
        />
        <SliderRow 
          label="Shopping Intensity" 
          value={shoppingIndex} 
          min={0} max={2} step={1} 
          unit="" 
          displayValue={indexToShoppingDisplay(shoppingIndex)}
          onChange={setShoppingIndex} 
        />
      </div>

      {/* Result Card */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="bg-surface rounded-xl p-6 shadow-subtle border border-surface-2 flex flex-col items-center text-center">
          <p className="text-muted text-sm uppercase tracking-wider mb-2">Simulated Footprint</p>
          <div className="text-4xl font-bold text-text mb-1 transition-all duration-300">
            {Math.round(simulatedKg).toLocaleString()}
          </div>
          <p className="text-muted text-sm mb-6">kg CO₂e / year</p>
          
          <div className={`text-lg font-semibold px-4 py-2 rounded-pill ${isSaving ? 'bg-primary/20 text-primary' : deltaKg > 0 ? 'bg-danger/20 text-danger' : 'bg-surface-2 text-muted'}`}>
            {isSaving ? "Save " : deltaKg > 0 ? "Add " : ""}
            {Math.abs(Math.round(deltaKg)).toLocaleString()} kg
          </div>
        </div>

        <button
          onClick={handleExplain}
          disabled={isNarrating || Math.abs(deltaKg) < 10}
          className="w-full py-3 bg-surface-2 hover:bg-surface border border-accent/20 rounded-button text-accent font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
          aria-label="Ask AI to explain these changes"
        >
          {isNarrating ? <Loader2 className="animate-spin mr-2" size={18} /> : <Sparkles className="mr-2" size={18} />}
          Explain This
        </button>

        {narration && (
          <div 
            className="bg-surface-2 p-4 rounded-xl shadow-subtle border border-accent/30 text-sm leading-relaxed"
            aria-live="assertive"
          >
            {narration}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for Sliders
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
  displayValue?: string | number;
}

function SliderRow({ label, value, min, max, step, unit, onChange, displayValue }: SliderRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") onChange(Math.min(max, value + step));
    if (e.key === "ArrowLeft") onChange(Math.max(min, value - step));
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-text">{label}</label>
        <span className="text-sm text-accent font-medium">{displayValue || value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={handleKeyDown}
        className="w-full accent-primary bg-surface-2 h-2 rounded-pill appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={label}
      />
    </div>
  );
}

// Helpers
const DIETS = ["vegan", "vegetarian", "low_meat", "medium_meat", "heavy_meat"] as const;
const DIET_DISPLAY = ["Vegan", "Vegetarian", "Low Meat", "Medium Meat", "Heavy Meat"];
function dietToIndex(diet: string) { return Math.max(0, DIETS.indexOf(diet as any)); }
function indexToDiet(idx: number) { return DIETS[idx]; }
function indexToDietDisplay(idx: number) { return DIET_DISPLAY[idx]; }

const SHOPPING = ["minimal", "average", "heavy"] as const;
const SHOPPING_DISPLAY = ["Minimal", "Average", "Heavy"];
function shoppingToIndex(shop: string) { return Math.max(0, SHOPPING.indexOf(shop as any)); }
function indexToShopping(idx: number) { return SHOPPING[idx]; }
function indexToShoppingDisplay(idx: number) { return SHOPPING_DISPLAY[idx]; }
