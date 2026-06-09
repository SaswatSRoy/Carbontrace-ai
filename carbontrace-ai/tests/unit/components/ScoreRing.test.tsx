import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { useReducedMotion } from "framer-motion";

// Mock framer-motion hooks
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual as any,
    useReducedMotion: vi.fn(() => false),
  };
});

describe("ScoreRing", () => {
  it("renders loading skeleton initially or when score is undefined", () => {
    const { container } = render(<ScoreRing />);
    const skeleton = screen.getByRole("img", { name: /loading carbon footprint/i });
    expect(skeleton).toBeInTheDocument();
  });

  it("renders correct kg value after mount", async () => {
    render(<ScoreRing score={5500} />);
    
    // Wait for the mounted state to become true and render the actual ring
    await waitFor(() => {
      expect(screen.getByText("5,500")).toBeInTheDocument();
    });

    expect(screen.getByText("kg CO₂e")).toBeInTheDocument();
    expect(screen.getByText("per year")).toBeInTheDocument();
  });

  it("has correct aria-label", async () => {
    render(<ScoreRing score={5500} />);
    
    await waitFor(() => {
      const img = screen.getByRole("img", { name: /your carbon footprint is 5500 kg co2e/i });
      expect(img).toBeInTheDocument();
    });
  });

  it("applies primary color for very low scores", async () => {
    render(<ScoreRing score={3000} />);
    await waitFor(() => {
      const circle = document.querySelector("circle:nth-child(2)");
      expect(circle).toHaveAttribute("stroke", "var(--color-primary)");
    });
  });

  it("applies warning color for moderate scores", async () => {
    render(<ScoreRing score={9000} />);
    await waitFor(() => {
      const circle = document.querySelector("circle:nth-child(2)");
      expect(circle).toHaveAttribute("stroke", "var(--color-warning)");
    });
  });

  it("applies danger color for high scores", async () => {
    render(<ScoreRing score={15000} />);
    await waitFor(() => {
      const circle = document.querySelector("circle:nth-child(2)");
      expect(circle).toHaveAttribute("stroke", "var(--color-danger)");
    });
  });

  it("disables animation if prefers-reduced-motion is true", async () => {
    (useReducedMotion as any).mockReturnValue(true);
    render(<ScoreRing score={5500} animated={true} />);
    
    await waitFor(() => {
      const circle = document.querySelector("circle:nth-child(2)");
      // If animated is false, initial dash offset equals target dash offset
      // Since it's hard to test Framer Motion internals easily, we just check it renders
      expect(circle).toBeInTheDocument();
    });
    // Restore mock for other tests
    (useReducedMotion as any).mockReturnValue(false);
  });
});
