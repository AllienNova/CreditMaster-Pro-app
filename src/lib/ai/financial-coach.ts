/**
 * AI Financial Coach Service
 *
 * Provides personalized financial coaching based on Dave Ramsey's EveryDollar philosophy.
 * Helps users achieve financial freedom through proven Baby Steps framework.
 */

import { AIMLService } from '@/lib/aiml-service';
import { financialContextEngine } from '@/lib/financial/financial-context-engine';
import { FinancialContext } from '@/lib/financial/types/financial-context.types';
import {
  FINANCIAL_COACH_SYSTEM_PROMPT,
  ANALYSIS_SYSTEM_PROMPT,
  ACTION_PLAN_PROMPT,
  ADVICE_PROMPT,
  RECOMMENDATION_PROMPT,
} from './prompts/financial-coach-prompts';

// ============================================================================
// TYPES
// ============================================================================

export type BabyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type FocusArea =
  | 'debt_payoff'
  | 'emergency_fund'
  | 'budgeting'
  | 'income_increase'
  | 'expense_reduction'
  | 'investing'
  | 'overall';

export interface FinancialAnalysis {
  userId: string;
  currentBabyStep: BabyStep;
  babyStepProgress: BabyStepProgress;
  financialHealth: FinancialHealthAssessment;
  criticalIssues: CriticalIssue[];
  opportunities: Opportunity[];
  behavioralInsights: string[];
  nextSteps: string[];
  encouragement: string;
  generatedAt: Date;
}

export interface BabyStepProgress {
  step1: { complete: boolean; amount: number; target: 1000 };
  step2: { complete: boolean; debtsRemaining: number; totalDebt: number };
  step3: { complete: boolean; amount: number; target: number; months: number };
  step4: { complete: boolean; investmentRate: number; target: 0.15 };
  step5: { complete: boolean; collegeSavings: number };
  step6: { complete: boolean; mortgageBalance: number };
  step7: { complete: boolean; netWorth: number };
}

export interface FinancialHealthAssessment {
  score: number; // 0-100
  cashFlowStatus: 'positive' | 'neutral' | 'negative';
  debtStatus: 'debt_free' | 'manageable' | 'concerning' | 'crisis';
  savingsStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  budgetStatus: 'disciplined' | 'tracking' | 'loose' | 'none';
  summary: string;
}

export interface CriticalIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  impact: string;
  immediateAction: string;
}

export interface Opportunity {
  id: string;
  type: FocusArea;
  title: string;
  description: string;
  potentialBenefit: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  estimatedImpact: number; // dollars per month
  actionSteps: string[];
}

export interface ActionPlan {
  userId: string;
  title: string;
  startingBabyStep: BabyStep;
  targetBabyStep: BabyStep;
  estimatedTimeframe: string;
  milestones: Milestone[];
  weeklyActions: string[];
  monthlyReviews: string[];
  celebrationPoints: string[];
  generatedAt: Date;
}

export interface Milestone {
  id: string;
  babyStep: BabyStep;
  title: string;
  description: string;
  targetAmount?: number;
  targetDate?: Date;
  actions: string[];
  completed: boolean;
}

export interface PersonalizedAdvice {
  question: string;
  answer: string;
  relevantBabyStep: BabyStep;
  actionSteps: string[];
  resources: string[];
  encouragement: string;
  generatedAt: Date;
}

export interface ProactiveRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: FocusArea;
  title: string;
  description: string;
  benefit: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  timeline: string;
  actionSteps: string[];
  estimatedImpact: number;
}

// ============================================================================
// FINANCIAL COACH CLASS
// ============================================================================

const AI_MODEL = 'anthropic/claude-4.5-sonnet';

// Function to get AIMLService instance (allows for mocking in tests)
let aiServiceInstance: AIMLService | null = null;
export function getAIMLService(): AIMLService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIMLService();
  }
  return aiServiceInstance;
}

// Allow tests to override the AI service
export function setAIMLService(service: AIMLService): void {
  aiServiceInstance = service;
}

export class FinancialCoach {
  private get aiService(): AIMLService {
    return getAIMLService();
  }
  /**
   * Analyze user's complete financial situation
   */
  async analyzeFinancialSituation(
    userId: string,
    focusArea: FocusArea = 'overall'
  ): Promise<FinancialAnalysis> {
    // Get comprehensive financial context
    const context = await financialContextEngine.getFinancialContext(userId);

    // Determine current Baby Step
    const currentBabyStep = this.determineCurrentBabyStep(context);
    const babyStepProgress = this.calculateBabyStepProgress(context);

    // Assess financial health
    const financialHealth = this.assessFinancialHealth(context);

    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(context);

    // Find opportunities
    const opportunities = this.findOpportunities(context, focusArea);

    // Generate AI-powered insights
    const aiAnalysis = await this.generateAIAnalysis(
      context,
      currentBabyStep,
      focusArea
    );

    return {
      userId,
      currentBabyStep,
      babyStepProgress,
      financialHealth,
      criticalIssues,
      opportunities,
      behavioralInsights: aiAnalysis.behavioralInsights,
      nextSteps: aiAnalysis.nextSteps,
      encouragement: aiAnalysis.encouragement,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a personalized action plan
   */
  async generateActionPlan(
    userId: string,
    goals: string[],
    timeframe: string
  ): Promise<ActionPlan> {
    const context = await financialContextEngine.getFinancialContext(userId);
    const currentBabyStep = this.determineCurrentBabyStep(context);

    // Build prompt for AI
    const prompt = this.buildActionPlanPrompt(context, goals, timeframe);

    const response = await this.aiService.chat(
      AI_MODEL,
      [
        { role: 'system', content: ACTION_PLAN_PROMPT },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3, max_tokens: 2000 }
    );

    const aiPlan = this.parseActionPlanResponse(response.choices[0]?.message?.content || '');

    return {
      userId,
      title: `Financial Freedom Action Plan - ${timeframe}`,
      startingBabyStep: currentBabyStep,
      targetBabyStep: aiPlan.targetBabyStep || (currentBabyStep + 1) as BabyStep,
      estimatedTimeframe: timeframe,
      milestones: aiPlan.milestones,
      weeklyActions: aiPlan.weeklyActions,
      monthlyReviews: aiPlan.monthlyReviews,
      celebrationPoints: aiPlan.celebrationPoints,
      generatedAt: new Date(),
    };
  }

  /**
   * Get personalized advice for a specific question
   */
  async getPersonalizedAdvice(
    userId: string,
    question: string
  ): Promise<PersonalizedAdvice> {
    const context = await financialContextEngine.getFinancialContext(userId);
    const currentBabyStep = this.determineCurrentBabyStep(context);

    try {
      const prompt = this.buildAdvicePrompt(context, question);

      const response = await this.aiService.chat(
        AI_MODEL,
        [
          { role: 'system', content: FINANCIAL_COACH_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.4, max_tokens: 1500 }
      );

      const aiAdvice = this.parseAdviceResponse(response.choices[0]?.message?.content || '');

      return {
        question,
        answer: aiAdvice.answer,
        relevantBabyStep: aiAdvice.relevantBabyStep || currentBabyStep,
        actionSteps: aiAdvice.actionSteps,
        resources: aiAdvice.resources,
        encouragement: aiAdvice.encouragement,
        generatedAt: new Date(),
      };
    } catch (error) {
      // FinancialCoach error: AI advice failed
      // Return fallback advice
      return {
        question,
        answer: 'I recommend starting with the Baby Steps. First, save $1,000 for emergencies, then focus on paying off debt using the debt snowball method.',
        relevantBabyStep: currentBabyStep,
        actionSteps: [
          'Create a written budget',
          'Track all expenses for one month',
          'Identify areas to cut spending',
          'Start your emergency fund',
        ],
        resources: ['Dave Ramsey Baby Steps Guide', 'EveryDollar Budgeting App'],
        encouragement: 'You can do this! Small steps lead to big changes.',
        generatedAt: new Date(),
      };
    }
  }

  /**
   * Get proactive recommendations
   */
  async getProactiveRecommendations(
    userId: string
  ): Promise<ProactiveRecommendation[]> {
    const context = await financialContextEngine.getFinancialContext(userId);
    const opportunities = this.findOpportunities(context, 'overall');

    const prompt = this.buildRecommendationPrompt(context, opportunities);

    const response = await this.aiService.chat(
      AI_MODEL,
      [
        { role: 'system', content: RECOMMENDATION_PROMPT },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3, max_tokens: 1500 }
    );

    const aiRecs = this.parseRecommendationsResponse(response.choices[0]?.message?.content || '');

    return aiRecs.map((rec, index) => ({
      id: `rec_${Date.now()}_${index}`,
      priority: rec.priority || 'medium',
      category: rec.category || 'overall',
      title: rec.title,
      description: rec.description,
      benefit: rec.benefit,
      difficulty: rec.difficulty || 'moderate',
      timeline: rec.timeline,
      actionSteps: rec.actionSteps,
      estimatedImpact: rec.estimatedImpact || 0,
    }));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private determineCurrentBabyStep(context: FinancialContext): BabyStep {
    const savings = context.accounts.totalSavings;
    const debt = context.debts.totalDebt;
    const monthlyExpenses = Math.abs(context.transactions.totalExpenses);

    // Step 1: $1,000 emergency fund
    if (savings < 1000) return 1;

    // Step 2: Pay off all debt (except mortgage)
    if (debt > 0) return 2;

    // Step 3: 3-6 months emergency fund
    const emergencyFundTarget = monthlyExpenses * 3;
    if (savings < emergencyFundTarget) return 3;

    // Step 4+: Investing and beyond
    return 4;
  }

  private calculateBabyStepProgress(context: FinancialContext): BabyStepProgress {
    const savings = context.accounts.totalSavings;
    const debt = context.debts.totalDebt;
    const monthlyExpenses = Math.abs(context.transactions.totalExpenses);

    return {
      step1: {
        complete: savings >= 1000,
        amount: Math.min(savings, 1000),
        target: 1000,
      },
      step2: {
        complete: debt === 0,
        debtsRemaining: context.debts.debts.length,
        totalDebt: debt,
      },
      step3: {
        complete: savings >= monthlyExpenses * 3,
        amount: savings,
        target: monthlyExpenses * 6,
        months: savings / monthlyExpenses,
      },
      step4: {
        complete: false, // Would need investment data
        investmentRate: 0,
        target: 0.15,
      },
      step5: {
        complete: false,
        collegeSavings: 0,
      },
      step6: {
        complete: false,
        mortgageBalance: 0,
      },
      step7: {
        complete: false,
        netWorth: context.accounts.totalAssets - debt,
      },
    };
  }

  private assessFinancialHealth(context: FinancialContext): FinancialHealthAssessment {
    const income = context.transactions.totalIncome;
    const expenses = Math.abs(context.transactions.totalExpenses);
    const cashFlow = income - expenses;
    const debt = context.debts.totalDebt;
    const savings = context.accounts.totalSavings;

    let score = 50; // Start at neutral

    // Cash flow assessment
    const cashFlowStatus = cashFlow > 0 ? 'positive' : cashFlow === 0 ? 'neutral' : 'negative';
    if (cashFlow > income * 0.2) score += 20;
    else if (cashFlow > 0) score += 10;
    else if (cashFlow < 0) score -= 30;

    // Debt assessment
    let debtStatus: 'debt_free' | 'manageable' | 'concerning' | 'crisis';
    if (debt === 0) {
      debtStatus = 'debt_free';
      score += 20;
    } else if (debt < income * 0.5) {
      debtStatus = 'manageable';
      score += 5;
    } else if (debt < income * 2) {
      debtStatus = 'concerning';
      score -= 10;
    } else {
      debtStatus = 'crisis';
      score -= 25;
    }

    // Savings assessment
    let savingsStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
    if (savings >= expenses * 6) {
      savingsStatus = 'excellent';
      score += 20;
    } else if (savings >= expenses * 3) {
      savingsStatus = 'good';
      score += 10;
    } else if (savings >= 1000) {
      savingsStatus = 'fair';
      score += 5;
    } else if (savings > 0) {
      savingsStatus = 'poor';
    } else {
      savingsStatus = 'none';
      score -= 10;
    }

    const budgetStatus = context.budgets.length > 0 ? 'tracking' : 'none';

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      cashFlowStatus,
      debtStatus,
      savingsStatus,
      budgetStatus,
      summary: this.generateHealthSummary(score, cashFlowStatus, debtStatus, savingsStatus),
    };
  }

  private generateHealthSummary(
    score: number,
    cashFlow: string,
    debt: string,
    savings: string
  ): string {
    if (score >= 80) return 'Excellent financial health! You\'re on the path to financial freedom.';
    if (score >= 60) return 'Good financial foundation with room for improvement.';
    if (score >= 40) return 'Fair financial health. Focus on building momentum.';
    if (score >= 20) return 'Concerning financial situation. Immediate action needed.';
    return 'Financial crisis. Let\'s create an emergency action plan.';
  }

  private identifyCriticalIssues(context: FinancialContext): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    const income = context.transactions.totalIncome;
    const expenses = Math.abs(context.transactions.totalExpenses);
    const cashFlow = income - expenses;
    const savings = context.accounts.totalSavings;

    // Negative cash flow
    if (cashFlow < 0) {
      issues.push({
        id: 'negative_cashflow',
        severity: 'critical',
        title: 'Spending More Than You Earn',
        description: `You're spending $${Math.abs(cashFlow).toFixed(2)} more than you earn each month.`,
        impact: 'This will lead to increasing debt and financial crisis.',
        immediateAction: 'Create a zero-based budget and cut expenses immediately.',
      });
    }

    // No emergency fund
    if (savings < 1000) {
      issues.push({
        id: 'no_emergency_fund',
        severity: 'high',
        title: 'No Emergency Fund',
        description: 'You have less than $1,000 in savings.',
        impact: 'Any unexpected expense will force you into debt.',
        immediateAction: 'Save $1,000 as fast as possible (Baby Step 1).',
      });
    }

    // High-interest debt
    const highInterestDebt = context.debts.debts.filter(d => d.interestRate > 15);
    if (highInterestDebt.length > 0) {
      const totalHighInterest = highInterestDebt.reduce((sum, d) => sum + d.balance, 0);
      issues.push({
        id: 'high_interest_debt',
        severity: 'high',
        title: 'High-Interest Debt',
        description: `You have $${totalHighInterest.toFixed(2)} in debt with interest rates above 15%.`,
        impact: 'You\'re losing money to interest every month.',
        immediateAction: 'Stop using credit cards and start debt snowball method.',
      });
    }

    return issues;
  }

  private findOpportunities(context: FinancialContext, focusArea: FocusArea): Opportunity[] {
    const opportunities: Opportunity[] = [];
    const income = context.transactions.totalIncome;

    // Debt payoff opportunities (if user has debt)
    if (context.debts.totalDebt > 0 && (focusArea === 'debt_payoff' || focusArea === 'overall')) {
      const monthlyPayment = context.debts.monthlyPayments;
      const extraPayment = context.transactions.netCashFlow * 0.5; // Use 50% of cash flow for extra debt payment

      // Find smallest debt for debt snowball method
      const sortedDebts = [...context.debts.debts].sort((a, b) => a.balance - b.balance);
      const smallestDebt = sortedDebts[0];

      const title = smallestDebt
        ? `Pay Off ${smallestDebt.name} First (Debt Snowball)`
        : 'Accelerate Debt Payoff with Debt Snowball';

      const description = smallestDebt
        ? `Start with your smallest debt: ${smallestDebt.name} ($${smallestDebt.balance.toFixed(2)}). This is the debt snowball method.`
        : `You have $${context.debts.totalDebt.toFixed(2)} in debt. Use the debt snowball method to pay it off faster.`;

      opportunities.push({
        id: 'debt_snowball',
        type: 'debt_payoff',
        title,
        description,
        potentialBenefit: `Pay off debt ${Math.round((extraPayment / monthlyPayment) * 12)} months faster by adding $${extraPayment.toFixed(2)}/month to payments.`,
        difficulty: 'moderate',
        estimatedImpact: extraPayment,
        actionSteps: [
          'List all debts from smallest to largest balance',
          'Make minimum payments on all debts',
          `Put all extra money toward ${smallestDebt?.name || 'the smallest debt'}`,
          'Once smallest is paid, roll that payment to the next smallest',
        ],
      });
    }

    // Budget optimization opportunities
    for (const category of context.transactions.byCategory) {
      const expenseAmount = Math.abs(category.amount); // Use absolute value for expenses
      const percentOfIncome = expenseAmount / income;
      if (category.category === 'dining' && percentOfIncome > 0.10) {
        opportunities.push({
          id: `reduce_${category.category}`,
          type: 'expense_reduction',
          title: 'Reduce Dining Out',
          description: `You're spending ${(percentOfIncome * 100).toFixed(0)}% of income on dining out.`,
          potentialBenefit: `Save $${(expenseAmount * 0.5).toFixed(2)}/month by cooking at home.`,
          difficulty: 'moderate',
          estimatedImpact: expenseAmount * 0.5,
          actionSteps: [
            'Meal plan for the week',
            'Grocery shop with a list',
            'Limit dining out to once per week',
            'Pack lunches for work',
          ],
        });
      }
    }

    return opportunities.slice(0, 5); // Top 5 opportunities
  }

  private async generateAIAnalysis(
    context: FinancialContext,
    currentBabyStep: BabyStep,
    focusArea: FocusArea
  ): Promise<{ behavioralInsights: string[]; nextSteps: string[]; encouragement: string }> {
    const prompt = `Analyze this financial situation:

Income: $${context.transactions.totalIncome}/month
Expenses: $${Math.abs(context.transactions.totalExpenses)}/month
Savings: $${context.accounts.totalSavings}
Debt: $${context.debts.totalDebt}
Current Baby Step: ${currentBabyStep}
Focus Area: ${focusArea}

Provide:
1. 3 behavioral insights about their money habits
2. 3 specific next steps they should take
3. An encouraging message

Respond in JSON format with keys: behavioralInsights (array), nextSteps (array), encouragement (string)`;

    try {
      const response = await this.aiService.chat(
        AI_MODEL,
        [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, max_tokens: 1000 }
      );

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');

      return {
        behavioralInsights: parsed.behavioralInsights || [],
        nextSteps: parsed.nextSteps || [],
        encouragement: parsed.encouragement || 'You can do this! Every step forward is progress.',
      };
    } catch (error) {
      // FinancialCoach error: AI analysis failed
      return {
        behavioralInsights: ['Track every dollar', 'Build your emergency fund', 'Focus on one step at a time'],
        nextSteps: ['Create a budget', 'Save $1,000', 'List all debts'],
        encouragement: 'You can do this! Every step forward is progress.',
      };
    }
  }

  private buildActionPlanPrompt(context: FinancialContext, goals: string[], timeframe: string): string {
    return `Create a ${timeframe} action plan for someone with:
- Income: $${context.transactions.totalIncome}/month
- Expenses: $${Math.abs(context.transactions.totalExpenses)}/month
- Savings: $${context.accounts.totalSavings}
- Debt: $${context.debts.totalDebt}
- Goals: ${goals.join(', ')}

Use Dave Ramsey's Baby Steps framework. Provide specific milestones, weekly actions, and celebration points.`;
  }

  private buildAdvicePrompt(context: FinancialContext, question: string): string {
    return `User's financial situation:
- Monthly Income: $${context.transactions.totalIncome}
- Monthly Expenses: $${Math.abs(context.transactions.totalExpenses)}
- Savings: $${context.accounts.totalSavings}
- Total Debt: $${context.debts.totalDebt}

Question: ${question}

Provide personalized advice based on their actual numbers.`;
  }

  private buildRecommendationPrompt(context: FinancialContext, opportunities: Opportunity[]): string {
    return `Based on this financial profile:
- Income: $${context.transactions.totalIncome}/month
- Expenses: $${Math.abs(context.transactions.totalExpenses)}/month
- Savings: $${context.accounts.totalSavings}
- Debt: $${context.debts.totalDebt}

Identified opportunities:
${opportunities.map(o => `- ${o.title}: ${o.potentialBenefit}`).join('\n')}

Generate 3-5 prioritized recommendations with specific action steps.`;
  }

  private parseActionPlanResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // FinancialCoach error: Failed to parse action plan
    }

    return {
      targetBabyStep: 2,
      milestones: [],
      weeklyActions: ['Track all spending', 'Review budget', 'Find extra income'],
      monthlyReviews: ['Review progress', 'Adjust budget', 'Celebrate wins'],
      celebrationPoints: ['First $100 saved', 'First debt paid off', 'Emergency fund complete'],
    };
  }

  private parseAdviceResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // FinancialCoach error: Failed to parse advice
    }

    return {
      answer: content,
      relevantBabyStep: 1,
      actionSteps: ['Take action on this advice'],
      resources: [],
      encouragement: 'You\'re making great progress!',
    };
  }

  private parseRecommendationsResponse(content: string): any[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // FinancialCoach error: Failed to parse recommendations
    }

    return [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const financialCoach = new FinancialCoach();


