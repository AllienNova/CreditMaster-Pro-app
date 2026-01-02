/**
 * Debt Strategy Optimizer
 * 
 * Comprehensive debt payoff strategy system providing:
 * - Debt snowball (smallest balance first)
 * - Debt avalanche (highest interest first)
 * - AI-optimized hybrid strategies
 * - Detailed payoff schedules and comparisons
 * 
 * Integrates with existing DebtPayoffService and DebtStrategyEngine
 */

import { AIMLService } from '../aiml-service';
import { financialContextEngine } from './financial-context-engine';
import { DebtPayoffService } from './debt-payoff-service';
import {
  Debt,
  DebtType as BaseDebtType,
  PayoffStrategy,
  PayoffPlan,
  DebtPayoffOrder as BaseDebtPayoffOrder,
  PayoffTimelineEntry,
  PayoffMilestone,
} from './types/debt-payoff.types';
import {
  PayoffMethod,
  DebtPayoffPlan,
  DebtComparison,
  DebtStrategy,
  PayoffSchedule,
  DebtPaymentDetail,
  StrategyFocus,
  MotivationMetrics,
  DebtType,
  DebtPayoffOrder,
} from './types/debt-strategy.types';
import { FinancialContext } from './types/financial-context.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = 'anthropic/claude-4.5-sonnet';

// ============================================================================
// AIML SERVICE SINGLETON
// ============================================================================

let aiServiceInstance: AIMLService | null = null;

export function getAIMLService(): AIMLService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIMLService();
  }
  return aiServiceInstance;
}

export function setAIMLService(service: AIMLService): void {
  aiServiceInstance = service;
}

// ============================================================================
// DEBT STRATEGY OPTIMIZER CLASS
// ============================================================================

export class DebtStrategyOptimizer {
  private debtPayoffService: DebtPayoffService;

  private get aiService(): AIMLService {
    return getAIMLService();
  }

  constructor() {
    this.debtPayoffService = new DebtPayoffService();
  }

  /**
   * Calculate debt snowball strategy (smallest balance first)
   */
  calculateSnowball(debts: Debt[], extraPayment: number): DebtPayoffPlan {
    const plan = this.debtPayoffService.calculatePayoffPlan(
      debts,
      'snowball',
      extraPayment
    );
    return this.convertToDebtPayoffPlan(plan, PayoffMethod.SNOWBALL, debts);
  }

  /**
   * Calculate debt avalanche strategy (highest interest first)
   */
  calculateAvalanche(debts: Debt[], extraPayment: number): DebtPayoffPlan {
    const plan = this.debtPayoffService.calculatePayoffPlan(
      debts,
      'avalanche',
      extraPayment
    );
    return this.convertToDebtPayoffPlan(plan, PayoffMethod.AVALANCHE, debts);
  }

  /**
   * Calculate AI-optimized hybrid strategy
   */
  async calculateAIOptimized(
    debts: Debt[],
    context: FinancialContext
  ): Promise<DebtPayoffPlan> {
    try {
      // Get hybrid plan as baseline
      const hybridPlan = this.debtPayoffService.calculatePayoffPlan(
        debts,
        'hybrid',
        context.transactions.netCashFlow * 0.2 // Use 20% of net cash flow
      );

      // Get AI insights for optimization
      const aiInsights = await this.getAIOptimizationInsights(debts, context);

      const plan = this.convertToDebtPayoffPlan(
        hybridPlan,
        PayoffMethod.AI_OPTIMIZED,
        debts
      );

      // Add AI insights
      plan.aiInsights = aiInsights;

      return plan;
    } catch (error) {
      console.error('AI optimization failed, falling back to hybrid:', error);
      // Fallback to hybrid strategy
      const hybridPlan = this.debtPayoffService.calculatePayoffPlan(
        debts,
        'hybrid',
        context.transactions.netCashFlow * 0.2
      );
      return this.convertToDebtPayoffPlan(
        hybridPlan,
        PayoffMethod.HYBRID,
        debts
      );
    }
  }

  /**
   * Compare all debt payoff strategies
   */
  async compareStrategies(
    debts: Debt[],
    extraPayment: number,
    context: FinancialContext
  ): Promise<DebtComparison> {
    const snowball = this.calculateSnowball(debts, extraPayment);
    const avalanche = this.calculateAvalanche(debts, extraPayment);
    const aiOptimized = await this.calculateAIOptimized(debts, context);

    const strategies = [snowball, avalanche, aiOptimized];

    // Determine recommendation
    const { method, reasoning } = this.determineRecommendation(
      strategies,
      context
    );

    return {
      userId: context.user.id,
      generatedAt: new Date(),
      strategies,
      recommendation: method,
      reasonForRecommendation: reasoning,
      potentialSavings: {
        snowballVsAvalanche:
          snowball.totalInterestPaid - avalanche.totalInterestPaid,
        aiOptimizedVsSnowball:
          snowball.totalInterestPaid - aiOptimized.totalInterestPaid,
        aiOptimizedVsAvalanche:
          avalanche.totalInterestPaid - aiOptimized.totalInterestPaid,
        bestVsWorst: this.calculateBestVsWorst(strategies, 'interest'),
      },
      timelineDifferences: {
        snowballVsAvalanche: snowball.totalMonths - avalanche.totalMonths,
        aiOptimizedVsSnowball: snowball.totalMonths - aiOptimized.totalMonths,
        aiOptimizedVsAvalanche:
          avalanche.totalMonths - aiOptimized.totalMonths,
        bestVsWorst: this.calculateBestVsWorst(strategies, 'timeline'),
      },
      insights: this.generateComparisonInsights(strategies),
      warnings: this.generateWarnings(debts, extraPayment, context),
    };
  }

  /**
   * Generate detailed payoff schedule
   */
  generatePayoffSchedule(
    debts: Debt[],
    strategy: DebtStrategy
  ): PayoffSchedule[] {
    const plan = this.debtPayoffService.calculatePayoffPlan(
      debts,
      this.convertPayoffMethodToStrategy(strategy.method),
      strategy.extraPayment
    );

    return plan.timeline.map((entry, index) => ({
      month: entry.month,
      date: entry.date,
      totalBalance: entry.totalBalance,
      totalPaid: entry.totalPaid,
      totalInterest: entry.totalInterest,
      totalPrincipal: entry.totalPaid - entry.totalInterest,
      debtBalances: entry.debtBalances,
      debtPayments: this.calculateDebtPayments(entry, debts),
      milestonesAchieved: this.getMilestonesForMonth(index, plan),
      debtsPaidOff: entry.debtsPaidOff,
    }));
  }

  /**
   * Calculate total interest for a payoff plan
   */
  calculateTotalInterest(debts: Debt[], payoffPlan: DebtPayoffPlan): number {
    return payoffPlan.totalInterestPaid;
  }

  /**
   * Estimate payoff time for a strategy
   */
  estimatePayoffTime(debts: Debt[], strategy: DebtStrategy): number {
    const plan = this.debtPayoffService.calculatePayoffPlan(
      debts,
      this.convertPayoffMethodToStrategy(strategy.method),
      strategy.extraPayment
    );
    return plan.totalMonths;
  }

  /**
   * Validate debt data
   */
  validateDebtData(debts: Debt[]): boolean {
    if (!debts || debts.length === 0) {
      return false;
    }

    return debts.every(
      (debt) =>
        debt.balance > 0 &&
        debt.interestRate >= 0 &&
        debt.interestRate <= 100 &&
        debt.minimumPayment > 0 &&
        debt.minimumPayment <= debt.balance
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Convert PayoffPlan to DebtPayoffPlan
   */
  private convertToDebtPayoffPlan(
    plan: PayoffPlan,
    method: PayoffMethod,
    debts: Debt[]
  ): DebtPayoffPlan {
    const userId = debts[0]?.userId || '';

    return {
      id: `plan-${Date.now()}-${method}`,
      userId,
      method,
      focus: this.getFocusForMethod(method),
      createdAt: new Date(),
      totalDebt: plan.totalDebt,
      totalMinimumPayments: plan.totalDebt / plan.totalMonths, // Approximation
      extraPayment: plan.extraPayment,
      totalMonthlyPayment: plan.monthlyPayment,
      startDate: new Date(),
      payoffDate: plan.payoffDate,
      totalMonths: plan.totalMonths,
      totalInterestPaid: plan.totalInterestPaid,
      totalAmountPaid: plan.totalAmountPaid,
      interestSaved: plan.interestSaved,
      monthsSaved: plan.monthsSaved,
      debtOrder: this.convertDebtOrder(plan.debtOrder, debts),
      schedule: this.convertSchedule(plan.timeline, debts),
      milestones: this.generateMilestones(plan, debts),
      motivationMetrics: this.calculateMotivationMetrics(plan, debts),
    };
  }

  /**
   * Get AI optimization insights
   */
  private async getAIOptimizationInsights(
    debts: Debt[],
    context: FinancialContext
  ): Promise<{
    reasoning: string;
    behavioralFactors: string[];
    confidenceScore: number;
    alternativeApproaches: string[];
  }> {
    try {
      const prompt = this.buildAIOptimizationPrompt(debts, context);
      const response = await this.aiService.chat(
        AI_MODEL,
        [
          {
            role: 'system',
            content:
              'You are a financial advisor specializing in debt payoff strategies. Analyze the user\'s debt situation and provide personalized recommendations.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, max_tokens: 1000 }
      );

      const content = response.choices[0]?.message?.content || '';
      return this.parseAIInsights(content);
    } catch (error) {
      console.error('Failed to get AI insights:', error);
      return {
        reasoning:
          'Using hybrid approach to balance interest savings and psychological wins.',
        behavioralFactors: ['Balanced approach', 'Steady progress'],
        confidenceScore: 0.7,
        alternativeApproaches: ['Pure avalanche', 'Pure snowball'],
      };
    }
  }

  /**
   * Build AI optimization prompt
   */
  private buildAIOptimizationPrompt(
    debts: Debt[],
    context: FinancialContext
  ): string {
    const debtSummary = debts
      .map(
        (d) =>
          `- ${d.name}: $${d.balance.toFixed(2)} at ${d.interestRate}% APR, minimum payment $${d.minimumPayment.toFixed(2)}`
      )
      .join('\n');

    return `Analyze this debt situation and recommend the optimal payoff strategy:

Debts:
${debtSummary}

Financial Context:
- Monthly Income: $${context.transactions.totalIncome.toFixed(2)}
- Monthly Expenses: $${Math.abs(context.transactions.totalExpenses).toFixed(2)}
- Net Cash Flow: $${context.transactions.netCashFlow.toFixed(2)}
- Emergency Fund: $${context.accounts.totalSavings.toFixed(2)}

Provide:
1. Reasoning for recommended approach
2. Key behavioral factors to consider
3. Confidence score (0-1)
4. Alternative approaches

Format as JSON:
{
  "reasoning": "...",
  "behavioralFactors": ["...", "..."],
  "confidenceScore": 0.85,
  "alternativeApproaches": ["...", "..."]
}`;
  }

  /**
   * Parse AI insights from response
   */
  private parseAIInsights(content: string): {
    reasoning: string;
    behavioralFactors: string[];
    confidenceScore: number;
    alternativeApproaches: string[];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          reasoning: parsed.reasoning || 'AI-optimized strategy',
          behavioralFactors: parsed.behavioralFactors || [],
          confidenceScore: parsed.confidenceScore || 0.8,
          alternativeApproaches: parsed.alternativeApproaches || [],
        };
      }
    } catch (error) {
      console.error('Failed to parse AI insights:', error);
    }

    // Fallback
    return {
      reasoning: content.substring(0, 200),
      behavioralFactors: ['Balanced approach'],
      confidenceScore: 0.7,
      alternativeApproaches: [],
    };
  }

  /**
   * Determine recommended strategy
   */
  private determineRecommendation(
    strategies: DebtPayoffPlan[],
    context: FinancialContext
  ): { method: PayoffMethod; reasoning: string } {
    const snowball = strategies.find((s) => s.method === PayoffMethod.SNOWBALL);
    const avalanche = strategies.find((s) => s.method === PayoffMethod.AVALANCHE);
    const aiOptimized = strategies.find(
      (s) => s.method === PayoffMethod.AI_OPTIMIZED
    );

    // If AI optimized is available and has high confidence, recommend it
    if (aiOptimized?.aiInsights && aiOptimized.aiInsights.confidenceScore > 0.8) {
      return {
        method: PayoffMethod.AI_OPTIMIZED,
        reasoning: aiOptimized.aiInsights.reasoning,
      };
    }

    // If user has high debt-to-income ratio, prioritize avalanche for savings
    const debtToIncome =
      context.debts.monthlyPayments / context.transactions.totalIncome;
    if (debtToIncome > 0.4 && avalanche) {
      return {
        method: PayoffMethod.AVALANCHE,
        reasoning:
          'High debt-to-income ratio detected. Avalanche method will save the most on interest.',
      };
    }

    // If user has many small debts, recommend snowball for motivation
    const smallDebts = context.debts.debts.filter((d) => d.balance < 2000);
    if (smallDebts.length >= 3 && snowball) {
      return {
        method: PayoffMethod.SNOWBALL,
        reasoning:
          'Multiple small debts detected. Snowball method will provide quick wins and motivation.',
      };
    }

    // Default to avalanche for maximum savings
    return {
      method: PayoffMethod.AVALANCHE,
      reasoning:
        'Avalanche method recommended for maximum interest savings over time.',
    };
  }

  /**
   * Calculate best vs worst difference
   */
  private calculateBestVsWorst(
    strategies: DebtPayoffPlan[],
    metric: 'interest' | 'timeline'
  ): number {
    if (metric === 'interest') {
      const interests = strategies.map((s) => s.totalInterestPaid);
      return Math.max(...interests) - Math.min(...interests);
    } else {
      const timelines = strategies.map((s) => s.totalMonths);
      return Math.max(...timelines) - Math.min(...timelines);
    }
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(strategies: DebtPayoffPlan[]): string[] {
    const insights: string[] = [];

    const snowball = strategies.find((s) => s.method === PayoffMethod.SNOWBALL);
    const avalanche = strategies.find((s) => s.method === PayoffMethod.AVALANCHE);

    if (snowball && avalanche) {
      const interestDiff = snowball.totalInterestPaid - avalanche.totalInterestPaid;
      const timeDiff = snowball.totalMonths - avalanche.totalMonths;

      if (Math.abs(interestDiff) < 100) {
        insights.push(
          'Interest difference between strategies is minimal - choose based on personal preference.'
        );
      } else if (interestDiff > 500) {
        insights.push(
          `Avalanche method could save you $${interestDiff.toFixed(2)} in interest.`
        );
      }

      if (Math.abs(timeDiff) <= 2) {
        insights.push('Both strategies have similar payoff timelines.');
      } else if (timeDiff > 6) {
        insights.push(
          `Avalanche method could pay off debt ${timeDiff} months faster.`
        );
      }

      // Check for quick wins
      if (snowball.motivationMetrics.quickWins >= 2) {
        insights.push(
          `Snowball method provides ${snowball.motivationMetrics.quickWins} quick wins in the first 6 months.`
        );
      }
    }

    return insights;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    debts: Debt[],
    extraPayment: number,
    context: FinancialContext
  ): string[] {
    const warnings: string[] = [];

    // Check if extra payment is too high
    const availableCashFlow = context.transactions.netCashFlow;
    if (extraPayment > availableCashFlow * 0.8) {
      warnings.push(
        'Extra payment is very high relative to cash flow. Ensure you maintain emergency fund.'
      );
    }

    // Check for high-interest debt
    const highInterestDebts = debts.filter((d) => d.interestRate > 20);
    if (highInterestDebts.length > 0) {
      warnings.push(
        `You have ${highInterestDebts.length} high-interest debt(s) above 20% APR. Consider balance transfer or consolidation.`
      );
    }

    // Check emergency fund
    if (context.accounts.totalSavings < context.transactions.totalIncome * 1) {
      warnings.push(
        'Build at least $1,000 emergency fund before aggressive debt payoff (Dave Ramsey Baby Step 1).'
      );
    }

    return warnings;
  }

  /**
   * Calculate debt payments for a timeline entry
   */
  private calculateDebtPayments(
    entry: PayoffTimelineEntry,
    debts: Debt[]
  ): Record<string, DebtPaymentDetail> {
    const payments: Record<string, DebtPaymentDetail> = {};

    debts.forEach((debt) => {
      const balance = entry.debtBalances[debt.id] || 0;
      const previousBalance =
        entry.month === 1 ? debt.balance : entry.debtBalances[debt.id] || 0;
      const payment = previousBalance - balance;
      const interest = (previousBalance * debt.interestRate) / 100 / 12;

      payments[debt.id] = {
        debtId: debt.id,
        debtName: debt.name,
        payment,
        interestPortion: interest,
        principalPortion: payment - interest,
        remainingBalance: balance,
        isPaidOff: balance === 0,
      };
    });

    return payments;
  }

  /**
   * Get milestones achieved in a specific month
   */
  private getMilestonesForMonth(
    monthIndex: number,
    plan: PayoffPlan
  ): string[] {
    // Simple milestone detection
    const milestones: string[] = [];

    if (monthIndex === 0) {
      milestones.push('Debt payoff journey started!');
    }

    if (monthIndex === 6) {
      milestones.push('6 months of consistent payments!');
    }

    if (monthIndex === 12) {
      milestones.push('1 year anniversary!');
    }

    return milestones;
  }

  /**
   * Convert debt order
   */
  private convertDebtOrder(
    order: BaseDebtPayoffOrder[],
    debts: Debt[]
  ): DebtPayoffOrder[] {
    return order.map((item, index) => {
      const debt = debts.find((d) => d.id === item.debtId);

      // Convert base debt type string to DebtType enum
      let debtType: DebtType = DebtType.OTHER;
      if (debt?.type) {
        const typeMap: Record<string, DebtType> = {
          'credit_card': DebtType.CREDIT_CARD,
          'student_loan': DebtType.STUDENT_LOAN,
          'personal_loan': DebtType.PERSONAL_LOAN,
          'mortgage': DebtType.MORTGAGE,
          'auto_loan': DebtType.AUTO_LOAN,
          'medical': DebtType.MEDICAL,
          'other': DebtType.OTHER,
        };
        debtType = typeMap[debt.type] || DebtType.OTHER;
      }

      return {
        debtId: item.debtId,
        debtName: item.debtName,
        debtType,
        balance: item.balance,
        interestRate: item.interestRate,
        minimumPayment: debt?.minimumPayment || 0,
        priority: item.priority,
        payoffMonth: item.payoffMonth,
        payoffDate: item.payoffDate,
        totalInterestPaid: item.totalInterestPaid,
        totalPaid: item.balance + item.totalInterestPaid,
        reasoning: `Priority ${index + 1} in payoff sequence`,
      };
    });
  }

  /**
   * Convert schedule
   */
  private convertSchedule(
    timeline: PayoffTimelineEntry[],
    debts: Debt[]
  ): PayoffSchedule[] {
    return timeline.map((entry, index) => ({
      month: entry.month,
      date: entry.date,
      totalBalance: entry.totalBalance,
      totalPaid: entry.totalPaid,
      totalInterest: entry.totalInterest,
      totalPrincipal: entry.totalPaid - entry.totalInterest,
      debtBalances: entry.debtBalances,
      debtPayments: this.calculateDebtPayments(entry, debts),
      milestonesAchieved: [],
      debtsPaidOff: entry.debtsPaidOff,
    }));
  }

  /**
   * Generate milestones
   */
  private generateMilestones(
    plan: PayoffPlan,
    debts: Debt[]
  ): PayoffMilestone[] {
    const milestones: PayoffMilestone[] = [];

    // First debt paid off
    if (plan.debtOrder.length > 0) {
      const firstDebt = plan.debtOrder[0];
      milestones.push({
        id: `milestone-first-debt`,
        type: 'debt_paid',
        target: firstDebt.debtId,
        achieved: false,
        projectedDate: firstDebt.payoffDate,
        description: `Pay off ${firstDebt.debtName}`,
      });
    }

    // 50% debt eliminated
    milestones.push({
      id: `milestone-50-percent`,
      type: 'percentage',
      target: 50,
      achieved: false,
      projectedDate: new Date(
        Date.now() + (plan.totalMonths / 2) * 30 * 24 * 60 * 60 * 1000
      ),
      description: 'Eliminate 50% of total debt',
    });

    // All debt paid off
    milestones.push({
      id: `milestone-debt-free`,
      type: 'percentage',
      target: 100,
      achieved: false,
      projectedDate: plan.payoffDate,
      description: 'Become completely debt-free!',
    });

    return milestones;
  }

  /**
   * Calculate motivation metrics
   */
  private calculateMotivationMetrics(
    plan: PayoffPlan,
    debts: Debt[]
  ): MotivationMetrics {
    // Count debts paid off in first 6 months
    const quickWins = plan.debtOrder.filter((d) => d.payoffMonth <= 6).length;

    const totalDebts = debts.filter((d) => d.isActive && d.balance > 0).length;
    const percentageComplete = 0; // Will be updated as user makes payments

    return {
      quickWins,
      totalDebtsEliminated: 0,
      percentageComplete,
      streakDays: 0,
      motivationScore: quickWins >= 2 ? 85 : quickWins >= 1 ? 70 : 60,
      psychologicalMomentum: quickWins >= 2 ? 'high' : quickWins >= 1 ? 'medium' : 'low',
      celebrationPoints: [],
    };
  }

  /**
   * Get focus for method
   */
  private getFocusForMethod(method: PayoffMethod): StrategyFocus {
    switch (method) {
      case PayoffMethod.SNOWBALL:
        return StrategyFocus.QUICK_WINS;
      case PayoffMethod.AVALANCHE:
        return StrategyFocus.INTEREST_SAVINGS;
      case PayoffMethod.AI_OPTIMIZED:
      case PayoffMethod.HYBRID:
        return StrategyFocus.BALANCED;
      default:
        return StrategyFocus.BALANCED;
    }
  }

  /**
   * Convert PayoffMethod to PayoffStrategy
   */
  private convertPayoffMethodToStrategy(method: PayoffMethod): PayoffStrategy {
    switch (method) {
      case PayoffMethod.SNOWBALL:
        return 'snowball';
      case PayoffMethod.AVALANCHE:
        return 'avalanche';
      case PayoffMethod.AI_OPTIMIZED:
      case PayoffMethod.HYBRID:
        return 'hybrid';
      default:
        return 'hybrid';
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const debtStrategyOptimizer = new DebtStrategyOptimizer();


