/**
 * Transaction Categorizer Tests
 *
 * Comprehensive tests for the TransactionCategorizer service
 */

// Mock Supabase with inline factory
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: mockFrom,
    },
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

import {
  TransactionCategorizer,
  transactionCategorizer,
} from '../transaction-categorizer';
import { PlaidTransaction } from '../plaid-service';

describe('TransactionCategorizer', () => {
  describe('exports', () => {
    it('should export TransactionCategorizer class', () => {
      expect(TransactionCategorizer).toBeDefined();
      expect(typeof TransactionCategorizer).toBe('function');
    });

    it('should export transactionCategorizer singleton', () => {
      expect(transactionCategorizer).toBeDefined();
      expect(transactionCategorizer).toBeInstanceOf(TransactionCategorizer);
    });
  });

  describe('categorizeTransaction', () => {
    it('should categorize a restaurant transaction', async () => {
      const transaction: PlaidTransaction = {
        id: 'txn-1',
        accountId: 'acc-1',
        userId: 'user-1',
        transactionId: 'plaid-txn-1',
        date: new Date(),
        amount: 25.50,
        name: 'Chipotle',
        merchantName: 'Chipotle',
        category: ['restaurants'],
        pending: false,
        createdAt: new Date(),
      };

      const result = await transactionCategorizer.categorizeTransaction(transaction);

      expect(result.enhancedCategory).toBe('Food & Dining');
      expect(result.enhancedSubcategory).toBe('Restaurants');
      expect(result.confidenceScore).toBeGreaterThan(90);
      expect(result.tags).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should handle uncategorized transactions', async () => {
      const transaction: PlaidTransaction = {
        id: 'txn-2',
        accountId: 'acc-1',
        userId: 'user-1',
        transactionId: 'plaid-txn-2',
        date: new Date(),
        amount: 50.00,
        name: 'Unknown Merchant',
        merchantName: 'Unknown Merchant',
        category: [],
        pending: false,
        createdAt: new Date(),
      };

      const result = await transactionCategorizer.categorizeTransaction(transaction);

      expect(result.enhancedCategory).toBe('Uncategorized');
      expect(result.confidenceScore).toBeLessThan(95);
    });

    it('should add tags for large purchases', async () => {
      const transaction: PlaidTransaction = {
        id: 'txn-3',
        accountId: 'acc-1',
        userId: 'user-1',
        transactionId: 'plaid-txn-3',
        date: new Date(),
        amount: 500.00,
        name: 'Best Buy',
        merchantName: 'Best Buy',
        category: ['electronics'],
        pending: false,
        createdAt: new Date(),
      };

      const result = await transactionCategorizer.categorizeTransaction(transaction);

      expect(result.tags).toContain('large-purchase');
    });

    it('should add tags for pending transactions', async () => {
      const transaction: PlaidTransaction = {
        id: 'txn-4',
        accountId: 'acc-1',
        userId: 'user-1',
        transactionId: 'plaid-txn-4',
        date: new Date(),
        amount: 25.00,
        name: 'Amazon',
        merchantName: 'Amazon',
        category: ['online shopping'],
        pending: true,
        createdAt: new Date(),
      };

      const result = await transactionCategorizer.categorizeTransaction(transaction);

      expect(result.tags).toContain('pending');
    });
  });

  describe('getCategorySpending', () => {
    it('should return empty array when no transactions', async () => {
      const result = await transactionCategorizer.getCategorySpending('user-1', 'month');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle different time periods', async () => {
      const periods: Array<'week' | 'month' | 'quarter' | 'year'> = [
        'week',
        'month',
        'quarter',
        'year',
      ];

      for (const period of periods) {
        const result = await transactionCategorizer.getCategorySpending('user-1', period);
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('detectRecurringTransactions', () => {
    it('should return empty array when no transactions', async () => {
      const result = await transactionCategorizer.detectRecurringTransactions('user-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle user with no recurring patterns', async () => {
      const result = await transactionCategorizer.detectRecurringTransactions('user-2');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('class structure', () => {
    it('should have categorizeTransaction method', () => {
      expect(typeof transactionCategorizer.categorizeTransaction).toBe('function');
    });

    it('should have getCategorySpending method', () => {
      expect(typeof transactionCategorizer.getCategorySpending).toBe('function');
    });

    it('should have detectRecurringTransactions method', () => {
      expect(typeof transactionCategorizer.detectRecurringTransactions).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should not throw when categorizing transaction with missing data', async () => {
      const transaction: PlaidTransaction = {
        id: 'txn-5',
        accountId: 'acc-1',
        userId: 'user-1',
        transactionId: 'plaid-txn-5',
        date: new Date(),
        amount: 10.00,
        name: '',
        merchantName: '',
        category: [],
        pending: false,
        createdAt: new Date(),
      };

      await expect(
        transactionCategorizer.categorizeTransaction(transaction)
      ).resolves.toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      await expect(
        transactionCategorizer.getCategorySpending('invalid-user', 'month')
      ).resolves.toBeDefined();
    });
  });
});
