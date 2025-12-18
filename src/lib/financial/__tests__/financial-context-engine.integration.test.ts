/**
 * Financial Context Engine Integration Tests
 *
 * Comprehensive tests with mocked database, Plaid, and Credit Bureau calls.
 * Tests the complete flow of getFinancialContext() and getEnhancedFinancialContext()
 */

import {
  FinancialContextEngine,
  financialContextEngine,
} from '../financial-context-engine';
import { DEFAULT_CONTEXT_OPTIONS } from '../types/financial-context.types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
          eq: jest.fn(() => ({
            order: jest.fn(),
          })),
          gte: jest.fn(() => ({
            order: jest.fn(),
          })),
          or: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(),
            })),
          })),
        })),
      })),
      insert: jest.fn(),
    })),
  },
}));

// Mock Plaid Service
jest.mock('../plaid-service', () => ({
  plaidService: {
    getAccounts: jest.fn(),
    getTransactions: jest.fn(),
  },
}));

// Mock Credit Bureau Service
jest.mock('@/lib/credit-bureau', () => ({
  CreditBureauService: {
    getCreditReport: jest.fn(),
  },
}));

// Mock Health Score Calculator
jest.mock('../health-score-calculator', () => ({
  healthScoreCalculator: {
    calculateScore: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
import { plaidService } from '../plaid-service';
import { CreditBureauService } from '@/lib/credit-bureau';
import { healthScoreCalculator } from '../health-score-calculator';

// Mock data factories
const createMockUserProfile = (overrides = {}) => ({
  id: 'test-user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  subscription_tier: 'premium',
  created_at: '2024-01-01T00:00:00Z',
  onboarding_completed: true,
  preferences: {
    currency: 'USD',
    timezone: 'America/New_York',
    budget_alert_threshold: 80,
    goal_reminders_enabled: true,
    insight_notifications_enabled: true,
  },
  ...overrides,
});

const createMockPlaidAccount = (overrides = {}) => ({
  id: 'acc-1',
  itemId: 'item-1',
  userId: 'test-user-123',
  accountId: 'plaid-acc-1',
  institutionId: 'ins-1',
  institutionName: 'Test Bank',
  accountName: 'Checking Account',
  accountType: 'depository' as const,
  accountSubtype: 'checking',
  mask: '1234',
  currentBalance: 5000,
  availableBalance: 4500,
  currency: 'USD',
  lastSynced: new Date(),
  createdAt: new Date(),
  ...overrides,
});

const createMockTransaction = (overrides = {}) => ({
  id: 'txn-1',
  accountId: 'plaid-acc-1',
  userId: 'test-user-123',
  transactionId: 'plaid-txn-1',
  date: new Date(),
  amount: 50,
  name: 'Coffee Shop',
  merchantName: 'Starbucks',
  category: ['Food and Drink', 'Coffee'],
  pending: false,
  paymentChannel: 'in_store',
  createdAt: new Date(),
  ...overrides,
});

const createMockBudget = (overrides = {}) => ({
  id: 'budget-1',
  user_id: 'test-user-123',
  category: 'Food and Drink',
  amount: 500,
  spent: 250,
  period: 'monthly',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  status: 'active',
  rollover_enabled: false,
  rollover_amount: 0,
  ...overrides,
});

const createMockGoal = (overrides = {}) => ({
  id: 'goal-1',
  user_id: 'test-user-123',
  type: 'emergency_fund',
  name: 'Emergency Fund',
  description: 'Build 6-month emergency fund',
  target_amount: '10000.00',
  current_amount: '5000.00',
  target_date: '2024-12-31',
  auto_save_enabled: true,
  auto_save_amount: '200.00',
  auto_save_frequency: 'monthly',
  priority: 1,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockHealthScore = (overrides = {}) => ({
  overallScore: 75,
  grade: 'C' as const,
  breakdown: {
    savings: { score: 70, weight: 0.25, status: 'fair' as const, factors: [] },
    debt: { score: 80, weight: 0.25, status: 'good' as const, factors: [] },
    spending: { score: 75, weight: 0.2, status: 'good' as const, factors: [] },
    credit: { score: 72, weight: 0.2, status: 'fair' as const, factors: [] },
    insurance: { score: 70, weight: 0.1, status: 'fair' as const, factors: [] },
  },
  trend: 'stable' as const,
  calculatedAt: new Date(),
  ...overrides,
});

// Helper to setup standard mocks
const setupStandardMocks = () => {
  // Mock supabase profiles query
  const mockSupabaseFrom = supabase.from as jest.Mock;
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createMockUserProfile(),
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'budgets') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [createMockBudget()],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'financial_goals') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [createMockGoal()],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'investment_portfolios') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
    }
    if (table === 'financial_insights') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'recurring_bills') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'financial_alerts') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              or: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    };
  });

  // Mock Plaid service
  (plaidService.getAccounts as jest.Mock).mockResolvedValue([
    createMockPlaidAccount(),
    createMockPlaidAccount({
      accountId: 'plaid-acc-2',
      accountName: 'Savings Account',
      accountType: 'depository',
      accountSubtype: 'savings',
      currentBalance: 10000,
    }),
  ]);

  (plaidService.getTransactions as jest.Mock).mockResolvedValue([
    createMockTransaction(),
    createMockTransaction({
      transactionId: 'txn-2',
      amount: -3000, // Income
      name: 'Paycheck',
      merchantName: 'Employer Inc',
      category: ['Income', 'Paycheck'],
    }),
  ]);

  // Mock Credit Bureau service
  (CreditBureauService.getCreditReport as jest.Mock).mockResolvedValue({
    success: true,
    data: {
      credit_score: 720,
    },
  });

  // Mock Health Score calculator
  (healthScoreCalculator.calculateScore as jest.Mock).mockResolvedValue(
    createMockHealthScore()
  );
};

describe('FinancialContextEngine Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    financialContextEngine.clearAllCaches();
    setupStandardMocks();
  });

  describe('getFinancialContext', () => {
    it('should return complete financial context for a user', async () => {
      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context).toBeDefined();
      expect(context.user).toBeDefined();
      expect(context.user.id).toBe('test-user-123');
      expect(context.accounts).toBeDefined();
      expect(context.transactions).toBeDefined();
      expect(context.budgets).toBeDefined();
      expect(context.goals).toBeDefined();
      expect(context.healthScore).toBeDefined();
    });

    it('should aggregate accounts correctly', async () => {
      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context.accounts.totalAssets).toBeGreaterThan(0);
      expect(context.accounts.netWorth).toBeDefined();
    });

    it('should calculate transactions totals', async () => {
      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context.transactions.totalIncome).toBeDefined();
      expect(context.transactions.totalExpenses).toBeDefined();
      expect(context.transactions.netCashFlow).toBeDefined();
    });

    it('should include health score', async () => {
      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context.healthScore.overallScore).toBe(75);
      expect(context.healthScore.grade).toBe('C');
      expect(context.healthScore.breakdown).toBeDefined();
    });

    it('should include lastUpdated timestamp', async () => {
      const before = new Date();
      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );
      const after = new Date();

      expect(context.lastUpdated).toBeDefined();
      expect(context.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(context.lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('caching behavior', () => {
    it('should cache context and return from cache on subsequent calls', async () => {
      // Clear mocks to get accurate counts
      jest.clearAllMocks();

      // First call
      await financialContextEngine.getFinancialContext('cache-test-user-1');
      const firstCallCount = (plaidService.getAccounts as jest.Mock).mock.calls.length;

      // Second call should use cache
      await financialContextEngine.getFinancialContext('cache-test-user-1');
      const secondCallCount = (plaidService.getAccounts as jest.Mock).mock.calls.length;

      // Plaid should not be called again due to caching
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      jest.clearAllMocks();

      // First call
      await financialContextEngine.getFinancialContext('cache-test-user-2');
      const firstCallCount = (plaidService.getAccounts as jest.Mock).mock.calls.length;

      // Second call with forceRefresh
      await financialContextEngine.getFinancialContext('cache-test-user-2', true);
      const secondCallCount = (plaidService.getAccounts as jest.Mock).mock.calls.length;

      // Plaid should be called again due to forceRefresh
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it('should clear cache for specific user', async () => {
      jest.clearAllMocks();

      await financialContextEngine.getFinancialContext('cache-test-user-3');
      const firstCallCount = (plaidService.getAccounts as jest.Mock).mock.calls.length;

      financialContextEngine.clearCache('cache-test-user-3');

      await financialContextEngine.getFinancialContext('cache-test-user-3');
      const secondCallCount = (plaidService.getAccounts as jest.Mock).mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it('should maintain separate caches for different users', async () => {
      financialContextEngine.clearAllCaches();

      await financialContextEngine.getFinancialContext('user-1');
      await financialContextEngine.getFinancialContext('user-2');

      const stats = financialContextEngine.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toContain('user-1');
      expect(stats.entries).toContain('user-2');
    });
  });

  describe('error handling', () => {
    it('should return empty accounts when Plaid fails', async () => {
      (plaidService.getAccounts as jest.Mock).mockRejectedValue(
        new Error('Plaid API error')
      );

      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context.accounts.checking).toEqual([]);
      expect(context.accounts.savings).toEqual([]);
      expect(context.accounts.totalAssets).toBe(0);
    });

    it('should return empty transactions when Plaid transactions fail', async () => {
      (plaidService.getTransactions as jest.Mock).mockRejectedValue(
        new Error('Transaction fetch error')
      );

      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context.transactions.recentTransactions).toEqual([]);
      expect(context.transactions.totalIncome).toBe(0);
    });

    it('should return zero credit score when Credit Bureau fails', async () => {
      (CreditBureauService.getCreditReport as jest.Mock).mockRejectedValue(
        new Error('Credit Bureau error')
      );

      const context = await financialContextEngine.getFinancialContext(
        'test-user-123'
      );

      expect(context.creditProfile.currentScore).toBe(0);
    });

    it('should throw error when user profile not found', async () => {
      // Create a fresh engine instance to avoid cache issues
      const testEngine = new FinancialContextEngine();

      const mockSupabaseFrom = supabase.from as jest.Mock;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          };
        }
        // Return full mock for other tables
        if (table === 'budgets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'financial_goals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'investment_portfolios') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'financial_insights') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      await expect(
        testEngine.getFinancialContext('non-existent-user')
      ).rejects.toThrow('Failed to fetch user profile');
    });
  });

  describe('getEnhancedFinancialContext', () => {
    it('should return enhanced context with metadata', async () => {
      const context = await financialContextEngine.getEnhancedFinancialContext(
        'test-user-123'
      );

      expect(context.metadata).toBeDefined();
      expect(context.metadata.generatedAt).toBeDefined();
      expect(context.metadata.generationTimeMs).toBeGreaterThanOrEqual(0);
      expect(context.metadata.apiVersion).toBe('2.0.0');
    });

    it('should include data quality metrics', async () => {
      const context = await financialContextEngine.getEnhancedFinancialContext(
        'test-user-123'
      );

      expect(context.dataQuality).toBeDefined();
      expect(context.dataQuality.score).toBeGreaterThanOrEqual(0);
      expect(context.dataQuality.score).toBeLessThanOrEqual(100);
      expect(context.dataQuality.accountsConnected).toBeDefined();
      expect(context.dataQuality.freshness).toBeDefined();
    });

    it('should include monthly summary', async () => {
      const context = await financialContextEngine.getEnhancedFinancialContext(
        'test-user-123'
      );

      expect(context.monthlySummary).toBeDefined();
      expect(context.monthlySummary.income).toBeDefined();
      expect(context.monthlySummary.expenses).toBeDefined();
      expect(context.monthlySummary.savingsRate).toBeDefined();
    });

    it('should respect options to exclude bills', async () => {
      const context = await financialContextEngine.getEnhancedFinancialContext(
        'test-user-123',
        { includeBills: false }
      );

      expect(context.recurringBills).toEqual([]);
    });

    it('should use default options when not specified', async () => {
      const context = await financialContextEngine.getEnhancedFinancialContext(
        'test-user-123'
      );

      // Should include all data by default
      expect(context).toBeDefined();
      expect(context.user).toBeDefined();
      expect(context.accounts).toBeDefined();
    });

    it('should indicate cache status in metadata', async () => {
      financialContextEngine.clearAllCaches();

      // First call - not from cache
      const context1 = await financialContextEngine.getEnhancedFinancialContext(
        'enhanced-cache-test-user'
      );
      // First call builds cache, so fromCache should be false
      expect(context1.metadata.fromCache).toBe(false);

      // Second call - from cache
      const context2 = await financialContextEngine.getEnhancedFinancialContext(
        'enhanced-cache-test-user'
      );
      // Second call should use cache
      expect(context2.metadata.fromCache).toBe(true);
    });
  });

  describe('getFinancialSummary', () => {
    it('should return lightweight summary', async () => {
      const summary = await financialContextEngine.getFinancialSummary(
        'test-user-123'
      );

      expect(summary).toBeDefined();
      expect(summary.netWorth).toBeDefined();
      expect(summary.totalAssets).toBeDefined();
      expect(summary.totalLiabilities).toBeDefined();
      expect(summary.monthlyIncome).toBeDefined();
      expect(summary.monthlyExpenses).toBeDefined();
      expect(summary.healthScore).toBe(75);
      expect(summary.healthGrade).toBe('C');
    });

    it('should calculate savings rate correctly', async () => {
      const summary = await financialContextEngine.getFinancialSummary(
        'test-user-123'
      );

      expect(summary.savingsRate).toBeDefined();
      expect(typeof summary.savingsRate).toBe('number');
    });

    it('should include goal progress', async () => {
      const summary = await financialContextEngine.getFinancialSummary(
        'test-user-123'
      );

      expect(summary.activeGoals).toBeGreaterThanOrEqual(0);
      expect(summary.goalProgress).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should generate context in under 2 seconds', async () => {
      const start = Date.now();
      await financialContextEngine.getFinancialContext('test-user-123');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it('should generate enhanced context in under 2 seconds', async () => {
      const start = Date.now();
      await financialContextEngine.getEnhancedFinancialContext('test-user-123');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it('should return cached context much faster', async () => {
      // Prime the cache
      await financialContextEngine.getFinancialContext('test-user-123');

      const start = Date.now();
      await financialContextEngine.getFinancialContext('test-user-123');
      const duration = Date.now() - start;

      // Cached response should be near-instant
      expect(duration).toBeLessThan(50);
    });
  });
});

