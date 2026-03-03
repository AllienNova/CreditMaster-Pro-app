/**
 * Autonomous Trade Executor
 *
 * Executes trades discovered by the signal scanner, after validating
 * through the operating mode manager and risk gateway. Only runs when
 * the user is in AUTONOMOUS mode with all risk gates passing.
 */

import {
  PCTTTradingService,
  type TradeSetup,
  type ExecutionResult,
} from "@/lib/trading/pctt/pctt-trading-service";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  ScanResult,
  AutonomousTradeResult,
  PortfolioHealthResult,
  HealthAlert,
} from "./autonomous-types";

// ============================================================================
// TRADE EXECUTION
// ============================================================================

/**
 * Execute a trade from a scan result. Validates mode, risk, and executes
 * through the PCTT trading service which handles the 3-gate risk architecture.
 */
export async function executeAutonomousTrade(
  userId: string,
  scanResult: ScanResult,
  service: PCTTTradingService,
): Promise<AutonomousTradeResult> {
  const startTime = Date.now();

  // 1. Verify user is in AUTONOMOUS mode
  const modeManager = createOperatingModeManager(userId);
  const modeStatus = await modeManager.getModeStatus();

  if (!modeStatus.success || !modeStatus.data) {
    return {
      success: false,
      symbol: scanResult.symbol,
      side: scanResult.side ?? "buy",
      error: "Failed to retrieve operating mode status",
      executedAt: Date.now(),
      latencyMs: Date.now() - startTime,
    };
  }

  const currentMode = modeStatus.data.currentMode;
  if (currentMode !== "autonomous") {
    return {
      success: false,
      symbol: scanResult.symbol,
      side: scanResult.side ?? "buy",
      error: `Cannot auto-execute: user is in ${currentMode} mode (requires autonomous)`,
      executedAt: Date.now(),
      latencyMs: Date.now() - startTime,
    };
  }

  // 2. Build trade setup from scan result
  // The PCTT trading service handles risk gateway validation internally
  try {
    const candles = await import("./signal-scanner").then((m) =>
      m.fetchCandles(scanResult.symbol),
    );
    const setup: TradeSetup | null = await service.analyzeForTrade(
      scanResult.symbol,
      candles,
    );

    if (!setup || !setup.isValid) {
      return {
        success: false,
        symbol: scanResult.symbol,
        side: scanResult.side ?? "buy",
        error: `Trade setup invalid: ${setup?.validationErrors.join(", ") ?? "no signal"}`,
        executedAt: Date.now(),
        latencyMs: Date.now() - startTime,
      };
    }

    // 3. Execute through PCTT service (includes 3-gate risk validation)
    const result: ExecutionResult = await service.executeTrade(setup);

    // 4. Log the autonomous execution
    await logAutonomousExecution(userId, scanResult, result);

    return {
      success: result.success,
      tradeId: result.tradeId,
      orderId: result.orderId,
      symbol: result.symbol ?? scanResult.symbol,
      side: (result.side as "buy" | "sell") ?? scanResult.side ?? "buy",
      quantity: result.quantity,
      entryPrice: result.entryPrice,
      stopLoss: result.stopLoss,
      takeProfit: result.takeProfit,
      error: result.error,
      executedAt: Date.now(),
      latencyMs: Date.now() - startTime,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      symbol: scanResult.symbol,
      side: scanResult.side ?? "buy",
      error: `Execution error: ${errorMsg}`,
      executedAt: Date.now(),
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// PORTFOLIO HEALTH CHECK
// ============================================================================

/**
 * Run a portfolio health check. Monitors loss velocity, drawdown,
 * concentration risk, and triggers kill switch if thresholds exceeded.
 */
export async function checkPortfolioHealth(
  userId: string,
  service: PCTTTradingService,
): Promise<PortfolioHealthResult> {
  const alerts: HealthAlert[] = [];
  let killSwitchTriggered = false;

  try {
    const stats = await service.getTradingStats();

    const dailyPLPercent =
      stats.totalExposure > 0 ? stats.dailyPL / stats.totalExposure : 0;

    // Check daily loss limit (3% threshold)
    if (dailyPLPercent < -0.03) {
      alerts.push({
        severity: "critical",
        type: "drawdown",
        message: `Daily loss ${(dailyPLPercent * 100).toFixed(1)}% exceeds -3% threshold`,
        value: dailyPLPercent,
        threshold: -0.03,
      });
    }

    // Check exposure limit
    if (stats.openPositionCount > 10) {
      alerts.push({
        severity: "warning",
        type: "exposure_limit",
        message: `${stats.openPositionCount} open positions exceeds recommended limit of 10`,
        value: stats.openPositionCount,
        threshold: 10,
      });
    }

    // Calculate loss velocity (losses per hour in the current session)
    const lossVelocity = await calculateLossVelocity(userId);

    if (lossVelocity > 0.03) {
      alerts.push({
        severity: "critical",
        type: "loss_velocity",
        message: `Loss velocity ${(lossVelocity * 100).toFixed(1)}%/hr exceeds 3%/hr threshold`,
        value: lossVelocity,
        threshold: 0.03,
      });

      // Trigger kill switch for critical loss velocity
      killSwitchTriggered = true;
      await triggerAutonomousKillSwitch(userId, "loss_velocity", lossVelocity);
    }

    // Check if cannot trade due to existing limits
    if (!stats.canTrade) {
      alerts.push({
        severity: "warning",
        type: "exposure_limit",
        message: stats.reason ?? "Trading restricted by risk limits",
        value: 0,
        threshold: 0,
      });
    }

    const healthy = alerts.filter((a) => a.severity === "critical").length === 0;

    return {
      userId,
      checkedAt: Date.now(),
      healthy,
      dailyPL: stats.dailyPL,
      dailyPLPercent,
      lossVelocity,
      openPositions: stats.openPositionCount,
      totalExposure: stats.totalExposure,
      killSwitchTriggered,
      alerts,
    };
  } catch (err) {
    return {
      userId,
      checkedAt: Date.now(),
      healthy: false,
      dailyPL: 0,
      dailyPLPercent: 0,
      lossVelocity: 0,
      openPositions: 0,
      totalExposure: 0,
      killSwitchTriggered: false,
      alerts: [
        {
          severity: "critical",
          type: "exposure_limit",
          message: `Health check error: ${err instanceof Error ? err.message : String(err)}`,
          value: 0,
          threshold: 0,
        },
      ],
    };
  }
}

// ============================================================================
// GRADUATION CHECK
// ============================================================================

/**
 * Check if the user meets graduation criteria for their current mode
 * and trigger a mode transition if they do.
 */
export async function checkGraduation(userId: string): Promise<{
  graduated: boolean;
  fromMode: string;
  toMode?: string;
  reason: string;
}> {
  const modeManager = createOperatingModeManager(userId);
  const progressResult = await modeManager.getGraduationProgress();

  if (!progressResult.success || !progressResult.data) {
    return {
      graduated: false,
      fromMode: "UNKNOWN",
      reason: `Failed to check graduation: ${progressResult.error ?? "unknown error"}`,
    };
  }

  const progress = progressResult.data;

  if (!progress.allCriteriaMet) {
    const unmet = Object.entries(progress.criteria)
      .filter(([, p]) => !p.met)
      .map(([key]) => key)
      .join(", ");
    return {
      graduated: false,
      fromMode: progress.currentMode,
      reason: `Not ready: unmet criteria — ${unmet}`,
    };
  }

  // Attempt graduation
  const graduateResult = await modeManager.graduate();

  if (!graduateResult.success) {
    return {
      graduated: false,
      fromMode: progress.currentMode,
      reason: `Graduation failed: ${graduateResult.error ?? "unknown error"}`,
    };
  }

  return {
    graduated: true,
    fromMode: progress.currentMode,
    toMode: graduateResult.data?.toMode,
    reason: `Graduated from ${progress.currentMode} to ${graduateResult.data?.toMode}`,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function calculateLossVelocity(userId: string): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("trade_history")
      .select("realized_pnl")
      .eq("user_id", userId)
      .gte("closed_at", oneHourAgo)
      .lt("realized_pnl", 0);

    if (!data || data.length === 0) return 0;

    const totalLoss = data.reduce(
      (sum: number, row: { realized_pnl: number }) => sum + Math.abs(row.realized_pnl),
      0,
    );

    // Get account size for percentage calculation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: account } = await (supabaseAdmin as any)
      .from("trading_accounts")
      .select("account_size")
      .eq("user_id", userId)
      .single();

    const accountSize = account?.account_size ?? 100_000;
    return totalLoss / accountSize;
  } catch {
    return 0;
  }
}

async function triggerAutonomousKillSwitch(
  userId: string,
  reason: string,
  value: number,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("circuit_breaker_events").insert({
      user_id: userId,
      breaker_type: "autonomous_kill_switch",
      severity: "critical",
      trigger_value: value,
      threshold_value: 0.03,
      action_taken: "halt_autonomous_trading",
      details: { reason, source: "autonomous-executor" },
      resolved: false,
      operating_mode: "autonomous",
    });

    // Update trading account to pause autonomous
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("trading_accounts")
      .update({ autonomous_enabled: false })
      .eq("user_id", userId);
  } catch {
    console.error(`[autonomous] Failed to trigger kill switch for user ${userId}`);
  }
}

async function logAutonomousExecution(
  userId: string,
  scanResult: ScanResult,
  executionResult: ExecutionResult,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("autonomous_execution_logs").insert({
      user_id: userId,
      symbol: scanResult.symbol,
      side: scanResult.side,
      q_score: scanResult.qScore,
      entry_price: executionResult.entryPrice,
      stop_loss: executionResult.stopLoss,
      take_profit: executionResult.takeProfit,
      order_id: executionResult.orderId,
      success: executionResult.success,
      error: executionResult.error,
      operating_mode: executionResult.operatingMode,
    });
  } catch {
    // Non-blocking
    console.error(`[autonomous] Failed to log execution for ${scanResult.symbol}`);
  }
}
