/**
 * Debt Strategy Engine
 *
 * AI-powered debt payoff strategies with:
 * - Avalanche method (highest interest first)
 * - Snowball method (smallest balance first)
 * - Hybrid approach
 * - Consolidation analysis
 * - Refinancing opportunities
 * - Payoff timeline projections
 */

import { AIMLService } from '@/lib/aiml-service';
import { financialContextEngine } from './financial-context-engine';
import { FinancialContext, DebtSummary } from './types/financial-context.types';
import {
  DebtStrategyAnalysis,
  DebtStrategyPlan,
  DebtMilestone,
  RefinancingOpportunity,
  AnalyzeDebtStrategyRequest,
} from './types/ai-coach.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = 'anthropic/claude-4.5-sonnet';

// Current average rates for refinancing comparison
const REFINANCING_RATES = {
  personal_loan: { excellent: 0.08, good: 0.12, fair: 0.18 },
  balance_transfer: { promotional: 0, standard: 0.15 },
  home_equity: { excellent: 0.06, good: 0.08, fair: 0.1 },
};

// ============================================================================
// DEBT STRATEGY ENGINE CLASS
// ============================================================================

class DebtStrategyEngine {
  private aimlService: AIMLService | null = null;

  private getAIService(): AIMLService | null {
    if (!this.aimlService && process.env.AIML_API_KEY) {
      try {
        this.aimlService = new AIMLService();
      } catch {
        console.warn('Failed to initialize AIML service for debt strategy');
      }
    }
    return this.aimlService;
  }

  /**
   * Analyze debt and generate strategy recommendations
   */
  async analyzeDebtStrategy(
    request: AnalyzeDebtStrategyRequest
  ): Promise<DebtStrategyAnalysis> {
    const {
      userId,
      extraMonthlyPayment = 0,
      includeRefinancing = true,
      targetPayoffDate,
    } = request;

    // Get user's financial context
    const context = await financialContextEngine.getFinancialContext(userId);
    const debts = context.debts;

    if (debts.totalDebt === 0) {
      return this.createDebtFreeAnalysis(userId);
    }

    // Calculate strategies
    const strategies: DebtStrategyPlan[] = [
      this.calculateAvalancheStrategy(debts, extraMonthlyPayment),
      this.calculateSnowballStrategy(debts, extraMonthlyPayment),
      this.calculateHybridStrategy(debts, extraMonthlyPayment),
    ];

    // Determine recommended strategy
    const { recommended, reason } = this.determineRecommendedStrategy(
      strategies,
      context
    );

    // Find refinancing opportunities
    const refinancingOpportunities = includeRefinancing
      ? this.findRefinancingOpportunities(
          debts,
          context.creditProfile.currentScore
        )
      : [];

    // Generate AI insights
    const aiInsights = await this.generateAIInsights(
      context,
      strategies,
      refinancingOpportunities
    );

    return {
      userId,
      generatedAt: new Date(),
      totalDebt: debts.totalDebt,
      debtCount: debts.debts.length,
      averageInterestRate: debts.averageInterestRate,
      monthlyPayments: debts.monthlyPayments,
      debtToIncomeRatio: debts.debtToIncomeRatio,
      strategies,
      recommendedStrategy: recommended,
      recommendationReason: reason,
      refinancingOpportunities,
      aiInsights,
      motivationalTips: this.getMotivationalTips(debts),
      warningFlags: this.getWarningFlags(debts, context),
    };
  }

  /**
   * Calculate Avalanche strategy (highest interest first)
   */
  private calculateAvalancheStrategy(
    debts: DebtSummary,
    extraPayment: number
  ): DebtStrategyPlan {
    const sortedDebts = [...debts.debts].sort(
      (a, b) => b.interestRate - a.interestRate
    );
    return this.calculatePayoffPlan(
      'avalanche',
      'Avalanche Method',
      'Pay off highest interest debt first to minimize total interest paid',
      sortedDebts,
      debts.monthlyPayments + extraPayment,
      extraPayment
    );
  }

  /**
   * Calculate Snowball strategy (smallest balance first)
   */
  private calculateSnowballStrategy(
    debts: DebtSummary,
    extraPayment: number
  ): DebtStrategyPlan {
    const sortedDebts = [...debts.debts].sort((a, b) => a.balance - b.balance);
    return this.calculatePayoffPlan(
      'snowball',
      'Snowball Method',
      'Pay off smallest balance first for quick wins and motivation',
      sortedDebts,
      debts.monthlyPayments + extraPayment,
      extraPayment
    );
  }

  /**
   * Calculate Hybrid strategy
   */
  private calculateHybridStrategy(
    debts: DebtSummary,
    extraPayment: number
  ): DebtStrategyPlan {
    // Hybrid: Start with smallest debt for quick win, then switch to avalanche
    const sortedDebts = [...debts.debts];
    const smallest = sortedDebts.reduce(
      (min, d) => (d.balance < min.balance ? d : min),
      sortedDebts[0]
    );
    const others = sortedDebts
      .filter((d) => d.id !== smallest.id)
      .sort((a, b) => b.interestRate - a.interestRate);
    const hybridOrder = [smallest, ...others];

    return this.calculatePayoffPlan(
      'hybrid',
      'Hybrid Method',
      'Quick win first, then focus on high interest',
      hybridOrder,
      debts.monthlyPayments + extraPayment,
      extraPayment
    );
  }

  /**
   * Calculate payoff plan for a given debt order
   */
  private calculatePayoffPlan(
    strategy: 'avalanche' | 'snowball' | 'hybrid' | 'consolidation',
    name: string,
    description: string,
    orderedDebts: Array<{
      id: string;
      name: string;
      balance: number;
      interestRate: number;
      minimumPayment: number;
    }>,
    totalMonthlyPayment: number,
    extraPayment: number
  ): DebtStrategyPlan {
    let remainingDebts = orderedDebts.map((d) => ({
      ...d,
      currentBalance: d.balance,
    }));
    let totalInterestPaid = 0;
    let month = 0;
    const milestones: DebtMilestone[] = [];
    let totalPaidOff = 0;
    let quickWins = 0;

    // Simulate payoff month by month
    while (remainingDebts.length > 0 && month < 360) {
      // Max 30 years
      month++;
      let availablePayment = totalMonthlyPayment;

      // Pay minimum on all debts first
      for (const debt of remainingDebts) {
        const interest = (debt.currentBalance * debt.interestRate) / 100 / 12;
        totalInterestPaid += interest;
        debt.currentBalance += interest;
        const payment = Math.min(debt.minimumPayment, debt.currentBalance);
        debt.currentBalance -= payment;
        availablePayment -= payment;
      }

      // Apply extra payment to first debt in order
      if (availablePayment > 0 && remainingDebts.length > 0) {
        const targetDebt = remainingDebts[0];
        const extraPay = Math.min(availablePayment, targetDebt.currentBalance);
        targetDebt.currentBalance -= extraPay;
      }

      // Check for paid off debts
      const paidOff = remainingDebts.filter((d) => d.currentBalance <= 0);
      for (const debt of paidOff) {
        totalPaidOff += debt.balance;
        if (month <= 6) quickWins++;
        milestones.push({
          month,
          date: this.addMonths(new Date(), month),
          event: `${debt.name} paid off!`,
          debtName: debt.name,
          totalPaidOff,
          remainingDebt:
            remainingDebts.reduce(
              (sum, d) => sum + Math.max(0, d.currentBalance),
              0
            ) - debt.balance,
          celebrationMessage: `🎉 ${debt.name} is paid off! Keep going!`,
        });
      }
      remainingDebts = remainingDebts.filter((d) => d.currentBalance > 0);
    }

    const totalDebt = orderedDebts.reduce((sum, d) => sum + d.balance, 0);
    const payoffDate = this.addMonths(new Date(), month);

    return {
      id: `strategy_${strategy}`,
      strategy,
      name,
      description,
      payoffDate,
      totalMonths: month,
      totalInterestPaid,
      totalAmountPaid: totalDebt + totalInterestPaid,
      interestSaved: 0, // Will be calculated by comparison
      monthsSaved: 0,
      requiredMonthlyPayment: totalMonthlyPayment,
      extraPaymentNeeded: extraPayment,
      milestones,
      advantages: this.getStrategyAdvantages(strategy),
      disadvantages: this.getStrategyDisadvantages(strategy),
      quickWins,
      motivationScore:
        strategy === 'snowball' ? 85 : strategy === 'hybrid' ? 75 : 65,
    };
  }

  private determineRecommendedStrategy(
    strategies: DebtStrategyPlan[],
    context: FinancialContext
  ): { recommended: string; reason: string } {
    const avalanche = strategies.find((s) => s.strategy === 'avalanche')!;
    const snowball = strategies.find((s) => s.strategy === 'snowball')!;

    const interestDiff =
      snowball.totalInterestPaid - avalanche.totalInterestPaid;
    const monthsDiff = snowball.totalMonths - avalanche.totalMonths;

    // If interest savings are significant, recommend avalanche
    if (interestDiff > 500) {
      return {
        recommended: 'avalanche',
        reason: `Saves $${interestDiff.toFixed(0)} in interest over snowball method`,
      };
    }
    // If user has high debt-to-income, recommend snowball for motivation
    if (context.debts.debtToIncomeRatio > 40) {
      return {
        recommended: 'snowball',
        reason: 'Quick wins help maintain motivation with high debt load',
      };
    }
    // Default to hybrid
    return {
      recommended: 'hybrid',
      reason: 'Balances quick wins with interest savings',
    };
  }

  private findRefinancingOpportunities(
    debts: DebtSummary,
    creditScore: number
  ): RefinancingOpportunity[] {
    const opportunities: RefinancingOpportunity[] = [];
    const creditTier =
      creditScore >= 740 ? 'excellent' : creditScore >= 670 ? 'good' : 'fair';

    // Filter for high interest debts (above 10% APR)
    const highInterestDebts = debts.debts.filter(
      (debt) => debt.interestRate > 10
    );

    for (const debt of highInterestDebts) {
      const potentialRate = REFINANCING_RATES.personal_loan[creditTier];
      if (debt.interestRate > potentialRate + 2) {
        // At least 2% savings
        const monthlySavings =
          (debt.balance * (debt.interestRate - potentialRate)) / 100 / 12;
        opportunities.push({
          debtId: debt.id,
          debtName: debt.name,
          currentRate: debt.interestRate,
          potentialRate,
          currentBalance: debt.balance,
          monthlySavings,
          totalSavings: monthlySavings * 36, // Assume 3 year term
          lenderType: 'online_lender',
          requirements: [
            'Good credit score',
            'Stable income',
            'Low debt-to-income ratio',
          ],
          considerations: [
            'May have origination fee',
            'Fixed vs variable rate',
          ],
        });
      }
    }
    return opportunities;
  }

  private async generateAIInsights(
    context: FinancialContext,
    strategies: DebtStrategyPlan[],
    refinancing: RefinancingOpportunity[]
  ): Promise<string[]> {
    const aiService = this.getAIService();
    if (!aiService) return this.getDefaultInsights(context.debts);

    try {
      const prompt = `Give 3 brief debt payoff tips for: $${context.debts.totalDebt} total debt, ${context.debts.debts.length} accounts, ${context.debts.averageInterestRate.toFixed(1)}% avg rate`;
      const response = await aiService.chat(
        AI_MODEL,
        [
          {
            role: 'system',
            content:
              'You are a debt counselor. Give 3 brief, actionable tips as a JSON array of strings.',
          },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, max_tokens: 200 }
      );
      const content = response.choices[0]?.message?.content || '';
      const match = content.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch {
      /* ignore */
    }
    return this.getDefaultInsights(context.debts);
  }

  // Helper methods
  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private getStrategyAdvantages(strategy: string): string[] {
    const advantages: Record<string, string[]> = {
      avalanche: [
        'Minimizes total interest paid',
        'Fastest debt-free date',
        'Mathematically optimal',
      ],
      snowball: [
        'Quick wins boost motivation',
        'Simplifies finances faster',
        'Psychological benefits',
      ],
      hybrid: [
        'Balance of savings and motivation',
        'Flexible approach',
        'Best of both methods',
      ],
    };
    return advantages[strategy] || [];
  }

  private getStrategyDisadvantages(strategy: string): string[] {
    const disadvantages: Record<string, string[]> = {
      avalanche: [
        'May take longer to see progress',
        'Can be demotivating',
        'Requires discipline',
      ],
      snowball: [
        'Pays more interest overall',
        'Slower debt-free date',
        'Not mathematically optimal',
      ],
      hybrid: ['More complex to follow', 'May not maximize either benefit'],
    };
    return disadvantages[strategy] || [];
  }

  private getMotivationalTips(debts: DebtSummary): string[] {
    // Calculate total debt from debts array
    const totalDebt = debts.debts.reduce((sum, debt) => sum + debt.balance, 0);
    const monthsToPayoff =
      debts.monthlyPayments > 0
        ? Math.ceil(totalDebt / debts.monthlyPayments)
        : 0;

    return [
      'Every payment brings you closer to freedom',
      'Track your progress weekly',
      'Celebrate each debt paid off',
      monthsToPayoff > 0
        ? `You can be debt-free in ${monthsToPayoff} months or less!`
        : 'Start making payments to see your payoff timeline',
    ];
  }

  private getWarningFlags(
    debts: DebtSummary,
    context: FinancialContext
  ): string[] {
    const flags: string[] = [];

    // Calculate total debt and debt-to-income ratio
    const totalDebt = debts.debts.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyIncome = context.transactions?.totalIncome || 0;
    const debtToIncomeRatio =
      monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;

    // Filter for high interest debts (above 10% APR)
    const highInterestDebts = debts.debts.filter(
      (debt) => debt.interestRate > 10
    );

    if (debtToIncomeRatio > 50)
      flags.push('High debt-to-income ratio - consider debt counseling');
    if (highInterestDebts.length > 0)
      flags.push('High interest debt is costing you significantly');
    if (context.accounts.totalSavings < 1000)
      flags.push('Build small emergency fund to avoid new debt');
    return flags;
  }

  private getDefaultInsights(_debts: DebtSummary): string[] {
    return [
      'Focus on one debt at a time',
      'Avoid taking on new debt',
      'Consider increasing income to accelerate payoff',
    ];
  }

  private createDebtFreeAnalysis(userId: string): DebtStrategyAnalysis {
    return {
      userId,
      generatedAt: new Date(),
      totalDebt: 0,
      debtCount: 0,
      averageInterestRate: 0,
      monthlyPayments: 0,
      debtToIncomeRatio: 0,
      strategies: [],
      recommendedStrategy: 'none',
      recommendationReason: 'Congratulations! You are debt-free!',
      refinancingOpportunities: [],
      aiInsights: [
        'Stay debt-free by building emergency fund',
        'Invest your former debt payments',
      ],
      motivationalTips: ['Great job staying debt-free!'],
      warningFlags: [],
    };
  }
}

// Export both class and instance for testing
export { DebtStrategyEngine };
export const debtStrategyEngine = new DebtStrategyEngine();
export default debtStrategyEngine;
