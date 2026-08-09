/**
 * Trailing Stop Phase Transitions
 *
 * 5-phase trailing stop system based on R-multiple profit milestones:
 *
 *   Phase 1: INITIAL       — stop at invalidation point (breakeven not yet reached)
 *   Phase 2: BREAKEVEN     — move stop to entry +/- buffer when profit >= 1R
 *   Phase 3: LOCK_PROFIT   — trail at 50% of max favorable excursion when profit >= 2R
 *   Phase 4: TIGHT_TRAIL   — trail at 75% of MFE when profit >= 3R
 *   Phase 5: EXIT_SIGNAL   — exit on signal reversal or time expiry
 *
 * This module provides pure functions for phase computation. It extends
 * (does not replace) the existing TrailingStopManager and HybridTrailingStop.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PhaseInput {
  /** Trade entry price */
  entryPrice: number;
  /** Current market price */
  currentPrice: number;
  /** Invalidation price (initial stop) */
  invalidationPrice: number;
  /** Highest price since entry (for longs) or lowest (for shorts) */
  highWaterMark: number;
  /** Risk per share = |entry - invalidation| = 1R */
  riskPerShare: number;
  /** Trade direction */
  side: "long" | "short";
  /** Breakeven buffer as fraction of riskPerShare (default: 0.05) */
  breakevenBuffer?: number;
  /** Lock profit MFE fraction (default: 0.50) */
  lockProfitFraction?: number;
  /** Tight trail MFE fraction (default: 0.75) */
  tightTrailFraction?: number;
  /** Whether an exit signal has been triggered */
  exitSignalTriggered?: boolean;
}

export interface PhaseResult {
  /** Current phase number (1-5) */
  phase: number;
  /** Human-readable phase name */
  phaseName: string;
  /** Computed stop price for this phase */
  stopPrice: number;
  /** Current profit in R-multiples */
  profitR: number;
}

// ============================================================================
// PHASE NAMES
// ============================================================================

const PHASE_NAMES: Record<number, string> = {
  1: "INITIAL",
  2: "BREAKEVEN",
  3: "LOCK_PROFIT",
  4: "TIGHT_TRAIL",
  5: "EXIT_SIGNAL",
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Compute the trailing stop phase and stop price based on current position state.
 *
 * Phases advance monotonically (never regress). The stop price ratchets
 * in the favorable direction only.
 */
export function computeTrailingStopPhase(params: PhaseInput): PhaseResult {
  const {
    entryPrice,
    currentPrice,
    invalidationPrice,
    highWaterMark,
    riskPerShare,
    side,
    breakevenBuffer = 0.05,
    lockProfitFraction = 0.50,
    tightTrailFraction = 0.75,
    exitSignalTriggered = false,
  } = params;

  if (riskPerShare <= 0) {
    return {
      phase: 1,
      phaseName: PHASE_NAMES[1],
      stopPrice: invalidationPrice,
      profitR: 0,
    };
  }

  // Compute current profit in R-multiples
  const profitR = side === "long"
    ? (currentPrice - entryPrice) / riskPerShare
    : (entryPrice - currentPrice) / riskPerShare;

  // Compute MFE (max favorable excursion) from high water mark
  const mfe = side === "long"
    ? highWaterMark - entryPrice
    : entryPrice - highWaterMark;

  // Phase 5: Exit signal triggered
  if (exitSignalTriggered) {
    // Use the tightest stop available based on profit level
    const tightStop = computeTightestStop(
      side, entryPrice, mfe, riskPerShare,
      breakevenBuffer, lockProfitFraction, tightTrailFraction, profitR,
    );
    return {
      phase: 5,
      phaseName: PHASE_NAMES[5],
      stopPrice: tightStop,
      profitR,
    };
  }

  // Phase 4: Tight trail at 75% MFE (profit >= 3R)
  if (profitR >= 3) {
    const retainedProfit = mfe * tightTrailFraction;
    const stopPrice = side === "long"
      ? entryPrice + retainedProfit
      : entryPrice - retainedProfit;
    return {
      phase: 4,
      phaseName: PHASE_NAMES[4],
      stopPrice,
      profitR,
    };
  }

  // Phase 3: Lock profit at 50% MFE (profit >= 2R)
  if (profitR >= 2) {
    const retainedProfit = mfe * lockProfitFraction;
    const stopPrice = side === "long"
      ? entryPrice + retainedProfit
      : entryPrice - retainedProfit;
    return {
      phase: 3,
      phaseName: PHASE_NAMES[3],
      stopPrice,
      profitR,
    };
  }

  // Phase 2: Breakeven (profit >= 1R)
  if (profitR >= 1) {
    const buffer = riskPerShare * breakevenBuffer;
    const stopPrice = side === "long"
      ? entryPrice + buffer
      : entryPrice - buffer;
    return {
      phase: 2,
      phaseName: PHASE_NAMES[2],
      stopPrice,
      profitR,
    };
  }

  // Phase 1: Initial — stop at invalidation point
  return {
    phase: 1,
    phaseName: PHASE_NAMES[1],
    stopPrice: invalidationPrice,
    profitR,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compute the tightest available stop for exit signal phase,
 * using the highest phase the profit level qualifies for.
 */
function computeTightestStop(
  side: "long" | "short",
  entryPrice: number,
  mfe: number,
  riskPerShare: number,
  breakevenBuffer: number,
  lockProfitFraction: number,
  tightTrailFraction: number,
  profitR: number,
): number {
  if (profitR >= 3) {
    const retained = mfe * tightTrailFraction;
    return side === "long" ? entryPrice + retained : entryPrice - retained;
  }
  if (profitR >= 2) {
    const retained = mfe * lockProfitFraction;
    return side === "long" ? entryPrice + retained : entryPrice - retained;
  }
  if (profitR >= 1) {
    const buffer = riskPerShare * breakevenBuffer;
    return side === "long" ? entryPrice + buffer : entryPrice - buffer;
  }
  // Below 1R, use current price as exit (immediate market exit on signal)
  return side === "long" ? entryPrice - riskPerShare * 0.5 : entryPrice + riskPerShare * 0.5;
}
