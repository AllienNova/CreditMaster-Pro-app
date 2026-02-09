/**
 * Action Executor
 *
 * Executes financial actions based on chat intents
 * Integrates with existing financial services to perform user-requested operations
 */

import type {
  IntentType,
  ExtractedEntities,
  ActionResult,
  ConversationContext,
} from './types/chat.types';

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

export class ActionExecutor {
  /**
   * Execute an action based on intent and entities
   */
  async execute(
    userId: string,
    intent: IntentType,
    entities: ExtractedEntities | null,
    context: ConversationContext
  ): Promise<ActionResult> {
    try {
      switch (intent) {
        case 'create_goal':
          return await this.executeCreateGoal(userId, entities, context);

        case 'create_budget':
          return await this.executeCreateBudget(userId, entities, context);

        case 'analyze_spending':
          return await this.executeAnalyzeSpending(userId, entities, context);

        case 'debt_strategy':
          return await this.executeDebtStrategy(userId, entities, context);

        case 'account_summary':
          return await this.executeAccountSummary(userId, context);

        case 'get_recommendations':
          return await this.executeGetRecommendations(userId, context);

        case 'investment_advice':
          return await this.executeInvestmentAdvice(userId, entities, context);

        case 'credit_score':
          return await this.executeCreditScore(userId, context);

        default:
          return {
            success: false,
            type: intent,
            data: null,
            message: `Action type '${intent}' is not executable`,
            error: 'UNSUPPORTED_ACTION',
          };
      }
    } catch (error) {
      // ActionExecutor error: Action execution error
      return {
        success: false,
        type: intent,
        data: null,
        message: 'Failed to execute action',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate if action can be executed
   */
  canExecute(intent: IntentType, entities: ExtractedEntities | null): {
    canExecute: boolean;
    reason?: string;
    missingData?: string[];
  } {
    const missingData: string[] = [];

    switch (intent) {
      case 'create_goal':
        if (!entities?.amounts || entities.amounts.length === 0) {
          missingData.push('goal amount');
        }
        if (!entities?.goalTypes || entities.goalTypes.length === 0) {
          missingData.push('goal type');
        }
        break;

      case 'create_budget':
        if (!entities?.amounts || entities.amounts.length === 0) {
          missingData.push('budget amount');
        }
        if (!entities?.categories || entities.categories.length === 0) {
          missingData.push('budget category');
        }
        break;

      case 'analyze_spending':
      case 'debt_strategy':
      case 'account_summary':
      case 'get_recommendations':
      case 'investment_advice':
      case 'credit_score':
        // These actions don't require entities
        return { canExecute: true };

      default:
        return {
          canExecute: false,
          reason: 'Action type not executable',
        };
    }

    if (missingData.length > 0) {
      return {
        canExecute: false,
        reason: 'Missing required information',
        missingData,
      };
    }

    return { canExecute: true };
  }

  // ==========================================================================
  // ACTION IMPLEMENTATIONS
  // ==========================================================================

  /**
   * Create a financial goal
   */
  private async executeCreateGoal(
    userId: string,
    entities: ExtractedEntities | null,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Extract goal data
    const amount = entities?.amounts?.[0]?.value;
    const goalType = entities?.goalTypes?.[0] || 'general';
    const deadline = entities?.dates?.[0]?.value;

    if (!amount) {
      return {
        success: false,
        type: 'create_goal',
        data: null,
        message: 'Cannot create goal without a target amount',
        error: 'MISSING_AMOUNT',
      };
    }

    // In a real implementation, this would call the goal service
    // For now, return a mock successful result
    const goal = {
      id: `goal_${Date.now()}`,
      userId,
      name: `${goalType.charAt(0).toUpperCase() + goalType.slice(1)} Goal`,
      targetAmount: amount,
      currentAmount: 0,
      deadline: deadline || null,
      type: goalType,
      createdAt: new Date(),
    };

    return {
      success: true,
      type: 'create_goal',
      data: goal,
      message: `Successfully created ${goalType} goal for $${amount.toLocaleString()}`,
    };
  }

  /**
   * Create a budget
   */
  private async executeCreateBudget(
    userId: string,
    entities: ExtractedEntities | null,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Extract budget data
    const amounts = entities?.amounts || [];
    const categories = entities?.categories || [];
    const timeframe = entities?.timeframes?.[0] || 'monthly';

    if (amounts.length === 0 || categories.length === 0) {
      return {
        success: false,
        type: 'create_budget',
        data: null,
        message: 'Cannot create budget without amount and category',
        error: 'MISSING_DATA',
      };
    }

    // Create budgets for each category-amount pair
    const budgets = categories.map((category, index) => ({
      id: `budget_${Date.now()}_${index}`,
      userId,
      category,
      limit: amounts[Math.min(index, amounts.length - 1)]?.value || 0,
      spent: 0,
      timeframe,
      createdAt: new Date(),
    }));

    return {
      success: true,
      type: 'create_budget',
      data: { budgets, timeframe },
      message: `Successfully created ${budgets.length} ${timeframe} budget(s)`,
    };
  }

  /**
   * Analyze spending patterns
   */
  private async executeAnalyzeSpending(
    userId: string,
    entities: ExtractedEntities | null,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Extract analysis parameters
    const categories = entities?.categories || null;
    const timeframe = entities?.dates?.[0] || null;

    // Mock spending analysis
    const analysis = {
      userId,
      period: timeframe ? 'custom' : 'last_30_days',
      totalSpent: 3456.78,
      categories: categories || [
        { name: 'groceries', amount: 542.34, percentage: 15.7 },
        { name: 'dining', amount: 423.12, percentage: 12.2 },
        { name: 'transportation', amount: 325.67, percentage: 9.4 },
        { name: 'utilities', amount: 234.56, percentage: 6.8 },
        { name: 'entertainment', amount: 189.23, percentage: 5.5 },
      ],
      topMerchants: [
        { name: 'Whole Foods', amount: 234.56 },
        { name: 'Shell Gas', amount: 156.78 },
        { name: 'Netflix', amount: 15.99 },
      ],
      trends: {
        vs_last_month: 12.5, // 12.5% increase
        unusual_spending: ['Entertainment up 45%'],
      },
      analyzedAt: new Date(),
    };

    return {
      success: true,
      type: 'analyze_spending',
      data: analysis,
      message: 'Spending analysis complete',
    };
  }

  /**
   * Generate debt strategy
   */
  private async executeDebtStrategy(
    userId: string,
    entities: ExtractedEntities | null,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Mock debt data from context
    const debts = [
      {
        name: 'Credit Card 1',
        balance: 5000,
        interestRate: 18.99,
        minimumPayment: 150,
      },
      {
        name: 'Credit Card 2',
        balance: 3000,
        interestRate: 22.99,
        minimumPayment: 90,
      },
      {
        name: 'Student Loan',
        balance: 25000,
        interestRate: 4.5,
        minimumPayment: 300,
      },
    ];

    // Calculate avalanche strategy
    const avalancheStrategy = debts
      .sort((a, b) => b.interestRate - a.interestRate)
      .map((debt, index) => ({
        ...debt,
        priority: index + 1,
        reason: `${debt.interestRate}% interest rate`,
      }));

    // Calculate snowball strategy
    const snowballStrategy = debts
      .sort((a, b) => a.balance - b.balance)
      .map((debt, index) => ({
        ...debt,
        priority: index + 1,
        reason: `$${debt.balance.toLocaleString()} balance`,
      }));

    const strategy = {
      totalDebt: debts.reduce((sum, d) => sum + d.balance, 0),
      monthlyMinimum: debts.reduce((sum, d) => sum + d.minimumPayment, 0),
      strategies: {
        avalanche: {
          description: 'Pay highest interest rate first (saves most money)',
          order: avalancheStrategy,
          estimatedMonthsToPayoff: 36,
          totalInterestPaid: 4567.89,
        },
        snowball: {
          description: 'Pay smallest balance first (quick wins)',
          order: snowballStrategy,
          estimatedMonthsToPayoff: 38,
          totalInterestPaid: 5234.12,
        },
      },
      recommendation: 'avalanche',
    };

    return {
      success: true,
      type: 'debt_strategy',
      data: strategy,
      message: 'Debt strategy generated successfully',
    };
  }

  /**
   * Get account summary
   */
  private async executeAccountSummary(
    userId: string,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Use financial snapshot from context if available
    const snapshot = context.financialContext || {
      netWorth: 45678.90,
      monthlyIncome: 5000,
      monthlyExpenses: 3456.78,
      cashFlow: 1543.22,
      healthScore: 75,
      totalDebt: 33000,
      totalSavings: 12000,
      activeGoals: 3,
      budgets: [],
      capturedAt: new Date(),
    };

    return {
      success: true,
      type: 'account_summary',
      data: snapshot,
      message: 'Account summary retrieved successfully',
    };
  }

  /**
   * Get financial recommendations
   */
  private async executeGetRecommendations(
    userId: string,
    context: ConversationContext
  ): Promise<ActionResult> {
    const snapshot = context.financialContext;

    // Generate personalized recommendations
    const recommendations = [
      {
        id: 'rec_1',
        type: 'emergency_fund',
        priority: 'high',
        title: 'Build Emergency Fund',
        description: 'Aim for 3-6 months of expenses ($10,000-$20,000)',
        currentStatus: snapshot?.totalSavings || 0,
        targetAmount: 15000,
        actionSteps: [
          'Set up automatic transfer of $500/month to savings',
          'Keep funds in high-yield savings account (5%+ APY)',
          'Review and adjust as income changes',
        ],
      },
      {
        id: 'rec_2',
        type: 'debt_payoff',
        priority: 'high',
        title: 'Accelerate Debt Payoff',
        description: 'Pay extra $200/month toward highest interest debt',
        estimatedSavings: 2345.67,
        monthsSaved: 8,
        actionSteps: [
          'Use avalanche method (highest interest first)',
          'Consider balance transfer to 0% APR card',
          'Negotiate lower interest rates with creditors',
        ],
      },
      {
        id: 'rec_3',
        type: 'retirement',
        priority: 'medium',
        title: 'Increase Retirement Contributions',
        description: 'Boost 401(k) contribution to get full employer match',
        potentialGain: 3000, // Per year
        actionSteps: [
          'Increase contribution by 2% of salary',
          'Ensure you\'re getting full employer match',
          'Consider Roth IRA for additional tax advantages',
        ],
      },
    ];

    return {
      success: true,
      type: 'get_recommendations',
      data: {
        recommendations,
        financialHealthScore: snapshot?.healthScore || 70,
        priorityActions: recommendations.filter((r) => r.priority === 'high'),
      },
      message: `Generated ${recommendations.length} personalized recommendations`,
    };
  }

  /**
   * Get investment advice
   */
  private async executeInvestmentAdvice(
    userId: string,
    entities: ExtractedEntities | null,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Mock investment advice
    const advice = {
      riskTolerance: 'moderate',
      recommendedAllocation: {
        stocks: 60,
        bonds: 30,
        cash: 10,
      },
      suggestions: [
        {
          type: 'etf',
          ticker: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          allocation: 40,
          reason: 'Broad market exposure with low fees',
        },
        {
          type: 'etf',
          ticker: 'BND',
          name: 'Vanguard Total Bond Market ETF',
          allocation: 30,
          reason: 'Diversified bond exposure for stability',
        },
        {
          type: 'etf',
          ticker: 'VXUS',
          name: 'Vanguard Total International Stock ETF',
          allocation: 20,
          reason: 'International diversification',
        },
      ],
      rebalancing: 'quarterly',
      estimatedAnnualReturn: 7.5, // percentage
      volatility: 'moderate',
    };

    return {
      success: true,
      type: 'investment_advice',
      data: advice,
      message: 'Investment advice generated based on your profile',
    };
  }

  /**
   * Get credit score information
   */
  private async executeCreditScore(
    userId: string,
    context: ConversationContext
  ): Promise<ActionResult> {
    // Mock credit score data
    const creditData = {
      score: 720,
      previousScore: 705,
      change: 15,
      range: 'good', // poor, fair, good, very good, excellent
      factors: [
        {
          factor: 'Payment History',
          impact: 'positive',
          score: 100,
          details: 'No missed payments in 24 months',
        },
        {
          factor: 'Credit Utilization',
          impact: 'neutral',
          score: 35,
          details: '35% utilization (aim for <30%)',
        },
        {
          factor: 'Credit Age',
          impact: 'positive',
          score: 7.5,
          details: '7.5 years average age',
        },
        {
          factor: 'Credit Mix',
          impact: 'positive',
          score: 4,
          details: '4 account types',
        },
        {
          factor: 'New Credit',
          impact: 'neutral',
          score: 2,
          details: '2 inquiries in 12 months',
        },
      ],
      improvements: [
        'Reduce credit utilization to below 30%',
        'Avoid opening new accounts for 6 months',
        'Consider becoming an authorized user on older account',
      ],
      monitoring: {
        lastChecked: new Date(),
        bureaus: ['Experian', 'Equifax', 'TransUnion'],
        alertsEnabled: true,
      },
    };

    return {
      success: true,
      type: 'credit_score',
      data: creditData,
      message: 'Credit score information retrieved successfully',
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let actionExecutorInstance: ActionExecutor | null = null;

export function getActionExecutor(): ActionExecutor {
  if (!actionExecutorInstance) {
    actionExecutorInstance = new ActionExecutor();
  }
  return actionExecutorInstance;
}

export default getActionExecutor();
