/**
 * Budget Service
 *
 * Comprehensive budget management service with CRUD operations,
 * spending tracking, alerts, and intelligent recommendations.
 */

import { supabase } from '@/lib/supabase';
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
    const impactOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => impactOrder[a.impact] - impactOrder[b.impact]
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
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const budgetService = new BudgetService();
export default budgetService;
