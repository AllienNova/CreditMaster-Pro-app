/**
 * Operating Mode Manager
 *
 * Central state machine for the WATCH -> GUIDED -> AUTONOMOUS operating mode
 * progression. Manages graduation tracking, mode transitions, permissions,
 * and circuit breaker events.
 *
 * Mode Progression:
 *   WATCH (paper trade only) -> GUIDED (live with confirmation) -> AUTONOMOUS (auto-execute)
 *
 * Each transition requires meeting specific graduation criteria and is recorded
 * in the mode_transitions table for auditability.
 */

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  type OperatingMode,
  type TradingAccountState,
  type ModeStatus,
  type ModeTransition,
  type ModePermissions,
  type GraduationProgressReport,
  type GraduationProgress,
  type CircuitBreakerEvent,
  type StoredCircuitBreakerEvent,
  type OperationResult,
  WATCH_TO_GUIDED_CRITERIA,
  GUIDED_TO_AUTONOMOUS_CRITERIA,
  getNextMode,
  MODE_ORDER,
} from "./mode-types";

// ============================================================================
// DB ROW TYPES (snake_case from PostgreSQL)
// ============================================================================

interface TradingAccountRow {
  id: string;
  user_id: string;
  operating_mode: OperatingMode;
  watch_start_date: string;
  watch_paper_trade_count: number;
  watch_paper_days_active: number;
  watch_paper_profitable: boolean;
  watch_graduation_date: string | null;
  guided_start_date: string | null;
  guided_live_trade_count: number;
  guided_live_days_active: number;
  guided_live_profitable: boolean;
  guided_graduation_date: string | null;
  strategy_performance: Record<string, unknown>;
  max_daily_trades: number;
  max_position_value: number;
  max_daily_loss_pct: number;
  autonomous_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CircuitBreakerRow {
  id: string;
  user_id: string;
  breaker_type: string;
  severity: string;
  trigger_value: number | null;
  threshold_value: number | null;
  action_taken: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  symbol: string | null;
  operating_mode: string | null;
  created_at: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Convert a DB row to a TradingAccountState */
function rowToAccountState(row: TradingAccountRow): TradingAccountState {
  return {
    id: row.id,
    userId: row.user_id,
    operatingMode: row.operating_mode,
    watchStartDate: row.watch_start_date,
    watchPaperTradeCount: row.watch_paper_trade_count,
    watchPaperDaysActive: row.watch_paper_days_active,
    watchPaperProfitable: row.watch_paper_profitable,
    watchGraduationDate: row.watch_graduation_date,
    guidedStartDate: row.guided_start_date,
    guidedLiveTradeCount: row.guided_live_trade_count,
    guidedLiveDaysActive: row.guided_live_days_active,
    guidedLiveProfitable: row.guided_live_profitable,
    guidedGraduationDate: row.guided_graduation_date,
    strategyPerformance: row.strategy_performance,
    maxDailyTrades: row.max_daily_trades,
    maxPositionValue: Number(row.max_position_value),
    maxDailyLossPct: Number(row.max_daily_loss_pct),
    autonomousEnabled: row.autonomous_enabled,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert a circuit breaker DB row to a StoredCircuitBreakerEvent */
function rowToCircuitBreakerEvent(
  row: CircuitBreakerRow,
): StoredCircuitBreakerEvent {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.breaker_type as StoredCircuitBreakerEvent["type"],
    severity: row.severity as StoredCircuitBreakerEvent["severity"],
    triggerValue: row.trigger_value,
    thresholdValue: row.threshold_value,
    actionTaken: row.action_taken,
    details: row.details,
    resolved: row.resolved,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
    symbol: row.symbol ?? undefined,
    operatingMode:
      (row.operating_mode as StoredCircuitBreakerEvent["operatingMode"]) ??
      undefined,
    createdAt: row.created_at,
  };
}

// ============================================================================
// MODE PERMISSIONS MAP
// ============================================================================

const MODE_PERMISSIONS: Record<OperatingMode, ModePermissions> = {
  watch: {
    mode: "watch",
    canViewSignals: true,
    canPaperTrade: true,
    canPlaceLiveOrders: false,
    requiresConfirmation: false,
    canAutoExecute: false,
  },
  guided: {
    mode: "guided",
    canViewSignals: true,
    canPaperTrade: true,
    canPlaceLiveOrders: true,
    requiresConfirmation: true,
    canAutoExecute: false,
  },
  autonomous: {
    mode: "autonomous",
    canViewSignals: true,
    canPaperTrade: true,
    canPlaceLiveOrders: true,
    requiresConfirmation: false,
    canAutoExecute: true,
  },
};

// ============================================================================
// OPERATING MODE MANAGER
// ============================================================================

export class OperatingModeManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // --------------------------------------------------------------------------
  // Account Management
  // --------------------------------------------------------------------------

  /**
   * Load or create the trading account for this user.
   * If no account exists, creates one in WATCH mode.
   */
  async getAccount(): Promise<OperationResult<TradingAccountState>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin.from as any)(
        "trading_accounts",
      )
        .select("*")
        .eq("user_id", this.userId)
        .single();

      if (error && error.code === "PGRST116") {
        // No row found -- create a new account
        return this.createAccount();
      }

      if (error) {
        return { success: false, error: `Failed to load account: ${error.message}` };
      }

      return {
        success: true,
        data: rowToAccountState(data as TradingAccountRow),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Failed to load account: ${message}` };
    }
  }

  /**
   * Create a new trading account in WATCH mode.
   */
  private async createAccount(): Promise<OperationResult<TradingAccountState>> {
    try {
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin.from as any)(
        "trading_accounts",
      )
        .insert({
          user_id: this.userId,
          operating_mode: "watch",
          watch_start_date: now,
          watch_paper_trade_count: 0,
          watch_paper_days_active: 0,
          watch_paper_profitable: false,
          guided_live_trade_count: 0,
          guided_live_days_active: 0,
          guided_live_profitable: false,
          strategy_performance: {},
          max_daily_trades: 10,
          max_position_value: 10000.0,
          max_daily_loss_pct: 2.0,
          autonomous_enabled: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return { success: false, error: `Failed to create account: ${error.message}` };
      }

      return {
        success: true,
        data: rowToAccountState(data as TradingAccountRow),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Failed to create account: ${message}` };
    }
  }

  // --------------------------------------------------------------------------
  // Mode Queries
  // --------------------------------------------------------------------------

  /**
   * Get the current operating mode for this user.
   */
  async getCurrentMode(): Promise<OperationResult<OperatingMode>> {
    const result = await this.getAccount();
    if (!result.success || !result.data) {
      return { success: false, error: result.error ?? "Account not found" };
    }

    if (!result.data.isActive) {
      return { success: false, error: "Account is inactive" };
    }

    return { success: true, data: result.data.operatingMode };
  }

  /**
   * Get the full mode status including graduation progress.
   */
  async getModeStatus(): Promise<OperationResult<ModeStatus>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;
    const graduationProgress = this.calculateGraduationProgress(account);

    const modeStartDate =
      account.operatingMode === "watch"
        ? account.watchStartDate
        : account.operatingMode === "guided"
          ? account.guidedStartDate ?? account.watchGraduationDate ?? account.watchStartDate
          : account.guidedGraduationDate ?? account.watchStartDate;

    return {
      success: true,
      data: {
        currentMode: account.operatingMode,
        modeStartDate,
        graduationProgress,
        nextModeAvailable: graduationProgress.allCriteriaMet,
        isActive: account.isActive,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Graduation
  // --------------------------------------------------------------------------

  /**
   * Get detailed graduation progress for the current mode.
   */
  async getGraduationProgress(): Promise<
    OperationResult<GraduationProgressReport>
  > {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    return {
      success: true,
      data: this.calculateGraduationProgress(accountResult.data),
    };
  }

  /**
   * Check if the user is eligible to graduate to the next mode.
   */
  async canGraduate(): Promise<OperationResult<boolean>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;

    if (!account.isActive) {
      return { success: true, data: false };
    }

    const nextMode = getNextMode(account.operatingMode);
    if (!nextMode) {
      return { success: true, data: false };
    }

    const progress = this.calculateGraduationProgress(account);
    return { success: true, data: progress.allCriteriaMet };
  }

  /**
   * Graduate to the next mode if all criteria are met.
   */
  async graduate(): Promise<OperationResult<ModeTransition>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;

    if (!account.isActive) {
      return { success: false, error: "Account is inactive" };
    }

    const nextMode = getNextMode(account.operatingMode);
    if (!nextMode) {
      return { success: false, error: "Already at maximum mode (autonomous)" };
    }

    const progress = this.calculateGraduationProgress(account);
    if (!progress.allCriteriaMet) {
      const unmet = Object.entries(progress.criteria)
        .filter(([, p]) => !p.met)
        .map(([name]) => name);
      return {
        success: false,
        error: `Graduation criteria not met: ${unmet.join(", ")}`,
      };
    }

    // Perform the transition
    return this.performTransition(
      account,
      nextMode,
      "upgrade",
      `Graduated from ${account.operatingMode} to ${nextMode}`,
      "user",
    );
  }

  /**
   * Downgrade to a lower mode. Used after kill switches or admin actions.
   */
  async downgrade(
    reason: string,
    initiatedBy: "user" | "system" | "admin" = "system",
  ): Promise<OperationResult<ModeTransition>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;
    const currentIdx = MODE_ORDER.indexOf(account.operatingMode);

    if (currentIdx <= 0) {
      return {
        success: false,
        error: "Already at minimum mode (watch)",
      };
    }

    const targetMode = MODE_ORDER[currentIdx - 1];
    return this.performTransition(
      account,
      targetMode,
      "downgrade",
      reason,
      initiatedBy,
    );
  }

  // --------------------------------------------------------------------------
  // Trade Recording
  // --------------------------------------------------------------------------

  /**
   * Record a paper trade and update the watch-mode graduation counter.
   */
  async recordPaperTrade(
    profitable: boolean,
  ): Promise<OperationResult<undefined>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;
    const newCount = account.watchPaperTradeCount + 1;

    // Update profitability: once profitable, stays true unless explicitly reset
    // In a real system you'd track a running P&L; here we use the latest signal
    const newProfitable = account.watchPaperProfitable || profitable;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from as any)("trading_accounts")
        .update({
          watch_paper_trade_count: newCount,
          watch_paper_profitable: newProfitable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (error) {
        return {
          success: false,
          error: `Failed to record paper trade: ${error.message}`,
        };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to record paper trade: ${message}`,
      };
    }
  }

  /**
   * Record a live trade and update the guided-mode graduation counter.
   */
  async recordLiveTrade(
    profitable: boolean,
  ): Promise<OperationResult<undefined>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;
    const newCount = account.guidedLiveTradeCount + 1;
    const newProfitable = account.guidedLiveProfitable || profitable;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from as any)("trading_accounts")
        .update({
          guided_live_trade_count: newCount,
          guided_live_profitable: newProfitable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (error) {
        return {
          success: false,
          error: `Failed to record live trade: ${error.message}`,
        };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to record live trade: ${message}`,
      };
    }
  }

  /**
   * Record an active day for the specified mode.
   */
  async recordActiveDay(
    mode: "watch" | "guided",
  ): Promise<OperationResult<undefined>> {
    const accountResult = await this.getAccount();
    if (!accountResult.success || !accountResult.data) {
      return { success: false, error: accountResult.error ?? "Account not found" };
    }

    const account = accountResult.data;
    const field =
      mode === "watch"
        ? "watch_paper_days_active"
        : "guided_live_days_active";
    const currentValue =
      mode === "watch"
        ? account.watchPaperDaysActive
        : account.guidedLiveDaysActive;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from as any)("trading_accounts")
        .update({
          [field]: currentValue + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (error) {
        return {
          success: false,
          error: `Failed to record active day: ${error.message}`,
        };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to record active day: ${message}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Permissions
  // --------------------------------------------------------------------------

  /**
   * Get the permissions for the user's current operating mode.
   */
  async getModePermissions(): Promise<OperationResult<ModePermissions>> {
    const modeResult = await this.getCurrentMode();
    if (!modeResult.success || !modeResult.data) {
      return { success: false, error: modeResult.error ?? "Could not determine mode" };
    }

    return {
      success: true,
      data: { ...MODE_PERMISSIONS[modeResult.data] },
    };
  }

  /**
   * Get permissions for a specific mode (no DB call).
   */
  static getPermissionsForMode(mode: OperatingMode): ModePermissions {
    return { ...MODE_PERMISSIONS[mode] };
  }

  // --------------------------------------------------------------------------
  // Circuit Breaker Events
  // --------------------------------------------------------------------------

  /**
   * Record a circuit breaker event.
   */
  async recordCircuitBreakerEvent(
    event: CircuitBreakerEvent,
  ): Promise<OperationResult<StoredCircuitBreakerEvent>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin.from as any)(
        "circuit_breaker_events",
      )
        .insert({
          user_id: this.userId,
          breaker_type: event.type,
          severity: event.severity,
          trigger_value: event.triggerValue,
          threshold_value: event.thresholdValue,
          action_taken: event.actionTaken,
          details: event.details,
          resolved: false,
          symbol: event.symbol ?? null,
          operating_mode: event.operatingMode ?? null,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to record circuit breaker event: ${error.message}`,
        };
      }

      return {
        success: true,
        data: rowToCircuitBreakerEvent(data as CircuitBreakerRow),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to record circuit breaker event: ${message}`,
      };
    }
  }

  /**
   * Get recent circuit breaker events for this user.
   */
  async getCircuitBreakerHistory(
    limit: number = 50,
  ): Promise<OperationResult<StoredCircuitBreakerEvent[]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin.from as any)(
        "circuit_breaker_events",
      )
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: `Failed to load circuit breaker history: ${error.message}`,
        };
      }

      const events = (data as CircuitBreakerRow[]).map(rowToCircuitBreakerEvent);
      return { success: true, data: events };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to load circuit breaker history: ${message}`,
      };
    }
  }

  /**
   * Resolve (close) a circuit breaker event.
   */
  async resolveCircuitBreaker(
    eventId: string,
    notes: string,
  ): Promise<OperationResult<StoredCircuitBreakerEvent>> {
    try {
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin.from as any)(
        "circuit_breaker_events",
      )
        .update({
          resolved: true,
          resolved_at: now,
          resolution_notes: notes,
        })
        .eq("id", eventId)
        .eq("user_id", this.userId)
        .select("*")
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to resolve circuit breaker: ${error.message}`,
        };
      }

      return {
        success: true,
        data: rowToCircuitBreakerEvent(data as CircuitBreakerRow),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to resolve circuit breaker: ${message}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  /**
   * Calculate graduation progress based on current account state.
   */
  private calculateGraduationProgress(
    account: TradingAccountState,
  ): GraduationProgressReport {
    const nextMode = getNextMode(account.operatingMode);

    if (!nextMode) {
      return {
        currentMode: account.operatingMode,
        nextMode: null,
        criteria: {},
        allCriteriaMet: false,
        summary: "Already at maximum operating mode (autonomous). No further graduation available.",
      };
    }

    const criteria: Record<string, GraduationProgress> = {};
    let allMet = true;

    if (account.operatingMode === "watch") {
      // WATCH -> GUIDED criteria
      const tradesMet =
        account.watchPaperTradeCount >= WATCH_TO_GUIDED_CRITERIA.minPaperTrades;
      criteria["paperTrades"] = {
        current: account.watchPaperTradeCount,
        required: WATCH_TO_GUIDED_CRITERIA.minPaperTrades,
        met: tradesMet,
      };

      const daysMet =
        account.watchPaperDaysActive >= WATCH_TO_GUIDED_CRITERIA.minDaysActive;
      criteria["daysActive"] = {
        current: account.watchPaperDaysActive,
        required: WATCH_TO_GUIDED_CRITERIA.minDaysActive,
        met: daysMet,
      };

      const profitableMet =
        !WATCH_TO_GUIDED_CRITERIA.requireProfitable ||
        account.watchPaperProfitable;
      criteria["profitable"] = {
        current: account.watchPaperProfitable,
        required: true,
        met: profitableMet,
      };

      allMet = tradesMet && daysMet && profitableMet;
    } else if (account.operatingMode === "guided") {
      // GUIDED -> AUTONOMOUS criteria
      const tradesMet =
        account.guidedLiveTradeCount >=
        GUIDED_TO_AUTONOMOUS_CRITERIA.minLiveTrades;
      criteria["liveTrades"] = {
        current: account.guidedLiveTradeCount,
        required: GUIDED_TO_AUTONOMOUS_CRITERIA.minLiveTrades,
        met: tradesMet,
      };

      const daysMet =
        account.guidedLiveDaysActive >=
        GUIDED_TO_AUTONOMOUS_CRITERIA.minDaysActive;
      criteria["daysActive"] = {
        current: account.guidedLiveDaysActive,
        required: GUIDED_TO_AUTONOMOUS_CRITERIA.minDaysActive,
        met: daysMet,
      };

      const profitableMet =
        !GUIDED_TO_AUTONOMOUS_CRITERIA.requireProfitable ||
        account.guidedLiveProfitable;
      criteria["profitable"] = {
        current: account.guidedLiveProfitable,
        required: true,
        met: profitableMet,
      };

      const optInMet =
        !GUIDED_TO_AUTONOMOUS_CRITERIA.requireUserOptIn ||
        account.autonomousEnabled;
      criteria["userOptIn"] = {
        current: account.autonomousEnabled,
        required: true,
        met: optInMet,
      };

      allMet = tradesMet && daysMet && profitableMet && optInMet;
    }

    const unmetCriteria = Object.entries(criteria)
      .filter(([, p]) => !p.met)
      .map(([name]) => name);

    const summary = allMet
      ? `All criteria met for graduation to ${nextMode} mode.`
      : `${unmetCriteria.length} criteria remaining: ${unmetCriteria.join(", ")}.`;

    return {
      currentMode: account.operatingMode,
      nextMode,
      criteria,
      allCriteriaMet: allMet,
      summary,
    };
  }

  /**
   * Perform a mode transition and persist to both tables.
   */
  private async performTransition(
    account: TradingAccountState,
    targetMode: OperatingMode,
    direction: "upgrade" | "downgrade",
    reason: string,
    initiatedBy: "user" | "system" | "admin",
  ): Promise<OperationResult<ModeTransition>> {
    const now = new Date().toISOString();
    const fromMode = account.operatingMode;

    // Build the metrics snapshot
    const metricsSnapshot: Record<string, unknown> = {
      watchPaperTradeCount: account.watchPaperTradeCount,
      watchPaperDaysActive: account.watchPaperDaysActive,
      watchPaperProfitable: account.watchPaperProfitable,
      guidedLiveTradeCount: account.guidedLiveTradeCount,
      guidedLiveDaysActive: account.guidedLiveDaysActive,
      guidedLiveProfitable: account.guidedLiveProfitable,
      autonomousEnabled: account.autonomousEnabled,
    };

    // Build the account update fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accountUpdate: Record<string, any> = {
      operating_mode: targetMode,
      updated_at: now,
    };

    if (direction === "upgrade") {
      if (fromMode === "watch" && targetMode === "guided") {
        accountUpdate.watch_graduation_date = now;
        accountUpdate.guided_start_date = now;
      } else if (fromMode === "guided" && targetMode === "autonomous") {
        accountUpdate.guided_graduation_date = now;
      }
    }

    try {
      // Update the trading account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabaseAdmin.from as any)(
        "trading_accounts",
      )
        .update(accountUpdate)
        .eq("id", account.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update account mode: ${updateError.message}`,
        };
      }

      // Record the transition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: transitionError } = await (supabaseAdmin.from as any)(
        "mode_transitions",
      ).insert({
        user_id: this.userId,
        trading_account_id: account.id,
        from_mode: fromMode,
        to_mode: targetMode,
        direction,
        reason,
        initiated_by: initiatedBy,
        metrics_snapshot: metricsSnapshot,
        created_at: now,
      });

      if (transitionError) {
        return {
          success: false,
          error: `Mode updated but failed to record transition: ${transitionError.message}`,
        };
      }

      const transition: ModeTransition = {
        fromMode,
        toMode: targetMode,
        direction,
        reason,
        initiatedBy,
        metricsSnapshot,
        timestamp: now,
      };

      return { success: true, data: transition };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to perform mode transition: ${message}`,
      };
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new OperatingModeManager for the given user.
 */
export function createOperatingModeManager(
  userId: string,
): OperatingModeManager {
  return new OperatingModeManager(userId);
}
