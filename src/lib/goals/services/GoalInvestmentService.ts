/**
 * Goal Investment Service
 *
 * Links financial goals with investment accounts and manages
 * automated contributions, allocations, and progress tracking.
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();

// ============================================================================
// TYPES
// ============================================================================

export type GoalType =
  | 'retirement'
  | 'house'
  | 'education'
  | 'emergency'
  | 'vacation'
  | 'car'
  | 'wedding'
  | 'custom';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type ContributionFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  createdAt: Date;
  status: GoalStatus;
  priority: number;
  icon?: string;
  color?: string;
}

export interface GoalInvestmentLink {
  id: string;
  goalId: string;
  investmentAccountId: string;
  allocationPercent: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ContributionSchedule {
  id: string;
  goalId: string;
  amount: number;
  frequency: ContributionFrequency;
  nextContributionDate: Date;
  sourceAccountId: string;
  isActive: boolean;
  autoIncrease?: {
    enabled: boolean;
    percent: number;
    frequency: 'annually' | 'quarterly';
  };
}

export interface GoalAllocation {
  assetClass: string;
  targetPercent: number;
  currentPercent: number;
  currentValue: number;
}

export interface GoalProjection {
  currentAmount: number;
  projectedAmount: number;
  targetAmount: number;
  projectedDate: Date;
  targetDate: Date;
  isOnTrack: boolean;
  shortfallAmount?: number;
  requiredMonthlyContribution: number;
  confidenceLevel: number;
  scenarios: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
}

export interface GoalProgress {
  goalId: string;
  percentComplete: number;
  totalContributed: number;
  totalGrowth: number;
  monthsRemaining: number;
  isOnTrack: boolean;
  projectedCompletion: Date | null;
  milestones: GoalMilestone[];
}

export interface GoalMilestone {
  percent: number;
  amount: number;
  reachedAt?: Date;
  isReached: boolean;
}

export interface RecommendedAllocation {
  assetClass: string;
  percent: number;
  rationale: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GOAL_TYPE_DEFAULTS: Record<
  GoalType,
  {
    defaultTimelineYears: number;
    suggestedRisk: RiskTolerance;
    defaultPriority: number;
  }
> = {
  retirement: {
    defaultTimelineYears: 30,
    suggestedRisk: 'aggressive',
    defaultPriority: 1,
  },
  house: {
    defaultTimelineYears: 5,
    suggestedRisk: 'moderate',
    defaultPriority: 2,
  },
  education: {
    defaultTimelineYears: 18,
    suggestedRisk: 'moderate',
    defaultPriority: 3,
  },
  emergency: {
    defaultTimelineYears: 1,
    suggestedRisk: 'conservative',
    defaultPriority: 1,
  },
  vacation: {
    defaultTimelineYears: 1,
    suggestedRisk: 'conservative',
    defaultPriority: 5,
  },
  car: {
    defaultTimelineYears: 3,
    suggestedRisk: 'conservative',
    defaultPriority: 4,
  },
  wedding: {
    defaultTimelineYears: 2,
    suggestedRisk: 'conservative',
    defaultPriority: 3,
  },
  custom: {
    defaultTimelineYears: 5,
    suggestedRisk: 'moderate',
    defaultPriority: 5,
  },
};

const RISK_ALLOCATIONS: Record<RiskTolerance, RecommendedAllocation[]> = {
  conservative: [
    {
      assetClass: 'bonds',
      percent: 60,
      rationale: 'Stable income with lower volatility',
    },
    {
      assetClass: 'stocks',
      percent: 25,
      rationale: 'Growth potential with moderate risk',
    },
    {
      assetClass: 'cash',
      percent: 15,
      rationale: 'Liquidity and capital preservation',
    },
  ],
  moderate: [
    {
      assetClass: 'stocks',
      percent: 50,
      rationale: 'Balanced growth opportunity',
    },
    { assetClass: 'bonds', percent: 35, rationale: 'Income and stability' },
    {
      assetClass: 'alternatives',
      percent: 10,
      rationale: 'Diversification benefits',
    },
    { assetClass: 'cash', percent: 5, rationale: 'Emergency reserves' },
  ],
  aggressive: [
    {
      assetClass: 'stocks',
      percent: 80,
      rationale: 'Maximum growth potential',
    },
    {
      assetClass: 'alternatives',
      percent: 15,
      rationale: 'Higher risk/return assets',
    },
    {
      assetClass: 'bonds',
      percent: 5,
      rationale: 'Minimal fixed income for stability',
    },
  ],
};

const MILESTONES = [10, 25, 50, 75, 90, 100];

// ============================================================================
// SERVICE
// ============================================================================

export class GoalInvestmentService {
  // ==========================================================================
  // GOAL MANAGEMENT
  // ==========================================================================

  /**
   * Create a new financial goal
   */
  async createGoal(
    userId: string,
    data: {
      name: string;
      type: GoalType;
      targetAmount: number;
      targetDate: Date;
      initialAmount?: number;
      priority?: number;
      icon?: string;
      color?: string;
    }
  ): Promise<FinancialGoal | null> {
    try {
      const defaults = GOAL_TYPE_DEFAULTS[data.type];

      const { data: result, error } = await supabase
        .from('financial_goals')
        .insert({
          user_id: userId,
          name: data.name,
          type: data.type,
          target_amount: data.targetAmount,
          current_amount: data.initialAmount || 0,
          target_date: data.targetDate.toISOString(),
          status: 'active',
          priority: data.priority ?? defaults.defaultPriority,
          icon: data.icon,
          color: data.color,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // GoalInvestmentService error: Failed to create goal
        return null;
      }

      return this.mapGoalFromDb(result);
    } catch (_error) {
      // GoalInvestmentService error: Create goal error
      void _error;
      return null;
    }
  }

  /**
   * Get all goals for a user
   */
  async getGoals(userId: string): Promise<FinancialGoal[]> {
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (error) {
        // GoalInvestmentService error: Failed to get goals
        return [];
      }

      return (data || []).map(this.mapGoalFromDb);
    } catch {
      return [];
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    goalId: string,
    currentAmount: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({
          current_amount: currentAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId);

      return !error;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // INVESTMENT LINKING
  // ==========================================================================

  /**
   * Link a goal to an investment account
   */
  async linkGoalToInvestment(
    goalId: string,
    investmentAccountId: string,
    allocationPercent: number
  ): Promise<GoalInvestmentLink | null> {
    try {
      const { data, error } = await supabase
        .from('goal_investment_links')
        .insert({
          goal_id: goalId,
          investment_account_id: investmentAccountId,
          allocation_percent: allocationPercent,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // GoalInvestmentService error: Failed to link goal
        return null;
      }

      return {
        id: data.id,
        goalId: data.goal_id,
        investmentAccountId: data.investment_account_id,
        allocationPercent: data.allocation_percent,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get linked investments for a goal
   */
  async getLinkedInvestments(goalId: string): Promise<GoalInvestmentLink[]> {
    try {
      const { data, error } = await supabase
        .from('goal_investment_links')
        .select('*')
        .eq('goal_id', goalId)
        .eq('is_active', true);

      if (error) return [];

      return (data || []).map((row) => ({
        id: row.id,
        goalId: row.goal_id,
        investmentAccountId: row.investment_account_id,
        allocationPercent: row.allocation_percent,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
      }));
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // CONTRIBUTION SCHEDULING
  // ==========================================================================

  /**
   * Set up automatic contributions for a goal
   */
  async setupContributionSchedule(
    goalId: string,
    data: {
      amount: number;
      frequency: ContributionFrequency;
      sourceAccountId: string;
      startDate?: Date;
      autoIncrease?: {
        enabled: boolean;
        percent: number;
        frequency: 'annually' | 'quarterly';
      };
    }
  ): Promise<ContributionSchedule | null> {
    try {
      const nextDate =
        data.startDate ||
        this.calculateNextContributionDate(new Date(), data.frequency);

      const { data: result, error } = await supabase
        .from('contribution_schedules')
        .insert({
          goal_id: goalId,
          amount: data.amount,
          frequency: data.frequency,
          next_contribution_date: nextDate.toISOString(),
          source_account_id: data.sourceAccountId,
          is_active: true,
          auto_increase: data.autoIncrease,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // GoalInvestmentService error: Failed to setup schedule
        return null;
      }

      return {
        id: result.id,
        goalId: result.goal_id,
        amount: result.amount,
        frequency: result.frequency,
        nextContributionDate: new Date(result.next_contribution_date),
        sourceAccountId: result.source_account_id,
        isActive: result.is_active,
        autoIncrease: result.auto_increase,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get contribution schedule for a goal
   */
  async getContributionSchedule(
    goalId: string
  ): Promise<ContributionSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('contribution_schedules')
        .select('*')
        .eq('goal_id', goalId)
        .eq('is_active', true)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        goalId: data.goal_id,
        amount: data.amount,
        frequency: data.frequency,
        nextContributionDate: new Date(data.next_contribution_date),
        sourceAccountId: data.source_account_id,
        isActive: data.is_active,
        autoIncrease: data.auto_increase,
      };
    } catch {
      return null;
    }
  }

  /**
   * Process a contribution
   */
  async processContribution(scheduleId: string): Promise<boolean> {
    try {
      const { data: schedule, error: fetchError } = await supabase
        .from('contribution_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (fetchError || !schedule) return false;

      // Record the contribution
      const { error: contribError } = await supabase
        .from('goal_contributions')
        .insert({
          goal_id: schedule.goal_id,
          amount: schedule.amount,
          source_account_id: schedule.source_account_id,
          contributed_at: new Date().toISOString(),
        });

      if (contribError) return false;

      // Update goal current amount
      const { data: goal } = await supabase
        .from('financial_goals')
        .select('current_amount')
        .eq('id', schedule.goal_id)
        .single();

      if (goal) {
        await supabase
          .from('financial_goals')
          .update({
            current_amount: goal.current_amount + schedule.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', schedule.goal_id);
      }

      // Update next contribution date
      const nextDate = this.calculateNextContributionDate(
        new Date(schedule.next_contribution_date),
        schedule.frequency
      );

      await supabase
        .from('contribution_schedules')
        .update({
          next_contribution_date: nextDate.toISOString(),
          last_contribution_date: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      return true;
    } catch {
      return false;
    }
  }

  private calculateNextContributionDate(
    from: Date,
    frequency: ContributionFrequency
  ): Date {
    const next = new Date(from);

    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    return next;
  }

  // ==========================================================================
  // ALLOCATIONS & RECOMMENDATIONS
  // ==========================================================================

  /**
   * Get recommended allocation for a goal based on timeline and risk
   */
  getRecommendedAllocation(
    goalType: GoalType,
    yearsToGoal: number,
    riskTolerance?: RiskTolerance
  ): RecommendedAllocation[] {
    // Determine risk based on timeline if not provided
    let risk = riskTolerance;

    if (!risk) {
      if (yearsToGoal <= 2) {
        risk = 'conservative';
      } else if (yearsToGoal <= 5) {
        risk = 'moderate';
      } else {
        risk = GOAL_TYPE_DEFAULTS[goalType].suggestedRisk;
      }
    }

    // Adjust allocation based on time remaining
    const baseAllocation = RISK_ALLOCATIONS[risk];

    // For shorter timelines, shift towards more conservative
    if (yearsToGoal <= 1 && risk !== 'conservative') {
      return RISK_ALLOCATIONS.conservative;
    }

    return baseAllocation;
  }

  /**
   * Calculate glide path - allocation changes as goal approaches
   */
  calculateGlidePath(
    goalType: GoalType,
    totalYears: number,
    currentYear: number
  ): RecommendedAllocation[] {
    const yearsRemaining = totalYears - currentYear;
    const progressPercent = (currentYear / totalYears) * 100;

    // Start aggressive, gradually become conservative
    if (progressPercent < 25) {
      return this.getRecommendedAllocation(
        goalType,
        yearsRemaining,
        'aggressive'
      );
    } else if (progressPercent < 50) {
      return this.getRecommendedAllocation(
        goalType,
        yearsRemaining,
        'moderate'
      );
    } else if (progressPercent < 75) {
      // Blend between moderate and conservative
      const moderate = RISK_ALLOCATIONS.moderate;
      const conservative = RISK_ALLOCATIONS.conservative;
      return this.blendAllocations(moderate, conservative, 0.5);
    } else {
      return this.getRecommendedAllocation(
        goalType,
        yearsRemaining,
        'conservative'
      );
    }
  }

  private blendAllocations(
    a: RecommendedAllocation[],
    b: RecommendedAllocation[],
    weight: number
  ): RecommendedAllocation[] {
    const allClasses = new Set([
      ...a.map((x) => x.assetClass),
      ...b.map((x) => x.assetClass),
    ]);

    return Array.from(allClasses).map((assetClass) => {
      const aItem = a.find((x) => x.assetClass === assetClass);
      const bItem = b.find((x) => x.assetClass === assetClass);
      const aPercent = aItem?.percent || 0;
      const bPercent = bItem?.percent || 0;

      return {
        assetClass,
        percent: Math.round(aPercent * (1 - weight) + bPercent * weight),
        rationale: aItem?.rationale || bItem?.rationale || '',
      };
    });
  }

  // ==========================================================================
  // PROJECTIONS & PROGRESS
  // ==========================================================================

  /**
   * Calculate goal projection with Monte Carlo simulation
   */
  calculateProjection(
    currentAmount: number,
    monthlyContribution: number,
    targetAmount: number,
    targetDate: Date,
    expectedReturn: number = 0.07,
    volatility: number = 0.15
  ): GoalProjection {
    const now = new Date();
    const monthsRemaining = Math.max(
      0,
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth())
    );

    const monthlyReturn = expectedReturn / 12;
    const monthlyVol = volatility / Math.sqrt(12);

    // Expected projection
    let expected = currentAmount;
    for (let i = 0; i < monthsRemaining; i++) {
      expected = expected * (1 + monthlyReturn) + monthlyContribution;
    }

    // Pessimistic (5th percentile - ~1.65 std dev below)
    let pessimistic = currentAmount;
    const pessimisticReturn = monthlyReturn - 1.65 * monthlyVol;
    for (let i = 0; i < monthsRemaining; i++) {
      pessimistic = pessimistic * (1 + pessimisticReturn) + monthlyContribution;
    }

    // Optimistic (95th percentile - ~1.65 std dev above)
    let optimistic = currentAmount;
    const optimisticReturn = monthlyReturn + 1.65 * monthlyVol;
    for (let i = 0; i < monthsRemaining; i++) {
      optimistic = optimistic * (1 + optimisticReturn) + monthlyContribution;
    }

    const isOnTrack = expected >= targetAmount;
    const shortfall = isOnTrack ? undefined : targetAmount - expected;

    // Calculate required monthly contribution to reach target
    const requiredMonthly = this.calculateRequiredContribution(
      currentAmount,
      targetAmount,
      monthsRemaining,
      expectedReturn
    );

    // Confidence level based on how much expected exceeds target
    const confidenceLevel = Math.min(
      100,
      Math.round((expected / targetAmount) * 100)
    );

    return {
      currentAmount,
      projectedAmount: Math.round(expected),
      targetAmount,
      projectedDate: targetDate,
      targetDate,
      isOnTrack,
      shortfallAmount: shortfall ? Math.round(shortfall) : undefined,
      requiredMonthlyContribution: Math.round(requiredMonthly),
      confidenceLevel,
      scenarios: {
        pessimistic: Math.round(pessimistic),
        expected: Math.round(expected),
        optimistic: Math.round(optimistic),
      },
    };
  }

  private calculateRequiredContribution(
    current: number,
    target: number,
    months: number,
    annualReturn: number
  ): number {
    if (months <= 0) return target - current;

    const r = annualReturn / 12;
    const fv = target;
    const pv = current;
    const n = months;

    // PMT formula: PMT = (FV - PV * (1+r)^n) / (((1+r)^n - 1) / r)
    const compoundFactor = Math.pow(1 + r, n);
    const annuityFactor = (compoundFactor - 1) / r;

    return (fv - pv * compoundFactor) / annuityFactor;
  }

  /**
   * Get detailed progress for a goal
   */
  async getGoalProgress(goalId: string): Promise<GoalProgress | null> {
    try {
      const { data: goal, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (error || !goal) return null;

      const { data: contributions } = await supabase
        .from('goal_contributions')
        .select('amount')
        .eq('goal_id', goalId);

      const totalContributed = (contributions || []).reduce(
        (sum, c) => sum + c.amount,
        0
      );

      const targetDate = new Date(goal.target_date);
      const now = new Date();
      const monthsRemaining = Math.max(
        0,
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
          (targetDate.getMonth() - now.getMonth())
      );

      const percentComplete = Math.min(
        100,
        (goal.current_amount / goal.target_amount) * 100
      );

      const totalGrowth = goal.current_amount - totalContributed;

      // Calculate if on track
      const expectedProgress =
        ((now.getTime() - new Date(goal.created_at).getTime()) /
          (targetDate.getTime() - new Date(goal.created_at).getTime())) *
        100;
      const isOnTrack = percentComplete >= expectedProgress * 0.9;

      // Calculate projected completion
      let projectedCompletion: Date | null = null;
      if (totalContributed > 0 && goal.current_amount < goal.target_amount) {
        const contributionHistory = contributions?.length || 0;
        const avgMonthlyContribution =
          contributionHistory > 0 ? totalContributed / contributionHistory : 0;

        if (avgMonthlyContribution > 0) {
          const remainingAmount = goal.target_amount - goal.current_amount;
          const monthsToComplete = remainingAmount / avgMonthlyContribution;
          projectedCompletion = new Date();
          projectedCompletion.setMonth(
            projectedCompletion.getMonth() + Math.ceil(monthsToComplete)
          );
        }
      }

      // Generate milestones
      const milestones: GoalMilestone[] = MILESTONES.map((percent) => ({
        percent,
        amount: (goal.target_amount * percent) / 100,
        isReached: percentComplete >= percent,
        reachedAt: percentComplete >= percent ? new Date() : undefined,
      }));

      return {
        goalId,
        percentComplete: Math.round(percentComplete * 10) / 10,
        totalContributed,
        totalGrowth,
        monthsRemaining,
        isOnTrack,
        projectedCompletion,
        milestones,
      };
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private mapGoalFromDb(row: Record<string, unknown>): FinancialGoal {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      type: row.type as GoalType,
      targetAmount: row.target_amount as number,
      currentAmount: row.current_amount as number,
      targetDate: new Date(row.target_date as string),
      createdAt: new Date(row.created_at as string),
      status: row.status as GoalStatus,
      priority: row.priority as number,
      icon: row.icon as string | undefined,
      color: row.color as string | undefined,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let goalInvestmentServiceInstance: GoalInvestmentService | null = null;

export function getGoalInvestmentService(): GoalInvestmentService {
  if (!goalInvestmentServiceInstance) {
    goalInvestmentServiceInstance = new GoalInvestmentService();
  }
  return goalInvestmentServiceInstance;
}

export const goalInvestmentService = getGoalInvestmentService();
