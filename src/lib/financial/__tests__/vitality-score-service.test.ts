/**
 * @jest-environment node
 */

/**
 * Tests for FinancialVitalityScoreService (Wave 7 radical-honesty de-mock).
 *
 * The service no longer uses any hardcoded `mockDetails`. Every component score
 * is computed from REAL per-user data pulled from three services, which these
 * tests mock:
 *   - credit      → creditMonitoringService.getMonitoringDashboard
 *   - spending    → financialService.getFinancialDashboard + getBudgets
 *   - savings     → financialService.getFinancialDashboard + getFinancialGoals
 *   - debt        → financialService.getFinancialDashboard (always excluded —
 *                   the schema lacks the inputs its formula needs)
 *   - investments → portfolioService.getUserPortfolios
 *
 * The assertions prove:
 *   - each component's score is derived from the real inputs (details echo the
 *     source values; changing an input changes the score) — NOT the removed
 *     mock constants (credit 82 / spending 89 / savings 74 / debt 52 / invest 78);
 *   - a component with no real data is `available: false` and EXCLUDED from the
 *     weighted overall, which is renormalized over the components that remain;
 *   - `overall` / `grade` are null when no component has real data;
 *   - `percentile` is always null (no cross-user benchmark);
 *   - the score is saved to history only when a real `overall` exists.
 *
 * Mocking the three source modules also prevents their module-load Supabase
 * side effects, so no client mock is needed beyond the history store.
 */

jest.mock("@/lib/supabase/server", () => {
  const _admin = { from: jest.fn(), rpc: jest.fn() };
  return { supabaseAdmin: _admin };
});

jest.mock("@/lib/financial/financial-service", () => ({
  financialService: {
    getFinancialDashboard: jest.fn(),
    getFinancialGoals: jest.fn(),
    getBudgets: jest.fn(),
  },
}));

jest.mock("@/lib/credit-monitoring/credit-monitoring-service", () => ({
  creditMonitoringService: { getMonitoringDashboard: jest.fn() },
}));

jest.mock("@/lib/investments/portfolio-service", () => ({
  portfolioService: { getUserPortfolios: jest.fn() },
}));

import { vitalityScoreService } from "@/lib/financial/vitality-score-service";
import {
  financialService,
  type FinancialDashboard,
  type FinancialGoal,
  type Budget,
} from "@/lib/financial/financial-service";
import {
  creditMonitoringService,
  type CreditMonitoringDashboard,
} from "@/lib/credit-monitoring/credit-monitoring-service";
import {
  portfolioService,
  type Portfolio,
} from "@/lib/investments/portfolio-service";
import type { PlaidAccount } from "@/lib/financial/plaid-service";

// Typed handles to the mocked source methods.
const mockGetDashboard =
  financialService.getFinancialDashboard as jest.Mock;
const mockGetGoals = financialService.getFinancialGoals as jest.Mock;
const mockGetBudgets = financialService.getBudgets as jest.Mock;
const mockGetCreditDash =
  creditMonitoringService.getMonitoringDashboard as jest.Mock;
const mockGetPortfolios = portfolioService.getUserPortfolios as jest.Mock;

function sb() {
  return require("@/lib/supabase/server").supabaseAdmin;
}

type ChainMock = Record<
  | "select"
  | "insert"
  | "update"
  | "upsert"
  | "delete"
  | "eq"
  | "gte"
  | "lte"
  | "order"
  | "limit"
  | "single",
  jest.Mock
> & {
  // Thenable so `await chain` resolves without .single().
  then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise<unknown>;
};

/** Self-referencing chain mock that resolves to {data,error} when awaited. */
function chainMock(result: { data: unknown; error: unknown }): ChainMock {
  // `handler` returns `mock`; it is only invoked when a chained method is
  // called (well after `mock` is initialized), so there is no TDZ access.
  const handler = (): ChainMock => mock;
  const mock: ChainMock = {
    select: jest.fn(handler),
    insert: jest.fn(handler),
    update: jest.fn(handler),
    upsert: jest.fn(handler),
    delete: jest.fn(handler),
    eq: jest.fn(handler),
    gte: jest.fn(handler),
    lte: jest.fn(handler),
    order: jest.fn(handler),
    limit: jest.fn(handler),
    single: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return mock;
}

// ============================================================================
// Fixture factories — realistic per-user data for the three source services
// ============================================================================

function makeAccount(
  accountType: PlaidAccount["accountType"],
  currentBalance: number,
): PlaidAccount {
  return {
    id: `acc-${accountType}`,
    itemId: "item-1",
    userId: "u1",
    accountId: `acct-${accountType}`,
    institutionId: "ins-1",
    institutionName: "Test Bank",
    accountName: `Test ${accountType}`,
    accountType,
    accountSubtype: "checking",
    mask: "0000",
    currentBalance,
    currency: "USD",
    lastSynced: new Date(),
    createdAt: new Date(),
  };
}

function makeDashboard(
  overrides: Partial<FinancialDashboard> = {},
): FinancialDashboard {
  return {
    netWorth: 50000,
    totalAssets: 60000,
    totalLiabilities: 10000,
    monthlyIncome: 5000,
    monthlyExpenses: 4000,
    cashFlow: 1000,
    savingsRate: 20,
    accounts: [makeAccount("depository", 12000)],
    recentTransactions: [],
    spendingByCategory: [
      { category: "Rent", amount: 1500, percentage: 75, transactionCount: 1 },
      {
        category: "Entertainment",
        amount: 500,
        percentage: 25,
        transactionCount: 5,
      },
    ],
    monthlyTrend: [
      { month: "Jan 2026", income: 5000, expenses: 4200, savings: 800 },
      { month: "Feb 2026", income: 5000, expenses: 4000, savings: 1000 },
    ],
    ...overrides,
  };
}

function makeCreditDash(
  overrides: Partial<CreditMonitoringDashboard> = {},
): CreditMonitoringDashboard {
  return {
    currentScores: { experian: 720, equifax: 720, transunion: 720 },
    averageScore: 720,
    scoreChange30Days: 15,
    scoreChange90Days: 20,
    alerts: [],
    recentChanges: [],
    history: [],
    ...overrides,
  };
}

function makeGoal(overrides: Partial<FinancialGoal> = {}): FinancialGoal {
  return {
    id: "goal-1",
    userId: "u1",
    type: "emergency_fund",
    name: "Emergency Fund",
    targetAmount: 10000,
    currentAmount: 6500,
    progress: 65,
    targetDate: new Date(),
    status: "active",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: "budget-1",
    userId: "u1",
    category: "Groceries",
    amount: 600,
    spent: 700, // slightly over → adherence 85.7%, a clearly-derived (non-100) value
    remaining: -100,
    period: "monthly",
    startDate: new Date(),
    endDate: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: "port-1",
    userId: "u1",
    name: "Main",
    holdings: [
      {
        symbol: "AAPL",
        shares: 10,
        costBasis: 1000,
        currentPrice: 150,
        currentValue: 1500,
        sector: "Technology",
      },
      {
        symbol: "JPM",
        shares: 5,
        costBasis: 500,
        currentPrice: 140,
        currentValue: 700,
        sector: "Financials",
      },
    ],
    totalValue: 2200,
    totalCostBasis: 1500,
    totalGainLoss: 700,
    totalGainLossPercent: 46.67,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Expected component scores hand-derived from the default fixtures — every one
 * is a real computation, and every one differs from the removed mock constant.
 *   Credit:      averageScore 720 → round((420/550)*100) = 76   (mock was 82)
 *   Spending:    rate-band 30 + necessary 20 + trend 10 + adherence 34.29 = 94.29
 *                → 94                                            (mock was 89)
 *   Savings:     emergencyFund(3mo) 30 + rate 35 + goal 16.25 = 81.25 → 81
 *                                                               (mock was 74)
 *   Investments: diversification 43→12.9 + performance 25, over weight 55
 *                → round(37.9/55*100) = 69                      (mock was 78)
 *   Debt:        always available:false, excluded                (mock was 52)
 *   Overall:     (76*.25 + 94*.2 + 81*.2 + 69*.15) / 0.8
 *                = 64.35 / 0.8 = 80.44 → 80                      (mock was 75)
 */
const EXP_CREDIT = 76;
const EXP_SPENDING = 94;
const EXP_SAVINGS = 81;
const EXP_INVESTMENTS = 69;
const EXP_OVERALL = 80;

function setHappyPathSources() {
  mockGetDashboard.mockResolvedValue(makeDashboard());
  mockGetCreditDash.mockResolvedValue(makeCreditDash());
  mockGetPortfolios.mockResolvedValue([makePortfolio()]);
  mockGetGoals.mockResolvedValue([makeGoal()]);
  mockGetBudgets.mockResolvedValue([makeBudget()]);
}

/** Route the two supabaseAdmin.from() calls: [0] history read, [1..] upsert. */
function setupHistoryDb(historyRows: unknown[] = []) {
  let callCount = 0;
  sb().from.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return chainMock({ data: historyRows, error: null });
    }
    return chainMock({ data: null, error: null });
  });
}

describe("FinancialVitalityScoreService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHappyPathSources();
    setupHistoryDb();
  });

  // ==========================================================================
  // getScoreHistory (unchanged DB mapping — still valid)
  // ==========================================================================
  describe("getScoreHistory", () => {
    it("should return mapped history rows from database", async () => {
      const rows = [
        {
          date: "2026-02-01",
          overall: 70,
          credit: 80,
          spending: 85,
          savings: 70,
          debt: 50,
          investments: 75,
        },
        {
          date: "2026-02-02",
          overall: 72,
          credit: 81,
          spending: 86,
          savings: 71,
          debt: 51,
          investments: 76,
        },
      ];

      sb().from.mockReturnValue(chainMock({ data: rows, error: null }));

      const result = await vitalityScoreService.getScoreHistory("u1", 30);

      expect(result).toHaveLength(2);
      expect(result[0].overall).toBe(70);
      expect(result[0].credit).toBe(80);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[1].overall).toBe(72);
      expect(sb().from).toHaveBeenCalledWith("vitality_score_history");
    });

    it("should return empty array when data is null", async () => {
      sb().from.mockReturnValue(chainMock({ data: null, error: null }));
      const result = await vitalityScoreService.getScoreHistory("u1");
      expect(result).toEqual([]);
    });

    it("should return empty array on Supabase error (no throw)", async () => {
      sb().from.mockReturnValue(
        chainMock({ data: null, error: { message: "db down" } }),
      );
      const result = await vitalityScoreService.getScoreHistory("u1", 7);
      expect(result).toEqual([]);
    });

    it("should use default days=30 when not specified", async () => {
      const mock = chainMock({ data: [], error: null });
      sb().from.mockReturnValue(mock);
      await vitalityScoreService.getScoreHistory("u1");
      expect(mock.gte).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Component sourcing — each score derives from the real source, not a mock
  // ==========================================================================
  describe("component scores derive from real per-user data", () => {
    it("computes the credit score from the real average FICO score", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(mockGetCreditDash).toHaveBeenCalledWith("u1");
      expect(result.components.credit.available).toBe(true);
      expect(result.components.credit.score).toBe(EXP_CREDIT);
      expect(result.components.credit.score).not.toBe(82); // removed mock constant
      // Details echo the real source values; bureau sub-factors stay null.
      expect(result.components.credit.details.currentScore).toBe(720);
      expect(result.components.credit.details.scoreChange).toBe(15);
      expect(result.components.credit.details.utilizationRate).toBeNull();
      expect(result.components.credit.details.paymentHistory).toBeNull();
      expect(result.components.credit.trend).toBe("improving"); // scoreChange 15 > 0
    });

    it("normalizes different real FICO scores to different component scores", async () => {
      mockGetCreditDash.mockResolvedValue(makeCreditDash({ averageScore: 580 }));
      const low = await vitalityScoreService.calculateVitalityScore("u1");
      // round((280/550)*100) = 51
      expect(low.components.credit.score).toBe(51);

      mockGetCreditDash.mockResolvedValue(makeCreditDash({ averageScore: 800 }));
      const high = await vitalityScoreService.calculateVitalityScore("u1");
      // round((500/550)*100) = 91
      expect(high.components.credit.score).toBe(91);
    });

    it("computes the spending score from real savings rate, categories, trend, and budgets", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(mockGetDashboard).toHaveBeenCalledWith("u1");
      expect(mockGetBudgets).toHaveBeenCalledWith("u1");
      expect(result.components.spending.available).toBe(true);
      expect(result.components.spending.score).toBe(EXP_SPENDING);
      expect(result.components.spending.score).not.toBe(89);
      expect(result.components.spending.details.savingsRate).toBe(20);
      // Rent 1500 of 2000 total → 0.75 necessary ratio.
      expect(result.components.spending.details.necessaryVsDiscretionary).toBe(
        0.75,
      );
      // Budget 700 spent of 600 → adherence round(600/700*100) = 86.
      expect(result.components.spending.details.budgetAdherence).toBe(86);
      // Expenses 4200 → 4000 = -5% month over month.
      expect(result.components.spending.details.monthlyTrend).toBe(-5);
    });

    it("computes the savings score from real liquid balances, rate, and goal progress", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(mockGetGoals).toHaveBeenCalledWith("u1");
      expect(result.components.savings.available).toBe(true);
      expect(result.components.savings.score).toBe(EXP_SAVINGS);
      expect(result.components.savings.score).not.toBe(74);
      // Only depository balances count as liquid savings.
      expect(result.components.savings.details.totalSavings).toBe(12000);
      // 12000 liquid / 4000 monthly expenses = 3 months.
      expect(result.components.savings.details.emergencyFundMonths).toBe(3);
      expect(result.components.savings.details.savingsGoalProgress).toBe(65);
    });

    it("computes the investments score from real holdings and sector diversification", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(mockGetPortfolios).toHaveBeenCalledWith("u1");
      expect(result.components.investments.available).toBe(true);
      expect(result.components.investments.score).toBe(EXP_INVESTMENTS);
      expect(result.components.investments.score).not.toBe(78);
      expect(result.components.investments.details.portfolioValue).toBe(2200);
      // 700 gain / 1500 cost basis = 46.7% aggregate return.
      expect(result.components.investments.details.ytdReturn).toBe(46.7);
      // Two sectors (0.68/0.32 split) → HHI diversification 43.
      expect(result.components.investments.details.diversificationScore).toBe(43);
      // Factors we do not track stay null — never fabricated.
      expect(result.components.investments.details.riskAdjustedReturn).toBeNull();
      expect(result.components.investments.details.contributionRate).toBeNull();
    });

    it("marks the debt component unavailable but surfaces the real total liability", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Debt formula needs inputs the schema lacks → honestly excluded.
      expect(result.components.debt.available).toBe(false);
      expect(result.components.debt.grade).toBeNull();
      expect(result.components.debt.details.totalDebt).toBe(10000); // real, informational
      expect(result.components.debt.details.debtToIncomeRatio).toBeNull();
      expect(result.components.debt.details.highInterestDebt).toBeNull();
    });
  });

  // ==========================================================================
  // Weighted overall — renormalized over only the available components
  // ==========================================================================
  describe("overall score renormalization", () => {
    it("weights only the available components and renormalizes (debt excluded)", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");

      const c = result.components;
      // Debt is excluded, so the divisor is the sum of the OTHER weights (0.8),
      // not the full 1.0 — this is the renormalization under test.
      const expected = Math.round(
        (c.credit.score * 0.25 +
          c.spending.score * 0.2 +
          c.savings.score * 0.2 +
          c.investments.score * 0.15) /
          0.8,
      );
      expect(result.overall).toBe(expected);
      expect(result.overall).toBe(EXP_OVERALL);
      expect(result.overall).not.toBe(75); // removed mock overall
      expect(result.grade).toBe("B"); // 80 → B
    });

    it("renormalizes to a single component when only credit has real data", async () => {
      // No financial dashboard, no portfolios → spending/savings/debt/investments
      // are all unavailable; only credit remains.
      mockGetDashboard.mockResolvedValue(null);
      mockGetPortfolios.mockResolvedValue([]);
      mockGetGoals.mockResolvedValue([]);
      mockGetBudgets.mockResolvedValue([]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.components.credit.available).toBe(true);
      expect(result.components.spending.available).toBe(false);
      expect(result.components.savings.available).toBe(false);
      expect(result.components.investments.available).toBe(false);
      // Renormalized over credit's weight alone → overall equals the credit score.
      expect(result.overall).toBe(result.components.credit.score);
      expect(result.overall).toBe(EXP_CREDIT);
    });

    it("returns null overall/grade and does NOT save history when no component has data", async () => {
      mockGetCreditDash.mockResolvedValue(makeCreditDash({ averageScore: 0 }));
      mockGetDashboard.mockResolvedValue(null);
      mockGetPortfolios.mockResolvedValue([]);
      mockGetGoals.mockResolvedValue([]);
      mockGetBudgets.mockResolvedValue([]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.overall).toBeNull();
      expect(result.grade).toBeNull();
      // Only the history READ happened; nothing was upserted (no real score).
      expect(sb().from).toHaveBeenCalledTimes(1);
    });

    it("degrades a component to unavailable (not fabricated) when its source throws", async () => {
      mockGetCreditDash.mockRejectedValue(new Error("credit service down"));

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.components.credit.available).toBe(false);
      expect(result.components.credit.details.currentScore).toBeNull();
      // The remaining real components still produce an honest overall.
      expect(result.overall).not.toBeNull();
    });

    it("never returns a percentile (no cross-user benchmark data)", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.percentile).toBeNull();
    });
  });

  // ==========================================================================
  // Weights, grades, milestone, lastUpdated
  // ==========================================================================
  describe("assembly", () => {
    it("assigns the nominal design weights to every component", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.components.credit.weight).toBe(0.25);
      expect(result.components.spending.weight).toBe(0.2);
      expect(result.components.savings.weight).toBe(0.2);
      expect(result.components.debt.weight).toBe(0.2);
      expect(result.components.investments.weight).toBe(0.15);
    });

    it("assigns component grades from the real component scores", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.components.credit.grade).toBe("C"); // 76 → C (70-79)
      expect(result.components.spending.grade).toBe("A"); // 94 → A (>=90)
      expect(result.components.savings.grade).toBe("B"); // 81 → B (80-89)
      expect(result.components.investments.grade).toBe("D"); // 69 → D (60-69)
    });

    it("returns the next milestone above the real overall score", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      // Overall 80 → next milestone target 90 ("Financial Champion").
      expect(result.nextMilestone.target).toBe(90);
      expect(result.nextMilestone.description).toBe("Financial Champion");
    });

    it("sets lastUpdated to a recent Date", async () => {
      const before = Date.now();
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const after = Date.now();
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.lastUpdated.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.lastUpdated.getTime()).toBeLessThanOrEqual(after);
    });

    it("saves the real component scores to history (unavailable debt persisted as null, never a fabricated 0)", async () => {
      const upsertMock = chainMock({ data: null, error: null });
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainMock({ data: [], error: null });
        return upsertMock;
      });

      await vitalityScoreService.calculateVitalityScore("u1");

      expect(upsertMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          overall: EXP_OVERALL,
          credit: EXP_CREDIT,
          spending: EXP_SPENDING,
          savings: EXP_SAVINGS,
          debt: null, // unavailable → persisted as null, never a fabricated 0
          investments: EXP_INVESTMENTS,
        }),
        { onConflict: "user_id,date" },
      );
    });
  });

  // ==========================================================================
  // Quick wins — fire ONLY on real, observable data (never on null factors)
  // ==========================================================================
  describe("quick wins", () => {
    it("suggests building an emergency fund when real coverage is under 3 months", async () => {
      // 12000 liquid / 5000 monthly expenses = 2.4 months (< 3).
      mockGetDashboard.mockResolvedValue(
        makeDashboard({ monthlyExpenses: 5000 }),
      );
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const win = result.quickWins.find((w) => w.id === "emergency-fund");
      expect(win).toBeDefined();
      expect(win!.category).toBe("savings");
    });

    it("suggests sticking to the budget when real adherence is under 80%", async () => {
      // 1200 spent of 600 → adherence 50%.
      mockGetBudgets.mockResolvedValue([
        makeBudget({ amount: 600, spent: 1200, remaining: -600 }),
      ]);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const win = result.quickWins.find((w) => w.id === "track-spending");
      expect(win).toBeDefined();
      expect(win!.category).toBe("spending");
    });

    it("never fires wins keyed on the null (unfabricated) factors", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      // utilizationRate / highInterestDebt / contributionRate are always null
      // now, so their quick wins must never appear.
      expect(
        result.quickWins.find((w) => w.id === "lower-utilization"),
      ).toBeUndefined();
      expect(
        result.quickWins.find((w) => w.id === "pay-high-interest"),
      ).toBeUndefined();
      expect(
        result.quickWins.find((w) => w.id === "increase-contributions"),
      ).toBeUndefined();
    });

    it("caps quick wins at five", async () => {
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.quickWins.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // Scoring bands — the score tracks the real inputs across every band
  // ==========================================================================
  describe("scores track varied real inputs across every band", () => {
    function monthlyTrend(prevExpenses: number, currExpenses: number) {
      return [
        { month: "Jan 2026", income: 5000, expenses: prevExpenses, savings: 0 },
        { month: "Feb 2026", income: 5000, expenses: currExpenses, savings: 0 },
      ];
    }

    it("degrades every component to unavailable when all sources fail (null overall)", async () => {
      mockGetCreditDash.mockRejectedValue(new Error("credit down"));
      mockGetDashboard.mockRejectedValue(new Error("financial down"));
      mockGetPortfolios.mockRejectedValue(new Error("portfolios down"));
      mockGetGoals.mockRejectedValue(new Error("goals down"));
      mockGetBudgets.mockRejectedValue(new Error("budgets down"));

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.components.credit.available).toBe(false);
      expect(result.components.spending.available).toBe(false);
      expect(result.components.savings.available).toBe(false);
      expect(result.components.investments.available).toBe(false);
      expect(result.overall).toBeNull();
    });

    it("echoes a weak financial profile through the low bands", async () => {
      mockGetDashboard.mockResolvedValue(
        makeDashboard({
          savingsRate: 3, // spending & savings rate → lowest bands
          monthlyExpenses: 4000,
          accounts: [makeAccount("depository", 2000)], // 0.5 months coverage
          spendingByCategory: [
            { category: "Rent", amount: 400, percentage: 40, transactionCount: 1 },
            { category: "Dining", amount: 600, percentage: 60, transactionCount: 3 },
          ], // 0.4 necessary ratio → lowest necessary band
          monthlyTrend: monthlyTrend(4000, 4400), // +10% → worst trend band
        }),
      );
      mockGetBudgets.mockResolvedValue([]); // no budgets → adherence factor dropped
      mockGetGoals.mockResolvedValue([
        makeGoal({ type: "savings", progress: 30 }), // exercises the goal `??` fallback
      ]);
      mockGetPortfolios.mockResolvedValue([
        makePortfolio({
          holdings: [
            {
              symbol: "AAPL",
              shares: 10,
              costBasis: 1500,
              currentPrice: 120,
              currentValue: 1200,
              sector: "Technology",
            },
          ], // single sector → 0 diversification
          totalValue: 1200,
          totalCostBasis: 1500,
          totalGainLoss: -300, // -20% → worst performance band
        }),
      ]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const c = result.components;

      expect(c.spending.details.savingsRate).toBe(3);
      expect(c.spending.details.necessaryVsDiscretionary).toBe(0.4);
      expect(c.spending.details.monthlyTrend).toBe(10);
      expect(c.spending.details.budgetAdherence).toBeNull(); // dropped, not fabricated
      expect(c.savings.details.emergencyFundMonths).toBe(0.5);
      expect(c.savings.details.savingsGoalProgress).toBe(30); // from the savings-type goal
      expect(c.investments.details.diversificationScore).toBe(0);
      expect(c.investments.details.ytdReturn).toBe(-20);
      expect(c.investments.trend).toBe("declining");
      expect(result.overall).not.toBeNull();
    });

    it("echoes a mid financial profile through the middle bands", async () => {
      mockGetDashboard.mockResolvedValue(
        makeDashboard({
          savingsRate: 12,
          monthlyExpenses: 4000,
          accounts: [makeAccount("depository", 8000)], // 2 months coverage
          spendingByCategory: [
            { category: "Rent", amount: 600, percentage: 60, transactionCount: 1 },
            { category: "Dining", amount: 400, percentage: 40, transactionCount: 3 },
          ], // 0.6 necessary ratio → middle band
          monthlyTrend: monthlyTrend(4000, 4120), // +3% → middle trend band
        }),
      );
      mockGetPortfolios.mockResolvedValue([
        makePortfolio({ totalCostBasis: 1500, totalGainLoss: 105 }), // +7% → mid perf band
      ]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const c = result.components;

      expect(c.spending.details.savingsRate).toBe(12);
      expect(c.spending.details.necessaryVsDiscretionary).toBe(0.6);
      expect(c.spending.details.monthlyTrend).toBe(3);
      expect(c.savings.details.emergencyFundMonths).toBe(2);
      expect(c.investments.details.ytdReturn).toBe(7);
    });

    it("echoes a strong savings profile through the top bands", async () => {
      mockGetDashboard.mockResolvedValue(
        makeDashboard({
          savingsRate: 17, // spending band 25 / savings band 28
          monthlyExpenses: 4000,
          accounts: [makeAccount("depository", 30000)], // 7.5 months → top emergency band
        }),
      );

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.components.savings.details.emergencyFundMonths).toBe(7.5);
      expect(result.components.savings.details.savingsRate).toBe(17);
    });

    it("places a 5–10% savings rate in its own band", async () => {
      mockGetDashboard.mockResolvedValue(makeDashboard({ savingsRate: 7 }));
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.components.spending.details.savingsRate).toBe(7);
      expect(result.components.spending.available).toBe(true);
    });

    it("scores an investment component that has value but no itemized holdings", async () => {
      mockGetPortfolios.mockResolvedValue([
        makePortfolio({ holdings: [], totalValue: 5000, totalCostBasis: 0, totalGainLoss: 0 }),
      ]);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.components.investments.available).toBe(true);
      expect(result.components.investments.details.portfolioValue).toBe(5000);
      expect(result.components.investments.details.diversificationScore).toBe(0);
      // No cost basis → the return is unknowable → null, never a fabricated 0%.
      expect(result.components.investments.details.ytdReturn).toBeNull();
    });

    it("drops the optional spending factors that have no real data (only savings rate remains)", async () => {
      mockGetDashboard.mockResolvedValue(
        makeDashboard({
          savingsRate: 18,
          spendingByCategory: [], // no categorized spend → necessary ratio null
          monthlyTrend: [], // < 2 months → trend null
        }),
      );
      mockGetBudgets.mockResolvedValue([]); // no budgets → adherence null

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const spending = result.components.spending;
      expect(spending.available).toBe(true);
      expect(spending.details.savingsRate).toBe(18);
      expect(spending.details.necessaryVsDiscretionary).toBeNull();
      expect(spending.details.monthlyTrend).toBeNull();
      expect(spending.details.budgetAdherence).toBeNull();
      expect(spending.trend).toBe("stable"); // no trend data → stable, not fabricated
    });
  });

  // ==========================================================================
  // Overall trend — from stored history (real), independent of components
  // ==========================================================================
  describe("overall trend from history", () => {
    it("is stable with fewer than two history points", async () => {
      setupHistoryDb([]);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.trend).toBe("stable");
      expect(result.trendPercentage).toBe(0);
    });

    it("is stable when the recent and older windows are within tolerance", async () => {
      // 14 points at the same overall → recent avg ≈ older avg → stable.
      const history = Array.from({ length: 14 }, (_v, i) => ({
        date: `2026-02-${String(i + 1).padStart(2, "0")}`,
        overall: 70,
        credit: 70,
        spending: 70,
        savings: 70,
        debt: 70,
        investments: 70,
      }));
      setupHistoryDb(history);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.trend).toBe("stable");
    });

    it("is improving when the recent window exceeds the older window", async () => {
      const history: unknown[] = [];
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-0${i + 1}`,
          overall: 60,
          credit: 60,
          spending: 60,
          savings: 60,
          debt: 60,
          investments: 60,
        });
      }
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-${i + 8}`,
          overall: 80,
          credit: 80,
          spending: 80,
          savings: 80,
          debt: 80,
          investments: 80,
        });
      }
      setupHistoryDb(history);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.trend).toBe("improving");
    });

    it("is declining when the recent window falls below the older window", async () => {
      const history: unknown[] = [];
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-0${i + 1}`,
          overall: 80,
          credit: 80,
          spending: 80,
          savings: 80,
          debt: 80,
          investments: 80,
        });
      }
      for (let i = 0; i < 7; i++) {
        history.push({
          date: `2026-02-${i + 8}`,
          overall: 60,
          credit: 60,
          spending: 60,
          savings: 60,
          debt: 60,
          investments: 60,
        });
      }
      setupHistoryDb(history);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.trend).toBe("declining");
    });

    it("computes the trend percentage from the first and last history points", async () => {
      setupHistoryDb([
        {
          date: "2026-02-01",
          overall: 50,
          credit: 50,
          spending: 50,
          savings: 50,
          debt: 50,
          investments: 50,
        },
        {
          date: "2026-02-15",
          overall: 75,
          credit: 75,
          spending: 75,
          savings: 75,
          debt: 75,
          investments: 75,
        },
      ]);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      // ((75 - 50) / 50) * 100 = 50
      expect(result.trendPercentage).toBe(50);
    });

    it("returns trend percentage 0 when the first stored score is 0", async () => {
      setupHistoryDb([
        {
          date: "2026-02-01",
          overall: 0,
          credit: 0,
          spending: 0,
          savings: 0,
          debt: 0,
          investments: 0,
        },
        {
          date: "2026-02-02",
          overall: 50,
          credit: 50,
          spending: 50,
          savings: 50,
          debt: 50,
          investments: 50,
        },
      ]);
      const result = await vitalityScoreService.calculateVitalityScore("u1");
      expect(result.trendPercentage).toBe(0);
    });
  });

  // ==========================================================================
  // Residual coerce-to-0 laundering paths (review follow-up)
  // Each proves: missing/unavailable real data → null + drop-and-renormalize,
  // NEVER a coerced 0 or a plausible constant.
  // ==========================================================================
  describe("residual coerce-to-0 laundering paths (review follow-up)", () => {
    it("returns the real computed score even when the history WRITE fails (finding 1: no discard to 0)", async () => {
      // History READ succeeds (callCount 1); the history WRITE upsert rejects
      // (callCount 2). The overall is already computed before persistence, so a
      // write failure must be swallowed and the real score still returned — never
      // rejected (which the route's catch-all would launder to healthScore: 0).
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainMock({ data: [], error: null });
        const failing = chainMock({ data: null, error: null });
        failing.upsert = jest.fn(() =>
          Promise.reject(new Error("history write down")),
        );
        return failing;
      });

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      // Real renormalized score preserved, not discarded to null/0.
      expect(result.overall).toBe(EXP_OVERALL);
      expect(result.grade).toBe("B");
      expect(result.components.credit.score).toBe(EXP_CREDIT);
    });

    it("drops the investment performance factor when cost basis is missing (finding 2: renormalize, not a real 0%)", async () => {
      // Two-sector holdings (diversification 43) but no cost basis → the return
      // is unknowable. The performance factor is DROPPED and the score
      // renormalizes over diversification alone: round((43/100*30)/30*100) = 43.
      // The buggy path scored the unknown return as a real 0% (band 15) → 51.
      mockGetPortfolios.mockResolvedValue([
        makePortfolio({ totalCostBasis: 0, totalGainLoss: 0 }),
      ]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const inv = result.components.investments;

      expect(inv.available).toBe(true);
      expect(inv.details.ytdReturn).toBeNull();
      expect(inv.details.diversificationScore).toBe(43);
      expect(inv.score).toBe(43); // diversification-only, renormalized
      expect(inv.score).not.toBe(51); // NOT the coerce-0% (band-15) value
      expect(inv.trend).toBe("stable"); // null return → stable, not fabricated
    });

    it("drops the spending savings-rate factor when income is unobservable (finding 3: sentinel 0 → null)", async () => {
      // monthlyIncome 0 → financial-service emits the savingsRate sentinel 0
      // (unknown). Spending stays available via categories/trend/budgets, but the
      // savings-rate factor is dropped and its detail is null — not scored as a
      // real 0%. Renormalized over necessary(20)+trend(10)+adherence(34.29)/70.
      mockGetDashboard.mockResolvedValue(
        makeDashboard({ monthlyIncome: 0, savingsRate: 0 }),
      );

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const spending = result.components.spending;

      expect(spending.available).toBe(true);
      expect(spending.details.savingsRate).toBeNull(); // sentinel → null, not 0
      expect(spending.details.necessaryVsDiscretionary).toBe(0.75); // real factor kept
      expect(spending.details.budgetAdherence).toBe(86); // real factor kept
      expect(spending.score).toBe(92); // renormalized over the 3 real factors
    });

    it("drops the savings savings-rate factor when income is unobservable (finding 3: sentinel 0 → null)", async () => {
      // Same sentinel; savings stays available via emergency-fund + goal, but the
      // savings-rate factor is dropped. Renormalized over emergency(30)+goal(16.25)/65.
      mockGetDashboard.mockResolvedValue(
        makeDashboard({ monthlyIncome: 0, savingsRate: 0 }),
      );

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const savings = result.components.savings;

      expect(savings.available).toBe(true);
      expect(savings.details.savingsRate).toBeNull(); // sentinel → null, not 0
      expect(savings.details.emergencyFundMonths).toBe(3); // real factor kept
      expect(savings.score).toBe(71); // renormalized over the 2 real factors
      expect(savings.trend).toBe("stable"); // null rate → stable, not fabricated
    });

    it("marks spending unavailable when income is unobservable and no other factor exists (finding 3: no coerced 0)", async () => {
      // Expenses present (component reachable) but no categories, no trend, no
      // budgets, and unobservable income → zero scorable factors → honest
      // unavailable, NEVER score 0 with available: true.
      mockGetDashboard.mockResolvedValue(
        makeDashboard({
          monthlyIncome: 0,
          savingsRate: 0,
          monthlyExpenses: 4000,
          spendingByCategory: [],
          monthlyTrend: [],
        }),
      );
      mockGetBudgets.mockResolvedValue([]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.components.spending.available).toBe(false);
      expect(result.components.spending.score).toBe(0);
      expect(result.components.spending.details.savingsRate).toBeNull();
    });

    it("marks savings unavailable when it has liquid balances but no scorable factor (finding 3: no coerced 0)", async () => {
      // Depository account present (reachable) but no emergency-fund coverage (no
      // expenses), no observable income, and no savings goal → zero scorable
      // factors → honest unavailable, with the real liquid balance still surfaced.
      mockGetDashboard.mockResolvedValue(
        makeDashboard({
          monthlyIncome: 0,
          savingsRate: 0,
          monthlyExpenses: 0,
          accounts: [makeAccount("depository", 5000)],
        }),
      );
      mockGetGoals.mockResolvedValue([]);

      const result = await vitalityScoreService.calculateVitalityScore("u1");
      const savings = result.components.savings;

      expect(savings.available).toBe(false);
      expect(savings.score).toBe(0);
      expect(savings.details.totalSavings).toBe(5000); // real, informational
      expect(savings.details.savingsRate).toBeNull();
    });

    it("persists null (not 0) for a transiently-unavailable component in history (finding 4)", async () => {
      // Credit source throws → credit unavailable THIS run, but the other real
      // components still yield a real overall. History must store credit as null,
      // never a fabricated 0, while overall stays the real renormalized value.
      mockGetCreditDash.mockRejectedValue(new Error("credit service down"));

      const upsertMock = chainMock({ data: null, error: null });
      let callCount = 0;
      sb().from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainMock({ data: [], error: null });
        return upsertMock;
      });

      const result = await vitalityScoreService.calculateVitalityScore("u1");

      expect(result.components.credit.available).toBe(false);
      expect(result.overall).not.toBeNull();
      expect(upsertMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          credit: null, // transiently unavailable → null, never a fabricated 0
          debt: null, // always-unavailable debt likewise null
          overall: result.overall,
        }),
        { onConflict: "user_id,date" },
      );
    });
  });
});
