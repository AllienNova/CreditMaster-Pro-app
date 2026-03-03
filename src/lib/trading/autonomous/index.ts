/**
 * Autonomous Trading Service — Barrel Exports
 *
 * Re-exports all public APIs from the autonomous trading module.
 */

// Scheduler (main entry point)
export {
  AutonomousScheduler,
  createAutonomousScheduler,
} from "./autonomous-scheduler";

// Executor
export {
  executeAutonomousTrade,
  checkPortfolioHealth,
  checkGraduation,
} from "./autonomous-executor";

// Signal Scanner
export {
  loadWatchlist,
  fetchCandles,
  scanSymbol,
  runScanCycle,
} from "./signal-scanner";

// Job Queue
export { JobQueue, type JobStatus, type QueuedJob, type JobHandler } from "./job-queue";

// Market Hours
export {
  getEasternTime,
  isMarketOpen,
  isNearMarketClose,
  type MarketStatus,
} from "./market-hours";

// Types
export type {
  AutonomousConfig,
  JobType,
  JobPayload,
  ScanJobData,
  ExecutionJobData,
  HealthCheckJobData,
  ReconciliationJobData,
  ScanResult,
  ScanCycleResult,
  AutonomousTradeResult,
  PortfolioHealthResult,
  HealthAlert,
  ServiceStatus,
  ServiceState,
  MarketHoursConfig,
} from "./autonomous-types";

export {
  DEFAULT_AUTONOMOUS_CONFIG,
  DEFAULT_MARKET_HOURS,
} from "./autonomous-types";
