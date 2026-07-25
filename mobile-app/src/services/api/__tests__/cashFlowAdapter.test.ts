/**
 * mapWebCashFlow — web -> mobile cash-flow adapter (PARITY-P2).
 *
 * The real web route (GET /api/financial/spending/cashflow, withAuth) returns a
 * CashFlowAnalysis whose `monthlyData` carries each month's income/expenses derived
 * server-side from the user's real Plaid transactions, plus a `recommendations`
 * list. The mobile client previously called a non-existent /financial/insights/cashflow
 * route with a shape the endpoint never returns, so every call 404'd and the screen
 * silently rendered a hardcoded MOCK_DATA array. These tests pin the mapping and prove
 * getCashFlowAnalysis hits the real path and never fabricates on failure.
 */

// Stub the module's side-effecting client import so financial.ts loads in
// isolation, while still driving api.get for the getCashFlowAnalysis wrapper tests.
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

import { mapWebCashFlow, financialOverviewApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("mapWebCashFlow", () => {
  it("maps monthlyData to compact month points, taking the short label", () => {
    const m = mapWebCashFlow({
      monthlyData: [
        {
          month: "2026-01",
          monthLabel: "Jan 2026",
          income: 6000,
          expenses: 4000,
        },
        {
          month: "2026-02",
          monthLabel: "Feb 2026",
          income: 6200,
          expenses: 4500,
        },
      ],
    });
    expect(m.months).toEqual([
      { month: "Jan", income: 6000, expenses: 4000 },
      { month: "Feb", income: 6200, expenses: 4500 },
    ]);
  });

  it("falls back to the ISO month when the label is absent", () => {
    const m = mapWebCashFlow({
      monthlyData: [{ month: "2026-03", income: 5000, expenses: 3000 }],
    });
    expect(m.months[0].month).toBe("2026-03");
  });

  it("defaults absent income/expenses to 0 rather than inventing figures", () => {
    const m = mapWebCashFlow({
      monthlyData: [{ month: "2026-04", monthLabel: "Apr 2026" }],
    });
    expect(m.months[0]).toEqual({ month: "Apr", income: 0, expenses: 0 });
  });

  it("carries the recommendations list verbatim", () => {
    const m = mapWebCashFlow({
      monthlyData: [],
      recommendations: ["Trim dining out", "Automate savings"],
    });
    expect(m.recommendations).toEqual([
      "Trim dining out",
      "Automate savings",
    ]);
  });

  it("returns empty arrays when the payload omits the collections", () => {
    const m = mapWebCashFlow({});
    expect(m.months).toEqual([]);
    expect(m.recommendations).toEqual([]);
  });

  it("returns empty arrays when the collections are not arrays", () => {
    const m = mapWebCashFlow({
      monthlyData: undefined,
      recommendations: undefined,
    });
    expect(m.months).toEqual([]);
    expect(m.recommendations).toEqual([]);
  });
});

describe("financialOverviewApi.getCashFlowAnalysis", () => {
  it("hits the real /financial/spending/cashflow route and adapts the payload", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        monthlyData: [
          {
            month: "2026-03",
            monthLabel: "Mar 2026",
            income: 6800,
            expenses: 4350,
            netFlow: 2450,
            savingsRate: 36,
          },
        ],
        summary: { totalIncome: 6800, totalExpenses: 4350 },
        recommendations: ["Keep your savings rate above 20%"],
      },
    });

    const res = await financialOverviewApi.getCashFlowAnalysis(6);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/financial/spending/cashflow?months=6",
    );
    expect(res.success).toBe(true);
    expect(res.data?.months).toEqual([
      { month: "Mar", income: 6800, expenses: 4350 },
    ]);
    expect(res.data?.recommendations).toEqual([
      "Keep your savings rate above 20%",
    ]);
  });

  it("omits the months query when no count is passed", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: { monthlyData: [], recommendations: [] },
    });

    await financialOverviewApi.getCashFlowAnalysis();

    expect(mockApiGet).toHaveBeenCalledWith("/financial/spending/cashflow");
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiGet.mockResolvedValue({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await financialOverviewApi.getCashFlowAnalysis(6);

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
