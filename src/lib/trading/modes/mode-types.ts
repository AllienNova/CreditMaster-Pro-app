/**
 * Operating Mode Types
 *
 * Type definitions for the WATCH -> GUIDED -> AUTONOMOUS operating mode
 * state machine. Defines graduation criteria, mode permissions, circuit
 * breaker events, and trading account state.
 */

// ============================================================================
// OPERATING MODES
// ============================================================================

/** The three operating modes in ascending order of autonomy */
export type OperatingMode = "watch" | "guided" | "autonomous";

/** Direction of a mode transition */
export type TransitionDirection = "upgrade" | "downgrade";

/** Who initiated a mode transition */
export type TransitionInitiator = "user" | "system" | "admin";

// ============================================================================
// GRADUATION CRITERIA
// ============================================================================

/** Criteria required to graduate from one mode to the next */
export interface GraduationCriteria {
  /** Minimum number of trades required */
  minTrades: number;
  /** Minimum number of active days required */
  minDaysActive: number;
  /** Whether profitable performance is required */
  requireProfitable: boolean;
  /** Whether explicit user opt-in is required (GUIDED -> AUTONOMOUS only) */
  requireUserOptIn: boolean;
}

/** Progress toward meeting a single graduation criterion */
export interface GraduationProgress {
  /** Current value for this criterion */
  current: number | boolean;
  /** Required value for this criterion */
  required: number | boolean;
  /** Whether this criterion has been met */
  met: boolean;
}

/** Detailed progress toward mode graduation */
export interface GraduationProgressReport {
  /** Current operating mode */
  currentMode: OperatingMode;
  /** Target mode for graduation */
  nextMode: OperatingMode | null;
  /** Progress on each criterion */
  criteria: Record<string, GraduationProgress>;
  /** Whether all criteria are met */
  allCriteriaMet: boolean;
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// MODE STATUS
// ============================================================================

/** Current status of a user's operating mode */
export interface ModeStatus {
  /** Current operating mode */
  currentMode: OperatingMode;
  /** When the current mode started */
  modeStartDate: string;
  /** Progress toward graduation */
  graduationProgress: GraduationProgressReport;
  /** Whether the next mode is available for graduation */
  nextModeAvailable: boolean;
  /** Whether the account is active */
  isActive: boolean;
}

// ============================================================================
// MODE TRANSITIONS
// ============================================================================

/** Record of a mode transition */
export interface ModeTransition {
  /** Source mode */
  fromMode: OperatingMode;
  /** Target mode */
  toMode: OperatingMode;
  /** Whether this was an upgrade or downgrade */
  direction: TransitionDirection;
  /** Reason for the transition */
  reason: string;
  /** Who initiated the transition */
  initiatedBy: TransitionInitiator;
  /** Snapshot of metrics at the time of transition */
  metricsSnapshot: Record<string, unknown>;
  /** When the transition occurred */
  timestamp: string;
}

// ============================================================================
// TRADING ACCOUNT STATE
// ============================================================================

/** Trading account state matching the trading_accounts DB table */
export interface TradingAccountState {
  id: string;
  userId: string;
  operatingMode: OperatingMode;
  watchStartDate: string;
  watchPaperTradeCount: number;
  watchPaperDaysActive: number;
  watchPaperProfitable: boolean;
  watchGraduationDate: string | null;
  guidedStartDate: string | null;
  guidedLiveTradeCount: number;
  guidedLiveDaysActive: number;
  guidedLiveProfitable: boolean;
  guidedGraduationDate: string | null;
  strategyPerformance: Record<string, unknown>;
  maxDailyTrades: number;
  maxPositionValue: number;
  maxDailyLossPct: number;
  autonomousEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/** Types of circuit breaker events */
export type CircuitBreakerType =
  | "daily_loss"
  | "position_concentration"
  | "correlation"
  | "sector_exposure"
  | "drawdown"
  | "api_failure"
  | "model_degradation"
  | "market_hours"
  | "kill_switch";

/** Severity levels for circuit breaker events */
export type CircuitBreakerSeverity = "info" | "warning" | "critical" | "emergency";

/** A circuit breaker event record */
export interface CircuitBreakerEvent {
  /** Type of circuit breaker that was triggered */
  type: CircuitBreakerType;
  /** Severity of the event */
  severity: CircuitBreakerSeverity;
  /** The value that triggered the breaker */
  triggerValue: number | null;
  /** The threshold that was exceeded */
  thresholdValue: number | null;
  /** Action taken in response */
  actionTaken: string;
  /** Additional details as JSON */
  details: Record<string, unknown>;
  /** Associated symbol, if any */
  symbol?: string;
  /** Operating mode at time of event */
  operatingMode?: OperatingMode;
}

/** Stored circuit breaker event with database fields */
export interface StoredCircuitBreakerEvent extends CircuitBreakerEvent {
  id: string;
  userId: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

// ============================================================================
// MODE PERMISSIONS
// ============================================================================

/** What actions are allowed in a given operating mode */
export interface ModePermissions {
  /** Current mode */
  mode: OperatingMode;
  /** Can view trading signals */
  canViewSignals: boolean;
  /** Can execute paper trades */
  canPaperTrade: boolean;
  /** Can place live orders */
  canPlaceLiveOrders: boolean;
  /** Whether live orders require confirmation */
  requiresConfirmation: boolean;
  /** Can auto-execute trades without confirmation */
  canAutoExecute: boolean;
}

// ============================================================================
// RESULT TYPE
// ============================================================================

/** Standard result type for operations */
export interface OperationResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// GRADUATION CRITERIA CONSTANTS
// ============================================================================

/** Criteria for graduating from WATCH to GUIDED mode */
export const WATCH_TO_GUIDED_CRITERIA = {
  minPaperTrades: 30,
  minDaysActive: 30,
  requireProfitable: true,
} as const;

/** Criteria for graduating from GUIDED to AUTONOMOUS mode */
export const GUIDED_TO_AUTONOMOUS_CRITERIA = {
  minLiveTrades: 30,
  minDaysActive: 30,
  requireProfitable: true,
  requireUserOptIn: true,
} as const;

// ============================================================================
// MODE ORDER (for comparison)
// ============================================================================

/** Ordered list of modes from least to most autonomous */
export const MODE_ORDER: readonly OperatingMode[] = [
  "watch",
  "guided",
  "autonomous",
] as const;

/**
 * Get the next mode in the progression, or null if at maximum.
 */
export function getNextMode(current: OperatingMode): OperatingMode | null {
  const idx = MODE_ORDER.indexOf(current);
  if (idx < 0 || idx >= MODE_ORDER.length - 1) return null;
  return MODE_ORDER[idx + 1];
}

/**
 * Get the previous mode in the progression, or null if at minimum.
 */
export function getPreviousMode(current: OperatingMode): OperatingMode | null {
  const idx = MODE_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return MODE_ORDER[idx - 1];
}
