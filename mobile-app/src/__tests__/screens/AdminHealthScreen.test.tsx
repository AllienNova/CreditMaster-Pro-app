/**
 * Admin System Health Screen — real-data wiring (M4-1).
 *
 * The screen used to render a hardcoded SERVICES array (with fabricated uptime %,
 * response-ms, and "30s ago" values) behind a fake setTimeout load. It now
 * fetches live per-service liveness from adminHealthApi.getSystemHealth
 * (GET /api/admin/health) with honest inline loading / error / empty states and a
 * header refresh. These tests prove the real services render with honest status
 * (unknown/degraded/down are NOT laundered into a green "operational"), the
 * former hardcoded services + fabricated metrics never appear, and each honest
 * state shows. The API boundary is mocked — no live route is hit.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { SystemHealth } from "../../services/api/admin";

const mockGetSystemHealth = jest.fn();

jest.mock("../../services/api/admin", () => ({
  adminHealthApi: {
    getSystemHealth: (...args: unknown[]) => mockGetSystemHealth(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AdminHealthScreen from "../../../app/admin/health";

function systemHealth(over: Partial<SystemHealth> = {}): SystemHealth {
  return {
    status: "down",
    checkedAt: "2026-07-25T10:00:00.000Z",
    services: [
      { name: "Supabase", status: "healthy" },
      { name: "Stripe", status: "degraded" },
      { name: "AIML", status: "unknown", detail: "not configured" },
      { name: "Plaid", status: "down", detail: "probe timed out after 3000ms" },
    ],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin System Health Screen", () => {
  it("fetches system health from the API on mount", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: true,
      data: systemHealth({ services: [] }),
    });
    render(<AdminHealthScreen />);
    await waitFor(() => expect(mockGetSystemHealth).toHaveBeenCalledTimes(1));
  });

  it("renders each real service with its honest status; degraded/unknown/down are not laundered", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: true,
      data: systemHealth(),
    });

    render(<AdminHealthScreen />);

    // Real service names from the six probes.
    expect(await screen.findByText("Supabase")).toBeTruthy();
    expect(screen.getByText("Stripe")).toBeTruthy();
    expect(screen.getByText("AIML")).toBeTruthy();
    expect(screen.getByText("Plaid")).toBeTruthy();

    // Each real status is shown verbatim (badge text), never coerced to green.
    expect(screen.getByText("healthy")).toBeTruthy();
    expect(screen.getByText("degraded")).toBeTruthy();
    expect(screen.getByText("unknown")).toBeTruthy();
    expect(screen.getByText("down")).toBeTruthy();

    // Honest probe details surface as-is.
    expect(screen.getByText("not configured")).toBeTruthy();
    expect(screen.getByText("probe timed out after 3000ms")).toBeTruthy();

    // Overall is `down` -> honest outage headline, NEVER a hardcoded "operational".
    expect(screen.getByText("System Outage")).toBeTruthy();
    expect(screen.queryByText("All Systems Operational")).toBeNull();
  });

  it("shows 'All Systems Operational' only when the real overall status is healthy", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: true,
      data: systemHealth({
        status: "healthy",
        services: [
          { name: "Supabase", status: "healthy" },
          { name: "Stripe", status: "healthy" },
        ],
      }),
    });

    render(<AdminHealthScreen />);

    expect(await screen.findByText("All Systems Operational")).toBeTruthy();
    expect(screen.queryByText("System Outage")).toBeNull();
  });

  it("never renders the former hardcoded services or fabricated metrics", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: true,
      data: systemHealth(),
    });

    render(<AdminHealthScreen />);
    await screen.findByText("Supabase");

    // Removed hardcoded services (route only probes 6 real dependencies).
    expect(screen.queryByText("API Gateway")).toBeNull();
    expect(screen.queryByText("Authentication")).toBeNull();
    expect(screen.queryByText("AI Engine")).toBeNull();
    expect(screen.queryByText("Credit Bureaus API")).toBeNull();
    expect(screen.queryByText("Redis Cache")).toBeNull();
    // Removed fabricated uptime / response-time / last-check values.
    expect(screen.queryByText("99.99%")).toBeNull();
    expect(screen.queryByText("30s ago")).toBeNull();
    expect(screen.queryByText("45ms")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetSystemHealth.mockReturnValue(new Promise<never>(() => undefined));
    render(<AdminHealthScreen />);
    expect(screen.getByTestId("admin-health-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    render(<AdminHealthScreen />);

    expect(await screen.findByTestId("admin-health-error")).toBeTruthy();
    expect(screen.getByText("Forbidden")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetSystemHealth).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when no services are reported", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: true,
      data: systemHealth({ services: [] }),
    });
    render(<AdminHealthScreen />);
    expect(await screen.findByTestId("admin-health-empty")).toBeTruthy();
  });

  it("re-fetches when the header refresh button is pressed", async () => {
    mockGetSystemHealth.mockResolvedValue({
      success: true,
      data: systemHealth(),
    });

    render(<AdminHealthScreen />);
    await screen.findByText("Supabase");

    fireEvent.press(screen.getByTestId("admin-health-refresh"));

    // mount + refresh
    await waitFor(() => expect(mockGetSystemHealth).toHaveBeenCalledTimes(2));
  });
});
