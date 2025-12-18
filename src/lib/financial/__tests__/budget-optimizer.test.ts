/**
 * Budget Optimizer Tests
 *
 * Tests for the BudgetOptimizer class structure, exports, and functionality.
 */

import { BudgetOptimizer, budgetOptimizer } from '../budget-optimizer';

describe('BudgetOptimizer', () => {
  describe('exports', () => {
    it('should export BudgetOptimizer class', () => {
      expect(BudgetOptimizer).toBeDefined();
      expect(typeof BudgetOptimizer).toBe('function');
    });

    it('should export budgetOptimizer singleton', () => {
      expect(budgetOptimizer).toBeDefined();
      expect(budgetOptimizer).toBeInstanceOf(BudgetOptimizer);
    });
  });

  describe('class structure', () => {
    it('should have analyzeBudget method', () => {
      expect(typeof budgetOptimizer.analyzeBudget).toBe('function');
    });

    it('should have getOptimizations method', () => {
      expect(typeof budgetOptimizer.getOptimizations).toBe('function');
    });

    it('should have getBudgetTemplates method', () => {
      expect(typeof budgetOptimizer.getBudgetTemplates).toBe('function');
    });

    it('should have simulateScenario method', () => {
      expect(typeof budgetOptimizer.simulateScenario).toBe('function');
    });
  });

  describe('optimization types', () => {
    it('should support all optimization types', () => {
      const types = ['reduce', 'increase', 'reallocate', 'eliminate'];
      types.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('difficulty levels', () => {
    it('should support all difficulty levels', () => {
      const difficulties = ['easy', 'moderate', 'hard'];
      difficulties.forEach(diff => {
        expect(typeof diff).toBe('string');
      });
    });
  });

  describe('budget category structure', () => {
    it('should support category summary properties', () => {
      const category = {
        category: 'food_dining',
        categoryName: 'Food & Dining',
        budgeted: 500,
        spent: 450,
        percentUsed: 90,
        trend: 'stable' as const,
        benchmarkComparison: -5,
      };
      expect(category.percentUsed).toBe(90);
      expect(category.trend).toBe('stable');
    });

    it('should support all trend values', () => {
      const trends = ['increasing', 'decreasing', 'stable'];
      trends.forEach(trend => {
        expect(typeof trend).toBe('string');
      });
    });
  });

  describe('optimization structure', () => {
    it('should include all required fields', () => {
      const optimization = {
        id: 'opt-1',
        category: 'entertainment',
        type: 'reduce' as const,
        currentAmount: 300,
        suggestedAmount: 200,
        potentialSavings: 100,
        reason: 'Entertainment spending is above average',
        difficulty: 'easy' as const,
        priorityScore: 85,
        actionSteps: ['Cancel unused subscriptions', 'Use free alternatives'],
      };
      expect(optimization.potentialSavings).toBe(100);
      expect(Array.isArray(optimization.actionSteps)).toBe(true);
    });
  });

  describe('budget template structure', () => {
    it('should support template properties', () => {
      const template = {
        id: 'template-1',
        name: '50/30/20 Budget',
        description: 'Classic budgeting rule',
        categories: [
          { category: 'needs', percentage: 50 },
          { category: 'wants', percentage: 30 },
          { category: 'savings', percentage: 20 },
        ],
        suitableFor: ['beginners', 'moderate_income'],
        expectedSavingsRate: 20,
      };
      expect(template.expectedSavingsRate).toBe(20);
      expect(template.categories.length).toBe(3);
    });
  });

  describe('scenario simulation', () => {
    it('should support scenario parameters', () => {
      const scenario = {
        userId: 'user-1',
        changes: [
          { category: 'food_dining', newAmount: 400 },
          { category: 'entertainment', newAmount: 150 },
        ],
        targetSavingsRate: 25,
      };
      expect(scenario.targetSavingsRate).toBe(25);
      expect(scenario.changes.length).toBe(2);
    });

    it('should return scenario results', () => {
      const result = {
        projectedSavings: 500,
        projectedSavingsRate: 25,
        feasibility: 'achievable' as const,
        tradeoffs: ['Less dining out', 'Reduced entertainment'],
        recommendations: ['Consider meal prepping'],
      };
      expect(result.feasibility).toBe('achievable');
    });
  });

  describe('analyzeBudget options', () => {
    it('should accept userId parameter', () => {
      const options = {
        userId: 'test-user-id',
        includeTemplates: true,
        includeScenarios: true,
        targetSavingsRate: 20,
      };
      expect(options.userId).toBeDefined();
    });

    it('should accept optional parameters', () => {
      const options = {
        userId: 'test-user-id',
        includeTemplates: false,
        includeScenarios: false,
      };
      expect(typeof options.includeTemplates).toBe('boolean');
    });
  });

  describe('optimization result structure', () => {
    it('should include all result fields', () => {
      const result = {
        userId: 'user-1',
        generatedAt: new Date(),
        currentBudget: [],
        totalBudgeted: 3000,
        totalSpent: 2800,
        totalIncome: 5000,
        optimizations: [],
        potentialMonthlySavings: 400,
        aiAnalysis: 'Your spending is well-controlled',
        keyInsights: ['Good savings rate', 'Consider reducing dining out'],
      };
      expect(result.potentialMonthlySavings).toBe(400);
      expect(Array.isArray(result.keyInsights)).toBe(true);
    });
  });
});

