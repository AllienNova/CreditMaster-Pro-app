/**
 * Contribution Scheduler Service
 *
 * Handles automated execution of scheduled contributions to goals,
 * including retry logic, notifications, and auto-increase features.
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { Subject, BehaviorSubject } from "rxjs";

// ============================================================================
// TYPES
// ============================================================================

export type ContributionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";
export type FailureReason =
  | "insufficient_funds"
  | "account_error"
  | "goal_paused"
  | "network_error"
  | "unknown";

export interface ScheduledContribution {
  id: string;
  scheduleId: string;
  goalId: string;
  goalName: string;
  amount: number;
  sourceAccountId: string;
  sourceAccountName: string;
  scheduledDate: Date;
  status: ContributionStatus;
  processedAt?: Date;
  failureReason?: FailureReason;
  retryCount: number;
}

export interface ContributionResult {
  success: boolean;
  contributionId: string;
  amount: number;
  error?: string;
  failureReason?: FailureReason;
}

export interface SchedulerConfig {
  maxRetries: number;
  retryDelayMinutes: number;
  processingWindowHours: number;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  autoSkipInsufficientFunds: boolean;
}

export interface SchedulerStats {
  pendingContributions: number;
  completedToday: number;
  failedToday: number;
  totalProcessedThisMonth: number;
  totalAmountThisMonth: number;
}

export interface ContributionEvent {
  type:
    | "scheduled"
    | "processing"
    | "completed"
    | "failed"
    | "skipped"
    | "retrying";
  contribution: ScheduledContribution;
  timestamp: Date;
  details?: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: SchedulerConfig = {
  maxRetries: 3,
  retryDelayMinutes: 60,
  processingWindowHours: 24,
  notifyOnFailure: true,
  notifyOnSuccess: false,
  autoSkipInsufficientFunds: false,
};

// ============================================================================
// SERVICE
// ============================================================================

export class ContributionSchedulerService {
  private config: SchedulerConfig;
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Observables
  private eventsSubject = new Subject<ContributionEvent>();
  private statsSubject = new BehaviorSubject<SchedulerStats>({
    pendingContributions: 0,
    completedToday: 0,
    failedToday: 0,
    totalProcessedThisMonth: 0,
    totalAmountThisMonth: 0,
  });

  public events$ = this.eventsSubject.asObservable();
  public stats$ = this.statsSubject.asObservable();

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // SCHEDULER CONTROL
  // ==========================================================================

  /**
   * Start the scheduler
   */
  start(intervalMinutes: number = 15): void {
    if (this.isRunning) return;

    this.isRunning = true;
    // ContributionScheduler: Started

    // Process immediately
    this.processScheduledContributions();

    // Then process at intervals
    this.processingInterval = setInterval(
      () => this.processScheduledContributions(),
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    // ContributionScheduler: Stopped
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  // ==========================================================================
  // CONTRIBUTION PROCESSING
  // ==========================================================================

  /**
   * Process all due contributions
   */
  async processScheduledContributions(): Promise<void> {
    try {
      const dueContributions = await this.getDueContributions();

      for (const contribution of dueContributions) {
        await this.processContribution(contribution);
      }

      // Update stats
      await this.refreshStats();
    } catch (_error) {
      // ContributionScheduler error: Processing error
    }
  }

  /**
   * Process a single contribution
   */
  async processContribution(
    contribution: ScheduledContribution,
  ): Promise<ContributionResult> {
    // Emit processing event
    this.emitEvent("processing", contribution);

    try {
      // Update status to processing
      await this.updateContributionStatus(contribution.id, "processing");

      // Check if goal is still active
      const goalActive = await this.isGoalActive(contribution.goalId);
      if (!goalActive) {
        await this.skipContribution(contribution, "goal_paused");
        return {
          success: false,
          contributionId: contribution.id,
          amount: 0,
          failureReason: "goal_paused",
        };
      }

      // Check source account balance
      const hasBalance = await this.checkAccountBalance(
        contribution.sourceAccountId,
        contribution.amount,
      );

      if (!hasBalance) {
        if (this.config.autoSkipInsufficientFunds) {
          await this.skipContribution(contribution, "insufficient_funds");
          return {
            success: false,
            contributionId: contribution.id,
            amount: 0,
            failureReason: "insufficient_funds",
          };
        } else {
          await this.failContribution(contribution, "insufficient_funds");
          return {
            success: false,
            contributionId: contribution.id,
            amount: 0,
            failureReason: "insufficient_funds",
          };
        }
      }

      // Execute the transfer
      const transferSuccess = await this.executeTransfer(
        contribution.sourceAccountId,
        contribution.goalId,
        contribution.amount,
      );

      if (!transferSuccess) {
        await this.failContribution(contribution, "account_error");
        return {
          success: false,
          contributionId: contribution.id,
          amount: 0,
          failureReason: "account_error",
        };
      }

      // Mark as completed
      await this.completeContribution(contribution);

      // Update goal progress
      await this.updateGoalProgress(contribution.goalId, contribution.amount);

      // Schedule next contribution
      await this.scheduleNextContribution(contribution.scheduleId);

      return {
        success: true,
        contributionId: contribution.id,
        amount: contribution.amount,
      };
    } catch (error) {
      // ContributionScheduler error: Contribution failed
      await this.failContribution(contribution, "unknown");
      return {
        success: false,
        contributionId: contribution.id,
        amount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        failureReason: "unknown",
      };
    }
  }

  /**
   * Retry a failed contribution
   */
  async retryContribution(contributionId: string): Promise<ContributionResult> {
    const contribution = await this.getContribution(contributionId);
    if (!contribution) {
      return {
        success: false,
        contributionId,
        amount: 0,
        error: "Contribution not found",
      };
    }

    if (contribution.retryCount >= this.config.maxRetries) {
      return {
        success: false,
        contributionId,
        amount: 0,
        error: "Max retries exceeded",
      };
    }

    // Increment retry count
    await supabase
      .from("scheduled_contributions")
      .update({ retry_count: contribution.retryCount + 1 })
      .eq("id", contributionId);

    contribution.retryCount += 1;
    this.emitEvent("retrying", contribution);

    return this.processContribution(contribution);
  }

  /**
   * Skip a contribution
   */
  async skipContribution(
    contribution: ScheduledContribution,
    reason: FailureReason,
  ): Promise<void> {
    await supabase
      .from("scheduled_contributions")
      .update({
        status: "skipped",
        failure_reason: reason,
        processed_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    contribution.status = "skipped";
    contribution.failureReason = reason;
    this.emitEvent("skipped", contribution, `Skipped: ${reason}`);

    // Schedule next contribution even if skipped
    await this.scheduleNextContribution(contribution.scheduleId);
  }

  // ==========================================================================
  // CONTRIBUTION MANAGEMENT
  // ==========================================================================

  /**
   * Get all due contributions
   */
  private async getDueContributions(): Promise<ScheduledContribution[]> {
    const windowEnd = new Date();
    windowEnd.setHours(
      windowEnd.getHours() + this.config.processingWindowHours,
    );

    const { data, error } = await supabase
      .from("scheduled_contributions")
      .select(
        `
        *,
        contribution_schedules(goal_id),
        financial_goals(name),
        bank_accounts(name)
      `,
      )
      .eq("status", "pending")
      .lte("scheduled_date", windowEnd.toISOString())
      .order("scheduled_date", { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      goalId: row.contribution_schedules?.goal_id || "",
      goalName: row.financial_goals?.name || "Unknown Goal",
      amount: row.amount,
      sourceAccountId: row.source_account_id,
      sourceAccountName: row.bank_accounts?.name || "Unknown Account",
      scheduledDate: new Date(row.scheduled_date),
      status: row.status,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      failureReason: row.failure_reason,
      retryCount: row.retry_count || 0,
    }));
  }

  /**
   * Get a single contribution
   */
  private async getContribution(
    id: string,
  ): Promise<ScheduledContribution | null> {
    const { data, error } = await supabase
      .from("scheduled_contributions")
      .select(
        `
        *,
        contribution_schedules(goal_id),
        financial_goals(name),
        bank_accounts(name)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      scheduleId: data.schedule_id,
      goalId: data.contribution_schedules?.goal_id || "",
      goalName: data.financial_goals?.name || "Unknown Goal",
      amount: data.amount,
      sourceAccountId: data.source_account_id,
      sourceAccountName: data.bank_accounts?.name || "Unknown Account",
      scheduledDate: new Date(data.scheduled_date),
      status: data.status,
      processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
      failureReason: data.failure_reason,
      retryCount: data.retry_count || 0,
    };
  }

  /**
   * Update contribution status
   */
  private async updateContributionStatus(
    id: string,
    status: ContributionStatus,
  ): Promise<void> {
    await supabase
      .from("scheduled_contributions")
      .update({ status })
      .eq("id", id);
  }

  /**
   * Mark contribution as completed
   */
  private async completeContribution(
    contribution: ScheduledContribution,
  ): Promise<void> {
    await supabase
      .from("scheduled_contributions")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    // Record in contribution history
    await supabase.from("goal_contributions").insert({
      goal_id: contribution.goalId,
      amount: contribution.amount,
      source_account_id: contribution.sourceAccountId,
      contribution_type: "scheduled",
      contributed_at: new Date().toISOString(),
    });

    contribution.status = "completed";
    this.emitEvent("completed", contribution);

    // Send notification if configured
    if (this.config.notifyOnSuccess) {
      await this.sendNotification(contribution, "success");
    }
  }

  /**
   * Mark contribution as failed
   */
  private async failContribution(
    contribution: ScheduledContribution,
    reason: FailureReason,
  ): Promise<void> {
    const shouldRetry = contribution.retryCount < this.config.maxRetries;

    await supabase
      .from("scheduled_contributions")
      .update({
        status: "failed",
        failure_reason: reason,
        processed_at: new Date().toISOString(),
        next_retry_at: shouldRetry
          ? new Date(
              Date.now() + this.config.retryDelayMinutes * 60 * 1000,
            ).toISOString()
          : null,
      })
      .eq("id", contribution.id);

    contribution.status = "failed";
    contribution.failureReason = reason;
    this.emitEvent("failed", contribution, `Failed: ${reason}`);

    // Send notification if configured
    if (this.config.notifyOnFailure) {
      await this.sendNotification(contribution, "failure");
    }
  }

  /**
   * Schedule the next contribution
   */
  private async scheduleNextContribution(scheduleId: string): Promise<void> {
    const { data: schedule } = await supabase
      .from("contribution_schedules")
      .select("*")
      .eq("id", scheduleId)
      .eq("is_active", true)
      .single();

    if (!schedule) return;

    const nextDate = this.calculateNextDate(
      new Date(schedule.next_contribution_date),
      schedule.frequency,
    );

    // Check for auto-increase
    let amount = schedule.amount;
    if (schedule.auto_increase?.enabled) {
      amount = this.applyAutoIncrease(schedule);
    }

    // Update schedule with next date
    await supabase
      .from("contribution_schedules")
      .update({
        next_contribution_date: nextDate.toISOString(),
        amount,
      })
      .eq("id", scheduleId);

    // Create the next scheduled contribution
    await supabase.from("scheduled_contributions").insert({
      schedule_id: scheduleId,
      amount,
      source_account_id: schedule.source_account_id,
      scheduled_date: nextDate.toISOString(),
      status: "pending",
      retry_count: 0,
    });
  }

  private calculateNextDate(current: Date, frequency: string): Date {
    const next = new Date(current);
    switch (frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
    }
    return next;
  }

  private applyAutoIncrease(schedule: {
    amount: number;
    auto_increase?: { enabled: boolean; percent: number; frequency: string };
    last_increase_date?: string;
  }): number {
    if (!schedule.auto_increase?.enabled) return schedule.amount;

    const lastIncrease = schedule.last_increase_date
      ? new Date(schedule.last_increase_date)
      : null;
    const now = new Date();

    // Check if it's time for an increase
    let shouldIncrease = false;
    if (!lastIncrease) {
      shouldIncrease = true;
    } else if (schedule.auto_increase.frequency === "annually") {
      const yearsSince =
        (now.getTime() - lastIncrease.getTime()) / (365 * 24 * 60 * 60 * 1000);
      shouldIncrease = yearsSince >= 1;
    } else if (schedule.auto_increase.frequency === "quarterly") {
      const monthsSince =
        (now.getTime() - lastIncrease.getTime()) / (30 * 24 * 60 * 60 * 1000);
      shouldIncrease = monthsSince >= 3;
    }

    if (shouldIncrease) {
      return Math.round(
        schedule.amount * (1 + schedule.auto_increase.percent / 100),
      );
    }

    return schedule.amount;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async isGoalActive(goalId: string): Promise<boolean> {
    const { data } = await supabase
      .from("financial_goals")
      .select("status")
      .eq("id", goalId)
      .single();

    return data?.status === "active";
  }

  private async checkAccountBalance(
    accountId: string,
    amount: number,
  ): Promise<boolean> {
    const { data } = await supabase
      .from("bank_accounts")
      .select("balance")
      .eq("id", accountId)
      .single();

    return (data?.balance || 0) >= amount;
  }

  private async executeTransfer(
    sourceAccountId: string,
    goalId: string,
    amount: number,
  ): Promise<boolean> {
    void sourceAccountId;
    void goalId;
    void amount;
    // In production, this would integrate with a payment processor
    // For now, simulate the transfer
    // ContributionScheduler: Executing transfer
    return true;
  }

  private async updateGoalProgress(
    goalId: string,
    amount: number,
  ): Promise<void> {
    const { data: goal } = await supabase
      .from("financial_goals")
      .select("current_amount")
      .eq("id", goalId)
      .single();

    if (goal) {
      await supabase
        .from("financial_goals")
        .update({
          current_amount: goal.current_amount + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goalId);
    }
  }

  private async sendNotification(
    contribution: ScheduledContribution,
    type: "success" | "failure",
  ): Promise<void> {
    void contribution;
    void type;
    // Integrate with notification service
    // ContributionScheduler: Sending notification
  }

  private emitEvent(
    type: ContributionEvent["type"],
    contribution: ScheduledContribution,
    details?: string,
  ): void {
    this.eventsSubject.next({
      type,
      contribution,
      timestamp: new Date(),
      details,
    });
  }

  private async refreshStats(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: pending } = await supabase
      .from("scheduled_contributions")
      .select("id", { count: "exact" })
      .eq("status", "pending");

    const { data: completedToday } = await supabase
      .from("scheduled_contributions")
      .select("id", { count: "exact" })
      .eq("status", "completed")
      .gte("processed_at", today.toISOString());

    const { data: failedToday } = await supabase
      .from("scheduled_contributions")
      .select("id", { count: "exact" })
      .eq("status", "failed")
      .gte("processed_at", today.toISOString());

    const { data: monthlyData } = await supabase
      .from("scheduled_contributions")
      .select("amount")
      .eq("status", "completed")
      .gte("processed_at", monthStart.toISOString());

    const totalThisMonth =
      monthlyData?.reduce((sum, c) => sum + c.amount, 0) || 0;

    this.statsSubject.next({
      pendingContributions: pending?.length || 0,
      completedToday: completedToday?.length || 0,
      failedToday: failedToday?.length || 0,
      totalProcessedThisMonth: monthlyData?.length || 0,
      totalAmountThisMonth: totalThisMonth,
    });
  }

  /**
   * Get current stats
   */
  getStats(): SchedulerStats {
    return this.statsSubject.getValue();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let schedulerInstance: ContributionSchedulerService | null = null;

export function getContributionScheduler(
  config?: Partial<SchedulerConfig>,
): ContributionSchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new ContributionSchedulerService(config);
  }
  return schedulerInstance;
}

export const contributionScheduler = getContributionScheduler();
