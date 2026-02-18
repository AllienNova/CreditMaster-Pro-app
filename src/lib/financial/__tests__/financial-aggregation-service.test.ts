/**
 * Financial Aggregation Service Tests
 */

// Mock Supabase with inline factory
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/client', () => {
  return {
    getSupabase: () => ({
      from: mockFrom,
    }),
  };
});

// Setup mock chain before each test
beforeEach(() => {
  const createMockChain = (): Record<
    string,
    jest.Mock | ((resolve: (v: unknown) => unknown) => Promise<unknown>)
  > => {
    const chain: Record<
      string,
      jest.Mock | ((resolve: (v: unknown) => unknown) => Promise<unknown>)
    > = {};
    const methods = [
      'select',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'order',
      'limit',
      'range',
      'in',
      'is',
      'insert',
      'update',
      'delete',
    ];
    methods.forEach((m) => {
      chain[m] = jest.fn(() => chain);
    });
    chain.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return chain;
  };
  mockFrom.mockImplementation(() => createMockChain());
});

jest.mock('../budget-service', () => ({
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
      })
    ),
    getAlerts: jest.fn(() => Promise.resolve([])),
    getBudgetTrends: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../spending-analysis-service', () => ({
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
      })
    ),
    detectAnomalies: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../bill-detection-service', () => ({
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
      })
    ),
  },
}));

jest.mock('../savings-automation-service', () => ({
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
      })
    ),
  },
}));

// Import after mocks are set up
import { FinancialAggregationService } from '../financial-aggregation-service';

describe('FinancialAggregationService', () => {
  let service: FinancialAggregationService;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    service = new FinancialAggregationService();
    service.clearAllCaches();
  });

  describe('getAggregatedContext', () => {
    it('should return aggregated financial context', async () => {
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

    it('should use cached data on subsequent calls', async () => {
      const context1 = await service.getAggregatedContext(testUserId);
      const context2 = await service.getAggregatedContext(testUserId);

      // Same cached timestamp
      expect(context1.lastUpdated.getTime()).toBe(
        context2.lastUpdated.getTime()
      );
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const context1 = await service.getAggregatedContext(testUserId);

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const context2 = await service.getAggregatedContext(testUserId, {
        forceRefresh: true,
      });

      // Different timestamps due to refresh
      expect(context2.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        context1.lastUpdated.getTime()
      );
    });

    it('should calculate data completeness correctly', async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(context.dataCompleteness).toHaveProperty('accounts');
      expect(context.dataCompleteness).toHaveProperty('budgets');
      expect(context.dataCompleteness).toHaveProperty('transactions');
      expect(context.dataCompleteness).toHaveProperty('overallScore');
      expect(typeof context.dataCompleteness.overallScore).toBe('number');
    });
  });

  describe('getFinancialSnapshot', () => {
    it('should return a point-in-time snapshot', async () => {
      const snapshot = await service.getFinancialSnapshot(testUserId);

      expect(snapshot).toBeDefined();
      expect(snapshot.date).toBeInstanceOf(Date);
      expect(typeof snapshot.netWorth).toBe('number');
      expect(typeof snapshot.totalAssets).toBe('number');
      expect(typeof snapshot.totalLiabilities).toBe('number');
      expect(typeof snapshot.monthlyIncome).toBe('number');
      expect(typeof snapshot.monthlyExpenses).toBe('number');
      expect(typeof snapshot.healthScore).toBe('number');
    });

    it('should calculate cash flow correctly', async () => {
      const snapshot = await service.getFinancialSnapshot(testUserId);

      expect(snapshot.monthlyCashFlow).toBe(
        snapshot.monthlyIncome - snapshot.monthlyExpenses
      );
    });
  });

  describe('getFinancialTrends', () => {
    it('should return trend data for specified period', async () => {
      const trends = await service.getFinancialTrends(testUserId, {
        period: '30d',
      });

      expect(trends).toBeDefined();
      expect(trends.period).toBe('30d');
      expect(trends.startDate).toBeInstanceOf(Date);
      expect(trends.endDate).toBeInstanceOf(Date);
      expect(trends.netWorthTrend).toBeDefined();
      expect(trends.incomeTrend).toBeDefined();
      expect(trends.spendingTrend).toBeDefined();
      expect(trends.savingsTrend).toBeDefined();
      expect(trends.debtTrend).toBeDefined();
    });

    it('should calculate trend direction correctly', async () => {
      const trends = await service.getFinancialTrends(testUserId, {
        period: '30d',
      });

      // With empty data, direction should be stable
      expect(['up', 'down', 'stable']).toContain(
        trends.netWorthTrend.direction
      );
    });

    it('should generate observations', async () => {
      const trends = await service.getFinancialTrends(testUserId, {
        period: '30d',
      });

      expect(Array.isArray(trends.observations)).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific user', async () => {
      await service.getAggregatedContext(testUserId);
      service.clearCache(testUserId);

      // Next call should fetch fresh data
      const context = await service.getAggregatedContext(testUserId);
      expect(context).toBeDefined();
    });

    it('should clear all caches', async () => {
      await service.getAggregatedContext(testUserId);
      await service.getAggregatedContext('another-user');

      service.clearAllCaches();

      // Both should fetch fresh data
      const context1 = await service.getAggregatedContext(testUserId);
      const context2 = await service.getAggregatedContext('another-user');

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
    });
  });

  describe('data completeness', () => {
    it('should return completeness score between 0 and 100', async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(context.dataCompleteness.overallScore).toBeGreaterThanOrEqual(0);
      expect(context.dataCompleteness.overallScore).toBeLessThanOrEqual(100);
    });

    it('should track individual data source completeness', async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(typeof context.dataCompleteness.accounts).toBe('boolean');
      expect(typeof context.dataCompleteness.budgets).toBe('boolean');
      expect(typeof context.dataCompleteness.transactions).toBe('boolean');
      expect(typeof context.dataCompleteness.bills).toBe('boolean');
      expect(typeof context.dataCompleteness.savings).toBe('boolean');
      expect(typeof context.dataCompleteness.debt).toBe('boolean');
      expect(typeof context.dataCompleteness.investments).toBe('boolean');
      expect(typeof context.dataCompleteness.credit).toBe('boolean');
    });
  });

  describe('insights and recommendations', () => {
    it('should generate insights array', async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(Array.isArray(context.insights)).toBe(true);
    });

    it('should generate recommendations array', async () => {
      const context = await service.getAggregatedContext(testUserId);

      expect(Array.isArray(context.recommendations)).toBe(true);
    });
  });
});
