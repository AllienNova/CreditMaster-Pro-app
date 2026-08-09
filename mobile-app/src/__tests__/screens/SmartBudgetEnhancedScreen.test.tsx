/**
 * Smart Budget (enhanced) screen — real-data wiring (Wave parity).
 *
 * The screen used to render a hardcoded BudgetAnalysis — invented $5,000 budgeted /
 * $3,200 spent / 64% used / 12 days left, shown to every user behind a fake
 * setTimeout. It now fetches the real budget overview from
 * GET /api/financial/budgets/summary via budgetApi.getBudgetSummary (adapted by
 * mapBudgetSummary) and renders the user's real totals, percent used, days remaining,
 * and real over-budget alerts, with honest inline loading / error+retry / empty states.
 *
 * These tests prove: fetch-on-mount, the real payload renders while the removed mock
 * ($5,000 / $3,200 / 64.0%) never shows, alerts come from real data, each honest state
 * (loading / error+retry with no fabricated fallback / empty) renders, and a user with
 * no budget gets an empty state rather than the old invented overview.
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { BudgetOverviewData } from "../../services/api/financial";

const mockGetBudgetSummary = jest.fn();

jest.mock("../../services/api/financial", () => ({
  budgetApi: {
    getBudgetSummary: (...args: unknown[]) => mockGetBudgetSummary(...args),
  },
}));

// expo-router and @expo/vector-icons are mocked globally in jest.setup.js.

import SmartBudgetEnhancedScreen from "../../../app/financial-intelligence/smart-budget-enhanced";

function overview(over: Partial<BudgetOverviewData> = {}): BudgetOverviewData {
  return {
    totalBudgeted: 4200,
    totalSpent: 2600,
    totalRemaining: 1600,
    percentUsed: 62,
    daysRemaining: 8,
    alerts: [],
    ...over,
  };
}

function resolve(data: BudgetOverviewData = overview()) {
  mockGetBudgetSummary.mockResolvedValue({ success: true, data });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Smart Budget (enhanced) screen", () => {
  it("fetches the budget summary from the API on mount", async () => {
    resolve();
    render(<SmartBudgetEnhancedScreen />);
    await waitFor(() =>
      expect(mockGetBudgetSummary).toHaveBeenCalledTimes(1),
    );
  });

  it("renders the real totals, percent used, and days remaining — never the removed $5,000 mock", async () => {
    resolve();
    render(<SmartBudgetEnhancedScreen />);

    expect(await screen.findByText("$4,200")).toBeTruthy(); // budgeted
    expect(screen.getByText("$2,600")).toBeTruthy(); // spent
    expect(screen.getByText("$1,600")).toBeTruthy(); // remaining
    expect(screen.getByText("8")).toBeTruthy(); // days left
    expect(screen.getByText("62.0% of budget used")).toBeTruthy();

    // The removed hardcoded mock ($5,000 / $3,200 / 64.0%) must not render.
    expect(screen.queryByText("$5,000")).toBeNull();
    expect(screen.queryByText("$3,200")).toBeNull();
    expect(screen.queryByText("64.0% of budget used")).toBeNull();
  });

  it("renders over-budget alerts from real data", async () => {
    resolve(
      overview({
        alerts: [
          {
            category: "Dining Out",
            severity: "high",
            message: "Dining Out is over budget by $150",
          },
        ],
      }),
    );
    render(<SmartBudgetEnhancedScreen />);
    expect(
      await screen.findByText("Dining Out is over budget by $150"),
    ).toBeTruthy();
  });

  it("shows the loading state while the first fetch is in flight", () => {
    mockGetBudgetSummary.mockReturnValue(new Promise<never>(() => undefined));
    render(<SmartBudgetEnhancedScreen />);
    expect(screen.getByTestId("smart-budget-enhanced-loading")).toBeTruthy();
  });

  it("shows an honest error state with retry when the fetch fails — never the mock", async () => {
    mockGetBudgetSummary.mockResolvedValue({
      success: false,
      error: { code: "NETWORK_ERROR", message: "Network down" },
    });
    render(<SmartBudgetEnhancedScreen />);

    expect(
      await screen.findByTestId("smart-budget-enhanced-error"),
    ).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();

    // The old behavior always rendered the $5,000 overview — it must not.
    expect(screen.queryByText("$5,000")).toBeNull();
    expect(screen.queryByText("Monthly Budget Overview")).toBeNull();

    fireEvent.press(screen.getByText("Try Again"));
    await waitFor(() =>
      expect(mockGetBudgetSummary).toHaveBeenCalledTimes(2),
    );
  });

  it("empty-states a user with no budget — never the removed $5,000 mock overview", async () => {
    resolve(
      overview({
        totalBudgeted: 0,
        totalSpent: 0,
        totalRemaining: 0,
        percentUsed: 0,
        daysRemaining: 0,
        alerts: [],
      }),
    );
    render(<SmartBudgetEnhancedScreen />);

    expect(
      await screen.findByTestId("smart-budget-enhanced-empty"),
    ).toBeTruthy();
    // No fabricated overview for a user without a budget.
    expect(screen.queryByText("Monthly Budget Overview")).toBeNull();
    expect(screen.queryByText("$5,000")).toBeNull();
  });

  it("falls back to a generic error message when the failure carries no message", async () => {
    mockGetBudgetSummary.mockResolvedValue({ success: false });
    render(<SmartBudgetEnhancedScreen />);
    expect(
      await screen.findByTestId("smart-budget-enhanced-error"),
    ).toBeTruthy();
    expect(
      screen.getByText("Unable to load budget data right now."),
    ).toBeTruthy();
  });
});
