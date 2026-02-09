/**
 * Spending Limit Alerts Service
 *
 * Monitor spending against user-defined limits:
 * - Category-based spending limits
 * - Daily/weekly/monthly budgets
 * - Merchant-specific limits
 * - Real-time alert notifications
 * - Trend-based warnings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type LimitPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'dismissed';
export type LimitType =
  | 'category'
  | 'merchant'
  | 'total'
  | 'recurring'
  | 'custom';

export interface SpendingLimit {
  id: string;
  userId: string;
  name: string;
  type: LimitType;

  // Limit configuration
  limitAmount: number;
  period: LimitPeriod;

  // Target criteria
  categories?: string[];
  merchants?: string[];
  tags?: string[];

  // Alert thresholds
  warningThreshold: number; // Percentage (e.g., 80 = 80%)
  criticalThreshold: number; // Percentage (e.g., 95 = 95%)

  // Notification preferences
  notifyOnWarning: boolean;
  notifyOnCritical: boolean;
  notifyOnExceed: boolean;
  notificationChannels: ('push' | 'email' | 'sms' | 'in_app')[];

  // Tracking
  currentSpent: number;
  lastResetDate: Date;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpendingAlert {
  id: string;
  userId: string;
  limitId: string;
  limitName: string;

  // Alert details
  severity: AlertSeverity;
  status: AlertStatus;

  // Amount info
  spentAmount: number;
  limitAmount: number;
  percentUsed: number;
  remainingAmount: number;

  // Trigger info
  triggerTransactionId?: string;
  triggerTransactionAmount?: number;
  triggerMerchant?: string;
  triggerCategory?: string;

  // Message
  title: string;
  message: string;

  // Timestamps
  triggeredAt: Date;
  acknowledgedAt?: Date;
  expiresAt: Date;
}

export interface SpendingAnalysis {
  limit: SpendingLimit;
  currentSpent: number;
  percentUsed: number;
  remaining: number;
  daysRemaining: number;
  projectedTotal: number;
  willExceed: boolean;
  averageDailySpend: number;
  safeDailySpend: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recentTransactions: TransactionSummary[];
}

export interface TransactionSummary {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  date: Date;
}

export interface LimitSummary {
  totalLimits: number;
  activeLimits: number;
  limitsAtWarning: number;
  limitsExceeded: number;
  totalBudgeted: number;
  totalSpent: number;
  overallPercentUsed: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class SpendingLimitAlertsService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // LIMIT CRUD
  // ==========================================================================

  async createLimit(
    limit: Omit<
      SpendingLimit,
      'id' | 'currentSpent' | 'lastResetDate' | 'createdAt' | 'updatedAt'
    >
  ): Promise<SpendingLimit> {
    const now = new Date();
    const newLimit: SpendingLimit = {
      ...limit,
      id: crypto.randomUUID(),
      currentSpent: 0,
      lastResetDate: this.getPeriodStartDate(limit.period),
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from('spending_limits')
      .insert(this.toDbFormat(newLimit))
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async updateLimit(
    limitId: string,
    updates: Partial<SpendingLimit>
  ): Promise<SpendingLimit> {
    const { data, error } = await this.supabase
      .from('spending_limits')
      .update({
        ...this.toDbFormat(updates),
        updated_at: new Date().toISOString(),
      })
      .eq('id', limitId)
      .select()
      .single();

    if (error) throw error;
    return this.fromDbFormat(data);
  }

  async deleteLimit(limitId: string): Promise<void> {
    const { error } = await this.supabase
      .from('spending_limits')
      .delete()
      .eq('id', limitId);

    if (error) throw error;
  }

  async getLimit(limitId: string): Promise<SpendingLimit | null> {
    const { data } = await this.supabase
      .from('spending_limits')
      .select('*')
      .eq('id', limitId)
      .single();

    return data ? this.fromDbFormat(data) : null;
  }

  async getUserLimits(
    userId: string,
    activeOnly = true
  ): Promise<SpendingLimit[]> {
    let query = this.supabase
      .from('spending_limits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.fromDbFormat);
  }

  // ==========================================================================
  // TRANSACTION PROCESSING
  // ==========================================================================

  async processTransaction(
    userId: string,
    transactionId: string,
    amount: number,
    merchant: string,
    category: string,
    tags: string[] = []
  ): Promise<SpendingAlert[]> {
    const limits = await this.getUserLimits(userId, true);
    const alerts: SpendingAlert[] = [];

    for (const limit of limits) {
      // Check if transaction matches limit criteria
      if (!this.transactionMatchesLimit(limit, category, merchant, tags)) {
        continue;
      }

      // Reset limit if period has passed
      const resetLimit = await this.checkAndResetIfNeeded(limit);

      // Update current spent
      const newSpent = resetLimit.currentSpent + amount;
      const percentUsed = (newSpent / limit.limitAmount) * 100;

      await this.updateLimit(limit.id, { currentSpent: newSpent });

      // Check thresholds and create alerts
      const alert = await this.checkThresholdsAndAlert(
        limit,
        newSpent,
        percentUsed,
        transactionId,
        amount,
        merchant,
        category
      );

      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private transactionMatchesLimit(
    limit: SpendingLimit,
    category: string,
    merchant: string,
    tags: string[]
  ): boolean {
    switch (limit.type) {
      case 'total':
        return true;
      case 'category':
        return limit.categories?.includes(category) || false;
      case 'merchant':
        return (
          limit.merchants?.some((m) =>
            merchant.toLowerCase().includes(m.toLowerCase())
          ) || false
        );
      case 'custom':
        const categoryMatch =
          !limit.categories?.length || limit.categories.includes(category);
        const merchantMatch =
          !limit.merchants?.length ||
          limit.merchants.some((m) =>
            merchant.toLowerCase().includes(m.toLowerCase())
          );
        const tagMatch =
          !limit.tags?.length || limit.tags.some((t) => tags.includes(t));
        return categoryMatch && merchantMatch && tagMatch;
      default:
        return false;
    }
  }

  private async checkAndResetIfNeeded(
    limit: SpendingLimit
  ): Promise<SpendingLimit> {
    const periodStart = this.getPeriodStartDate(limit.period);

    if (limit.lastResetDate < periodStart) {
      return this.updateLimit(limit.id, {
        currentSpent: 0,
        lastResetDate: periodStart,
      });
    }

    return limit;
  }

  private async checkThresholdsAndAlert(
    limit: SpendingLimit,
    newSpent: number,
    percentUsed: number,
    transactionId: string,
    transactionAmount: number,
    merchant: string,
    category: string
  ): Promise<SpendingAlert | null> {
    let severity: AlertSeverity | null = null;
    let shouldNotify = false;

    if (percentUsed >= 100 && limit.notifyOnExceed) {
      severity = 'critical';
      shouldNotify = true;
    } else if (
      percentUsed >= limit.criticalThreshold &&
      limit.notifyOnCritical
    ) {
      severity = 'critical';
      shouldNotify = true;
    } else if (percentUsed >= limit.warningThreshold && limit.notifyOnWarning) {
      severity = 'warning';
      shouldNotify = true;
    }

    if (!severity || !shouldNotify) {
      return null;
    }

    // Check if we already sent a similar alert recently
    const recentAlert = await this.getRecentAlertForLimit(limit.id, severity);
    if (recentAlert) {
      return null; // Don't spam with duplicate alerts
    }

    return this.createAlert({
      userId: limit.userId,
      limitId: limit.id,
      limitName: limit.name,
      severity,
      spentAmount: newSpent,
      limitAmount: limit.limitAmount,
      percentUsed,
      remainingAmount: Math.max(0, limit.limitAmount - newSpent),
      triggerTransactionId: transactionId,
      triggerTransactionAmount: transactionAmount,
      triggerMerchant: merchant,
      triggerCategory: category,
      title: this.generateAlertTitle(limit, percentUsed),
      message: this.generateAlertMessage(limit, newSpent, percentUsed),
    });
  }

  private generateAlertTitle(
    limit: SpendingLimit,
    percentUsed: number
  ): string {
    if (percentUsed >= 100) {
      return `${limit.name} limit exceeded!`;
    }
    if (percentUsed >= limit.criticalThreshold) {
      return `${limit.name} almost at limit`;
    }
    return `${limit.name} spending alert`;
  }

  private generateAlertMessage(
    limit: SpendingLimit,
    spent: number,
    percentUsed: number
  ): string {
    const remaining = Math.max(0, limit.limitAmount - spent);
    const periodLabel = this.getPeriodLabel(limit.period);

    if (percentUsed >= 100) {
      return `You've exceeded your ${periodLabel} ${limit.name} limit of $${limit.limitAmount.toFixed(2)} by $${(spent - limit.limitAmount).toFixed(2)}.`;
    }

    return `You've used ${percentUsed.toFixed(0)}% of your ${periodLabel} ${limit.name} limit. $${remaining.toFixed(2)} remaining.`;
  }

  private getPeriodLabel(period: LimitPeriod): string {
    const labels: Record<LimitPeriod, string> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
      yearly: 'yearly',
    };
    return labels[period];
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  async createAlert(
    alert: Omit<SpendingAlert, 'id' | 'status' | 'triggeredAt' | 'expiresAt'>
  ): Promise<SpendingAlert> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newAlert: SpendingAlert = {
      ...alert,
      id: crypto.randomUUID(),
      status: 'active',
      triggeredAt: now,
      expiresAt,
    };

    const { data, error } = await this.supabase
      .from('spending_alerts')
      .insert({
        id: newAlert.id,
        user_id: newAlert.userId,
        limit_id: newAlert.limitId,
        limit_name: newAlert.limitName,
        severity: newAlert.severity,
        status: newAlert.status,
        spent_amount: newAlert.spentAmount,
        limit_amount: newAlert.limitAmount,
        percent_used: newAlert.percentUsed,
        remaining_amount: newAlert.remainingAmount,
        trigger_transaction_id: newAlert.triggerTransactionId,
        trigger_transaction_amount: newAlert.triggerTransactionAmount,
        trigger_merchant: newAlert.triggerMerchant,
        trigger_category: newAlert.triggerCategory,
        title: newAlert.title,
        message: newAlert.message,
        triggered_at: newAlert.triggeredAt.toISOString(),
        expires_at: newAlert.expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return this.alertFromDb(data);
  }

  async acknowledgeAlert(alertId: string): Promise<SpendingAlert> {
    const { data, error } = await this.supabase
      .from('spending_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return this.alertFromDb(data);
  }

  async dismissAlert(alertId: string): Promise<void> {
    await this.supabase
      .from('spending_alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId);
  }

  async getActiveAlerts(userId: string): Promise<SpendingAlert[]> {
    const { data, error } = await this.supabase
      .from('spending_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('triggered_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.alertFromDb);
  }

  async getAlertHistory(
    userId: string,
    limit: number = 50
  ): Promise<SpendingAlert[]> {
    const { data, error } = await this.supabase
      .from('spending_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(this.alertFromDb);
  }

  private async getRecentAlertForLimit(
    limitId: string,
    severity: AlertSeverity
  ): Promise<SpendingAlert | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data } = await this.supabase
      .from('spending_alerts')
      .select('*')
      .eq('limit_id', limitId)
      .eq('severity', severity)
      .gte('triggered_at', oneHourAgo.toISOString())
      .single();

    return data ? this.alertFromDb(data) : null;
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async analyzeLimit(limitId: string): Promise<SpendingAnalysis | null> {
    const limit = await this.getLimit(limitId);
    if (!limit) return null;

    const periodStart = this.getPeriodStartDate(limit.period);
    const periodEnd = this.getPeriodEndDate(limit.period);
    const now = new Date();

    const daysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

    const currentSpent = limit.currentSpent;
    const percentUsed = (currentSpent / limit.limitAmount) * 100;
    const remaining = Math.max(0, limit.limitAmount - currentSpent);

    const averageDailySpend = daysElapsed > 0 ? currentSpent / daysElapsed : 0;
    const projectedTotal = averageDailySpend * daysInPeriod;
    const safeDailySpend = daysRemaining > 0 ? remaining / daysRemaining : 0;

    // Determine trend (would need historical data for accurate trend)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (averageDailySpend > safeDailySpend * 1.2) trend = 'increasing';
    if (averageDailySpend < safeDailySpend * 0.8) trend = 'decreasing';

    return {
      limit,
      currentSpent,
      percentUsed,
      remaining,
      daysRemaining,
      projectedTotal,
      willExceed: projectedTotal > limit.limitAmount,
      averageDailySpend,
      safeDailySpend,
      trend,
      recentTransactions: [], // Would be populated with actual transaction data
    };
  }

  async getLimitSummary(userId: string): Promise<LimitSummary> {
    const limits = await this.getUserLimits(userId, true);

    let totalBudgeted = 0;
    let totalSpent = 0;
    let limitsAtWarning = 0;
    let limitsExceeded = 0;

    for (const limit of limits) {
      totalBudgeted += limit.limitAmount;
      totalSpent += limit.currentSpent;

      const percentUsed = (limit.currentSpent / limit.limitAmount) * 100;
      if (percentUsed >= 100) {
        limitsExceeded++;
      } else if (percentUsed >= limit.warningThreshold) {
        limitsAtWarning++;
      }
    }

    return {
      totalLimits: limits.length,
      activeLimits: limits.length,
      limitsAtWarning,
      limitsExceeded,
      totalBudgeted,
      totalSpent,
      overallPercentUsed:
        totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getPeriodStartDate(period: LimitPeriod): Date {
    const now = new Date();

    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.getFullYear(), now.getMonth(), diff);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'yearly':
        return new Date(now.getFullYear(), 0, 1);
    }
  }

  private getPeriodEndDate(period: LimitPeriod): Date {
    const start = this.getPeriodStartDate(period);

    switch (period) {
      case 'daily':
        return new Date(start.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(start.getFullYear(), start.getMonth() + 1, 0);
      case 'yearly':
        return new Date(start.getFullYear() + 1, 0, 0);
    }
  }

  private toDbFormat(limit: Partial<SpendingLimit>): Record<string, unknown> {
    return {
      id: limit.id,
      user_id: limit.userId,
      name: limit.name,
      type: limit.type,
      limit_amount: limit.limitAmount,
      period: limit.period,
      categories: limit.categories,
      merchants: limit.merchants,
      tags: limit.tags,
      warning_threshold: limit.warningThreshold,
      critical_threshold: limit.criticalThreshold,
      notify_on_warning: limit.notifyOnWarning,
      notify_on_critical: limit.notifyOnCritical,
      notify_on_exceed: limit.notifyOnExceed,
      notification_channels: limit.notificationChannels,
      current_spent: limit.currentSpent,
      last_reset_date: limit.lastResetDate?.toISOString(),
      is_active: limit.isActive,
      created_at: limit.createdAt?.toISOString(),
      updated_at: limit.updatedAt?.toISOString(),
    };
  }

  private fromDbFormat(data: Record<string, unknown>): SpendingLimit {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      type: data.type as LimitType,
      limitAmount: data.limit_amount as number,
      period: data.period as LimitPeriod,
      categories: data.categories as string[] | undefined,
      merchants: data.merchants as string[] | undefined,
      tags: data.tags as string[] | undefined,
      warningThreshold: data.warning_threshold as number,
      criticalThreshold: data.critical_threshold as number,
      notifyOnWarning: data.notify_on_warning as boolean,
      notifyOnCritical: data.notify_on_critical as boolean,
      notifyOnExceed: data.notify_on_exceed as boolean,
      notificationChannels: data.notification_channels as (
        | 'push'
        | 'email'
        | 'sms'
        | 'in_app'
      )[],
      currentSpent: data.current_spent as number,
      lastResetDate: new Date(data.last_reset_date as string),
      isActive: data.is_active as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private alertFromDb(data: Record<string, unknown>): SpendingAlert {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      limitId: data.limit_id as string,
      limitName: data.limit_name as string,
      severity: data.severity as AlertSeverity,
      status: data.status as AlertStatus,
      spentAmount: data.spent_amount as number,
      limitAmount: data.limit_amount as number,
      percentUsed: data.percent_used as number,
      remainingAmount: data.remaining_amount as number,
      triggerTransactionId: data.trigger_transaction_id as string | undefined,
      triggerTransactionAmount: data.trigger_transaction_amount as
        | number
        | undefined,
      triggerMerchant: data.trigger_merchant as string | undefined,
      triggerCategory: data.trigger_category as string | undefined,
      title: data.title as string,
      message: data.message as string,
      triggeredAt: new Date(data.triggered_at as string),
      acknowledgedAt: data.acknowledged_at
        ? new Date(data.acknowledged_at as string)
        : undefined,
      expiresAt: new Date(data.expires_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let spendingLimitAlertsServiceInstance: SpendingLimitAlertsService | null =
  null;

export function getSpendingLimitAlertsService(): SpendingLimitAlertsService {
  if (!spendingLimitAlertsServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    spendingLimitAlertsServiceInstance = new SpendingLimitAlertsService(
      supabaseUrl,
      supabaseKey
    );
  }
  return spendingLimitAlertsServiceInstance;
}
