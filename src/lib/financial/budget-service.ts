/**
 * Budget Service
 *
 * Comprehensive budget management service with CRUD operations,
 * spending tracking, alerts, and intelligent recommendations.
 */

import { getSupabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';

const supabase = getSupabase();
import {
  Budget,
  BudgetPeriod,
  BudgetStatus,
  BudgetCategoryValue,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetRow,
  BudgetSummary,
  BudgetStatusCount,
  CategorySpendingSummary,
  PeriodSummary,
  ProjectedSpending,
  BudgetAlert,
  BudgetAlertType,
  BudgetAlertSeverity,
  CreateBudgetAlertInput,
  BudgetAlertRow,
  BudgetRecommendation,
  BudgetTrend,
  BudgetHistoryEntry,
  BUDGET_CATEGORIES,
} from './types/budget.types';

// ============================================================================
// FAMILY COLLABORATION TYPES
// ============================================================================

/** Role assigned to a family member on a shared budget */
export type FamilyMemberRole = 'owner' | 'editor' | 'viewer';

/** Visibility level for a shared budget */
export type SharedBudgetVisibility = 'private' | 'family' | 'public';

/**
 * Represents a family member collaborating on a shared budget.
 * Each member has a role that determines their access level:
 * - owner: full control including sharing and deletion
 * - editor: can update spending and budget amounts
 * - viewer: read-only access to the shared budget
 */
export interface FamilyMember {
  userId: string;
  name: string;
  email?: string;
  role: FamilyMemberRole;
  invitedAt: Date;
  acceptedAt: Date | null;
}

/**
 * A budget that has been shared with family members.
 * Extends the base Budget type with collaboration fields.
 */
export interface SharedBudget extends Budget {
  familyMembers: FamilyMember[];
  sharedAt: Date;
  visibility: SharedBudgetVisibility;
  ownerName?: string;
}

/** Database row shape for the shared_budget_members table */
interface SharedBudgetMemberRow {
  id: string;
  budget_id: string;
  owner_user_id: string;
  member_user_id: string;
  member_name: string;
  member_email: string | null;
  role: string;
  visibility: string;
  invited_at: string;
  accepted_at: string | null;
  shared_at: string;
  created_at: string;
  updated_at: string;
}

/** Summary of a single family budget for the aggregated family view */
export interface FamilyBudgetEntry {
  budgetId: string;
  budgetName: string;
  category: BudgetCategoryValue;
  categoryDisplayName: string;
  ownerUserId: string;
  ownerName: string;
  memberRole: FamilyMemberRole;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: BudgetStatus;
  period: BudgetPeriod;
  visibility: SharedBudgetVisibility;
}

/** Aggregated family budget summary across all shared budgets for a user */
export interface FamilyBudgetSummary {
  userId: string;
  totalSharedBudgets: number;
  totalFamilyBudgeted: number;
  totalFamilySpent: number;
  totalFamilyRemaining: number;
  overallFamilyPercentUsed: number;
  budgetsByRole: {
    owned: number;
    editable: number;
    viewOnly: number;
  };
  familyBudgets: FamilyBudgetEntry[];
  collaborators: Array<{
    userId: string;
    name: string;
    sharedBudgetCount: number;
  }>;
}

// ============================================================================
// BUDGET CATEGORY DISPLAY NAMES
// ============================================================================

export const CATEGORY_DISPLAY_NAMES: Record<BudgetCategoryValue, string> = {
  housing: 'Housing',
  utilities: 'Utilities',
  groceries: 'Groceries',
  transportation: 'Transportation',
  insurance: 'Insurance',
  healthcare: 'Healthcare',
  debt_payments: 'Debt Payments',
  dining_out: 'Dining Out',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  personal_care: 'Personal Care',
  fitness: 'Fitness',
  subscriptions: 'Subscriptions',
  savings: 'Savings',
  investments: 'Investments',
  emergency_fund: 'Emergency Fund',
  education: 'Education',
  travel: 'Travel',
  gifts: 'Gifts',
  pets: 'Pets',
  childcare: 'Childcare',
  other: 'Other',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate period dates based on period type
 */
export function calculatePeriodDates(period: BudgetPeriod): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'weekly':
      // Start of current week (Sunday)
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'biweekly':
      // Start of current bi-week
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const biweekStart = dayOfYear - (dayOfYear % 14);
      start.setMonth(0, biweekStart);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime() + 13 * 24 * 60 * 60 * 1000);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      // Start of current month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'quarterly':
      // Start of current quarter
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 3);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      // Start of current year
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Determine budget status based on spending
 */
export function determineBudgetStatus(
  percentUsed: number,
  alertThreshold: number
): BudgetStatus {
  if (percentUsed >= 100) return 'over_budget';
  if (percentUsed >= alertThreshold) return 'warning';
  return 'on_track';
}

/**
 * Map database row to Budget object
 */
function mapRowToBudget(row: BudgetRow): Budget {
  const spentAmount = row.spent_amount || 0;
  const budgetedAmount = row.budgeted_amount || 0;
  const percentUsed =
    budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category as BudgetCategoryValue,
    budgetedAmount: budgetedAmount,
    spentAmount: spentAmount,
    remainingAmount: Math.max(0, budgetedAmount - spentAmount),
    period: row.period as BudgetPeriod,
    periodStart: new Date(row.period_start),
    periodEnd: new Date(row.period_end),
    status: determineBudgetStatus(percentUsed, row.alert_threshold),
    percentUsed: Math.round(percentUsed * 100) / 100,
    rolloverEnabled: row.rollover_enabled,
    rolloverAmount: row.rollover_amount || 0,
    isActive: row.is_active,
    alertThreshold: row.alert_threshold,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to BudgetAlert object
 */
function mapRowToAlert(row: BudgetAlertRow): BudgetAlert {
  return {
    id: row.id,
    userId: row.user_id,
    budgetId: row.budget_id || undefined,
    type: row.type as BudgetAlertType,
    severity: row.severity as BudgetAlertSeverity,
    title: row.title,
    message: row.message,
    data: row.data || undefined,
    read: row.read,
    dismissed: row.dismissed,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================================
// BUDGET SERVICE CLASS
// ============================================================================

export class BudgetService {
  // ==========================================================================
  // BUDGET CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new budget
   */
  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    const { start, end } = calculatePeriodDates(input.period);

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: input.userId,
        name: input.name,
        category: input.category,
        budgeted_amount: input.budgetedAmount,
        spent_amount: 0,
        period: input.period,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        rollover_enabled: input.rolloverEnabled ?? false,
        rollover_amount: 0,
        alert_threshold: input.alertThreshold ?? 80,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create budget: ${error?.message}`);
    }

    return mapRowToBudget(data as BudgetRow);
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(
    budgetId: string,
    userId: string
  ): Promise<Budget | null> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapRowToBudget(data as BudgetRow);
  }

  /**
   * Get all budgets for a user
   */
  async getBudgetsByUser(
    userId: string,
    options?: { activeOnly?: boolean; category?: BudgetCategoryValue }
  ): Promise<Budget[]> {
    let query = supabase.from('budgets').select('*').eq('user_id', userId);

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }

    return (data || []).map((row) => mapRowToBudget(row as BudgetRow));
  }

  /**
   * Update a budget
   */
  async updateBudget(
    budgetId: string,
    userId: string,
    updates: UpdateBudgetInput
  ): Promise<Budget> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.budgetedAmount !== undefined)
      updateData.budgeted_amount = updates.budgetedAmount;
    if (updates.rolloverEnabled !== undefined)
      updateData.rollover_enabled = updates.rolloverEnabled;
    if (updates.alertThreshold !== undefined)
      updateData.alert_threshold = updates.alertThreshold;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    // If period changes, recalculate dates
    if (updates.period !== undefined) {
      const { start, end } = calculatePeriodDates(updates.period);
      updateData.period = updates.period;
      updateData.period_start = start.toISOString();
      updateData.period_end = end.toISOString();
    }

    const { data, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', budgetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update budget: ${error?.message}`);
    }

    return mapRowToBudget(data as BudgetRow);
  }

  /**
   * Delete a budget
   */
  async deleteBudget(budgetId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete budget: ${error.message}`);
    }

    return true;
  }

  /**
   * Update spent amount for a budget
   */
  async updateSpentAmount(
    budgetId: string,
    userId: string,
    amount: number
  ): Promise<Budget> {
    // Get current budget
    const current = await this.getBudgetById(budgetId, userId);
    if (!current) {
      throw new Error('Budget not found');
    }

    const newSpentAmount = current.spentAmount + amount;

    const { data, error } = await supabase
      .from('budgets')
      .update({
        spent_amount: newSpentAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', budgetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update spent amount: ${error?.message}`);
    }

    const updatedBudget = mapRowToBudget(data as BudgetRow);

    // Check if we need to create alerts
    await this.checkAndCreateAlerts(updatedBudget);

    return updatedBudget;
  }

  /**
   * Reset budget for new period
   */
  async resetBudgetForNewPeriod(
    budgetId: string,
    userId: string
  ): Promise<Budget> {
    const current = await this.getBudgetById(budgetId, userId);
    if (!current) {
      throw new Error('Budget not found');
    }

    const { start, end } = calculatePeriodDates(current.period);
    let rolloverAmount = 0;

    // Calculate rollover if enabled
    if (current.rolloverEnabled && current.remainingAmount > 0) {
      rolloverAmount = current.remainingAmount;
    }

    const { data, error } = await supabase
      .from('budgets')
      .update({
        spent_amount: 0,
        rollover_amount: rolloverAmount,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', budgetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to reset budget: ${error?.message}`);
    }

    return mapRowToBudget(data as BudgetRow);
  }

  /**
   * Get effective budget amount (budgeted + rollover)
   */
  getEffectiveBudget(budget: Budget): number {
    return (
      budget.budgetedAmount +
      (budget.rolloverEnabled ? budget.rolloverAmount : 0)
    );
  }

  /**
   * Process rollover for all budgets that need it
   * This should be called at the start of each new period
   */
  async processRolloversForUser(userId: string): Promise<{
    processed: number;
    totalRollover: number;
    budgets: Budget[];
  }> {
    const budgets = await this.getBudgetsByUser(userId, { activeOnly: true });
    const now = new Date();
    let processed = 0;
    let totalRollover = 0;
    const updatedBudgets: Budget[] = [];

    for (const budget of budgets) {
      // Check if budget period has ended
      if (now > budget.periodEnd) {
        const updated = await this.resetBudgetForNewPeriod(budget.id, userId);
        processed++;
        if (updated.rolloverAmount > 0) {
          totalRollover += updated.rolloverAmount;
        }
        updatedBudgets.push(updated);
      } else {
        updatedBudgets.push(budget);
      }
    }

    return {
      processed,
      totalRollover,
      budgets: updatedBudgets,
    };
  }

  /**
   * Get rollover summary for a user
   */
  async getRolloverSummary(userId: string): Promise<{
    totalRollover: number;
    budgetsWithRollover: number;
    rolloverByCategory: Array<{
      category: BudgetCategoryValue;
      categoryName: string;
      rolloverAmount: number;
      budgetName: string;
    }>;
  }> {
    const budgets = await this.getBudgetsByUser(userId, { activeOnly: true });

    const budgetsWithRollover = budgets.filter(
      (b) => b.rolloverEnabled && b.rolloverAmount > 0
    );

    const totalRollover = budgetsWithRollover.reduce(
      (sum, b) => sum + b.rolloverAmount,
      0
    );

    const rolloverByCategory = budgetsWithRollover.map((b) => ({
      category: b.category,
      categoryName: CATEGORY_DISPLAY_NAMES[b.category] || b.category,
      rolloverAmount: b.rolloverAmount,
      budgetName: b.name,
    }));

    return {
      totalRollover,
      budgetsWithRollover: budgetsWithRollover.length,
      rolloverByCategory,
    };
  }

  /**
   * Manually adjust rollover amount for a budget
   */
  async adjustRolloverAmount(
    budgetId: string,
    userId: string,
    newRolloverAmount: number
  ): Promise<Budget> {
    const budget = await this.getBudgetById(budgetId, userId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    if (!budget.rolloverEnabled) {
      throw new Error('Rollover is not enabled for this budget');
    }

    if (newRolloverAmount < 0) {
      throw new Error('Rollover amount cannot be negative');
    }

    const { data, error } = await supabase
      .from('budgets')
      .update({
        rollover_amount: newRolloverAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', budgetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to adjust rollover: ${error?.message}`);
    }

    return mapRowToBudget(data as BudgetRow);
  }

  // ==========================================================================
  // BUDGET SUMMARY & ANALYTICS
  // ==========================================================================

  /**
   * Get budget summary for a user
   */
  async getBudgetSummary(userId: string): Promise<BudgetSummary> {
    const budgets = await this.getBudgetsByUser(userId, { activeOnly: true });

    const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgetedAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const overallPercentUsed =
      totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    // Count by status
    const budgetsByStatus: BudgetStatusCount = {
      onTrack: budgets.filter((b) => b.status === 'on_track').length,
      warning: budgets.filter((b) => b.status === 'warning').length,
      overBudget: budgets.filter((b) => b.status === 'over_budget').length,
      inactive: budgets.filter((b) => !b.isActive).length,
    };

    // Top overspent categories
    const topOverspentCategories: CategorySpendingSummary[] = budgets
      .filter((b) => b.percentUsed > 100)
      .sort((a, b) => b.percentUsed - a.percentUsed)
      .slice(0, 5)
      .map((b) => ({
        category: b.category,
        categoryDisplayName: CATEGORY_DISPLAY_NAMES[b.category] || b.category,
        budgetedAmount: b.budgetedAmount,
        spentAmount: b.spentAmount,
        percentUsed: b.percentUsed,
        variance: b.spentAmount - b.budgetedAmount,
      }));

    // Top under-budget categories
    const topUnderBudgetCategories: CategorySpendingSummary[] = budgets
      .filter((b) => b.percentUsed < 50 && b.budgetedAmount > 0)
      .sort((a, b) => a.percentUsed - b.percentUsed)
      .slice(0, 5)
      .map((b) => ({
        category: b.category,
        categoryDisplayName: CATEGORY_DISPLAY_NAMES[b.category] || b.category,
        budgetedAmount: b.budgetedAmount,
        spentAmount: b.spentAmount,
        percentUsed: b.percentUsed,
        variance: b.budgetedAmount - b.spentAmount,
      }));

    // Get period summary (assuming monthly for now)
    const now = new Date();
    const { start, end } = calculatePeriodDates('monthly');
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    const periodSummary: PeriodSummary = {
      period: 'monthly',
      startDate: start,
      endDate: end,
      daysElapsed: Math.max(0, daysElapsed),
      daysRemaining,
      percentOfPeriodElapsed:
        totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0,
    };

    // Calculate projections
    const dailySpendRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const projectedTotal = dailySpendRate * totalDays;
    const projectedOverage = Math.max(0, projectedTotal - totalBudgeted);
    const projectedSavings = Math.max(0, totalBudgeted - projectedTotal);

    const projectedEndOfPeriod: ProjectedSpending = {
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      projectedOverage: Math.round(projectedOverage * 100) / 100,
      projectedSavings: Math.round(projectedSavings * 100) / 100,
      confidence: daysElapsed >= 7 ? 0.8 : 0.5, // Higher confidence after a week
    };

    return {
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalRemaining: Math.round(totalRemaining * 100) / 100,
      overallPercentUsed: Math.round(overallPercentUsed * 100) / 100,
      budgetsByStatus,
      topOverspentCategories,
      topUnderBudgetCategories,
      periodSummary,
      projectedEndOfPeriod,
    };
  }

  /**
   * Get budget trends over multiple periods
   */
  async getBudgetTrends(
    userId: string,
    category: BudgetCategoryValue,
    periods: number = 6
  ): Promise<BudgetTrend> {
    // This would typically query historical data
    // For now, return a calculated trend based on current data
    const budgets = await this.getBudgetsByUser(userId, { category });

    if (budgets.length === 0) {
      return {
        category,
        history: [],
        averageSpent: 0,
        averageBudgeted: 0,
        trend: 'stable',
        trendPercentage: 0,
      };
    }

    const current = budgets[0];
    const history: BudgetHistoryEntry[] = [
      {
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
        budgetedAmount: current.budgetedAmount,
        spentAmount: current.spentAmount,
        percentUsed: current.percentUsed,
        status: current.status,
      },
    ];

    return {
      category,
      history,
      averageSpent: current.spentAmount,
      averageBudgeted: current.budgetedAmount,
      trend: 'stable',
      trendPercentage: 0,
    };
  }

  // ==========================================================================
  // BUDGET ALERTS
  // ==========================================================================

  /**
   * Check budget status and create alerts if needed
   */
  private async checkAndCreateAlerts(budget: Budget): Promise<void> {
    // Check for threshold warning
    if (
      budget.status === 'warning' &&
      budget.percentUsed >= budget.alertThreshold
    ) {
      await this.createAlert({
        userId: budget.userId,
        budgetId: budget.id,
        type: 'threshold_warning',
        severity: 'warning',
        title: `Budget Warning: ${CATEGORY_DISPLAY_NAMES[budget.category]}`,
        message: `You've used ${budget.percentUsed.toFixed(1)}% of your ${CATEGORY_DISPLAY_NAMES[budget.category]} budget.`,
        data: {
          category: budget.category,
          percentUsed: budget.percentUsed,
          remaining: budget.remainingAmount,
        },
      });
    }

    // Check for over budget
    if (budget.status === 'over_budget') {
      await this.createAlert({
        userId: budget.userId,
        budgetId: budget.id,
        type: 'over_budget',
        severity: 'critical',
        title: `Over Budget: ${CATEGORY_DISPLAY_NAMES[budget.category]}`,
        message: `You've exceeded your ${CATEGORY_DISPLAY_NAMES[budget.category]} budget by $${(budget.spentAmount - budget.budgetedAmount).toFixed(2)}.`,
        data: {
          category: budget.category,
          overage: budget.spentAmount - budget.budgetedAmount,
          percentUsed: budget.percentUsed,
        },
      });
    }
  }

  /**
   * Create a budget alert
   */
  async createAlert(input: CreateBudgetAlertInput): Promise<BudgetAlert> {
    const { data, error } = await supabase
      .from('budget_alerts')
      .insert({
        user_id: input.userId,
        budget_id: input.budgetId || null,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        data: input.data || null,
        read: false,
        dismissed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create alert: ${error?.message}`);
    }

    return mapRowToAlert(data as BudgetAlertRow);
  }

  /**
   * Get alerts for a user
   */
  async getAlerts(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<BudgetAlert[]> {
    let query = supabase
      .from('budget_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false);

    if (options?.unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50);

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }

    return (data || []).map((row) => mapRowToAlert(row as BudgetAlertRow));
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('budget_alerts')
      .update({ read: true })
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark alert as read: ${error.message}`);
    }
  }

  /**
   * Dismiss alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('budget_alerts')
      .update({ dismissed: true })
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to dismiss alert: ${error.message}`);
    }
  }

  // ==========================================================================
  // BUDGET RECOMMENDATIONS
  // ==========================================================================

  /**
   * Generate budget recommendations based on spending patterns
   */
  async getRecommendations(userId: string): Promise<BudgetRecommendation[]> {
    const budgets = await this.getBudgetsByUser(userId, { activeOnly: true });
    const recommendations: BudgetRecommendation[] = [];

    for (const budget of budgets) {
      // Recommend increasing budget if consistently over
      if (budget.percentUsed > 120) {
        recommendations.push({
          id: `rec_increase_${budget.id}`,
          type: 'increase_budget',
          category: budget.category,
          currentAmount: budget.budgetedAmount,
          suggestedAmount: Math.ceil(budget.spentAmount * 1.1),
          reason: `You've consistently exceeded your ${CATEGORY_DISPLAY_NAMES[budget.category]} budget.`,
          impact: 'medium',
          actionSteps: [
            'Review your recent transactions in this category',
            'Identify if the increased spending is temporary or permanent',
            'Adjust your budget to match reality or find ways to reduce spending',
          ],
        });
      }

      // Recommend decreasing budget if consistently under
      if (budget.percentUsed < 30 && budget.budgetedAmount > 100) {
        recommendations.push({
          id: `rec_decrease_${budget.id}`,
          type: 'decrease_budget',
          category: budget.category,
          currentAmount: budget.budgetedAmount,
          suggestedAmount: Math.ceil(budget.spentAmount * 1.5),
          reason: `Your ${CATEGORY_DISPLAY_NAMES[budget.category]} budget seems too high.`,
          impact: 'low',
          potentialSavings: budget.budgetedAmount - budget.spentAmount * 1.5,
          actionSteps: [
            'Consider reallocating unused budget to savings or debt payoff',
            'Lower the budget to free up funds for other priorities',
          ],
        });
      }
    }

    // Sort by impact
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => impactOrder[a.impact as string] - impactOrder[b.impact as string]
    );

    return recommendations;
  }

  /**
   * Get available budget categories that haven't been set up
   */
  getAvailableCategories(existingBudgets: Budget[]): BudgetCategoryValue[] {
    const existingCategories = new Set(existingBudgets.map((b) => b.category));
    return Object.values(BUDGET_CATEGORIES).filter(
      (cat) => !existingCategories.has(cat)
    );
  }

  // ==========================================================================
  // FAMILY COLLABORATION & SHARED BUDGET OPERATIONS
  // ==========================================================================

  /**
   * Share a budget with one or more family members.
   *
   * Creates shared_budget_members rows for every member userId supplied.
   * The caller must be the budget owner. Each family member receives the
   * specified role ('owner' | 'editor' | 'viewer'). If a member is already
   * shared on the budget, their record is updated rather than duplicated.
   *
   * @param budgetId  The budget to share
   * @param ownerUserId  The userId of the budget owner performing the share
   * @param memberUserIds  Array of userIds to share the budget with
   * @param role  The collaboration role to assign to each member
   * @param visibility  Visibility level for the shared budget (default 'family')
   * @returns The SharedBudget including all family members
   */
  async shareBudget(
    budgetId: string,
    ownerUserId: string,
    memberUserIds: string[],
    role: FamilyMemberRole = 'viewer',
    visibility: SharedBudgetVisibility = 'family'
  ): Promise<SharedBudget> {
    // Validate that the budget exists and belongs to the caller
    const budget = await this.getBudgetById(budgetId, ownerUserId);
    if (!budget) {
      throw new Error(
        'Budget not found or you do not have permission to share it'
      );
    }

    if (memberUserIds.length === 0) {
      throw new Error('At least one family member userId is required to share a budget');
    }

    // Filter out the owner from the member list — cannot share with yourself
    const filteredMemberIds = memberUserIds.filter((id) => id !== ownerUserId);
    if (filteredMemberIds.length === 0) {
      throw new Error('Cannot share a budget with yourself');
    }

    const now = new Date().toISOString();

    // Check which members already have a shared record for this budget
    const { data: existingRows } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .select('member_user_id')
      .eq('budget_id', budgetId)
      .in('member_user_id', filteredMemberIds);

    const existingMemberIds = new Set(
      (existingRows || []).map(
        (r: { member_user_id: string }) => r.member_user_id
      )
    );

    // Update existing members' roles and visibility
    for (const existingMemberId of existingMemberIds) {
      await (supabaseAdmin.from as any)('shared_budget_members')
        .update({
          role,
          visibility,
          updated_at: now,
        })
        .eq('budget_id', budgetId)
        .eq('member_user_id', existingMemberId);
    }

    // Insert new members
    const newMemberIds = filteredMemberIds.filter(
      (id) => !existingMemberIds.has(id)
    );

    if (newMemberIds.length > 0) {
      const insertRows = newMemberIds.map((memberId) => ({
        budget_id: budgetId,
        owner_user_id: ownerUserId,
        member_user_id: memberId,
        member_name: '', // Will be enriched on read from profiles
        member_email: null,
        role,
        visibility,
        invited_at: now,
        accepted_at: null,
        shared_at: now,
        created_at: now,
        updated_at: now,
      }));

      const { error: insertError } = await (supabaseAdmin.from as any)(
        'shared_budget_members'
      ).insert(insertRows);

      if (insertError) {
        throw new Error(
          `Failed to share budget with family members: ${insertError.message}`
        );
      }
    }

    // Return the enriched SharedBudget
    return this.getSharedBudgetById(budgetId, ownerUserId);
  }

  /**
   * Remove a family member from a shared budget.
   *
   * Only the budget owner can remove collaborators. Removing the last
   * member effectively makes the budget private again.
   *
   * @param budgetId  The shared budget
   * @param ownerUserId  The userId of the budget owner
   * @param memberUserId  The family member to remove
   */
  async unshareBudget(
    budgetId: string,
    ownerUserId: string,
    memberUserId: string
  ): Promise<void> {
    // Verify ownership
    const budget = await this.getBudgetById(budgetId, ownerUserId);
    if (!budget) {
      throw new Error(
        'Budget not found or you do not have permission to modify sharing'
      );
    }

    if (memberUserId === ownerUserId) {
      throw new Error('Cannot remove yourself as the budget owner from a shared budget');
    }

    const { error } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .delete()
      .eq('budget_id', budgetId)
      .eq('member_user_id', memberUserId);

    if (error) {
      throw new Error(
        `Failed to remove family member from shared budget: ${error.message}`
      );
    }

    // If no members remain, reset visibility to private
    const { data: remaining } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .select('id')
      .eq('budget_id', budgetId);

    if (!remaining || remaining.length === 0) {
      await (supabaseAdmin.from as any)('shared_budget_members')
        .update({ visibility: 'private' })
        .eq('budget_id', budgetId);
    }
  }

  /**
   * Get all budgets that have been shared with a specific user.
   *
   * Returns budgets where the user is a collaborator (not necessarily the owner).
   * Each returned SharedBudget includes the full family member list and the
   * caller's specific role.
   *
   * @param userId  The user to look up shared budgets for
   * @returns Array of SharedBudgets the user has access to
   */
  async getSharedBudgets(userId: string): Promise<SharedBudget[]> {
    // Find all shared_budget_members rows where this user is a member
    const { data: memberRows, error: memberError } = await (
      supabaseAdmin.from as any
    )('shared_budget_members')
      .select('*')
      .eq('member_user_id', userId);

    if (memberError) {
      throw new Error(
        `Failed to fetch shared budgets for family member: ${memberError.message}`
      );
    }

    if (!memberRows || memberRows.length === 0) {
      return [];
    }

    // Get the distinct budget IDs this user has been shared on
    const budgetIds = [
      ...new Set(
        (memberRows as SharedBudgetMemberRow[]).map((r) => r.budget_id)
      ),
    ];

    // Fetch each shared budget with its full collaborator list
    const sharedBudgets: SharedBudget[] = [];
    for (const budgetId of budgetIds) {
      const ownerRow = (memberRows as SharedBudgetMemberRow[]).find(
        (r) => r.budget_id === budgetId
      );
      if (!ownerRow) continue;

      // Fetch the budget data — use the owner's userId so the query works
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (budgetError || !budgetData) continue;

      const budget = mapRowToBudget(budgetData as BudgetRow);

      // Fetch all family members for this shared budget
      const familyMembers = await this.getFamilyMembersForBudget(budgetId);

      sharedBudgets.push({
        ...budget,
        familyMembers,
        sharedAt: new Date(ownerRow.shared_at),
        visibility: ownerRow.visibility as SharedBudgetVisibility,
        ownerName: ownerRow.owner_user_id,
      });
    }

    return sharedBudgets;
  }

  /**
   * Update the collaboration role of a family member on a shared budget.
   *
   * Only the budget owner can change roles. Valid transitions are between
   * 'viewer', 'editor', and 'owner'. Promoting a member to 'owner' does
   * NOT demote the original owner.
   *
   * @param budgetId  The shared budget
   * @param ownerUserId  The userId of the budget owner
   * @param memberUserId  The family member whose role to update
   * @param newRole  The new collaboration role
   * @returns The updated FamilyMember record
   */
  async updateMemberRole(
    budgetId: string,
    ownerUserId: string,
    memberUserId: string,
    newRole: FamilyMemberRole
  ): Promise<FamilyMember> {
    // Verify ownership
    const budget = await this.getBudgetById(budgetId, ownerUserId);
    if (!budget) {
      throw new Error(
        'Budget not found or you do not have permission to update member roles'
      );
    }

    const validRoles: FamilyMemberRole[] = ['owner', 'editor', 'viewer'];
    if (!validRoles.includes(newRole)) {
      throw new Error(
        `Invalid family member role: ${newRole}. Must be one of: ${validRoles.join(', ')}`
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .update({
        role: newRole,
        updated_at: now,
      })
      .eq('budget_id', budgetId)
      .eq('member_user_id', memberUserId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to update family member role on shared budget: ${error?.message || 'Member not found'}`
      );
    }

    const row = data as SharedBudgetMemberRow;
    return {
      userId: row.member_user_id,
      name: row.member_name || '',
      email: row.member_email || undefined,
      role: row.role as FamilyMemberRole,
      invitedAt: new Date(row.invited_at),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    };
  }

  /**
   * Get an aggregated family budget summary across all shared budgets for a user.
   *
   * This provides a holistic view of every budget the user participates in
   * (as owner, editor, or viewer), including:
   * - Total budgeted, spent, and remaining across all family budgets
   * - Breakdown by collaboration role
   * - Individual budget entries with owner info
   * - Unique collaborators list
   *
   * @param userId  The user requesting the family budget summary
   * @returns Aggregated FamilyBudgetSummary
   */
  async getFamilyBudgetSummary(userId: string): Promise<FamilyBudgetSummary> {
    // Fetch all shared budget membership rows for this user
    const { data: memberRows, error: memberError } = await (
      supabaseAdmin.from as any
    )('shared_budget_members')
      .select('*')
      .eq('member_user_id', userId);

    if (memberError) {
      throw new Error(
        `Failed to fetch family budget summary: ${memberError.message}`
      );
    }

    // Also fetch budgets this user owns that have been shared with others
    const { data: ownedShareRows, error: ownedError } = await (
      supabaseAdmin.from as any
    )('shared_budget_members')
      .select('*')
      .eq('owner_user_id', userId);

    if (ownedError) {
      throw new Error(
        `Failed to fetch owned shared budgets for family summary: ${ownedError.message}`
      );
    }

    // Merge all relevant budget IDs (shared with me + shared by me)
    const allRows = [
      ...(memberRows || []),
      ...(ownedShareRows || []),
    ] as SharedBudgetMemberRow[];

    // Deduplicate by budget_id — keep the row where the user has the highest privilege
    const roleWeight: Record<string, number> = {
      owner: 3,
      editor: 2,
      viewer: 1,
    };
    const budgetMap = new Map<string, SharedBudgetMemberRow>();
    for (const row of allRows) {
      const existing = budgetMap.get(row.budget_id);
      if (
        !existing ||
        (roleWeight[row.role] || 0) > (roleWeight[existing.role] || 0)
      ) {
        budgetMap.set(row.budget_id, row);
      }
    }

    const uniqueBudgetEntries = Array.from(budgetMap.values());

    // Fetch all corresponding budget records
    const familyBudgets: FamilyBudgetEntry[] = [];
    let totalFamilyBudgeted = 0;
    let totalFamilySpent = 0;
    let ownedCount = 0;
    let editableCount = 0;
    let viewOnlyCount = 0;

    // Track unique collaborators
    const collaboratorMap = new Map<
      string,
      { userId: string; name: string; count: number }
    >();

    for (const entry of uniqueBudgetEntries) {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', entry.budget_id)
        .single();

      if (!budgetData) continue;

      const budget = mapRowToBudget(budgetData as BudgetRow);
      const memberRole = (
        entry.owner_user_id === userId ? 'owner' : entry.role
      ) as FamilyMemberRole;

      // Tally role counts
      if (memberRole === 'owner') ownedCount++;
      else if (memberRole === 'editor') editableCount++;
      else viewOnlyCount++;

      totalFamilyBudgeted += budget.budgetedAmount;
      totalFamilySpent += budget.spentAmount;

      familyBudgets.push({
        budgetId: budget.id,
        budgetName: budget.name,
        category: budget.category,
        categoryDisplayName:
          CATEGORY_DISPLAY_NAMES[budget.category] || budget.category,
        ownerUserId: entry.owner_user_id,
        ownerName: entry.owner_user_id,
        memberRole,
        budgetedAmount: budget.budgetedAmount,
        spentAmount: budget.spentAmount,
        remainingAmount: budget.remainingAmount,
        percentUsed: budget.percentUsed,
        status: budget.status,
        period: budget.period,
        visibility: entry.visibility as SharedBudgetVisibility,
      });

      // Collect collaborators from all family members on this budget
      const members = await this.getFamilyMembersForBudget(entry.budget_id);
      for (const member of members) {
        if (member.userId === userId) continue;
        const existing = collaboratorMap.get(member.userId);
        if (existing) {
          existing.count++;
        } else {
          collaboratorMap.set(member.userId, {
            userId: member.userId,
            name: member.name || member.userId,
            count: 1,
          });
        }
      }

      // Also count the owner as a collaborator if the user is a member
      if (entry.owner_user_id !== userId) {
        const existing = collaboratorMap.get(entry.owner_user_id);
        if (existing) {
          existing.count++;
        } else {
          collaboratorMap.set(entry.owner_user_id, {
            userId: entry.owner_user_id,
            name: entry.owner_user_id,
            count: 1,
          });
        }
      }
    }

    const totalFamilyRemaining = totalFamilyBudgeted - totalFamilySpent;
    const overallFamilyPercentUsed =
      totalFamilyBudgeted > 0
        ? Math.round((totalFamilySpent / totalFamilyBudgeted) * 10000) / 100
        : 0;

    const collaborators = Array.from(collaboratorMap.values()).map((c) => ({
      userId: c.userId,
      name: c.name,
      sharedBudgetCount: c.count,
    }));

    return {
      userId,
      totalSharedBudgets: familyBudgets.length,
      totalFamilyBudgeted:
        Math.round(totalFamilyBudgeted * 100) / 100,
      totalFamilySpent: Math.round(totalFamilySpent * 100) / 100,
      totalFamilyRemaining:
        Math.round(totalFamilyRemaining * 100) / 100,
      overallFamilyPercentUsed,
      budgetsByRole: {
        owned: ownedCount,
        editable: editableCount,
        viewOnly: viewOnlyCount,
      },
      familyBudgets,
      collaborators,
    };
  }

  // ==========================================================================
  // FAMILY COLLABORATION — PRIVATE HELPERS
  // ==========================================================================

  /**
   * Get all family members associated with a shared budget.
   *
   * @param budgetId  The budget to look up collaborators for
   * @returns Array of FamilyMember records
   */
  private async getFamilyMembersForBudget(
    budgetId: string
  ): Promise<FamilyMember[]> {
    const { data, error } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .select('*')
      .eq('budget_id', budgetId)
      .order('invited_at', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch family members for shared budget: ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as SharedBudgetMemberRow[]).map((row) => ({
      userId: row.member_user_id,
      name: row.member_name || '',
      email: row.member_email || undefined,
      role: row.role as FamilyMemberRole,
      invitedAt: new Date(row.invited_at),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    }));
  }

  /**
   * Get a single SharedBudget by ID, enriched with family member data.
   *
   * @param budgetId  The budget ID
   * @param userId  The requesting user's ID (must be owner or collaborator)
   * @returns The SharedBudget with all family collaboration data
   */
  private async getSharedBudgetById(
    budgetId: string,
    userId: string
  ): Promise<SharedBudget> {
    // Fetch the base budget
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .single();

    if (budgetError || !budgetData) {
      throw new Error(
        `Failed to fetch shared budget: ${budgetError?.message || 'Not found'}`
      );
    }

    const budget = mapRowToBudget(budgetData as BudgetRow);

    // Fetch family members
    const familyMembers = await this.getFamilyMembersForBudget(budgetId);

    // Determine shared_at and visibility from the first share record
    const { data: shareRow } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .select('shared_at, visibility, owner_user_id')
      .eq('budget_id', budgetId)
      .order('shared_at', { ascending: true })
      .limit(1)
      .single();

    const sharedAt = shareRow?.shared_at
      ? new Date(shareRow.shared_at)
      : new Date();
    const visibility: SharedBudgetVisibility =
      (shareRow?.visibility as SharedBudgetVisibility) || 'family';

    return {
      ...budget,
      familyMembers,
      sharedAt,
      visibility,
      ownerName: userId,
    };
  }

  /**
   * Accept a shared budget invitation.
   *
   * Sets the accepted_at timestamp for the family member's record,
   * indicating they have acknowledged and accepted the shared budget invitation.
   *
   * @param budgetId  The shared budget to accept
   * @param memberUserId  The family member accepting the invitation
   */
  async acceptSharedBudgetInvitation(
    budgetId: string,
    memberUserId: string
  ): Promise<FamilyMember> {
    const now = new Date().toISOString();

    const { data, error } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .update({
        accepted_at: now,
        updated_at: now,
      })
      .eq('budget_id', budgetId)
      .eq('member_user_id', memberUserId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to accept shared budget invitation: ${error?.message || 'Invitation not found'}`
      );
    }

    const row = data as SharedBudgetMemberRow;
    return {
      userId: row.member_user_id,
      name: row.member_name || '',
      email: row.member_email || undefined,
      role: row.role as FamilyMemberRole,
      invitedAt: new Date(row.invited_at),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    };
  }

  /**
   * Update the visibility of a shared budget.
   *
   * Controls who can see the budget:
   * - 'private': only the owner
   * - 'family': owner and invited family members
   * - 'public': visible to all household members
   *
   * @param budgetId  The shared budget
   * @param ownerUserId  The budget owner
   * @param visibility  The new visibility setting
   */
  async updateSharedBudgetVisibility(
    budgetId: string,
    ownerUserId: string,
    visibility: SharedBudgetVisibility
  ): Promise<void> {
    const budget = await this.getBudgetById(budgetId, ownerUserId);
    if (!budget) {
      throw new Error(
        'Budget not found or you do not have permission to change visibility'
      );
    }

    const validVisibilities: SharedBudgetVisibility[] = [
      'private',
      'family',
      'public',
    ];
    if (!validVisibilities.includes(visibility)) {
      throw new Error(
        `Invalid shared budget visibility: ${visibility}. Must be one of: ${validVisibilities.join(', ')}`
      );
    }

    const now = new Date().toISOString();

    const { error } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .update({
        visibility,
        updated_at: now,
      })
      .eq('budget_id', budgetId)
      .eq('owner_user_id', ownerUserId);

    if (error) {
      throw new Error(
        `Failed to update shared budget visibility: ${error.message}`
      );
    }
  }

  /**
   * Check whether a user has a specific permission on a shared budget.
   *
   * Permission hierarchy:
   * - 'viewer': can read the budget
   * - 'editor': can read and update spending
   * - 'owner': full control (share, unshare, delete)
   *
   * @param budgetId  The shared budget
   * @param userId  The user to check
   * @param requiredRole  Minimum required family member role
   * @returns true if the user has at least the required role
   */
  async checkSharedBudgetPermission(
    budgetId: string,
    userId: string,
    requiredRole: FamilyMemberRole
  ): Promise<boolean> {
    const roleHierarchy: Record<FamilyMemberRole, number> = {
      viewer: 1,
      editor: 2,
      owner: 3,
    };

    // Check if user is the budget owner
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('user_id')
      .eq('id', budgetId)
      .single();

    if (budgetData && (budgetData as { user_id: string }).user_id === userId) {
      return true; // Budget owner always has full permissions
    }

    // Check family member role
    const { data: memberRow } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .select('role')
      .eq('budget_id', budgetId)
      .eq('member_user_id', userId)
      .single();

    if (!memberRow) {
      return false; // User is not a collaborator on this shared budget
    }

    const userRole = (memberRow as { role: string }).role as FamilyMemberRole;
    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  }

  /**
   * Get all pending (not yet accepted) shared budget invitations for a user.
   *
   * Returns shared budgets where accepted_at is null, meaning the family
   * member has been invited but has not yet accepted the collaboration.
   *
   * @param userId  The user to look up pending invitations for
   * @returns Array of SharedBudgets with pending invitations
   */
  async getPendingSharedBudgetInvitations(
    userId: string
  ): Promise<SharedBudget[]> {
    const { data: pendingRows, error } = await (supabaseAdmin.from as any)(
      'shared_budget_members'
    )
      .select('*')
      .eq('member_user_id', userId)
      .is('accepted_at', null);

    if (error) {
      throw new Error(
        `Failed to fetch pending shared budget invitations: ${error.message}`
      );
    }

    if (!pendingRows || pendingRows.length === 0) {
      return [];
    }

    const sharedBudgets: SharedBudget[] = [];
    for (const row of pendingRows as SharedBudgetMemberRow[]) {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', row.budget_id)
        .single();

      if (!budgetData) continue;

      const budget = mapRowToBudget(budgetData as BudgetRow);
      const familyMembers = await this.getFamilyMembersForBudget(
        row.budget_id
      );

      sharedBudgets.push({
        ...budget,
        familyMembers,
        sharedAt: new Date(row.shared_at),
        visibility: row.visibility as SharedBudgetVisibility,
        ownerName: row.owner_user_id,
      });
    }

    return sharedBudgets;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const budgetService = new BudgetService();
export default budgetService;
