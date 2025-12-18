/**
 * Goal Planning Service
 * 
 * Intelligent financial goal planning with:
 * - Multiple goal types (emergency fund, debt payoff, savings, investment, etc.)
 * - Milestone tracking and progress visualization
 * - Timeline simulation and achievement predictions
 * - Automatic goal adjustments based on financial changes
 * - AI-powered recommendations
 */

import { getSupabase } from '@/lib/supabase/client';
import { AIMLService } from '@/lib/aiml-service';
import { financialContextEngine } from './financial-context-engine';
import { FinancialContext } from './types/financial-context.types';
import {
  GoalType,
  GoalStatus,
  FinancialGoalPlan,
  GoalMilestone,
  GoalAdjustment,
  GoalSimulation,
  GoalScenario,
  CreateGoalPlanRequest,
  SimulateGoalRequest,
} from './types/ai-coach.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_MODEL = 'anthropic/claude-4.5-sonnet';

const DEFAULT_MILESTONES = [
  { percentage: 25, name: '25% Complete', celebrationMessage: 'Great start! Keep going!' },
  { percentage: 50, name: 'Halfway There!', celebrationMessage: 'Amazing! You\'re halfway to your goal!' },
  { percentage: 75, name: '75% Complete', celebrationMessage: 'Almost there! The finish line is in sight!' },
  { percentage: 100, name: 'Goal Achieved!', celebrationMessage: 'Congratulations! You\'ve reached your goal! 🎉' },
];

const GOAL_TEMPLATES: Record<GoalType, { defaultMonths: number; suggestedSavingsRate: number }> = {
  emergency_fund: { defaultMonths: 12, suggestedSavingsRate: 0.15 },
  debt_payoff: { defaultMonths: 24, suggestedSavingsRate: 0.20 },
  savings: { defaultMonths: 12, suggestedSavingsRate: 0.10 },
  investment: { defaultMonths: 36, suggestedSavingsRate: 0.15 },
  major_purchase: { defaultMonths: 18, suggestedSavingsRate: 0.10 },
  retirement: { defaultMonths: 240, suggestedSavingsRate: 0.15 },
  education: { defaultMonths: 48, suggestedSavingsRate: 0.10 },
  vacation: { defaultMonths: 6, suggestedSavingsRate: 0.05 },
  home_down_payment: { defaultMonths: 36, suggestedSavingsRate: 0.15 },
  custom: { defaultMonths: 12, suggestedSavingsRate: 0.10 },
};

// ============================================================================
// GOAL PLANNER CLASS
// ============================================================================

class GoalPlanner {
  private aimlService: AIMLService | null = null;

  private getAIService(): AIMLService | null {
    if (!this.aimlService && process.env.AIML_API_KEY) {
      try {
        this.aimlService = new AIMLService();
      } catch {
        console.warn('Failed to initialize AIML service for goal planning');
      }
    }
    return this.aimlService;
  }

  /**
   * Create a new financial goal plan
   */
  async createGoalPlan(request: CreateGoalPlanRequest): Promise<FinancialGoalPlan> {
    const { userId, type, name, description, targetAmount, targetDate, priority = 3 } = request;

    // Get user's financial context for recommendations
    const context = await financialContextEngine.getFinancialContext(userId);

    // Calculate suggested contribution
    const monthsToGoal = this.calculateMonthsToDate(targetDate);
    const suggestedContribution = targetAmount / Math.max(monthsToGoal, 1);
    const template = GOAL_TEMPLATES[type];

    // Create milestones
    const milestones = this.createMilestones(targetAmount);

    // Calculate status
    const status = this.calculateGoalStatus(0, targetAmount, targetDate);

    // Generate AI recommendations
    const aiRecommendations = await this.generateAIRecommendations(
      type, targetAmount, monthsToGoal, context
    );

    const goalPlan: FinancialGoalPlan = {
      id: `goal_${Date.now()}`,
      userId,
      type,
      name,
      description,
      targetAmount,
      currentAmount: 0,
      startingAmount: 0,
      targetDate,
      startDate: new Date(),
      projectedCompletionDate: targetDate,
      progress: 0,
      status,
      milestones,
      monthlyContribution: request.monthlyContribution || suggestedContribution,
      suggestedContribution,
      contributionFrequency: 'monthly',
      linkedAccountId: request.linkedAccountId,
      autoSaveEnabled: request.autoSaveEnabled || false,
      aiRecommendations,
      adjustmentSuggestions: [],
      riskFactors: this.identifyRiskFactors(context, targetAmount, monthsToGoal),
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.saveGoalToDatabase(goalPlan);

    return goalPlan;
  }

  /**
   * Get all goals for a user
   */
  async getUserGoals(userId: string): Promise<FinancialGoalPlan[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
      return [];
    }

    return (data || []).map(this.mapDatabaseRowToGoal);
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    userId: string,
    goalId: string,
    newAmount: number
  ): Promise<FinancialGoalPlan | null> {
    const supabase = getSupabase();
    
    // Fetch current goal
    const { data: goal, error: fetchError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !goal) return null;

    const mappedGoal = this.mapDatabaseRowToGoal(goal);
    const progress = (newAmount / mappedGoal.targetAmount) * 100;
    const status = this.calculateGoalStatus(newAmount, mappedGoal.targetAmount, mappedGoal.targetDate);

    // Update milestones
    const updatedMilestones = mappedGoal.milestones.map((m) => ({
      ...m,
      isAchieved: progress >= m.targetPercentage,
      achievedDate: progress >= m.targetPercentage && !m.isAchieved ? new Date() : m.achievedDate,
    }));

    // Update in database
    const { error: updateError } = await supabase
      .from('financial_goals')
      .update({
        current_amount: newAmount,
        status,
        milestones: updatedMilestones,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', userId);

    if (updateError) return null;

    return {
      ...mappedGoal,
      currentAmount: newAmount,
      progress,
      status,
      milestones: updatedMilestones,
      updatedAt: new Date(),
    };
  }

  /**
   * Simulate different goal scenarios
   */
  async simulateGoal(request: SimulateGoalRequest): Promise<GoalSimulation> {
    const { goalId, scenarios: scenarioParams } = request;

    // Get the goal
    const supabase = getSupabase();
    const { data: goalData } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (!goalData) {
      throw new Error('Goal not found');
    }

    const goal = this.mapDatabaseRowToGoal(goalData);
    const remainingAmount = goal.targetAmount - goal.currentAmount;

    const scenarios: GoalScenario[] = scenarioParams.map((param, idx) => {
      const monthsToComplete = remainingAmount / param.monthlyContribution;
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsToComplete));

      return {
        id: `scenario_${idx}`,
        name: `Scenario ${idx + 1}: $${param.monthlyContribution}/month`,
        monthlyContribution: param.monthlyContribution,
        projectedCompletionDate: param.targetDate || completionDate,
        totalContributions: remainingAmount,
        probabilityOfSuccess: this.calculateSuccessProbability(
          param.monthlyContribution,
          goal.suggestedContribution
        ),
        assumptions: [
          'Consistent monthly contributions',
          'No withdrawals from goal',
          'No change in financial situation',
        ],
      };
    });

    // Recommend the scenario closest to suggested contribution
    const recommended = scenarios.reduce((best, current) =>
      Math.abs(current.monthlyContribution - goal.suggestedContribution) <
      Math.abs(best.monthlyContribution - goal.suggestedContribution)
        ? current
        : best
    );

    return {
      goalId,
      scenarios,
      recommendedScenario: recommended.id,
    };
  }

  /**
   * Get goal adjustment suggestions based on current progress
   */
  async getAdjustmentSuggestions(
    userId: string,
    goalId: string
  ): Promise<GoalAdjustment[]> {
    const goals = await this.getUserGoals(userId);
    const goal = goals.find((g) => g.id === goalId);

    if (!goal) return [];

    const adjustments: GoalAdjustment[] = [];
    const monthsRemaining = this.calculateMonthsToDate(goal.targetDate);
    const requiredMonthly = (goal.targetAmount - goal.currentAmount) / Math.max(monthsRemaining, 1);

    // Behind schedule - suggest increasing contribution
    if (goal.status === 'behind' && requiredMonthly > goal.monthlyContribution * 1.2) {
      adjustments.push({
        type: 'increase_contribution',
        reason: 'You\'re behind schedule on this goal',
        suggestedValue: requiredMonthly,
        impact: `Increasing to $${requiredMonthly.toFixed(0)}/month will get you back on track`,
      });
    }

    // Very behind - suggest extending timeline
    if (goal.status === 'behind' && requiredMonthly > goal.monthlyContribution * 2) {
      const newMonths = (goal.targetAmount - goal.currentAmount) / goal.monthlyContribution;
      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + Math.ceil(newMonths));

      adjustments.push({
        type: 'extend_timeline',
        reason: 'Current pace requires a longer timeline',
        suggestedValue: newMonths,
        impact: `Extend target date to ${newDate.toLocaleDateString()} with current contribution`,
      });
    }

    return adjustments;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateMonthsToDate(targetDate: Date): number {
    const now = new Date();
    const target = new Date(targetDate);
    return Math.max(
      1,
      (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
    );
  }

  private calculateGoalStatus(
    currentAmount: number,
    targetAmount: number,
    targetDate: Date
  ): GoalStatus {
    if (currentAmount >= targetAmount) return 'completed';

    const progress = currentAmount / targetAmount;
    const timeElapsed = this.calculateTimeElapsedPercentage(targetDate);

    if (progress >= 1) return 'completed';
    if (currentAmount === 0) return 'not_started';
    if (progress >= timeElapsed + 0.1) return 'ahead';
    if (progress >= timeElapsed - 0.1) return 'on_track';
    return 'behind';
  }

  private calculateTimeElapsedPercentage(targetDate: Date): number {
    const now = new Date();
    const target = new Date(targetDate);
    const start = new Date();
    start.setMonth(start.getMonth() - 1); // Assume started 1 month ago if no start date

    const totalDuration = target.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    return Math.min(1, Math.max(0, elapsed / totalDuration));
  }

  private createMilestones(targetAmount: number): GoalMilestone[] {
    return DEFAULT_MILESTONES.map((m, idx) => ({
      id: `milestone_${idx}`,
      name: m.name,
      targetAmount: targetAmount * (m.percentage / 100),
      targetPercentage: m.percentage,
      isAchieved: false,
      celebrationMessage: m.celebrationMessage,
    }));
  }

  private calculateSuccessProbability(contribution: number, suggested: number): number {
    const ratio = contribution / suggested;
    if (ratio >= 1.2) return 95;
    if (ratio >= 1) return 85;
    if (ratio >= 0.8) return 70;
    if (ratio >= 0.6) return 50;
    return 30;
  }

  private identifyRiskFactors(
    context: FinancialContext,
    targetAmount: number,
    months: number
  ): string[] {
    const risks: string[] = [];
    const requiredMonthly = targetAmount / months;

    if (requiredMonthly > context.transactions.netCashFlow) {
      risks.push('Monthly contribution exceeds current savings capacity');
    }
    if (context.debts.debtToIncomeRatio > 40) {
      risks.push('High debt-to-income ratio may impact ability to save');
    }
    if (context.accounts.totalSavings < context.transactions.totalExpenses * 3) {
      risks.push('Limited emergency fund - unexpected expenses may derail goal');
    }

    return risks;
  }

  private async generateAIRecommendations(
    goalType: GoalType,
    targetAmount: number,
    months: number,
    context: FinancialContext
  ): Promise<string[]> {
    const aiService = this.getAIService();
    if (!aiService) {
      return this.getDefaultRecommendations(goalType);
    }

    try {
      const prompt = `Generate 3 specific, actionable tips for achieving a ${goalType} goal of $${targetAmount} in ${months} months. User has: income $${context.transactions.totalIncome}/month, savings $${context.accounts.totalSavings}. Be concise.`;

      const response = await aiService.chat(AI_MODEL, [
        { role: 'system', content: 'You are a financial advisor. Provide brief, actionable tips. Respond with a JSON array of 3 strings.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.3, max_tokens: 500 });

      const content = response.choices[0]?.message?.content || '';
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) {
      console.warn('Failed to generate AI recommendations:', error);
    }

    return this.getDefaultRecommendations(goalType);
  }

  private getDefaultRecommendations(goalType: GoalType): string[] {
    const defaults: Record<GoalType, string[]> = {
      emergency_fund: ['Start with saving $1,000', 'Automate transfers on payday', 'Keep in high-yield savings'],
      debt_payoff: ['Pay more than minimum', 'Use avalanche or snowball method', 'Cut unnecessary expenses'],
      savings: ['Set up automatic transfers', 'Track spending weekly', 'Find one expense to cut'],
      investment: ['Start with index funds', 'Maximize employer 401k match', 'Reinvest dividends'],
      major_purchase: ['Research best prices', 'Wait for sales', 'Consider used options'],
      retirement: ['Max out employer match', 'Increase contribution annually', 'Diversify investments'],
      education: ['Research scholarships', 'Consider 529 plan', 'Compare schools by value'],
      vacation: ['Set a realistic budget', 'Book in advance', 'Use travel rewards'],
      home_down_payment: ['Save 20% to avoid PMI', 'Research first-time buyer programs', 'Improve credit score'],
      custom: ['Be specific about your goal', 'Break it into milestones', 'Track progress weekly'],
    };
    return defaults[goalType] || defaults.custom;
  }

  private async saveGoalToDatabase(goal: FinancialGoalPlan): Promise<void> {
    const supabase = getSupabase();
    await supabase.from('financial_goals').insert({
      id: goal.id,
      user_id: goal.userId,
      type: goal.type,
      name: goal.name,
      description: goal.description,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate.toISOString(),
      monthly_contribution: goal.monthlyContribution,
      auto_save_enabled: goal.autoSaveEnabled,
      linked_account_id: goal.linkedAccountId,
      priority: goal.priority,
      status: goal.status,
      milestones: goal.milestones,
      created_at: goal.createdAt.toISOString(),
      updated_at: goal.updatedAt.toISOString(),
    });
  }

  private mapDatabaseRowToGoal(row: Record<string, unknown>): FinancialGoalPlan {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as GoalType,
      name: row.name as string,
      description: row.description as string,
      targetAmount: Number(row.target_amount),
      currentAmount: Number(row.current_amount),
      startingAmount: 0,
      targetDate: new Date(row.target_date as string),
      startDate: new Date(row.created_at as string),
      projectedCompletionDate: new Date(row.target_date as string),
      progress: Number(row.current_amount) / Number(row.target_amount) * 100,
      status: row.status as GoalStatus,
      milestones: (row.milestones as GoalMilestone[]) || [],
      monthlyContribution: Number(row.monthly_contribution),
      suggestedContribution: Number(row.monthly_contribution),
      contributionFrequency: 'monthly',
      linkedAccountId: row.linked_account_id as string,
      autoSaveEnabled: row.auto_save_enabled as boolean,
      aiRecommendations: [],
      adjustmentSuggestions: [],
      riskFactors: [],
      priority: Number(row.priority) || 3,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const goalPlanner = new GoalPlanner();
export default goalPlanner;

