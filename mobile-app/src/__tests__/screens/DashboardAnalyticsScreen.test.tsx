/**
 * Dashboard AnalyticsScreen — real store/route wiring (PARITY).
 *
 * The /dashboard/analytics screen used to render a hardcoded MOCK_DATA object
 * behind a fake setTimeout load. It now fetches the authenticated user's real
 * analytics from GET /api/user/analytics via userAnalyticsApi.getAnalytics
 * (fetch on mount, honest inline loading / error+retry states, an honest empty
 * chart note when there is no score history, and pull-to-refresh). These tests
 * prove real data renders, the former MOCK_DATA values never appear, the
 * recommendations card is omitted when the endpoint returns none, and each
 * honest state shows.
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
import type { UserAnalytics } from "../../services/api/user";

const mockGetAnalytics = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/user", () => ({
  userAnalyticsApi: {
    getAnalytics: (...args: unknown[]) => mockGetAnalytics(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import DashboardAnalyticsScreen from "../../../app/dashboard/analytics";

function analytics(over: Partial<UserAnalytics> = {}): UserAnalytics {
  return {
    creditHistory: [
      { date: "Jan", score: 700 },
      { date: "Feb", score: 720 },
      { date: "Mar", score: 740 },
    ],
    disputeStats: { total: 7, resolved: 4, pending: 2, successRate: 57 },
    scoreFactors: [
      { factor: "Payment History", impact: 35, status: "neutral" },
    ],
    recommendations: ["Keep balances low"],
    timeRange: "6m",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Dashboard AnalyticsScreen", () => {
  it("fetches analytics from the API on mount for the 6m range", async () => {
    mockGetAnalytics.mockResolvedValue({ success: true, data: analytics() });
    render(<DashboardAnalyticsScreen />);
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledWith("6m"));
  });

  it("renders real analytics and never the removed MOCK_DATA values", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: true,
      data: analytics({
        // Mixed factor statuses exercise the positive/negative/neutral color
        // branches from real data.
        scoreFactors: [
          { factor: "Payment History", impact: 35, status: "neutral" },
          { factor: "Credit Utilization", impact: 30, status: "positive" },
          { factor: "New Credit", impact: 10, status: "negative" },
        ],
      }),
    });
    render(<DashboardAnalyticsScreen />);

    // creditHistory bars (real scores).
    expect(await screen.findByText("700")).toBeTruthy();
    expect(screen.getByText("720")).toBeTruthy();
    expect(screen.getByText("740")).toBeTruthy();
    // scoreGain: 740 - 700 = +40.
    expect(screen.getByText("+40")).toBeTruthy();
    // disputeStats.
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("57%")).toBeTruthy();
    // scoreFactors (all three statuses render).
    expect(screen.getByText("Payment History")).toBeTruthy();
    expect(screen.getByText("Credit Utilization")).toBeTruthy();
    expect(screen.getByText("New Credit")).toBeTruthy();
    expect(screen.getByText("35%")).toBeTruthy();
    // recommendations.
    expect(screen.getByText("Keep balances low")).toBeTruthy();

    // Former hardcoded MOCK_DATA values must never appear.
    expect(screen.queryByText("620")).toBeNull(); // mock first score
    expect(screen.queryByText("678")).toBeNull(); // mock last score
    expect(screen.queryByText("75%")).toBeNull(); // mock success rate
  });

  it("renders a negative score change when the trend declines", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: true,
      data: analytics({
        creditHistory: [
          { date: "Jan", score: 700 },
          { date: "Feb", score: 680 },
        ],
      }),
    });
    render(<DashboardAnalyticsScreen />);
    // 680 - 700 = -20 (no leading "+").
    expect(await screen.findByText("-20")).toBeTruthy();
  });

  it("shows an honest empty chart note when the user has no score history", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: true,
      data: analytics({ creditHistory: [] }),
    });
    render(<DashboardAnalyticsScreen />);

    expect(
      await screen.findByTestId("dashboard-analytics-empty"),
    ).toBeTruthy();
    // The dispute stats card still renders (real/zeroed data), proving this is a
    // per-section empty rather than a screen-wide failure.
    expect(screen.getByText("Dispute Performance")).toBeTruthy();
    // No fabricated score-gain figure without history.
    expect(screen.queryByText("+40")).toBeNull();
  });

  it("omits the recommendations card when the endpoint returns none", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: true,
      data: analytics({ recommendations: [] }),
    });
    render(<DashboardAnalyticsScreen />);

    expect(await screen.findByText("Dispute Performance")).toBeTruthy();
    expect(screen.queryByText("Recommendations")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetAnalytics.mockReturnValue(new Promise<never>(() => undefined));
    render(<DashboardAnalyticsScreen />);
    expect(screen.getByTestId("dashboard-analytics-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never MOCK_DATA", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });
    render(<DashboardAnalyticsScreen />);

    expect(
      await screen.findByTestId("dashboard-analytics-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();
    // The removed silent fallback would have shown fabricated figures — it must not.
    expect(screen.queryByText("Dispute Performance")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledTimes(2));
  });

  it("falls back to a generic message when the API error carries none", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: false,
      error: { code: "X" },
    });
    render(<DashboardAnalyticsScreen />);

    expect(
      await screen.findByTestId("dashboard-analytics-error"),
    ).toBeTruthy();
    expect(screen.getByText("Unable to load analytics.")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetAnalytics.mockResolvedValue({ success: true, data: analytics() });
    const { UNSAFE_getAllByType } = render(<DashboardAnalyticsScreen />);
    await screen.findByText("700");

    // The outer vertical ScrollView (index 0) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetAnalytics).toHaveBeenCalledTimes(2);
  });
});
