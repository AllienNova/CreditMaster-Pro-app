/**
 * GraduationProgress Component Tests
 *
 * Tests for loading, rendering criteria, graduation button states,
 * error handling, and the onGraduate callback.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GraduationProgress } from "../GraduationProgress";
import type { GraduationProgressReport } from "@/lib/trading/modes/mode-types";

// ============================================================================
// MOCKS
// ============================================================================

const mockProgressReport: GraduationProgressReport = {
  currentMode: "watch",
  nextMode: "guided",
  allCriteriaMet: false,
  summary: "Complete more paper trades to advance.",
  criteria: {
    paperTrades: { current: 15, required: 30, met: false },
    daysActive: { current: 20, required: 30, met: false },
    profitable: { current: true, required: true, met: true },
  },
};

const mockAllMetReport: GraduationProgressReport = {
  currentMode: "watch",
  nextMode: "guided",
  allCriteriaMet: true,
  summary: "All criteria met. You can graduate now!",
  criteria: {
    paperTrades: { current: 30, required: 30, met: true },
    daysActive: { current: 30, required: 30, met: true },
    profitable: { current: true, required: true, met: true },
  },
};

// ============================================================================
// SETUP
// ============================================================================

describe("GraduationProgress", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ========================================================================
  // Loading state
  // ========================================================================

  it("shows loading state while fetching", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<GraduationProgress />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  // ========================================================================
  // Criteria rendering
  // ========================================================================

  it("renders progress for each criterion", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockProgressReport }),
    });

    render(<GraduationProgress />);

    await waitFor(() => {
      expect(screen.getByText("Graduation Progress")).toBeInTheDocument();
    });

    // Numeric criteria
    expect(screen.getByText("15 / 30")).toBeInTheDocument();
    expect(screen.getByText("20 / 30")).toBeInTheDocument();

    // Boolean criterion
    expect(screen.getByText("Yes")).toBeInTheDocument();

    // Summary
    expect(
      screen.getByText("Complete more paper trades to advance."),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Graduate button - disabled
  // ========================================================================

  it("disables graduate button when criteria are not met", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockProgressReport }),
    });

    render(<GraduationProgress />);

    await waitFor(() => {
      expect(screen.getByText("Graduation Progress")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", { name: /graduation criteria not yet met/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Criteria Not Met");
  });

  // ========================================================================
  // Graduate button - enabled and clickable
  // ========================================================================

  it("enables graduate button when all criteria are met and handles click", async () => {
    const onGraduate = jest.fn();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAllMetReport }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: { currentMode: "guided" } }),
      });

    render(<GraduationProgress onGraduate={onGraduate} />);

    await waitFor(() => {
      expect(screen.getByText("Graduation Progress")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", {
      name: /graduate to guided mode/i,
    });
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("Graduate to Guided");

    fireEvent.click(button);

    await waitFor(() => {
      expect(onGraduate).toHaveBeenCalledWith("guided");
    });

    // Verify POST was called
    expect(global.fetch).toHaveBeenCalledWith("/api/trading/modes/graduate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });

  // ========================================================================
  // Error state
  // ========================================================================

  it("shows error state when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<GraduationProgress />);

    await waitFor(() => {
      expect(
        screen.getByText("Error loading graduation progress"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Failed to fetch progress: 500"),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Graduation failure callback
  // ========================================================================

  it("shows error when graduation request fails", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAllMetReport }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

    render(<GraduationProgress />);

    await waitFor(() => {
      expect(screen.getByText("Graduation Progress")).toBeInTheDocument();
    });

    const button = screen.getByRole("button", {
      name: /graduate to guided mode/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Graduation failed: 400")).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockProgressReport }),
    });

    const { container } = render(
      <GraduationProgress className="mt-8" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Graduation Progress")).toBeInTheDocument();
    });

    expect(container.firstChild).toHaveClass("mt-8");
  });
});
