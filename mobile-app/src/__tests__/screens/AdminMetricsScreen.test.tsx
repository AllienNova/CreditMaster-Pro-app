/**
 * admin/metrics — real-data wiring.
 *
 * Two fixtures, no request: revenue split across "Basic / Premium /
 * Enterprise" totalling $245,890, and disputes split across four statuses
 * totalling 2,124. The week/month/year selector changed neither, because
 * there was nothing behind it to change.
 *
 * The revenue chart CHANGED SUBJECT rather than being rewired, and that is
 * the decision worth pinning. Revenue by plan tier is computed nowhere.
 * /admin/analytics gives revenue BY MONTH, and subscription COUNTS by tier —
 * multiplying those counts by a price would have reproduced the old chart out
 * of two real numbers and one invented step. The chart shows revenue by month
 * instead, which is a series that actually exists.
 */

import React from "react";
import { StyleSheet } from "react-native";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { AdminAnalytics } from "../../services/api/admin";

const mockGetAnalytics = jest.fn();

jest.mock("../../services/api/admin", () => ({
  adminAnalyticsApi: {
    getAnalytics: (...a: unknown[]) => mockGetAnalytics(...a),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import AdminMetricsScreen from "../../../app/admin/metrics";

function analytics(over: Partial<AdminAnalytics> = {}): AdminAnalytics {
  return {
    userGrowth: [],
    revenueByMonth: [
      { month: "Jul", revenue: 4000 },
      { month: "Aug", revenue: 6000 },
    ],
    disputesByStatus: [
      { status: "pending", count: 3 },
      { status: "in_progress", count: 7 },
    ],
    subscriptionsByTier: [],
    topFeatures: [],
    timeRange: "30d",
    ...over,
  };
}

function ok(data: AdminAnalytics) {
  return { success: true, data };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAnalytics.mockResolvedValue(ok(analytics()));
});

describe("admin/metrics", () => {
  it("fetches on mount instead of rendering fixtures", async () => {
    render(<AdminMetricsScreen />);
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledTimes(1));
  });

  it("never shows the invented breakdowns again", async () => {
    render(<AdminMetricsScreen />);
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalled());
    // "Basic" and "Enterprise" are not tiers this product sells.
    expect(screen.queryByText("Basic")).toBeNull();
    expect(screen.queryByText("Enterprise")).toBeNull();
    expect(screen.queryByText("$245,890")).toBeNull();
  });

  it("totals revenue from the real monthly series", async () => {
    render(<AdminMetricsScreen />);
    expect(await screen.findByText("$10,000")).toBeTruthy();
  });

  it("labels the revenue chart by month, not by tier", async () => {
    render(<AdminMetricsScreen />);
    expect(await screen.findByText("Jul")).toBeTruthy();
    expect(screen.getByText("Aug")).toBeTruthy();
  });

  it("totals and labels disputes from the real status counts", async () => {
    render(<AdminMetricsScreen />);
    expect(await screen.findByText("10 Total")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    // Slugs are humanised, not passed through raw.
    expect(screen.getByText("In progress")).toBeTruthy();
  });

  describe("the period selector, which used to change nothing", () => {
    it("asks for 30d by default", async () => {
      render(<AdminMetricsScreen />);
      await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledWith("30d"));
    });

    it("refetches with the matching range when the period changes", async () => {
      render(<AdminMetricsScreen />);
      await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledTimes(1));

      // The button title-cases its label.
      fireEvent.press(screen.getByText("Week"));
      await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledWith("7d"));

      fireEvent.press(screen.getByText("Year"));
      await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledWith("1y"));
    });
  });

  describe("empty series", () => {
    it("says so rather than drawing an empty chart silently", async () => {
      mockGetAnalytics.mockResolvedValue(
        ok(analytics({ revenueByMonth: [], disputesByStatus: [] })),
      );
      render(<AdminMetricsScreen />);

      expect(
        await screen.findByText(/No revenue recorded in this period/i),
      ).toBeTruthy();
      expect(
        screen.getByText(/No disputes recorded in this period/i),
      ).toBeTruthy();
    });

    it("does not render NaN when every month is zero", async () => {
      // Each bar's height is value/total; a zero total divides by zero.
      mockGetAnalytics.mockResolvedValue(
        ok(
          analytics({
            revenueByMonth: [
              { month: "Jul", revenue: 0 },
              { month: "Aug", revenue: 0 },
            ],
          }),
        ),
      );
      render(<AdminMetricsScreen />);

      expect(await screen.findByText("$0")).toBeTruthy();

      // The height lands in a STYLE prop, not in text — an earlier version of
      // this test asserted queryByText(/NaN/) and passed with the guard
      // removed, because "NaN%" was never rendered as text at all.
      const bar = screen.getByTestId("revenue-bar-Jul");
      const height = StyleSheet.flatten(bar.props.style).height;
      expect(height).toBe("0%");
      expect(String(height)).not.toMatch(/NaN/);
    });
  });

  it("distinguishes a failed read from a platform with no activity", async () => {
    // "$0 revenue" and "we could not read the analytics" lead an operator to
    // opposite conclusions.
    mockGetAnalytics.mockResolvedValue({
      success: false,
      error: { message: "boom" },
    });
    render(<AdminMetricsScreen />);

    expect(await screen.findByText(/could not load the metrics/i)).toBeTruthy();
    expect(screen.queryByText(/No revenue recorded/i)).toBeNull();

    mockGetAnalytics.mockResolvedValue(ok(analytics()));
    fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(mockGetAnalytics).toHaveBeenCalledTimes(2));
  });
});
