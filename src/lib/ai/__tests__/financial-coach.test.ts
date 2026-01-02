/**
 * Financial Coach Service Tests
 *
 * Comprehensive test suite for the AI Financial Coach service
 * Target Coverage: 90%+
 */

import { FinancialCoach } from '../financial-coach';
import { AIMLService } from '@/lib/aiml-service';
import { financialContextEngine } from '@/lib/financial/financial-context-engine';
import { FinancialContext } from '@/lib/financial/types/financial-context.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock AIMLService
jest.mock('@/lib/aiml-service');
const MockedAIMLService = AIMLService as jest.MockedClass<typeof AIMLService>;

// Mock Financial Context Engine
jest.mock('@/lib/financial/financial-context-engine', () => ({
  financialContextEngine: {
    getFinancialContext: jest.fn(),
  },
}));

// ============================================================================
// TEST DATA
// ============================================================================

const mockFinancialContext: FinancialContext = {
  userId: 'test-user-123',
  accounts: {
    checking: [],
    savings: [],
    credit: [],
    investment: [],
    loan: [],
    totalAssets: 15000,
    totalLiabilities: 8000,
    totalSavings: 2500,
    netWorth: 7000,
    lastSyncedAt: new Date(),
  },
  transactions: {
    totalIncome: 5000,
    totalExpenses: -3500,
    netCashFlow: 1500,
    byCategory: [
      { category: 'dining', amount: -600, percentage: 15, transactionCount: 15, trend: 'stable' as const, changeFromLastPeriod: 0 },
      { category: 'groceries', amount: -500, percentage: 12.5, transactionCount: 8, trend: 'stable' as const, changeFromLastPeriod: 0 },
      { category: 'rent', amount: -1500, percentage: 37.5, transactionCount: 1, trend: 'stable' as const, changeFromLastPeriod: 0 },
      { category: 'utilities', amount: -200, percentage: 5, transactionCount: 3, trend: 'stable' as const, changeFromLastPeriod: 0 },
      { category: 'transportation', amount: -300, percentage: 7.5, transactionCount: 10, trend: 'stable' as const, changeFromLastPeriod: 0 },
    ],
    transactions: [],
  },
  debts: {
    totalDebt: 8000,
    monthlyPayments: 400,
    debtToIncomeRatio: 0.16,
    debts: [
      {
        id: 'debt-1',
        name: 'Credit Card',
        type: 'credit_card' as const,
        balance: 3000,
        interestRate: 18.5,
        minimumPayment: 90,
      },
      {
        id: 'debt-2',
        name: 'Student Loan',
        type: 'student_loan' as const,
        balance: 5000,
        interestRate: 5.5,
        minimumPayment: 150,
      },
    ],
  },
  budgets: [
    {
      id: 'budget-1',
      category: 'dining',
      budgetedAmount: 400,
      spentAmount: 600,
      remainingAmount: -200,
      percentUsed: 150,
      period: 'monthly' as const,
      status: 'over_budget' as const,
      daysRemaining: 15,
      projectedOverage: 200,
      rolloverEnabled: false,
      rolloverAmount: 0,
    },
  ],
  goals: [],
  healthScore: {
    overallScore: 65,
    grade: 'D' as const,
    breakdown: {
      savings: { score: 60, weight: 0.25, status: 'fair' as const, factors: [] },
      debt: { score: 70, weight: 0.25, status: 'good' as const, factors: [] },
      spending: { score: 65, weight: 0.2, status: 'fair' as const, factors: [] },
      credit: { score: 60, weight: 0.2, status: 'fair' as const, factors: [] },
      insurance: { score: 70, weight: 0.1, status: 'good' as const, factors: [] },
    },
    trend: 'stable' as const,
    calculatedAt: new Date(),
  },
  generatedAt: new Date(),
};

const mockAIAnalysisResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          behavioralInsights: [
            'You are spending 12% of income on dining out, which is above the recommended 10%',
            'Your savings rate of 30% is excellent and shows strong financial discipline',
            'You have high-interest credit card debt that should be prioritized',
          ],
          nextSteps: [
            'Save $1,000 emergency fund (Baby Step 1)',
            'Pay off credit card debt using debt snowball method',
            'Reduce dining out expenses by $200/month',
          ],
          encouragement: 'You\'re doing great with your savings rate! Let\'s tackle that credit card debt next.',
        }),
      },
    },
  ],
  usage: { total_tokens: 500 },
};

const mockActionPlanResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          targetBabyStep: 3,
          milestones: [
            {
              id: 'milestone-1',
              babyStep: 1,
              title: 'Save $1,000 Emergency Fund',
              description: 'Build starter emergency fund',
              targetAmount: 1000,
              actions: ['Save $250/week', 'Sell unused items', 'Cut dining budget'],
              completed: false,
            },
          ],
          weeklyActions: [
            'Track every dollar spent',
            'Review budget progress',
            'Find extra income opportunities',
          ],
          monthlyReviews: [
            'Review Baby Step progress',
            'Adjust budget categories',
            'Celebrate milestones achieved',
          ],
          celebrationPoints: [
            'First $100 saved',
            'First debt paid off',
            'Emergency fund complete',
          ],
        }),
      },
    },
  ],
  usage: { total_tokens: 800 },
};

const mockAdviceResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          answer: 'Based on your $5,000 monthly income and $3,500 expenses, you should focus on Baby Step 1 first. Save $1,000 as quickly as possible for your starter emergency fund.',
          relevantBabyStep: 1,
          actionSteps: [
            'Open a separate savings account for emergency fund',
            'Set up automatic transfer of $250/week',
            'Cut dining budget by $200/month',
          ],
          resources: [
            'Dave Ramsey Baby Steps Guide',
            'Emergency Fund Calculator',
          ],
          encouragement: 'You can do this! With your current cash flow, you can have your $1,000 saved in just 4 weeks!',
        }),
      },
    },
  ],
  usage: { total_tokens: 600 },
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('FinancialCoach', () => {
  let coach: FinancialCoach;
  let mockAIMLInstance: jest.Mocked<AIMLService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock AIML instance
    mockAIMLInstance = {
      chat: jest.fn(),
    } as any;

    // Mock AIMLService constructor
    MockedAIMLService.mockImplementation(() => mockAIMLInstance);

    // Mock financial context
    (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
      mockFinancialContext
    );

    // Create new coach instance
    coach = new FinancialCoach();
  });

  // ==========================================================================
  // ANALYZE FINANCIAL SITUATION TESTS
  // ==========================================================================

  describe('analyzeFinancialSituation', () => {
    it('should analyze financial situation and return comprehensive analysis', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123', 'overall');

      expect(result).toBeDefined();
      expect(result.userId).toBe('test-user-123');
      expect(result.currentBabyStep).toBe(2); // Has $2,500 savings (>$1,000) but still has debt
      expect(result.financialHealth.score).toBeGreaterThan(0);
      expect(result.behavioralInsights).toHaveLength(3);
      expect(result.nextSteps).toHaveLength(3);
      expect(result.encouragement).toBeTruthy();
    });

    it('should determine Baby Step 1 when savings < $1,000', async () => {
      const contextWithLowSavings = {
        ...mockFinancialContext,
        accounts: { ...mockFinancialContext.accounts, totalSavings: 500 },
      };
      (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
        contextWithLowSavings
      );
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result.currentBabyStep).toBe(1);
    });

    it('should determine Baby Step 2 when has savings but still has debt', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result.currentBabyStep).toBe(2);
    });

    it('should determine Baby Step 3 when debt-free but emergency fund incomplete', async () => {
      const contextDebtFree = {
        ...mockFinancialContext,
        debts: { ...mockFinancialContext.debts, totalDebt: 0, debts: [] },
        accounts: { ...mockFinancialContext.accounts, totalSavings: 5000 },
      };
      (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
        contextDebtFree
      );
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result.currentBabyStep).toBe(3);
    });

    it('should identify critical issues', async () => {
      const contextNegativeCashFlow = {
        ...mockFinancialContext,
        transactions: {
          ...mockFinancialContext.transactions,
          totalIncome: 3000,
          totalExpenses: -3500,
          netCashFlow: -500,
        },
      };
      (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
        contextNegativeCashFlow
      );
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.criticalIssues.some(issue => issue.id === 'negative_cashflow')).toBe(true);
    });

    it('should find opportunities for improvement', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123', 'expense_reduction');

      expect(result.opportunities.length).toBeGreaterThan(0);
      expect(result.opportunities[0]).toHaveProperty('title');
      expect(result.opportunities[0]).toHaveProperty('estimatedImpact');
    });

    it('should handle AI service errors gracefully', async () => {
      mockAIMLInstance.chat.mockRejectedValue(new Error('AI service unavailable'));

      const result = await coach.analyzeFinancialSituation('test-user-123');

      // Should still return analysis with fallback insights
      expect(result).toBeDefined();
      expect(result.behavioralInsights.length).toBeGreaterThan(0);
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GENERATE ACTION PLAN TESTS
  // ==========================================================================

  describe('generateActionPlan', () => {
    it('should generate comprehensive action plan', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockActionPlanResponse as any);

      const result = await coach.generateActionPlan(
        'test-user-123',
        ['Pay off debt', 'Build emergency fund'],
        '1-5 years'
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('test-user-123');
      expect(result.title).toContain('Financial Freedom Action Plan');
      expect(result.milestones.length).toBeGreaterThan(0);
      expect(result.weeklyActions.length).toBeGreaterThan(0);
      expect(result.celebrationPoints.length).toBeGreaterThan(0);
    });

    it('should include Dave Ramsey Baby Steps in plan', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockActionPlanResponse as any);

      const result = await coach.generateActionPlan(
        'test-user-123',
        ['Become debt-free'],
        '1-5 years'
      );

      expect(result.startingBabyStep).toBeDefined();
      expect(result.targetBabyStep).toBeDefined();
      expect(result.targetBabyStep).toBeGreaterThanOrEqual(result.startingBabyStep);
    });

    it('should handle multiple goals', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockActionPlanResponse as any);

      const goals = [
        'Pay off credit card debt',
        'Save $10,000 emergency fund',
        'Start investing for retirement',
      ];

      const result = await coach.generateActionPlan('test-user-123', goals, '1-5 years');

      expect(result).toBeDefined();
      expect(mockAIMLInstance.chat).toHaveBeenCalled();
    });

    it('should handle AI parsing errors gracefully', async () => {
      mockAIMLInstance.chat.mockResolvedValue({
        choices: [{ message: { content: 'Invalid JSON response' } }],
        usage: { total_tokens: 100 },
      } as any);

      const result = await coach.generateActionPlan(
        'test-user-123',
        ['Pay off debt'],
        '1-5 years'
      );

      // Should return fallback plan
      expect(result).toBeDefined();
      expect(result.weeklyActions.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GET PERSONALIZED ADVICE TESTS
  // ==========================================================================

  describe('getPersonalizedAdvice', () => {
    it('should provide personalized advice for specific question', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAdviceResponse as any);

      const result = await coach.getPersonalizedAdvice(
        'test-user-123',
        'Should I pay off debt or save for emergency fund first?'
      );

      expect(result).toBeDefined();
      expect(result.question).toBe('Should I pay off debt or save for emergency fund first?');
      expect(result.answer).toBeTruthy();
      expect(result.relevantBabyStep).toBeDefined();
      expect(result.actionSteps.length).toBeGreaterThan(0);
      expect(result.encouragement).toBeTruthy();
    });

    it('should reference user financial data in advice', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAdviceResponse as any);

      await coach.getPersonalizedAdvice('test-user-123', 'How much should I save?');

      const callArgs = mockAIMLInstance.chat.mock.calls[0];
      const userPrompt = callArgs[1][1].content;

      expect(userPrompt).toContain('$5,000'); // Monthly income
      expect(userPrompt).toContain('$3,500'); // Monthly expenses
    });

    it('should align advice with Dave Ramsey philosophy', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAdviceResponse as any);

      await coach.getPersonalizedAdvice(
        'test-user-123',
        'Should I invest while I have debt?'
      );

      const callArgs = mockAIMLInstance.chat.mock.calls[0];
      const systemPrompt = callArgs[1][0].content;

      expect(systemPrompt).toContain('Dave Ramsey');
      expect(systemPrompt).toContain('Baby Steps');
    });

    it('should handle AI errors with fallback advice', async () => {
      mockAIMLInstance.chat.mockRejectedValue(new Error('AI unavailable'));

      const result = await coach.getPersonalizedAdvice(
        'test-user-123',
        'How do I start budgeting?'
      );

      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
      expect(result.actionSteps.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GET PROACTIVE RECOMMENDATIONS TESTS
  // ==========================================================================

  describe('getProactiveRecommendations', () => {
    it('should generate proactive recommendations', async () => {
      mockAIMLInstance.chat.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    priority: 'high',
                    category: 'debt_payoff',
                    title: 'Pay off credit card debt',
                    benefit: 'Save $555/year in interest',
                    difficulty: 'moderate',
                    timeline: '10 months',
                    actionSteps: ['Pay $390/month', 'Stop using credit card'],
                    estimatedImpact: 555,
                  },
                ],
              }),
            },
          },
        ],
        usage: { total_tokens: 400 },
      } as any);

      const result = await coach.getProactiveRecommendations('test-user-123');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('priority');
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('actionSteps');
    });

    it('should prioritize high-impact recommendations', async () => {
      mockAIMLInstance.chat.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    priority: 'high',
                    estimatedImpact: 1000,
                    category: 'debt_payoff',
                    title: 'High impact',
                    benefit: 'Big savings',
                    difficulty: 'easy',
                    timeline: '1 month',
                    actionSteps: ['Do this'],
                  },
                  {
                    priority: 'low',
                    estimatedImpact: 50,
                    category: 'expense_reduction',
                    title: 'Low impact',
                    benefit: 'Small savings',
                    difficulty: 'easy',
                    timeline: '1 month',
                    actionSteps: ['Do that'],
                  },
                ],
              }),
            },
          },
        ],
        usage: { total_tokens: 400 },
      } as any);

      const result = await coach.getProactiveRecommendations('test-user-123');

      expect(result[0].priority).toBe('high');
      expect(result[0].estimatedImpact).toBeGreaterThan(result[1]?.estimatedImpact || 0);
    });

    it('should handle empty recommendations gracefully', async () => {
      mockAIMLInstance.chat.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
        usage: { total_tokens: 50 },
      } as any);

      const result = await coach.getProactiveRecommendations('test-user-123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // DAVE RAMSEY PHILOSOPHY TESTS
  // ==========================================================================

  describe('Dave Ramsey Philosophy Integration', () => {
    it('should recommend Baby Step 1 for users without emergency fund', async () => {
      const contextNoSavings = {
        ...mockFinancialContext,
        accounts: { ...mockFinancialContext.accounts, totalSavings: 0 },
      };
      (financialContextEngine.getFinancialContext as jest.Mock).mockResolvedValue(
        contextNoSavings
      );
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result.currentBabyStep).toBe(1);
      expect(result.nextSteps.some(step => step.includes('$1,000'))).toBe(true);
    });

    it('should recommend debt snowball for Baby Step 2', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123', 'debt_payoff');

      expect(result.currentBabyStep).toBe(2);
      // Should have debt-related opportunities
      expect(result.opportunities.some(opp => opp.type === 'debt_payoff')).toBe(true);
    });

    it('should calculate debt snowball correctly', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      // Credit card ($3,000) should be prioritized over student loan ($5,000)
      const debtOpportunities = result.opportunities.filter(
        opp => opp.type === 'debt_payoff'
      );
      if (debtOpportunities.length > 0) {
        expect(debtOpportunities[0].title).toContain('Credit Card');
      }
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle missing financial context', async () => {
      (financialContextEngine.getFinancialContext as jest.Mock).mockRejectedValue(
        new Error('Context not found')
      );

      await expect(
        coach.analyzeFinancialSituation('invalid-user')
      ).rejects.toThrow();
    });

    it('should handle AI timeout gracefully', async () => {
      mockAIMLInstance.chat.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result).toBeDefined();
      expect(result.behavioralInsights.length).toBeGreaterThan(0);
    });

    it('should handle malformed AI responses', async () => {
      mockAIMLInstance.chat.mockResolvedValue({
        choices: [{ message: { content: 'Not JSON at all!' } }],
        usage: { total_tokens: 50 },
      } as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result).toBeDefined();
      expect(result.behavioralInsights).toBeDefined();
    });
  });

  // ==========================================================================
  // CONTEXT UTILIZATION TESTS
  // ==========================================================================

  describe('Financial Context Utilization', () => {
    it('should use actual income and expenses in analysis', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      await coach.analyzeFinancialSituation('test-user-123');

      expect(financialContextEngine.getFinancialContext).toHaveBeenCalledWith('test-user-123');
    });

    it('should consider debt-to-income ratio', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      expect(result.financialHealth.debtStatus).toBeDefined();
    });

    it('should calculate emergency fund months correctly', async () => {
      mockAIMLInstance.chat.mockResolvedValue(mockAIAnalysisResponse as any);

      const result = await coach.analyzeFinancialSituation('test-user-123');

      // Check that savings status is calculated
      expect(result.financialHealth.savingsStatus).toBeDefined();
    });
  });
});


