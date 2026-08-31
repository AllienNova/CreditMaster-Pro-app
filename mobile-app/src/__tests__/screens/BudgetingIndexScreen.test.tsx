/**
 * budgeting/index — a real budget summary, not the same one for everybody.
 *
 * The Monthly Overview card read Income $5,000, Expenses $3,245, Remaining
 * $1,755 with a progress bar hardcoded to 64.9%, on a screen that imported no
 * API at all. Every user saw that budget.
 *
 * It now reads GET /api/financial/budgets/summary through
 * budgetApi.getBudgetSummary(), which already existed for the smart-budget
 * screen. The labels are Budgeted / Spent, not Income / Expenses: income is
 * not part of a budget summary, and calling `totalBudgeted` "Income" would be
 * a second fabrication wearing the first one's clothes.
 *
 * audit:screen-data never saw this screen — the numbers were inline JSX
 * literals, not a module-level constant. audit:inline-metrics exists because
 * of it.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

const mockGetBudgetSummary = jest.fn();
jest.mock("../../services/api/financial", () => ({
  budgetApi: { getBudgetSummary: (...a: unknown[]) => mockGetBudgetSummary(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import BudgetingIndexScreen from "../../../app/budgeting/index";

/** Exactly BudgetOverviewData (financial.ts:942-949). */
function overview(over: Record<string, unknown> = {}) {
  return {
    totalBudgeted: 2000,
    totalSpent: 500,
    totalRemaining: 1500,
    percentUsed: 25,
    daysRemaining: 12,
    alerts: [],
    ...over,
  };
}

const barWidth = () =>
  StyleSheet.flatten(screen.getByTestId("budget-progress").props.style)?.width;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBudgetSummary.mockResolvedValue({ success: true, data: overview() });
});

describe("budgeting/index", () => {
  it("fetches on mount instead of rendering a fixture", async () => {
    render(<BudgetingIndexScreen />);
    await waitFor(() => expect(mockGetBudgetSummary).toHaveBeenCalled());
  });

  it("never shows the invented budget again", async () => {
    render(<BudgetingIndexScreen />);
    await waitFor(() => expect(mockGetBudgetSummary).toHaveBeenCalled());
    for (const invented of [/5,000/, /3,245/, /1,755/, /64\.9/]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  it("renders the caller's own totals", async () => {
    render(<BudgetingIndexScreen />);
    expect(await screen.findByText("$2,000.00")).toBeTruthy();
    expect(screen.getByText("$500.00")).toBeTruthy();
    expect(screen.getByText("$1,500.00")).toBeTruthy();
    expect(screen.getByText("25.0% of budget used")).toBeTruthy();
  });

  it("labels the figures as what the summary measures", async () => {
    // Income is not part of a budget summary; totalBudgeted is not income.
    render(<BudgetingIndexScreen />);
    expect(await screen.findByText("Budgeted")).toBeTruthy();
    expect(screen.getByText("Spent")).toBeTruthy();
    expect(screen.queryByText("Income")).toBeNull();
    expect(screen.queryByText("Expenses")).toBeNull();
  });

  describe("the progress bar", () => {
    it("tracks percentUsed", async () => {
      render(<BudgetingIndexScreen />);
      await screen.findByText("$2,000.00");
      expect(barWidth()).toBe("25%");
    });

    it("clamps overspending to the width of its track", async () => {
      // 140% would render a bar wider than the bar it sits in.
      mockGetBudgetSummary.mockResolvedValue({
        success: true,
        data: overview({ totalSpent: 2800, totalRemaining: -800, percentUsed: 140 }),
      });
      render(<BudgetingIndexScreen />);
      await screen.findByText("-$800.00");
      expect(barWidth()).toBe("100%");
    });

    it("clamps a negative percentage to zero", async () => {
      mockGetBudgetSummary.mockResolvedValue({
        success: true,
        data: overview({ percentUsed: -5 }),
      });
      render(<BudgetingIndexScreen />);
      await screen.findByText("$2,000.00");
      expect(barWidth()).toBe("0%");
    });
  });

  describe("honest states", () => {
    it("distinguishes a failed read from having no budget", async () => {
      mockGetBudgetSummary.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<BudgetingIndexScreen />);
      expect(
        await screen.findByText(/could not load your budget summary/i),
      ).toBeTruthy();
      expect(screen.queryByText(/have not set a budget/i)).toBeNull();
    });

    it("retries on demand", async () => {
      mockGetBudgetSummary.mockResolvedValueOnce({
        success: false,
        error: { message: "boom" },
      });
      render(<BudgetingIndexScreen />);
      await screen.findByText(/could not load your budget summary/i);

      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetBudgetSummary).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("$2,000.00")).toBeTruthy();
    });

    it("says so when no budget is set, rather than showing zeros", async () => {
      // All-zero totals are what the server returns for a user with no
      // budgets. "$0.00 spent of $0.00" reads as a budget that exists.
      mockGetBudgetSummary.mockResolvedValue({
        success: true,
        data: overview({
          totalBudgeted: 0,
          totalSpent: 0,
          totalRemaining: 0,
          percentUsed: 0,
        }),
      });
      render(<BudgetingIndexScreen />);
      expect(await screen.findByText(/have not set a budget yet/i)).toBeTruthy();
      expect(screen.queryByTestId("budget-progress")).toBeNull();
    });
  });
});
