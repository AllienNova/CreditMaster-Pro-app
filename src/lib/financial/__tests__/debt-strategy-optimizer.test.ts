/**
 * Debt Strategy Optimizer Tests
 * 
 * Comprehensive test suite for DebtStrategyOptimizer class
 * Target: 95%+ code coverage
 */

import {
  DebtStrategyOptimizer,
  setAIMLService,
  getAIMLService,
} from '../debt-strategy-optimizer';
import { AIMLService } from '../../aiml-service';
import { financialContextEngine } from '../financial-context-engine';
import { Debt } from '../types/debt-payoff.types';
import { PayoffMethod, DebtType } from '../types/debt-strategy.types';
import { FinancialContext } from '../types/financial-context.types';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('../financial-context-engine');
jest.mock('../../aiml-service');

// ============================================================================
// TEST DATA
// ============================================================================

const mockDebts: Debt[] = [
  {
    id: 'debt-1',
    userId: 'user-123',
    name: 'Credit Card A',
    type: 'credit_card',
    balance: 5000,
    originalBalance: 6000,
    interestRate: 22.99,
    minimumPayment: 150,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'debt-2',
    userId: 'user-123',
    name: 'Credit Card B',
    type: 'credit_card',
    balance: 3000,
    originalBalance: 3500,
    interestRate: 18.5,
    minimumPayment: 90,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'debt-3',
    userId: 'user-123',
    name: 'Personal Loan',
    type: 'personal_loan',
    balance: 8000,
    originalBalance: 10000,
    interestRate: 12.0,
    minimumPayment: 250,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const mockSingleDebt: Debt[] = [
  {
    id: 'debt-1',
    userId: 'user-123',
    name: 'Credit Card',
    type: 'credit_card',
    balance: 2000,
    originalBalance: 2500,
    interestRate: 19.99,
    minimumPayment: 60,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const mockFinancialContext: FinancialContext = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    subscriptionTier: 'free',
    createdAt: new Date('2024-01-01'),
    onboardingCompleted: true,
    preferences: {
      currency: 'USD',
      timezone: 'America/New_York',
      budgetAlertThreshold: 0.8,
      goalRemindersEnabled: true,
      insightNotificationsEnabled: true,
    },
  },
  accounts: {
    checking: [],
    savings: [],
    credit: [],
    investment: [],
    loan: [],
    totalAssets: 5000,
    totalLiabilities: 16000,
    totalSavings: 2000,
    netWorth: -11000,
    lastSyncedAt: new Date(),
  },
  transactions: {
    recentTransactions: [],
    byCategory: [],
    byMerchant: [],
    totalIncome: 5000,
    totalExpenses: -3500,
    netCashFlow: 1500,
    period: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      daysIncluded: 31,
    },
  },
  debts: {
    totalDebt: 16000,
    debtToIncomeRatio: 0.098,
    averageInterestRate: 17.83,
    monthlyPayments: 490,
    debts: mockDebts.map((debt) => ({
      id: debt.id,
      name: debt.name,
      type: debt.type as 'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan' | 'other',
      balance: debt.balance,
      interestRate: debt.interestRate,
      minimumPayment: debt.minimumPayment,
    })),
    payoffStrategies: [],
    projectedPayoffDate: new Date('2026-01-01'),
    totalInterestSaved: 0,
  },
  budgets: [],
  goals: [],
  creditProfile: {
    currentScore: 680,
    scoreChange: 0,
    scoreChangeDirection: 'stable' as const,
    lastUpdated: new Date(),
    scoreHistory: [],
    factors: [],
    activeDisputes: 0,
    resolvedDisputes: 0,
    bureauScores: [],
  },
  investments: {
    totalValue: 0,
    totalCostBasis: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    portfolios: [],
    allocation: [],
    topHoldings: [],
  },
  healthScore: {
    overallScore: 65,
    grade: 'C',
    breakdown: {
      savings: { score: 60, weight: 0.2, status: 'fair', factors: [] },
      debt: { score: 50, weight: 0.3, status: 'fair', factors: [] },
      spending: { score: 70, weight: 0.2, status: 'good', factors: [] },
      credit: { score: 70, weight: 0.2, status: 'good', factors: [] },
      insurance: { score: 0, weight: 0.1, status: 'poor', factors: [] },
    },
    trend: 'stable' as const,
    calculatedAt: new Date(),
  },
  insights: [],
  recommendations: [],
  lastUpdated: new Date(),
};

const mockAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          reasoning:
            'Based on your debt profile, a hybrid approach balances interest savings with psychological wins.',
          behavioralFactors: [
            'Multiple debts benefit from quick wins',
            'High interest rates warrant avalanche consideration',
          ],
          confidenceScore: 0.85,
          alternativeApproaches: ['Pure avalanche for max savings', 'Pure snowball for motivation'],
        }),
      },
    },
  ],
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('DebtStrategyOptimizer', () => {
  let optimizer: DebtStrategyOptimizer;
  let mockAIMLInstance: jest.Mocked<AIMLService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock AIML instance
    mockAIMLInstance = {
      chat: jest.fn().mockResolvedValue(mockAIResponse),
    } as any;

    // Set the mock AI service
    setAIMLService(mockAIMLInstance);

    // Mock financial context
    (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
      mockFinancialContext
    );

    // Create new optimizer instance
    optimizer = new DebtStrategyOptimizer();
  });

  // ==========================================================================
  // DEBT SNOWBALL CALCULATION TESTS
  // ==========================================================================

  describe('calculateSnowball', () => {
    it('should calculate snowball strategy with multiple debts', () => {
      const result = optimizer.calculateSnowball(mockDebts, 200);

      expect(result).toBeDefined();
      expect(result.method).toBe(PayoffMethod.SNOWBALL);
      expect(result.totalDebt).toBe(16000);
      expect(result.extraPayment).toBe(200);
    });

    it('should prioritize smallest balance first', () => {
      const result = optimizer.calculateSnowball(mockDebts, 200);

      // First debt should be Credit Card B (smallest balance: $3000)
      expect(result.debtOrder[0].debtName).toBe('Credit Card B');
      expect(result.debtOrder[0].balance).toBe(3000);
      expect(result.debtOrder[0].priority).toBe(1);
    });

    it('should handle single debt scenario', () => {
      const result = optimizer.calculateSnowball(mockSingleDebt, 100);

      expect(result.debtOrder).toHaveLength(1);
      expect(result.debtOrder[0].debtName).toBe('Credit Card');
    });

    it('should handle zero extra payment', () => {
      const result = optimizer.calculateSnowball(mockDebts, 0);

      expect(result.extraPayment).toBe(0);
      expect(result.totalMonths).toBeGreaterThan(0);
    });

    it('should handle large extra payment', () => {
      const result = optimizer.calculateSnowball(mockDebts, 5000);

      expect(result.extraPayment).toBe(5000);
      expect(result.totalMonths).toBeLessThan(12); // Should pay off quickly
    });

    it('should calculate accurate timeline', () => {
      const result = optimizer.calculateSnowball(mockDebts, 200);

      expect(result.totalMonths).toBeGreaterThan(0);
      expect(result.payoffDate).toBeInstanceOf(Date);
      expect(result.payoffDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate interest savings', () => {
      const result = optimizer.calculateSnowball(mockDebts, 200);

      expect(result.interestSaved).toBeGreaterThanOrEqual(0);
      expect(result.monthsSaved).toBeGreaterThanOrEqual(0);
    });

    it('should handle equal balances correctly', () => {
      const equalDebts: Debt[] = [
        { ...mockDebts[0], balance: 5000 },
        { ...mockDebts[1], balance: 5000 },
      ];

      const result = optimizer.calculateSnowball(equalDebts, 200);

      expect(result.debtOrder).toHaveLength(2);
    });
  });

  // ==========================================================================
  // DEBT AVALANCHE CALCULATION TESTS
  // ==========================================================================

  describe('calculateAvalanche', () => {
    it('should calculate avalanche strategy with multiple debts', () => {
      const result = optimizer.calculateAvalanche(mockDebts, 200);

      expect(result).toBeDefined();
      expect(result.method).toBe(PayoffMethod.AVALANCHE);
      expect(result.totalDebt).toBe(16000);
    });

    it('should prioritize highest interest rate first', () => {
      const result = optimizer.calculateAvalanche(mockDebts, 200);

      // First debt should be Credit Card A (highest rate: 22.99%)
      expect(result.debtOrder[0].debtName).toBe('Credit Card A');
      expect(result.debtOrder[0].interestRate).toBe(22.99);
      expect(result.debtOrder[0].priority).toBe(1);
    });

    it('should save more interest than snowball', () => {
      const snowball = optimizer.calculateSnowball(mockDebts, 200);
      const avalanche = optimizer.calculateAvalanche(mockDebts, 200);

      // Avalanche should save more or equal interest
      expect(avalanche.totalInterestPaid).toBeLessThanOrEqual(
        snowball.totalInterestPaid
      );
    });

    it('should handle equal interest rates', () => {
      const equalRateDebts: Debt[] = [
        { ...mockDebts[0], interestRate: 15.0 },
        { ...mockDebts[1], interestRate: 15.0 },
      ];

      const result = optimizer.calculateAvalanche(equalRateDebts, 200);

      expect(result.debtOrder).toHaveLength(2);
    });

    it('should calculate payoff timeline accurately', () => {
      const result = optimizer.calculateAvalanche(mockDebts, 200);

      expect(result.schedule).toBeDefined();
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.schedule.length).toBeLessThanOrEqual(result.totalMonths + 1);
    });

    it('should handle high-interest small debt scenarios', () => {
      const highInterestSmall: Debt[] = [
        { ...mockDebts[0], balance: 1000, interestRate: 29.99 },
        { ...mockDebts[1], balance: 10000, interestRate: 10.0 },
      ];

      const result = optimizer.calculateAvalanche(highInterestSmall, 200);

      // Should prioritize high-interest debt first
      expect(result.debtOrder[0].interestRate).toBe(29.99);
    });

    it('should validate calculation accuracy', () => {
      const result = optimizer.calculateAvalanche(mockDebts, 200);

      // Total amount paid should equal total debt + interest
      expect(result.totalAmountPaid).toBeCloseTo(
        result.totalDebt + result.totalInterestPaid,
        2
      );
    });

    it('should handle edge case with zero interest rate', () => {
      const zeroInterestDebt: Debt[] = [
        { ...mockDebts[0], interestRate: 0 },
      ];

      const result = optimizer.calculateAvalanche(zeroInterestDebt, 100);

      expect(result.totalInterestPaid).toBe(0);
    });
  });

  // ==========================================================================
  // AI-OPTIMIZED STRATEGY TESTS
  // ==========================================================================

  describe('calculateAIOptimized', () => {
    it('should calculate AI-optimized strategy', async () => {
      const result = await optimizer.calculateAIOptimized(
        mockDebts,
        mockFinancialContext
      );

      expect(result).toBeDefined();
      expect(result.method).toBe(PayoffMethod.AI_OPTIMIZED);
    });

    it('should integrate with AI service', async () => {
      await optimizer.calculateAIOptimized(mockDebts, mockFinancialContext);

      expect(mockAIMLInstance.chat).toHaveBeenCalled();
      expect(mockAIMLInstance.chat).toHaveBeenCalledWith(
        'anthropic/claude-4.5-sonnet',
        expect.any(Array),
        expect.objectContaining({ temperature: 0.3 })
      );
    });

    it('should include AI insights in result', async () => {
      const result = await optimizer.calculateAIOptimized(
        mockDebts,
        mockFinancialContext
      );

      expect(result.aiInsights).toBeDefined();
      expect(result.aiInsights?.reasoning).toBeTruthy();
      expect(result.aiInsights?.confidenceScore).toBeGreaterThan(0);
    });

    it('should consider behavioral factors', async () => {
      const result = await optimizer.calculateAIOptimized(
        mockDebts,
        mockFinancialContext
      );

      expect(result.aiInsights?.behavioralFactors).toBeDefined();
      expect(Array.isArray(result.aiInsights?.behavioralFactors)).toBe(true);
    });

    it('should provide fallback insights when AI fails', async () => {
      mockAIMLInstance.chat.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await optimizer.calculateAIOptimized(
        mockDebts,
        mockFinancialContext
      );

      expect(result).toBeDefined();
      expect(result.method).toBe(PayoffMethod.AI_OPTIMIZED);
      expect(result.aiInsights).toBeDefined();
      expect(result.aiInsights?.confidenceScore).toBe(0.7); // Fallback confidence
    });

    it('should handle context-aware recommendations', async () => {
      const highDebtContext = {
        ...mockFinancialContext,
        debts: {
          ...mockFinancialContext.debts,
          debtToIncomeRatio: 0.5,
        },
      };

      const result = await optimizer.calculateAIOptimized(
        mockDebts,
        highDebtContext
      );

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // STRATEGY COMPARISON TESTS
  // ==========================================================================

  describe('compareStrategies', () => {
    it('should compare all three strategies', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        mockFinancialContext
      );

      expect(comparison.strategies).toHaveLength(3);
      expect(comparison.strategies.map((s) => s.method)).toContain(
        PayoffMethod.SNOWBALL
      );
      expect(comparison.strategies.map((s) => s.method)).toContain(
        PayoffMethod.AVALANCHE
      );
      expect(comparison.strategies.map((s) => s.method)).toContain(
        PayoffMethod.AI_OPTIMIZED
      );
    });

    it('should provide recommendation', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        mockFinancialContext
      );

      expect(comparison.recommendation).toBeDefined();
      expect(comparison.reasonForRecommendation).toBeTruthy();
    });

    it('should calculate savings comparisons', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        mockFinancialContext
      );

      expect(comparison.potentialSavings).toBeDefined();
      expect(comparison.potentialSavings.snowballVsAvalanche).toBeDefined();
      expect(comparison.potentialSavings.bestVsWorst).toBeGreaterThanOrEqual(0);
    });

    it('should calculate timeline differences', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        mockFinancialContext
      );

      expect(comparison.timelineDifferences).toBeDefined();
      expect(comparison.timelineDifferences.snowballVsAvalanche).toBeDefined();
    });

    it('should generate insights', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        mockFinancialContext
      );

      expect(comparison.insights).toBeDefined();
      expect(Array.isArray(comparison.insights)).toBe(true);
    });

    it('should recommend avalanche for high debt-to-income ratio', async () => {
      const highDebtContext = {
        ...mockFinancialContext,
        debts: {
          ...mockFinancialContext.debts,
          monthlyPayments: 2500,
        },
        transactions: {
          ...mockFinancialContext.transactions,
          totalIncome: 5000,
        },
      };

      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        highDebtContext
      );

      // Should recommend either avalanche or AI-optimized (which considers high DTI)
      expect([PayoffMethod.AVALANCHE, PayoffMethod.AI_OPTIMIZED]).toContain(
        comparison.recommendation
      );
    });

    it('should recommend snowball for multiple small debts', async () => {
      const smallDebts: Debt[] = [
        { ...mockDebts[0], balance: 800 },
        { ...mockDebts[1], balance: 1200 },
        { ...mockDebts[2], balance: 1500 },
      ];

      const comparison = await optimizer.compareStrategies(
        smallDebts,
        200,
        mockFinancialContext
      );

      // Should recommend either snowball or AI-optimized (which considers small debts)
      expect([PayoffMethod.SNOWBALL, PayoffMethod.AI_OPTIMIZED]).toContain(
        comparison.recommendation
      );
    });
  });

  // ==========================================================================
  // PAYOFF SCHEDULE GENERATION TESTS
  // ==========================================================================

  describe('generatePayoffSchedule', () => {
    it('should generate monthly payment schedule', () => {
      const strategy = {
        method: PayoffMethod.SNOWBALL,
        extraPayment: 200,
        description: 'Snowball method',
        pros: ['Quick wins'],
        cons: ['More interest'],
      };

      const schedule = optimizer.generatePayoffSchedule(mockDebts, strategy);

      expect(schedule).toBeDefined();
      expect(Array.isArray(schedule)).toBe(true);
      expect(schedule.length).toBeGreaterThan(0);
    });

    it('should include interest vs principal breakdown', () => {
      const strategy = {
        method: PayoffMethod.AVALANCHE,
        extraPayment: 200,
        description: 'Avalanche method',
        pros: ['Max savings'],
        cons: ['Slower wins'],
      };

      const schedule = optimizer.generatePayoffSchedule(mockDebts, strategy);

      expect(schedule[0].totalInterest).toBeDefined();
      expect(schedule[0].totalPrincipal).toBeDefined();
    });

    it('should validate debt payoff sequence', () => {
      const strategy = {
        method: PayoffMethod.SNOWBALL,
        extraPayment: 500,
        description: 'Snowball method',
        pros: [],
        cons: [],
      };

      const schedule = optimizer.generatePayoffSchedule(mockDebts, strategy);

      // Check that debts are being paid down over time
      const firstMonth = schedule[0];
      const lastMonth = schedule[schedule.length - 1];
      expect(lastMonth.totalBalance).toBeLessThan(firstMonth.totalBalance);
      expect(schedule.length).toBeGreaterThan(0);
    });

    it('should track balance accurately over time', () => {
      const strategy = {
        method: PayoffMethod.AVALANCHE,
        extraPayment: 200,
        description: 'Avalanche method',
        pros: [],
        cons: [],
      };

      const schedule = optimizer.generatePayoffSchedule(mockDebts, strategy);

      // Balance should decrease each month
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].totalBalance).toBeLessThanOrEqual(
          schedule[i - 1].totalBalance
        );
      }
    });

    it('should identify debts paid off', () => {
      const strategy = {
        method: PayoffMethod.SNOWBALL,
        extraPayment: 1000,
        description: 'Snowball method',
        pros: [],
        cons: [],
      };

      const schedule = optimizer.generatePayoffSchedule(mockDebts, strategy);

      // Should have some debts paid off
      const paidOffMonths = schedule.filter((s) => s.debtsPaidOff.length > 0);
      expect(paidOffMonths.length).toBeGreaterThan(0);
    });

    it('should calculate final payment correctly', () => {
      const strategy = {
        method: PayoffMethod.AVALANCHE,
        extraPayment: 200,
        description: 'Avalanche method',
        pros: [],
        cons: [],
      };

      const schedule = optimizer.generatePayoffSchedule(mockDebts, strategy);

      const firstMonth = schedule[0];
      const lastMonth = schedule[schedule.length - 1];

      // Balance should decrease over time
      expect(lastMonth.totalBalance).toBeLessThan(firstMonth.totalBalance);

      // Total paid should increase over time
      expect(lastMonth.totalPaid).toBeGreaterThan(firstMonth.totalPaid);

      // Interest should accumulate
      expect(lastMonth.totalInterest).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ERROR HANDLING AND VALIDATION TESTS
  // ==========================================================================

  describe('validateDebtData', () => {
    it('should validate correct debt data', () => {
      const isValid = optimizer.validateDebtData(mockDebts);
      expect(isValid).toBe(true);
    });

    it('should reject empty debt array', () => {
      const isValid = optimizer.validateDebtData([]);
      expect(isValid).toBe(false);
    });

    it('should reject negative balance', () => {
      const invalidDebts = [{ ...mockDebts[0], balance: -1000 }];
      const isValid = optimizer.validateDebtData(invalidDebts);
      expect(isValid).toBe(false);
    });

    it('should reject invalid interest rate', () => {
      const invalidDebts = [{ ...mockDebts[0], interestRate: 150 }];
      const isValid = optimizer.validateDebtData(invalidDebts);
      expect(isValid).toBe(false);
    });

    it('should reject minimum payment exceeding balance', () => {
      const invalidDebts = [
        { ...mockDebts[0], balance: 1000, minimumPayment: 2000 },
      ];
      const isValid = optimizer.validateDebtData(invalidDebts);
      expect(isValid).toBe(false);
    });
  });

  describe('calculateTotalInterest', () => {
    it('should calculate total interest accurately', () => {
      const plan = optimizer.calculateSnowball(mockDebts, 200);
      const totalInterest = optimizer.calculateTotalInterest(mockDebts, plan);

      expect(totalInterest).toBe(plan.totalInterestPaid);
      expect(totalInterest).toBeGreaterThan(0);
    });
  });

  describe('estimatePayoffTime', () => {
    it('should estimate payoff time correctly', () => {
      const strategy = {
        method: PayoffMethod.SNOWBALL,
        extraPayment: 200,
        description: 'Snowball method',
        pros: [],
        cons: [],
      };

      const months = optimizer.estimatePayoffTime(mockDebts, strategy);

      expect(months).toBeGreaterThan(0);
      expect(months).toBeLessThan(360); // Less than 30 years
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should work end-to-end with financial context', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        mockFinancialContext
      );

      expect(comparison).toBeDefined();
      expect(comparison.strategies.length).toBe(3);
      expect(comparison.recommendation).toBeDefined();
    });

    it('should handle warnings for high extra payment', async () => {
      const comparison = await optimizer.compareStrategies(
        mockDebts,
        1400, // Very high relative to cash flow
        mockFinancialContext
      );

      expect(comparison.warnings).toBeDefined();
      expect(comparison.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about high-interest debt', async () => {
      const highInterestDebts = [
        { ...mockDebts[0], interestRate: 25.99 },
      ];

      const comparison = await optimizer.compareStrategies(
        highInterestDebts,
        200,
        mockFinancialContext
      );

      expect(comparison.warnings.some((w) => w.includes('high-interest'))).toBe(
        true
      );
    });

    it('should warn about insufficient emergency fund', async () => {
      const lowSavingsContext = {
        ...mockFinancialContext,
        accounts: {
          ...mockFinancialContext.accounts,
          totalSavings: 500,
        },
      };

      const comparison = await optimizer.compareStrategies(
        mockDebts,
        200,
        lowSavingsContext
      );

      expect(
        comparison.warnings.some((w) => w.includes('emergency fund'))
      ).toBe(true);
    });
  });
});

