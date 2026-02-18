/**
 * PCTT Hybrid Trailing Stop Manager
 *
 * Implements the 5-stage trailing stop system from PCTT spec:
 * - Stage A: Structural stop (safety line)
 * - Stage B: Break-even lock at +bR
 * - Stage C: Partial exit at 1R
 * - Stage D: Pivot trail (confirmed pivots + ATR buffer)
 * - Stage E: Time stop (exit if no progress)
 */

import { OHLCV, Pivot } from "./pctt-core";

// ============================================================================
// TYPES
// ============================================================================

export type TrailingStopStage = "A" | "B" | "C" | "D" | "E";

export interface TrailingStopState {
  positionId: string;
  symbol: string;
  side: "long" | "short";

  // Entry info
  entryPrice: number;
  entryTime: Date;
  initialStopPrice: number;
  riskDistance: number; // Entry - initial stop (1R)

  // Current state
  stage: TrailingStopStage;
  currentStopPrice: number;
  highestPrice: number; // For longs
  lowestPrice: number; // For shorts

  // Pivot trail
  trailPivotPrice?: number;
  trailPivotIndex?: number;

  // Partial exits
  partialExitsDone: number;
  remainingQuantity: number;

  // Tracking
  barsHeld: number;
  maxFavorableExcursion: number; // MFE in R
  maxAdverseExcursion: number; // MAE in R

  // Timestamps
  stageBTime?: Date; // When moved to break-even
  stageCTime?: Date; // When partial exit
  stageDTime?: Date; // When pivot trail started

  lastUpdate: Date;
}

export interface TrailingStopConfig {
  // Stage B: Break-even
  breakEvenR: number; // Move to BE at this R (default: 0.8)
  breakEvenBuffer: number; // ATR buffer above entry (default: 0.1)

  // Stage C: Partial exit
  partialExitR: number; // Take partial at this R (default: 1.0)
  partialExitPercent: number; // Percent to exit (default: 0.5)

  // Stage D: Pivot trail
  pivotTrailActivationR: number; // Start pivot trail at this R (default: 1.5)
  pivotTrailBuffer: number; // ATR buffer behind pivot (default: 0.3)
  minPivotAge: number; // Min bars since pivot confirmation (default: 3)

  // Stage E: Time stop
  maxBarsNoProgress: number; // Max bars without new high/low (default: 20)
  progressThresholdR: number; // Min R gain to reset progress counter (default: 0.25)

  // General
  atrPeriod: number;
  useStructuralStop: boolean; // Use safety line as initial stop
}

export interface StopUpdateResult {
  stopPrice: number;
  stage: TrailingStopStage;
  action: "hold" | "partial_exit" | "full_exit" | "move_stop";
  exitQuantity?: number;
  exitReason?: string;
  message: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_TRAILING_STOP_CONFIG: TrailingStopConfig = {
  breakEvenR: 0.8,
  breakEvenBuffer: 0.1,
  partialExitR: 1.0,
  partialExitPercent: 0.5,
  pivotTrailActivationR: 1.5,
  pivotTrailBuffer: 0.3,
  minPivotAge: 3,
  maxBarsNoProgress: 20,
  progressThresholdR: 0.25,
  atrPeriod: 14,
  useStructuralStop: true,
};

// ============================================================================
// TRAILING STOP MANAGER
// ============================================================================

export class TrailingStopManager {
  private config: TrailingStopConfig;
  private positions: Map<string, TrailingStopState> = new Map();

  constructor(config: Partial<TrailingStopConfig> = {}) {
    this.config = { ...DEFAULT_TRAILING_STOP_CONFIG, ...config };
  }

  // ============================================================================
  // POSITION MANAGEMENT
  // ============================================================================

  /**
   * Initialize trailing stop for a new position
   */
  initializePosition(
    positionId: string,
    symbol: string,
    side: "long" | "short",
    entryPrice: number,
    initialStopPrice: number,
    quantity: number,
  ): TrailingStopState {
    const riskDistance = Math.abs(entryPrice - initialStopPrice);

    const state: TrailingStopState = {
      positionId,
      symbol,
      side,
      entryPrice,
      entryTime: new Date(),
      initialStopPrice,
      riskDistance,
      stage: "A",
      currentStopPrice: initialStopPrice,
      highestPrice: entryPrice,
      lowestPrice: entryPrice,
      partialExitsDone: 0,
      remainingQuantity: quantity,
      barsHeld: 0,
      maxFavorableExcursion: 0,
      maxAdverseExcursion: 0,
      lastUpdate: new Date(),
    };

    this.positions.set(positionId, state);
    return state;
  }

  /**
   * Remove position from tracking
   */
  removePosition(positionId: string): void {
    this.positions.delete(positionId);
  }

  /**
   * Get current state for a position
   */
  getPositionState(positionId: string): TrailingStopState | undefined {
    return this.positions.get(positionId);
  }

  // ============================================================================
  // STOP UPDATE LOGIC
  // ============================================================================

  /**
   * Update trailing stop based on new bar data
   */
  updateStop(
    positionId: string,
    currentBar: OHLCV,
    atr: number,
    confirmedPivots?: Pivot[],
  ): StopUpdateResult {
    const state = this.positions.get(positionId);
    if (!state) {
      return {
        stopPrice: 0,
        stage: "A",
        action: "hold",
        message: "Position not found",
      };
    }

    // Update tracking metrics
    state.barsHeld++;
    state.lastUpdate = new Date();

    const currentPrice = currentBar.close;
    const currentR = this.calculateR(state, currentPrice);

    // Update MFE/MAE
    if (state.side === "long") {
      state.highestPrice = Math.max(state.highestPrice, currentBar.high);
      state.maxFavorableExcursion = Math.max(
        state.maxFavorableExcursion,
        (state.highestPrice - state.entryPrice) / state.riskDistance,
      );
      state.maxAdverseExcursion = Math.max(
        state.maxAdverseExcursion,
        (state.entryPrice - currentBar.low) / state.riskDistance,
      );
    } else {
      state.lowestPrice = Math.min(state.lowestPrice, currentBar.low);
      state.maxFavorableExcursion = Math.max(
        state.maxFavorableExcursion,
        (state.entryPrice - state.lowestPrice) / state.riskDistance,
      );
      state.maxAdverseExcursion = Math.max(
        state.maxAdverseExcursion,
        (currentBar.high - state.entryPrice) / state.riskDistance,
      );
    }

    // Check if stopped out
    if (this.isStoppedOut(state, currentBar)) {
      return {
        stopPrice: state.currentStopPrice,
        stage: state.stage,
        action: "full_exit",
        exitQuantity: state.remainingQuantity,
        exitReason: "stop_hit",
        message: `Stop hit at ${state.currentStopPrice.toFixed(2)}`,
      };
    }

    // Stage transitions
    let result: StopUpdateResult;

    switch (state.stage) {
      case "A":
        result = this.processStageA(state, currentR, atr);
        break;
      case "B":
        result = this.processStageB(state, currentR, atr);
        break;
      case "C":
        result = this.processStageCAndD(state, currentR, atr, confirmedPivots);
        break;
      case "D":
        result = this.processStageCAndD(state, currentR, atr, confirmedPivots);
        break;
      case "E":
        result = this.processStageE(state, currentR);
        break;
      default:
        result = {
          stopPrice: state.currentStopPrice,
          stage: state.stage,
          action: "hold",
          message: "Unknown stage",
        };
    }

    return result;
  }

  // ============================================================================
  // STAGE PROCESSING
  // ============================================================================

  /**
   * Stage A: Structural stop (initial stop at safety line)
   * Transition to B when price reaches breakEvenR
   */
  private processStageA(
    state: TrailingStopState,
    currentR: number,
    atr: number,
  ): StopUpdateResult {
    // Check for transition to Stage B (break-even)
    if (currentR >= this.config.breakEvenR) {
      // Move stop to break-even
      const beBuffer = this.config.breakEvenBuffer * atr;
      const newStop =
        state.side === "long"
          ? state.entryPrice + beBuffer
          : state.entryPrice - beBuffer;

      state.currentStopPrice = newStop;
      state.stage = "B";
      state.stageBTime = new Date();

      return {
        stopPrice: newStop,
        stage: "B",
        action: "move_stop",
        message: `Moved to break-even at ${newStop.toFixed(2)} (${currentR.toFixed(2)}R)`,
      };
    }

    return {
      stopPrice: state.currentStopPrice,
      stage: "A",
      action: "hold",
      message: `Stage A: Waiting for ${this.config.breakEvenR}R (current: ${currentR.toFixed(2)}R)`,
    };
  }

  /**
   * Stage B: Break-even locked
   * Transition to C when price reaches partialExitR
   */
  private processStageB(
    state: TrailingStopState,
    currentR: number,
    atr: number,
  ): StopUpdateResult {
    // Check for transition to Stage C (partial exit)
    if (currentR >= this.config.partialExitR && state.partialExitsDone === 0) {
      const exitQty = Math.floor(
        state.remainingQuantity * this.config.partialExitPercent,
      );

      if (exitQty > 0) {
        state.partialExitsDone++;
        state.remainingQuantity -= exitQty;
        state.stage = "C";
        state.stageCTime = new Date();

        return {
          stopPrice: state.currentStopPrice,
          stage: "C",
          action: "partial_exit",
          exitQuantity: exitQty,
          exitReason: "target_1r",
          message: `Partial exit ${exitQty} shares at ${this.config.partialExitR}R`,
        };
      }
    }

    return {
      stopPrice: state.currentStopPrice,
      stage: "B",
      action: "hold",
      message: `Stage B: Break-even locked, waiting for ${this.config.partialExitR}R`,
    };
  }

  /**
   * Stage C/D: After partial exit, start pivot trailing
   */
  private processStageCAndD(
    state: TrailingStopState,
    currentR: number,
    atr: number,
    confirmedPivots?: Pivot[],
  ): StopUpdateResult {
    // Check for pivot trail activation
    if (currentR >= this.config.pivotTrailActivationR && state.stage === "C") {
      state.stage = "D";
      state.stageDTime = new Date();
    }

    // If in Stage D, update stop based on pivots
    if (state.stage === "D" && confirmedPivots && confirmedPivots.length > 0) {
      const newPivotStop = this.calculatePivotTrailStop(
        state,
        confirmedPivots,
        atr,
      );

      if (newPivotStop !== null) {
        // Only move stop if it improves (never widen)
        const improves =
          state.side === "long"
            ? newPivotStop > state.currentStopPrice
            : newPivotStop < state.currentStopPrice;

        if (improves) {
          state.currentStopPrice = newPivotStop;
          state.trailPivotPrice = newPivotStop;

          return {
            stopPrice: newPivotStop,
            stage: "D",
            action: "move_stop",
            message: `Pivot trail moved stop to ${newPivotStop.toFixed(2)}`,
          };
        }
      }
    }

    // Check for time stop transition
    if (state.barsHeld >= this.config.maxBarsNoProgress) {
      const recentProgress = this.calculateRecentProgress(state, currentR);
      if (recentProgress < this.config.progressThresholdR) {
        state.stage = "E";
        return {
          stopPrice: state.currentStopPrice,
          stage: "E",
          action: "hold",
          message: "No progress detected, time stop activated",
        };
      }
    }

    return {
      stopPrice: state.currentStopPrice,
      stage: state.stage,
      action: "hold",
      message: `Stage ${state.stage}: Trailing at ${state.currentStopPrice.toFixed(2)}`,
    };
  }

  /**
   * Stage E: Time stop (exit if no progress)
   */
  private processStageE(
    state: TrailingStopState,
    currentR: number,
  ): StopUpdateResult {
    // In time stop mode, exit on next bar that shows no improvement
    return {
      stopPrice: state.currentStopPrice,
      stage: "E",
      action: "full_exit",
      exitQuantity: state.remainingQuantity,
      exitReason: "time_stop",
      message: `Time stop: No progress in ${state.barsHeld} bars`,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate current R-multiple
   */
  private calculateR(state: TrailingStopState, currentPrice: number): number {
    if (state.riskDistance === 0) return 0;

    const pl =
      state.side === "long"
        ? currentPrice - state.entryPrice
        : state.entryPrice - currentPrice;

    return pl / state.riskDistance;
  }

  /**
   * Check if position is stopped out
   */
  private isStoppedOut(state: TrailingStopState, bar: OHLCV): boolean {
    if (state.side === "long") {
      return bar.low <= state.currentStopPrice;
    } else {
      return bar.high >= state.currentStopPrice;
    }
  }

  /**
   * Calculate pivot-based trail stop
   */
  private calculatePivotTrailStop(
    state: TrailingStopState,
    pivots: Pivot[],
    atr: number,
  ): number | null {
    // For longs, trail behind higher lows
    // For shorts, trail above lower highs
    const relevantPivots = pivots.filter((p) => {
      if (state.side === "long") {
        return p.type === "low" && p.price < state.highestPrice;
      } else {
        return p.type === "high" && p.price > state.lowestPrice;
      }
    });

    if (relevantPivots.length === 0) return null;

    // Get most recent relevant pivot
    const latestPivot = relevantPivots[relevantPivots.length - 1];

    // Apply ATR buffer
    const buffer = this.config.pivotTrailBuffer * atr;

    if (state.side === "long") {
      return latestPivot.price - buffer;
    } else {
      return latestPivot.price + buffer;
    }
  }

  /**
   * Calculate recent progress in R terms
   */
  private calculateRecentProgress(
    state: TrailingStopState,
    currentR: number,
  ): number {
    // Simple implementation: progress from last stage transition
    const baseline =
      state.stage === "D" ? this.config.pivotTrailActivationR : 0;
    return currentR - baseline;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Update all positions with new bar data
   */
  updateAllPositions(
    barsBySymbol: Map<string, OHLCV>,
    atrBySymbol: Map<string, number>,
    pivotsBySymbol?: Map<string, Pivot[]>,
  ): Map<string, StopUpdateResult> {
    const results = new Map<string, StopUpdateResult>();

    for (const [positionId, state] of this.positions) {
      const bar = barsBySymbol.get(state.symbol);
      const atr = atrBySymbol.get(state.symbol);
      const pivots = pivotsBySymbol?.get(state.symbol);

      if (bar && atr) {
        const result = this.updateStop(positionId, bar, atr, pivots);
        results.set(positionId, result);
      }
    }

    return results;
  }

  /**
   * Get all positions that need action
   */
  getPositionsNeedingAction(): TrailingStopState[] {
    return Array.from(this.positions.values()).filter(
      (state) => state.stage === "E" || state.partialExitsDone > 0,
    );
  }

  /**
   * Get summary statistics
   */
  getStatistics(): {
    total: number;
    byStage: Record<TrailingStopStage, number>;
    avgMFE: number;
    avgMAE: number;
    avgBarsHeld: number;
  } {
    const positions = Array.from(this.positions.values());
    const byStage: Record<TrailingStopStage, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };

    let totalMFE = 0;
    let totalMAE = 0;
    let totalBars = 0;

    for (const pos of positions) {
      byStage[pos.stage]++;
      totalMFE += pos.maxFavorableExcursion;
      totalMAE += pos.maxAdverseExcursion;
      totalBars += pos.barsHeld;
    }

    const count = positions.length || 1;

    return {
      total: positions.length,
      byStage,
      avgMFE: totalMFE / count,
      avgMAE: totalMAE / count,
      avgBarsHeld: totalBars / count,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createTrailingStopManager(
  config?: Partial<TrailingStopConfig>,
): TrailingStopManager {
  return new TrailingStopManager(config);
}
