/**
 * @module trailing-stop
 * Hybrid 5-phase trailing stop system and risk geometry filter.
 *
 * All stops are monotonic: longs only raise the stop, shorts only lower it.
 *
 * Phase 1 - Structural: stop at Safety Line + buffer
 * Phase 2 - Breakeven: move stop to entry at +0.8R profit
 * Phase 3 - Partial Profit: close 60% at +1.0R
 * Phase 4 - Pivot Trailing: trail behind confirmed pivots
 * Phase 5 - Time Stop: exit if not at +1R within 20 bars
 */

import {
  TrailingStopPhase,
  BreakDirection,
  DEFAULT_TRAILING_STOP_CONFIG,
} from './types.js';
import type {
  TradeEntry,
  CandleData,
  PivotPoint,
  TrailingStopState,
  TrailingStopAction,
  TrailingStopConfig,
} from './types.js';

/**
 * Hybrid trailing stop manager for a single trade.
 *
 * Progresses through 5 phases monotonically. The stop price can only
 * move in the favorable direction (tighten), never loosen.
 */
export class HybridTrailingStop {
  /** Current trailing stop state. */
  state: TrailingStopState;
  /** Trade entry details. */
  private entry: TradeEntry;
  /** Configuration parameters. */
  private config: TrailingStopConfig;

  /**
   * Create a new trailing stop manager for a trade entry.
   *
   * Initializes in Phase 1 (Structural) with the stop at the Safety Line
   * plus a buffer in the direction away from the trade.
   *
   * @param entry - The trade entry record.
   * @param config - Trailing stop configuration.
   */
  constructor(entry: TradeEntry, config: TrailingStopConfig = DEFAULT_TRAILING_STOP_CONFIG) {
    this.entry = entry;
    this.config = config;

    // Initial risk = |entry - stop|
    const initialRisk = Math.abs(entry.price - entry.stop);

    this.state = {
      phase: TrailingStopPhase.STRUCTURAL,
      stop_price: entry.stop,
      entry_price: entry.price,
      initial_risk: initialRisk,
      bars_in_trade: 0,
      partial_closed: false,
    };
  }

  /**
   * Update the trailing stop for the current bar.
   *
   * Checks all phase transitions in order and returns the appropriate action.
   * The stop price is updated monotonically (only tightens, never loosens).
   *
   * @param candle - Current bar's OHLCV data.
   * @param pivots - All confirmed pivot points (for Phase 4 pivot trailing).
   * @param atr - Current ATR value.
   * @returns Action to take: whether stopped out, take partial, new stop level.
   */
  update(
    candle: CandleData,
    pivots: PivotPoint[],
    atr: number,
  ): TrailingStopAction {
    this.state.bars_in_trade++;

    const isLong = this.entry.direction === BreakDirection.UP;
    const currentPrice = candle.close;

    // Calculate unrealized profit in R-multiples
    const unrealizedPnL = isLong
      ? currentPrice - this.state.entry_price
      : this.state.entry_price - currentPrice;
    const rMultiple = this.state.initial_risk > 0
      ? unrealizedPnL / this.state.initial_risk
      : 0;

    // Check if stopped out at current stop level
    const stoppedOut = this.isStoppedOut(candle, isLong);
    if (stoppedOut) {
      return {
        stopped_out: true,
        take_partial: false,
        new_stop: this.state.stop_price,
        phase: this.state.phase,
      };
    }

    let takePartial = false;
    let newStop = this.state.stop_price;

    // --- Phase 5: Time Stop (checked first as it overrides) ---
    if (this.checkTimeStop() && rMultiple < this.config.partial_trigger_r) {
      // Time stop triggered: exit the trade
      return {
        stopped_out: true,
        take_partial: false,
        new_stop: this.state.stop_price,
        phase: TrailingStopPhase.TIME_STOP,
      };
    }

    // --- Phase transitions (only advance forward, never backward) ---

    // Phase 1 -> Phase 2: Breakeven at +0.8R
    if (
      this.state.phase === TrailingStopPhase.STRUCTURAL &&
      this.checkBreakeven(currentPrice)
    ) {
      this.state.phase = TrailingStopPhase.BREAKEVEN;
      const beBuffer = this.config.breakeven_buffer_atr * atr;
      const beStop = isLong
        ? this.state.entry_price + beBuffer
        : this.state.entry_price - beBuffer;
      newStop = this.enforceMonotonic(beStop, isLong);
    }

    // Phase 2 -> Phase 3: Partial profit at +1.0R
    if (
      this.state.phase === TrailingStopPhase.BREAKEVEN &&
      this.checkPartialProfit(currentPrice)
    ) {
      this.state.phase = TrailingStopPhase.PARTIAL_PROFIT;
      takePartial = true;
      this.state.partial_closed = true;
    }

    // Phase 3 -> Phase 4: Pivot trailing (after partial profit taken)
    if (
      (this.state.phase === TrailingStopPhase.PARTIAL_PROFIT ||
       this.state.phase === TrailingStopPhase.PIVOT_TRAILING) &&
      this.state.partial_closed
    ) {
      this.state.phase = TrailingStopPhase.PIVOT_TRAILING;
      const pivotStop = this.checkPivotTrail(pivots, atr);
      if (pivotStop !== null) {
        newStop = this.enforceMonotonic(pivotStop, isLong);
      }
    }

    this.state.stop_price = newStop;

    return {
      stopped_out: false,
      take_partial: takePartial,
      new_stop: newStop,
      phase: this.state.phase,
    };
  }

  /**
   * Check if the breakeven condition is met.
   *
   * Triggers when unrealized profit >= 0.8 * initial_risk.
   *
   * @param currentPrice - Current close price.
   * @returns True if breakeven should be activated.
   */
  checkBreakeven(currentPrice: number): boolean {
    const isLong = this.entry.direction === BreakDirection.UP;
    const unrealized = isLong
      ? currentPrice - this.state.entry_price
      : this.state.entry_price - currentPrice;
    return unrealized >= this.config.breakeven_trigger_r * this.state.initial_risk;
  }

  /**
   * Check if the partial profit condition is met.
   *
   * Triggers when unrealized profit >= 1.0 * initial_risk.
   *
   * @param currentPrice - Current close price.
   * @returns True if partial profit should be taken.
   */
  checkPartialProfit(currentPrice: number): boolean {
    if (this.state.partial_closed) return false;
    const isLong = this.entry.direction === BreakDirection.UP;
    const unrealized = isLong
      ? currentPrice - this.state.entry_price
      : this.state.entry_price - currentPrice;
    return unrealized >= this.config.partial_trigger_r * this.state.initial_risk;
  }

  /**
   * Calculate a pivot-based trailing stop.
   *
   * For longs: trail behind the last confirmed pivot low minus buffer.
   * For shorts: trail above the last confirmed pivot high plus buffer.
   *
   * Only updates when a new confirmed pivot forms. Monotonic enforcement
   * ensures the stop never loosens.
   *
   * @param pivots - All confirmed pivot points, sorted by bar index.
   * @param atr - Current ATR value.
   * @returns New stop price based on the latest pivot, or null if no applicable pivot.
   */
  checkPivotTrail(pivots: PivotPoint[], atr: number): number | null {
    const isLong = this.entry.direction === BreakDirection.UP;
    const buffer = this.config.pivot_trail_buffer_atr * atr;

    // Find the most recent relevant pivot that formed after entry
    const relevantPivots = pivots.filter(
      (p) => p.bar > this.entry.bar &&
             (isLong ? p.type === 'low' : p.type === 'high'),
    );

    if (relevantPivots.length === 0) return null;

    const lastPivot = relevantPivots[relevantPivots.length - 1];

    if (isLong) {
      // Trail behind pivot low
      return lastPivot.price - buffer;
    } else {
      // Trail above pivot high
      return lastPivot.price + buffer;
    }
  }

  /**
   * Check if the time stop has been triggered.
   *
   * Exit if the trade has not reached +1.0R within T_max bars.
   *
   * @returns True if the time stop should trigger.
   */
  checkTimeStop(): boolean {
    return this.state.bars_in_trade >= this.config.time_stop_bars;
  }

  /**
   * Check if the current candle has hit the stop level.
   *
   * @param candle - Current bar's OHLCV data.
   * @param isLong - Whether the trade is a long.
   * @returns True if the stop was hit.
   */
  private isStoppedOut(candle: CandleData, isLong: boolean): boolean {
    if (isLong) {
      // Long: stopped out if low touches or goes below stop
      return candle.low <= this.state.stop_price;
    } else {
      // Short: stopped out if high touches or goes above stop
      return candle.high >= this.state.stop_price;
    }
  }

  /**
   * Enforce monotonic stop movement.
   *
   * For longs: stop can only increase.
   * For shorts: stop can only decrease.
   *
   * @param candidateStop - Proposed new stop price.
   * @param isLong - Whether the trade is a long.
   * @returns The enforced stop price (never loosens).
   */
  private enforceMonotonic(candidateStop: number, isLong: boolean): number {
    if (isLong) {
      return Math.max(candidateStop, this.state.stop_price);
    } else {
      return Math.min(candidateStop, this.state.stop_price);
    }
  }
}

/**
 * Apply the Risk Geometry Filter to a potential trade entry.
 *
 * dGeom = |P_entry - Safety(t_entry)| / ATR_{t_entry}
 *
 * Trade is allowed ONLY if dGeom <= d_max (default 2.5).
 * This prevents entries where the structural stop is excessively far,
 * creating hidden outsized risk.
 *
 * @param entryPrice - The proposed entry price.
 * @param safetyPrice - The frozen Safety Line price at entry time.
 * @param atr - Current ATR value at entry.
 * @param maxDGeom - Maximum allowed dGeom (default 2.5 ATR).
 * @param minDGeom - Minimum allowed dGeom (default 0.5 ATR). Below this, stop is likely noise.
 * @returns Object with dGeom value and whether it passed the filter.
 */
export function riskGeometryFilter(
  entryPrice: number,
  safetyPrice: number,
  atr: number,
  maxDGeom: number = 2.5,
  minDGeom: number = 0.5,
): { dgeom: number; passed: boolean } {
  if (atr <= 0) {
    return { dgeom: Infinity, passed: false };
  }

  const dgeom = Math.abs(entryPrice - safetyPrice) / atr;
  const passed = dgeom <= maxDGeom && dgeom >= minDGeom;

  return { dgeom, passed };
}

/**
 * Calculate position size using fixed fractional method.
 *
 * Size = (Equity * Risk%) / |P_entry - Stop|
 *
 * Risk% is determined by grade: A-Grade = 1.0%, B-Grade = 0.5%.
 *
 * @param equity - Total account equity.
 * @param riskPct - Risk percentage as a decimal (e.g., 0.01 for 1%).
 * @param entryPrice - The entry price.
 * @param stopPrice - The stop loss price.
 * @returns Position size in units. Returns 0 if risk distance is zero.
 */
export function calculatePositionSize(
  equity: number,
  riskPct: number,
  entryPrice: number,
  stopPrice: number,
): number {
  const riskDistance = Math.abs(entryPrice - stopPrice);
  if (riskDistance === 0) return 0;

  const dollarRisk = equity * riskPct;
  return dollarRisk / riskDistance;
}
