/**
 * InsightsScreen — real-data wiring (PARITY-P1).
 *
 * The screen used to render hardcoded MOCK_INSIGHTS, a HEALTH_SCORE card, and a
 * QUICK_STATS row behind a fake setTimeout load. It now fetches the insights list
 * from financialOverviewApi.getInsights (GET /api/ai/insights, the same real route
 * the web /insights page renders) with honest loading/error/empty states. These
 * tests prove the real insights render, the former mock/fabricated content never
 * appears, and the honest states show. The health-score and quick-stats blocks were
 * removed (no real mobile source), so their labels must be absent.
 */

import React from "react";
import { ScrollView } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import type { Insight } from "../../services/api/financial";

const mockGetInsights = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getInsights: (...args: unknown[]) => mockGetInsights(...args),
  },
}));

// Shared AI hooks are wired elsewhere; keep them inert so the screen test focuses
// on the insights list (no active nudge, no coaching sessions -> nothing renders).
jest.mock("../../hooks/useNudges", () => ({
  useNudges: () => ({ activeNudge: null, respondToNudge: jest.fn() }),
}));
jest.mock("../../hooks/useCoaching", () => ({
  useCoaching: () => ({ activeSessions: [], startSession: jest.fn() }),
}));

// expo-router is mocked globally in jest.setup.js.

import InsightsScreen from "../../../app/insights/index";

function insight(over: Partial<Insight> = {}): Insight {
  return {
    id: "insight-0",
    type: "warning",
    title: "Dining up 45%",
    description: "Your dining spend rose sharply this week.",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("InsightsScreen", () => {
  it("fetches insights from the API on mount", async () => {
    mockGetInsights.mockResolvedValue({ success: true, data: { insights: [] } });
    render(<InsightsScreen />);
    await waitFor(() => expect(mockGetInsights).toHaveBeenCalledTimes(1));
  });

  it("renders real insights; the former MOCK_INSIGHTS and fabricated blocks never appear", async () => {
    mockGetInsights.mockResolvedValue({
      success: true,
      data: {
        insights: [
          insight({
            id: "insight-0",
            type: "warning",
            title: "Dining up 45%",
            description: "Your dining spend rose sharply this week.",
          }),
          insight({
            id: "insight-1",
            type: "celebration",
            title: "Goal reached",
            description: "You hit your savings target.",
          }),
        ],
      },
    });

    render(<InsightsScreen />);

    // Real insights render.
    expect(await screen.findByText("Dining up 45%")).toBeTruthy();
    expect(screen.getByText("Goal reached")).toBeTruthy();
    expect(
      screen.getByText("Your dining spend rose sharply this week."),
    ).toBeTruthy();

    // Former hardcoded MOCK_INSIGHTS titles must never appear.
    expect(screen.queryByText("Unusual spending detected")).toBeNull();
    expect(screen.queryByText("Subscription savings found")).toBeNull();
    expect(screen.queryByText("Electric bill due soon")).toBeNull();

    // Removed fabricated blocks (health score + quick stats) must be gone.
    expect(screen.queryByText("Financial Health Score")).toBeNull();
    expect(screen.queryByText("Weekly Spending")).toBeNull();
    expect(screen.queryByText("Active Alerts")).toBeNull();
    expect(screen.queryByText("Credit Score")).toBeNull();
    expect(screen.queryByText("Savings Rate")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetInsights.mockReturnValue(new Promise<never>(() => undefined));
    render(<InsightsScreen />);
    expect(screen.getByTestId("insights-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetInsights.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<InsightsScreen />);

    expect(await screen.findByTestId("insights-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetInsights).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when there are no insights", async () => {
    mockGetInsights.mockResolvedValue({ success: true, data: { insights: [] } });
    render(<InsightsScreen />);
    expect(await screen.findByTestId("insights-empty")).toBeTruthy();
    expect(screen.getByText("All Clear!")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetInsights.mockResolvedValue({
      success: true,
      data: { insights: [insight()] },
    });

    const { UNSAFE_getByType } = render(<InsightsScreen />);
    await screen.findByText("Dining up 45%");

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetInsights).toHaveBeenCalledTimes(2);
  });
});
