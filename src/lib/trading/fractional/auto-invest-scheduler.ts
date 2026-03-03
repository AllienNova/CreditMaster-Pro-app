/**
 * Auto-Invest Scheduler
 *
 * Manages recurring investment schedules that automatically place
 * fractional orders at user-defined intervals. Supports daily, weekly,
 * biweekly, and monthly frequencies with portfolio allocation percentages.
 *
 * Schedules are stored in-memory with an interface designed for
 * database persistence (Supabase). The `executeScheduledOrders` method
 * is intended to be called by a cron job or serverless function.
 */

import type { RoutingPreference } from "@/lib/trading/brokers/broker-router";
import type {
  FractionalOrderService,
  FractionalOrderResult,
} from "./fractional-order-service";

// ============================================================================
// TYPES
// ============================================================================

export type InvestmentFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface PortfolioAllocation {
  /** Stock or ETF ticker symbol */
  symbol: string;
  /** Percentage of total amount allocated to this symbol (0-100) */
  percentage: number;
}

export interface AutoInvestScheduleParams {
  /** User creating the schedule */
  userId: string;
  /** How to distribute the investment across symbols */
  allocations: PortfolioAllocation[];
  /** Total dollar amount per execution */
  totalAmount: number;
  /** How often to invest */
  frequency: InvestmentFrequency;
  /** When to start investing */
  startDate: Date;
  /** Optional broker routing preference */
  brokerPreference?: RoutingPreference;
}

export interface AutoInvestSchedule {
  /** Unique schedule identifier */
  id: string;
  /** Owning user */
  userId: string;
  /** Portfolio allocation plan */
  allocations: PortfolioAllocation[];
  /** Dollar amount per execution */
  totalAmount: number;
  /** Execution frequency */
  frequency: InvestmentFrequency;
  /** Next planned execution time */
  nextExecution: Date;
  /** Schedule lifecycle status */
  status: "active" | "paused" | "canceled";
  /** When the schedule was created */
  createdAt: Date;
  /** When orders were last placed */
  lastExecutedAt?: Date;
  /** Total number of successful executions */
  executionCount: number;
  /** Broker routing preference */
  brokerPreference?: RoutingPreference;
}

export interface ScheduleExecutionResult {
  scheduleId: string;
  executedAt: Date;
  results: Array<{
    symbol: string;
    dollarAmount: number;
    orderResult: FractionalOrderResult;
  }>;
  totalInvested: number;
  successCount: number;
  failureCount: number;
}

export interface ScheduleUpdate {
  allocations?: PortfolioAllocation[];
  totalAmount?: number;
  frequency?: InvestmentFrequency;
  status?: "active" | "paused";
  brokerPreference?: RoutingPreference;
}

// ============================================================================
// AUTO-INVEST SCHEDULER
// ============================================================================

export class AutoInvestScheduler {
  private readonly fractionalService: FractionalOrderService;
  private readonly schedules: Map<string, AutoInvestSchedule> = new Map();

  constructor(fractionalService: FractionalOrderService) {
    this.fractionalService = fractionalService;
  }

  // ==========================================================================
  // SCHEDULE MANAGEMENT
  // ==========================================================================

  /**
   * Create a new recurring investment schedule.
   * Validates allocations sum to 100% and amounts are positive.
   */
  createSchedule(params: AutoInvestScheduleParams): AutoInvestSchedule {
    this.validateScheduleParams(params);

    const schedule: AutoInvestSchedule = {
      id: this.generateScheduleId(),
      userId: params.userId,
      allocations: [...params.allocations],
      totalAmount: params.totalAmount,
      frequency: params.frequency,
      nextExecution: new Date(params.startDate),
      status: "active",
      createdAt: new Date(),
      executionCount: 0,
      brokerPreference: params.brokerPreference,
    };

    this.schedules.set(schedule.id, schedule);
    return { ...schedule };
  }

  /**
   * Update an existing schedule. Only modifiable fields can be changed.
   * Cannot update a canceled schedule.
   */
  updateSchedule(scheduleId: string, updates: ScheduleUpdate): AutoInvestSchedule {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new AutoInvestError(`Schedule "${scheduleId}" not found`);
    }
    if (schedule.status === "canceled") {
      throw new AutoInvestError(`Cannot update canceled schedule "${scheduleId}"`);
    }

    if (updates.allocations !== undefined) {
      this.validateAllocations(updates.allocations);
      schedule.allocations = [...updates.allocations];
    }
    if (updates.totalAmount !== undefined) {
      if (updates.totalAmount <= 0) {
        throw new AutoInvestError("Total amount must be greater than 0");
      }
      schedule.totalAmount = updates.totalAmount;
    }
    if (updates.frequency !== undefined) {
      schedule.frequency = updates.frequency;
      // Recalculate next execution based on new frequency
      const baseDate = schedule.lastExecutedAt ?? schedule.createdAt;
      schedule.nextExecution = this.getNextExecutionDate({
        ...schedule,
        frequency: updates.frequency,
        lastExecutedAt: baseDate,
      });
    }
    if (updates.status !== undefined) {
      schedule.status = updates.status;
    }
    if (updates.brokerPreference !== undefined) {
      schedule.brokerPreference = updates.brokerPreference;
    }

    return { ...schedule };
  }

  /**
   * Cancel a schedule permanently. It cannot be reactivated.
   */
  cancelSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new AutoInvestError(`Schedule "${scheduleId}" not found`);
    }
    if (schedule.status === "canceled") {
      throw new AutoInvestError(`Schedule "${scheduleId}" is already canceled`);
    }

    schedule.status = "canceled";
  }

  /**
   * Get all schedules for a user, optionally filtered by status.
   */
  getSchedules(
    userId: string,
    statusFilter?: AutoInvestSchedule["status"],
  ): AutoInvestSchedule[] {
    const results: AutoInvestSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      if (schedule.userId !== userId) continue;
      if (statusFilter && schedule.status !== statusFilter) continue;
      results.push({ ...schedule });
    }

    return results;
  }

  /**
   * Get a single schedule by ID.
   */
  getSchedule(scheduleId: string): AutoInvestSchedule | undefined {
    const schedule = this.schedules.get(scheduleId);
    return schedule ? { ...schedule } : undefined;
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute all active schedules that are due at the given time.
   * Intended to be called by a cron job (e.g. every hour or every day).
   *
   * For each due schedule:
   * 1. Places fractional dollar orders for each allocation
   * 2. Advances the nextExecution date
   * 3. Increments execution count
   */
  async executeScheduledOrders(now: Date): Promise<ScheduleExecutionResult[]> {
    const executionResults: ScheduleExecutionResult[] = [];

    for (const schedule of this.schedules.values()) {
      if (schedule.status !== "active") continue;
      if (schedule.nextExecution > now) continue;

      const result = await this.executeSchedule(schedule, now);
      executionResults.push(result);
    }

    return executionResults;
  }

  // ==========================================================================
  // DATE CALCULATION
  // ==========================================================================

  /**
   * Calculate the next execution date based on the schedule's frequency
   * and the most recent execution or creation date.
   */
  getNextExecutionDate(schedule: Pick<AutoInvestSchedule, "frequency" | "nextExecution" | "lastExecutedAt">): Date {
    const baseDate = schedule.lastExecutedAt
      ? new Date(schedule.lastExecutedAt)
      : new Date(schedule.nextExecution);

    const next = new Date(baseDate);

    switch (schedule.frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async executeSchedule(
    schedule: AutoInvestSchedule,
    now: Date,
  ): Promise<ScheduleExecutionResult> {
    const results: ScheduleExecutionResult["results"] = [];
    let totalInvested = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const allocation of schedule.allocations) {
      const dollarAmount = parseFloat(
        ((schedule.totalAmount * allocation.percentage) / 100).toFixed(2),
      );

      if (dollarAmount < 1) {
        results.push({
          symbol: allocation.symbol,
          dollarAmount,
          orderResult: {
            success: false,
            error: `Allocation amount $${dollarAmount.toFixed(2)} is below minimum`,
          },
        });
        failureCount++;
        continue;
      }

      const orderResult = await this.fractionalService.placeDollarOrder({
        symbol: allocation.symbol,
        dollarAmount,
        side: "buy",
        brokerPreference: schedule.brokerPreference,
        userId: schedule.userId,
      });

      results.push({
        symbol: allocation.symbol,
        dollarAmount,
        orderResult,
      });

      if (orderResult.success) {
        totalInvested += orderResult.estimatedCost ?? dollarAmount;
        successCount++;
      } else {
        failureCount++;
      }
    }

    // Update schedule state
    schedule.lastExecutedAt = now;
    schedule.executionCount++;
    schedule.nextExecution = this.getNextExecutionDate(schedule);

    return {
      scheduleId: schedule.id,
      executedAt: now,
      results,
      totalInvested,
      successCount,
      failureCount,
    };
  }

  private validateScheduleParams(params: AutoInvestScheduleParams): void {
    if (!params.userId || params.userId.trim() === "") {
      throw new AutoInvestError("User ID is required");
    }
    if (params.totalAmount <= 0) {
      throw new AutoInvestError("Total amount must be greater than 0");
    }
    if (!params.allocations || params.allocations.length === 0) {
      throw new AutoInvestError("At least one allocation is required");
    }
    if (!params.startDate || isNaN(params.startDate.getTime())) {
      throw new AutoInvestError("Valid start date is required");
    }

    this.validateAllocations(params.allocations);
  }

  private validateAllocations(allocations: PortfolioAllocation[]): void {
    if (allocations.length === 0) {
      throw new AutoInvestError("At least one allocation is required");
    }

    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
    // Allow small floating-point tolerance
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new AutoInvestError(
        `Allocations must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`,
      );
    }

    for (const allocation of allocations) {
      if (!allocation.symbol || allocation.symbol.trim() === "") {
        throw new AutoInvestError("Each allocation must have a symbol");
      }
      if (allocation.percentage <= 0) {
        throw new AutoInvestError(
          `Allocation percentage for "${allocation.symbol}" must be greater than 0`,
        );
      }
      if (allocation.percentage > 100) {
        throw new AutoInvestError(
          `Allocation percentage for "${allocation.symbol}" cannot exceed 100%`,
        );
      }
    }

    // Check for duplicate symbols
    const symbols = allocations.map((a) => a.symbol.toUpperCase());
    const uniqueSymbols = new Set(symbols);
    if (uniqueSymbols.size !== symbols.length) {
      throw new AutoInvestError("Duplicate symbols found in allocations");
    }
  }

  private generateScheduleId(): string {
    return `SCHED-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class AutoInvestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutoInvestError";
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createAutoInvestScheduler(
  fractionalService: FractionalOrderService,
): AutoInvestScheduler {
  return new AutoInvestScheduler(fractionalService);
}
