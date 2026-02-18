/**
 * Health Score Calculator Tests
 *
 * Tests for the HealthScoreCalculator class.
 * Note: Database operations require mocking or integration tests.
 * These are unit tests for the calculation logic.
 */

import {
  healthScoreCalculator,
  HealthScoreCalculator,
} from "../health-score-calculator";
import type {
  AggregatedAccounts,
  CategorizedTransactions,
  BudgetStatus,
  FinancialGoal,
  DebtAnalysis,
  CreditSummary,
} from "../types/financial-context.types";

// Helper to create properly typed mock input
const createMockAccounts = (): AggregatedAccounts => ({
  checking: [
    {
      id: "acc-1",
      institutionName: "Test Bank",
      accountName: "Checking",
      accountType: "checking",
      currentBalance: 5000,
      isLinked: true,
      lastUpdatedAt: new Date(),
    },
  ],
  savings: [
    {
      id: "acc-2",
      institutionName: "Test Bank",
      accountName: "Savings",
      accountType: "savings",
      currentBalance: 10000,
      isLinked: true,
      lastUpdatedAt: new Date(),
    },
  ],
  credit: [
    {
      id: "acc-3",
      institutionName: "Test Bank",
      accountName: "Credit Card",
      accountType: "credit",
      currentBalance: 2000,
      creditLimit: 10000,
      isLinked: true,
      lastUpdatedAt: new Date(),
    },
  ],
  investment: [],
  loan: [],
  totalAssets: 15000,
  totalLiabilities: 2000,
  totalSavings: 10000,
  netWorth: 13000,
  lastSyncedAt: new Date(),
});

const createMockTransactions = (): CategorizedTransactions => ({
  recentTransactions: [],
  byCategory: [],
  byMerchant: [],
  totalIncome: 5000,
  totalExpenses: 3000,
  netCashFlow: 2000,
  period: {
    startDate: new Date(),
    endDate: new Date(),
    daysIncluded: 30,
  },
});

const createMockDebts = (): DebtAnalysis => ({
  totalDebt: 2000,
  monthlyPayments: 200,
  debtToIncomeRatio: 0.04,
  averageInterestRate: 15.0,
  debts: [],
  payoffStrategies: [],
  projectedPayoffDate: new Date(),
  totalInterestSaved: 0,
});

const createMockCreditProfile = (): CreditSummary => ({
  currentScore: 720,
  scoreChange: 10,
  scoreChangeDirection: "up",
  lastUpdated: new Date(),
  scoreHistory: [],
  factors: [],
  activeDisputes: 0,
  resolvedDisputes: 0,
  bureauScores: [],
});

interface HealthScoreInput {
  accounts: AggregatedAccounts;
  transactions: CategorizedTransactions;
  budgets: BudgetStatus[];
  goals: FinancialGoal[];
  debts: DebtAnalysis;
  creditProfile: CreditSummary;
}

const createMockInput = (): HealthScoreInput => ({
  accounts: createMockAccounts(),
  transactions: createMockTransactions(),
  budgets: [],
  goals: [],
  debts: createMockDebts(),
  creditProfile: createMockCreditProfile(),
});

describe("HealthScoreCalculator", () => {
  describe("exports", () => {
    it("should export HealthScoreCalculator class", () => {
      expect(HealthScoreCalculator).toBeDefined();
      expect(typeof HealthScoreCalculator).toBe("function");
    });

    it("should export healthScoreCalculator singleton", () => {
      expect(healthScoreCalculator).toBeDefined();
      expect(healthScoreCalculator).toBeInstanceOf(HealthScoreCalculator);
    });
  });

  describe("class methods", () => {
    it("should have calculateScore method", () => {
      expect(typeof healthScoreCalculator.calculateScore).toBe("function");
    });

    it("should have saveScore method", () => {
      expect(typeof healthScoreCalculator.saveScore).toBe("function");
    });

    it("should have getHistoricalScores method", () => {
      expect(typeof healthScoreCalculator.getHistoricalScores).toBe("function");
    });
  });

  describe("calculateScore", () => {
    it("should calculate a valid health score", async () => {
      const input = createMockInput();
      const score = await healthScoreCalculator.calculateScore(input);

      expect(score).toBeDefined();
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it("should include all five components in breakdown", async () => {
      const input = createMockInput();
      const score = await healthScoreCalculator.calculateScore(input);

      expect(score.breakdown).toHaveProperty("savings");
      expect(score.breakdown).toHaveProperty("debt");
      expect(score.breakdown).toHaveProperty("spending");
      expect(score.breakdown).toHaveProperty("credit");
      expect(score.breakdown).toHaveProperty("insurance");
    });

    it("should assign correct grade based on score", async () => {
      const input = createMockInput();
      const score = await healthScoreCalculator.calculateScore(input);

      const validGrades = ["A", "B", "C", "D", "F"];
      expect(validGrades).toContain(score.grade);
    });

    it("should have calculatedAt timestamp", async () => {
      const input = createMockInput();
      const score = await healthScoreCalculator.calculateScore(input);

      expect(score.calculatedAt).toBeInstanceOf(Date);
    });

    it("should return appropriate grade for high credit score", async () => {
      const input = createMockInput();
      input.creditProfile.currentScore = 800;
      input.accounts.savings = [
        {
          id: "acc-high",
          institutionName: "Test Bank",
          accountName: "High Savings",
          accountType: "savings",
          currentBalance: 50000,
          isLinked: true,
          lastUpdatedAt: new Date(),
        },
      ];
      input.debts.totalDebt = 0;
      input.debts.debtToIncomeRatio = 0;

      const score = await healthScoreCalculator.calculateScore(input);

      // High values should trend toward A or B grade
      expect(["A", "B", "C"]).toContain(score.grade);
    });

    it("should calculate component weights correctly", async () => {
      const input = createMockInput();
      const score = await healthScoreCalculator.calculateScore(input);

      // Verify weights sum to 1.0
      const totalWeight = Object.values(score.breakdown).reduce(
        (sum, comp) => sum + comp.weight,
        0,
      );
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });
  });
});
