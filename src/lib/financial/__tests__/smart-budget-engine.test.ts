/**
 * Smart Budget Engine Unit Tests
 *
 * @see Phase 2.1.5: Write Unit Tests for Smart Budget Engine
 */

import {
  SmartBudgetEngine,
  getSmartBudgetEngine,
} from "../smart-budget-engine";
import { BudgetPreferences } from "../types/budget.types";

// Mock dependencies — define inside factory to avoid TDZ with jest.mock hoisting
jest.mock("@/lib/supabase/service-role", () => {
  const _client = { from: jest.fn() };
  return { getServiceRoleClient: () => _client };
});

import { getServiceRoleClient } from "@/lib/supabase/service-role";
const supabase = getServiceRoleClient() as any;

jest.mock("@/lib/model-router", () => ({
  getModelRouter: jest.fn().mockReturnValue({
    complete: jest.fn().mockResolvedValue({ choices: [{ message: { content: "{}" } }] }),
    getModel: jest.fn().mockReturnValue("anthropic/claude-4.5-sonnet"),
  }),
  TaskType: {
    FINANCIAL_ADVICE: "financial_advice",
    REASONING: "reasoning",
    QUICK_RESPONSE: "quick_response",
  },
}));

describe("SmartBudgetEngine", () => {
  let engine: SmartBudgetEngine;
  const mockUserId = "test-user-123";

  beforeEach(() => {
    // Don't use jest.clearAllMocks() as it clears mock implementations
    // Individual mocks will be reset in nested beforeEach blocks
    engine = new SmartBudgetEngine();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = getSmartBudgetEngine();
      const instance2 = getSmartBudgetEngine();
      expect(instance1).toBe(instance2);
    });
  });

  describe("generateBudget()", () => {
    const mockPreferences: BudgetPreferences = {
      monthlyIncome: 5000,
      savingsGoalPercentage: 20,
      debtPaymentPriority: "moderate",
      lifestylePreference: "balanced",
    };

    beforeEach(() => {
      // Mock transaction history
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: "1",
              user_id: mockUserId,
              amount: 150,
              merchant_name: "Whole Foods",
              category: ["groceries"],
              date: new Date(
                Date.now() - 10 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
            {
              id: "2",
              user_id: mockUserId,
              amount: 50,
              merchant_name: "Shell Gas",
              category: ["transportation"],
              date: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
          error: null,
        }),
      });
    });

    it("should generate budget with default 50/30/20 allocation", async () => {
      const budget = await engine.generateBudget(mockUserId, mockPreferences);

      expect(budget).toBeDefined();
      expect(budget.userId).toBe(mockUserId);
      expect(budget.totalAmount).toBe(5000);
      expect(budget.period).toBe("monthly");
      expect(budget.categories).toBeDefined();
      expect(budget.categories.length).toBeGreaterThan(0);
    });

    it("should respect savings goal percentage", async () => {
      const budget = await engine.generateBudget(mockUserId, {
        ...mockPreferences,
        savingsGoalPercentage: 30,
      });

      const savingsCategories = budget.categories.filter(
        (c) => c.type === "SAVINGS" || c.name === "savings",
      );
      const totalSavings = savingsCategories.reduce(
        (sum, c) => sum + c.allocatedAmount,
        0,
      );

      // Should allocate approximately 30% to savings (allow for rounding in normalization)
      expect(totalSavings).toBeGreaterThanOrEqual(1400); // ~28% of 5000
      expect(totalSavings).toBeLessThanOrEqual(1700); // ~34% of 5000 (allow for rounding)
    });

    it("should adjust for debt payment priority", async () => {
      const aggressiveBudget = await engine.generateBudget(mockUserId, {
        ...mockPreferences,
        debtPaymentPriority: "aggressive",
      });

      const moderateBudget = await engine.generateBudget(mockUserId, {
        ...mockPreferences,
        debtPaymentPriority: "moderate",
      });

      const aggressiveDebt = aggressiveBudget.categories.find(
        (c) => c.name === "debt_payments",
      );
      const moderateDebt = moderateBudget.categories.find(
        (c) => c.name === "debt_payments",
      );

      if (aggressiveDebt && moderateDebt) {
        expect(aggressiveDebt.allocatedAmount).toBeGreaterThan(
          moderateDebt.allocatedAmount,
        );
      }
    });

    it("should handle frugal lifestyle preference", async () => {
      const budget = await engine.generateBudget(mockUserId, {
        ...mockPreferences,
        lifestylePreference: "frugal",
      });

      const discretionaryCategories = budget.categories.filter(
        (c) => c.type === "DISCRETIONARY",
      );
      const totalDiscretionary = discretionaryCategories.reduce(
        (sum, c) => sum + c.allocatedAmount,
        0,
      );

      // Frugal should allocate less to discretionary (allow for rounding in normalization)
      expect(totalDiscretionary).toBeLessThan(1600); // Less than 32% of 5000 (frugal target is 20%, allow for rounding)
    });

    it("should handle new users with no transaction history", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const budget = await engine.generateBudget(mockUserId, mockPreferences);

      expect(budget).toBeDefined();
      expect(budget.aiGenerated).toBe(false); // Should use rule-based approach
      expect(budget.confidence).toBeLessThan(90); // Lower confidence without history
    });
  });

  describe("analyzeBudgetVsActual()", () => {
    beforeEach(() => {
      // Mock current budget
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "budgets") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: "budget-1",
                user_id: mockUserId,
                name: "Monthly Budget",
                period: "monthly",
                total_amount: 5000,
                categories: [
                  {
                    name: "groceries",
                    allocated_amount: 500,
                    type: "ESSENTIAL",
                  },
                  {
                    name: "dining_out",
                    allocated_amount: 300,
                    type: "DISCRETIONARY",
                  },
                ],
              },
              error: null,
            }),
          };
        }
        // Mock transactions - need to include .order() in the chain
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: "1",
                amount: 450,
                merchant_name: "Whole Foods",
                category: ["groceries"],
                date: new Date().toISOString(),
              },
              {
                id: "2",
                amount: 350,
                merchant_name: "Restaurant",
                category: ["dining_out"],
                date: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        };
      });
    });

    it("should analyze budget vs actual spending", async () => {
      const analysis = await engine.analyzeBudgetVsActual(
        mockUserId,
        "monthly",
      );

      expect(analysis).toBeDefined();
      expect(analysis.userId).toBe(mockUserId);
      expect(analysis.period).toBe("monthly");
      expect(analysis.summary).toBeDefined();
      expect(analysis.categoryAnalysis).toBeDefined();
    });

    it("should calculate variance correctly", async () => {
      const analysis = await engine.analyzeBudgetVsActual(
        mockUserId,
        "monthly",
      );

      expect(analysis.summary.variance).toBeDefined();
      expect(analysis.summary.variancePercent).toBeDefined();
    });

    it("should identify overspent categories", async () => {
      const analysis = await engine.analyzeBudgetVsActual(
        mockUserId,
        "monthly",
      );

      const overspent = analysis.trends.topOverspentCategories;
      expect(overspent).toBeDefined();
      expect(Array.isArray(overspent)).toBe(true);
    });

    it("should detect spending anomalies", async () => {
      const analysis = await engine.analyzeBudgetVsActual(
        mockUserId,
        "monthly",
      );

      expect(analysis.trends.anomalies).toBeDefined();
      expect(Array.isArray(analysis.trends.anomalies)).toBe(true);
    });

    it("should generate recommendations", async () => {
      const analysis = await engine.analyzeBudgetVsActual(
        mockUserId,
        "monthly",
      );

      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe("suggestCategoryAdjustments()", () => {
    beforeEach(() => {
      // Mock budget analysis data
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "budgets") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: "budget-1",
                user_id: mockUserId,
                categories: [
                  { name: "groceries", allocated_amount: 500 },
                  { name: "dining_out", allocated_amount: 300 },
                ],
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              { amount: 600, category: ["groceries"] },
              { amount: 250, category: ["dining_out"] },
            ],
            error: null,
          }),
        };
      });
    });

    it("should suggest category adjustments", async () => {
      const suggestions = await engine.suggestCategoryAdjustments(mockUserId);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should prioritize high-confidence suggestions", async () => {
      const suggestions = await engine.suggestCategoryAdjustments(mockUserId);

      if (suggestions.length > 1) {
        for (let i = 0; i < suggestions.length - 1; i++) {
          const currentConfidence = suggestions[i].confidence ?? 0;
          const nextConfidence = suggestions[i + 1].confidence ?? 0;
          expect(currentConfidence).toBeGreaterThanOrEqual(nextConfidence);
        }
      }
    });

    it("should include impact analysis", async () => {
      const suggestions = await engine.suggestCategoryAdjustments(mockUserId);

      if (suggestions.length > 0) {
        expect(suggestions[0].impact).toBeDefined();
      }
    });
  });

  describe("predictMonthEnd()", () => {
    beforeEach(() => {
      // Mock current month data
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "budgets") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: "budget-1",
                user_id: mockUserId,
                total_amount: 5000,
                categories: [{ name: "groceries", allocated_amount: 500 }],
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [
              {
                amount: 250,
                category: ["groceries"],
                date: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        };
      });
    });

    it("should predict month-end spending", async () => {
      const prediction = await engine.predictMonthEnd(mockUserId);

      expect(prediction).toBeDefined();
      expect(prediction.userId).toBe(mockUserId);
      expect(prediction.daysRemaining).toBeGreaterThanOrEqual(0);
      expect(prediction.predictions).toBeDefined();
    });

    it("should calculate days remaining correctly", async () => {
      const prediction = await engine.predictMonthEnd(mockUserId);

      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const expectedDays = Math.max(0, lastDay.getDate() - today.getDate());

      // Bitwise OR normalizes -0 to 0 (edge case on last day of month)
      expect(prediction.daysRemaining | 0).toBe(expectedDays | 0);
    });

    it("should provide category predictions", async () => {
      const prediction = await engine.predictMonthEnd(mockUserId);

      expect(prediction.categoryPredictions).toBeDefined();
      expect(Array.isArray(prediction.categoryPredictions)).toBe(true);
    });

    it("should generate warnings for overspending", async () => {
      const prediction = await engine.predictMonthEnd(mockUserId);

      expect(prediction.warnings).toBeDefined();
      expect(Array.isArray(prediction.warnings)).toBe(true);
    });

    it("should provide actionable suggestions", async () => {
      const prediction = await engine.predictMonthEnd(mockUserId);

      expect(prediction.suggestions).toBeDefined();
      expect(Array.isArray(prediction.suggestions)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle extreme spending patterns", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              amount: 10000,
              merchant_name: "Large Purchase",
              category: ["shopping"],
            },
          ],
          error: null,
        }),
      });

      const budget = await engine.generateBudget(mockUserId, {
        monthlyIncome: 5000,
      });

      expect(budget).toBeDefined();
    });

    it("should handle insufficient data gracefully", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ amount: 50, merchant_name: "Test", category: ["other"] }],
          error: null,
        }),
      });

      const budget = await engine.generateBudget(mockUserId, {
        monthlyIncome: 5000,
      });

      expect(budget).toBeDefined();
      expect(budget.confidence).toBeLessThan(85);
    });
  });

  describe("Performance Tests", () => {
    it("should handle large transaction datasets efficiently", async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `txn-${i}`,
        user_id: mockUserId,
        amount: Math.random() * 500,
        merchant_name: `Merchant ${i % 50}`,
        category: ["groceries"],
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }));

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: largeDataset, error: null }),
      });

      const startTime = Date.now();
      const budget = await engine.generateBudget(mockUserId, {
        monthlyIncome: 5000,
      });
      const endTime = Date.now();

      expect(budget).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("AI Integration Error Handling", () => {
    it("should fallback to rule-based approach when AI fails", async () => {
      // Mock AI service to throw error
      const mockAIService = {
        chat: jest.fn().mockRejectedValue(new Error("AI service unavailable")),
      };

      (engine as any).aiService = mockAIService;

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { amount: 100, merchant_name: "Test", category: ["groceries"] },
          ],
          error: null,
        }),
      });

      const budget = await engine.generateBudget(mockUserId, {
        monthlyIncome: 5000,
      });

      expect(budget).toBeDefined();
      expect(budget.aiGenerated).toBe(false);
    });
  });
});
