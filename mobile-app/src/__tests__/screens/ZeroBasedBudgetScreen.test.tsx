/**
 * budgeting/zero-based — real income, real allocations.
 *
 * The screen carried `MONTHLY_INCOME = 5000` and MOCK_CATEGORIES (Housing
 * 1500, Food 600, ...). Zero-based budgeting IS arithmetic against income —
 * allocated, remaining, the progress bar and every per-category percentage
 * derive from it — so one invented salary made every number on the screen
 * invented, under the tagline "Every dollar has a job".
 *
 * Income now comes from GET /api/financial/income, whose
 * stats.totalMonthlyIncome is computed from the caller's own income sources,
 * and the allocations are the caller's own budgets.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockGetIncome = jest.fn();
const mockGetBudgets = jest.fn();
jest.mock("../../services/api/financial", () => ({
  incomeApi: { get: (...a: unknown[]) => mockGetIncome(...a) },
  budgetApi: { getAll: (...a: unknown[]) => mockGetBudgets(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import ZeroBasedBudgetScreen from "../../../app/budgeting/zero-based";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetIncome.mockResolvedValue({
    success: true,
    data: { sources: [], stats: { totalMonthlyIncome: 4200 } },
  });
  mockGetBudgets.mockResolvedValue({
    success: true,
    data: {
      budgets: [
        { id: "b1", category: "Rent", limit: 1400, spent: 1400 },
        { id: "b2", category: "Groceries", limit: 600, spent: 480 },
      ],
    },
  });
});

describe("budgeting/zero-based", () => {
  it("fetches both sources on mount", async () => {
    render(<ZeroBasedBudgetScreen />);
    await waitFor(() => {
      expect(mockGetIncome).toHaveBeenCalled();
      expect(mockGetBudgets).toHaveBeenCalled();
    });
  });

  it("never shows the invented salary or categories again", async () => {
    render(<ZeroBasedBudgetScreen />);
    await waitFor(() => expect(mockGetIncome).toHaveBeenCalled());
    expect(screen.queryByText("$5,000.00")).toBeNull();
    expect(screen.queryByText("Food & Groceries")).toBeNull();
  });

  it("shows the real income and the real categories", async () => {
    render(<ZeroBasedBudgetScreen />);
    expect(await screen.findByText("$4,200.00")).toBeTruthy();
    expect(screen.getByText("Rent")).toBeTruthy();
    expect(screen.getByText("Groceries")).toBeTruthy();
  });

  it("computes what is left from real income minus real allocations", async () => {
    // 4200 - (1400 + 600) = 2200. Under the old constants this was
    // 5000 - 3550 for everybody.
    render(<ZeroBasedBudgetScreen />);
    expect(await screen.findByText(/2,200/)).toBeTruthy();
  });

  describe("honest states", () => {
    it("distinguishes a failed income read from earning nothing", async () => {
      // A $0 zero-based budget says "you earn nothing", which is a different
      // statement about someone's finances than "we could not read this".
      mockGetIncome.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<ZeroBasedBudgetScreen />);
      expect(await screen.findByText(/could not load your income/i)).toBeTruthy();
      expect(screen.queryByText("Rent")).toBeNull();
    });

    it("retries on demand", async () => {
      mockGetIncome.mockResolvedValueOnce({
        success: false,
        error: { message: "boom" },
      });
      render(<ZeroBasedBudgetScreen />);
      await screen.findByText(/could not load your income/i);

      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetIncome).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("$4,200.00")).toBeTruthy();
    });

    it("says so when no income is recorded, rather than dividing by zero", async () => {
      // With income 0 the allocation percentage is 0/0 -> NaN, which React
      // Native drops silently: the bar and every row percentage vanish with no
      // sign anything is wrong.
      mockGetIncome.mockResolvedValue({
        success: true,
        data: { sources: [], stats: { totalMonthlyIncome: 0 } },
      });
      render(<ZeroBasedBudgetScreen />);
      expect(await screen.findByText(/No income recorded yet/i)).toBeTruthy();
      expect(screen.queryByText(/NaN/)).toBeNull();
    });

    it("still shows income when the budget read fails", async () => {
      // Budgets are the secondary source: nothing allocated yet is a real
      // state, and it must not blank the income the user does have.
      mockGetBudgets.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<ZeroBasedBudgetScreen />);
      // Rendered in the income card and again in the "x of y" line; with no
      // allocations both show the same figure. The claim is that income
      // survives, not how many times it appears.
      await waitFor(() =>
        expect(screen.getAllByText("$4,200.00").length).toBeGreaterThan(0),
      );
    });
  });
});
