/**
 * Financial SpendingScreen — real-data wiring (PARITY).
 *
 * The screen used to call getSpendingInsights (/financial/insights/spending) and
 * getCashFlow (/financial/insights/cashflow) — routes that DO NOT EXIST (404). Every
 * call fell through to hardcoded MOCK_CATEGORIES / MOCK_TRENDS and an invented
 * `amount * 1.2` budget, so real users saw fabricated figures. It now fetches the real
 * category breakdown from GET /api/financial/dashboard (spendingByCategory) and the real
 * monthly-expense trend from GET /api/financial/spending/cashflow, with honest inline
 * loading / error+retry / empty states and pull-to-refresh. Each category's bar shows its
 * real percentage share of spending (no fabricated budget); the two dead 404 methods were
 * deleted.
 *
 * These tests prove: fetch-on-mount (dashboard + cashflow, cashflow for 6 months), a
 * summary + category list + insights computed from the real payload (never the removed
 * mock categories or the "Budget"/"Remaining" overlay), the month-over-month insight in
 * both directions, and each honest state (loading / error+retry with no fabricated
 * fallback / empty) shows.
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
import type {
  FinancialDashboardData,
  CashFlowAnalysisData,
} from "../../services/api/financial";

const mockGetDashboard = jest.fn();
const mockGetCashFlowAnalysis = jest.fn();

// RN's RefreshControl resolves undefined under this jest setup; stub just that
// module so the ScrollView's refreshControl prop renders.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
    getCashFlowAnalysis: (...args: unknown[]) =>
      mockGetCashFlowAnalysis(...args),
  },
}));

// expo-router is mocked globally in jest.setup.js.

import SpendingScreen from "../../../app/financial/spending";

// Three real categories, sorted by amount desc as the dashboard service returns them.
// Total spend 3,000 (Housing 1,800 / Food 700 / Transportation 500).
function dashboard(
  over: Partial<FinancialDashboardData> = {},
): FinancialDashboardData {
  return {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    spendingByCategory: [
      { category: "Housing", amount: 1800, percentage: 60, transactionCount: 2 },
      {
        category: "Food & Dining",
        amount: 700,
        percentage: 23,
        transactionCount: 10,
      },
      {
        category: "Transportation",
        amount: 500,
        percentage: 17,
        transactionCount: 5,
      },
    ],
    monthlyTrend: [],
    ...over,
  };
}

// Two months of real expenses: avg 3,250; Feb up 500 vs Jan.
function cashflow(
  over: Partial<CashFlowAnalysisData> = {},
): CashFlowAnalysisData {
  return {
    months: [
      { month: "Jan", income: 6000, expenses: 3000 },
      { month: "Feb", income: 6000, expenses: 3500 },
    ],
    recommendations: [],
    ...over,
  };
}

const EMPTY_DASHBOARD = dashboard({ spendingByCategory: [] });
const EMPTY_CASHFLOW = cashflow({ months: [] });

function resolveBoth(
  d: FinancialDashboardData = dashboard(),
  c: CashFlowAnalysisData = cashflow(),
) {
  mockGetDashboard.mockResolvedValue({ success: true, data: d });
  mockGetCashFlowAnalysis.mockResolvedValue({ success: true, data: c });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Financial SpendingScreen", () => {
  it("fetches the dashboard and cash flow (6 months) from the API on mount", async () => {
    resolveBoth(EMPTY_DASHBOARD, EMPTY_CASHFLOW);
    render(<SpendingScreen />);
    await waitFor(() => expect(mockGetDashboard).toHaveBeenCalledTimes(1));
    expect(mockGetCashFlowAnalysis).toHaveBeenCalledWith(6);
  });

  it("renders a summary, category list, and insights computed from the real payload — never the removed mocks or the budget overlay", async () => {
    resolveBoth();
    render(<SpendingScreen />);

    // Summary computed from real data: total 3,000; avg month 3,250 (avg also
    // repeats in the "Monthly Average:" row, so match all occurrences).
    expect(await screen.findByText("$3,000")).toBeTruthy();
    expect(screen.getAllByText("$3,250").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Spent")).toBeTruthy();
    expect(screen.getByText("Avg/Month")).toBeTruthy();
    expect(screen.getByText("Categories")).toBeTruthy();

    // Real category rows (names also appear in the pie legend, so match all occurrences).
    expect(screen.getAllByText("Housing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Food & Dining").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transportation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$1,800").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$700").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$500").length).toBeGreaterThan(0);

    // Honest, real-data insights: top category share + month-over-month direction.
    expect(
      screen.getByText(/Housing is your top category — 60% of spending/),
    ).toBeTruthy();
    expect(screen.getByText(/Spending rose \$500 vs last month/)).toBeTruthy();

    // Real monthly trend section.
    expect(screen.getByText("Monthly Trend")).toBeTruthy();
    expect(screen.getByText("Monthly Average:")).toBeTruthy();

    // The removed MOCK_CATEGORIES (Shopping/Entertainment/Utilities) and the fabricated
    // budget overlay ("Budget"/"Remaining") must never render.
    expect(screen.queryByText("Shopping")).toBeNull();
    expect(screen.queryByText("Entertainment")).toBeNull();
    expect(screen.queryByText("Utilities")).toBeNull();
    expect(screen.queryByText("Budget")).toBeNull();
    expect(screen.queryByText("Remaining")).toBeNull();
    // MOCK_TRENDS covered Jul–Dec; none of it should render.
    expect(screen.queryByText("Dec")).toBeNull();
    expect(screen.queryByText("Nov")).toBeNull();
  });

  it("surfaces a month-over-month decrease from the real trend", async () => {
    resolveBoth(
      dashboard(),
      cashflow({
        months: [
          { month: "Jan", income: 6000, expenses: 4000 },
          { month: "Feb", income: 6000, expenses: 3000 },
        ],
      }),
    );
    render(<SpendingScreen />);
    expect(
      await screen.findByText(/Spending fell \$1,000 vs last month/),
    ).toBeTruthy();
  });

  it("toggles the breakdown between pie and bar without losing the real category data", async () => {
    resolveBoth();
    render(<SpendingScreen />);
    await screen.findByText("$3,000");

    fireEvent.press(screen.getByTestId("spending-toggle-bar"));
    expect(screen.getAllByText("Housing").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("spending-toggle-pie"));
    expect(screen.getAllByText("Housing").length).toBeGreaterThan(0);
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetDashboard.mockReturnValue(new Promise<never>(() => undefined));
    mockGetCashFlowAnalysis.mockReturnValue(new Promise<never>(() => undefined));
    render(<SpendingScreen />);
    expect(screen.getByTestId("financial-spending-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never MOCK_CATEGORIES", async () => {
    mockGetDashboard.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });

    render(<SpendingScreen />);

    expect(
      await screen.findByTestId("financial-spending-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old silent fallback would have shown fabricated categories here — it must not.
    expect(screen.queryByText("Total Spent")).toBeNull();
    expect(screen.queryByText("Housing")).toBeNull();
    expect(screen.queryByText("Shopping")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() => expect(mockGetDashboard).toHaveBeenCalledTimes(2));
  });

  it("shows the inline empty state when the user has no spending", async () => {
    resolveBoth(EMPTY_DASHBOARD, EMPTY_CASHFLOW);
    render(<SpendingScreen />);
    expect(
      await screen.findByTestId("financial-spending-empty"),
    ).toBeTruthy();
    expect(screen.getByText("No spending yet")).toBeTruthy();
  });

  it("re-fetches on pull-to-refresh", async () => {
    resolveBoth();
    const { UNSAFE_getAllByType } = render(<SpendingScreen />);
    await screen.findByText("$3,000");

    // The outer ScrollView (first in tree) carries the refreshControl.
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    // mount + refresh
    expect(mockGetDashboard).toHaveBeenCalledTimes(2);
    expect(mockGetCashFlowAnalysis).toHaveBeenCalledTimes(2);
  });
});
