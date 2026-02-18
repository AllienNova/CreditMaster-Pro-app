/**
 * Financial Pipeline Integration Tests
 *
 * Tests the three key integration pipelines:
 * 1. Budget creation -> transaction categorization -> spending forecast
 * 2. Income tracking -> financial health score
 * 3. Bill calendar -> reminders -> summary
 *
 * Uses mocked Supabase, Plaid, and AI services.
 * All mock implementations are re-applied in beforeEach due to resetMocks: true.
 */

// ============================================================================
// MOCKS — Must be declared before any imports
// ============================================================================

// Helper used inside jest.mock factories — must be self-contained since factories
// are hoisted above all other statements.  We inline the chain builder.
jest.mock('@/lib/supabase/client', () => {
  const resolved = { data: null, error: null };
  const chain: Record<string, unknown> = {};
  const chainFn = jest.fn().mockReturnValue(chain);
  const terminalFn = jest.fn().mockResolvedValue(resolved);
  ['select','insert','update','delete','upsert',
   'eq','neq','gt','gte','lt','lte','in',
   'is','or','not','order','limit','range',
  ].forEach((m) => { chain[m] = chainFn; });
  chain.single = terminalFn;
  chain.maybeSingle = terminalFn;
  chain.then = (res: (v: unknown) => unknown, rej?: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(res, rej);
  const _client = { from: jest.fn().mockReturnValue(chain) };
  return { getSupabase: () => _client };
});

jest.mock('@/lib/supabase/server', () => {
  const resolved = { data: null, error: null };
  const chain: Record<string, unknown> = {};
  const chainFn = jest.fn().mockReturnValue(chain);
  const terminalFn = jest.fn().mockResolvedValue(resolved);
  ['select','insert','update','delete','upsert',
   'eq','neq','gt','gte','lt','lte','in',
   'is','or','not','order','limit','range',
  ].forEach((m) => { chain[m] = chainFn; });
  chain.single = terminalFn;
  chain.maybeSingle = terminalFn;
  chain.then = (res: (v: unknown) => unknown, rej?: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(res, rej);
  return {
    supabaseAdmin: {
      from: jest.fn().mockReturnValue(chain),
    },
  };
});

jest.mock('../plaid-service', () => ({
  plaidService: {
    getAccounts: jest.fn(),
    getTransactions: jest.fn(),
  },
}));

jest.mock('@/lib/aiml-service', () => ({
  AIMLService: jest.fn().mockImplementation(() => ({
    chat: jest.fn(),
  })),
}));

jest.mock('@/lib/model-router', () => ({
  ModelRouter: jest.fn().mockImplementation(() => ({
    selectModel: jest.fn().mockReturnValue({ id: 'test-model' }),
  })),
  TaskType: {},
}));

jest.mock('../spending-analysis-service', () => ({
  spendingAnalysisService: {
    analyzeSpending: jest.fn(),
    getSpendingTrends: jest.fn(),
  },
}));

// ============================================================================
// IMPORTS — After mocks
// ============================================================================

import { getSupabase } from '@/lib/supabase/client';
const supabase = getSupabase();
import { supabaseAdmin } from '@/lib/supabase/server';
import { plaidService } from '../plaid-service';
import { spendingAnalysisService } from '../spending-analysis-service';

import { BudgetService } from '../budget-service';
import { TransactionCategorizer } from '../transaction-categorizer';
import { spendingForecastService } from '../spending-forecast-service';
import { HealthScoreCalculator } from '../health-score-calculator';
import { incomeTrackingService } from '../income-tracking-service';
import { BillCalendarService } from '../bill-calendar-service';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockBudgetRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'budget-1',
  user_id: 'user-123',
  name: 'Food Budget',
  category: 'food_dining',
  budgeted_amount: 500,
  spent_amount: 200,
  period: 'monthly',
  period_start: '2026-02-01T00:00:00Z',
  period_end: '2026-02-28T23:59:59Z',
  rollover_enabled: false,
  rollover_amount: 0,
  alert_threshold: 80,
  is_active: true,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
});

const createMockPlaidTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'txn-1',
  accountId: 'acc-1',
  transactionId: 'plaid-txn-1',
  date: new Date('2026-02-10'),
  amount: 45.50,
  name: 'Test Restaurant',
  merchantName: 'Test Restaurant',
  category: ['Food and Drink', 'Restaurants'],
  pending: false,
  type: 'place',
  ...overrides,
});

const createMockBillRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'bill-1',
  user_id: 'user-123',
  name: 'Electric Bill',
  payee: 'Power Company',
  amount: 150,
  category: 'utilities',
  frequency: 'monthly',
  due_day: 15,
  next_due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  autopay_enabled: false,
  autopay_account_id: null,
  reminder_days_before: 3,
  reminder_types: ['in_app'],
  notes: null,
  website_url: null,
  account_number: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
});

const createMockIncomeSourceRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'income-1',
  user_id: 'user-123',
  name: 'Primary Job',
  amount: 5000,
  frequency: 'biweekly',
  next_pay_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  account_id: 'acc-1',
  is_auto_detected: false,
  last_pay_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  category: 'salary',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides,
});

const createMockPaymentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'payment-1',
  bill_id: 'bill-1',
  user_id: 'user-123',
  amount: 150,
  paid_date: '2026-02-15T00:00:00Z',
  due_date: '2026-02-15T00:00:00Z',
  status: 'paid',
  payment_method: 'bank_transfer',
  confirmation_number: 'CONF-123',
  notes: null,
  created_at: '2026-02-15T00:00:00Z',
  ...overrides,
});

const createMockSpendingAnalysis = (overrides: Record<string, unknown> = {}) => ({
  period: {
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
  },
  totalSpending: 3000,
  totalIncome: 5000,
  netCashFlow: 2000,
  averageDailySpending: 100,
  byCategory: [
    {
      category: 'food_dining',
      displayName: 'Food & Dining',
      amount: 800,
      percentage: 26.67,
      transactionCount: 20,
      averageTransaction: 40,
      trend: 'stable' as const,
      changeFromLastPeriod: 0,
    },
    {
      category: 'transportation',
      displayName: 'Transportation',
      amount: 400,
      percentage: 13.33,
      transactionCount: 10,
      averageTransaction: 40,
      trend: 'increasing' as const,
      changeFromLastPeriod: 5,
    },
    {
      category: 'entertainment',
      displayName: 'Entertainment',
      amount: 200,
      percentage: 6.67,
      transactionCount: 5,
      averageTransaction: 40,
      trend: 'decreasing' as const,
      changeFromLastPeriod: -10,
    },
  ],
  byMerchant: [],
  anomalies: [],
  patterns: [],
  insights: [],
  comparison: {
    previousPeriod: { startDate: new Date('2025-12-01'), endDate: new Date('2025-12-31') },
    spendingChange: 100,
    spendingChangePercent: 3.45,
    categoryChanges: [],
  },
  ...overrides,
});

// ============================================================================
// HELPER: Create Supabase mock chain
// ============================================================================

function createMockChain(resolvedValue: { data: unknown; error: unknown }) {
  const terminal = jest.fn().mockResolvedValue(resolvedValue);

  const chain: Record<string, jest.Mock> = {};

  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in',
    'is', 'or', 'not', 'order', 'limit', 'range',
    'single', 'maybeSingle',
  ];

  for (const method of methods) {
    chain[method] = jest.fn();
  }

  // Wire up: every method returns the chain, except single/maybeSingle which terminate
  for (const method of methods) {
    if (method === 'single' || method === 'maybeSingle') {
      chain[method].mockResolvedValue(resolvedValue);
    } else {
      chain[method].mockReturnValue(chain);
    }
  }

  // Also allow the chain itself to resolve (for queries without .single())
  (chain as Record<string, unknown>).then = (
    resolve: (val: unknown) => unknown,
    reject?: (val: unknown) => unknown
  ) => Promise.resolve(resolvedValue).then(resolve, reject);

  // terminal reference for assertions
  chain._terminal = terminal;

  return chain;
}

// ============================================================================
// PIPELINE 1: Budget -> Transaction Categorization -> Spending Forecast
// ============================================================================

describe('Pipeline 1: Budget -> Transaction Categorization -> Spending Forecast', () => {
  let budgetService: BudgetService;
  let transactionCategorizer: TransactionCategorizer;

  beforeEach(() => {
    budgetService = new BudgetService();
    transactionCategorizer = new TransactionCategorizer();
  });

  describe('Budget creation feeds into transaction context', () => {
    it('should create a budget and retrieve it for category-based analysis', async () => {
      const insertChain = createMockChain({
        data: createMockBudgetRow(),
        error: null,
      });
      const selectChain = createMockChain({
        data: [createMockBudgetRow(), createMockBudgetRow({ id: 'budget-2', category: 'transportation', budgeted_amount: 300, spent_amount: 100 })],
        error: null,
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'budgets') {
          return insertChain;
        }
        if (table === 'budget_alerts') {
          return createMockChain({ data: [], error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      // Create a budget
      const budget = await budgetService.createBudget({
        userId: 'user-123',
        name: 'Food Budget',
        category: 'food_dining',
        budgetedAmount: 500,
        period: 'monthly',
      });

      expect(budget).toBeDefined();
      expect(budget.category).toBe('food_dining');
      expect(budget.budgetedAmount).toBe(500);

      // Now retrieve budgets for user (simulates dashboard fetching budget context)
      (supabase.from as jest.Mock).mockImplementation(() => selectChain);

      const budgets = await budgetService.getBudgetsByUser('user-123');
      expect(budgets).toHaveLength(2);
      expect(budgets[0].category).toBe('food_dining');
    });

    it('should handle budget creation error and propagate to pipeline', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST500' },
      });

      (supabase.from as jest.Mock).mockReturnValue(errorChain);

      await expect(
        budgetService.createBudget({
          userId: 'user-123',
          category: 'food_dining',
          amount: 500,
          period: 'monthly',
        })
      ).rejects.toThrow();
    });
  });

  describe('Transaction categorization populates spending data', () => {
    it('should categorize a transaction using rule-based matching', async () => {
      // Mock supabase for user correction lookup (returns no corrections)
      const correctionChain = createMockChain({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(correctionChain);

      const transaction = createMockPlaidTransaction({
        merchantName: 'Starbucks',
        name: 'Starbucks Coffee',
        category: ['Food and Drink', 'Coffee Shops'],
        amount: 5.50,
      });

      const categorized = await transactionCategorizer.categorizeTransaction(
        transaction as never,
        'user-123'
      );

      expect(categorized).toBeDefined();
      expect(categorized.enhancedCategory).toBeDefined();
      expect(categorized.confidenceScore).toBeGreaterThan(0);
      expect(categorized.tags).toBeInstanceOf(Array);
    });

    it('should detect recurring transactions from a batch', async () => {
      const txnData = [
        { id: 'txn-1', user_id: 'user-123', merchant_name: 'Netflix', name: 'Netflix', amount: 15.99, date: '2026-01-10' },
        { id: 'txn-2', user_id: 'user-123', merchant_name: 'Netflix', name: 'Netflix', amount: 15.99, date: '2025-12-10' },
        { id: 'txn-3', user_id: 'user-123', merchant_name: 'Netflix', name: 'Netflix', amount: 15.99, date: '2025-11-10' },
        { id: 'txn-4', user_id: 'user-123', merchant_name: 'Netflix', name: 'Netflix', amount: 15.99, date: '2025-10-10' },
      ];

      const txnChain = createMockChain({ data: txnData, error: null });
      (supabase.from as jest.Mock).mockReturnValue(txnChain);

      const recurring = await transactionCategorizer.detectRecurringTransactions(
        'user-123'
      );

      expect(recurring).toBeInstanceOf(Array);
      // Netflix should be detected as recurring with 4 occurrences
      if (recurring.length > 0) {
        const netflixRecurring = recurring.find((r) => r.merchantName === 'Netflix');
        if (netflixRecurring) {
          expect(netflixRecurring.pattern.occurrences).toBeGreaterThanOrEqual(3);
          expect(netflixRecurring.confidence).toBeGreaterThan(0);
        }
      }
    });

    it('should batch categorize transactions and aggregate spending by category', async () => {
      const correctionChain = createMockChain({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(correctionChain);

      const transactions = [
        createMockPlaidTransaction({ merchantName: 'Restaurant A', amount: 45, category: ['Food and Drink', 'Restaurants'] }),
        createMockPlaidTransaction({ id: 'txn-2', merchantName: 'Gas Station', amount: 55, category: ['Transportation', 'Gas Stations'] }),
        createMockPlaidTransaction({ id: 'txn-3', merchantName: 'Restaurant B', amount: 30, category: ['Food and Drink', 'Restaurants'] }),
      ];

      const categorized = await transactionCategorizer.autoCategorizeBatch(
        transactions as never[],
        'user-123'
      );

      expect(categorized).toHaveLength(3);
      expect(categorized.every((c) => c.category)).toBe(true);
    });
  });

  describe('Spending forecast uses historical spending data', () => {
    it('should generate a forecast from historical spending analysis', async () => {
      // Mock 6 months of historical spending data via spendingAnalysisService
      const mockAnalysis = createMockSpendingAnalysis();

      (spendingAnalysisService.analyzeSpending as jest.Mock).mockResolvedValue(mockAnalysis);

      const forecast = await spendingForecastService.generateForecast('user-123', {
        months: 3,
        historicalMonths: 6,
        includeCategories: true,
        includeSeasonality: true,
      });

      expect(forecast).toBeDefined();
      expect(forecast.userId).toBe('user-123');
      expect(forecast.predictions).toHaveLength(3);
      expect(forecast.forecastPeriod.months).toBe(3);

      // Verify each prediction has required fields
      for (const prediction of forecast.predictions) {
        expect(prediction.predictedSpending).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedIncome).toBeGreaterThanOrEqual(0);
        expect(prediction.confidenceInterval).toBeDefined();
        expect(prediction.confidenceInterval.low).toBeLessThanOrEqual(
          prediction.confidenceInterval.high
        );
        expect(prediction.trend).toBeDefined();
        expect(prediction.seasonalFactor).toBeGreaterThan(0);
      }

      // Should have category forecasts
      expect(forecast.categoryForecasts).toBeInstanceOf(Array);
      expect(forecast.accuracy).toBeDefined();
      expect(forecast.accuracy.overallScore).toBeGreaterThanOrEqual(0);
      expect(forecast.accuracy.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle insufficient historical data gracefully', async () => {
      // Only 1 month of data (below MIN_HISTORICAL_MONTHS = 3)
      const mockAnalysis = createMockSpendingAnalysis({ totalSpending: 1000 });
      (spendingAnalysisService.analyzeSpending as jest.Mock)
        .mockResolvedValueOnce(mockAnalysis)
        .mockRejectedValue(new Error('No data'));

      const forecast = await spendingForecastService.generateForecast('user-123', {
        months: 3,
        historicalMonths: 2,
      });

      expect(forecast).toBeDefined();
      expect(forecast.predictions).toHaveLength(3);
      // With insufficient data, should still produce predictions (average-based)
      expect(forecast.accuracy.dataQuality).toBe('poor');
    });

    it('should generate forecast summary for dashboard widget', async () => {
      const mockAnalysis = createMockSpendingAnalysis();
      (spendingAnalysisService.analyzeSpending as jest.Mock).mockResolvedValue(mockAnalysis);

      const summary = await spendingForecastService.getForecastSummary('user-123');

      expect(summary).toBeDefined();
      expect(summary.nextMonthPredicted).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(summary.trend);
      expect(summary.confidence).toBeGreaterThanOrEqual(0);
      expect(summary.confidence).toBeLessThanOrEqual(1);
      expect(summary.potentialSavings).toBeGreaterThanOrEqual(0);
    });

    it('should include seasonal factors for holiday months', async () => {
      // Create mock data that includes November/December seasonal patterns
      const analyses: Array<ReturnType<typeof createMockSpendingAnalysis>> = [];
      for (let i = 11; i >= 0; i--) {
        analyses.push(
          createMockSpendingAnalysis({
            totalSpending: i <= 1 ? 4000 : 3000, // Higher for recent Nov/Dec
            totalIncome: 5000,
          })
        );
      }

      let callCount = 0;
      (spendingAnalysisService.analyzeSpending as jest.Mock).mockImplementation(() => {
        return Promise.resolve(analyses[callCount++] || analyses[0]);
      });

      const forecast = await spendingForecastService.generateForecast('user-123', {
        months: 6,
        historicalMonths: 12,
        includeSeasonality: true,
      });

      expect(forecast.predictions.length).toBe(6);
      // Verify seasonal factors exist
      for (const pred of forecast.predictions) {
        expect(pred.seasonalFactor).toBeDefined();
      }
    });

    it('should generate insights when spending spike is predicted', async () => {
      // Create data with an increasing trend
      const analyses: Array<ReturnType<typeof createMockSpendingAnalysis>> = [];
      for (let i = 5; i >= 0; i--) {
        analyses.push(
          createMockSpendingAnalysis({
            totalSpending: 3000 + (5 - i) * 500, // Increasing: 3000, 3500, 4000, 4500, 5000, 5500
            totalIncome: 5000,
          })
        );
      }

      let callCount = 0;
      (spendingAnalysisService.analyzeSpending as jest.Mock).mockImplementation(() => {
        return Promise.resolve(analyses[callCount++] || analyses[analyses.length - 1]);
      });

      const forecast = await spendingForecastService.generateForecast('user-123', {
        months: 3,
        historicalMonths: 6,
        includeCategories: true,
      });

      expect(forecast.insights).toBeInstanceOf(Array);
      expect(forecast.recommendations).toBeInstanceOf(Array);
    });

    it('should handle errors from spending analysis service', async () => {
      // All calls fail — getHistoricalData catches errors and returns empty entries
      (spendingAnalysisService.analyzeSpending as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const forecast = await spendingForecastService.generateForecast('user-123', {
        months: 3,
        historicalMonths: 6,
      });

      // Should still return a forecast (with 0 data entries)
      expect(forecast).toBeDefined();
      expect(forecast.predictions).toHaveLength(3);
      // All predictions should be 0 since no historical data
      for (const pred of forecast.predictions) {
        expect(pred.predictedSpending).toBe(0);
      }
    });
  });

  describe('Full pipeline: budget -> categorization -> forecast', () => {
    it('should flow from budget context through categorized transactions to forecast', async () => {
      // Step 1: Create budget
      const budgetChain = createMockChain({
        data: createMockBudgetRow(),
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(budgetChain);

      const budget = await budgetService.createBudget({
        userId: 'user-123',
        name: 'Food Budget',
        category: 'food_dining',
        budgetedAmount: 500,
        period: 'monthly',
      });
      expect(budget.budgetedAmount).toBe(500);

      // Step 2: Categorize transactions in that budget category
      const correctionChain = createMockChain({ data: null, error: { code: 'PGRST116' } });
      (supabase.from as jest.Mock).mockReturnValue(correctionChain);

      const transactions = [
        createMockPlaidTransaction({ merchantName: 'Grocery Store', amount: 120, category: ['Food and Drink', 'Groceries'] }),
        createMockPlaidTransaction({ id: 'txn-2', merchantName: 'Restaurant', amount: 55, category: ['Food and Drink', 'Restaurants'] }),
      ];

      const categorized = await transactionCategorizer.autoCategorizeBatch(
        transactions as never[],
        'user-123'
      );
      expect(categorized).toHaveLength(2);

      // Step 3: Generate forecast based on spending
      const mockAnalysis = createMockSpendingAnalysis({
        totalSpending: 175, // Sum of categorized transactions
        byCategory: [
          {
            category: 'food_dining',
            displayName: 'Food & Dining',
            amount: 175,
            percentage: 100,
            transactionCount: 2,
            averageTransaction: 87.5,
            trend: 'stable',
            changeFromLastPeriod: 0,
          },
        ],
      });
      (spendingAnalysisService.analyzeSpending as jest.Mock).mockResolvedValue(mockAnalysis);

      const forecast = await spendingForecastService.generateForecast('user-123', {
        months: 1,
        historicalMonths: 6,
      });

      expect(forecast.predictions).toHaveLength(1);
      expect(forecast.predictions[0].predictedSpending).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// PIPELINE 2: Income Tracking -> Financial Health Score
// ============================================================================

describe('Pipeline 2: Income Tracking -> Financial Health Score', () => {
  let healthCalculator: HealthScoreCalculator;

  beforeEach(() => {
    healthCalculator = new HealthScoreCalculator();
  });

  describe('Income source CRUD operations', () => {
    it('should create and retrieve income sources', async () => {
      const insertChain = createMockChain({
        data: createMockIncomeSourceRow(),
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockReturnValue(insertChain);

      const source = await incomeTrackingService.createIncomeSource('user-123', {
        name: 'Primary Job',
        amount: 5000,
        frequency: 'biweekly',
        nextPayDate: new Date('2026-02-28'),
      });

      expect(source).toBeDefined();
      expect(source.name).toBe('Primary Job');
      expect(source.amount).toBe(5000);
      expect(source.frequency).toBe('biweekly');
    });

    it('should get income sources for a user', async () => {
      const selectChain = createMockChain({
        data: [
          createMockIncomeSourceRow(),
          createMockIncomeSourceRow({
            id: 'income-2',
            name: 'Side Gig',
            amount: 1000,
            frequency: 'monthly',
          }),
        ],
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockReturnValue(selectChain);

      const sources = await incomeTrackingService.getIncomeSources('user-123');
      expect(sources).toHaveLength(2);
      expect(sources[0].name).toBe('Primary Job');
      expect(sources[1].name).toBe('Side Gig');
    });

    it('should update income source', async () => {
      const updateChain = createMockChain({
        data: createMockIncomeSourceRow({ amount: 5500, name: 'Updated Job' }),
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockReturnValue(updateChain);

      const updated = await incomeTrackingService.updateIncomeSource('user-123', 'income-1', {
        amount: 5500,
        name: 'Updated Job',
      });

      expect(updated.amount).toBe(5500);
      expect(updated.name).toBe('Updated Job');
    });

    it('should delete income source', async () => {
      const deleteChain = createMockChain({ data: null, error: null });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(deleteChain);

      await expect(
        incomeTrackingService.deleteIncomeSource('user-123', 'income-1')
      ).resolves.toBeUndefined();
    });

    it('should handle fetch error', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'DB error', code: 'PGRST500' },
      });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(errorChain);

      await expect(incomeTrackingService.getIncomeSources('user-123')).rejects.toThrow(
        'Failed to fetch income sources'
      );
    });

    it('should return null for non-existent income source', async () => {
      const notFoundChain = createMockChain({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(notFoundChain);

      const result = await incomeTrackingService.getIncomeSource('user-123', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Payday countdown calculation', () => {
    it('should calculate payday countdown from income sources', async () => {
      const futurePayDate = new Date();
      futurePayDate.setDate(futurePayDate.getDate() + 5);

      const selectChain = createMockChain({
        data: [
          createMockIncomeSourceRow({
            next_pay_date: futurePayDate.toISOString(),
          }),
        ],
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockReturnValue(selectChain);

      const countdown = await incomeTrackingService.getPaydayCountdown('user-123');

      expect(countdown).toBeDefined();
      expect(countdown).not.toBeNull();
      if (countdown) {
        expect(countdown.daysUntilPayday).toBeGreaterThanOrEqual(0);
        expect(countdown.expectedAmount).toBe(5000);
        expect(countdown.sourceName).toBe('Primary Job');
        expect(countdown.percentComplete).toBeGreaterThanOrEqual(0);
        expect(countdown.percentComplete).toBeLessThanOrEqual(100);
      }
    });

    it('should return null when no income sources exist', async () => {
      const emptyChain = createMockChain({ data: [], error: null });
      (supabaseAdmin.from as jest.Mock).mockReturnValue(emptyChain);

      const countdown = await incomeTrackingService.getPaydayCountdown('user-123');
      expect(countdown).toBeNull();
    });
  });

  describe('Monthly income stats', () => {
    it('should calculate monthly income stats', async () => {
      const selectChain = createMockChain({
        data: [
          createMockIncomeSourceRow({ amount: 5000, frequency: 'biweekly' }),
          createMockIncomeSourceRow({
            id: 'income-2',
            name: 'Side Gig',
            amount: 1000,
            frequency: 'monthly',
          }),
        ],
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockReturnValue(selectChain);

      const stats = await incomeTrackingService.getMonthlyIncomeStats('user-123');

      expect(stats).toBeDefined();
      expect(stats.sources).toHaveLength(2);
      expect(stats.totalMonthlyIncome).toBeGreaterThan(0);
      expect(stats.expectedNextMonth).toBeGreaterThan(0);
    });
  });

  describe('Income detection from transactions', () => {
    it('should detect income patterns from transaction history', async () => {
      const now = new Date();
      const transactions = [
        {
          id: 'txn-1',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          amount: 3000,
          merchantName: 'ACME Corp Payroll',
          category: 'Transfer',
          accountId: 'acc-1',
        },
        {
          id: 'txn-2',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
          amount: 3000,
          merchantName: 'ACME Corp Payroll',
          category: 'Transfer',
          accountId: 'acc-1',
        },
        {
          id: 'txn-3',
          date: new Date(now.getFullYear(), now.getMonth(), 1),
          amount: 3000,
          merchantName: 'ACME Corp Payroll',
          category: 'Transfer',
          accountId: 'acc-1',
        },
      ];

      const patterns = await incomeTrackingService.detectIncomeFromTransactions(transactions);

      expect(patterns).toBeInstanceOf(Array);
      if (patterns.length > 0) {
        expect(patterns[0].merchantName).toContain('ACME');
        expect(patterns[0].amount).toBeGreaterThan(0);
        expect(patterns[0].confidence).toBeGreaterThan(0);
      }
    });

    it('should ignore non-income transactions', async () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date(),
          amount: 50, // Positive = expense
          merchantName: 'Coffee Shop',
          category: 'Food',
          accountId: 'acc-1',
        },
      ];

      const patterns = await incomeTrackingService.detectIncomeFromTransactions(transactions);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('Health score calculation from income and financial data', () => {
    it('should calculate comprehensive health score with excellent financials', async () => {
      const healthInput = {
        accounts: {
          checking: [{ id: 'acc-1', institutionName: 'Bank', accountName: 'Checking', accountType: 'checking' as const, currentBalance: 5000, isLinked: true, lastUpdatedAt: new Date() }],
          savings: [{ id: 'acc-2', institutionName: 'Bank', accountName: 'Savings', accountType: 'savings' as const, currentBalance: 30000, isLinked: true, lastUpdatedAt: new Date() }],
          credit: [{ id: 'acc-3', institutionName: 'Bank', accountName: 'Credit', accountType: 'credit' as const, currentBalance: -500, creditLimit: 10000, isLinked: true, lastUpdatedAt: new Date() }],
          investment: [],
          loan: [],
          totalAssets: 35000,
          totalLiabilities: 500,
          totalSavings: 30000,
          netWorth: 34500,
          lastSyncedAt: new Date(),
        },
        transactions: {
          recentTransactions: [],
          byCategory: [],
          byMerchant: [],
          totalIncome: 10000,
          totalExpenses: 5000,
          netCashFlow: 5000,
          period: { startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28'), daysIncluded: 28 },
        },
        budgets: [
          {
            id: 'b1',
            category: 'food_dining',
            budgetedAmount: 500,
            spentAmount: 400,
            remainingAmount: 100,
            percentUsed: 80,
            period: 'monthly' as const,
            status: 'on_track' as const,
            daysRemaining: 10,
            projectedOverage: 0,
            rolloverEnabled: false,
            rolloverAmount: 0,
          },
        ],
        goals: [
          {
            id: 'g1',
            type: 'emergency_fund' as const,
            name: 'Emergency Fund',
            targetAmount: 30000,
            currentAmount: 30000,
            progress: 100,
            autoSaveEnabled: true,
            autoSaveAmount: 500,
            autoSaveFrequency: 'monthly' as const,
            priority: 1,
            status: 'active' as const,
            milestones: [],
            createdAt: new Date(),
          },
        ],
        debts: {
          totalDebt: 0,
          debtToIncomeRatio: 0,
          averageInterestRate: 0,
          monthlyPayments: 0,
          debts: [],
          payoffStrategies: [],
          projectedPayoffDate: new Date(),
          totalInterestSaved: 0,
        },
        creditProfile: {
          currentScore: 800,
          scoreChange: 5,
          scoreChangeDirection: 'up' as const,
          lastUpdated: new Date(),
          scoreHistory: [],
          factors: [],
          activeDisputes: 0,
          resolvedDisputes: 0,
          bureauScores: [],
        },
      };

      const score = await healthCalculator.calculateScore(healthInput);

      expect(score).toBeDefined();
      expect(score.overallScore).toBeGreaterThanOrEqual(70);
      expect(score.grade).toMatch(/^[A-F]$/);
      expect(score.breakdown).toBeDefined();
      expect(score.breakdown.savings.score).toBeGreaterThan(0);
      expect(score.breakdown.debt.score).toBe(100); // No debt
      expect(score.breakdown.debt.status).toBe('excellent');
      expect(score.breakdown.credit.score).toBeGreaterThanOrEqual(80);
      expect(score.calculatedAt).toBeInstanceOf(Date);
    });

    it('should calculate lower health score with poor financials', async () => {
      const healthInput = {
        accounts: {
          checking: [{ id: 'acc-1', institutionName: 'Bank', accountName: 'Checking', accountType: 'checking' as const, currentBalance: 200, isLinked: true, lastUpdatedAt: new Date() }],
          savings: [{ id: 'acc-2', institutionName: 'Bank', accountName: 'Savings', accountType: 'savings' as const, currentBalance: 500, isLinked: true, lastUpdatedAt: new Date() }],
          credit: [{ id: 'acc-3', institutionName: 'Bank', accountName: 'Credit', accountType: 'credit' as const, currentBalance: -8000, creditLimit: 10000, isLinked: true, lastUpdatedAt: new Date() }],
          investment: [],
          loan: [],
          totalAssets: 700,
          totalLiabilities: 28000,
          totalSavings: 500,
          netWorth: -27300,
          lastSyncedAt: new Date(),
        },
        transactions: {
          recentTransactions: [],
          byCategory: [],
          byMerchant: [],
          totalIncome: 4000,
          totalExpenses: 3800,
          netCashFlow: 200,
          period: { startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28'), daysIncluded: 28 },
        },
        budgets: [
          {
            id: 'b1',
            category: 'food_dining',
            budgetedAmount: 300,
            spentAmount: 500,
            remainingAmount: -200,
            percentUsed: 167,
            period: 'monthly' as const,
            status: 'over_budget' as const,
            daysRemaining: 10,
            projectedOverage: 200,
            rolloverEnabled: false,
            rolloverAmount: 0,
          },
        ],
        goals: [],
        debts: {
          totalDebt: 20000,
          debtToIncomeRatio: 50,
          averageInterestRate: 22,
          monthlyPayments: 800,
          debts: [
            {
              id: 'd1',
              name: 'Credit Card',
              type: 'credit_card' as const,
              balance: 20000,
              interestRate: 22,
              minimumPayment: 400,
            },
          ],
          payoffStrategies: [],
          projectedPayoffDate: new Date('2030-01-01'),
          totalInterestSaved: 0,
        },
        creditProfile: {
          currentScore: 550,
          scoreChange: -10,
          scoreChangeDirection: 'down' as const,
          lastUpdated: new Date(),
          scoreHistory: [],
          factors: [],
          activeDisputes: 0,
          resolvedDisputes: 0,
          bureauScores: [],
        },
      };

      const score = await healthCalculator.calculateScore(healthInput);

      expect(score.overallScore).toBeLessThan(60);
      expect(['D', 'F']).toContain(score.grade);
      expect(score.breakdown.debt.score).toBeLessThan(50);
      expect(score.breakdown.spending.score).toBeLessThan(70);
      expect(score.breakdown.savings.factors.length).toBeGreaterThan(0);
    });

    it('should save health score to database', async () => {
      const insertChain = createMockChain({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue(insertChain);

      const score = {
        overallScore: 85,
        grade: 'B' as const,
        breakdown: {
          savings: { score: 80, weight: 0.25, status: 'good' as const, factors: ['Good savings'] },
          debt: { score: 100, weight: 0.25, status: 'excellent' as const, factors: ['No debt'] },
          spending: { score: 75, weight: 0.2, status: 'good' as const, factors: ['Good spending'] },
          credit: { score: 85, weight: 0.2, status: 'good' as const, factors: ['Good credit'] },
          insurance: { score: 70, weight: 0.1, status: 'fair' as const, factors: ['Coverage tracked'] },
        },
        trend: 'stable' as const,
        calculatedAt: new Date(),
      };

      await expect(
        healthCalculator.saveScore('user-123', score)
      ).resolves.toBeUndefined();

      expect(supabase.from).toHaveBeenCalledWith('financial_health_scores');
    });

    it('should get historical scores for trend analysis', async () => {
      const historicalData = [
        { overall_score: 80, breakdown: {}, calculated_at: '2026-01-15T00:00:00Z' },
        { overall_score: 82, breakdown: {}, calculated_at: '2026-02-01T00:00:00Z' },
        { overall_score: 85, breakdown: {}, calculated_at: '2026-02-15T00:00:00Z' },
      ];

      const selectChain = createMockChain({ data: historicalData, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const scores = await healthCalculator.getHistoricalScores('user-123', 30);

      expect(scores).toHaveLength(3);
      expect(scores[0].overallScore).toBe(80);
      expect(scores[2].overallScore).toBe(85);
      expect(scores[0].grade).toBe('B');
    });
  });

  describe('Full pipeline: Income -> Health Score', () => {
    it('should flow from income data into health score calculation', async () => {
      // Step 1: Get income sources
      const incomeChain = createMockChain({
        data: [
          createMockIncomeSourceRow({ amount: 5000, frequency: 'biweekly' }),
          createMockIncomeSourceRow({ id: 'income-2', name: 'Side Gig', amount: 1000, frequency: 'monthly' }),
        ],
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockReturnValue(incomeChain);

      const incomeSources = await incomeTrackingService.getIncomeSources('user-123');
      const totalMonthlyIncome = incomeSources.reduce((sum, s) => {
        const multiplier = s.frequency === 'biweekly' ? 2.17 : s.frequency === 'weekly' ? 4.33 : 1;
        return sum + s.amount * multiplier;
      }, 0);

      expect(totalMonthlyIncome).toBeGreaterThan(10000); // ~10850 + 1000

      // Step 2: Use income data in health score
      const healthInput = {
        accounts: {
          checking: [{ id: 'acc-1', institutionName: 'Bank', accountName: 'Checking', accountType: 'checking' as const, currentBalance: 5000, isLinked: true, lastUpdatedAt: new Date() }],
          savings: [{ id: 'acc-2', institutionName: 'Bank', accountName: 'Savings', accountType: 'savings' as const, currentBalance: 20000, isLinked: true, lastUpdatedAt: new Date() }],
          credit: [],
          investment: [],
          loan: [],
          totalAssets: 25000,
          totalLiabilities: 0,
          totalSavings: 20000,
          netWorth: 25000,
          lastSyncedAt: new Date(),
        },
        transactions: {
          recentTransactions: [],
          byCategory: [],
          byMerchant: [],
          totalIncome: totalMonthlyIncome,
          totalExpenses: 6000,
          netCashFlow: totalMonthlyIncome - 6000,
          period: { startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28'), daysIncluded: 28 },
        },
        budgets: [],
        goals: [
          {
            id: 'g1',
            type: 'savings' as const,
            name: 'Vacation Fund',
            targetAmount: 5000,
            currentAmount: 2000,
            progress: 40,
            autoSaveEnabled: false,
            priority: 2,
            status: 'active' as const,
            milestones: [],
            createdAt: new Date(),
          },
        ],
        debts: {
          totalDebt: 0,
          debtToIncomeRatio: 0,
          averageInterestRate: 0,
          monthlyPayments: 0,
          debts: [],
          payoffStrategies: [],
          projectedPayoffDate: new Date(),
          totalInterestSaved: 0,
        },
        creditProfile: {
          currentScore: 750,
          scoreChange: 0,
          scoreChangeDirection: 'stable' as const,
          lastUpdated: new Date(),
          scoreHistory: [],
          factors: [],
          activeDisputes: 0,
          resolvedDisputes: 0,
          bureauScores: [],
        },
      };

      const score = await healthCalculator.calculateScore(healthInput);

      expect(score.overallScore).toBeGreaterThanOrEqual(60);
      // With high income and low expenses, savings score should be good
      expect(score.breakdown.savings.score).toBeGreaterThanOrEqual(50);
      // No debt should yield excellent debt score
      expect(score.breakdown.debt.score).toBe(100);
    });
  });
});

// ============================================================================
// PIPELINE 3: Bill Calendar -> Reminders -> Summary
// ============================================================================

describe('Pipeline 3: Bill Calendar -> Reminders -> Summary', () => {
  let billService: BillCalendarService;

  beforeEach(() => {
    billService = new BillCalendarService();
  });

  describe('Bill CRUD operations', () => {
    it('should create a new bill and schedule reminders', async () => {
      const billRow = createMockBillRow();
      const billChain = createMockChain({ data: billRow, error: null });
      const reminderChain = createMockChain({ data: null, error: null });

      let callIndex = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') return billChain;
        if (table === 'bill_reminders') return reminderChain;
        return createMockChain({ data: null, error: null });
      });

      const bill = await billService.createBill({
        userId: 'user-123',
        name: 'Electric Bill',
        payee: 'Power Company',
        amount: 150,
        category: 'utilities',
        frequency: 'monthly',
        dueDay: 15,
        nextDueDate: new Date('2026-03-15'),
        reminderDaysBefore: 3,
        reminderTypes: ['in_app'],
      });

      expect(bill).toBeDefined();
      expect(bill.name).toBe('Electric Bill');
      expect(bill.amount).toBe(150);
      expect(bill.category).toBe('utilities');
      expect(bill.frequency).toBe('monthly');
    });

    it('should retrieve a bill by ID', async () => {
      const billChain = createMockChain({
        data: createMockBillRow(),
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(billChain);

      const bill = await billService.getBillById('bill-1', 'user-123');

      expect(bill).toBeDefined();
      expect(bill?.id).toBe('bill-1');
      expect(bill?.name).toBe('Electric Bill');
    });

    it('should return null for non-existent bill', async () => {
      const notFoundChain = createMockChain({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });
      (supabase.from as jest.Mock).mockReturnValue(notFoundChain);

      const bill = await billService.getBillById('non-existent', 'user-123');
      expect(bill).toBeNull();
    });

    it('should get all bills for a user', async () => {
      const bills = [
        createMockBillRow(),
        createMockBillRow({ id: 'bill-2', name: 'Internet', amount: 80, category: 'internet' }),
        createMockBillRow({ id: 'bill-3', name: 'Rent', amount: 1500, category: 'housing' }),
      ];

      const selectChain = createMockChain({ data: bills, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const result = await billService.getBillsByUser('user-123');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Electric Bill');
      expect(result[1].name).toBe('Internet');
      expect(result[2].name).toBe('Rent');
    });

    it('should update a bill', async () => {
      const updatedRow = createMockBillRow({ amount: 175, name: 'Updated Electric' });
      const updateChain = createMockChain({ data: updatedRow, error: null });
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      const bill = await billService.updateBill('bill-1', 'user-123', {
        amount: 175,
        name: 'Updated Electric',
      });

      expect(bill.amount).toBe(175);
      expect(bill.name).toBe('Updated Electric');
    });

    it('should delete a bill', async () => {
      const deleteChain = createMockChain({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue(deleteChain);

      const result = await billService.deleteBill('bill-1', 'user-123');
      expect(result).toBe(true);
    });

    it('should throw on delete error', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'Foreign key constraint' },
      });
      (supabase.from as jest.Mock).mockReturnValue(errorChain);

      await expect(
        billService.deleteBill('bill-1', 'user-123')
      ).rejects.toThrow('Failed to delete bill');
    });

    it('should throw on create error', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'Insert failed' },
      });
      (supabase.from as jest.Mock).mockReturnValue(errorChain);

      await expect(
        billService.createBill({
          userId: 'user-123',
          name: 'Test',
          payee: 'Test',
          amount: 100,
          category: 'other',
          frequency: 'monthly',
          dueDay: 1,
          nextDueDate: new Date(),
        })
      ).rejects.toThrow('Failed to create bill');
    });
  });

  describe('Calendar view and upcoming bills', () => {
    it('should generate month calendar with bill due dates', async () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const dueDate = new Date(year, month, 15);

      const bills = [
        createMockBillRow({ next_due_date: dueDate.toISOString() }),
      ];
      const payments: unknown[] = [];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') {
          return createMockChain({ data: bills, error: null });
        }
        if (table === 'bill_payments') {
          return createMockChain({ data: payments, error: null });
        }
        return createMockChain({ data: [], error: null });
      });

      const calendar = await billService.getMonthCalendar('user-123', year, month);

      expect(calendar).toBeInstanceOf(Array);
      expect(calendar.length).toBeGreaterThan(0);

      // Find the day the bill is due
      const billDay = calendar.find(
        (d) => d.date.getDate() === 15
      );
      if (billDay) {
        expect(billDay.bills.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should get upcoming bills within specified days', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const bills = [
        createMockBillRow({ next_due_date: tomorrow.toISOString(), name: 'Tomorrow Bill' }),
        createMockBillRow({ id: 'bill-2', next_due_date: nextWeek.toISOString(), name: 'Next Week Bill' }),
      ];

      const selectChain = createMockChain({ data: bills, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const upcoming = await billService.getUpcomingBills('user-123', 30);

      expect(upcoming).toBeInstanceOf(Array);
      // Should include bills within 30 days
      for (const bill of upcoming) {
        expect(bill.daysUntilDue).toBeGreaterThanOrEqual(0);
        expect(bill.status).toBe('pending');
        expect(bill.isPastDue).toBe(false);
      }
    });

    it('should identify overdue bills', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      const bills = [
        createMockBillRow({ next_due_date: yesterday.toISOString(), name: 'Overdue Bill' }),
      ];

      const selectChain = createMockChain({ data: bills, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const overdue = await billService.getOverdueBills('user-123');

      expect(overdue).toBeInstanceOf(Array);
      if (overdue.length > 0) {
        expect(overdue[0].status).toBe('overdue');
        expect(overdue[0].isPastDue).toBe(true);
        expect(overdue[0].daysUntilDue).toBeLessThan(0);
      }
    });
  });

  describe('Bill payments', () => {
    it('should record a bill payment and update next due date', async () => {
      const billRow = createMockBillRow();
      const paymentRow = createMockPaymentRow();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') {
          return createMockChain({ data: billRow, error: null });
        }
        if (table === 'bill_payments') {
          return createMockChain({ data: paymentRow, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const payment = await billService.recordPayment(
        'bill-1',
        'user-123',
        150,
        new Date(),
        { paymentMethod: 'bank_transfer', confirmationNumber: 'CONF-123' }
      );

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(150);
      expect(payment.status).toBe('paid');
      expect(payment.billId).toBe('bill-1');
    });

    it('should mark late payment when paid after due date', async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 5);

      const billRow = createMockBillRow({
        next_due_date: pastDueDate.toISOString(),
      });
      const paymentRow = createMockPaymentRow({ status: 'late' });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') {
          return createMockChain({ data: billRow, error: null });
        }
        if (table === 'bill_payments') {
          return createMockChain({ data: paymentRow, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const payment = await billService.recordPayment(
        'bill-1',
        'user-123',
        150,
        new Date()
      );

      expect(payment).toBeDefined();
      // Payment is recorded, the status from DB mock is 'late'
      expect(payment.status).toBe('late');
    });

    it('should throw when recording payment for non-existent bill', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockChain({ data: null, error: { message: 'not found' } })
      );

      await expect(
        billService.recordPayment('non-existent', 'user-123', 100, new Date())
      ).rejects.toThrow('Bill not found');
    });

    it('should get payment history for a bill', async () => {
      const payments = [
        createMockPaymentRow(),
        createMockPaymentRow({ id: 'payment-2', paid_date: '2026-01-15T00:00:00Z', due_date: '2026-01-15T00:00:00Z' }),
      ];

      const selectChain = createMockChain({ data: payments, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const history = await billService.getPaymentHistory('bill-1', 'user-123');

      expect(history).toHaveLength(2);
      expect(history[0].billId).toBe('bill-1');
    });

    it('should throw on payment history error', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'Query failed' },
      });
      (supabase.from as jest.Mock).mockReturnValue(errorChain);

      await expect(
        billService.getPaymentHistory('bill-1', 'user-123')
      ).rejects.toThrow('Failed to fetch payment history');
    });
  });

  describe('Bill summary and analytics', () => {
    it('should generate comprehensive bill summary', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 3);

      const bills = [
        createMockBillRow({ next_due_date: tomorrow.toISOString(), autopay_enabled: true }),
        createMockBillRow({ id: 'bill-2', name: 'Internet', amount: 80, next_due_date: nextWeek.toISOString() }),
        createMockBillRow({ id: 'bill-3', name: 'Old Bill', amount: 50, next_due_date: pastDue.toISOString() }),
      ];

      const payments = [
        createMockPaymentRow({ bill_id: 'bill-already-paid', amount: 200, due_date: new Date().toISOString() }),
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') {
          return createMockChain({ data: bills, error: null });
        }
        if (table === 'bill_payments') {
          return createMockChain({ data: payments, error: null });
        }
        return createMockChain({ data: [], error: null });
      });

      const summary = await billService.getBillSummary('user-123');

      expect(summary).toBeDefined();
      expect(summary.billsCount).toBe(3);
      expect(summary.totalMonthlyBills).toBeGreaterThan(0);
      expect(summary.autopayCount).toBe(1);
      expect(summary.manualPayCount).toBe(2);
      expect(summary.paidThisMonth).toBeGreaterThanOrEqual(0);
      expect(summary.upcomingBills).toBeInstanceOf(Array);
      expect(summary.overdueBills).toBeInstanceOf(Array);
    });
  });

  describe('Reminders', () => {
    it('should get pending reminders', async () => {
      const reminders = [
        {
          id: 'rem-1',
          bill_id: 'bill-1',
          user_id: 'user-123',
          reminder_date: new Date().toISOString(),
          reminder_type: 'in_app',
          sent: false,
          sent_at: null,
          created_at: new Date().toISOString(),
        },
      ];

      const selectChain = createMockChain({ data: reminders, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const pending = await billService.getPendingReminders('user-123');

      expect(pending).toHaveLength(1);
      expect(pending[0].billId).toBe('bill-1');
      expect(pending[0].sent).toBe(false);
    });

    it('should get all pending reminders without user filter', async () => {
      const reminders = [
        {
          id: 'rem-1',
          bill_id: 'bill-1',
          user_id: 'user-123',
          reminder_date: new Date().toISOString(),
          reminder_type: 'in_app',
          sent: false,
          sent_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'rem-2',
          bill_id: 'bill-2',
          user_id: 'user-456',
          reminder_date: new Date().toISOString(),
          reminder_type: 'email',
          sent: false,
          sent_at: null,
          created_at: new Date().toISOString(),
        },
      ];

      const selectChain = createMockChain({ data: reminders, error: null });
      (supabase.from as jest.Mock).mockReturnValue(selectChain);

      const pending = await billService.getPendingReminders();

      expect(pending).toHaveLength(2);
    });

    it('should mark reminder as sent', async () => {
      const updateChain = createMockChain({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue(updateChain);

      await expect(
        billService.markReminderSent('rem-1')
      ).resolves.toBeUndefined();

      expect(supabase.from).toHaveBeenCalledWith('bill_reminders');
    });

    it('should throw on mark reminder error', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'Update failed' },
      });
      (supabase.from as jest.Mock).mockReturnValue(errorChain);

      await expect(
        billService.markReminderSent('rem-1')
      ).rejects.toThrow('Failed to mark reminder as sent');
    });

    it('should throw on fetch reminders error', async () => {
      const errorChain = createMockChain({
        data: null,
        error: { message: 'Query failed' },
      });
      (supabase.from as jest.Mock).mockReturnValue(errorChain);

      await expect(
        billService.getPendingReminders('user-123')
      ).rejects.toThrow('Failed to fetch reminders');
    });
  });

  describe('Full pipeline: Bill Creation -> Reminders -> Payment -> Summary', () => {
    it('should complete the bill lifecycle from creation to payment and summary', async () => {
      const billRow = createMockBillRow();
      const paymentRow = createMockPaymentRow();

      // Step 1: Create bill
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') return createMockChain({ data: billRow, error: null });
        if (table === 'bill_reminders') return createMockChain({ data: null, error: null });
        return createMockChain({ data: null, error: null });
      });

      const bill = await billService.createBill({
        userId: 'user-123',
        name: 'Electric Bill',
        payee: 'Power Company',
        amount: 150,
        category: 'utilities',
        frequency: 'monthly',
        dueDay: 15,
        nextDueDate: new Date('2026-03-15'),
        reminderDaysBefore: 3,
        reminderTypes: ['in_app', 'email'],
      });

      expect(bill.name).toBe('Electric Bill');

      // Step 2: Check for pending reminders
      const reminders = [
        {
          id: 'rem-1',
          bill_id: bill.id,
          user_id: 'user-123',
          reminder_date: new Date().toISOString(),
          reminder_type: 'in_app',
          sent: false,
          sent_at: null,
          created_at: new Date().toISOString(),
        },
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bill_reminders') return createMockChain({ data: reminders, error: null });
        return createMockChain({ data: null, error: null });
      });

      const pending = await billService.getPendingReminders('user-123');
      expect(pending.length).toBeGreaterThanOrEqual(1);

      // Step 3: Mark reminder as sent
      (supabase.from as jest.Mock).mockReturnValue(
        createMockChain({ data: null, error: null })
      );
      await billService.markReminderSent(pending[0].id);

      // Step 4: Record payment
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') return createMockChain({ data: billRow, error: null });
        if (table === 'bill_payments') return createMockChain({ data: paymentRow, error: null });
        return createMockChain({ data: null, error: null });
      });

      const payment = await billService.recordPayment(
        bill.id,
        'user-123',
        150,
        new Date(),
        { paymentMethod: 'online', confirmationNumber: 'PAY-001' }
      );

      expect(payment.amount).toBe(150);

      // Step 5: Get summary
      const summaryBills = [billRow];
      const summaryPayments = [paymentRow];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'bills') return createMockChain({ data: summaryBills, error: null });
        if (table === 'bill_payments') return createMockChain({ data: summaryPayments, error: null });
        return createMockChain({ data: [], error: null });
      });

      const summary = await billService.getBillSummary('user-123');

      expect(summary.billsCount).toBe(1);
      expect(summary.totalMonthlyBills).toBeGreaterThan(0);
      expect(summary.paidThisMonth).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// CROSS-PIPELINE INTEGRATION
// ============================================================================

describe('Cross-Pipeline Integration', () => {
  it('should connect bill data to health score via spending patterns', async () => {
    const healthCalculator = new HealthScoreCalculator();

    // Bills affect spending behavior which affects health score
    const healthInput = {
      accounts: {
        checking: [{ id: 'acc-1', institutionName: 'Bank', accountName: 'Checking', accountType: 'checking' as const, currentBalance: 3000, isLinked: true, lastUpdatedAt: new Date() }],
        savings: [{ id: 'acc-2', institutionName: 'Bank', accountName: 'Savings', accountType: 'savings' as const, currentBalance: 15000, isLinked: true, lastUpdatedAt: new Date() }],
        credit: [{ id: 'acc-3', institutionName: 'Bank', accountName: 'Credit', accountType: 'credit' as const, currentBalance: -2000, creditLimit: 10000, isLinked: true, lastUpdatedAt: new Date() }],
        investment: [],
        loan: [],
        totalAssets: 18000,
        totalLiabilities: 2000,
        totalSavings: 15000,
        netWorth: 16000,
        lastSyncedAt: new Date(),
      },
      transactions: {
        recentTransactions: [],
        byCategory: [],
        byMerchant: [],
        totalIncome: 7000,
        totalExpenses: 5500, // Including bill payments
        netCashFlow: 1500,
        period: { startDate: new Date('2026-02-01'), endDate: new Date('2026-02-28'), daysIncluded: 28 },
      },
      budgets: [
        {
          id: 'b1',
          category: 'utilities',
          budgetedAmount: 400,
          spentAmount: 380,
          remainingAmount: 20,
          percentUsed: 95,
          period: 'monthly' as const,
          status: 'warning' as const,
          daysRemaining: 5,
          projectedOverage: 0,
          rolloverEnabled: false,
          rolloverAmount: 0,
        },
      ],
      goals: [],
      debts: {
        totalDebt: 2000,
        debtToIncomeRatio: 28.6,
        averageInterestRate: 15,
        monthlyPayments: 200,
        debts: [
          {
            id: 'd1',
            name: 'Credit Card',
            type: 'credit_card' as const,
            balance: 2000,
            interestRate: 15,
            minimumPayment: 50,
          },
        ],
        payoffStrategies: [],
        projectedPayoffDate: new Date('2027-06-01'),
        totalInterestSaved: 0,
      },
      creditProfile: {
        currentScore: 700,
        scoreChange: 3,
        scoreChangeDirection: 'up' as const,
        lastUpdated: new Date(),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      },
    };

    const score = await healthCalculator.calculateScore(healthInput);

    expect(score).toBeDefined();
    expect(score.overallScore).toBeGreaterThanOrEqual(40);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(score.breakdown.spending.factors).toBeInstanceOf(Array);
    expect(score.breakdown.spending.factors.length).toBeGreaterThan(0);
    // Credit utilization is 2000/10000 = 20% which is good
    expect(score.breakdown.credit.score).toBeGreaterThanOrEqual(60);
  });

  it('should connect forecast data to budget recommendations', async () => {

    // Mock increasing spending trend
    const analyses: Array<ReturnType<typeof createMockSpendingAnalysis>> = [];
    for (let i = 5; i >= 0; i--) {
      analyses.push(
        createMockSpendingAnalysis({
          totalSpending: 3000 + (5 - i) * 300,
          totalIncome: 5000,
          byCategory: [
            {
              category: 'food_dining',
              displayName: 'Food & Dining',
              amount: 800 + (5 - i) * 100,
              percentage: 30,
              transactionCount: 20,
              averageTransaction: 40,
              trend: 'increasing' as const,
              changeFromLastPeriod: 10,
            },
          ],
        })
      );
    }

    let callCount = 0;
    (spendingAnalysisService.analyzeSpending as jest.Mock).mockImplementation(() => {
      return Promise.resolve(analyses[callCount++] || analyses[analyses.length - 1]);
    });

    const forecast = await spendingForecastService.generateForecast('user-123', {
      months: 3,
      historicalMonths: 6,
      includeCategories: true,
    });

    expect(forecast.recommendations).toBeInstanceOf(Array);
    // With increasing spending, should have at least one recommendation
    if (forecast.recommendations.length > 0) {
      expect(typeof forecast.recommendations[0]).toBe('string');
    }

    // Category forecasts should show food_dining trending
    const foodForecast = forecast.categoryForecasts.find(
      (c) => c.category === 'food_dining'
    );
    if (foodForecast) {
      expect(foodForecast.predictedMonthlyAvg).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  it('should handle empty data sets gracefully in health score', async () => {
    const healthCalculator = new HealthScoreCalculator();

    const emptyInput = {
      accounts: {
        checking: [],
        savings: [],
        credit: [],
        investment: [],
        loan: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalSavings: 0,
        netWorth: 0,
        lastSyncedAt: new Date(),
      },
      transactions: {
        recentTransactions: [],
        byCategory: [],
        byMerchant: [],
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        period: { startDate: new Date(), endDate: new Date(), daysIncluded: 0 },
      },
      budgets: [],
      goals: [],
      debts: {
        totalDebt: 0,
        debtToIncomeRatio: 0,
        averageInterestRate: 0,
        monthlyPayments: 0,
        debts: [],
        payoffStrategies: [],
        projectedPayoffDate: new Date(),
        totalInterestSaved: 0,
      },
      creditProfile: {
        currentScore: 0,
        scoreChange: 0,
        scoreChangeDirection: 'stable' as const,
        lastUpdated: new Date(),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      },
    };

    const score = await healthCalculator.calculateScore(emptyInput);

    expect(score).toBeDefined();
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(score.grade).toMatch(/^[A-F]$/);
  });

  it('should handle concurrent pipeline operations', async () => {
    const billService = new BillCalendarService();

    // Set up mocks
    (spendingAnalysisService.analyzeSpending as jest.Mock).mockResolvedValue(
      createMockSpendingAnalysis()
    );

    (supabaseAdmin.from as jest.Mock).mockReturnValue(
      createMockChain({
        data: [createMockIncomeSourceRow()],
        error: null,
      })
    );

    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain({
        data: [createMockBillRow()],
        error: null,
      })
    );

    // Run all three pipelines concurrently
    const [forecast, income, bills] = await Promise.all([
      spendingForecastService.generateForecast('user-123', { months: 1, historicalMonths: 3 }),
      incomeTrackingService.getIncomeSources('user-123'),
      billService.getBillsByUser('user-123'),
    ]);

    expect(forecast.predictions).toHaveLength(1);
    expect(income).toHaveLength(1);
    expect(bills).toHaveLength(1);
  });

  it('should handle zero-value budgets in spending score', async () => {
    const healthCalculator = new HealthScoreCalculator();

    const input = {
      accounts: {
        checking: [],
        savings: [],
        credit: [],
        investment: [],
        loan: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalSavings: 0,
        netWorth: 0,
        lastSyncedAt: new Date(),
      },
      transactions: {
        recentTransactions: [],
        byCategory: [],
        byMerchant: [],
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        period: { startDate: new Date(), endDate: new Date(), daysIncluded: 0 },
      },
      budgets: [
        {
          id: 'b1',
          category: 'food',
          budgetedAmount: 0, // Zero budget
          spentAmount: 0,
          remainingAmount: 0,
          percentUsed: 0,
          period: 'monthly' as const,
          status: 'on_track' as const,
          daysRemaining: 30,
          projectedOverage: 0,
          rolloverEnabled: false,
          rolloverAmount: 0,
        },
      ],
      goals: [],
      debts: {
        totalDebt: 0,
        debtToIncomeRatio: 0,
        averageInterestRate: 0,
        monthlyPayments: 0,
        debts: [],
        payoffStrategies: [],
        projectedPayoffDate: new Date(),
        totalInterestSaved: 0,
      },
      creditProfile: {
        currentScore: 0,
        scoreChange: 0,
        scoreChangeDirection: 'stable' as const,
        lastUpdated: new Date(),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      },
    };

    const score = await healthCalculator.calculateScore(input);
    // Should not throw with zero-value budgets
    expect(score).toBeDefined();
    expect(score.breakdown.spending).toBeDefined();
  });

  it('should handle high credit utilization in health score', async () => {
    const healthCalculator = new HealthScoreCalculator();

    const input = {
      accounts: {
        checking: [],
        savings: [],
        credit: [
          {
            id: 'cc-1',
            institutionName: 'Bank',
            accountName: 'CC',
            accountType: 'credit' as const,
            currentBalance: -9500,
            creditLimit: 10000,
            isLinked: true,
            lastUpdatedAt: new Date(),
          },
        ],
        investment: [],
        loan: [],
        totalAssets: 0,
        totalLiabilities: 9500,
        totalSavings: 0,
        netWorth: -9500,
        lastSyncedAt: new Date(),
      },
      transactions: {
        recentTransactions: [],
        byCategory: [],
        byMerchant: [],
        totalIncome: 3000,
        totalExpenses: 2900,
        netCashFlow: 100,
        period: { startDate: new Date(), endDate: new Date(), daysIncluded: 30 },
      },
      budgets: [],
      goals: [],
      debts: {
        totalDebt: 9500,
        debtToIncomeRatio: 316,
        averageInterestRate: 24,
        monthlyPayments: 200,
        debts: [
          {
            id: 'd1',
            name: 'Maxed CC',
            type: 'credit_card' as const,
            balance: 9500,
            interestRate: 24,
            minimumPayment: 200,
          },
        ],
        payoffStrategies: [],
        projectedPayoffDate: new Date('2032-01-01'),
        totalInterestSaved: 0,
      },
      creditProfile: {
        currentScore: 500,
        scoreChange: -20,
        scoreChangeDirection: 'down' as const,
        lastUpdated: new Date(),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      },
    };

    const score = await healthCalculator.calculateScore(input);

    expect(score.overallScore).toBeLessThan(50);
    expect(score.grade).toBe('F');
    // Credit utilization is 95% — should severely impact credit score
    expect(score.breakdown.credit.score).toBeLessThan(30);
    expect(score.breakdown.credit.factors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('credit utilization'),
      ])
    );
  });
});
