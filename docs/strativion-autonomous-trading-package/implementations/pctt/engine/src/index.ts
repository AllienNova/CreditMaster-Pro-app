/**
 * @module @strativion/pctt-engine
 * Pivot-Constrained Trendline Trading Engine.
 *
 * A deterministic, non-repainting framework that converts subjective trendline
 * analysis into a backtestable, automatable trading system.
 *
 * The complete pipeline has 10 stages:
 * 1. Pivot Detection
 * 2. Candidate Line Generation
 * 3. Boundary Estimation
 * 4. Q-Score Scoring
 * 5. Regime Detection
 * 6. Break Detection (FSM)
 * 7. Line Freezing
 * 8. Retest and Rejection
 * 9. Entry with Risk Geometry Filter
 * 10. Hybrid Trailing Stop
 *
 * @author Kimal Honour Djam
 * @version 1.0.0
 */

// --- Types ---
export {
  // Enums
  MarketRegime,
  FSMState,
  SetupGrade,
  TrailingStopPhase,
  BreakDirection,
  // Default configs
  DEFAULT_BOUNDARY_CONFIG,
  DEFAULT_SCORING_CONFIG,
  DEFAULT_REGIME_CONFIG,
  DEFAULT_FSM_CONFIG,
  DEFAULT_TRAILING_STOP_CONFIG,
} from './types.js';

export type {
  // Data interfaces
  PivotPoint,
  CandleData,
  TrendLine,
  BoundaryEstimate,
  FrozenLines,
  RejectionScore,
  TradeEntry,
  TrailingStopState,
  // Config interfaces
  BoundaryConfig,
  ScoringConfig,
  RegimeConfig,
  FSMConfig,
  TrailingStopConfig,
  TrailingStopAction,
  FSMEvent,
} from './types.js';

// --- Pivot Detection ---
export {
  detectPivots,
  classifyPivots,
  calculateATR,
  confirmationBar,
  filterPivotsInWindow,
} from './pivot-detection.js';

// --- Boundary Estimation ---
export {
  estimateBoundaries,
  huberLoss,
  scoreLine,
  calculateQScore,
  gradeSetup,
} from './boundary-estimation.js';

// --- Regime Detection ---
export {
  efficiencyRatio,
  crossingCount,
  detectRegime,
  isTradeableRegime,
} from './regime-detection.js';

// --- FSM ---
export { PCTTStateMachine } from './fsm.js';

// --- Trailing Stop ---
export {
  HybridTrailingStop,
  riskGeometryFilter,
  calculatePositionSize,
} from './trailing-stop.js';

// --- Scoring ---
export {
  calculateRejectionScore,
  closeLocationValue,
  wickBodyRatio,
} from './scoring.js';
