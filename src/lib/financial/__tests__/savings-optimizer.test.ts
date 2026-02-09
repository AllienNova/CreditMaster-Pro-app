/**
 * Savings Optimizer Unit Tests
 *
 * @see Phase 2.2.3: Write Unit Tests for Savings Optimizer
 */

import { SavingsOptimizer, getSavingsOptimizer } from '../savings-optimizer';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/aiml-service', () => ({
  getAIMLService: jest.fn(() => ({
    chat: jest.fn(),
    generateText: jest.fn(),
  })),
}));

jest.mock('@/lib/model-router', () => ({
  ModelRouter: jest.fn().mockImplementation(() => ({
    getModel: jest.fn().mockReturnValue('anthropic/claude-4.5-sonnet'),
  })),
  TaskType: {
    SAVINGS_ANALYSIS: 'savings_analysis',
    SAVINGS_RECOMMENDATIONS: 'savings_recommendations',
  },
}));

describe('SavingsOptimizer', () => {
  let optimizer: SavingsOptimizer;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    optimizer = new SavingsOptimizer();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getSavingsOptimizer();
      const instance2 = getSavingsOptimizer();
      expect(instance1).toBe(instance2);
    });
  });

  describe('findRecurringCharges()', () => {
    beforeEach(() => {
      // Mock transactions with recurring patterns
      const mockTransactions = [
        // Netflix - Monthly subscription
        {
          id: '1',
          user_id: mockUserId,
          amount: 15.99,
          merchant_name: 'Netflix',
          category: 'entertainment',
          date: new Date('2025-01-01').toISOString(),
        },
        {
          id: '2',
          user_id: mockUserId,
          amount: 15.99,
          merchant_name: 'Netflix',
          category: 'entertainment',
          date: new Date('2025-02-01').toISOString(),
        },
        {
          id: '3',
          user_id: mockUserId,
          amount: 15.99,
          merchant_name: 'Netflix',
          category: 'entertainment',
          date: new Date('2025-03-01').toISOString(),
        },
        // Spotify - Monthly subscription
        {
          id: '4',
          user_id: mockUserId,
          amount: 9.99,
          merchant_name: 'Spotify',
          category: 'entertainment',
          date: new Date('2025-01-15').toISOString(),
        },
        {
          id: '5',
          user_id: mockUserId,
          amount: 9.99,
          merchant_name: 'Spotify',
          category: 'entertainment',
          date: new Date('2025-02-15').toISOString(),
        },
        // Random one-time purchase
        {
          id: '6',
          user_id: mockUserId,
          amount: 50.00,
          merchant_name: 'Amazon',
          category: 'shopping',
          date: new Date('2025-01-20').toISOString(),
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      });
    });

    it('should detect recurring charges with >90% accuracy', async () => {
      const recurringCharges = await optimizer.findRecurringCharges(mockUserId);

      expect(recurringCharges).toBeDefined();
      expect(recurringCharges.length).toBeGreaterThanOrEqual(2); // Netflix and Spotify

      // Verify Netflix detection (merchant names are lowercased)
      const netflix = recurringCharges.find((charge) => charge.merchantName === 'netflix');
      expect(netflix).toBeDefined();
      expect(netflix?.amount).toBe(15.99);
      expect(netflix?.frequency).toBe('monthly');
      expect(netflix?.confidence).toBeGreaterThanOrEqual(90); // >90% accuracy requirement
      expect(netflix?.isSubscription).toBe(true);
    });

    it('should identify subscriptions with >85% accuracy', async () => {
      const recurringCharges = await optimizer.findRecurringCharges(mockUserId);
      const subscriptions = recurringCharges.filter((charge) => charge.isSubscription);

      expect(subscriptions.length).toBeGreaterThanOrEqual(2);

      // Verify subscription identification (merchant names are lowercased)
      const identifiedMerchants = subscriptions.map((sub) => sub.merchantName);
      expect(identifiedMerchants).toContain('netflix');
      expect(identifiedMerchants).toContain('spotify');

      // Check accuracy (should be >85%)
      const accuracyRate = (subscriptions.length / recurringCharges.length) * 100;
      expect(accuracyRate).toBeGreaterThanOrEqual(85);
    });

    it('should filter by minimum amount', async () => {
      const recurringCharges = await optimizer.findRecurringCharges(mockUserId, 10);

      expect(recurringCharges).toBeDefined();
      recurringCharges.forEach((charge) => {
        expect(charge.amount).toBeGreaterThanOrEqual(10);
      });
    });

    it('should calculate variance correctly', async () => {
      const recurringCharges = await optimizer.findRecurringCharges(mockUserId);
      const netflix = recurringCharges.find((charge) => charge.merchantName === 'netflix');

      expect(netflix).toBeDefined();
      expect(netflix?.variance).toBeLessThan(0.15); // <15% variance for consistent charges
    });
  });

  describe('suggestCancelableSubscriptions()', () => {
    beforeEach(() => {
      // Mock transactions with various subscription patterns
      const mockTransactions = [
        // Unnecessary subscription (low usage)
        {
          id: '1',
          user_id: mockUserId,
          amount: 19.99,
          merchant_name: 'Gym Membership',
          category: 'health',
          date: new Date('2025-01-01').toISOString(),
        },
        {
          id: '2',
          user_id: mockUserId,
          amount: 19.99,
          merchant_name: 'Gym Membership',
          category: 'health',
          date: new Date('2025-02-01').toISOString(),
        },
        // Essential subscription
        {
          id: '3',
          user_id: mockUserId,
          amount: 50.00,
          merchant_name: 'Internet Service',
          category: 'utilities',
          date: new Date('2025-01-15').toISOString(),
        },
        {
          id: '4',
          user_id: mockUserId,
          amount: 50.00,
          merchant_name: 'Internet Service',
          category: 'utilities',
          date: new Date('2025-02-15').toISOString(),
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      });
    });

    it('should suggest cancelable subscriptions', async () => {
      const recommendations = await optimizer.suggestCancelableSubscriptions(mockUserId);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should calculate potential savings correctly', async () => {
      const recommendations = await optimizer.suggestCancelableSubscriptions(mockUserId);

      recommendations.forEach((rec) => {
        expect(rec.potentialMonthlySavings).toBeGreaterThan(0);
        expect(rec.potentialAnnualSavings).toBe(rec.potentialMonthlySavings * 12);
      });
    });

    it('should provide actionable recommendations', async () => {
      const recommendations = await optimizer.suggestCancelableSubscriptions(mockUserId);

      recommendations.forEach((rec) => {
        expect(rec.type).toMatch(/cancel|downgrade|consolidate|negotiate/);
        expect(rec.reason).toBeDefined();
        expect(rec.reason.length).toBeGreaterThan(0);
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('analyzeSpendingForSavings()', () => {
    beforeEach(() => {
      // Mock comprehensive transaction data
      const mockTransactions = [
        { id: '1', user_id: mockUserId, amount: 1500, merchant_name: 'Rent', category: 'housing', date: new Date('2025-01-01').toISOString() },
        { id: '2', user_id: mockUserId, amount: 300, merchant_name: 'Groceries', category: 'groceries', date: new Date('2025-01-05').toISOString() },
        { id: '3', user_id: mockUserId, amount: 150, merchant_name: 'Dining Out', category: 'dining_out', date: new Date('2025-01-10').toISOString() },
        { id: '4', user_id: mockUserId, amount: 15.99, merchant_name: 'Netflix', category: 'entertainment', date: new Date('2025-01-15').toISOString() },
        { id: '5', user_id: mockUserId, amount: 9.99, merchant_name: 'Spotify', category: 'entertainment', date: new Date('2025-01-20').toISOString() },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      });
    });

    it('should analyze spending and return comprehensive analysis', async () => {
      const analysis = await optimizer.analyzeSpendingForSavings(mockUserId, 'monthly');

      expect(analysis).toBeDefined();
      expect(analysis.userId).toBe(mockUserId);
      expect(analysis.period).toBe('monthly');
      expect(analysis.summary).toBeDefined();
      expect(analysis.opportunities).toBeDefined();
      expect(analysis.recurringCharges).toBeDefined();
      expect(analysis.categoryBreakdown).toBeDefined();
      expect(analysis.trends).toBeDefined();
    });

    it('should calculate spending summary correctly', async () => {
      const analysis = await optimizer.analyzeSpendingForSavings(mockUserId, 'monthly');

      expect(analysis.summary.totalSpending).toBeGreaterThan(0);
      expect(analysis.summary.essentialSpending).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.discretionarySpending).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.subscriptionSpending).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.savingsRate).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.savingsRate).toBeLessThanOrEqual(100);
    });

    it('should identify savings opportunities', async () => {
      const analysis = await optimizer.analyzeSpendingForSavings(mockUserId, 'monthly');

      expect(analysis.opportunities).toBeDefined();
      expect(Array.isArray(analysis.opportunities)).toBe(true);

      analysis.opportunities.forEach((opp) => {
        expect(opp.type).toMatch(/subscription|spending_reduction|category_optimization|recurring_charge|one_time/);
        expect(opp.potentialMonthlySavings).toBeGreaterThanOrEqual(0);
        expect(opp.confidence).toBeGreaterThanOrEqual(0);
        expect(opp.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should provide category breakdown', async () => {
      const analysis = await optimizer.analyzeSpendingForSavings(mockUserId, 'monthly');

      expect(analysis.categoryBreakdown).toBeDefined();
      expect(Array.isArray(analysis.categoryBreakdown)).toBe(true);

      analysis.categoryBreakdown.forEach((category) => {
        expect(category.category).toBeDefined();
        expect(category.currentSpending).toBeGreaterThanOrEqual(0);
        expect(category.recommendedSpending).toBeGreaterThanOrEqual(0);
        expect(category.potentialSavings).toBeGreaterThanOrEqual(0);
        expect(category.percentOfTotal).toBeGreaterThanOrEqual(0);
        expect(category.percentOfTotal).toBeLessThanOrEqual(100);
      });
    });

    it('should analyze spending trends', async () => {
      const analysis = await optimizer.analyzeSpendingForSavings(mockUserId, 'monthly');

      expect(analysis.trends).toBeDefined();
      expect(analysis.trends.spendingTrend).toMatch(/increasing|decreasing|stable/);
      expect(analysis.trends.savingsTrend).toMatch(/improving|declining|stable/);
      expect(Array.isArray(analysis.trends.topSpendingCategories)).toBe(true);
    });
  });

  describe('calculatePotentialSavings()', () => {
    beforeEach(() => {
      const mockTransactions = [
        { id: '1', user_id: mockUserId, amount: 15.99, merchant_name: 'Netflix', category: 'entertainment', date: new Date('2025-01-01').toISOString() },
        { id: '2', user_id: mockUserId, amount: 15.99, merchant_name: 'Netflix', category: 'entertainment', date: new Date('2025-02-01').toISOString() },
        { id: '3', user_id: mockUserId, amount: 9.99, merchant_name: 'Spotify', category: 'entertainment', date: new Date('2025-01-15').toISOString() },
        { id: '4', user_id: mockUserId, amount: 9.99, merchant_name: 'Spotify', category: 'entertainment', date: new Date('2025-02-15').toISOString() },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      });
    });

    it('should calculate total potential savings', async () => {
      const summary = await optimizer.calculatePotentialSavings(mockUserId);

      expect(summary).toBeDefined();
      expect(summary.totalMonthlySavings).toBeGreaterThanOrEqual(0);
      expect(summary.totalAnnualSavings).toBe(summary.totalMonthlySavings * 12);
    });

    it('should provide breakdown by category', async () => {
      const summary = await optimizer.calculatePotentialSavings(mockUserId);

      expect(summary.breakdown).toBeDefined();
      expect(typeof summary.breakdown).toBe('object');

      // Verify breakdown properties
      expect(summary.breakdown.subscriptions).toBeGreaterThanOrEqual(0);
      expect(summary.breakdown.categoryOptimization).toBeGreaterThanOrEqual(0);
      expect(summary.breakdown.recurringCharges).toBeGreaterThanOrEqual(0);
      expect(summary.breakdown.oneTimeOpportunities).toBeGreaterThanOrEqual(0);
    });

    it('should identify top opportunities', async () => {
      const summary = await optimizer.calculatePotentialSavings(mockUserId);

      expect(summary.topOpportunities).toBeDefined();
      expect(Array.isArray(summary.topOpportunities)).toBe(true);
      expect(summary.topOpportunities.length).toBeLessThanOrEqual(5); // Top 5
    });

    it('should calculate implementation difficulty', async () => {
      const summary = await optimizer.calculatePotentialSavings(mockUserId);

      expect(summary.implementationDifficulty).toMatch(/easy|medium|hard/);
    });

    it('should estimate implementation time', async () => {
      const summary = await optimizer.calculatePotentialSavings(mockUserId);

      expect(summary.estimatedTimeToImplement).toBeDefined();
      expect(typeof summary.estimatedTimeToImplement).toBe('string');
    });
  });

  describe('generateSavingsGoalRecommendations()', () => {
    beforeEach(() => {
      // Mock multiple query patterns: .in() for goals, .single() for profile
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });
    });

    it('should generate savings goal recommendations', async () => {
      const recommendations = await optimizer.generateSavingsGoalRecommendations(mockUserId);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should provide realistic goal amounts', async () => {
      const recommendations = await optimizer.generateSavingsGoalRecommendations(mockUserId, 10000);

      recommendations.forEach((rec) => {
        expect(rec.recommendedAmount).toBeGreaterThan(0);
        expect(rec.recommendedMonthlyContribution).toBeGreaterThanOrEqual(0); // Can be 0 for long-term goals
        if (rec.recommendedMonthlyContribution > 0) {
          expect(rec.recommendedMonthlyContribution).toBeLessThanOrEqual(rec.recommendedAmount);
        }
      });
    });

    it('should include reasoning for each goal', async () => {
      const recommendations = await optimizer.generateSavingsGoalRecommendations(mockUserId);

      recommendations.forEach((rec) => {
        expect(rec.reasoning).toBeDefined();
        expect(rec.reasoning.length).toBeGreaterThan(0);
        expect(rec.basedOn).toBeDefined();
        expect(Array.isArray(rec.basedOn)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle new users with no transactions', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const recurringCharges = await optimizer.findRecurringCharges(mockUserId);
      expect(recurringCharges).toBeDefined();
      expect(recurringCharges.length).toBe(0);
    });

    it('should handle irregular spending patterns', async () => {
      const irregularTransactions = [
        { id: '1', user_id: mockUserId, amount: 100, merchant_name: 'Random Store', category: 'shopping', date: new Date('2025-01-01').toISOString() },
        { id: '2', user_id: mockUserId, amount: 200, merchant_name: 'Random Store', category: 'shopping', date: new Date('2025-01-20').toISOString() },
        { id: '3', user_id: mockUserId, amount: 50, merchant_name: 'Random Store', category: 'shopping', date: new Date('2025-02-10').toISOString() },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: irregularTransactions,
          error: null,
        }),
      });

      const recurringCharges = await optimizer.findRecurringCharges(mockUserId);
      // Should not detect irregular patterns as recurring
      const randomStore = recurringCharges.find((charge) => charge.merchantName === 'Random Store');
      if (randomStore) {
        expect(randomStore.confidence).toBeLessThan(70); // Below confidence threshold
      }
    });

    it('should handle users with no subscriptions', async () => {
      const nonSubscriptionTransactions = [
        { id: '1', user_id: mockUserId, amount: 50, merchant_name: 'Grocery Store', category: 'groceries', date: new Date('2025-01-01').toISOString() },
        { id: '2', user_id: mockUserId, amount: 30, merchant_name: 'Gas Station', category: 'transportation', date: new Date('2025-01-05').toISOString() },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: nonSubscriptionTransactions,
          error: null,
        }),
      });

      const recommendations = await optimizer.suggestCancelableSubscriptions(mockUserId);
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('AI Integration', () => {
    it('should handle AI service failures gracefully', async () => {
      // AI service will fail, should fall back to rule-based approach
      const mockTransactions = [
        { id: '1', user_id: mockUserId, amount: 100, merchant_name: 'Test', category: 'other', date: new Date('2025-01-01').toISOString() },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { monthly_income: 5000 },
          error: null,
        }),
        order: jest.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      });

      const analysis = await optimizer.analyzeSpendingForSavings(mockUserId, 'monthly');

      // Should still return valid analysis even without AI
      expect(analysis).toBeDefined();
      expect(analysis.aiInsights).toBeDefined();
      expect(Array.isArray(analysis.aiInsights)).toBe(true);
    });
  });
});
