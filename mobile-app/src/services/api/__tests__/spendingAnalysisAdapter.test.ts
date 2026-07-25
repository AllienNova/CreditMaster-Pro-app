/**
 * mapWebSpendingAnalysis — web -> mobile spending-analysis adapter (PARITY).
 *
 * The real web route (POST /api/financial/spending/analyze, withPermission
 * "financial:read") -> spendingAnalysisService.analyzeSpending returns a
 * SpendingAnalysisResult computed deterministically from the user's real Plaid
 * transactions: { totalSpending, averageDailySpending, byCategory[], anomalies[],
 * patterns[], insights[], comparison{ spendingChangePercent, categoryChanges[] } }.
 * The Insights > Spending screen previously rendered a hardcoded MOCK_ANALYSIS behind
 * a fake setTimeout. These tests pin the mapping and prove getSpendingAnalysis hits the
 * real path and never fabricates on failure.
 *
 * Key honesty guarantees exercised here:
 *  - per-category trend comes from the REAL comparison.categoryChanges, not the
 *    service's placeholder per-category trend (always "stable").
 *  - every pattern `impact` string is built from a real amount on the payload.
 *  - unsourced fields (overall risk score, monthly projection, per-category budget)
 *    never appear on the mapped output.
 */

// Stub the module's side-effecting client import so financial.ts loads in
// isolation, while still driving api.post for the getSpendingAnalysis wrapper tests.
const mockApiPost = jest.fn();
const mockApiGet = jest.fn();
jest.mock("../client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

import { mapWebSpendingAnalysis, financialOverviewApi } from "../financial";

beforeEach(() => {
  jest.clearAllMocks();
});

// A realistic slice of the web SpendingAnalysisResult.
function webAnalysis() {
  return {
    totalSpending: 3000,
    averageDailySpending: 100,
    byCategory: [
      {
        category: "housing",
        displayName: "Housing",
        amount: 1800,
        percentage: 60,
        transactionCount: 2,
      },
      {
        category: "dining_out",
        displayName: "Dining Out",
        amount: 700,
        percentage: 23.3,
        transactionCount: 10,
      },
      {
        category: "transportation",
        displayName: "Transportation",
        amount: 500,
        percentage: 16.7,
        transactionCount: 3,
      },
    ],
    anomalies: [
      {
        id: "anomaly-1",
        type: "unusual_large_transaction",
        severity: "high" as const,
        description: "Unusually large Dining Out transaction at Steakhouse",
        amount: 220,
        category: "dining_out",
      },
    ],
    patterns: [
      {
        type: "recurring_subscription",
        description: "Monthly subscription to Netflix",
        averageAmount: 15.99,
      },
      {
        type: "weekend_spending",
        description: "Higher spending on weekends detected",
        averageAmount: 60,
      },
    ],
    insights: [
      {
        id: "insight-1",
        title: "Consider reviewing your subscriptions",
        description: "You have 4 recurring charges",
        potentialSavings: 24,
        actionSuggestion:
          "Review your subscriptions and cancel any you no longer use.",
      },
      {
        id: "insight-2",
        title: "Housing is your top spending category",
        description: "You spent $1800 on Housing",
      },
    ],
    comparison: {
      spendingChangePercent: 8.5,
      categoryChanges: [
        { category: "housing", changePercent: 0 },
        { category: "dining_out", changePercent: 45 },
        { category: "transportation", changePercent: -15 },
      ],
    },
  };
}

describe("mapWebSpendingAnalysis", () => {
  it("carries the real totals and derives transaction count + average from byCategory", () => {
    const d = mapWebSpendingAnalysis(webAnalysis());
    expect(d.totalSpending).toBe(3000);
    expect(d.dailyAverage).toBe(100);
    expect(d.comparedToLastPeriod).toBe(8.5);
    expect(d.transactionCount).toBe(15); // 2 + 10 + 3
    expect(d.averageTransaction).toBe(200); // 3000 / 15
  });

  it("derives each category trend from the REAL period-over-period change, not the placeholder", () => {
    const d = mapWebSpendingAnalysis(webAnalysis());
    const byName = Object.fromEntries(d.categories.map((c) => [c.name, c]));

    expect(byName.Housing.trend).toBe("stable"); // 0% change
    expect(byName.Housing.trendPercent).toBe(0);
    expect(byName["Dining Out"].trend).toBe("up"); // +45%
    expect(byName["Dining Out"].trendPercent).toBe(45);
    expect(byName.Transportation.trend).toBe("down"); // -15%
    expect(byName.Transportation.trendPercent).toBe(15);
  });

  it("keeps the category amount, share, and transaction count from the payload", () => {
    const d = mapWebSpendingAnalysis(webAnalysis());
    expect(d.categories[0]).toEqual({
      name: "Housing",
      amount: 1800,
      percentOfTotal: 60,
      trend: "stable",
      trendPercent: 0,
      transactionCount: 2,
    });
  });

  it("merges anomalies, patterns, and savings-opportunity insights into patterns with real-amount impacts", () => {
    const d = mapWebSpendingAnalysis(webAnalysis());

    // Anomaly first (title from the real type enum, description + impact from payload).
    expect(d.patterns[0]).toEqual({
      id: "anomaly-1",
      kind: "anomaly",
      title: "Large transaction",
      description: "Unusually large Dining Out transaction at Steakhouse",
      impact: "$220",
      severity: "high",
    });
    // Recurring subscription pattern (averageAmount 15.99 -> "$16 avg").
    expect(d.patterns[1]).toEqual({
      id: "pattern-0",
      kind: "recurring",
      title: "Recurring subscription",
      description: "Monthly subscription to Netflix",
      impact: "$16 avg",
      severity: "low",
    });
    // Weekend spending maps to the "trend" kind.
    expect(d.patterns[2]).toMatchObject({
      kind: "trend",
      title: "Weekend spending pattern",
      impact: "$60 avg",
    });
    // Only the insight with real potentialSavings becomes an opportunity.
    expect(d.patterns[3]).toEqual({
      id: "insight-1",
      kind: "opportunity",
      title: "Consider reviewing your subscriptions",
      description: "You have 4 recurring charges",
      impact: "Save $24",
      severity: "low",
    });
    // The insight without potentialSavings is NOT surfaced as an opportunity pattern.
    expect(d.patterns).toHaveLength(4);
  });

  it("takes recommendations only from real insight actionSuggestions", () => {
    const d = mapWebSpendingAnalysis(webAnalysis());
    expect(d.recommendations).toEqual([
      "Review your subscriptions and cancel any you no longer use.",
    ]);
  });

  it("never emits unsourced fields (risk score, projection, per-category budget)", () => {
    const d = mapWebSpendingAnalysis(webAnalysis());
    expect(Object.keys(d).sort()).toEqual(
      [
        "averageTransaction",
        "categories",
        "comparedToLastPeriod",
        "dailyAverage",
        "patterns",
        "recommendations",
        "totalSpending",
        "transactionCount",
      ].sort(),
    );
    expect(d).not.toHaveProperty("overallRiskScore");
    expect(d).not.toHaveProperty("projectedMonthly");
    expect(d.categories[0]).not.toHaveProperty("budget");
  });

  it("defaults every missing collection and number rather than inventing figures", () => {
    const d = mapWebSpendingAnalysis({});
    expect(d.totalSpending).toBe(0);
    expect(d.transactionCount).toBe(0);
    expect(d.averageTransaction).toBe(0);
    expect(d.dailyAverage).toBe(0);
    expect(d.comparedToLastPeriod).toBe(0);
    expect(d.categories).toEqual([]);
    expect(d.patterns).toEqual([]);
    expect(d.recommendations).toEqual([]);
  });

  it("falls back to a category key and a default trend when the display name / change is absent", () => {
    const d = mapWebSpendingAnalysis({
      totalSpending: 100,
      byCategory: [{ category: "pets", amount: 100, percentage: 100 }],
      comparison: {},
    });
    expect(d.categories[0].name).toBe("pets");
    expect(d.categories[0].trend).toBe("stable");
    expect(d.categories[0].trendPercent).toBe(0);
    expect(d.categories[0].transactionCount).toBe(0);
  });
});

describe("financialOverviewApi.getSpendingAnalysis", () => {
  it("POSTs the real /financial/spending/analyze route with the date range and adapts the payload", async () => {
    mockApiPost.mockResolvedValue({ success: true, data: webAnalysis() });

    const range = {
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-07-01T00:00:00.000Z",
    };
    const res = await financialOverviewApi.getSpendingAnalysis(range);

    expect(mockApiPost).toHaveBeenCalledWith("/financial/spending/analyze", {
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-07-01T00:00:00.000Z",
    });
    expect(res.success).toBe(true);
    expect(res.data?.totalSpending).toBe(3000);
    expect(res.data?.transactionCount).toBe(15);
    expect(res.data?.categories).toHaveLength(3);
  });

  it("passes a failed request through without fabricating data", async () => {
    mockApiPost.mockResolvedValue({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    const res = await financialOverviewApi.getSpendingAnalysis({
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-07-01T00:00:00.000Z",
    });

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Forbidden");
  });
});
