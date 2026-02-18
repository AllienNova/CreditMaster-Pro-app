/**
 * Savings Goal Tracking Service
 *
 * Comprehensive savings goal management with multi-currency support,
 * contribution tracking, milestone auto-detection, linear regression
 * projections, and aggregate portfolio summaries.
 *
 * Persistence: Supabase tables `savings_goals`, `goal_contributions`, `goal_milestones`.
 * Currency:    Integrates with CurrencyService (FIN-001) for cross-currency conversions.
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { currencyService, type CurrencyCode } from '@/lib/financial/currency-service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Possible lifecycle states for a savings goal */
export type GoalStatus = 'active' | 'paused' | 'completed' | 'cancelled';

/** Standard milestone thresholds (percent of target) */
const MILESTONE_THRESHOLDS = [25, 50, 75, 90, 100] as const;
export type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];

/** Core savings goal record */
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  status: GoalStatus;
  targetDate: Date;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Milestone event recorded when a threshold is crossed */
export interface GoalMilestone {
  id: string;
  goalId: string;
  threshold: MilestoneThreshold;
  amountAtMilestone: number;
  reachedAt: Date;
}

/** A single contribution toward a savings goal */
export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  source: string;
  note: string;
  createdAt: Date;
}

/** Live progress snapshot for a goal */
export interface GoalProjection {
  goalId: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  daysRemaining: number;
  daysElapsed: number;
  onTrack: boolean;
  requiredDailyRate: number;
  actualDailyRate: number;
}

/** Projected completion date derived from linear regression */
export interface ProjectedCompletion {
  goalId: string;
  projectedDate: Date | null;
  confidence: number;
  daysUntilProjected: number | null;
  slope: number;
  intercept: number;
  rSquared: number;
}

/** Aggregate summary across all of a user's goals */
export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  cancelledGoals: number;
  totalSaved: number;
  totalTargets: number;
  overallProgressPercent: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  currency: CurrencyCode;
}

/** Parameters for creating a new savings goal */
export interface CreateGoalParams {
  name: string;
  description?: string;
  targetAmount: number;
  targetDate: Date | string;
  currency?: CurrencyCode;
  icon?: string;
  color?: string;
}

/** Parameters for updating an existing savings goal */
export interface UpdateGoalParams {
  name?: string;
  description?: string;
  targetAmount?: number;
  targetDate?: Date | string;
  status?: GoalStatus;
  icon?: string;
  color?: string;
}

// ============================================================================
// SUPABASE ROW SHAPES
// ============================================================================

interface SavingsGoalRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  status: string;
  target_date: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface GoalContributionRow {
  id: string;
  goal_id: string;
  amount: number;
  source: string;
  note: string;
  created_at: string;
}

interface GoalMilestoneRow {
  id: string;
  goal_id: string;
  threshold: number;
  amount_at_milestone: number;
  reached_at: string;
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapGoalRow(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    currency: row.currency as CurrencyCode,
    status: row.status as GoalStatus,
    targetDate: new Date(row.target_date),
    icon: row.icon,
    color: row.color,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  };
}

function mapContributionRow(row: GoalContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amount: row.amount,
    source: row.source,
    note: row.note,
    createdAt: new Date(row.created_at),
  };
}

function mapMilestoneRow(row: GoalMilestoneRow): GoalMilestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    threshold: row.threshold as MilestoneThreshold,
    amountAtMilestone: row.amount_at_milestone,
    reachedAt: new Date(row.reached_at),
  };
}

// ============================================================================
// LINEAR REGRESSION HELPER
// ============================================================================

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

/**
 * Simple ordinary least squares linear regression.
 *
 * @param xs  Independent variable values (e.g. days since first contribution)
 * @param ys  Dependent variable values (e.g. cumulative amount)
 * @returns   Slope, intercept, and R-squared coefficient of determination
 */
function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = xs.length;

  if (n < 2) {
    return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
    sumYY += ys[i] * ys[i];
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SavingsGoalService {
  // --------------------------------------------------------------------------
  // GOAL CRUD
  // --------------------------------------------------------------------------

  /**
   * Create a new savings goal for a user.
   */
  async createGoal(userId: string, params: CreateGoalParams): Promise<SavingsGoal> {
    const now = new Date().toISOString();
    const targetDate =
      typeof params.targetDate === 'string'
        ? params.targetDate
        : params.targetDate.toISOString();

    if (params.targetAmount <= 0) {
      throw new Error('Target amount must be a positive number');
    }

    const { data, error } = await (supabaseAdmin.from as any)('savings_goals')
      .insert({
        user_id: userId,
        name: params.name,
        description: params.description ?? '',
        target_amount: params.targetAmount,
        current_amount: 0,
        currency: params.currency ?? 'USD',
        status: 'active' as GoalStatus,
        target_date: targetDate,
        icon: params.icon ?? 'piggy-bank',
        color: params.color ?? '#4F46E5',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create savings goal: ${error.message}`);
    }

    return mapGoalRow(data as SavingsGoalRow);
  }

  /**
   * List all non-deleted goals for a user.
   */
  async getGoals(userId: string): Promise<SavingsGoal[]> {
    const { data, error } = await (supabaseAdmin.from as any)('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch savings goals: ${error.message}`);
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return (data as SavingsGoalRow[]).map(mapGoalRow);
  }

  /**
   * Get a single goal by ID, including its milestones and contributions.
   */
  async getGoal(goalId: string): Promise<{
    goal: SavingsGoal;
    milestones: GoalMilestone[];
    contributions: GoalContribution[];
  }> {
    const [goalResult, milestonesResult, contributionsResult] = await Promise.all([
      (supabaseAdmin.from as any)('savings_goals')
        .select('*')
        .eq('id', goalId)
        .is('deleted_at', null)
        .single(),
      (supabaseAdmin.from as any)('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .order('threshold', { ascending: true }),
      (supabaseAdmin.from as any)('goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true }),
    ]);

    if (goalResult.error) {
      throw new Error(`Failed to fetch savings goal: ${goalResult.error.message}`);
    }

    const goal = mapGoalRow(goalResult.data as SavingsGoalRow);

    const milestones: GoalMilestone[] = (milestonesResult.data ?? []).map(
      (row: GoalMilestoneRow) => mapMilestoneRow(row)
    );

    const contributions: GoalContribution[] = (contributionsResult.data ?? []).map(
      (row: GoalContributionRow) => mapContributionRow(row)
    );

    return { goal, milestones, contributions };
  }

  /**
   * Update mutable fields on a savings goal.
   */
  async updateGoal(goalId: string, updates: UpdateGoalParams): Promise<SavingsGoal> {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.targetAmount !== undefined) {
      if (updates.targetAmount <= 0) {
        throw new Error('Target amount must be a positive number');
      }
      patch.target_amount = updates.targetAmount;
    }
    if (updates.targetDate !== undefined) {
      patch.target_date =
        typeof updates.targetDate === 'string'
          ? updates.targetDate
          : updates.targetDate.toISOString();
    }
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    if (updates.color !== undefined) patch.color = updates.color;

    const { data, error } = await (supabaseAdmin.from as any)('savings_goals')
      .update(patch)
      .eq('id', goalId)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update savings goal: ${error.message}`);
    }

    return mapGoalRow(data as SavingsGoalRow);
  }

  /**
   * Soft-delete a savings goal by setting deleted_at.
   */
  async deleteGoal(goalId: string): Promise<void> {
    const { error } = await (supabaseAdmin.from as any)('savings_goals')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to delete savings goal: ${error.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // CONTRIBUTIONS
  // --------------------------------------------------------------------------

  /**
   * Record a contribution (deposit) toward a savings goal.
   * Automatically updates the goal's current_amount and checks milestones.
   *
   * @returns The created contribution and any newly triggered milestones.
   */
  async recordContribution(
    goalId: string,
    amount: number,
    source?: string,
    note?: string
  ): Promise<{ contribution: GoalContribution; newMilestones: GoalMilestone[] }> {
    if (amount <= 0) {
      throw new Error('Contribution amount must be a positive number');
    }

    // Fetch the current goal
    const { data: goalData, error: goalError } = await (supabaseAdmin.from as any)(
      'savings_goals'
    )
      .select('*')
      .eq('id', goalId)
      .is('deleted_at', null)
      .single();

    if (goalError) {
      throw new Error(`Failed to fetch goal for contribution: ${goalError.message}`);
    }

    const goalRow = goalData as SavingsGoalRow;
    const previousAmount = goalRow.current_amount;
    const newAmount = previousAmount + amount;

    // Insert contribution record
    const { data: contribData, error: contribError } = await (supabaseAdmin.from as any)(
      'goal_contributions'
    )
      .insert({
        goal_id: goalId,
        amount,
        source: source ?? 'manual',
        note: note ?? '',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (contribError) {
      throw new Error(`Failed to record contribution: ${contribError.message}`);
    }

    // Update goal current amount
    const updatePatch: Record<string, unknown> = {
      current_amount: newAmount,
      updated_at: new Date().toISOString(),
    };

    // Auto-complete the goal when target is reached
    if (newAmount >= goalRow.target_amount && goalRow.status === 'active') {
      updatePatch.status = 'completed';
    }

    await (supabaseAdmin.from as any)('savings_goals')
      .update(updatePatch)
      .eq('id', goalId);

    const contribution = mapContributionRow(contribData as GoalContributionRow);

    // Check for newly crossed milestones
    const newMilestones = await this.checkMilestonesInternal(
      goalId,
      previousAmount,
      newAmount,
      goalRow.target_amount
    );

    return { contribution, newMilestones };
  }

  // --------------------------------------------------------------------------
  // PROGRESS & PROJECTIONS
  // --------------------------------------------------------------------------

  /**
   * Calculate the current progress snapshot for a goal.
   */
  async trackProgress(goalId: string): Promise<GoalProjection> {
    const { data, error } = await (supabaseAdmin.from as any)('savings_goals')
      .select('*')
      .eq('id', goalId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`Failed to fetch goal for progress: ${error.message}`);
    }

    const goal = mapGoalRow(data as SavingsGoalRow);
    const now = new Date();

    const daysElapsed = Math.max(
      1,
      Math.floor((now.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysRemaining = Math.max(
      0,
      Math.floor((goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const progressPercent =
      goal.targetAmount > 0
        ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 10000) / 100)
        : 0;

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const requiredDailyRate = daysRemaining > 0 ? remainingAmount / daysRemaining : remainingAmount;
    const actualDailyRate = daysElapsed > 0 ? goal.currentAmount / daysElapsed : 0;

    const onTrack = daysRemaining === 0
      ? goal.currentAmount >= goal.targetAmount
      : actualDailyRate >= requiredDailyRate * 0.9; // 10% tolerance

    return {
      goalId: goal.id,
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
      progressPercent,
      daysRemaining,
      daysElapsed,
      onTrack,
      requiredDailyRate: Math.round(requiredDailyRate * 100) / 100,
      actualDailyRate: Math.round(actualDailyRate * 100) / 100,
    };
  }

  /**
   * Project when a goal will be completed based on contribution history.
   * Uses linear regression on cumulative contribution amounts over time.
   */
  async getProjectedDate(goalId: string): Promise<ProjectedCompletion> {
    const [goalResult, contribResult] = await Promise.all([
      (supabaseAdmin.from as any)('savings_goals')
        .select('*')
        .eq('id', goalId)
        .is('deleted_at', null)
        .single(),
      (supabaseAdmin.from as any)('goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true }),
    ]);

    if (goalResult.error) {
      throw new Error(`Failed to fetch goal for projection: ${goalResult.error.message}`);
    }

    const goal = mapGoalRow(goalResult.data as SavingsGoalRow);
    const contributions: GoalContribution[] = (contribResult.data ?? []).map(
      (row: GoalContributionRow) => mapContributionRow(row)
    );

    // Need at least 2 data points for meaningful regression
    if (contributions.length < 2) {
      return {
        goalId,
        projectedDate: null,
        confidence: 0,
        daysUntilProjected: null,
        slope: 0,
        intercept: 0,
        rSquared: 0,
      };
    }

    // Build cumulative time series
    const firstDate = contributions[0].createdAt.getTime();
    const xs: number[] = [];
    const ys: number[] = [];
    let cumulative = 0;

    for (const contrib of contributions) {
      const daysSinceFirst =
        (contrib.createdAt.getTime() - firstDate) / (1000 * 60 * 60 * 24);
      cumulative += contrib.amount;
      xs.push(daysSinceFirst);
      ys.push(cumulative);
    }

    const { slope, intercept, rSquared } = linearRegression(xs, ys);

    // If slope is zero or negative, the goal will never be reached at this rate
    if (slope <= 0) {
      return {
        goalId,
        projectedDate: null,
        confidence: rSquared,
        daysUntilProjected: null,
        slope,
        intercept,
        rSquared,
      };
    }

    // Solve for day when cumulative = targetAmount: targetAmount = slope * x + intercept
    const daysToTarget = (goal.targetAmount - intercept) / slope;
    const projectedTimestamp = firstDate + daysToTarget * 1000 * 60 * 60 * 24;
    const projectedDate = new Date(projectedTimestamp);

    const now = new Date();
    const daysUntilProjected = Math.max(
      0,
      Math.ceil((projectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Confidence based on R-squared and sample size
    const sampleFactor = Math.min(1, contributions.length / 10);
    const confidence = Math.round(rSquared * sampleFactor * 100) / 100;

    return {
      goalId,
      projectedDate,
      confidence,
      daysUntilProjected,
      slope: Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 100) / 100,
      rSquared: Math.round(rSquared * 10000) / 10000,
    };
  }

  // --------------------------------------------------------------------------
  // MILESTONES
  // --------------------------------------------------------------------------

  /**
   * Get all recorded milestones for a goal.
   */
  async getMilestones(goalId: string): Promise<GoalMilestone[]> {
    const { data, error } = await (supabaseAdmin.from as any)('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('threshold', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch milestones: ${error.message}`);
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return (data as GoalMilestoneRow[]).map(mapMilestoneRow);
  }

  /**
   * Check if any new milestones have been crossed for a goal.
   * Compares the current amount against the standard thresholds
   * (25%, 50%, 75%, 90%, 100%) and records any that are newly reached.
   */
  async checkMilestones(goalId: string): Promise<GoalMilestone[]> {
    const [goalResult, existingMilestones] = await Promise.all([
      (supabaseAdmin.from as any)('savings_goals')
        .select('*')
        .eq('id', goalId)
        .is('deleted_at', null)
        .single(),
      this.getMilestones(goalId),
    ]);

    if (goalResult.error) {
      throw new Error(`Failed to fetch goal for milestone check: ${goalResult.error.message}`);
    }

    const goal = mapGoalRow(goalResult.data as SavingsGoalRow);
    const existingThresholds = new Set(existingMilestones.map((m) => m.threshold));
    const currentPercent =
      goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    const newMilestones: GoalMilestone[] = [];

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (currentPercent >= threshold && !existingThresholds.has(threshold)) {
        const milestone = await this.insertMilestone(
          goalId,
          threshold,
          goal.currentAmount
        );
        newMilestones.push(milestone);
      }
    }

    return newMilestones;
  }

  /**
   * Internal milestone check used after a contribution is recorded.
   * Avoids a redundant goal fetch since caller already has the amounts.
   */
  private async checkMilestonesInternal(
    goalId: string,
    previousAmount: number,
    newAmount: number,
    targetAmount: number
  ): Promise<GoalMilestone[]> {
    if (targetAmount <= 0) {
      return [];
    }

    const existingMilestones = await this.getMilestones(goalId);
    const existingThresholds = new Set(existingMilestones.map((m) => m.threshold));

    const previousPercent = (previousAmount / targetAmount) * 100;
    const newPercent = (newAmount / targetAmount) * 100;

    const newMilestones: GoalMilestone[] = [];

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (
        previousPercent < threshold &&
        newPercent >= threshold &&
        !existingThresholds.has(threshold)
      ) {
        const milestone = await this.insertMilestone(goalId, threshold, newAmount);
        newMilestones.push(milestone);
      }
    }

    return newMilestones;
  }

  /**
   * Insert a single milestone record into Supabase.
   */
  private async insertMilestone(
    goalId: string,
    threshold: MilestoneThreshold,
    amountAtMilestone: number
  ): Promise<GoalMilestone> {
    const { data, error } = await (supabaseAdmin.from as any)('goal_milestones')
      .insert({
        goal_id: goalId,
        threshold,
        amount_at_milestone: amountAtMilestone,
        reached_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to record milestone: ${error.message}`);
    }

    return mapMilestoneRow(data as GoalMilestoneRow);
  }

  // --------------------------------------------------------------------------
  // AGGREGATE SUMMARY
  // --------------------------------------------------------------------------

  /**
   * Get an aggregate summary of all savings goals for a user.
   * All amounts are normalized to a single display currency (default USD).
   */
  async getGoalSummary(
    userId: string,
    displayCurrency: CurrencyCode = 'USD'
  ): Promise<GoalSummary> {
    const goals = await this.getGoals(userId);

    let totalSaved = 0;
    let totalTargets = 0;
    let activeGoals = 0;
    let completedGoals = 0;
    let pausedGoals = 0;
    let cancelledGoals = 0;
    let goalsOnTrack = 0;
    let goalsAtRisk = 0;

    const now = new Date();

    for (const goal of goals) {
      // Convert amounts to display currency
      const savedInDisplay = currencyService.convertAndRound(
        goal.currentAmount,
        goal.currency,
        displayCurrency
      );
      const targetInDisplay = currencyService.convertAndRound(
        goal.targetAmount,
        goal.currency,
        displayCurrency
      );

      totalSaved += savedInDisplay;
      totalTargets += targetInDisplay;

      switch (goal.status) {
        case 'active':
          activeGoals++;
          break;
        case 'completed':
          completedGoals++;
          break;
        case 'paused':
          pausedGoals++;
          break;
        case 'cancelled':
          cancelledGoals++;
          break;
      }

      // On-track analysis for active goals
      if (goal.status === 'active') {
        const daysElapsed = Math.max(
          1,
          Math.floor((now.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        );
        const daysRemaining = Math.max(
          0,
          Math.floor((goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );

        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
        const requiredDailyRate = daysRemaining > 0 ? remaining / daysRemaining : remaining;
        const actualDailyRate = goal.currentAmount / daysElapsed;

        if (actualDailyRate >= requiredDailyRate * 0.9) {
          goalsOnTrack++;
        } else {
          goalsAtRisk++;
        }
      }
    }

    const overallProgressPercent =
      totalTargets > 0
        ? Math.min(100, Math.round((totalSaved / totalTargets) * 10000) / 100)
        : 0;

    return {
      totalGoals: goals.length,
      activeGoals,
      completedGoals,
      pausedGoals,
      cancelledGoals,
      totalSaved: Math.round(totalSaved * 100) / 100,
      totalTargets: Math.round(totalTargets * 100) / 100,
      overallProgressPercent,
      goalsOnTrack,
      goalsAtRisk,
      currency: displayCurrency,
    };
  }

  // --------------------------------------------------------------------------
  // CURRENCY CONVERSION
  // --------------------------------------------------------------------------

  /**
   * Convert a goal's currency, translating the target and current amounts
   * to the new currency using live exchange rates.
   */
  async convertGoalCurrency(goalId: string, newCurrency: CurrencyCode): Promise<SavingsGoal> {
    const { data, error } = await (supabaseAdmin.from as any)('savings_goals')
      .select('*')
      .eq('id', goalId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`Failed to fetch goal for currency conversion: ${error.message}`);
    }

    const goal = mapGoalRow(data as SavingsGoalRow);

    if (goal.currency === newCurrency) {
      return goal;
    }

    const convertedTarget = currencyService.convertAndRound(
      goal.targetAmount,
      goal.currency,
      newCurrency
    );
    const convertedCurrent = currencyService.convertAndRound(
      goal.currentAmount,
      goal.currency,
      newCurrency
    );

    const { data: updated, error: updateError } = await (supabaseAdmin.from as any)(
      'savings_goals'
    )
      .update({
        currency: newCurrency,
        target_amount: convertedTarget,
        current_amount: convertedCurrent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to convert goal currency: ${updateError.message}`);
    }

    return mapGoalRow(updated as SavingsGoalRow);
  }
}

// ============================================================================
// FACTORY & SINGLETON EXPORTS
// ============================================================================

/**
 * Factory function to create a new SavingsGoalService instance.
 */
export function createSavingsGoalService(): SavingsGoalService {
  return new SavingsGoalService();
}

/** Singleton instance for application-wide use */
export const savingsGoalService = new SavingsGoalService();
export default savingsGoalService;
