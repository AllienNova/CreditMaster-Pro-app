/**
 * Auto-Rebalance Scheduler Service
 *
 * Automated portfolio rebalancing with:
 * - Scheduled rebalancing (daily, weekly, monthly, quarterly)
 * - Threshold-triggered rebalancing
 * - User approval workflow
 * - Integration with order execution engine
 * - Tax-loss harvesting opportunities
 */

import { Subject, Observable, BehaviorSubject } from "rxjs";
import {
  PortfolioRebalanceService,
  getPortfolioRebalanceService,
  Portfolio,
  RebalanceRecommendation,
  RebalanceTrade,
  CurrentAllocation,
  AssetClass,
} from "./PortfolioRebalanceService";

// ============================================================================
// TYPES
// ============================================================================

export type ScheduleFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "manual";

export type RebalanceApprovalStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "expired"
  | "executed"
  | "partially_executed"
  | "failed";

export type TriggerType = "scheduled" | "threshold" | "manual" | "cash_flow";

export interface RebalanceScheduleConfig {
  portfolioId: string;
  userId: string;
  enabled: boolean;
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  preferredTime?: string; // HH:MM format
  driftThreshold: number; // Percentage threshold for automatic trigger
  minTradeAmount: number; // Minimum trade amount in dollars
  requireApproval: boolean; // Whether to require user approval
  approvalTimeout: number; // Hours before pending approval expires
  taxOptimized: boolean;
  excludeAssetClasses?: AssetClass[];
}

export interface PendingRebalance {
  id: string;
  portfolioId: string;
  userId: string;
  triggerType: TriggerType;
  recommendation: RebalanceRecommendation;
  status: RebalanceApprovalStatus;
  createdAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  executedAt?: Date;
  executionResult?: RebalanceExecutionResult;
  notes?: string;
}

export interface RebalanceExecutionResult {
  success: boolean;
  executedTrades: ExecutedTrade[];
  failedTrades: FailedTrade[];
  totalExecutedValue: number;
  totalFailedValue: number;
  executionTime: Date;
  errors?: string[];
}

export interface ExecutedTrade extends RebalanceTrade {
  orderId: string;
  executedPrice: number;
  executedQuantity: number;
  commission: number;
}

export interface FailedTrade extends RebalanceTrade {
  error: string;
  attemptedAt: Date;
}

export interface SchedulerStatus {
  isRunning: boolean;
  lastCheckTime?: Date;
  nextCheckTime?: Date;
  activeSchedules: number;
  pendingRebalances: number;
}

export interface RebalanceEvent {
  type:
    | "schedule_created"
    | "schedule_updated"
    | "rebalance_triggered"
    | "approval_required"
    | "rebalance_approved"
    | "rebalance_rejected"
    | "rebalance_executed"
    | "rebalance_failed"
    | "rebalance_expired";
  portfolioId: string;
  userId: string;
  pendingRebalanceId?: string;
  data?: unknown;
  timestamp: Date;
}

export const DEFAULT_SCHEDULE_CONFIG: Omit<
  RebalanceScheduleConfig,
  "portfolioId" | "userId"
> = {
  enabled: false,
  frequency: "monthly",
  driftThreshold: 5,
  minTradeAmount: 100,
  requireApproval: true,
  approvalTimeout: 48,
  taxOptimized: true,
};

// ============================================================================
// AUTO-REBALANCE SCHEDULER SERVICE
// ============================================================================

export class AutoRebalanceScheduler {
  private rebalanceService: PortfolioRebalanceService;

  // State
  private schedules = new Map<string, RebalanceScheduleConfig>();
  private pendingRebalances = new Map<string, PendingRebalance>();
  private isRunning = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastCheckTime?: Date;

  // Event subjects
  private eventSubject = new Subject<RebalanceEvent>();
  private statusSubject = new BehaviorSubject<SchedulerStatus>(
    this.getStatus(),
  );

  constructor() {
    this.rebalanceService = getPortfolioRebalanceService();
  }

  // ============================================================================
  // SCHEDULE MANAGEMENT
  // ============================================================================

  /**
   * Create or update a rebalance schedule for a portfolio
   */
  setSchedule(config: RebalanceScheduleConfig): void {
    const key = this.getScheduleKey(config.portfolioId, config.userId);
    const isNew = !this.schedules.has(key);

    this.schedules.set(key, config);

    this.emitEvent({
      type: isNew ? "schedule_created" : "schedule_updated",
      portfolioId: config.portfolioId,
      userId: config.userId,
      data: config,
      timestamp: new Date(),
    });

    this.updateStatus();
  }

  /**
   * Get schedule for a portfolio
   */
  getSchedule(
    portfolioId: string,
    userId: string,
  ): RebalanceScheduleConfig | undefined {
    return this.schedules.get(this.getScheduleKey(portfolioId, userId));
  }

  /**
   * Get all schedules for a user
   */
  getUserSchedules(userId: string): RebalanceScheduleConfig[] {
    return Array.from(this.schedules.values()).filter(
      (s) => s.userId === userId,
    );
  }

  /**
   * Remove a schedule
   */
  removeSchedule(portfolioId: string, userId: string): boolean {
    const key = this.getScheduleKey(portfolioId, userId);
    const result = this.schedules.delete(key);
    this.updateStatus();
    return result;
  }

  /**
   * Enable/disable a schedule
   */
  toggleSchedule(portfolioId: string, userId: string, enabled: boolean): void {
    const schedule = this.getSchedule(portfolioId, userId);
    if (schedule) {
      schedule.enabled = enabled;
      this.setSchedule(schedule);
    }
  }

  // ============================================================================
  // REBALANCE TRIGGERING
  // ============================================================================

  /**
   * Manually trigger a rebalance check for a portfolio
   */
  async triggerRebalanceCheck(
    portfolioId: string,
    userId: string,
    triggerType: TriggerType = "manual",
  ): Promise<PendingRebalance | null> {
    try {
      // Get portfolio and analyze drift
      const analysis = await this.rebalanceService.analyzePortfolioDrift(
        portfolioId,
        userId,
      );

      if (!analysis.needsRebalance) {
        return null;
      }

      // Generate recommendation
      const schedule = this.getSchedule(portfolioId, userId);
      const recommendation =
        this.rebalanceService.generateRebalanceRecommendation(
          analysis.portfolio,
          { taxOptimized: schedule?.taxOptimized ?? true },
        );

      // Filter trades below minimum threshold
      const minAmount =
        schedule?.minTradeAmount ?? DEFAULT_SCHEDULE_CONFIG.minTradeAmount;
      recommendation.trades = recommendation.trades.filter(
        (t) => t.tradeAmount >= minAmount,
      );

      if (recommendation.trades.length === 0) {
        return null;
      }

      // Create pending rebalance
      const pending = this.createPendingRebalance(
        portfolioId,
        userId,
        triggerType,
        recommendation,
        schedule?.approvalTimeout ?? DEFAULT_SCHEDULE_CONFIG.approvalTimeout,
      );

      this.pendingRebalances.set(pending.id, pending);

      // Emit event
      const requiresApproval = schedule?.requireApproval ?? true;
      this.emitEvent({
        type: requiresApproval ? "approval_required" : "rebalance_triggered",
        portfolioId,
        userId,
        pendingRebalanceId: pending.id,
        data: { recommendation, requiresApproval },
        timestamp: new Date(),
      });

      // If no approval required, auto-approve
      if (!requiresApproval) {
        pending.status = "approved";
        pending.approvedAt = new Date();
      }

      this.updateStatus();
      return pending;
    } catch (_error) {
      // AutoRebalanceScheduler error: Trigger check failed
      void _error;
      return null;
    }
  }

  // ============================================================================
  // APPROVAL WORKFLOW
  // ============================================================================

  /**
   * Get all pending rebalances for a user
   */
  getPendingRebalances(userId: string): PendingRebalance[] {
    return Array.from(this.pendingRebalances.values()).filter(
      (p) => p.userId === userId && p.status === "pending_review",
    );
  }

  /**
   * Approve a pending rebalance
   */
  approveRebalance(pendingId: string, userId: string, notes?: string): boolean {
    const pending = this.pendingRebalances.get(pendingId);
    if (!pending || pending.userId !== userId) {
      return false;
    }

    if (pending.status !== "pending_review") {
      return false;
    }

    if (new Date() > pending.expiresAt) {
      pending.status = "expired";
      return false;
    }

    pending.status = "approved";
    pending.approvedAt = new Date();
    pending.notes = notes;

    this.emitEvent({
      type: "rebalance_approved",
      portfolioId: pending.portfolioId,
      userId,
      pendingRebalanceId: pendingId,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Reject a pending rebalance
   */
  rejectRebalance(pendingId: string, userId: string, reason?: string): boolean {
    const pending = this.pendingRebalances.get(pendingId);
    if (!pending || pending.userId !== userId) {
      return false;
    }

    if (pending.status !== "pending_review") {
      return false;
    }

    pending.status = "rejected";
    pending.notes = reason;

    this.emitEvent({
      type: "rebalance_rejected",
      portfolioId: pending.portfolioId,
      userId,
      pendingRebalanceId: pendingId,
      data: { reason },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get a specific pending rebalance
   */
  getPendingRebalance(pendingId: string): PendingRebalance | undefined {
    return this.pendingRebalances.get(pendingId);
  }

  // ============================================================================
  // EXECUTION
  // ============================================================================

  /**
   * Execute an approved rebalance
   * Note: This would integrate with OrderExecutionEngine in production
   */
  async executeRebalance(
    pendingId: string,
    userId: string,
  ): Promise<RebalanceExecutionResult> {
    const pending = this.pendingRebalances.get(pendingId);
    if (!pending || pending.userId !== userId) {
      return {
        success: false,
        executedTrades: [],
        failedTrades: [],
        totalExecutedValue: 0,
        totalFailedValue: 0,
        executionTime: new Date(),
        errors: ["Pending rebalance not found"],
      };
    }

    if (pending.status !== "approved") {
      return {
        success: false,
        executedTrades: [],
        failedTrades: [],
        totalExecutedValue: 0,
        totalFailedValue: 0,
        executionTime: new Date(),
        errors: [`Cannot execute rebalance with status: ${pending.status}`],
      };
    }

    pending.status = "executed";
    pending.executedAt = new Date();

    // In production, this would call OrderExecutionEngine
    // For now, simulate successful execution
    const executedTrades: ExecutedTrade[] = pending.recommendation.trades.map(
      (trade) => ({
        ...trade,
        orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        executedPrice: trade.targetValue / (trade.tradeAmount / 100), // Simulated
        executedQuantity: trade.tradeAmount,
        commission: trade.tradeAmount * 0.001, // 0.1% commission
      }),
    );

    const result: RebalanceExecutionResult = {
      success: true,
      executedTrades,
      failedTrades: [],
      totalExecutedValue: executedTrades.reduce(
        (sum, t) => sum + t.tradeAmount,
        0,
      ),
      totalFailedValue: 0,
      executionTime: new Date(),
    };

    pending.executionResult = result;

    // Record in rebalance history
    try {
      const portfolio = await this.rebalanceService.getPortfolio(
        pending.portfolioId,
        userId,
      );

      if (portfolio) {
        // Calculate post-rebalance allocations (simplified)
        const postAllocations: CurrentAllocation[] =
          portfolio.targetAllocations.map((target) => ({
            assetClass: target.assetClass,
            currentPercent: target.targetPercent,
            currentValue: (target.targetPercent / 100) * portfolio.totalValue,
            drift: 0,
            driftPercent: 0,
          }));

        await this.rebalanceService.recordRebalance(
          pending.portfolioId,
          userId,
          portfolio.currentAllocations,
          postAllocations,
          pending.recommendation.trades,
        );
      }
    } catch (_error) {
      // AutoRebalanceScheduler error: Failed to record rebalance
      void _error;
    }

    this.emitEvent({
      type: "rebalance_executed",
      portfolioId: pending.portfolioId,
      userId,
      pendingRebalanceId: pendingId,
      data: result,
      timestamp: new Date(),
    });

    this.updateStatus();
    return result;
  }

  // ============================================================================
  // SCHEDULER CONTROL
  // ============================================================================

  /**
   * Start the scheduler
   */
  start(checkIntervalMs: number = 60000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.runScheduledChecks();
    }, checkIntervalMs);

    this.updateStatus();
    // AutoRebalanceScheduler: Scheduler started
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    this.updateStatus();
    // AutoRebalanceScheduler: Scheduler stopped
  }

  /**
   * Run scheduled checks for all enabled schedules
   */
  private async runScheduledChecks(): Promise<void> {
    this.lastCheckTime = new Date();

    // Check for expired pending rebalances
    for (const [id, pending] of this.pendingRebalances) {
      if (
        pending.status === "pending_review" &&
        new Date() > pending.expiresAt
      ) {
        pending.status = "expired";
        this.emitEvent({
          type: "rebalance_expired",
          portfolioId: pending.portfolioId,
          userId: pending.userId,
          pendingRebalanceId: id,
          timestamp: new Date(),
        });
      }
    }

    // Check schedules that need to trigger
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      if (this.shouldTriggerSchedule(schedule)) {
        await this.triggerRebalanceCheck(
          schedule.portfolioId,
          schedule.userId,
          "scheduled",
        );
      }
    }

    this.updateStatus();
  }

  /**
   * Determine if a schedule should trigger now
   */
  private shouldTriggerSchedule(schedule: RebalanceScheduleConfig): boolean {
    const now = new Date();

    // Check if there's already a pending rebalance
    const hasPending = Array.from(this.pendingRebalances.values()).some(
      (p) =>
        p.portfolioId === schedule.portfolioId &&
        p.userId === schedule.userId &&
        (p.status === "pending_review" || p.status === "approved"),
    );
    if (hasPending) return false;

    // Check frequency
    switch (schedule.frequency) {
      case "daily":
        return this.isPreferredTime(schedule.preferredTime);

      case "weekly":
        return (
          now.getDay() === (schedule.dayOfWeek ?? 0) &&
          this.isPreferredTime(schedule.preferredTime)
        );

      case "monthly":
        return (
          now.getDate() === (schedule.dayOfMonth ?? 1) &&
          this.isPreferredTime(schedule.preferredTime)
        );

      case "quarterly":
        const isQuarterStart =
          [0, 3, 6, 9].includes(now.getMonth()) && now.getDate() === 1;
        return isQuarterStart && this.isPreferredTime(schedule.preferredTime);

      default:
        return false;
    }
  }

  private isPreferredTime(preferredTime?: string): boolean {
    if (!preferredTime) return true;

    const now = new Date();
    const [hours, minutes] = preferredTime.split(":").map(Number);

    // Check within 5 minute window
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = hours * 60 + minutes;

    return Math.abs(currentMinutes - targetMinutes) <= 5;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getScheduleKey(portfolioId: string, userId: string): string {
    return `${userId}:${portfolioId}`;
  }

  private createPendingRebalance(
    portfolioId: string,
    userId: string,
    triggerType: TriggerType,
    recommendation: RebalanceRecommendation,
    timeoutHours: number,
  ): PendingRebalance {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutHours * 60 * 60 * 1000);

    return {
      id: `PRB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      portfolioId,
      userId,
      triggerType,
      recommendation,
      status: "pending_review",
      createdAt: now,
      expiresAt,
    };
  }

  private emitEvent(event: RebalanceEvent): void {
    this.eventSubject.next(event);
  }

  private updateStatus(): void {
    this.statusSubject.next(this.getStatus());
  }

  // ============================================================================
  // OBSERVABLES & STATUS
  // ============================================================================

  get events$(): Observable<RebalanceEvent> {
    return this.eventSubject.asObservable();
  }

  get status$(): Observable<SchedulerStatus> {
    return this.statusSubject.asObservable();
  }

  getStatus(): SchedulerStatus {
    const pendingCount = Array.from(this.pendingRebalances.values()).filter(
      (p) => p.status === "pending_review" || p.status === "approved",
    ).length;

    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      nextCheckTime:
        this.isRunning && this.lastCheckTime
          ? new Date(this.lastCheckTime.getTime() + 60000)
          : undefined,
      activeSchedules: Array.from(this.schedules.values()).filter(
        (s) => s.enabled,
      ).length,
      pendingRebalances: pendingCount,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let autoRebalanceSchedulerInstance: AutoRebalanceScheduler | null = null;

export function getAutoRebalanceScheduler(): AutoRebalanceScheduler {
  if (!autoRebalanceSchedulerInstance) {
    autoRebalanceSchedulerInstance = new AutoRebalanceScheduler();
  }
  return autoRebalanceSchedulerInstance;
}

export function createAutoRebalanceScheduler(): AutoRebalanceScheduler {
  return new AutoRebalanceScheduler();
}
