"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ScoreRingProps {
  score?: number;
  maxScale?: number;
  animated?: boolean;
}

export function ScoreRing({ score, maxScale = 16000, animated = true }: ScoreRingProps) {
  const shouldReduceMotion = useReducedMotion();
  const isAnimated = animated && !shouldReduceMotion;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Loading Skeleton
  if (!mounted || score === undefined) {
    return (
      <div 
        className="relative flex items-center justify-center w-64 h-64 rounded-full bg-surface-2 animate-pulse"
        role="img"
        aria-label="Loading carbon footprint score"
      >
        <div className="flex flex-col items-center">
          <div className="h-8 w-24 bg-surface rounded mb-2"></div>
          <div className="h-4 w-16 bg-surface rounded"></div>
        </div>
      </div>
    );
  }

  // Color logic
  let color = "var(--color-primary)";
  if (score > 12000) color = "var(--color-danger)";
  else if (score > 8000) color = "var(--color-warning)";
  else if (score > 4000) color = "#84CC16"; // Good

  const radius = 100;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  // Cap score at maxScale for ring display
  const clampedScore = Math.min(score, maxScale);
  const percent = clampedScore / maxScale;
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div 
      className="relative flex items-center justify-center w-64 h-64"
      role="img"
      aria-label={`Your carbon footprint is ${Math.round(score)} kg CO2e per year`}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
        {/* Background Track */}
        <circle
          cx="120"
          cy="120"
          r={radius}
          fill="transparent"
          stroke="var(--color-surface-2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Ring */}
        <motion.circle
          cx="120"
          cy="120"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={isAnimated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-4xl font-bold tracking-tight text-text">
          {Math.round(score).toLocaleString()}
        </span>
        <span className="text-sm font-medium text-muted mt-1">kg CO₂e</span>
        <span className="text-xs text-muted">per year</span>
      </div>
    </div>
  );
}
