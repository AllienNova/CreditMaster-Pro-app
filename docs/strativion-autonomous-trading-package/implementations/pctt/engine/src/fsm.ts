/**
 * @module fsm
 * Finite State Machine for the PCTT break-retest-rejection sequence.
 *
 * State transitions:
 * IDLE -> WAIT_RETEST (on confirmed break, lines frozen)
 * WAIT_RETEST -> REJECTION (on retest with passing rejection score)
 * WAIT_RETEST -> FAILURE (price reclaims action line)
 * WAIT_RETEST -> TIMEOUT (M bars elapse without retest)
 * REJECTION -> POST_TRADE (entry signaled)
 * FAILURE/TIMEOUT -> IDLE (reset)
 * POST_TRADE -> IDLE (trade completed)
 *
 * One-Break-One-Trade rule: FSM enters POST_TRADE after any resolution,
 * preventing re-entry on the same break event.
 */

import {
  FSMState,
  BreakDirection,
  DEFAULT_FSM_CONFIG,
} from './types.js';
import type {
  CandleData,
  BoundaryEstimate,
  FrozenLines,
  RejectionScore,
  FSMEvent,
  FSMConfig,
} from './types.js';
import { calculateRejectionScore } from './scoring.js';

/**
 * PCTT Finite State Machine.
 *
 * Processes one bar at a time, detecting breaks, retests, and rejections
 * to produce trade entry signals. All state transitions are monotonic
 * (no backward state changes within a single break sequence).
 */
export class PCTTStateMachine {
  /** Current FSM state. */
  state: FSMState;
  /** Frozen action and safety lines after a confirmed break. */
  frozenLines: FrozenLines | null;
  /** Bar index where the break was confirmed. */
  breakBar: number | null;
  /** Configuration parameters. */
  private config: FSMConfig;

  /**
   * Create a new PCTT state machine in IDLE state.
   *
   * @param config - FSM configuration. Uses defaults from pctt-parameters.yaml if not specified.
   */
  constructor(config: FSMConfig = DEFAULT_FSM_CONFIG) {
    this.state = FSMState.IDLE;
    this.frozenLines = null;
    this.breakBar = null;
    this.config = config;
  }

  /**
   * Process a single bar through the FSM.
   *
   * This is the main entry point called once per bar. It evaluates the current
   * state and checks for applicable transitions.
   *
   * @param candle - Current bar's OHLCV data.
   * @param boundaries - Current boundary estimate (used in IDLE for break detection).
   * @param atr - Current ATR value for this bar.
   * @returns FSMEvent if a state transition occurred, or null if no transition.
   */
  processBar(
    candle: CandleData,
    boundaries: BoundaryEstimate,
    atr: number,
  ): FSMEvent | null {
    switch (this.state) {
      case FSMState.IDLE:
        return this.processIdle(candle, boundaries, atr);

      case FSMState.WAIT_RETEST:
        return this.processWaitRetest(candle, atr);

      case FSMState.REJECTION:
        // Rejection state signals entry; transition to POST_TRADE
        this.state = FSMState.POST_TRADE;
        return {
          type: FSMState.POST_TRADE,
          bar: candle.bar,
          direction: this.frozenLines?.direction,
        };

      case FSMState.FAILURE:
      case FSMState.TIMEOUT:
        // Reset to IDLE after failure or timeout
        this.reset();
        return { type: FSMState.IDLE, bar: candle.bar };

      case FSMState.POST_TRADE:
        // Stay in POST_TRADE until explicitly reset (trade management handles this)
        return null;

      default:
        return null;
    }
  }

  /**
   * Process IDLE state: check for boundary breaks.
   *
   * Uses two-stage break detection:
   * Stage 1 (Penetration): wick exceeds boundary by beta_p * ATR
   * Stage 2 (Confirmation): close exceeds boundary by beta_c * ATR
   */
  private processIdle(
    candle: CandleData,
    boundaries: BoundaryEstimate,
    atr: number,
  ): FSMEvent | null {
    const breakDir = this.detectBreak(candle, boundaries, atr);
    if (breakDir === null) return null;

    // Confirmed break: freeze lines and transition to WAIT_RETEST
    this.frozenLines = this.freezeLines(boundaries, breakDir, candle.bar);
    this.breakBar = candle.bar;
    this.state = FSMState.WAIT_RETEST;

    return {
      type: FSMState.WAIT_RETEST,
      bar: candle.bar,
      direction: breakDir,
      frozenLines: this.frozenLines,
    };
  }

  /**
   * Process WAIT_RETEST state: check for retest, failure, or timeout.
   */
  private processWaitRetest(
    candle: CandleData,
    atr: number,
  ): FSMEvent | null {
    if (!this.frozenLines || this.breakBar === null) {
      this.reset();
      return { type: FSMState.IDLE, bar: candle.bar };
    }

    const barsSinceBreak = candle.bar - this.breakBar;

    // Check timeout first
    if (barsSinceBreak > this.config.retest_window_bars) {
      this.state = FSMState.TIMEOUT;
      return { type: FSMState.TIMEOUT, bar: candle.bar };
    }

    // Check failure: price reclaims action line
    if (this.detectFailure(candle, atr)) {
      this.state = FSMState.FAILURE;
      return {
        type: FSMState.FAILURE,
        bar: candle.bar,
        direction: this.frozenLines.direction,
      };
    }

    // Check retest
    if (this.detectRetest(candle, atr)) {
      // Score rejection quality
      const rejectionScore = this.scoreRejection(candle, atr);

      if (rejectionScore.passed) {
        this.state = FSMState.REJECTION;
        return {
          type: FSMState.REJECTION,
          bar: candle.bar,
          direction: this.frozenLines.direction,
          frozenLines: this.frozenLines,
          rejectionScore,
        };
      }
      // Retest detected but rejection failed; stay in WAIT_RETEST
    }

    return null;
  }

  /**
   * Detect a confirmed boundary break using two-stage detection.
   *
   * Downward break through support:
   *   Penetration: L_t < L_hat(t) - beta_p * ATR
   *   Confirmation: C_t < L_hat(t) - beta_c * ATR
   *
   * Upward break through resistance:
   *   Penetration: H_t > U_hat(t) + beta_p * ATR
   *   Confirmation: C_t > U_hat(t) + beta_c * ATR
   *
   * Past-only boundaries: the boundary at time t is estimated from data
   * available at t-1, projected forward.
   *
   * @param candle - Current bar's OHLCV data.
   * @param boundaries - Boundary estimate from the previous bar (past-only).
   * @param atr - Current ATR value.
   * @returns Break direction, or null if no break detected.
   */
  detectBreak(
    candle: CandleData,
    boundaries: BoundaryEstimate,
    atr: number,
  ): BreakDirection | null {
    const betaP = this.config.penetration_buffer_atr * atr;
    const betaC = this.config.confirmation_buffer_atr * atr;

    // Project boundaries to current bar
    // Boundaries have slope and intercept; we evaluate at candle.bar
    // The intercept is the value at the anchor point; for simplicity,
    // we assume boundaries are already evaluated at the current bar context.
    const supportLevel = boundaries.lower.intercept;
    const resistanceLevel = boundaries.upper.intercept;

    // Downward break through support
    const penetrateDown = candle.low < supportLevel - betaP;
    const confirmDown = candle.close < supportLevel - betaC;
    if (penetrateDown && confirmDown) {
      return BreakDirection.DOWN;
    }

    // Upward break through resistance
    const penetrateUp = candle.high > resistanceLevel + betaP;
    const confirmUp = candle.close > resistanceLevel + betaC;
    if (penetrateUp && confirmUp) {
      return BreakDirection.UP;
    }

    return null;
  }

  /**
   * Detect whether price is retesting the frozen action line.
   *
   * Retest_t = (t - t_0 <= M) AND |P_t - Action(t)| <= gamma * ATR_t
   *
   * For downward breaks, we check if price has come back up to the action line.
   * For upward breaks, we check if price has come back down to the action line.
   *
   * @param candle - Current bar's OHLCV data.
   * @param atr - Current ATR value.
   * @returns True if a valid retest is detected.
   */
  detectRetest(candle: CandleData, atr: number): boolean {
    if (!this.frozenLines || this.breakBar === null) return false;

    const barsSinceBreak = candle.bar - this.breakBar;
    if (barsSinceBreak > this.config.retest_window_bars) return false;

    const gamma = this.config.retest_buffer_atr * atr;
    const actionPrice = this.getActionLinePrice(candle.bar);

    if (this.frozenLines.direction === BreakDirection.DOWN) {
      // After downward break, retest means price comes back UP to the action line
      // Check if the high of the candle reaches near the action line
      const distance = Math.abs(candle.high - actionPrice);
      return distance <= gamma;
    } else {
      // After upward break, retest means price comes back DOWN to the action line
      const distance = Math.abs(candle.low - actionPrice);
      return distance <= gamma;
    }
  }

  /**
   * Score the rejection quality of the current candle at the action line.
   *
   * Delegates to the scoring module's calculateRejectionScore function.
   *
   * @param candle - Current bar's OHLCV data.
   * @param atr - Current ATR value (unused directly, but available for extensions).
   * @returns Complete RejectionScore with 4 feature evaluations.
   */
  scoreRejection(candle: CandleData, atr: number): RejectionScore {
    if (!this.frozenLines) {
      return {
        clv: false,
        wick_body: false,
        candle_direction: false,
        close_vs_action: false,
        total: 0,
        passed: false,
      };
    }

    const actionPrice = this.getActionLinePrice(candle.bar);

    return calculateRejectionScore(
      candle,
      actionPrice,
      this.frozenLines.direction,
      this.config.clv_threshold,
      this.config.wick_body_ratio_min,
    );
  }

  /**
   * Detect failure: price reclaims the action line after a break.
   *
   * Fail_t (after bearish break) = C_t > Action(t) + delta * ATR_t
   * Fail_t (after bullish break) = C_t < Action(t) - delta * ATR_t
   *
   * @param candle - Current bar's OHLCV data.
   * @param atr - Current ATR value.
   * @returns True if the break has failed.
   */
  private detectFailure(candle: CandleData, atr: number): boolean {
    if (!this.frozenLines) return false;

    const delta = this.config.failure_buffer_atr * atr;
    const actionPrice = this.getActionLinePrice(candle.bar);

    if (this.frozenLines.direction === BreakDirection.DOWN) {
      // After downward break, failure = close goes back above action line
      return candle.close > actionPrice + delta;
    } else {
      // After upward break, failure = close goes back below action line
      return candle.close < actionPrice - delta;
    }
  }

  /**
   * Freeze the action and safety lines at the break bar.
   *
   * Action Line = the broken boundary (support for down break, resistance for up break).
   * Safety Line = the opposite boundary.
   *
   * Once frozen, both lines are extrapolated forward from their frozen slope
   * and intercept. They never recalculate.
   *
   * @param boundaries - Current boundary estimate at the break bar.
   * @param breakDir - Direction of the confirmed break.
   * @param bar - Bar index of the break.
   * @returns Frozen line pair.
   */
  freezeLines(
    boundaries: BoundaryEstimate,
    breakDir: BreakDirection,
    bar: number,
  ): FrozenLines {
    if (breakDir === BreakDirection.DOWN) {
      // Downward break: action = lower (support), safety = upper (resistance)
      return {
        action: {
          intercept: boundaries.lower.intercept,
          slope: boundaries.lower.slope,
          break_bar: bar,
        },
        safety: {
          intercept: boundaries.upper.intercept,
          slope: boundaries.upper.slope,
          break_bar: bar,
        },
        direction: breakDir,
      };
    } else {
      // Upward break: action = upper (resistance), safety = lower (support)
      return {
        action: {
          intercept: boundaries.upper.intercept,
          slope: boundaries.upper.slope,
          break_bar: bar,
        },
        safety: {
          intercept: boundaries.lower.intercept,
          slope: boundaries.lower.slope,
          break_bar: bar,
        },
        direction: breakDir,
      };
    }
  }

  /**
   * Get the frozen action line price at a given bar.
   *
   * Action(t) = A_0 + m_A * (t - t_0)
   *
   * @param bar - Bar index to evaluate at.
   * @returns Action line price at the given bar.
   */
  private getActionLinePrice(bar: number): number {
    if (!this.frozenLines) return 0;
    const a = this.frozenLines.action;
    return a.intercept + a.slope * (bar - a.break_bar);
  }

  /**
   * Get the frozen safety line price at a given bar.
   *
   * Safety(t) = S_0 + m_S * (t - t_0)
   *
   * @param bar - Bar index to evaluate at.
   * @returns Safety line price at the given bar.
   */
  getSafetyLinePrice(bar: number): number {
    if (!this.frozenLines) return 0;
    const s = this.frozenLines.safety;
    return s.intercept + s.slope * (bar - s.break_bar);
  }

  /**
   * Reset the FSM to IDLE state, clearing all frozen state.
   */
  reset(): void {
    this.state = FSMState.IDLE;
    this.frozenLines = null;
    this.breakBar = null;
  }
}
