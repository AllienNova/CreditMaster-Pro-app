/**
 * Autonomous Trading Scheduler
 *
 * Main orchestrator that wires node-cron schedules to the job queue.
 * Coordinates the full autonomous pipeline: scan → execute → health check → graduation.
 * Manages service lifecycle (start/stop/pause) and exposes service state.
 */

import { JobQueue, type JobHandler } from "./job-queue";
import { runScanCycle } from "./signal-scanner";
import {
  executeAutonomousTrade,
  checkPortfolioHealth,
  checkGraduation,
} from "./autonomous-executor";
import { isMarketOpen, isNearMarketClose } from "./market-hours";
import {
  PCTTTradingService,
  type PCTTTradingConfig,
} from "@/lib/trading/pctt/pctt-trading-service";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";
import type {
  AutonomousConfig,
  ServiceState,
  ServiceStatus,
  JobPayload,
  ScanCycleResult,
  AutonomousTradeResult,
  PortfolioHealthResult,
} from "./autonomous-types";
import { DEFAULT_AUTONOMOUS_CONFIG } from "./autonomous-types";

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AutonomousScheduler {
  private config: AutonomousConfig;
  private pcttConfig: Partial<PCTTTradingConfig>;
  private userId: string;
  private jobQueue: JobQueue;
  private status: ServiceStatus = "stopped";
  private startedAt: number | null = null;
  private lastScanAt: number | null = null;
  private lastHealthCheckAt: number | null = null;
  private totalScans: number = 0;
  private totalTradesExecuted: number = 0;
  private totalErrors: number = 0;
  private cronIntervals: ReturnType<typeof setInterval>[] = [];

  constructor(
    userId: string,
    config: Partial<AutonomousConfig> = {},
    pcttConfig: Partial<PCTTTradingConfig> = {},
  ) {
    this.userId = userId;
    this.config = { ...DEFAULT_AUTONOMOUS_CONFIG, ...config };
    this.pcttConfig = pcttConfig;
    this.jobQueue = new JobQueue(this.config);
    this.registerHandlers();
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE
  // --------------------------------------------------------------------------

  /**
   * Start the autonomous trading service.
   * Validates the user is in AUTONOMOUS mode before starting scheduled jobs.
   */
  async start(): Promise<{ success: boolean; error?: string }> {
    if (this.status === "running") {
      return { success: false, error: "Service is already running" };
    }

    this.status = "starting";

    // Verify user is in AUTONOMOUS mode
    const modeManager = createOperatingModeManager(this.userId);
    const modeStatus = await modeManager.getModeStatus();

    if (!modeStatus.success || !modeStatus.data) {
      this.status = "error";
      return { success: false, error: "Failed to verify operating mode" };
    }

    if (modeStatus.data.currentMode !== "autonomous") {
      this.status = "stopped";
      return {
        success: false,
        error: `Cannot start: user is in ${modeStatus.data.currentMode} mode (requires AUTONOMOUS)`,
      };
    }

    this.startedAt = Date.now();
    this.status = "running";

    // Schedule recurring jobs using setInterval (cron-like)
    this.scheduleScanCycle();
    this.scheduleHealthCheck();
    this.scheduleGraduationCheck();

    return { success: true };
  }

  /**
   * Stop the autonomous trading service gracefully.
   * Drains the job queue and clears all scheduled intervals.
   */
  stop(): void {
    this.status = "stopping";

    // Clear all scheduled intervals
    for (const interval of this.cronIntervals) {
      clearInterval(interval);
    }
    this.cronIntervals = [];

    // Drain pending jobs
    this.jobQueue.drain();

    this.status = "stopped";
  }

  /**
   * Pause the service — stops scheduling new jobs but lets active ones finish.
   */
  pause(): void {
    if (this.status !== "running") return;
    this.status = "paused";

    for (const interval of this.cronIntervals) {
      clearInterval(interval);
    }
    this.cronIntervals = [];
  }

  /**
   * Resume a paused service.
   */
  resume(): void {
    if (this.status !== "paused") return;
    this.status = "running";

    this.scheduleScanCycle();
    this.scheduleHealthCheck();
    this.scheduleGraduationCheck();
  }

  // --------------------------------------------------------------------------
  // SCHEDULING
  // --------------------------------------------------------------------------

  /**
   * Schedule signal scan cycles.
   * Runs every 5 minutes during market hours (configurable).
   */
  private scheduleScanCycle(): void {
    // Parse interval from cron (default: 5 min)
    const intervalMs = this.parseCronIntervalMs(this.config.scanCron, 5 * 60_000);

    const interval = setInterval(() => {
      if (this.status !== "running") return;

      const market = isMarketOpen();
      if (!market.isOpen) return;

      // Don't scan if near close (avoid opening positions that can't be managed)
      if (isNearMarketClose(15)) return;

      this.jobQueue.enqueue({
        type: "signal_scan",
        userId: this.userId,
        timestamp: Date.now(),
        data: { minQScore: this.config.minQScore },
      });
    }, intervalMs);

    this.cronIntervals.push(interval);
  }

  /**
   * Schedule portfolio health checks.
   * Runs hourly during market hours (configurable).
   */
  private scheduleHealthCheck(): void {
    const intervalMs = this.parseCronIntervalMs(
      this.config.healthCheckCron,
      60 * 60_000,
    );

    const interval = setInterval(() => {
      if (this.status !== "running") return;

      const market = isMarketOpen();
      if (!market.isOpen) return;

      this.jobQueue.enqueue({
        type: "portfolio_health",
        userId: this.userId,
        timestamp: Date.now(),
        data: { checkType: "full" },
      });
    }, intervalMs);

    this.cronIntervals.push(interval);
  }

  /**
   * Schedule graduation checks.
   * Runs daily after market close (configurable).
   */
  private scheduleGraduationCheck(): void {
    const intervalMs = this.parseCronIntervalMs(
      this.config.graduationCheckCron,
      24 * 60 * 60_000,
    );

    const interval = setInterval(() => {
      if (this.status !== "running") return;

      this.jobQueue.enqueue({
        type: "graduation_check",
        userId: this.userId,
        timestamp: Date.now(),
        data: {},
      });
    }, intervalMs);

    this.cronIntervals.push(interval);
  }

  // --------------------------------------------------------------------------
  // JOB HANDLERS
  // --------------------------------------------------------------------------

  private registerHandlers(): void {
    this.jobQueue.registerHandler("signal_scan", this.handleSignalScan.bind(this));
    this.jobQueue.registerHandler(
      "trade_execution",
      this.handleTradeExecution.bind(this),
    );
    this.jobQueue.registerHandler(
      "portfolio_health",
      this.handlePortfolioHealth.bind(this),
    );
    this.jobQueue.registerHandler(
      "graduation_check",
      this.handleGraduationCheck.bind(this),
    );
  }

  private async handleSignalScan(payload: JobPayload): Promise<ScanCycleResult> {
    const minQScore =
      typeof payload.data.minQScore === "number"
        ? payload.data.minQScore
        : this.config.minQScore;

    const result = await runScanCycle(
      this.userId,
      this.pcttConfig,
      minQScore,
    );

    this.lastScanAt = Date.now();
    this.totalScans++;

    // Queue trade executions for signals found
    for (const signal of result.results) {
      if (signal.hasSignal) {
        this.jobQueue.enqueue({
          type: "trade_execution",
          userId: this.userId,
          timestamp: Date.now(),
          data: {
            symbol: signal.symbol,
            qScore: signal.qScore,
            side: signal.side,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
          },
        });
      }
    }

    if (result.errors.length > 0) {
      this.totalErrors += result.errors.length;
    }

    return result;
  }

  private async handleTradeExecution(
    payload: JobPayload,
  ): Promise<AutonomousTradeResult> {
    const service = new PCTTTradingService(this.userId, this.pcttConfig);
    const scanResult = {
      symbol: payload.data.symbol as string,
      hasSignal: true,
      qScore: payload.data.qScore as number,
      side: payload.data.side as "buy" | "sell" | undefined,
      entryPrice: payload.data.entryPrice as number | undefined,
      stopLoss: payload.data.stopLoss as number | undefined,
      takeProfit: payload.data.takeProfit as number | undefined,
      scannedAt: payload.timestamp,
    };

    const result = await executeAutonomousTrade(
      this.userId,
      scanResult,
      service,
    );

    if (result.success) {
      this.totalTradesExecuted++;
    } else {
      this.totalErrors++;
    }

    return result;
  }

  private async handlePortfolioHealth(
    payload: JobPayload,
  ): Promise<PortfolioHealthResult> {
    const service = new PCTTTradingService(payload.userId, this.pcttConfig);
    const result = await checkPortfolioHealth(payload.userId, service);

    this.lastHealthCheckAt = Date.now();

    // If kill switch triggered, pause the service
    if (result.killSwitchTriggered) {
      this.pause();
    }

    return result;
  }

  private async handleGraduationCheck(
    _payload: JobPayload,
  ): Promise<{ graduated: boolean; fromMode: string; toMode?: string; reason: string }> {
    return checkGraduation(this.userId);
  }

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  /**
   * Get the current service state for monitoring/display.
   */
  getState(): ServiceState {
    const queueStats = this.jobQueue.getStats();
    return {
      status: this.status,
      startedAt: this.startedAt,
      lastScanAt: this.lastScanAt,
      lastHealthCheckAt: this.lastHealthCheckAt,
      totalScans: this.totalScans,
      totalTradesExecuted: this.totalTradesExecuted,
      totalErrors: this.totalErrors,
      activeJobs: queueStats.processing,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
      version: "1.0.0",
    };
  }

  /**
   * Get the underlying job queue (for inspection/testing).
   */
  getJobQueue(): JobQueue {
    return this.jobQueue;
  }

  // --------------------------------------------------------------------------
  // MANUAL TRIGGERS
  // --------------------------------------------------------------------------

  /**
   * Trigger a scan cycle manually (outside of scheduled intervals).
   */
  triggerScan(): string {
    return this.jobQueue.enqueue({
      type: "signal_scan",
      userId: this.userId,
      timestamp: Date.now(),
      data: { minQScore: this.config.minQScore },
    });
  }

  /**
   * Trigger a health check manually.
   */
  triggerHealthCheck(): string {
    return this.jobQueue.enqueue({
      type: "portfolio_health",
      userId: this.userId,
      timestamp: Date.now(),
      data: { checkType: "full" },
    });
  }

  /**
   * Trigger a graduation check manually.
   */
  triggerGraduationCheck(): string {
    return this.jobQueue.enqueue({
      type: "graduation_check",
      userId: this.userId,
      timestamp: Date.now(),
      data: {},
    });
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  // Parse a cron-style interval string to milliseconds.
  // Supports basic intervals like every-N-minutes cron syntax.
  // Falls back to the provided default.
  private parseCronIntervalMs(cron: string, defaultMs: number): number {
    const parts = cron.split(" ");
    if (parts.length === 0) return defaultMs;

    const minutePart = parts[0];
    const match = minutePart.match(/^\*\/(\d+)$/);
    if (match) {
      return parseInt(match[1], 10) * 60_000;
    }

    // Hourly cron "0 10-16 ..." → default to 60 min
    if (minutePart === "0") {
      return 60 * 60_000;
    }

    return defaultMs;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an autonomous scheduler instance.
 */
export function createAutonomousScheduler(
  userId: string,
  config?: Partial<AutonomousConfig>,
  pcttConfig?: Partial<PCTTTradingConfig>,
): AutonomousScheduler {
  return new AutonomousScheduler(userId, config, pcttConfig);
}
