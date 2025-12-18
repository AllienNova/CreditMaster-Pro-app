/**
 * Health Score Calculator V2 Tests
 */

import { HealthScoreCalculatorV2 } from '../health-score-calculator-v2';
import { AggregatedFinancialContext } from '../types/aggregated-context.types';

// Mock Supabase
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }));

describe('HealthScoreCalculatorV2', () => {
  let calculator: HealthScoreCalculatorV2;
  let mockContext: AggregatedFinancialContext;

  beforeEach(() => {
    jest.clearAllMocks();
    calculator = new HealthScoreCalculatorV2();
    const createMockChain = () => {
      const chain: Record<
        string,
        jest.Mock | ((r: (v: unknown) => unknown) => Promise<unknown>)
      > = {};
      ['select', 'eq', 'gte', 'order', 'insert'].forEach((m) => {
        chain[m] = jest.fn(() => chain);
      });
      chain.then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(r);
      return chain;
    };
    mockFrom.mockImplementation(() => createMockChain());
    mockContext = createMockContext();
  });

  describe('calculateScore', () => {
    it('should return a valid V2 health score', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result).toBeDefined();
      expect(result.version).toBe(2);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.grade).toMatch(/^[A-F]$/);
    });

    it('should include all 6 component scores in breakdown', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result.breakdown.savings).toBeDefined();
      expect(result.breakdown.debt).toBeDefined();
      expect(result.breakdown.spending).toBeDefined();
      expect(result.breakdown.credit).toBeDefined();
      expect(result.breakdown.investments).toBeDefined();
      expect(result.breakdown.insurance).toBeDefined();
    });

    it('should include sub-scores for each component', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result.breakdown.savings.subScores).toBeDefined();
      expect(result.breakdown.savings.subScores.length).toBeGreaterThan(0);
    });

    it('should generate recommendations for weak areas', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      const hasRecs = Object.values(result.breakdown).some(
        (c) => c.recommendations?.length > 0
      );
      expect(hasRecs).toBe(true);
    });
  });

  describe('investment score calculation', () => {
    it('should return low score when no investments', async () => {
      const ctx = {
        ...mockContext,
        investments: { ...mockContext.investments, totalValue: 0 },
      };
      const result = await calculator.calculateScore({ context: ctx });
      expect(result.breakdown.investments.score).toBeLessThanOrEqual(30);
    });

    it('should score diversification', async () => {
      const ctx = {
        ...mockContext,
        investments: {
          ...mockContext.investments,
          totalValue: 100000,
          diversificationScore: 85,
        },
      };
      const result = await calculator.calculateScore({ context: ctx });
      expect(result.breakdown.investments.score).toBeGreaterThan(50);
    });

    it('should include retirement readiness in investment score', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      const sub = result.breakdown.investments.subScores.find(
        (s) => s.name === 'Retirement Readiness'
      );
      expect(sub).toBeDefined();
    });
  });

  describe('strengths and weaknesses', () => {
    it('should identify top strengths', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result.topStrengths).toBeDefined();
      expect(Array.isArray(result.topStrengths)).toBe(true);
    });

    it('should identify top weaknesses', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result.topWeaknesses).toBeDefined();
      expect(Array.isArray(result.topWeaknesses)).toBe(true);
    });

    it('should identify quick wins', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result.quickWins).toBeDefined();
      expect(Array.isArray(result.quickWins)).toBe(true);
    });
  });

  describe('data quality assessment', () => {
    it('should assess data quality', async () => {
      const result = await calculator.calculateScore({ context: mockContext });
      expect(result.dataQuality).toBeDefined();
      expect(result.dataQuality.overallQuality).toMatch(
        /excellent|good|fair|poor/
      );
      expect(result.dataQuality.confidenceLevel).toBeGreaterThanOrEqual(0);
    });
  });
});

// Create a mock context that satisfies the calculator's needs
// Using type assertion to bypass strict type checking for test data
function createMockContext(): AggregatedFinancialContext {
  const now = new Date();
  return {
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      fullName: 'Test User',
      subscriptionTier: 'premium',
      createdAt: now,
      onboardingCompleted: true,
      preferences: {
        currency: 'USD',
        timezone: 'America/New_York',
        budgetAlertThreshold: 80,
        goalRemindersEnabled: true,
        insightNotificationsEnabled: true,
      },
    },
    accounts: {
      checking: [
        {
          id: '1',
          institutionName: 'Bank',
          accountName: 'Checking',
          accountType: 'checking',
          currentBalance: 5000,
          isLinked: true,
          lastUpdatedAt: now,
        },
      ],
      savings: [
        {
          id: '2',
          institutionName: 'Bank',
          accountName: 'Savings',
          accountType: 'savings',
          currentBalance: 10000,
          isLinked: true,
          lastUpdatedAt: now,
        },
      ],
      credit: [
        {
          id: '3',
          institutionName: 'Bank',
          accountName: 'Credit Card',
          accountType: 'credit',
          currentBalance: -2000,
          creditLimit: 10000,
          isLinked: true,
          lastUpdatedAt: now,
        },
      ],
      investment: [],
      loan: [],
      totalAssets: 15000,
      totalLiabilities: 2000,
      netWorth: 13000,
      lastSyncedAt: now,
    },
    budgets: {
      items: [
        {
          id: '1',
          userId: 'test-user-123',
          name: 'Food Budget',
          category: 'food',
          budgetedAmount: 500,
          spentAmount: 450,
          remainingAmount: 50,
          period: 'monthly',
          periodStart: now,
          periodEnd: now,
          status: 'on_track',
          percentUsed: 90,
          rolloverEnabled: false,
          rolloverAmount: 0,
          isActive: true,
          alertThreshold: 80,
          createdAt: now,
          updatedAt: now,
        },
      ],
      summary: {
        totalBudgeted: 2000,
        totalSpent: 1800,
        totalRemaining: 200,
        overallPercentUsed: 90,
        budgetsByStatus: { onTrack: 1, warning: 0, overBudget: 0, inactive: 0 },
        topOverBudgetCategories: [],
        topUnderBudgetCategories: [],
        periodSummary: {
          period: 'monthly',
          startDate: now,
          endDate: now,
          daysRemaining: 15,
        },
        projectedEndOfPeriod: {
          projectedTotal: 2000,
          projectedRemaining: 0,
          willExceedBudget: false,
        },
      },
      alerts: [],
      trends: [],
    },
    spending: {
      transactions: {
        recentTransactions: [],
        byCategory: [
          {
            category: 'Food',
            amount: 500,
            percentage: 16.7,
            transactionCount: 10,
            trend: 'stable',
            changeFromLastPeriod: 0,
          },
        ],
        byMerchant: [],
        totalIncome: 6000,
        totalExpenses: 3000,
        netCashFlow: 3000,
        period: { startDate: now, endDate: now, daysIncluded: 30 },
      },
      monthlyAverage: 3000,
      yearToDateTotal: 36000,
      topCategories: [
        {
          category: 'Food',
          amount: 500,
          percentage: 16.7,
          trend: 'stable',
          changePercent: 0,
        },
      ],
      anomalies: [],
    },
    bills: {
      items: [
        {
          id: '1',
          userId: 'test-user-123',
          name: 'Rent',
          amount: 1500,
          dueDate: now,
          frequency: 'monthly',
          category: 'housing',
          status: 'pending',
          isAutoPay: true,
          reminderDays: 3,
          createdAt: now,
          updatedAt: now,
        },
      ],
      recurring: [],
      summary: {
        totalMonthly: 2000,
        totalUpcoming: 2000,
        totalOverdue: 0,
        billsByStatus: { paid: 0, pending: 1, overdue: 0 },
        upcomingBills: [],
        overdueBills: [],
      },
      totalMonthly: 2000,
      negotiationOpportunities: 0,
    },
    savings: {
      goals: [
        {
          id: '1',
          userId: 'test-user-123',
          name: 'Emergency Fund',
          targetAmount: 20000,
          currentAmount: 10000,
          targetDate: now,
          priority: 'high',
          status: 'in_progress',
          autoContribute: true,
          contributionAmount: 500,
          contributionFrequency: 'monthly',
          linkedAccountId: '2',
          createdAt: now,
          updatedAt: now,
        },
      ],
      rules: [],
      summary: {
        totalSaved: 10000,
        totalTargets: 20000,
        overallProgress: 50,
        activeGoals: 1,
        completedGoals: 0,
        monthlyContributions: 500,
        projectedCompletionDate: now,
      },
      totalSaved: 10000,
      monthlyContributions: 500,
    },
    debt: {
      items: [
        {
          id: '1',
          userId: 'test-user-123',
          name: 'Credit Card',
          type: 'credit_card',
          balance: 2000,
          originalBalance: 3000,
          interestRate: 18,
          minimumPayment: 50,
          dueDate: now.toISOString(),
          isActive: true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      overview: {
        totalDebt: 2000,
        totalMinimumPayments: 50,
        averageInterestRate: 18,
        highestInterestRate: 18,
        lowestBalance: 2000,
        debtToIncomeRatio: 0.03,
        monthlyInterestCost: 30,
        projectedPayoffDate: now,
      },
      totalDebt: 2000,
      monthlyPayments: 50,
    },
    investments: {
      portfolio: {
        totalValue: 50000,
        totalCostBasis: 45000,
        totalGainLoss: 5000,
        totalGainLossPercent: 11.1,
        dayChange: 100,
        dayChangePercent: 0.2,
        portfolios: [],
        allocation: [],
        topHoldings: [],
      },
      totalValue: 50000,
      dayChange: 100,
      totalGainLoss: 5000,
      diversificationScore: 70,
      riskLevel: 'moderate',
      retirementReadiness: 50,
    },
    credit: {
      currentScore: 720,
      scoreChange: 5,
      scoreChangeDirection: 'up',
      lastUpdated: now,
      scoreHistory: [],
      factors: [
        {
          name: 'Payment History',
          impact: 'high',
          status: 'positive',
          description: 'Good payment history',
        },
      ],
      activeDisputes: 0,
      resolvedDisputes: 0,
      bureauScores: [],
    },
    healthScore: {
      overallScore: 75,
      grade: 'C',
      breakdown: {
        savings: { score: 70, weight: 0.25, status: 'fair', factors: [] },
        debt: { score: 80, weight: 0.25, status: 'good', factors: [] },
        spending: { score: 75, weight: 0.2, status: 'fair', factors: [] },
        credit: { score: 80, weight: 0.2, status: 'good', factors: [] },
        investments: { score: 70, weight: 0.1, status: 'fair', factors: [] },
      },
      recommendations: [],
      calculatedAt: now,
    },
    goals: [],
    insights: [],
    recommendations: [],
    netWorth: {
      current: 63000,
      previousMonth: 62000,
      change: 1000,
      changePercent: 1.6,
      assets: {
        cash: 15000,
        investments: 50000,
        realEstate: 0,
        vehicles: 0,
        other: 0,
        total: 65000,
      },
      liabilities: {
        creditCards: 2000,
        mortgages: 0,
        studentLoans: 0,
        autoLoans: 0,
        personalLoans: 0,
        other: 0,
        total: 2000,
      },
      history: [],
    },
    dataCompleteness: {
      accounts: true,
      budgets: true,
      transactions: true,
      bills: true,
      savings: true,
      debt: true,
      investments: true,
      credit: true,
      overallScore: 100,
    },
    lastUpdated: now,
  } as unknown as AggregatedFinancialContext;
}
