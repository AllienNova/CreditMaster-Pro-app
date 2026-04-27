/**
 * @module types
 * Shared types and interfaces for the PCTT Engine.
 * All enums, data structures, and configuration interfaces used across modules.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Market regime classification based on Efficiency Ratio and crossing count. */
export enum MarketRegime {
  TRENDING = 'TRENDING',
  MEAN_REVERTING = 'MEAN_REVERTING',
  CHOPPY = 'CHOPPY',
  TRANSITION = 'TRANSITION',
}

/** Finite State Machine states for the break-retest sequence. */
export enum FSMState {
  IDLE = 'IDLE',
  WAIT_RETEST = 'WAIT_RETEST',
  REJECTION = 'REJECTION',
  FAILURE = 'FAILURE',
  TIMEOUT = 'TIMEOUT',
  POST_TRADE = 'POST_TRADE',
}

/** Setup quality grade derived from Q-Score and touch count. */
export enum SetupGrade {
  A = 'A',
  B = 'B',
  SKIP = 'SKIP',
}

/** Five-phase hybrid trailing stop progression. Phases are monotonic. */
export enum TrailingStopPhase {
  STRUCTURAL = 'STRUCTURAL',
  BREAKEVEN = 'BREAKEVEN',
  PARTIAL_PROFIT = 'PARTIAL_PROFIT',
  PIVOT_TRAILING = 'PIVOT_TRAILING',
  TIME_STOP = 'TIME_STOP',
}

/** Direction of a boundary break. */
export enum BreakDirection {
  UP = 'up',
  DOWN = 'down',
}

// ---------------------------------------------------------------------------
// Data Interfaces
// ---------------------------------------------------------------------------

/** A confirmed pivot point derived from fractal detection. */
export interface PivotPoint {
  /** Bar index where the pivot occurs. */
  bar: number;
  /** Price level of the pivot. */
  price: number;
  /** Whether this is a swing high or swing low. */
  type: 'high' | 'low';
  /** Classification relative to the previous pivot of the same type. */
  classification?: 'HH' | 'HL' | 'LH' | 'LL';
}

/** OHLCV candle data for a single bar. */
export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bar: number;
}

/** A scored trendline candidate defined by two pivot points. */
export interface TrendLine {
  /** Slope in price-per-bar. */
  slope: number;
  /** Price intercept at anchor bar. */
  intercept: number;
  /** Bar index of the first defining pivot. */
  anchor_bar: number;
  /** Number of pivot touches within tolerance. */
  touches: number;
  /** Span in bars between first and last defining pivot. */
  span: number;
  /** Normalized quality score in [0, 1]. */
  q_score: number;
  /** Setup grade derived from Q-Score and touches. */
  grade: SetupGrade;
}

/** Upper and lower boundary estimates for the current structure. */
export interface BoundaryEstimate {
  upper: { slope: number; intercept: number };
  lower: { slope: number; intercept: number };
  /** Quality score of the best boundary. */
  q_score: number;
  /** Estimation method used (huber, ransac, pairwise). */
  method: string;
}

/** Frozen action and safety lines after a confirmed break. */
export interface FrozenLines {
  action: { intercept: number; slope: number; break_bar: number };
  safety: { intercept: number; slope: number; break_bar: number };
  direction: BreakDirection;
}

/** Multi-feature rejection score at retest. */
export interface RejectionScore {
  /** Close Location Value check passed. */
  clv: boolean;
  /** Wick-to-body ratio check passed. */
  wick_body: boolean;
  /** Candle direction consistent with rejection. */
  candle_direction: boolean;
  /** Close on correct side of action line. */
  close_vs_action: boolean;
  /** Total features satisfied (0-4). */
  total: number;
  /** Whether minimum 3 of 4 features passed. */
  passed: boolean;
}

/** Complete trade entry record. */
export interface TradeEntry {
  /** Entry price (close of rejection bar). */
  price: number;
  /** Initial stop loss price (Safety Line at entry). */
  stop: number;
  /** Trade direction. */
  direction: BreakDirection;
  /** Setup quality grade. */
  grade: SetupGrade;
  /** Risk percentage of equity. */
  risk_pct: number;
  /** Calculated position size in units. */
  position_size: number;
  /** Q-Score of the boundary at entry. */
  q_score: number;
  /** Risk geometry distance in ATR units. */
  dgeom: number;
  /** Bar index of entry. */
  bar: number;
}

/** Current state of the hybrid trailing stop system. */
export interface TrailingStopState {
  /** Current phase of the trailing stop. */
  phase: TrailingStopPhase;
  /** Current stop price level. */
  stop_price: number;
  /** Original entry price. */
  entry_price: number;
  /** Initial risk (|entry - stop|). */
  initial_risk: number;
  /** Number of bars since entry. */
  bars_in_trade: number;
  /** Whether partial profit has been taken. */
  partial_closed: boolean;
}

// ---------------------------------------------------------------------------
// Configuration Interfaces
// ---------------------------------------------------------------------------

/** Configuration for boundary estimation. */
export interface BoundaryConfig {
  /** Touch tolerance as ATR multiplier (default 0.20). */
  touch_tolerance_atr: number;
  /** Violation penalty weight lambda (default 2.0). */
  violation_penalty_weight: number;
  /** Span reward weight omega_s (default 0.5). */
  span_reward_weight: number;
  /** Huber loss delta in ATR units (default 1.5). */
  huber_delta_atr: number;
  /** Maximum slope per bar in ATR units (default 0.02). */
  max_slope_per_bar: number;
  /** Minimum span in bars (default 20). */
  min_span_bars: number;
  /** Minimum touches for valid line (default 2). */
  min_touches: number;
  /** Maximum violations allowed (default 3). */
  max_violations: number;
  /** Maximum violation size in ATR (default 0.50). */
  max_violation_atr: number;
  /** RANSAC max trials (default 100). */
  ransac_max_trials: number;
  /** RANSAC residual threshold in ATR (default 0.30). */
  ransac_residual_threshold_atr: number;
  /** RANSAC minimum samples (default 3). */
  ransac_min_samples: number;
}

/** Configuration for line scoring. */
export interface ScoringConfig {
  /** Touch tolerance as ATR multiplier. */
  touch_tolerance_atr: number;
  /** Violation penalty weight lambda. */
  violation_penalty_weight: number;
  /** Span reward weight omega_s. */
  span_reward_weight: number;
  /** Maximum violation cap in ATR. */
  max_violation_cap: number;
}

/** Configuration for regime detection. */
export interface RegimeConfig {
  /** Efficiency Ratio lookback period (default 20). */
  er_period: number;
  /** ER threshold for trending (default 0.40). */
  er_trending_threshold: number;
  /** ER threshold for mean-reverting (default 0.25). */
  er_mean_reverting_threshold: number;
  /** Crossing count lookback period (default 20). */
  crossing_count_period: number;
  /** Crossing count threshold for choppy (default 8). */
  crossing_count_choppy: number;
}

/** Configuration for the FSM break detection. */
export interface FSMConfig {
  /** Penetration buffer in ATR (default 0.10). */
  penetration_buffer_atr: number;
  /** Confirmation buffer in ATR (default 0.15). */
  confirmation_buffer_atr: number;
  /** Retest window in bars (default 12). */
  retest_window_bars: number;
  /** Retest proximity buffer in ATR (default 0.20). */
  retest_buffer_atr: number;
  /** Minimum rejection features (default 3). */
  min_rejection_features: number;
  /** CLV threshold (default 0.30). */
  clv_threshold: number;
  /** Wick-body ratio minimum (default 1.5). */
  wick_body_ratio_min: number;
  /** Failure buffer in ATR (default 0.15). */
  failure_buffer_atr: number;
}

/** Configuration for trailing stop system. */
export interface TrailingStopConfig {
  /** Phase 1: buffer beyond safety line in ATR (default 0.10). */
  structural_buffer_atr: number;
  /** Phase 2: breakeven trigger in R-multiples (default 0.8). */
  breakeven_trigger_r: number;
  /** Phase 2: breakeven buffer in ATR (default 0.05). */
  breakeven_buffer_atr: number;
  /** Phase 3: partial profit trigger in R-multiples (default 1.0). */
  partial_trigger_r: number;
  /** Phase 3: percentage of position to close (default 0.60). */
  partial_close_pct: number;
  /** Phase 4: trail buffer behind pivot in ATR (default 0.20). */
  pivot_trail_buffer_atr: number;
  /** Phase 5: time stop in bars (default 20). */
  time_stop_bars: number;
}

/** Action returned by trailing stop update. */
export interface TrailingStopAction {
  /** Whether the stop was hit and trade should close. */
  stopped_out: boolean;
  /** Whether partial profit should be taken this bar. */
  take_partial: boolean;
  /** Updated stop price. */
  new_stop: number;
  /** Current phase after update. */
  phase: TrailingStopPhase;
}

/** FSM event emitted on state transition. */
export interface FSMEvent {
  /** New state after transition. */
  type: FSMState;
  /** Bar index of the event. */
  bar: number;
  /** Break direction (if applicable). */
  direction?: BreakDirection;
  /** Frozen lines (emitted on break). */
  frozenLines?: FrozenLines;
  /** Rejection score (emitted on retest evaluation). */
  rejectionScore?: RejectionScore;
}

// ---------------------------------------------------------------------------
// Default Configurations
// ---------------------------------------------------------------------------

/** Default boundary estimation configuration from pctt-parameters.yaml. */
export const DEFAULT_BOUNDARY_CONFIG: BoundaryConfig = {
  touch_tolerance_atr: 0.20,
  violation_penalty_weight: 2.0,
  span_reward_weight: 0.5,
  huber_delta_atr: 1.5,
  max_slope_per_bar: 0.02,
  min_span_bars: 20,
  min_touches: 2,
  max_violations: 3,
  max_violation_atr: 0.50,
  ransac_max_trials: 100,
  ransac_residual_threshold_atr: 0.30,
  ransac_min_samples: 3,
};

/** Default scoring configuration. */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  touch_tolerance_atr: 0.20,
  violation_penalty_weight: 2.0,
  span_reward_weight: 0.5,
  max_violation_cap: 3.0,
};

/** Default regime detection configuration. */
export const DEFAULT_REGIME_CONFIG: RegimeConfig = {
  er_period: 20,
  er_trending_threshold: 0.40,
  er_mean_reverting_threshold: 0.25,
  crossing_count_period: 20,
  crossing_count_choppy: 8,
};

/** Default FSM configuration. */
export const DEFAULT_FSM_CONFIG: FSMConfig = {
  penetration_buffer_atr: 0.10,
  confirmation_buffer_atr: 0.15,
  retest_window_bars: 12,
  retest_buffer_atr: 0.20,
  min_rejection_features: 3,
  clv_threshold: 0.30,
  wick_body_ratio_min: 1.5,
  failure_buffer_atr: 0.15,
};

/** Default trailing stop configuration. */
export const DEFAULT_TRAILING_STOP_CONFIG: TrailingStopConfig = {
  structural_buffer_atr: 0.10,
  breakeven_trigger_r: 0.8,
  breakeven_buffer_atr: 0.05,
  partial_trigger_r: 1.0,
  partial_close_pct: 0.60,
  pivot_trail_buffer_atr: 0.20,
  time_stop_bars: 20,
};
