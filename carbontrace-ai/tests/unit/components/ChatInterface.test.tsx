import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatInterface } from "@/components/onboard/ChatInterface";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual as any,
    useReducedMotion: vi.fn(() => false),
  };
});

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("ChatInterface", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders message input and send button", () => {
    render(<ChatInterface onComplete={mockOnComplete} />);
    expect(screen.getByPlaceholderText("Type your answer...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
    expect(screen.getByRole("log")).toBeInTheDocument(); // aria-live region
  });

  it("submits on Enter key and shows AI response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "AI says hello", profileExtracted: false }),
    });

    render(<ChatInterface onComplete={mockOnComplete} />);
    const input = screen.getByPlaceholderText("Type your answer...");
    
    fireEvent.change(input, { target: { value: "Hello EcoGuide" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: false });

    // Loading indicator appears
    expect(screen.getByLabelText("EcoGuide is typing")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("AI says hello")).toBeInTheDocument();
    });

    // Loading indicator disappears
    expect(screen.queryByLabelText("EcoGuide is typing")).not.toBeInTheDocument();
    
    // Input is cleared
    expect(input).toHaveValue("");
  });

  it("does NOT submit on Shift+Enter", async () => {
    render(<ChatInterface onComplete={mockOnComplete} />);
    const input = screen.getByPlaceholderText("Type your answer...");
    
    fireEvent.change(input, { target: { value: "Line 1\nLine 2" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: true });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(input).toHaveValue("Line 1\nLine 2");
  });

  it("disables input and button while loading", async () => {
    // Return a promise that doesn't resolve immediately
    let resolvePromise: any;
    (global.fetch as any).mockReturnValueOnce(new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<ChatInterface onComplete={mockOnComplete} />);
    const input = screen.getByPlaceholderText("Type your answer...");
    const button = screen.getByRole("button", { name: "Send message" });

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(button);

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();

    // Resolve the promise to finish the test cleanly
    resolvePromise({
      ok: true,
      json: async () => ({ reply: "Done", profileExtracted: false }),
    });

    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it("calls onComplete when profile is extracted", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Great!", profileExtracted: true }),
    });

    render(<ChatInterface onComplete={mockOnComplete} />);
    
    fireEvent.change(screen.getByPlaceholderText("Type your answer..."), { target: { value: "Test message" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 2500 }); // timeout in component is 2000ms
  });
});
