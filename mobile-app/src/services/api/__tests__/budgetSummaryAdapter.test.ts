/**
 * mapBudgetSummary — web -> mobile budget-overview adapter (Wave parity).
 *
 * The real web route GET /api/financial/budgets/summary (budgetService.getBudgetSummary,
 * withPermission("financial:read")) returns the authenticated user's real budget
 * aggregates: totals, an overall percent-used, a monthly period summary (daysRemaining),
 * and the top over-/under-budget categories. This adapter reduces it to the mobile
 * BudgetOverviewData view-model the smart-budget screen renders. Getting it wrong ships
 * the exact hazard this wiring removes — a fabricated budget overview. These tests prove:
 * totals/percent/days map from the real fields, alerts derive ONLY from real over-budget
 * categories (never invented), a user with no over-budget categories gets no alerts, and
 * a malformed JSON boundary degrades to zeros rather than fabricating.
 */

// Stub the module's side-effecting client import so financial.ts loads in isolation,
// while still driving api.get for the getBudgetSummary wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapBudgetSummary, budgetApi, type WebBudgetSummary } from "../financial";

function summary(over: Partial<WebBudgetSummary> = {}): WebBudgetSummary {
  return {
    totalBudgeted: 4200,
    totalSpent: 2600,
    totalRemaining: 1600,
    overallPercentUsed: 61.9,
    topOverspentCategories: [],
    periodSummary: { daysRemaining: 8 },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mapBudgetSummary", () => {
  it("maps totals, overall percent-used, and days remaining from the real payload", () => {
    const vm = mapBudgetSummary(summary());
    expect(vm.totalBudgeted).toBe(4200);
    expect(vm.totalSpent).toBe(2600);
    expect(vm.totalRemaining).toBe(1600);
    expect(vm.percentUsed).toBe(61.9);
    expect(vm.daysRemaining).toBe(8);
  });

  it("derives alerts only from real over-budget categories (name + real dollar overage)", () => {
    const vm = mapBudgetSummary(
      summary({
        topOverspentCategories: [
          {
            category: "dining",
            categoryDisplayName: "Dining Out",
            variance: 150.4,
          },
          // No display name -> fall back to the raw category key; never blank.
          { category: "shopping", categoryDisplayName: "", variance: 42 },
        ],
      }),
    );
    expect(vm.alerts).toEqual([
      {
        category: "Dining Out",
        severity: "high",
        message: "Dining Out is over budget by $150",
      },
      {
        category: "shopping",
        severity: "high",
        message: "shopping is over budget by $42",
      },
    ]);
  });

  it("yields no alerts when nothing is over budget (never a fabricated alert)", () => {
    expect(mapBudgetSummary(summary()).alerts).toEqual([]);
  });

  it("degrades a malformed payload honestly — non-numeric fields -> 0, missing array -> no alerts", () => {
    const malformed = {
      totalBudgeted: "oops",
      totalSpent: null,
      totalRemaining: undefined,
      overallPercentUsed: undefined,
      periodSummary: undefined,
      topOverspentCategories: undefined,
    } as unknown as WebBudgetSummary;
    const vm = mapBudgetSummary(malformed);
    expect(vm.totalBudgeted).toBe(0);
    expect(vm.totalSpent).toBe(0);
    expect(vm.totalRemaining).toBe(0);
    expect(vm.percentUsed).toBe(0);
    expect(vm.daysRemaining).toBe(0);
    expect(vm.alerts).toEqual([]);
  });
});

describe("budgetApi.getBudgetSummary", () => {
  it("fetches GET /financial/budgets/summary and returns the mapped overview", async () => {
    mockApiGet.mockResolvedValue({ success: true, data: summary() });
    const res = await budgetApi.getBudgetSummary();
    expect(mockApiGet).toHaveBeenCalledWith("/financial/budgets/summary");
    expect(res.success).toBe(true);
    expect(res.data?.totalBudgeted).toBe(4200);
    expect(res.data?.daysRemaining).toBe(8);
  });

  it("propagates the error without fabricating data when the fetch fails", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });
    const res = await budgetApi.getBudgetSummary();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.code).toBe("HTTP_401");
  });
});
