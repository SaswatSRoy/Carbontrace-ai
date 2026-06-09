"use client";

import React from "react";
import { Check, X, Leaf, Zap, Home, ShoppingBag, Trash2 } from "lucide-react";

interface Action {
  title: string;
  description: string;
  annual_saving_kg: number;
  difficulty: "easy" | "medium" | "hard";
  cost_impact: "saves_money" | "free" | "small_cost" | "investment";
  category: string;
  why_this_applies_to_user: string;
}

interface ActionCardProps {
  action: Action;
  onAccept: () => void;
  onDismiss: () => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  transport: Leaf,
  homeEnergy: Zap,
  food: Home,
  shopping: ShoppingBag,
  waste: Trash2,
};

export function ActionCard({ action, onAccept, onDismiss }: ActionCardProps) {
  const Icon = CATEGORY_ICONS[action.category] || Leaf;

  // Difficulty renderer
  const difficultyDots = {
    easy: "● Easy",
    medium: "●● Medium",
    hard: "●●● Hard"
  };

  // Cost renderer
  const costLabels = {
    saves_money: "💰 Saves Money",
    free: "🆓 Free",
    small_cost: "💲 Small Cost",
    investment: "💎 Investment"
  };

  return (
    <div 
      className="bg-surface rounded-xl p-6 shadow-subtle border border-surface-2 flex flex-col focus-within:ring-2 focus-within:ring-primary outline-none transition-all hover:border-accent/30"
      tabIndex={0}
      role="region"
      aria-label={`Action recommendation: ${action.title}`}
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-surface-2 rounded-full text-accent">
          <Icon size={20} aria-hidden="true" />
        </div>
        <h3 className="font-bold text-lg text-text flex-1">{action.title}</h3>
      </div>

      <p className="text-sm text-text mb-3 leading-relaxed">{action.description}</p>
      
      <div className="bg-surface-2 p-3 rounded-lg border-l-2 border-primary mb-4">
        <p className="text-sm italic text-muted">&quot;{action.why_this_applies_to_user}&quot;</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" aria-label="Action attributes">
        <span 
          className="px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-pill"
          aria-label={`Saves ${Math.round(action.annual_saving_kg)} kilograms per year`}
        >
          Save {Math.round(action.annual_saving_kg)} kg/yr
        </span>
        <span 
          className="px-3 py-1 bg-surface-2 text-muted text-xs font-medium rounded-pill"
          aria-label={`Difficulty: ${action.difficulty}`}
        >
          {difficultyDots[action.difficulty]}
        </span>
        <span 
          className="px-3 py-1 bg-surface-2 text-muted text-xs font-medium rounded-pill"
          aria-label={`Cost impact: ${action.cost_impact.replace("_", " ")}`}
        >
          {costLabels[action.cost_impact]}
        </span>
      </div>

      <div className="flex space-x-3 mt-auto pt-2 border-t border-surface-2">
        <button
          onClick={onAccept}
          className="flex-1 py-2 bg-primary text-bg font-semibold rounded-button hover:bg-primary/90 transition-colors flex justify-center items-center"
          aria-label={`Accept action: ${action.title}`}
        >
          <Check size={18} className="mr-2" /> Accept
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-2 bg-transparent border border-muted text-muted font-semibold rounded-button hover:bg-surface-2 hover:text-text transition-colors flex justify-center items-center"
          aria-label={`Dismiss action: ${action.title}`}
        >
          <X size={18} className="mr-2" /> Dismiss
        </button>
      </div>
    </div>
  );
}
