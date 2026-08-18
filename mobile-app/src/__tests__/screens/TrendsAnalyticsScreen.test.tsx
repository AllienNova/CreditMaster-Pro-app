/**
 * analytics/trends — real-data wiring.
 *
 * The screen rendered TREND_METRICS: five metrics with six-point series, shown
 * as the user's own history. A credit score climbing 680 -> 742, utilization
 * falling 30% -> 18%, debt falling $20,950 -> $12,450, on-time payments flat
 * at 100%. None of it came from anywhere, and the month labels were a separate
 * hardcoded array that did not correspond to the points beneath them.
 *
 * Only ONE of the five has a real time series. The others are a current value
 * or nothing at all, and these tests pin that distinction — because the
 * tempting fix is to draw five lines from whatever is nearest to hand.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockFetchScores = jest.fn();
const mockFetchScoreHistory = jest.fn();
let mockStoreState: {
  scores: Array<{ bureau: string; score: number }>;
  scoreHistory: { history: Array<{ date: string; score: number }> } | null;
};

jest.mock("../../store/creditStore", () => ({
  useCreditStore: () => ({
    ...mockStoreState,
    fetchScores: mockFetchScores,
    fetchScoreHistory: mockFetchScoreHistory,
  }),
}));

const mockGetFactors = jest.fn();
jest.mock("../../services/api/credit", () => ({
  creditScoreApi: { getFactors: (...a: unknown[]) => mockGetFactors(...a) },
}));

const mockGetDebtOverview = jest.fn();
jest.mock("../../services/api/financial", () => ({
  debtApi: { getOverview: (...a: unknown[]) => mockGetDebtOverview(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import TrendsAnalyticsScreen from "../../../app/analytics/trends";

const FACTORS = {
  factors: [
    {
      id: "credit_age",
      name: "Credit Age",
      impact: "positive" as const,
      category: "credit_age" as const,
      status: "good" as const,
      value: "8.3 year average across your linked accounts",
      description: "Your accounts average 8.3 years.",
      percentImpact: 15,
    },
  ],
  unavailable: [
    {
      id: "credit_utilization",
      name: "Credit Utilization",
      percentImpact: 30,
      blockedBy:
        "Needs credit limits from your linked cards, which are not captured yet.",
    },
    {
      id: "payment_history",
      name: "Payment History",
      percentImpact: 35,
      blockedBy: "Needs a linked credit report.",
    },
  ],
};

function history(scores: number[]) {
  return {
    history: scores.map((score, i) => ({
      // The 1st at 00:00 UTC: the label must not slide a month for anyone
      // west of UTC.
      date: `2026-0${i + 1}-01T00:00:00.000Z`,
      score,
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState = {
    // Deliberately different from the last history point, so text assertions
    // are never ambiguous between the two reads.
    scores: [{ bureau: "experian", score: 751 }],
    scoreHistory: history([700, 720, 742]),
  };
  mockFetchScores.mockResolvedValue(undefined);
  mockFetchScoreHistory.mockResolvedValue(undefined);
  mockGetFactors.mockResolvedValue({ success: true, data: FACTORS });
  mockGetDebtOverview.mockResolvedValue({
    success: true,
    data: {
      totalDebt: 12450,
      debts: [],
      monthlyPayments: 0,
      projectedPayoffDate: "",
    },
  });
});

describe("analytics/trends", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<TrendsAnalyticsScreen />);
    await waitFor(() => {
      expect(mockFetchScores).toHaveBeenCalled();
      expect(mockGetDebtOverview).toHaveBeenCalled();
      expect(mockGetFactors).toHaveBeenCalled();
    });
  });

  it("never shows the invented series again", async () => {
    render(<TrendsAnalyticsScreen />);
    await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
    // The old fixture's headline figures.
    expect(screen.queryByText("742")).toBeNull();
    expect(screen.queryByText("18%")).toBeNull();
    expect(screen.queryByText("100%")).toBeNull();
  });

  describe("the one real series", () => {
    it("charts the score history it was given", async () => {
      render(<TrendsAnalyticsScreen />);
      expect(await screen.findByTestId("score-chart")).toBeTruthy();
      expect(screen.getByTestId("bar-2")).toBeTruthy();
    });

    it("labels each point from its own date, in UTC", async () => {
      // The old screen carried a hardcoded ["Jul".."Dec"] array beside a
      // six-point series, so the labels were decorative.
      render(<TrendsAnalyticsScreen />);
      await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
      expect(screen.getByText("Jan")).toBeTruthy();
      expect(screen.getByText("Feb")).toBeTruthy();
      expect(screen.getByText("Mar")).toBeTruthy();
    });

    it("shows the change across the period", async () => {
      render(<TrendsAnalyticsScreen />);
      const change = await screen.findByTestId("score-change");
      expect(change.props.children.join("")).toContain("+42");
    });

    it("shows no change for a single reading", async () => {
      // One point is not a trend. "+0 pts" would assert stability where there
      // is nothing to compare.
      mockStoreState.scoreHistory = history([700]);
      render(<TrendsAnalyticsScreen />);
      await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
      expect(screen.queryByTestId("score-change")).toBeNull();
    });

    it("draws equal bars rather than NaN when every reading matches", async () => {
      // range === 0 makes the height 0/0. RN drops a NaN height silently, so
      // the chart would simply vanish.
      mockStoreState.scoreHistory = history([700, 700, 700]);
      render(<TrendsAnalyticsScreen />);
      const bar = await screen.findByTestId("bar-0");
      const { StyleSheet } = require("react-native");
      const height = StyleSheet.flatten(bar.props.style)?.height;
      expect(Number.isNaN(height)).toBe(false);
      expect(height).toBeGreaterThan(0);
    });

    it("says so instead of drawing an empty chart", async () => {
      mockStoreState.scoreHistory = { history: [] };
      render(<TrendsAnalyticsScreen />);
      expect(await screen.findByTestId("history-empty")).toBeTruthy();
      expect(screen.queryByTestId("score-chart")).toBeNull();
    });

    it("refetches with the window the period names", async () => {
      render(<TrendsAnalyticsScreen />);
      await waitFor(() => expect(mockFetchScoreHistory).toHaveBeenCalledWith(6));

      fireEvent.press(screen.getByText("1Y"));
      await waitFor(() =>
        expect(mockFetchScoreHistory).toHaveBeenCalledWith(12),
      );
    });
  });

  describe("values that are real but are not series", () => {
    it("shows total debt as today's balance, not a trend", async () => {
      render(<TrendsAnalyticsScreen />);
      expect(await screen.findByText("$12,450")).toBeTruthy();
      expect(screen.getByText(/no line to draw/i)).toBeTruthy();
    });

    it("shows credit age as computed-per-request", async () => {
      render(<TrendsAnalyticsScreen />);
      expect(
        await screen.findByText("8.3 year average across your linked accounts"),
      ).toBeTruthy();
      expect(screen.getByText(/cannot be charted/i)).toBeTruthy();
    });

    it("omits a value the read could not supply", async () => {
      // Not zero, not a guess — absent.
      mockGetDebtOverview.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<TrendsAnalyticsScreen />);
      await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
      expect(screen.queryByText("Total Debt")).toBeNull();
      expect(screen.queryByText("$0")).toBeNull();
    });

    it("keeps the chart when a secondary read fails", async () => {
      mockGetFactors.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<TrendsAnalyticsScreen />);
      expect(await screen.findByTestId("score-chart")).toBeTruthy();
    });
  });

  describe("what cannot be measured", () => {
    it("names each blocked metric and what blocks it", async () => {
      // The two the old fixture charted most confidently are exactly the two
      // this system cannot compute.
      render(<TrendsAnalyticsScreen />);
      expect(await screen.findByText("Credit Utilization")).toBeTruthy();
      expect(screen.getByText(/Needs credit limits/)).toBeTruthy();
      expect(screen.getByText("Payment History")).toBeTruthy();
      expect(screen.getByText(/Needs a linked credit report/)).toBeTruthy();
    });

    it("shows no such section when nothing is blocked", async () => {
      mockGetFactors.mockResolvedValue({
        success: true,
        data: { factors: FACTORS.factors, unavailable: [] },
      });
      render(<TrendsAnalyticsScreen />);
      await waitFor(() => expect(mockGetFactors).toHaveBeenCalled());
      expect(screen.queryByText("Not tracked yet")).toBeNull();
    });
  });
});
