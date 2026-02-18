/**
 * Spending Analysis Service Unit Tests
 *
 * Tests for spending analysis, anomaly detection, pattern recognition,
 * and spending insights generation.
 */

import {
  spendingAnalysisService,
  SpendingPeriod,
  SpendingTransaction,
  CategorySpending,
  MerchantSpending,
  SpendingAnomaly,
  SpendingPattern,
  SpendingInsight,
  SpendingAnalysisResult,
} from '../spending-analysis-service';

// Mock Plaid Service
jest.mock('../plaid-service', () => ({
  plaidService: {
    getAccounts: jest.fn(),
    getTransactions: jest.fn(),
  },
}));

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
        })),
      })),
    })),
  }),
}));

describe('SpendingAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeSpending', () => {
    it('should analyze spending for a given period', async () => {
      const { plaidService } = require('../plaid-service');

      // Mock accounts
      plaidService.getAccounts.mockResolvedValue([
        { accountId: 'acc-1', institutionName: 'Test Bank' },
      ]);

      // Mock transactions
      const mockTransactions = [
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date('2024-01-15'),
          amount: 50.0,
          name: 'Grocery Store',
          merchantName: 'Whole Foods',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-1',
          date: new Date('2024-01-16'),
          amount: 25.0,
          name: 'Restaurant',
          merchantName: 'Chipotle',
          category: ['Food and Drink', 'Restaurants'],
          pending: false,
        },
        {
          transactionId: 'txn-3',
          accountId: 'acc-1',
          date: new Date('2024-01-17'),
          amount: -2000.0, // Income (negative in Plaid)
          name: 'Payroll',
          merchantName: 'Employer Inc',
          category: ['Transfer', 'Payroll'],
          pending: false,
        },
      ];

      plaidService.getTransactions.mockResolvedValue(mockTransactions);

      const period: SpendingPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await spendingAnalysisService.analyzeSpending(
        'user-123',
        period
      );

      expect(result).toBeDefined();
      expect(result.totalSpending).toBe(75); // 50 + 25
      expect(result.totalIncome).toBe(2000);
      expect(result.netCashFlow).toBe(1925); // 2000 - 75
      expect(result.byCategory.length).toBeGreaterThan(0);
    });

    it('should handle empty transaction list', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([]);
      plaidService.getTransactions.mockResolvedValue([]);

      const period: SpendingPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await spendingAnalysisService.analyzeSpending(
        'user-123',
        period
      );

      expect(result.totalSpending).toBe(0);
      expect(result.totalIncome).toBe(0);
      expect(result.byCategory).toEqual([]);
    });
  });

  describe('Category Analysis', () => {
    it('should group transactions by category', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 100,
          name: 'Restaurant 1',
          category: ['Food and Drink', 'Restaurants'],
          pending: false,
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-1',
          date: new Date(),
          amount: 50,
          name: 'Restaurant 2',
          category: ['Food and Drink', 'Restaurants'],
          pending: false,
        },
        {
          transactionId: 'txn-3',
          accountId: 'acc-1',
          date: new Date(),
          amount: 200,
          name: 'Shopping',
          category: ['Shops'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.byCategory.length).toBe(2);
      // Food and Drink maps to dining_out
      const dining = result.byCategory.find((c) => c.category === 'dining_out');
      expect(dining?.amount).toBe(150);
      expect(dining?.transactionCount).toBe(2);
    });

    it('should calculate percentage of total spending', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 100,
          name: 'Groceries',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-1',
          date: new Date(),
          amount: 100,
          name: 'Shopping',
          category: ['Shops'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      // Each category should be 50% of total
      result.byCategory.forEach((cat) => {
        expect(cat.percentage).toBe(50);
      });
    });
  });

  describe('Merchant Analysis', () => {
    it('should group transactions by merchant', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 50,
          name: 'Amazon',
          merchantName: 'Amazon',
          category: ['Shops'],
          pending: false,
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-1',
          date: new Date(),
          amount: 30,
          name: 'Amazon',
          merchantName: 'Amazon',
          category: ['Shops'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      const amazon = result.byMerchant.find((m) => m.merchant === 'Amazon');
      expect(amazon?.amount).toBe(80);
      expect(amazon?.transactionCount).toBe(2);
      expect(amazon?.averageTransaction).toBe(40);
    });

    it('should detect recurring merchants', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 15.99,
          name: 'Netflix',
          merchantName: 'Netflix',
          category: ['Service', 'Subscription'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      const netflix = result.byMerchant.find((m) => m.merchant === 'Netflix');
      expect(netflix?.isRecurring).toBe(true);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect unusually large transactions', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        // Normal transactions
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 50,
          name: 'Grocery 1',
          merchantName: 'Store',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-1',
          date: new Date(),
          amount: 45,
          name: 'Grocery 2',
          merchantName: 'Store',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
        {
          transactionId: 'txn-3',
          accountId: 'acc-1',
          date: new Date(),
          amount: 55,
          name: 'Grocery 3',
          merchantName: 'Store',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
        {
          transactionId: 'txn-4',
          accountId: 'acc-1',
          date: new Date(),
          amount: 48,
          name: 'Grocery 4',
          merchantName: 'Store',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
        // Anomaly - much larger than average
        {
          transactionId: 'txn-5',
          accountId: 'acc-1',
          date: new Date(),
          amount: 500,
          name: 'Grocery Large',
          merchantName: 'Store',
          category: ['Food and Drink', 'Groceries'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
      const largeAnomaly = result.anomalies.find(
        (a) => a.type === 'unusual_large_transaction'
      );
      expect(largeAnomaly).toBeDefined();
      expect(largeAnomaly?.amount).toBe(500);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect recurring subscription patterns', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date('2024-01-15'),
          amount: 15.99,
          name: 'Spotify',
          merchantName: 'Spotify',
          category: ['Service', 'Subscription'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      const subscriptionPattern = result.patterns.find(
        (p) => p.type === 'recurring_subscription'
      );
      expect(subscriptionPattern).toBeDefined();
      expect(subscriptionPattern?.description).toContain('Spotify');
    });
  });

  describe('Spending Insights', () => {
    it('should generate top category insight', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 500,
          name: 'Dining',
          merchantName: 'Restaurant',
          category: ['Food and Drink', 'Restaurants'],
          pending: false,
        },
      ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.insights.length).toBeGreaterThan(0);
      const topCategoryInsight = result.insights.find(
        (i) => i.type === 'category_optimization'
      );
      expect(topCategoryInsight).toBeDefined();
    });
  });

  describe('Period Comparison', () => {
    it('should compare spending to previous period', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);

      // First call returns current period transactions
      // Second call returns previous period transactions
      plaidService.getTransactions
        .mockResolvedValueOnce([
          {
            transactionId: 'txn-1',
            accountId: 'acc-1',
            date: new Date('2024-02-15'),
            amount: 200,
            name: 'Shopping',
            category: ['Shops'],
            pending: false,
          },
        ])
        .mockResolvedValueOnce([
          {
            transactionId: 'txn-2',
            accountId: 'acc-1',
            date: new Date('2024-01-15'),
            amount: 100,
            name: 'Shopping',
            category: ['Shops'],
            pending: false,
          },
        ]);

      const result = await spendingAnalysisService.analyzeSpending('user-123', {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
      });

      expect(result.comparison).toBeDefined();
      expect(result.comparison.spendingChange).toBe(100); // 200 - 100
      expect(result.comparison.spendingChangePercent).toBe(100); // 100% increase
    });
  });

  describe('Spending Predictions', () => {
    it('should predict monthly spending', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 1000,
          name: 'Various',
          category: ['Shops'],
          pending: false,
        },
      ]);

      const prediction =
        await spendingAnalysisService.predictSpending('user-123');

      expect(prediction).toBeDefined();
      expect(prediction.predictedMonthlySpending).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
    });
  });

  describe('Quick Summary', () => {
    it('should return quick spending summary', async () => {
      const { plaidService } = require('../plaid-service');

      plaidService.getAccounts.mockResolvedValue([{ accountId: 'acc-1' }]);
      plaidService.getTransactions.mockResolvedValue([
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date(),
          amount: 500,
          name: 'Shopping',
          category: ['Shops'],
          pending: false,
        },
      ]);

      const summary = await spendingAnalysisService.getQuickSummary('user-123');

      expect(summary).toBeDefined();
      expect(summary.thisMonth).toBeGreaterThanOrEqual(0);
      expect(summary.topCategory).toBeDefined();
    });
  });
});
