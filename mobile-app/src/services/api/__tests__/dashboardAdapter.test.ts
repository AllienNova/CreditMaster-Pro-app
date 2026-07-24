/**
 * mapWebDashboard — web -> mobile financial-dashboard adapter (PARITY-P1).
 *
 * The real web route (GET /api/financial/dashboard) returns the full aggregate,
 * including `spendingByCategory` (per-category month spend) and `monthlyTrend`
 * (6-month income/expense/savings history). The mobile client previously declared
 * a narrower shape that DROPPED both, so the dashboard tab had no real source for
 * its spending breakdown or its month-over-month delta and fell back to hardcoded
 * values. These tests pin the mapping and prove getDashboard never fabricates on
 * failure.
 */

// Stub the module's side-effecting client import so financial.ts loads in
// isolation, while still driving api.get for the getDashboard wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebDashboard, financialOverviewApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

const webBase = {
  netWorth: 47250,
  totalAssets: 82400,
  totalLiabilities: 35150,
  monthlyIncome: 6800,
  monthlyExpenses: 4350,
  savingsRate: 36,
};

describe("mapWebDashboard", () => {
  it("preserves the headline aggregate numbers", () => {
    const m = mapWebDashboard({ ...webBase });
    expect(m.netWorth).toBe(47250);
    expect(m.totalAssets).toBe(82400);
    expect(m.totalLiabilities).toBe(35150);
    expect(m.monthlyIncome).toBe(6800);
    expect(m.monthlyExpenses).toBe(4350);
    expect(m.savingsRate).toBe(36);
  });

  it("maps spendingByCategory (category->name-agnostic data) and defaults transactionCount", () => {
    const m = mapWebDashboard({
      ...webBase,
      spendingByCategory: [
        { category: "Food and Drink", amount: 800, percentage: 40 },
        {
          category: "Travel",
          amount: 600,
          percentage: 30,
          transactionCount: 5,
        },
      ],
    });
    expect(m.spendingByCategory).toEqual([
      {
        category: "Food and Drink",
        amount: 800,
        percentage: 40,
        transactionCount: 0,
      },
      { category: "Travel", amount: 600, percentage: 30, transactionCount: 5 },
    ]);
  });

  it("maps the 6-month monthlyTrend entries verbatim", () => {
    const m = mapWebDashboard({
      ...webBase,
      monthlyTrend: [
        { month: "Feb", income: 6800, expenses: 4100, savings: 2700 },
        { month: "Mar", income: 6800, expenses: 4350, savings: 2450 },
      ],
    });
    expect(m.monthlyTrend).toEqual([
      { month: "Feb", income: 6800, expenses: 4100, savings: 2700 },
      { month: "Mar", income: 6800, expenses: 4350, savings: 2450 },
    ]);
  });

  it("returns empty arrays when the web payload omits the collections", () => {
    const m = mapWebDashboard({ ...webBase });
    expect(m.spendingByCategory).toEqual([]);
    expect(m.monthlyTrend).toEqual([]);
  });

  it("returns empty arrays when the collections are not arrays", () => {
    const m = mapWebDashboard({
      ...webBase,
      // Simulate a malformed payload where the fields are the wrong type.
      spendingByCategory: undefined,
      monthlyTrend: undefined,
    });
    expect(m.spendingByCategory).toEqual([]);
    expect(m.monthlyTrend).toEqual([]);
  });
});

describe("financialOverviewApi.getDashboard", () => {
  it("adapts the web dashboard payload into the mobile shape", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        ...webBase,
        spendingByCategory: [
          {
            category: "Groceries",
            amount: 500,
            percentage: 50,
            transactionCount: 8,
          },
        ],
        monthlyTrend: [
          { month: "Mar", income: 6800, expenses: 4350, savings: 2450 },
        ],
        // web-only extras that must be dropped
        cashFlow: 2450,
        accounts: [{ accountId: "a1" }],
        recentTransactions: [{ id: "t1" }],
      },
    });

    const res = await financialOverviewApi.getDashboard();

    expect(mockApiGet).toHaveBeenCalledWith("/financial/dashboard");
    expect(res.success).toBe(true);
    expect(res.data?.monthlyExpenses).toBe(4350);
    expect(res.data?.spendingByCategory).toHaveLength(1);
    expect(res.data?.monthlyTrend).toHaveLength(1);
    // web-only extras are not carried over
    expect(res.data).not.toHaveProperty("cashFlow");
    expect(res.data).not.toHaveProperty("accounts");
    expect(res.data).not.toHaveProperty("recentTransactions");
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await financialOverviewApi.getDashboard();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
