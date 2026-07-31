/**
 * Financial Aggregation Service Tests
 */

// Mock Supabase with inline factory
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => {
  return {
    getSupabase: () => ({
      from: mockFrom,
    }),
  };
});

type MockChain = Record<
  string,
  jest.Mock | ((resolve: (v: unknown) => unknown) => Promise<unknown>)
>;

// Builds a chainable + thenable mock query builder, matching how the real
// postgrest-js FilterBuilder resolves regardless of which method call is
// last in the chain. `result` overrides the terminal resolved value; the
// no-arg default reproduces the original hardcoded defaults byte-for-byte
// so every pre-existing test keeps its exact prior behavior.
function createMockChain(result?: {
  data?: unknown;
  error?: unknown;
  singleData?: unknown;
  singleError?: unknown;
}): MockChain {
  const chain: MockChain = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "order",
    "limit",
    "range",
    "in",
    "is",
    "insert",
    "update",
    "delete",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() =>
    Promise.resolve({
      data: result?.singleData ?? null,
      error: result?.singleError ?? null,
    }),
  );
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({
      data: result?.data ?? [],
      error: result?.error ?? null,
    }).then(resolve);
  return chain;
}

// Setup mock chain before each test
beforeEach(() => {
  mockFrom.mockImplementation(() => createMockChain());
});

jest.mock("../budget-service", () => ({
  budgetService: {
    getBudgetsByUser: jest.fn(() => Promise.resolve([])),
    getBudgetSummary: jest.fn(() =>
      Promise.resolve({
        totalBudgeted: 0,
        totalSpent: 0,
        totalRemaining: 0,
        utilizationPercent: 0,
        statusCounts: { on_track: 0, at_risk: 0, over_budget: 0 },
        categoryBreakdown: [],
        periodSummary: {
          current: { spent: 0, budgeted: 0, remaining: 0 },
          previous: { spent: 0, budgeted: 0, remaining: 0 },
          change: 0,
        },
        projectedSpending: {
          endOfPeriod: 0,
          daysRemaining: 0,
          dailyAverage: 0,
          projectedOverUnder: 0,
        },
      }),
    ),
    getAlerts: jest.fn(() => Promise.resolve([])),
    getBudgetTrends: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock("../spending-analysis-service", () => ({
  spendingAnalysisService: {
    analyzeSpending: jest.fn(() =>
      Promise.resolve({
        totalSpending: 3000,
        averageDaily: 100,
        byCategory: [],
        byMerchant: [],
        trends: [],
        anomalies: [],
        insights: [],
      }),
    ),
    detectAnomalies: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock("../bill-detection-service", () => ({
  billDetectionService: {
    getBillsByUser: jest.fn(() => Promise.resolve([])),
    getBillSummary: jest.fn(() =>
      Promise.resolve({
        totalBills: 0,
        totalMonthlyBills: 0,
        upcomingBillsCount: 0,
        upcomingBillsTotal: 0,
        overdueBillsCount: 0,
        overdueBillsTotal: 0,
        paidThisMonth: 0,
        billsByCategory: [],
      }),
    ),
  },
}));

jest.mock("../savings-automation-service", () => ({
  savingsAutomationService: {
    getGoals: jest.fn(() => Promise.resolve([])),
    getRules: jest.fn(() => Promise.resolve([])),
    getSummary: jest.fn(() =>
      Promise.resolve({
        totalSaved: 10000,
        totalSavedThisMonth: 500,
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        activeRules: 0,
        projectedMonthlySavings: 0,
        savingsRate: 10,
        goalProgress: [],
      }),
    ),
  },
}));

// Import after mocks are set up
import { FinancialAggregationService } from "../financial-aggregation-service";
import { spendingAnalysisService } from "../spending-analysis-service";
import { logger } from "@/lib/monitoring/logger";

describe("FinancialAggregationService", () => {
  let service: FinancialAggregationService;
  const testUserId = "test-user-123";

  beforeEach(() => {
    service = new FinancialAggregationService();
    service.clearAllCaches();
  });

  describe("getAggregatedContext", () => {
    it("should return aggregated financial context", async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(context).toBeDefined();
      expect(context.user).toBeDefined();
      expect(context.accounts).toBeDefined();
      expect(context.budgets).toBeDefined();
      expect(context.spending).toBeDefined();
      expect(context.bills).toBeDefined();
      expect(context.savings).toBeDefined();
      expect(context.debt).toBeDefined();
      expect(context.netWorth).toBeDefined();
      expect(context.investments).toBeDefined();
      expect(context.healthScore).toBeDefined();
      expect(context.lastUpdated).toBeInstanceOf(Date);
      expect(context.dataCompleteness).toBeDefined();
    });

    it("should use cached data on subsequent calls", async () => {
      const context1 = await service.getAggregatedContext(testUserId);
      const context2 = await service.getAggregatedContext(testUserId);

      // Same cached timestamp
      expect(context1.lastUpdated.getTime()).toBe(
        context2.lastUpdated.getTime(),
      );
    });

    it("should bypass cache when forceRefresh is true", async () => {
      const context1 = await service.getAggregatedContext(testUserId);

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const context2 = await service.getAggregatedContext(testUserId, {
        forceRefresh: true,
      });

      // Different timestamps due to refresh
      expect(context2.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        context1.lastUpdated.getTime(),
      );
    });

    it("should calculate data completeness correctly", async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(context.dataCompleteness).toHaveProperty("accounts");
      expect(context.dataCompleteness).toHaveProperty("budgets");
      expect(context.dataCompleteness).toHaveProperty("transactions");
      expect(context.dataCompleteness).toHaveProperty("overallScore");
      expect(typeof context.dataCompleteness.overallScore).toBe("number");
    });
  });

  describe("getFinancialSnapshot", () => {
    it("should return a point-in-time snapshot", async () => {
      const snapshot = await service.getFinancialSnapshot(testUserId);

      expect(snapshot).toBeDefined();
      expect(snapshot.date).toBeInstanceOf(Date);
      expect(typeof snapshot.netWorth).toBe("number");
      expect(typeof snapshot.totalAssets).toBe("number");
      expect(typeof snapshot.totalLiabilities).toBe("number");
      expect(typeof snapshot.monthlyIncome).toBe("number");
      expect(typeof snapshot.monthlyExpenses).toBe("number");
      expect(typeof snapshot.healthScore).toBe("number");
    });

    it("should calculate cash flow correctly", async () => {
      const snapshot = await service.getFinancialSnapshot(testUserId);

      expect(snapshot.monthlyCashFlow).toBe(
        snapshot.monthlyIncome - snapshot.monthlyExpenses,
      );
    });
  });

  describe("getFinancialTrends", () => {
    it("should return trend data for specified period", async () => {
      const trends = await service.getFinancialTrends(testUserId, {
        period: "30d",
      });

      expect(trends).toBeDefined();
      expect(trends.period).toBe("30d");
      expect(trends.startDate).toBeInstanceOf(Date);
      expect(trends.endDate).toBeInstanceOf(Date);
      expect(trends.netWorthTrend).toBeDefined();
      expect(trends.incomeTrend).toBeDefined();
      expect(trends.spendingTrend).toBeDefined();
      expect(trends.savingsTrend).toBeDefined();
      expect(trends.debtTrend).toBeDefined();
    });

    it("should calculate trend direction correctly", async () => {
      const trends = await service.getFinancialTrends(testUserId, {
        period: "30d",
      });

      // With empty data, direction should be stable
      expect(["up", "down", "stable"]).toContain(
        trends.netWorthTrend.direction,
      );
    });

    it("should generate observations", async () => {
      const trends = await service.getFinancialTrends(testUserId, {
        period: "30d",
      });

      expect(Array.isArray(trends.observations)).toBe(true);
    });
  });

  describe("cache management", () => {
    it("should clear cache for specific user", async () => {
      await service.getAggregatedContext(testUserId);
      service.clearCache(testUserId);

      // Next call should fetch fresh data
      const context = await service.getAggregatedContext(testUserId);
      expect(context).toBeDefined();
    });

    it("should clear all caches", async () => {
      await service.getAggregatedContext(testUserId);
      await service.getAggregatedContext("another-user");

      service.clearAllCaches();

      // Both should fetch fresh data
      const context1 = await service.getAggregatedContext(testUserId);
      const context2 = await service.getAggregatedContext("another-user");

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
    });
  });

  describe("data completeness", () => {
    it("should return completeness score between 0 and 100", async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(context.dataCompleteness.overallScore).toBeGreaterThanOrEqual(0);
      expect(context.dataCompleteness.overallScore).toBeLessThanOrEqual(100);
    });

    it("should track individual data source completeness", async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(typeof context.dataCompleteness.accounts).toBe("boolean");
      expect(typeof context.dataCompleteness.budgets).toBe("boolean");
      expect(typeof context.dataCompleteness.transactions).toBe("boolean");
      expect(typeof context.dataCompleteness.bills).toBe("boolean");
      expect(typeof context.dataCompleteness.savings).toBe("boolean");
      expect(typeof context.dataCompleteness.debt).toBe("boolean");
      expect(typeof context.dataCompleteness.investments).toBe("boolean");
      expect(typeof context.dataCompleteness.credit).toBe("boolean");
    });
  });

  describe("insights and recommendations", () => {
    it("should generate insights array", async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(Array.isArray(context.insights)).toBe(true);
    });

    it("should generate recommendations array", async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(Array.isArray(context.recommendations)).toBe(true);
    });
  });

  describe("Debt-to-Income Ratio (debt_accounts)", () => {
    // Regression coverage: fetchDebtData used to query a "debts" table that
    // has never existed in the live schema (the real table is
    // "debt_accounts"). PostgREST resolves an {error} for an unknown table
    // instead of throwing, and the catch block silently mapped that into
    // "zero debt" — so debtToIncomeRatio read 0 for every user, even ones
    // carrying real debt.
    const activeDebtRows = [
      {
        id: "debt-1",
        user_id: testUserId,
        name: "Visa Card",
        type: "credit_card",
        balance: 5000,
        original_balance: 5000,
        interest_rate: 24.99,
        minimum_payment: 150,
        due_date: null,
        creditor_name: "Chase",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "debt-2",
        user_id: testUserId,
        name: "Personal Loan",
        type: "personal_loan",
        balance: 10000,
        original_balance: 12000,
        interest_rate: 8,
        minimum_payment: 200,
        due_date: null,
        creditor_name: "SoFi",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    it("computes a non-zero debtToIncomeRatio when the user carries active debt_accounts rows", async () => {
      (
        spendingAnalysisService.analyzeSpending as jest.Mock
      ).mockResolvedValueOnce({
        totalSpending: 3000,
        totalIncome: 6000,
        byCategory: [],
        byMerchant: [],
        trends: [],
        anomalies: [],
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "debt_accounts") {
          return createMockChain({ data: activeDebtRows, error: null });
        }
        return createMockChain();
      });

      const snapshot = await service.getFinancialSnapshot(testUserId);

      // 150 + 200 = 350 total minimum payments / 6000 income * 100
      expect(snapshot.totalDebt).toBe(15000);
      expect(snapshot.debtToIncomeRatio).toBeGreaterThan(0);
      expect(snapshot.debtToIncomeRatio).toBeCloseTo((350 / 6000) * 100, 5);
    });

    it("surfaces (does not silently swallow) a debt_accounts query error instead of reporting it as zero debt", async () => {
      const loggerErrorSpy = jest
        .spyOn(logger, "error")
        .mockImplementation(() => {});

      mockFrom.mockImplementation((table: string) => {
        if (table === "debt_accounts") {
          return createMockChain({
            data: null,
            error: { message: "connection reset", code: "08006" },
          });
        }
        return createMockChain();
      });

      const context = await service.getAggregatedContext(testUserId, {
        forceRefresh: true,
      });

      // Fails safe to empty debt data (does not crash the whole aggregation)...
      expect(context.debt.totalDebt).toBe(0);
      // ...but the failure must be observable, not silent.
      expect(loggerErrorSpy).toHaveBeenCalled();
      const [message, loggedError] = loggerErrorSpy.mock.calls[0];
      expect(String(message)).toContain("debt_accounts");
      expect(loggedError).toBeInstanceOf(Error);

      loggerErrorSpy.mockRestore();
    });
  });

  describe("Credit score (credit_scores, not credit_profiles)", () => {
    // Regression coverage: fetchCreditData used to query a "credit_profiles"
    // table that has never existed in the live schema (the real table is
    // "credit_scores", whose score column is named `score`, not
    // `credit_score`). PostgREST resolves an {error} for an unknown table
    // instead of throwing, and the code only checked `if (!data)` —
    // discarding that error entirely — so every user was shown a hardcoded
    // currentScore: 0 regardless of their real, on-file credit score.
    const creditScoreRows = [
      {
        id: "cs-2",
        user_id: testUserId,
        bureau: "experian",
        score: 712,
        score_date: "2026-07-01",
        created_at: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "cs-1",
        user_id: testUserId,
        bureau: "experian",
        score: 690,
        score_date: "2026-06-01",
        created_at: "2026-06-01T00:00:00.000Z",
      },
    ];

    it("reads a real, non-zero currentScore from credit_scores", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_scores") {
          return createMockChain({ data: creditScoreRows, error: null });
        }
        return createMockChain();
      });

      const context = await service.getAggregatedContext(testUserId);

      expect(context.credit.currentScore).toBe(712);
      expect(context.credit.scoreChange).toBe(22);
      expect(context.credit.scoreChangeDirection).toBe("up");
      expect(context.credit.lastUpdated).toEqual(new Date("2026-07-01"));
    });

    it("returns the honest empty profile (currentScore 0) when the user has no credit_scores rows", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_scores") {
          return createMockChain({ data: [], error: null });
        }
        return createMockChain();
      });

      const context = await service.getAggregatedContext(testUserId);

      expect(context.credit.currentScore).toBe(0);
      expect(context.credit.scoreChange).toBe(0);
      expect(context.credit.scoreChangeDirection).toBe("stable");
    });

    it("surfaces (does not silently swallow) a credit_scores query error instead of reporting it as a zero score", async () => {
      const loggerErrorSpy = jest
        .spyOn(logger, "error")
        .mockImplementation(() => {});

      mockFrom.mockImplementation((table: string) => {
        if (table === "credit_scores") {
          return createMockChain({
            data: null,
            error: { message: "connection reset", code: "08006" },
          });
        }
        return createMockChain();
      });

      const context = await service.getAggregatedContext(testUserId, {
        forceRefresh: true,
      });

      // Fails safe to the empty credit profile (does not crash the whole
      // aggregation)...
      expect(context.credit.currentScore).toBe(0);
      // ...but the failure must be observable, not silent.
      expect(loggerErrorSpy).toHaveBeenCalled();
      const [message, loggedError] = loggerErrorSpy.mock.calls[0];
      expect(String(message)).toContain("credit score");
      expect(loggedError).toBeInstanceOf(Error);

      loggerErrorSpy.mockRestore();
    });
  });

  describe("Linked accounts (financial_accounts, not plaid_accounts)", () => {
    // Regression coverage: fetchAccounts used to query a "plaid_accounts"
    // table that has never existed in the live schema (plaid-service.ts, the
    // writer, has always used "financial_accounts" — see
    // 20260731000006_plaid_items_accounts.sql). PostgREST resolves an
    // {error} for an unknown table instead of throwing, and the code only
    // checked `error || !data` — discarding that error entirely — so every
    // user's net worth silently read $0 regardless of real linked-account
    // balances.
    const linkedAccountRows = [
      {
        id: "item-1_acct-1",
        item_id: "item-1",
        user_id: testUserId,
        account_id: "acct-1",
        institution_name: "Chase",
        account_name: "Total Checking",
        account_type: "checking",
        current_balance: 5000,
        available_balance: 4800,
        mask: "4567",
        last_synced: "2026-07-01T00:00:00.000Z",
        created_at: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "item-1_acct-2",
        item_id: "item-1",
        user_id: testUserId,
        account_id: "acct-2",
        institution_name: "Chase",
        account_name: "Freedom Card",
        account_type: "credit",
        current_balance: -1200,
        available_balance: null,
        mask: "8901",
        last_synced: "2026-07-01T00:00:00.000Z",
        created_at: "2026-07-01T00:00:00.000Z",
      },
    ];

    it("computes a non-zero net worth from real financial_accounts rows", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "financial_accounts") {
          return createMockChain({ data: linkedAccountRows, error: null });
        }
        return createMockChain();
      });

      const snapshot = await service.getFinancialSnapshot(testUserId);

      // assets: 5000 (checking) ; liabilities: 1200 (credit, abs value)
      expect(snapshot.totalAssets).toBe(5000);
      expect(snapshot.totalLiabilities).toBe(1200);
      expect(snapshot.netWorth).toBe(3800);
    });

    it("maps mask -> lastFourDigits and last_synced -> lastUpdatedAt (not the nonexistent last_four_digits/updated_at columns)", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "financial_accounts") {
          return createMockChain({ data: linkedAccountRows, error: null });
        }
        return createMockChain();
      });

      const context = await service.getAggregatedContext(testUserId, {
        forceRefresh: true,
      });

      const checking = context.accounts.checking[0];
      expect(checking.lastFourDigits).toBe("4567");
      expect(checking.lastUpdatedAt).toEqual(new Date("2026-07-01T00:00:00.000Z"));
    });

    it("surfaces (does not silently swallow) a financial_accounts query error instead of reporting $0 net worth", async () => {
      const loggerErrorSpy = jest
        .spyOn(logger, "error")
        .mockImplementation(() => {});

      mockFrom.mockImplementation((table: string) => {
        if (table === "financial_accounts") {
          return createMockChain({
            data: null,
            error: { message: "connection reset", code: "08006" },
          });
        }
        return createMockChain();
      });

      const context = await service.getAggregatedContext(testUserId, {
        forceRefresh: true,
      });

      // Fails safe to empty accounts (does not crash the whole aggregation)...
      expect(context.accounts.totalAssets).toBe(0);
      expect(context.netWorth.current).toBe(0);
      // ...but the failure must be observable, not silent.
      expect(loggerErrorSpy).toHaveBeenCalled();
      const [message, loggedError] = loggerErrorSpy.mock.calls[0];
      expect(String(message)).toContain("financial_accounts");
      expect(loggedError).toBeInstanceOf(Error);

      loggerErrorSpy.mockRestore();
    });
  });
});
