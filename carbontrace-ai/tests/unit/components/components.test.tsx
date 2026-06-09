import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ScoreRing } from '../../../src/components/dashboard/ScoreRing';
import { ActionCard } from '../../../src/components/actions/ActionCard';

// Simple mock for ResizeObserver used by Recharts/Framer Motion
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Accessibility & Rendering Tests', () => {
  it('ScoreRing renders with accessible role and label', () => {
    render(<ScoreRing score={5000} animated={false} />);
    const ring = screen.getByRole('img');
    expect(ring).toBeDefined();
    expect(ring.getAttribute('aria-label')).toMatch(/5000 kg CO2e/i);
  });

  it('ActionCard renders all accessible buttons and badges', () => {
    const mockAction = {
      title: 'LED Bulbs',
      description: 'Switch to LEDs.',
      annual_saving_kg: 50,
      difficulty: 'easy' as const,
      cost_impact: 'small_cost' as const,
      category: 'homeEnergy',
      why_this_applies_to_user: 'You use old bulbs.'
    };

    render(<ActionCard action={mockAction} onAccept={vi.fn()} onDismiss={vi.fn()} />);
    
    // Check main container
    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toMatch(/Action recommendation: LED Bulbs/i);

    // Check buttons
    const acceptBtn = screen.getByLabelText(/Accept action: LED Bulbs/i);
    expect(acceptBtn).toBeDefined();
    
    const dismissBtn = screen.getByLabelText(/Dismiss action: LED Bulbs/i);
    expect(dismissBtn).toBeDefined();
  });
});
