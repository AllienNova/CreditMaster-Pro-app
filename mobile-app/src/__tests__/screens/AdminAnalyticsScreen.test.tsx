/**
 * AdminAnalyticsScreen — real-data wiring (PARITY-P1).
 *
 * The screen used to render a hardcoded MOCK_DATA object behind a fake setTimeout
 * load, with an inert time-range pill. It now fetches live platform analytics from
 * the real admin-guarded route (GET /api/admin/analytics?range=) via
 * adminAnalyticsApi.getAnalytics, with a functional range selector that refetches
 * and honest loading / error / empty states. These tests prove the real analytics
 * render, the range selector refetches, the honest states show, the API's usage:0
 * feature counts are rendered (not faked), and the former MOCK_DATA values never
 * appear.
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
import type { AdminAnalytics } from "../../services/api/admin";

const mockGetAnalytics = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

// Mock the admin api service. The screen imports both ANALYTICS_RANGES (to render
// the selector) and adminAnalyticsApi (to fetch), so both must be provided.
jest.mock("../../services/api/admin", () => ({
  ANALYTICS_RANGES: ["7d", "30d", "90d", "1y"],
  adminAnalyticsApi: {
    getAnalytics: (...args: unknown[]) => mockGetAnalytics(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AdminAnalyticsScreen from "../../../app/admin/analytics";

// Distinct real values so they can never be confused with the former MOCK_DATA.
const realAnalytics: AdminAnalytics = {
  userGrowth: [
    { date: "Jul 1", count: 12 },
    { date: "Jul 8", count: 34 },
  ],
  revenueByMonth: [
    { month: "Jun", revenue: 3000 },
    { month: "Jul", revenue: 7000 },
  ],
  disputesByStatus: [
    { status: "pending", count: 3 },
    { status: "resolved", count: 8 },
  ],
  subscriptionsByTier: [
    { tier: "pro", count: 5 },
    { tier: "free", count: 42 },
  ],
  topFeatures: [
    { feature: "Dispute Letters", usage: 11 },
    { feature: "AI Chat", usage: 0 },
  ],
  timeRange: "30d",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AdminAnalyticsScreen", () => {
  it("fetches analytics from the API on mount with the default range", async () => {
    mockGetAnalytics.mockResolvedValue({ success: true, data: realAnalytics });
    render(<AdminAnalyticsScreen />);
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledTimes(1));
    expect(mockGetAnalytics).toHaveBeenCalledWith("30d");
  });

  it("renders real analytics; the usage:0 count is shown honestly and the former MOCK_DATA never appears", async () => {
    mockGetAnalytics.mockResolvedValue({ success: true, data: realAnalytics });

    render(<AdminAnalyticsScreen />);

    // Real user-growth + revenue.
    expect(await screen.findByText("Jul 1")).toBeTruthy();
    expect(screen.getByText("Jul 8")).toBeTruthy();
    expect(screen.getByText("$3K")).toBeTruthy();
    expect(screen.getByText("$7K")).toBeTruthy();

    // Real disputes (lowercase DB statuses) + subscriptions by tier.
    expect(screen.getByText("pending")).toBeTruthy();
    expect(screen.getByText("resolved")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("pro")).toBeTruthy();
    expect(screen.getByText("free")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();

    // Real feature usage — the honest usage:0 is rendered as "0", never faked.
    expect(screen.getByText("Dispute Letters")).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText("AI Chat")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();

    // Former MOCK_DATA values must never appear.
    expect(screen.queryByText("$45K")).toBeNull(); // mock revenue
    expect(screen.queryByText("$85K")).toBeNull();
    expect(screen.queryByText("15,420")).toBeNull(); // mock feature usage
    expect(screen.queryByText("12,800")).toBeNull();
    expect(screen.queryByText("Score Tracking")).toBeNull(); // mock feature labels
    expect(screen.queryByText("AI Analysis")).toBeNull();
    expect(screen.queryByText("Reports")).toBeNull();
    expect(screen.queryByText("In Progress")).toBeNull(); // mock (title-case) dispute labels
    expect(screen.queryByText("Rejected")).toBeNull();
    expect(screen.queryByText("156")).toBeNull(); // mock dispute counts
    expect(screen.queryByText("423")).toBeNull();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetAnalytics.mockReturnValue(new Promise<never>(() => undefined));
    render(<AdminAnalyticsScreen />);
    expect(screen.getByTestId("admin-analytics-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    render(<AdminAnalyticsScreen />);

    expect(await screen.findByTestId("admin-analytics-error")).toBeTruthy();
    expect(screen.getByText("Forbidden")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledTimes(2));
  });

  it("refetches with the selected range when a range pill is pressed", async () => {
    mockGetAnalytics.mockResolvedValue({ success: true, data: realAnalytics });

    render(<AdminAnalyticsScreen />);

    const pill90 = await screen.findByText("90d");
    expect(mockGetAnalytics).toHaveBeenLastCalledWith("30d");

    fireEvent.press(pill90);

    await waitFor(() =>
      expect(mockGetAnalytics).toHaveBeenLastCalledWith("90d"),
    );
    expect(mockGetAnalytics).toHaveBeenCalledTimes(2);
  });

  it("shows inline empty states for sections with no data", async () => {
    mockGetAnalytics.mockResolvedValue({
      success: true,
      data: {
        ...realAnalytics,
        disputesByStatus: [],
        subscriptionsByTier: [],
      },
    });

    render(<AdminAnalyticsScreen />);

    expect(await screen.findByTestId("admin-disputes-empty")).toBeTruthy();
    expect(screen.getByText("No disputes to report yet.")).toBeTruthy();
    expect(screen.getByTestId("admin-subscriptions-empty")).toBeTruthy();

    // The populated sections still render.
    expect(screen.getByText("Jul 1")).toBeTruthy();
    expect(screen.getByText("Dispute Letters")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    mockGetAnalytics.mockResolvedValue({ success: true, data: realAnalytics });

    const { UNSAFE_getByType } = render(<AdminAnalyticsScreen />);
    await screen.findByText("Jul 1");

    const scroll = UNSAFE_getByType(ScrollView);
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetAnalytics).toHaveBeenCalledTimes(2);
  });
});
