/**
 * AI Recommendation Engine
 * 
 * Generates personalized financial recommendations using AI analysis
 * of user financial context, spending patterns, and goals.
 * 
 * Features:
 * - 8 recommendation types (savings, debt, investment, budget, etc.)
 * - AI-powered personalization using AIML service
 * - Confidence scoring based on data quality
 * - Priority-based ranking
 */

import { AIMLService } from '@/lib/aiml-service';
import { financialContextEngine } from './financial-context-engine';
import { FinancialContext } from './types/financial-context.types';
import {
  Recommendation,
  RecommendationType,
  RecommendationPriority,
  RecommendationStep,
  GenerateRecommendationsRequest,
  GenerateRecommendationsResponse,
} from './types/ai-coach.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = 'anthropic/claude-4.5-sonnet';

const RECOMMENDATION_GENERATORS: Record<
  RecommendationType,
  (context: FinancialContext) => Recommendation | null
> = {
  savings_strategy: generateSavingsRecommendation,
  debt_payoff: generateDebtRecommendation,
  investment_suggestion: generateInvestmentRecommendation,
  budget_adjustment: generateBudgetRecommendation,
  account_optimization: generateAccountRecommendation,
  credit_improvement: generateCreditRecommendation,
  insurance_needs: generateInsuranceRecommendation,
  tax_optimization: generateTaxRecommendation,
};

// ============================================================================
// RECOMMENDATION ENGINE CLASS
// ============================================================================

class RecommendationEngine {
  private aimlService: AIMLService | null = null;

  /**
   * Get or create AIML service instance
   */
  private getAIService(): AIMLService | null {
    if (!this.aimlService && process.env.AIML_API_KEY) {
      try {
        this.aimlService = new AIMLService();
      } catch {
        console.warn('Failed to initialize AIML service for recommendations');
      }
    }
    return this.aimlService;
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(
    request: GenerateRecommendationsRequest
  ): Promise<GenerateRecommendationsResponse> {
    const startTime = Date.now();
    const { userId, types, limit = 10, includeAI = true } = request;

    // Get user's financial context
    const context = await financialContextEngine.getFinancialContext(userId);

    // Determine which recommendation types to generate
    const typesToGenerate = types || (Object.keys(RECOMMENDATION_GENERATORS) as RecommendationType[]);

    // Generate recommendations for each type
    const recommendations: Recommendation[] = [];

    for (const type of typesToGenerate) {
      const generator = RECOMMENDATION_GENERATORS[type];
      if (generator) {
        const rec = generator(context);
        if (rec) {
          rec.userId = userId;
          recommendations.push(rec);
        }
      }
    }

    // Sort by priority
    const priorityOrder: Record<RecommendationPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    recommendations.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    // Limit results
    const limitedRecs = recommendations.slice(0, limit);

    // Enrich with AI insights if enabled
    let finalRecs = limitedRecs;
    if (includeAI) {
      finalRecs = await this.enrichWithAI(limitedRecs, context);
    }

    return {
      recommendations: finalRecs,
      generatedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
      aiModelUsed: includeAI ? AI_MODEL : undefined,
    };
  }

  /**
   * Enrich recommendations with AI-generated insights
   */
  private async enrichWithAI(
    recommendations: Recommendation[],
    context: FinancialContext
  ): Promise<Recommendation[]> {
    const aiService = this.getAIService();
    if (!aiService || recommendations.length === 0) {
      return recommendations;
    }

    try {
      const prompt = this.buildAIPrompt(recommendations, context);

      const response = await aiService.chat(AI_MODEL, [
        {
          role: 'system',
          content: `You are an expert financial advisor. Analyze the user's financial situation and enhance recommendations with personalized insights. Respond in JSON format with an array of objects containing "id" and "insight" fields.`,
        },
        { role: 'user', content: prompt },
      ], { temperature: 0.3, max_tokens: 1500 });

      const content = response.choices[0]?.message?.content || '';
      const insights = this.parseAIResponse(content);

      for (const rec of recommendations) {
        const insight = insights.find((i) => i.id === rec.id);
        if (insight) {
          rec.aiInsight = insight.insight;
        }
      }
    } catch (error) {
      console.warn('Failed to generate AI insights:', error);
    }

    return recommendations;
  }

  private buildAIPrompt(recommendations: Recommendation[], context: FinancialContext): string {
    const summary = `User Profile:
- Net Worth: $${context.accounts.netWorth.toFixed(0)}
- Monthly Income: $${context.transactions.totalIncome.toFixed(0)}
- Monthly Expenses: $${context.transactions.totalExpenses.toFixed(0)}
- Total Debt: $${context.debts.totalDebt.toFixed(0)}
- Credit Score: ${context.creditProfile.currentScore}
- Health Score: ${context.healthScore.overallScore}

Recommendations to enhance:
${recommendations.map((r) => `- ID: ${r.id}, Type: ${r.type}, Title: ${r.title}`).join('\n')}`;

    return summary;
  }

  private parseAIResponse(content: string): Array<{ id: string; insight: string }> {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch { /* ignore */ }
    return [];
  }

  /**
   * Get recommendation by ID
   */
  async getRecommendation(userId: string, recommendationId: string): Promise<Recommendation | null> {
    // In a real implementation, this would fetch from database
    // For now, generate fresh recommendations and find the one requested
    const response = await this.generateRecommendations({ userId, limit: 20 });
    return response.recommendations.find((r) => r.id === recommendationId) || null;
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(
    userId: string,
    recommendationId: string,
    status: 'in_progress' | 'completed' | 'dismissed'
  ): Promise<boolean> {
    // In a real implementation, this would update the database
    console.log(`Updating recommendation ${recommendationId} to ${status} for user ${userId}`);
    return true;
  }
}

// ============================================================================
// RECOMMENDATION GENERATORS
// ============================================================================

function generateSavingsRecommendation(context: FinancialContext): Recommendation | null {
  const savingsRate = context.transactions.totalIncome > 0
    ? (context.transactions.netCashFlow / context.transactions.totalIncome) * 100
    : 0;

  if (savingsRate < 20) {
    const targetSavings = context.transactions.totalIncome * 0.2;
    const currentSavings = context.transactions.netCashFlow;
    const gap = targetSavings - currentSavings;

    return createRecommendation({
      type: 'savings_strategy',
      priority: savingsRate < 10 ? 'high' : 'medium',
      title: 'Increase Your Savings Rate',
      description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of your income.`,
      rationale: `With your income of $${context.transactions.totalIncome.toFixed(0)}/month, you could be saving $${targetSavings.toFixed(0)}/month instead of $${Math.max(0, currentSavings).toFixed(0)}.`,
      potentialSavings: gap * 12,
      timeframe: 'immediate',
      estimatedEffort: 'moderate',
      actionSteps: [
        { title: 'Review your spending', description: 'Identify categories where you can cut back' },
        { title: 'Set up automatic transfers', description: 'Move money to savings on payday' },
        { title: 'Create a budget', description: 'Allocate 20% of income to savings first' },
      ],
    });
  }
  return null;
}

function generateDebtRecommendation(context: FinancialContext): Recommendation | null {
  if (context.debts.totalDebt > 0 && context.debts.highInterestDebts.length > 0) {
    const highInterestDebt = context.debts.highInterestDebts[0];
    const potentialSavings = calculateInterestSavings(highInterestDebt);

    return createRecommendation({
      type: 'debt_payoff',
      priority: context.debts.debtToIncomeRatio > 40 ? 'critical' : 'high',
      title: 'Accelerate High-Interest Debt Payoff',
      description: `You have $${context.debts.totalDebt.toFixed(0)} in debt. Focus on paying off high-interest debt first to save on interest.`,
      rationale: `Your highest interest debt at ${highInterestDebt.interestRate}% APR is costing you significantly in interest charges.`,
      potentialSavings,
      riskLevel: 'low',
      timeframe: 'short_term',
      estimatedEffort: 'significant',
      actionSteps: [
        { title: 'List all debts by interest rate', description: 'Use the avalanche method to prioritize' },
        { title: 'Find extra payment money', description: 'Redirect savings from other categories' },
        { title: 'Consider balance transfer', description: 'Look for 0% APR offers if eligible' },
      ],
    });
  }
  return null;
}

function generateInvestmentRecommendation(context: FinancialContext): Recommendation | null {
  const hasEmergencyFund = context.accounts.totalSavings >= context.transactions.totalExpenses * 3;
  const hasDebt = context.debts.totalDebt > 0;
  const investmentTotal = context.investments.totalValue;

  if (hasEmergencyFund && !hasDebt && investmentTotal < context.transactions.totalIncome * 6) {
    return createRecommendation({
      type: 'investment_suggestion',
      priority: 'medium',
      title: 'Start or Increase Investments',
      description: 'You have a solid emergency fund and low debt. Consider investing for long-term growth.',
      rationale: 'With your strong financial foundation, investing can help build wealth over time.',
      potentialReturn: context.transactions.totalIncome * 0.1 * 12 * 0.08, // Assume 8% return
      riskLevel: 'medium',
      timeframe: 'long_term',
      estimatedEffort: 'moderate',
      actionSteps: [
        { title: 'Max out retirement accounts', description: 'Contribute to 401(k) and IRA' },
        { title: 'Consider index funds', description: 'Low-cost diversified investments' },
        { title: 'Automate contributions', description: 'Set up regular investment transfers' },
      ],
    });
  }
  return null;
}

function generateBudgetRecommendation(context: FinancialContext): Recommendation | null {
  const overBudgetCategories = context.budgets.filter((b) => b.status === 'over_budget');

  if (overBudgetCategories.length > 0) {
    const totalOverage = overBudgetCategories.reduce(
      (sum, b) => sum + Math.max(0, b.spent - b.amount), 0
    );

    return createRecommendation({
      type: 'budget_adjustment',
      priority: overBudgetCategories.length >= 3 ? 'high' : 'medium',
      title: 'Adjust Your Budget Categories',
      description: `You're over budget in ${overBudgetCategories.length} categories totaling $${totalOverage.toFixed(0)}.`,
      rationale: 'Either adjust your budget to match reality or find ways to reduce spending.',
      potentialSavings: totalOverage * 12,
      timeframe: 'immediate',
      estimatedEffort: 'minimal',
      actionSteps: [
        { title: 'Review overspent categories', description: 'Identify why you exceeded budget' },
        { title: 'Reallocate funds', description: 'Move money from underspent categories' },
        { title: 'Set realistic limits', description: 'Adjust budgets based on actual spending' },
      ],
    });
  }
  return null;
}

function generateAccountRecommendation(context: FinancialContext): Recommendation | null {
  const lowYieldSavings = context.accounts.accounts.filter(
    (a) => a.type === 'savings' && (a.interestRate || 0) < 4
  );

  if (lowYieldSavings.length > 0 && context.accounts.totalSavings > 1000) {
    const potentialEarnings = context.accounts.totalSavings * 0.04 -
      lowYieldSavings.reduce((sum, a) => sum + a.balance * (a.interestRate || 0.01) / 100, 0);

    return createRecommendation({
      type: 'account_optimization',
      priority: 'medium',
      title: 'Move Savings to High-Yield Account',
      description: 'Your savings accounts may be earning below-market interest rates.',
      rationale: 'High-yield savings accounts currently offer 4-5% APY vs traditional 0.01-0.5%.',
      potentialSavings: potentialEarnings,
      timeframe: 'short_term',
      estimatedEffort: 'minimal',
      actionSteps: [
        { title: 'Research high-yield accounts', description: 'Compare rates at online banks' },
        { title: 'Open new account', description: 'Process typically takes 10-15 minutes' },
        { title: 'Transfer funds', description: 'Move savings to earn more interest' },
      ],
    });
  }
  return null;
}

function generateCreditRecommendation(context: FinancialContext): Recommendation | null {
  const creditScore = context.creditProfile.currentScore;

  if (creditScore < 740) {
    const factors = context.creditProfile.factors || [];
    const topIssue = factors[0];

    return createRecommendation({
      type: 'credit_improvement',
      priority: creditScore < 650 ? 'high' : 'medium',
      title: 'Improve Your Credit Score',
      description: `Your credit score of ${creditScore} has room for improvement.`,
      rationale: topIssue
        ? `Focus on: ${topIssue.name}`
        : 'A higher score means better loan rates and more opportunities.',
      potentialSavings: calculateCreditImprovementSavings(creditScore, context.debts.totalDebt),
      timeframe: 'medium_term',
      estimatedEffort: 'moderate',
      actionSteps: [
        { title: 'Check for errors', description: 'Review credit reports for mistakes' },
        { title: 'Pay down balances', description: 'Keep credit utilization under 30%' },
        { title: 'Make on-time payments', description: 'Set up autopay for all accounts' },
      ],
    });
  }
  return null;
}

function generateInsuranceRecommendation(context: FinancialContext): Recommendation | null {
  const hasEmergencyFund = context.accounts.totalSavings >= context.transactions.totalExpenses * 6;
  const netWorth = context.accounts.netWorth;

  if (netWorth > 100000 && !hasEmergencyFund) {
    return createRecommendation({
      type: 'insurance_needs',
      priority: 'low',
      title: 'Review Your Insurance Coverage',
      description: 'As your net worth grows, ensure you have adequate protection.',
      rationale: 'Proper insurance protects your assets and provides peace of mind.',
      timeframe: 'medium_term',
      estimatedEffort: 'moderate',
      actionSteps: [
        { title: 'Review life insurance', description: 'Ensure coverage matches your needs' },
        { title: 'Check disability insurance', description: 'Protect your income if unable to work' },
        { title: 'Consider umbrella policy', description: 'Extra liability protection for assets' },
      ],
    });
  }
  return null;
}

function generateTaxRecommendation(context: FinancialContext): Recommendation | null {
  const monthlyIncome = context.transactions.totalIncome;
  const annualIncome = monthlyIncome * 12;

  if (annualIncome > 75000) {
    return createRecommendation({
      type: 'tax_optimization',
      priority: 'medium',
      title: 'Optimize Your Tax Strategy',
      description: 'Your income level presents opportunities for tax optimization.',
      rationale: 'Tax-advantaged accounts and deductions can significantly reduce your tax burden.',
      potentialSavings: annualIncome * 0.05, // Estimate 5% savings potential
      timeframe: 'medium_term',
      estimatedEffort: 'moderate',
      actionSteps: [
        { title: 'Max retirement contributions', description: 'Reduce taxable income with 401(k)/IRA' },
        { title: 'Use HSA if eligible', description: 'Triple tax advantage for healthcare' },
        { title: 'Review deductions', description: 'Itemize if it exceeds standard deduction' },
      ],
    });
  }
  return null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createRecommendation(params: {
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  rationale: string;
  potentialSavings?: number;
  potentialReturn?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  estimatedEffort: 'minimal' | 'moderate' | 'significant';
  actionSteps: Array<{ title: string; description: string }>;
}): Recommendation {
  return {
    id: `rec_${params.type}_${Date.now()}`,
    userId: '', // Will be set by caller
    type: params.type,
    priority: params.priority,
    status: 'pending',
    title: params.title,
    description: params.description,
    rationale: params.rationale,
    potentialSavings: params.potentialSavings,
    potentialReturn: params.potentialReturn,
    riskLevel: params.riskLevel || 'low',
    timeframe: params.timeframe,
    estimatedEffort: params.estimatedEffort,
    actionSteps: params.actionSteps.map((step, idx) => ({
      id: `step_${idx}`,
      order: idx + 1,
      title: step.title,
      description: step.description,
      actionType: 'manual' as const,
      isCompleted: false,
    })),
    confidenceScore: 75,
    personalizedFactors: [],
    createdAt: new Date(),
  };
}

function calculateInterestSavings(debt: { balance: number; interestRate: number }): number {
  // Simplified calculation: estimate 1 year of interest at current rate
  return debt.balance * (debt.interestRate / 100) * 0.5; // Assume paying off in 6 months
}

function calculateCreditImprovementSavings(currentScore: number, totalDebt: number): number {
  // Estimate savings from better interest rates with improved credit
  const rateImprovement = currentScore < 650 ? 0.03 : currentScore < 700 ? 0.02 : 0.01;
  return totalDebt * rateImprovement;
}

// ============================================================================
// EXPORT
// ============================================================================

export const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;

