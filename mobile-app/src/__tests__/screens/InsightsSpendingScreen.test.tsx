/**
 * Insights > SpendingAnalysisScreen — real-data wiring (PARITY).
 *
 * The screen used to render a hardcoded MOCK_ANALYSIS (invented totals, categories, an
 * overall "risk score", per-category budgets, a monthly projection, and
 * pattern/recommendation copy) behind a fake setTimeout, so every user saw the same
 * fabricated figures. It now fetches the real spending analysis from POST
 * /api/financial/spending/analyze via financialOverviewApi.getSpendingAnalysis, with
 * honest inline loading / error+retry / empty states, pull-to-refresh, and a
 * period filter that refetches.
 *
 * These tests prove: fetch-on-mount (with a date range), a real overview + category
 * list (with the REAL period-over-period trend badge) + detected patterns +
 * recommendations computed from the payload (never the removed mock copy, risk-score
 * card, projection, or budget overlay), each honest state, and that changing the period
 * refetches.
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
import type { SpendingAnalysisData } from "../../services/api/financial";

const mockGetSpendingAnalysis = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getSpendingAnalysis: (...args: unknown[]) =>
      mockGetSpendingAnalysis(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import SpendingAnalysisScreen from "../../../app/insights/spending";

function analysis(over: Partial<SpendingAnalysisData> = {}): SpendingAnalysisData {
  return {
    totalSpending: 3000,
    transactionCount: 15,
    averageTransaction: 200,
    dailyAverage: 100,
    comparedToLastPeriod: 8.5,
    categories: [
      {
        name: "Housing",
        amount: 1800,
        percentOfTotal: 60,
        trend: "stable",
        trendPercent: 0,
        transactionCount: 2,
      },
      {
        name: "Dining Out",
        amount: 700,
        percentOfTotal: 23,
        trend: "up",
        trendPercent: 45,
        transactionCount: 10,
      },
      {
        name: "Transportation",
        amount: 500,
        percentOfTotal: 17,
        trend: "down",
        trendPercent: 15,
        transactionCount: 3,
      },
    ],
    patterns: [
      {
        id: "a1",
        kind: "anomaly",
        title: "Large transaction",
        description: "Unusually large Dining Out transaction",
        impact: "$220",
        severity: "high",
      },
      {
        id: "p0",
        kind: "recurring",
        title: "Recurring subscription",
        description: "Monthly subscription to Netflix",
        impact: "$16 avg",
        severity: "low",
      },
      {
        id: "o1",
        kind: "opportunity",
        title: "Review your subscriptions",
        description: "4 recurring charges",
        impact: "Save $24",
        severity: "low",
      },
    ],
    recommendations: ["Cancel any subscriptions you no longer use."],
    ...over,
  };
}

const EMPTY_ANALYSIS = analysis({
  totalSpending: 0,
  transactionCount: 0,
  averageTransaction: 0,
  dailyAverage: 0,
  comparedToLastPeriod: 0,
  categories: [],
  patterns: [],
  recommendations: [],
});

function resolveWith(data: SpendingAnalysisData = analysis()) {
  mockGetSpendingAnalysis.mockResolvedValue({ success: true, data });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Insights SpendingAnalysisScreen", () => {
  it("fetches the spending analysis with a date range on mount", async () => {
    resolveWith();
    render(<SpendingAnalysisScreen />);
    await waitFor(() =>
      expect(mockGetSpendingAnalysis).toHaveBeenCalledTimes(1),
    );
    expect(mockGetSpendingAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
    );
  });

  it("renders a real overview, category list with the real trend badge, patterns, and recommendations", async () => {
    resolveWith();
    render(<SpendingAnalysisScreen />);

    // Overview computed from the real payload.
    expect(await screen.findByText("$3,000")).toBeTruthy();
    expect(screen.getByText("Total Spent")).toBeTruthy();
    expect(screen.getByText(/\+8\.5% vs prev/)).toBeTruthy();
    expect(screen.getByText("Transactions")).toBeTruthy();
    expect(screen.getByText("Avg: $200")).toBeTruthy();
    expect(screen.getByText("Daily Average")).toBeTruthy();
    expect(screen.getByText("$100")).toBeTruthy();

    // Real categories + real trend percentages (stable Housing shows no percent).
    expect(screen.getByText("Housing")).toBeTruthy();
    expect(screen.getByText("Dining Out")).toBeTruthy();
    expect(screen.getByText("Transportation")).toBeTruthy();
    expect(screen.getByText("$1,800")).toBeTruthy();
    expect(screen.getByText("45%")).toBeTruthy();
    expect(screen.getByText("15%")).toBeTruthy();
    expect(screen.getByText("2 transactions")).toBeTruthy();

    // Real detected patterns + their real-amount impacts.
    expect(screen.getByText("Large transaction")).toBeTruthy();
    expect(screen.getByText("$220")).toBeTruthy();
    expect(screen.getByText("Recurring subscription")).toBeTruthy();
    expect(screen.getByText("$16 avg")).toBeTruthy();
    expect(screen.getByText("Save $24")).toBeTruthy();

    // Real recommendation.
    expect(
      screen.getByText("Cancel any subscriptions you no longer use."),
    ).toBeTruthy();
  });

  it("never renders the removed MOCK_ANALYSIS copy, risk-score card, projection, or budget overlay", async () => {
    resolveWith();
    render(<SpendingAnalysisScreen />);
    await screen.findByText("$3,000");

    // Mock-only strings that must never appear again.
    expect(screen.queryByText("Risk Score")).toBeNull();
    expect(screen.queryByText("Dining spending spike")).toBeNull();
    expect(screen.queryByText("Subscription creep")).toBeNull();
    expect(screen.queryByText("Transportation savings")).toBeNull();
    expect(
      screen.queryByText(/Set a dining out limit of \$75\/week/),
    ).toBeNull();
    // The removed monthly-projection subtext and budget overlay.
    expect(screen.queryByText(/Projected:/)).toBeNull();
    expect(screen.queryByText("Adjust Budgets")).toBeTruthy(); // CTA stays (budgets exist)
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetSpendingAnalysis.mockReturnValue(new Promise<never>(() => undefined));
    render(<SpendingAnalysisScreen />);
    expect(screen.getByTestId("insights-spending-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never MOCK_ANALYSIS", async () => {
    mockGetSpendingAnalysis.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<SpendingAnalysisScreen />);

    expect(await screen.findByTestId("insights-spending-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent behavior would have shown fabricated figures here — it must not.
    expect(screen.queryByText("Total Spent")).toBeNull();
    expect(screen.queryByText("Housing")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetSpendingAnalysis).toHaveBeenCalledTimes(2),
    );
  });

  it("shows the inline empty state when the user has no spending", async () => {
    resolveWith(EMPTY_ANALYSIS);
    render(<SpendingAnalysisScreen />);
    expect(await screen.findByTestId("insights-spending-empty")).toBeTruthy();
    expect(screen.getByText("No spending yet")).toBeTruthy();
  });

  it("refetches when the period filter changes", async () => {
    resolveWith();
    render(<SpendingAnalysisScreen />);
    await screen.findByText("$3,000");
    expect(mockGetSpendingAnalysis).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId("spending-period-7d"));
    });

    await waitFor(() =>
      expect(mockGetSpendingAnalysis).toHaveBeenCalledTimes(2),
    );
  });

  it("re-fetches on pull-to-refresh", async () => {
    resolveWith();
    const { UNSAFE_getAllByType } = render(<SpendingAnalysisScreen />);
    await screen.findByText("$3,000");

    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    expect(mockGetSpendingAnalysis).toHaveBeenCalledTimes(2);
  });
});
