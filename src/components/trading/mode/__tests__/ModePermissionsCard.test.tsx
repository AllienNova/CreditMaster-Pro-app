/**
 * ModePermissionsCard Component Tests
 *
 * Tests for loading state, permission rendering, and error handling.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ModePermissionsCard } from "../ModePermissionsCard";
import type { ModePermissions } from "@/lib/trading/modes/mode-types";

// ============================================================================
// MOCKS
// ============================================================================

const mockWatchPermissions: ModePermissions = {
  mode: "watch",
  canViewSignals: true,
  canPaperTrade: true,
  canPlaceLiveOrders: false,
  requiresConfirmation: false,
  canAutoExecute: false,
};

const mockAutonomousPermissions: ModePermissions = {
  mode: "autonomous",
  canViewSignals: true,
  canPaperTrade: true,
  canPlaceLiveOrders: true,
  requiresConfirmation: false,
  canAutoExecute: true,
};

// ============================================================================
// TESTS
// ============================================================================

describe("ModePermissionsCard", () => {
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

    const { container } = render(<ModePermissionsCard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  // ========================================================================
  // Renders permissions correctly
  // ========================================================================

  it("renders all permissions for WATCH mode", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockWatchPermissions }),
    });

    render(<ModePermissionsCard />);

    await waitFor(() => {
      expect(screen.getByText("Mode Permissions")).toBeInTheDocument();
    });

    // Check mode badge
    expect(screen.getByText("WATCH")).toBeInTheDocument();

    // Check permission labels
    expect(screen.getByText("View Trading Signals")).toBeInTheDocument();
    expect(screen.getByText("Paper Trading")).toBeInTheDocument();
    expect(screen.getByText("Live Orders")).toBeInTheDocument();
    expect(screen.getByText("Requires Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Auto-Execute Trades")).toBeInTheDocument();
  });

  it("renders all permissions for AUTONOMOUS mode with correct enabled states", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: mockAutonomousPermissions }),
    });

    render(<ModePermissionsCard />);

    await waitFor(() => {
      expect(screen.getByText("Mode Permissions")).toBeInTheDocument();
    });

    // Check AUTONOMOUS badge
    expect(screen.getByText("AUTONOMOUS")).toBeInTheDocument();

    // Verify descriptions are rendered
    expect(
      screen.getByText(
        "See AI-generated trade signals and recommendations",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Execute simulated trades with virtual funds"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Place real orders with actual funds"),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Error state
  // ========================================================================

  it("shows error state when fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<ModePermissionsCard />);

    await waitFor(() => {
      expect(
        screen.getByText("Error loading permissions"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Failed to fetch permissions: 500"),
    ).toBeInTheDocument();
  });

  // ========================================================================
  // Network error
  // ========================================================================

  it("handles network errors gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<ModePermissionsCard />);

    await waitFor(() => {
      expect(
        screen.getByText("Error loading permissions"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  // ========================================================================
  // Custom className
  // ========================================================================

  it("applies custom className", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockWatchPermissions }),
    });

    const { container } = render(
      <ModePermissionsCard className="mt-4" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Mode Permissions")).toBeInTheDocument();
    });

    expect(container.firstChild).toHaveClass("mt-4");
  });
});
