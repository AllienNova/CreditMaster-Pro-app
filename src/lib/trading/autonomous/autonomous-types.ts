/**
 * Autonomous Trading Service — Type Definitions
 *
 * Types for the scheduled autonomous trading pipeline that runs PCTT
 * analysis and execution on a cron schedule during market hours.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AutonomousConfig {
  /** Cron expression for signal scanning (default: every 5 min during market hours) */
  scanCron: string;
  /** Cron expression for portfolio health checks (default: hourly during market hours) */
  healthCheckCron: string;
  /** Cron expression for end-of-day reconciliation (default: 16:05 ET Mon-Fri) */
  reconciliationCron: string;
  /** Cron expression for graduation checks (default: 16:30 ET Mon-Fri) */
  graduationCheckCron: string;

  /** Max symbols to scan per cycle */
  maxSymbolsPerScan: number;
  /** Minimum Q-score to consider a signal actionable */
  minQScore: number;
  /** Max concurrent trade executions */
  maxConcurrentExecutions: number;
  /** Job timeout in milliseconds */
  jobTimeoutMs: number;
  /** Max retries for failed jobs */
  maxJobRetries: number;

  /** Redis connection URL for BullMQ (optional — falls back to in-memory queue) */
  redisUrl?: string;
}

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousConfig = {
  // Market hours: Mon-Fri 9:30-16:00 ET
  scanCron: "*/5 9-15 * * 1-5", // Every 5 min, hours 9-15 (covers 9:30-15:55)
  healthCheckCron: "0 10-16 * * 1-5", // Hourly 10:00-16:00
  reconciliationCron: "5 16 * * 1-5", // 16:05 Mon-Fri
  graduationCheckCron: "30 16 * * 1-5", // 16:30 Mon-Fri

  maxSymbolsPerScan: 20,
  minQScore: 0.65,
  maxConcurrentExecutions: 3,
  jobTimeoutMs: 30_000,
  maxJobRetries: 2,

  redisUrl: undefined,
};

// ============================================================================
// JOB TYPES
// ============================================================================

export type JobType =
  | "signal_scan"
  | "trade_execution"
  | "portfolio_health"
  | "reconciliation"
  | "graduation_check"
  | "loss_velocity_check";

export interface JobPayload {
  type: JobType;
  userId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ScanJobData {
  symbols: string[];
  userId: string;
  configOverrides?: Partial<AutonomousConfig>;
}

export interface ExecutionJobData {
  userId: string;
  symbol: string;
  signalId: string;
  qScore: number;
  side: "buy" | "sell";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export interface HealthCheckJobData {
  userId: string;
  checkType: "loss_velocity" | "position_health" | "full";
}

export interface ReconciliationJobData {
  userId: string;
  date: string; // ISO date
}

// ============================================================================
// SCAN RESULT
// ============================================================================

export interface ScanResult {
  symbol: string;
  hasSignal: boolean;
  qScore: number;
  side?: "buy" | "sell";
  confidence?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  regime?: string;
  reason?: string;
  scannedAt: number;
}

export interface ScanCycleResult {
  cycleId: string;
  userId: string;
  startedAt: number;
  completedAt: number;
  symbolsScanned: number;
  signalsFound: number;
  tradesQueued: number;
  errors: Array<{ symbol: string; error: string }>;
  results: ScanResult[];
}

// ============================================================================
// EXECUTION RESULT
// ============================================================================

export interface AutonomousTradeResult {
  success: boolean;
  tradeId?: string;
  orderId?: string;
  symbol: string;
  side: "buy" | "sell";
  quantity?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  error?: string;
  executedAt: number;
  latencyMs: number;
}

// ============================================================================
// HEALTH CHECK RESULT
// ============================================================================

export interface PortfolioHealthResult {
  userId: string;
  checkedAt: number;
  healthy: boolean;
  dailyPL: number;
  dailyPLPercent: number;
  lossVelocity: number; // losses per hour
  openPositions: number;
  totalExposure: number;
  killSwitchTriggered: boolean;
  alerts: HealthAlert[];
}

export interface HealthAlert {
  severity: "info" | "warning" | "critical";
  type:
    | "loss_velocity"
    | "drawdown"
    | "concentration"
    | "consecutive_losses"
    | "exposure_limit";
  message: string;
  value: number;
  threshold: number;
}

// ============================================================================
// SERVICE STATE
// ============================================================================

export type ServiceStatus = "starting" | "running" | "paused" | "stopping" | "stopped" | "error";

export interface ServiceState {
  status: ServiceStatus;
  startedAt: number | null;
  lastScanAt: number | null;
  lastHealthCheckAt: number | null;
  totalScans: number;
  totalTradesExecuted: number;
  totalErrors: number;
  activeJobs: number;
  uptimeMs: number;
  version: string;
}

// ============================================================================
// MARKET HOURS
// ============================================================================

export interface MarketHoursConfig {
  /** Market open hour in ET (default: 9) */
  openHour: number;
  /** Market open minute in ET (default: 30) */
  openMinute: number;
  /** Market close hour in ET (default: 16) */
  closeHour: number;
  /** Market close minute in ET (default: 0) */
  closeMinute: number;
  /** Trading days (0=Sun, 1=Mon, ..., 6=Sat) */
  tradingDays: number[];
}

export const DEFAULT_MARKET_HOURS: MarketHoursConfig = {
  openHour: 9,
  openMinute: 30,
  closeHour: 16,
  closeMinute: 0,
  tradingDays: [1, 2, 3, 4, 5], // Mon-Fri
};
