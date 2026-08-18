/**
 * Spending Dashboard (app/dashboard/spending.tsx) — real-data wiring coverage.
 *
 * The screen showed every user the same spending: `mockCategories`,
 * `mockMonthlyTrend` and `mockBudgets`, behind an 800 ms setTimeout that made
 * it look fetched. It is reachable — primary-nav.ts:59 links it and
 * SpendingOverview.tsx:182 pushes to it — so this was live.
 *
 * Two assertions here are about arithmetic rather than wiring, and they are the
 * ones worth having:
 *
 *   - the daily average comes from the endpoint. The old screen divided by a
 *     hardcoded `daysInMonth = 31`, which is wrong for seven months of the year
 *     and wrong for the week and year filters the screen offers.
 *   - the period filter reaches the REQUEST. It used to change a label while
 *     the same numbers stayed on screen.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";

import type {
  SpendingAnalysisData,
  CashFlowAnalysisData,
} from "../../services/api/financial";

const mockGetSpendingAnalysis = jest.fn();
const mockGetCashFlowAnalysis = jest.fn();
const mockGetAllBudgets = jest.fn();

jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

jest.mock("../../services/api/financial", () => ({
  financialOverviewApi: {
    getSpendingAnalysis: (...args: unknown[]) =>
      mockGetSpendingAnalysis(...args),
    getCashFlowAnalysis: (...args: unknown[]) =>
      mockGetCashFlowAnalysis(...args),
  },
  budgetApi: {
    getAll: (...args: unknown[]) => mockGetAllBudgets(...args),
  },
}));

import SpendingScreen from "../../../app/dashboard/spending";

function analysis(
  over: Partial<SpendingAnalysisData> = {},
): SpendingAnalysisData {
  return {
    totalSpending: 2400,
    transactionCount: 48,
    averageTransaction: 50,
    dailyAverage: 80,
    comparedToLastPeriod: -5,
    categories: [
      {
        name: "Groceries",
        amount: 1400,
        percentOfTotal: 58,
        trend: "up",
        trendPercent: 12,
        transactionCount: 30,
      },
      {
        name: "Transportation",
        amount: 1000,
        percentOfTotal: 42,
        trend: "down",
        trendPercent: 4,
        transactionCount: 18,
      },
    ],
    patterns: [],
    recommendations: [],
    ...over,
  };
}

function cashFlow(): CashFlowAnalysisData {
  return {
    months: [
      { month: "Jul", income: 4000, expenses: 2200 },
      { month: "Aug", income: 4000, expenses: 2400 },
    ],
    recommendations: [],
  };
}

function serveAll() {
  mockGetSpendingAnalysis.mockResolvedValue({
    success: true,
    data: analysis(),
  });
  mockGetCashFlowAnalysis.mockResolvedValue({
    success: true,
    data: cashFlow(),
  });
  mockGetAllBudgets.mockResolvedValue({
    success: true,
    data: {
      budgets: [
        {
          id: "b-1",
          userId: "u-1",
          category: "Groceries",
          limit: 1500,
          spent: 1400,
          remaining: 100,
          period: "monthly",
        },
      ],
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Dashboard spending — figures come from the endpoint", () => {
  it("shows the endpoint's totals, not a local re-derivation", async () => {
    serveAll();

    render(<SpendingScreen />);

    // dailyAverage 80 is the endpoint's own number. The old screen computed
    // totalSpending / 31 = 77, which was never right for any other period.
    await waitFor(() => expect(screen.getByText("$80")).toBeTruthy());
    expect(screen.queryByText("$77")).toBeNull();
  });

  it("renders the real categories", async () => {
    serveAll();

    render(<SpendingScreen />);

    // "Groceries" appears twice on purpose — once as a spending category and
    // once as a budget with the same name. getByText would fail on that, for a
    // reason that has nothing to do with the wiring under test.
    await waitFor(() =>
      expect(screen.getAllByText("Groceries").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("Transportation")).toBeTruthy();
  });

  it("renders each category's real period-over-period trend", async () => {
    serveAll();

    render(<SpendingScreen />);

    await waitFor(() => expect(screen.getByText("12%")).toBeTruthy());
    expect(screen.getByText("4%")).toBeTruthy();
  });

  it("asks for 6 months of cash flow for the trend chart", async () => {
    serveAll();

    render(<SpendingScreen />);

    await waitFor(() => expect(mockGetCashFlowAnalysis).toHaveBeenCalledWith(6));
  });

  it("renders budgets from the budgets endpoint", async () => {
    serveAll();

    render(<SpendingScreen />);

    await waitFor(() => expect(mockGetAllBudgets).toHaveBeenCalled());
  });
});

describe("Dashboard spending — the period filter reaches the request", () => {
  it("requests a date range on first load", async () => {
    serveAll();

    render(<SpendingScreen />);

    await waitFor(() => expect(mockGetSpendingAnalysis).toHaveBeenCalled());
    const range = mockGetSpendingAnalysis.mock.calls[0][0];
    expect(range).toEqual(
      expect.objectContaining({
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });

  it("re-requests with a different range when the period changes", async () => {
    serveAll();

    render(<SpendingScreen />);
    await waitFor(() => expect(mockGetSpendingAnalysis).toHaveBeenCalled());
    const monthRange = mockGetSpendingAnalysis.mock.calls[0][0];

    fireEvent.press(screen.getByText("Week"));

    await waitFor(() =>
      expect(mockGetSpendingAnalysis.mock.calls.length).toBeGreaterThan(1),
    );
    const weekRange = mockGetSpendingAnalysis.mock.calls.at(-1)[0];
    // A week starts later than a month — the filter is not decorative.
    expect(weekRange.startDate > monthRange.startDate).toBe(true);
  });
});

describe("Dashboard spending — failure shows nothing rather than something", () => {
  it("says spending is unavailable when every call fails", async () => {
    mockGetSpendingAnalysis.mockResolvedValue({ success: false });
    mockGetCashFlowAnalysis.mockResolvedValue({ success: false });
    mockGetAllBudgets.mockResolvedValue({ success: false });

    render(<SpendingScreen />);

    await waitFor(() =>
      expect(screen.getByText("Spending is unavailable")).toBeTruthy(),
    );
  });

  it("shows no categories when the analysis call fails", async () => {
    mockGetSpendingAnalysis.mockResolvedValue({ success: false });
    mockGetCashFlowAnalysis.mockResolvedValue({
      success: true,
      data: cashFlow(),
    });
    mockGetAllBudgets.mockResolvedValue({
      success: true,
      data: { budgets: [] },
    });

    render(<SpendingScreen />);

    await waitFor(() => expect(mockGetSpendingAnalysis).toHaveBeenCalled());
    expect(screen.queryByText("Groceries")).toBeNull();
  });
});

describe("Dashboard spending — the invented figures are gone", () => {
  it("declares none of the mock constants", () => {
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/spending.tsx"),
      "utf8",
    );
    for (const name of ["mockCategories", "mockMonthlyTrend", "mockBudgets"]) {
      expect(source).not.toContain(`const ${name}`);
    }
  });

  it("no longer divides by a hardcoded month length", () => {
    const fs = require("fs");
    const path = require("path");
    const raw = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/spending.tsx"),
      "utf8",
    );
    const source = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toContain("daysInMonth");
  });
});
