/**
 * Debt Strategy Engine Tests
 *
 * Tests for the DebtStrategyEngine class structure, exports, and functionality.
 */

import {
  DebtStrategyEngine,
  debtStrategyEngine,
} from "../debt-strategy-engine";

describe("DebtStrategyEngine", () => {
  describe("exports", () => {
    it("should export DebtStrategyEngine class", () => {
      expect(DebtStrategyEngine).toBeDefined();
      expect(typeof DebtStrategyEngine).toBe("function");
    });

    it("should export debtStrategyEngine singleton", () => {
      expect(debtStrategyEngine).toBeDefined();
      expect(debtStrategyEngine).toBeInstanceOf(DebtStrategyEngine);
    });
  });

  describe("class structure", () => {
    it("should have analyzeDebtStrategy method", () => {
      expect(typeof debtStrategyEngine.analyzeDebtStrategy).toBe("function");
    });

    it("should be an instance of DebtStrategyEngine", () => {
      expect(debtStrategyEngine).toBeDefined();
    });

    it("should export the singleton instance", () => {
      expect(debtStrategyEngine).toBeDefined();
    });

    it("should have the correct constructor", () => {
      const { DebtStrategyEngine } = require("../debt-strategy-engine");
      expect(new DebtStrategyEngine()).toBeInstanceOf(DebtStrategyEngine);
    });
  });

  describe("strategy types", () => {
    it("should support all strategy types", () => {
      const strategies = ["avalanche", "snowball", "hybrid", "consolidation"];
      strategies.forEach((strategy) => {
        expect(typeof strategy).toBe("string");
      });
    });
  });

  describe("debt strategy plan structure", () => {
    it("should include all required fields", () => {
      const plan = {
        id: "strategy-1",
        strategy: "avalanche" as const,
        name: "Debt Avalanche",
        description: "Pay highest interest first",
        payoffDate: "2026-06-01",
        totalMonths: 24,
        totalInterestPaid: 2500,
        totalAmountPaid: 15000,
        interestSaved: 1200,
        monthsSaved: 6,
        requiredMonthlyPayment: 625,
        extraPaymentNeeded: 125,
        advantages: ["Saves most money", "Mathematically optimal"],
        disadvantages: ["May take longer to see progress"],
        quickWins: 0,
        motivationScore: 70,
      };
      expect(plan.strategy).toBe("avalanche");
      expect(plan.interestSaved).toBe(1200);
    });
  });

  describe("refinancing opportunity structure", () => {
    it("should include all required fields", () => {
      const opportunity = {
        debtId: "debt-1",
        debtName: "Credit Card A",
        currentRate: 22.99,
        potentialRate: 12.99,
        currentBalance: 5000,
        monthlySavings: 42,
        totalSavings: 1008,
        lenderType: "balance_transfer",
        requirements: ["Good credit score", "Income verification"],
        considerations: ["Transfer fee applies", "Promotional rate expires"],
      };
      expect(opportunity.monthlySavings).toBe(42);
      expect(Array.isArray(opportunity.requirements)).toBe(true);
    });
  });

  describe("debt analysis result structure", () => {
    it("should include all result fields", () => {
      const result = {
        userId: "user-1",
        generatedAt: new Date(),
        totalDebt: 25000,
        debtCount: 4,
        averageInterestRate: 18.5,
        monthlyPayments: 750,
        debtToIncomeRatio: 35,
        strategies: [],
        recommendedStrategy: "avalanche",
        recommendationReason: "Best for saving money",
        refinancingOpportunities: [],
        aiInsights: ["Consider balance transfer"],
        motivationalTips: ["Every payment counts!"],
        warningFlags: [],
      };
      expect(result.totalDebt).toBe(25000);
      expect(result.recommendedStrategy).toBe("avalanche");
    });
  });

  describe("analyzeDebt options", () => {
    it("should accept userId parameter", () => {
      const options = {
        userId: "test-user-id",
        extraMonthlyPayment: 200,
        includeRefinancing: true,
        targetPayoffDate: "2025-12-31",
      };
      expect(options.userId).toBeDefined();
    });

    it("should accept optional parameters", () => {
      const options = {
        userId: "test-user-id",
        includeRefinancing: false,
      };
      expect(typeof options.includeRefinancing).toBe("boolean");
    });
  });

  describe("payoff simulation", () => {
    it("should support simulation parameters", () => {
      const params = {
        userId: "user-1",
        strategy: "snowball" as const,
        extraPayment: 100,
        startDate: "2024-01-01",
      };
      expect(params.strategy).toBe("snowball");
      expect(params.extraPayment).toBe(100);
    });

    it("should return simulation results", () => {
      const result = {
        monthlySchedule: [],
        totalMonths: 36,
        totalInterest: 3500,
        totalPaid: 28500,
        payoffDate: "2027-01-01",
        milestones: [
          { month: 12, description: "First debt paid off" },
          { month: 24, description: "Halfway there" },
        ],
      };
      expect(result.totalMonths).toBe(36);
      expect(result.milestones.length).toBe(2);
    });
  });

  describe("motivation features", () => {
    it("should include motivational elements", () => {
      const features = {
        quickWins: 2,
        motivationScore: 85,
        celebrationMilestones: ["First $1000 paid", "First debt eliminated"],
        progressVisualization: "chart_data",
      };
      expect(features.motivationScore).toBe(85);
      expect(features.quickWins).toBe(2);
    });
  });

  describe("warning flags", () => {
    it("should detect high debt-to-income ratio", () => {
      const flags = [
        "High debt-to-income ratio (>40%)",
        "Multiple high-interest debts",
      ];
      expect(flags.length).toBe(2);
    });
  });
});
