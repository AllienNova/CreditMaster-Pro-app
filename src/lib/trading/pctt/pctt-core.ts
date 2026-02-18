import type { CorrelationMonitor } from '@/lib/trading/correlation-monitor';

/**
 * PCTT Core Engine - Pivot-Constrained Trendline Trading
 * 
 * A systematic market-structure methodology that converts discretionary
 * trendline analysis into a deterministic, testable, automatable system.
 * 
 * Key Components:
 * - Pivot extraction (non-repainting)
 * - Boundary estimation with Q-score
 * - Regime detection (Trend/Range/Transition)
 * - Event state machine (Break/Freeze/Retest/Failure)
 * - Risk geometry (Action/Safety lines)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Pivot {
  index: number;
  price: number;
  type: 'high' | 'low';
  confirmed: boolean;
  confirmationBar: number;
}

export interface BoundaryLine {
  slope: number;
  intercept: number;
  startIndex: number;
  pivots: Pivot[];
  qScore: number;
  touches: number;
  violations: number;
  frozen: boolean;
  frozenAt?: number;
}

export interface StructureObject {
  support: BoundaryLine | null;
  resistance: BoundaryLine | null;
  regime: 'trend_up' | 'trend_down' | 'range' | 'transition';
  event: PCTTEvent;
  atr: number;
  efficiencyRatio: number;
  crossingCount: number;
  distanceToSupport: number;
  distanceToResistance: number;
}

export type PCTTEvent = 
  | 'idle'
  | 'break_up'
  | 'break_down'
  | 'freeze_up'
  | 'freeze_down'
  | 'retest_up'
  | 'retest_down'
  | 'entry_long'
  | 'entry_short'
  | 'failure';

export interface PCTTSignal {
  type: 'long' | 'short' | 'none';
  event: PCTTEvent;
  actionLine: number;
  safetyLine: number;
  qScore: number;
  entryPrice: number;
  stopPrice: number;
  targetPrices: number[];
  riskReward: number;
  confidence: number;
  regime: string;
  timestamp: number;
}

export interface PCTTConfig {
  // Pivot detection
  pivotDepth: number;           // Bars left/right for pivot confirmation (default: 5)
  pivotLookback: number;        // Max bars to look back for pivots (default: 150)
  minPivots: number;            // Minimum pivots for valid structure (default: 5)
  
  // ATR settings
  atrPeriod: number;            // ATR calculation period (default: 14)
  
  // Break confirmation (ATR multiples)
  breakPenetration: number;     // Wick penetration threshold (default: 0.20)
  breakConfirmation: number;    // Close confirmation threshold (default: 0.30)
  
  // Retest parameters
  retestTolerance: number;      // Retest zone tolerance (default: 0.20)
  retestWindow: number;         // Max bars for retest (default: 20)
  minRejectionScore: number;    // Min rejection score for entry (default: 0.5)
  
  // Quality thresholds
  minQScore: number;            // Minimum Q-score for trades (default: 0.65)
  touchTolerance: number;       // Touch detection tolerance (default: 0.15)
  
  // RANSAC consensus
  minConsensus: number;         // Min inlier pivots for valid line (default: 3)
  ransacIterations: number;     // Max RANSAC iterations (default: 50)
  ransacInlierThreshold: number; // Inlier tolerance in ATR multiples (default: 0.2)
  ransacRefitIterations: number; // Iterative re-fit passes (default: 3)
  ransacEarlyStopPct: number;   // Stop if inlier% exceeds this (default: 0.85)
  
  // Boundary hysteresis
  hysteresisThreshold: number;  // Score improvement needed to switch (default: 0.3)
  minLineLife: number;          // Min bars before line is tradable (default: 5)
  
  // Failure/invalidation
  failureBuffer: number;        // Failure threshold (default: 0.35)
  
  // Regime detection
  erPeriod: number;             // Efficiency ratio period (default: 20)
  erTrendThreshold: number;     // ER threshold for trend (default: 0.5)
  crossingWindow: number;       // Window for crossing count (default: 20)
  maxCrossings: number;         // Max crossings for trend (default: 4)
  
  // Risk parameters
  stopBuffer: number;           // Stop buffer beyond safety line (default: 0.5)
  target1R: number;             // First target in R multiples (default: 1.0)
  target2R: number;             // Second target (default: 2.0)
  target3R: number;             // Third target (default: 3.0)

  // TRD-005: White's Reality Check
  bootstrapSamples: number;             // Number of bootstrap resamples (default: 1000)
  whiteRealityAlpha: number;            // Significance level (default: 0.05)

  // TRD-006: Hybrid trailing stop
  hybridTrailingEnabled: boolean;       // Enable ATR+volatility trailing (default: true)
  trailingAtrMultiplier: number;        // ATR multiplier for base trailing distance (default: 2.0)
  trailingVolatilityHalfLife: number;   // EWMA half-life in bars for volatility (default: 20)
  trailingMinLockR: number;             // Min R profit before trailing activates (default: 0.5)
  adaptiveStopVolWeight: number;        // Volatility regime weight in stop (default: 0.3)

  // TRD-007: Composite rejection score weights
  rejectionCandleWeight: number;        // Candle pattern weight (default: 0.55)
  rejectionVolumeWeight: number;        // Volume factor weight (default: 0.15)
  rejectionCorrelationWeight: number;   // Correlation factor weight (default: 0.15)
  rejectionStructureWeight: number;     // Structure Q-score weight (default: 0.15)
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_PCTT_CONFIG: PCTTConfig = {
  pivotDepth: 5,
  pivotLookback: 150,
  minPivots: 5,
  atrPeriod: 14,
  breakPenetration: 0.20,
  breakConfirmation: 0.30,
  retestTolerance: 0.20,
  retestWindow: 20,
  minRejectionScore: 0.5,
  minQScore: 0.65,
  touchTolerance: 0.15,
  minConsensus: 3,
  ransacIterations: 50,
  ransacInlierThreshold: 0.2,
  ransacRefitIterations: 3,
  ransacEarlyStopPct: 0.85,
  hysteresisThreshold: 0.3,
  minLineLife: 5,
  failureBuffer: 0.35,
  erPeriod: 20,
  erTrendThreshold: 0.5,
  crossingWindow: 20,
  maxCrossings: 4,
  stopBuffer: 0.5,
  target1R: 1.0,
  target2R: 2.0,
  target3R: 3.0,
  // TRD-005: White's Reality Check
  bootstrapSamples: 1000,
  whiteRealityAlpha: 0.05,
  // TRD-006: Hybrid trailing stop
  hybridTrailingEnabled: true,
  trailingAtrMultiplier: 2.0,
  trailingVolatilityHalfLife: 20,
  trailingMinLockR: 0.5,
  adaptiveStopVolWeight: 0.3,
  // TRD-007: Composite rejection score
  rejectionCandleWeight: 0.55,
  rejectionVolumeWeight: 0.15,
  rejectionCorrelationWeight: 0.15,
  rejectionStructureWeight: 0.15,
};

// ============================================================================
// TRD-005: WHITE'S REALITY CHECK TYPES
// ============================================================================

export interface WhiteRealityResult {
  pValue: number;
  isSignificant: boolean;
  actualMetric: number;
  bootstrapMean: number;
  bootstrapStdDev: number;
  bootstrapPercentile95: number;
  numSamples: number;
  alpha: number;
}

// ============================================================================
// TRD-006: HYBRID TRAILING STOP TYPES
// ============================================================================

export interface HybridTrailingStop {
  active: boolean;
  direction: 'long' | 'short';
  entryPrice: number;
  initialStop: number;
  currentStop: number;
  highWaterMark: number;     // Best price since entry (highest for long, lowest for short)
  trailingDistance: number;   // Current trailing distance in price units
  atrAtEntry: number;
  riskDistance: number;       // Entry-to-stop distance = 1R
  lockedR: number;           // Current R locked (0 = no profit locked)
  barsHeld: number;
  adaptiveMultiplier: number; // Volatility-adjusted ATR multiplier
}

// ============================================================================
// TRD-007: COMPOSITE REJECTION SCORE TYPES
// ============================================================================

export interface CompositeRejectionScore {
  compositeScore: number;     // Final blended score 0-1
  candleScore: number;        // Raw candle rejection score
  volumeScore: number;        // Volume confirmation score
  correlationScore: number;   // Correlation regime score (1 = low correlation / favorable)
  structureScore: number;     // Boundary Q-score component
  breakdown: Record<string, number>;
}

// ============================================================================
// PCTT ENGINE
// ============================================================================

export class PCTTEngine {
  private config: PCTTConfig;
  private data: OHLCV[] = [];
  private pivotHighs: Pivot[] = [];
  private pivotLows: Pivot[] = [];
  private structure: StructureObject | null = null;
  private state: PCTTEvent = 'idle';
  private frozenActionLine: BoundaryLine | null = null;
  private frozenSafetyLine: BoundaryLine | null = null;
  private breakBar: number = -1;
  private breakDirection: 'up' | 'down' | null = null;
  
  // Hysteresis tracking
  private currentSupport: BoundaryLine | null = null;
  private currentResistance: BoundaryLine | null = null;
  private supportLineAge: number = 0;
  private resistanceLineAge: number = 0;
  
  // ATR cache for performance
  private cachedATR: number = 0;
  private atrCacheBar: number = -1;

  // TRD-006: Hybrid trailing stop state
  private activeTrailingStop: HybridTrailingStop | null = null;
  private volatilityEwma: number = 0;
  private volatilityEwmaInitialized: boolean = false;

  // TRD-007: Correlation monitor for composite rejection scoring
  private correlationMonitor: CorrelationMonitor | null = null;
  private currentSymbol: string = '';

  constructor(config: Partial<PCTTConfig> = {}) {
    this.config = { ...DEFAULT_PCTT_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Process new bar and return structure + signal
   */
  update(bar: OHLCV): { structure: StructureObject; signal: PCTTSignal | null } {
    this.data.push(bar);
    const currentIndex = this.data.length - 1;

    // 1. Extract confirmed pivots (non-repainting)
    this.extractPivots(currentIndex);

    // 2. Calculate ATR
    const atr = this.calculateATR();

    // 3. Estimate boundaries
    const support = this.estimateBoundary('support', atr);
    const resistance = this.estimateBoundary('resistance', atr);

    // 4. Detect regime
    const { regime, efficiencyRatio, crossingCount } = this.detectRegime();

    // 5. Calculate distances
    const currentPrice = bar.close;
    const supportPrice = support ? this.projectLine(support, currentIndex) : 0;
    const resistancePrice = resistance ? this.projectLine(resistance, currentIndex) : Infinity;

    // 6. Build structure object
    this.structure = {
      support,
      resistance,
      regime,
      event: this.state,
      atr,
      efficiencyRatio,
      crossingCount,
      distanceToSupport: support ? (currentPrice - supportPrice) / atr : Infinity,
      distanceToResistance: resistance ? (resistancePrice - currentPrice) / atr : Infinity,
    };

    // 7. Run state machine
    const signal = this.runStateMachine(bar, currentIndex, atr);

    return { structure: this.structure, signal };
  }

  /**
   * Get current structure without updating
   */
  getStructure(): StructureObject | null {
    return this.structure;
  }

  /**
   * Get all confirmed pivots
   */
  getPivots(): { highs: Pivot[]; lows: Pivot[] } {
    return {
      highs: [...this.pivotHighs],
      lows: [...this.pivotLows],
    };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.data = [];
    this.pivotHighs = [];
    this.pivotLows = [];
    this.structure = null;
    this.state = 'idle';
    this.frozenActionLine = null;
    this.frozenSafetyLine = null;
    this.breakBar = -1;
    this.breakDirection = null;
    this.activeTrailingStop = null;
    this.volatilityEwma = 0;
    this.volatilityEwmaInitialized = false;
  }

  // ==========================================================================
  // TRD-007: Correlation monitor injection
  // ==========================================================================

  /**
   * Set correlation monitor for composite rejection scoring.
   * The symbol is used to check correlation regime for this instrument.
   */
  setCorrelationMonitor(monitor: CorrelationMonitor, symbol: string): void {
    this.correlationMonitor = monitor;
    this.currentSymbol = symbol;
  }

  // ==========================================================================
  // TRD-005: WHITE'S REALITY CHECK
  // ==========================================================================

  /**
   * Run White's Reality Check to validate that PCTT signals on the given
   * bar series are statistically significant (not curve-fitted).
   *
   * Method:
   * 1. Run PCTT on actual data, compute performance metric (Sharpe ratio).
   * 2. Generate bootstrapSamples resampled return series (stationary bootstrap).
   * 3. For each bootstrap, compute performance of a random-entry strategy.
   * 4. p-value = fraction of bootstrap samples with metric >= actual.
   *
   * @param bars - OHLCV data series to test
   * @param metric - Performance metric function (default: Sharpe ratio)
   */
  whiteRealityCheck(
    bars: OHLCV[],
    metric?: (returns: number[]) => number
  ): WhiteRealityResult {
    const metricFn = metric ?? this.sharpeRatio.bind(this);

    // 1. Run PCTT on actual data, collect signal returns
    const actualReturns = this.collectSignalReturns(bars);
    const actualMetric = actualReturns.length >= 2 ? metricFn(actualReturns) : 0;

    // 2. Compute bar-to-bar returns for bootstrap resampling
    const barReturns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      barReturns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }

    if (barReturns.length < 10) {
      return {
        pValue: 1,
        isSignificant: false,
        actualMetric,
        bootstrapMean: 0,
        bootstrapStdDev: 0,
        bootstrapPercentile95: 0,
        numSamples: 0,
        alpha: this.config.whiteRealityAlpha,
      };
    }

    // 3. Bootstrap: compute metric on resampled return series
    const bootstrapMetrics = this.bootstrapPValue(
      barReturns,
      metricFn,
      this.config.bootstrapSamples
    );

    // 4. Compute p-value
    const exceedCount = bootstrapMetrics.filter(m => m >= actualMetric).length;
    const pValue = exceedCount / bootstrapMetrics.length;

    // Bootstrap distribution stats
    const sorted = [...bootstrapMetrics].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length;

    return {
      pValue,
      isSignificant: pValue < this.config.whiteRealityAlpha,
      actualMetric,
      bootstrapMean: mean,
      bootstrapStdDev: Math.sqrt(variance),
      bootstrapPercentile95: sorted[Math.floor(sorted.length * 0.95)],
      numSamples: bootstrapMetrics.length,
      alpha: this.config.whiteRealityAlpha,
    };
  }

  // ==========================================================================
  // TRD-006: HYBRID TRAILING STOP
  // ==========================================================================

  /**
   * Initialize a hybrid trailing stop for a new trade.
   * Combines ATR-based trailing with volatility-regime adaptation.
   */
  initHybridTrailingStop(
    direction: 'long' | 'short',
    entryPrice: number,
    initialStop: number,
    atr: number
  ): HybridTrailingStop {
    const riskDistance = Math.abs(entryPrice - initialStop);
    this.activeTrailingStop = {
      active: false,   // Doesn't trail until minLockR is reached
      direction,
      entryPrice,
      initialStop,
      currentStop: initialStop,
      highWaterMark: entryPrice,
      trailingDistance: this.config.trailingAtrMultiplier * atr,
      atrAtEntry: atr,
      riskDistance,
      lockedR: 0,
      barsHeld: 0,
      adaptiveMultiplier: this.config.trailingAtrMultiplier,
    };
    return { ...this.activeTrailingStop };
  }

  /**
   * Update the hybrid trailing stop with a new bar.
   * Returns the updated stop and whether the stop was hit.
   */
  updateHybridTrailingStop(bar: OHLCV, currentATR: number): {
    stop: HybridTrailingStop;
    stopHit: boolean;
    adaptiveStop: number;
  } | null {
    const ts = this.activeTrailingStop;
    if (!ts) return null;

    ts.barsHeld++;

    // Update volatility EWMA for adaptive stop
    this.updateVolatilityEwma(bar, currentATR);

    // Compute adaptive multiplier blending ATR with volatility regime
    const volRatio = this.volatilityEwma > 0 ? currentATR / this.volatilityEwma : 1;
    const baseMultiplier = this.config.trailingAtrMultiplier;
    const volAdjust = this.config.adaptiveStopVolWeight * (volRatio - 1);
    ts.adaptiveMultiplier = Math.max(1.0, baseMultiplier + volAdjust);

    // Update trailing distance
    ts.trailingDistance = ts.adaptiveMultiplier * currentATR;

    if (ts.direction === 'long') {
      // Update high water mark
      if (bar.high > ts.highWaterMark) {
        ts.highWaterMark = bar.high;
      }

      // Calculate current R profit
      ts.lockedR = (ts.highWaterMark - ts.entryPrice) / ts.riskDistance;

      // Activate trailing once minLockR is reached
      if (!ts.active && ts.lockedR >= this.config.trailingMinLockR) {
        ts.active = true;
      }

      // Compute adaptive trailing stop
      const trailedStop = ts.active
        ? ts.highWaterMark - ts.trailingDistance
        : ts.initialStop;

      // Stop only ratchets up for longs
      ts.currentStop = Math.max(ts.currentStop, trailedStop);

      // Check if stop is hit
      const stopHit = bar.low <= ts.currentStop;

      return {
        stop: { ...ts },
        stopHit,
        adaptiveStop: ts.currentStop,
      };
    } else {
      // Short direction
      if (bar.low < ts.highWaterMark) {
        ts.highWaterMark = bar.low;
      }

      ts.lockedR = (ts.entryPrice - ts.highWaterMark) / ts.riskDistance;

      if (!ts.active && ts.lockedR >= this.config.trailingMinLockR) {
        ts.active = true;
      }

      const trailedStop = ts.active
        ? ts.highWaterMark + ts.trailingDistance
        : ts.initialStop;

      // Stop only ratchets down for shorts
      ts.currentStop = Math.min(ts.currentStop, trailedStop);

      const stopHit = bar.high >= ts.currentStop;

      return {
        stop: { ...ts },
        stopHit,
        adaptiveStop: ts.currentStop,
      };
    }
  }

  /**
   * Get active trailing stop state (read-only copy)
   */
  getHybridTrailingStop(): HybridTrailingStop | null {
    return this.activeTrailingStop ? { ...this.activeTrailingStop } : null;
  }

  /**
   * Close the active trailing stop
   */
  closeHybridTrailingStop(): void {
    this.activeTrailingStop = null;
  }

  // ==========================================================================
  // PIVOT EXTRACTION (Non-Repainting)
  // ==========================================================================

  private extractPivots(currentIndex: number): void {
    const depth = this.config.pivotDepth;
    const confirmIndex = currentIndex - depth;

    if (confirmIndex < depth) return;

    // Check for pivot low at confirmIndex
    const confirmBar = this.data[confirmIndex];
    let isPivotLow = true;
    let isPivotHigh = true;

    for (let i = confirmIndex - depth; i <= confirmIndex + depth; i++) {
      if (i === confirmIndex || i < 0 || i >= this.data.length) continue;
      
      if (this.data[i].low <= confirmBar.low) {
        isPivotLow = false;
      }
      if (this.data[i].high >= confirmBar.high) {
        isPivotHigh = false;
      }
    }

    if (isPivotLow) {
      this.pivotLows.push({
        index: confirmIndex,
        price: confirmBar.low,
        type: 'low',
        confirmed: true,
        confirmationBar: currentIndex,
      });
      this.trimPivots(this.pivotLows);
    }

    if (isPivotHigh) {
      this.pivotHighs.push({
        index: confirmIndex,
        price: confirmBar.high,
        type: 'high',
        confirmed: true,
        confirmationBar: currentIndex,
      });
      this.trimPivots(this.pivotHighs);
    }
  }

  private trimPivots(pivots: Pivot[]): void {
    const currentIndex = this.data.length - 1;
    const cutoff = currentIndex - this.config.pivotLookback;
    
    while (pivots.length > 0 && pivots[0].index < cutoff) {
      pivots.shift();
    }
  }

  // ==========================================================================
  // BOUNDARY ESTIMATION
  // ==========================================================================

  private estimateBoundary(type: 'support' | 'resistance', atr: number): BoundaryLine | null {
    const pivots = type === 'support' ? this.pivotLows : this.pivotHighs;
    const currentLine = type === 'support' ? this.currentSupport : this.currentResistance;

    if (pivots.length < 2) return null;

    const recentPivots = pivots.slice(-Math.max(15, pivots.length));
    const maxSlope = this.config.touchTolerance * atr;

    // Phase 1: RANSAC random sampling + exhaustive for small sets
    let bestLine: BoundaryLine | null = null;
    let bestScore = -Infinity;
    let bestSlope = 0;
    let bestIntercept = 0;

    const n = recentPivots.length;
    const pairCount = (n * (n - 1)) / 2;
    const useExhaustive = pairCount <= this.config.ransacIterations;

    if (useExhaustive) {
      // Exhaustive enumeration for small pivot sets
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const result = this.evaluateRansacCandidate(
            recentPivots[i], recentPivots[j], recentPivots, atr, maxSlope, type
          );
          if (result && result.score > bestScore) {
            bestScore = result.score;
            bestSlope = result.slope;
            bestIntercept = result.intercept;
            bestLine = result.line;
          }
        }
      }
    } else {
      // RANSAC random sampling for larger sets
      for (let iter = 0; iter < this.config.ransacIterations; iter++) {
        const i = Math.floor(Math.random() * n);
        let j = Math.floor(Math.random() * (n - 1));
        if (j >= i) j++;

        const result = this.evaluateRansacCandidate(
          recentPivots[i], recentPivots[j], recentPivots, atr, maxSlope, type
        );
        if (result && result.score > bestScore) {
          bestScore = result.score;
          bestSlope = result.slope;
          bestIntercept = result.intercept;
          bestLine = result.line;
        }

        // Early stop if inlier percentage is very high
        if (result && result.inlierCount / n >= this.config.ransacEarlyStopPct) {
          break;
        }
      }
    }

    // Phase 2: Iterative re-fitting on inlier set
    if (bestLine) {
      let refitSlope = bestSlope;
      let refitIntercept = bestIntercept;

      for (let pass = 0; pass < this.config.ransacRefitIterations; pass++) {
        const inliers = this.getInliers(refitSlope, refitIntercept, recentPivots, atr);
        if (inliers.length < 2) break;

        // Least-squares re-fit on inliers only
        const fitted = this.leastSquaresFit(inliers);
        if (!fitted || Math.abs(fitted.slope) > maxSlope) break;

        // Re-score with the fitted line
        const { score, touches, violations, inlierCount } = this.scoreLine(
          fitted.slope, fitted.intercept, recentPivots, atr, type
        );

        if (inlierCount < this.config.minConsensus) break;

        if (score > bestScore) {
          bestScore = score;
          refitSlope = fitted.slope;
          refitIntercept = fitted.intercept;
          bestLine = {
            slope: fitted.slope,
            intercept: fitted.intercept,
            startIndex: inliers[0].index,
            pivots: recentPivots,
            qScore: this.sigmoid(score),
            touches,
            violations,
            frozen: false,
          };
        } else {
          // Convergence: re-fit didn't improve, stop
          break;
        }
      }
    }

    // Validate minimum touches
    if (bestLine && bestLine.touches < this.config.minPivots - 2) {
      return null;
    }

    // Apply hysteresis: only switch if new line is significantly better
    if (currentLine && bestLine) {
      const currentScore = this.getLineScore(currentLine, atr, type);
      const improvement = bestScore - currentScore;

      if (improvement < this.config.hysteresisThreshold) {
        if (type === 'support') {
          this.supportLineAge++;
        } else {
          this.resistanceLineAge++;
        }
        return currentLine;
      }
    }

    // New line selected, reset age
    if (bestLine) {
      if (type === 'support') {
        this.currentSupport = bestLine;
        this.supportLineAge = 0;
      } else {
        this.currentResistance = bestLine;
        this.resistanceLineAge = 0;
      }
    }

    // Check minimum line life for tradability
    const lineAge = type === 'support' ? this.supportLineAge : this.resistanceLineAge;
    if (bestLine && lineAge < this.config.minLineLife) {
      bestLine.qScore = bestLine.qScore * 0.5;
    }

    return bestLine;
  }

  /** Evaluate a single RANSAC candidate pair */
  private evaluateRansacCandidate(
    p1: Pivot,
    p2: Pivot,
    allPivots: Pivot[],
    atr: number,
    maxSlope: number,
    type: 'support' | 'resistance'
  ): { score: number; slope: number; intercept: number; line: BoundaryLine; inlierCount: number } | null {
    if (p1.index === p2.index) return null;

    const slope = (p2.price - p1.price) / (p2.index - p1.index);
    const intercept = p1.price - slope * p1.index;

    if (Math.abs(slope) > maxSlope) return null;

    const { score, touches, violations, inlierCount } = this.scoreLine(
      slope, intercept, allPivots, atr, type
    );

    if (inlierCount < this.config.minConsensus) return null;

    return {
      score,
      slope,
      intercept,
      inlierCount,
      line: {
        slope,
        intercept,
        startIndex: Math.min(p1.index, p2.index),
        pivots: allPivots,
        qScore: this.sigmoid(score),
        touches,
        violations,
        frozen: false,
      },
    };
  }

  /** Get inlier pivots within RANSAC threshold of a line */
  private getInliers(slope: number, intercept: number, pivots: Pivot[], atr: number): Pivot[] {
    const tolerance = this.config.ransacInlierThreshold * atr;
    return pivots.filter(p => {
      const linePrice = slope * p.index + intercept;
      return Math.abs(p.price - linePrice) <= tolerance;
    });
  }

  /** Ordinary least-squares fit on a set of pivots */
  private leastSquaresFit(pivots: Pivot[]): { slope: number; intercept: number } | null {
    const n = pivots.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of pivots) {
      sumX += p.index;
      sumY += p.price;
      sumXY += p.index * p.price;
      sumX2 += p.index * p.index;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private getLineScore(line: BoundaryLine, atr: number, type: 'support' | 'resistance'): number {
    const { score } = this.scoreLine(line.slope, line.intercept, line.pivots, atr, type);
    return score;
  }

  private scoreLine(
    slope: number,
    intercept: number,
    pivots: Pivot[],
    atr: number,
    type: 'support' | 'resistance'
  ): { score: number; touches: number; violations: number; inlierCount: number } {
    let touchScore = 0;
    let touches = 0;
    let violations = 0;
    let inlierCount = 0;

    const tolerance = this.config.touchTolerance * atr;

    for (const pivot of pivots) {
      const linePrice = slope * pivot.index + intercept;
      const distance = pivot.price - linePrice;
      const normalizedDist = Math.abs(distance) / atr;

      if (Math.abs(distance) <= tolerance) {
        // Touch: pivot is within tolerance of line (inlier)
        touchScore += 1 - (normalizedDist / this.config.touchTolerance);
        touches++;
        inlierCount++;
      } else if (type === 'support' && distance < -tolerance) {
        // Violation: price closed below support
        violations += this.huberLoss(normalizedDist, 1.0);
      } else if (type === 'resistance' && distance > tolerance) {
        // Violation: price closed above resistance
        violations += this.huberLoss(normalizedDist, 1.0);
      } else {
        // Not a touch but not a violation either - still an inlier if close
        if (normalizedDist < this.config.touchTolerance * 2) {
          inlierCount++;
        }
      }
    }

    // Calculate span bonus
    const span = pivots.length > 1 
      ? pivots[pivots.length - 1].index - pivots[0].index 
      : 0;
    const spanBonus = 0.2 * Math.log(1 + span);

    // Ridge penalty on slope
    const slopePenalty = 0.25 * Math.abs(slope) / atr;

    // Final score
    const score = touchScore - 1.5 * violations + spanBonus - slopePenalty;

    return { score, touches, violations, inlierCount };
  }

  private huberLoss(x: number, delta: number): number {
    const absX = Math.abs(x);
    if (absX <= delta) {
      return 0.5 * x * x;
    }
    return delta * (absX - 0.5 * delta);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private projectLine(line: BoundaryLine, index: number): number {
    return line.slope * index + line.intercept;
  }

  // ==========================================================================
  // REGIME DETECTION
  // ==========================================================================

  private detectRegime(): { 
    regime: StructureObject['regime']; 
    efficiencyRatio: number; 
    crossingCount: number;
  } {
    const n = this.config.erPeriod;
    if (this.data.length < n + 1) {
      return { regime: 'transition', efficiencyRatio: 0.5, crossingCount: 0 };
    }

    const currentIndex = this.data.length - 1;

    // Efficiency Ratio (Kaufman)
    const priceChange = Math.abs(
      this.data[currentIndex].close - this.data[currentIndex - n].close
    );
    
    let volatility = 0;
    for (let i = currentIndex - n + 1; i <= currentIndex; i++) {
      volatility += Math.abs(this.data[i].close - this.data[i - 1].close);
    }

    const efficiencyRatio = volatility > 0 ? priceChange / volatility : 0;

    // Crossing count (price crossing midline)
    const midline = this.calculateMidline(n);
    let crossingCount = 0;
    let lastSide = this.data[currentIndex - n].close > midline ? 1 : -1;

    for (let i = currentIndex - n + 1; i <= currentIndex; i++) {
      const currentSide = this.data[i].close > midline ? 1 : -1;
      if (currentSide !== lastSide) {
        crossingCount++;
        lastSide = currentSide;
      }
    }

    // Determine regime
    let regime: StructureObject['regime'];
    
    if (efficiencyRatio >= this.config.erTrendThreshold && 
        crossingCount <= this.config.maxCrossings) {
      // Trending
      const direction = this.data[currentIndex].close > this.data[currentIndex - n].close;
      regime = direction ? 'trend_up' : 'trend_down';
    } else if (efficiencyRatio < this.config.erTrendThreshold * 0.5 || 
               crossingCount > this.config.maxCrossings * 1.5) {
      regime = 'range';
    } else {
      regime = 'transition';
    }

    return { regime, efficiencyRatio, crossingCount };
  }

  private calculateMidline(period: number): number {
    const currentIndex = this.data.length - 1;
    let sum = 0;
    for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
      sum += this.data[i].close;
    }
    return sum / period;
  }

  // ==========================================================================
  // ATR CALCULATION
  // ==========================================================================

  private calculateATR(): number {
    const period = this.config.atrPeriod;
    if (this.data.length < period + 1) return 0;

    const currentIndex = this.data.length - 1;
    let sum = 0;

    for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
      const high = this.data[i].high;
      const low = this.data[i].low;
      const prevClose = this.data[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      sum += tr;
    }

    return sum / period;
  }

  // ==========================================================================
  // STATE MACHINE
  // ==========================================================================

  private runStateMachine(
    bar: OHLCV, 
    currentIndex: number, 
    atr: number
  ): PCTTSignal | null {
    if (!this.structure) return null;

    const { support, resistance, regime } = this.structure;

    switch (this.state) {
      case 'idle':
        return this.handleIdleState(bar, currentIndex, atr, support, resistance, regime);

      case 'freeze_up':
      case 'freeze_down':
        return this.handleFreezeState(bar, currentIndex, atr);

      case 'retest_up':
      case 'retest_down':
        return this.handleRetestState(bar, currentIndex, atr);

      default:
        return null;
    }
  }

  private handleIdleState(
    bar: OHLCV,
    currentIndex: number,
    atr: number,
    support: BoundaryLine | null,
    resistance: BoundaryLine | null,
    regime: StructureObject['regime']
  ): PCTTSignal | null {
    // Check for resistance break (up)
    if (resistance && resistance.qScore >= this.config.minQScore) {
      const resistancePrice = this.projectLine(resistance, currentIndex);
      const penetrationOK = (bar.high - resistancePrice) / atr >= this.config.breakPenetration;
      const confirmOK = (bar.close - resistancePrice) / atr >= this.config.breakConfirmation;

      if (penetrationOK && confirmOK && (regime === 'trend_up' || regime === 'transition')) {
        // Freeze lines
        this.frozenActionLine = { ...resistance, frozen: true, frozenAt: currentIndex };
        this.frozenSafetyLine = support ? { ...support, frozen: true, frozenAt: currentIndex } : null;
        this.breakBar = currentIndex;
        this.breakDirection = 'up';
        this.state = 'freeze_up';
        return null;
      }
    }

    // Check for support break (down)
    if (support && support.qScore >= this.config.minQScore) {
      const supportPrice = this.projectLine(support, currentIndex);
      const penetrationOK = (supportPrice - bar.low) / atr >= this.config.breakPenetration;
      const confirmOK = (supportPrice - bar.close) / atr >= this.config.breakConfirmation;

      if (penetrationOK && confirmOK && (regime === 'trend_down' || regime === 'transition')) {
        this.frozenActionLine = { ...support, frozen: true, frozenAt: currentIndex };
        this.frozenSafetyLine = resistance ? { ...resistance, frozen: true, frozenAt: currentIndex } : null;
        this.breakBar = currentIndex;
        this.breakDirection = 'down';
        this.state = 'freeze_down';
        return null;
      }
    }

    return null;
  }

  private handleFreezeState(
    bar: OHLCV,
    currentIndex: number,
    atr: number
  ): PCTTSignal | null {
    if (!this.frozenActionLine) {
      this.state = 'idle';
      return null;
    }

    const barsSinceBreak = currentIndex - this.breakBar;
    const actionPrice = this.projectLine(this.frozenActionLine, currentIndex);
    const safetyPrice = this.frozenSafetyLine 
      ? this.projectLine(this.frozenSafetyLine, currentIndex) 
      : (this.breakDirection === 'up' ? bar.low - 2 * atr : bar.high + 2 * atr);

    // Check for failure
    if (this.breakDirection === 'up') {
      const failureThreshold = safetyPrice + this.config.failureBuffer * atr;
      if (bar.close < failureThreshold) {
        this.resetState();
        return null;
      }

      // Check for retest
      const retestHit = Math.abs(bar.low - actionPrice) / atr <= this.config.retestTolerance ||
                        Math.abs(bar.close - actionPrice) / atr <= this.config.retestTolerance;

      if (retestHit) {
        this.state = 'retest_up';
        return null;
      }
    } else {
      const failureThreshold = safetyPrice - this.config.failureBuffer * atr;
      if (bar.close > failureThreshold) {
        this.resetState();
        return null;
      }

      const retestHit = Math.abs(bar.high - actionPrice) / atr <= this.config.retestTolerance ||
                        Math.abs(bar.close - actionPrice) / atr <= this.config.retestTolerance;

      if (retestHit) {
        this.state = 'retest_down';
        return null;
      }
    }

    // Check for timeout
    if (barsSinceBreak > this.config.retestWindow) {
      this.resetState();
    }

    return null;
  }

  private handleRetestState(
    bar: OHLCV,
    currentIndex: number,
    atr: number
  ): PCTTSignal | null {
    if (!this.frozenActionLine) {
      this.state = 'idle';
      return null;
    }

    const actionPrice = this.projectLine(this.frozenActionLine, currentIndex);
    const safetyPrice = this.frozenSafetyLine
      ? this.projectLine(this.frozenSafetyLine, currentIndex)
      : (this.breakDirection === 'up' ? bar.low - 2 * atr : bar.high + 2 * atr);

    // Check for rejection (entry signal) with composite rejection score (TRD-007)
    if (this.breakDirection === 'up') {
      // Long setup: close above action line with wick below
      const composite = this.calculateCompositeRejectionScore(
        bar, actionPrice, atr, 'long', this.frozenActionLine.qScore
      );
      const rejectionScore = composite.compositeScore;
      const hasRejection = bar.close > actionPrice && bar.low < actionPrice;

      if (hasRejection && rejectionScore >= this.config.minRejectionScore) {
        const stopPrice = safetyPrice - this.config.stopBuffer * atr;
        const riskDistance = bar.close - stopPrice;

        const signal: PCTTSignal = {
          type: 'long',
          event: 'entry_long',
          actionLine: actionPrice,
          safetyLine: safetyPrice,
          qScore: this.frozenActionLine.qScore,
          entryPrice: bar.close,
          stopPrice,
          targetPrices: [
            bar.close + riskDistance * this.config.target1R,
            bar.close + riskDistance * this.config.target2R,
            bar.close + riskDistance * this.config.target3R,
          ],
          riskReward: this.config.target2R,
          confidence: rejectionScore,
          regime: this.structure?.regime || 'transition',
          timestamp: bar.time,
        };

        // TRD-006: Initialize hybrid trailing stop if enabled
        if (this.config.hybridTrailingEnabled) {
          this.initHybridTrailingStop('long', bar.close, stopPrice, atr);
        }

        this.resetState();
        return signal;
      }
    } else {
      // Short setup: close below action line with wick above
      const composite = this.calculateCompositeRejectionScore(
        bar, actionPrice, atr, 'short', this.frozenActionLine.qScore
      );
      const rejectionScore = composite.compositeScore;
      const hasRejection = bar.close < actionPrice && bar.high > actionPrice;

      if (hasRejection && rejectionScore >= this.config.minRejectionScore) {
        const stopPrice = safetyPrice + this.config.stopBuffer * atr;
        const riskDistance = stopPrice - bar.close;

        const signal: PCTTSignal = {
          type: 'short',
          event: 'entry_short',
          actionLine: actionPrice,
          safetyLine: safetyPrice,
          qScore: this.frozenActionLine.qScore,
          entryPrice: bar.close,
          stopPrice,
          targetPrices: [
            bar.close - riskDistance * this.config.target1R,
            bar.close - riskDistance * this.config.target2R,
            bar.close - riskDistance * this.config.target3R,
          ],
          riskReward: this.config.target2R,
          confidence: rejectionScore,
          regime: this.structure?.regime || 'transition',
          timestamp: bar.time,
        };

        // TRD-006: Initialize hybrid trailing stop if enabled
        if (this.config.hybridTrailingEnabled) {
          this.initHybridTrailingStop('short', bar.close, stopPrice, atr);
        }

        this.resetState();
        return signal;
      }
    }

    // Check for failure after retest
    if (this.breakDirection === 'up' && bar.close < safetyPrice) {
      this.resetState();
    } else if (this.breakDirection === 'down' && bar.close > safetyPrice) {
      this.resetState();
    }

    return null;
  }

  /**
   * Calculate rejection score for retest validation
   * Measures how strongly price rejected from the action line
   */
  private calculateRejectionScore(
    bar: OHLCV,
    actionPrice: number,
    atr: number,
    direction: 'long' | 'short'
  ): number {
    let score = 0;
    
    if (direction === 'long') {
      // For longs: want close above action line, wick below
      const wickBelow = Math.max(0, actionPrice - bar.low);
      const closeAbove = Math.max(0, bar.close - actionPrice);
      const bodySize = Math.abs(bar.close - bar.open);
      const upperWick = bar.high - Math.max(bar.open, bar.close);
      const lowerWick = Math.min(bar.open, bar.close) - bar.low;
      
      // Score components (all normalized by ATR)
      const wickScore = Math.min(1, wickBelow / atr);           // Wick penetration
      const closeScore = Math.min(1, closeAbove / atr);          // Close strength
      const bodyScore = bodySize > 0 ? Math.min(1, bodySize / atr) : 0;  // Body size
      const wickRatio = lowerWick > upperWick ? 0.2 : 0;         // Favorable wick ratio
      
      // Bullish candle bonus
      const bullishBonus = bar.close > bar.open ? 0.2 : 0;
      
      score = wickScore * 0.3 + closeScore * 0.3 + bodyScore * 0.15 + wickRatio + bullishBonus;
    } else {
      // For shorts: want close below action line, wick above
      const wickAbove = Math.max(0, bar.high - actionPrice);
      const closeBelow = Math.max(0, actionPrice - bar.close);
      const bodySize = Math.abs(bar.close - bar.open);
      const upperWick = bar.high - Math.max(bar.open, bar.close);
      const lowerWick = Math.min(bar.open, bar.close) - bar.low;
      
      // Score components
      const wickScore = Math.min(1, wickAbove / atr);
      const closeScore = Math.min(1, closeBelow / atr);
      const bodyScore = bodySize > 0 ? Math.min(1, bodySize / atr) : 0;
      const wickRatio = upperWick > lowerWick ? 0.2 : 0;
      
      // Bearish candle bonus
      const bearishBonus = bar.close < bar.open ? 0.2 : 0;
      
      score = wickScore * 0.3 + closeScore * 0.3 + bodyScore * 0.15 + wickRatio + bearishBonus;
    }
    
    return Math.min(1, score);
  }

  private resetState(): void {
    this.state = 'idle';
    this.frozenActionLine = null;
    this.frozenSafetyLine = null;
    this.breakBar = -1;
    this.breakDirection = null;
  }

  // ==========================================================================
  // TRD-005: WHITE'S REALITY CHECK - PRIVATE HELPERS
  // ==========================================================================

  /**
   * Collect per-signal returns by running PCTT on the given bars.
   * Each signal's return = (exit price - entry price) / entry price,
   * where exit = target1R hit or stopPrice hit, whichever comes first.
   */
  private collectSignalReturns(bars: OHLCV[]): number[] {
    const engine = new PCTTEngine(this.config);
    const returns: number[] = [];
    let pendingSignal: PCTTSignal | null = null;

    for (const bar of bars) {
      if (pendingSignal) {
        // Check exit
        if (pendingSignal.type === 'long') {
          if (bar.low <= pendingSignal.stopPrice) {
            returns.push((pendingSignal.stopPrice - pendingSignal.entryPrice) / pendingSignal.entryPrice);
            pendingSignal = null;
          } else if (bar.high >= pendingSignal.targetPrices[0]) {
            returns.push((pendingSignal.targetPrices[0] - pendingSignal.entryPrice) / pendingSignal.entryPrice);
            pendingSignal = null;
          }
        } else {
          if (bar.high >= pendingSignal.stopPrice) {
            returns.push((pendingSignal.entryPrice - pendingSignal.stopPrice) / pendingSignal.entryPrice);
            pendingSignal = null;
          } else if (bar.low <= pendingSignal.targetPrices[0]) {
            returns.push((pendingSignal.entryPrice - pendingSignal.targetPrices[0]) / pendingSignal.entryPrice);
            pendingSignal = null;
          }
        }
      }

      const { signal } = engine.update(bar);
      if (signal && !pendingSignal) {
        pendingSignal = signal;
      }
    }

    return returns;
  }

  /**
   * Bootstrap p-value calculation using stationary block bootstrap.
   * Resamples bar returns with random block lengths (geometric distribution)
   * to preserve serial dependence, then computes metric on each sample.
   */
  private bootstrapPValue(
    barReturns: number[],
    metricFn: (returns: number[]) => number,
    numSamples: number
  ): number[] {
    const n = barReturns.length;
    const avgBlockLen = Math.max(2, Math.floor(Math.sqrt(n)));
    const pContinue = 1 - 1 / avgBlockLen; // Geometric distribution parameter
    const metrics: number[] = [];

    for (let s = 0; s < numSamples; s++) {
      // Generate one bootstrap sample with stationary block resampling
      const sample: number[] = [];
      let pos = Math.floor(Math.random() * n);

      while (sample.length < n) {
        sample.push(barReturns[pos % n]);

        // With probability pContinue, continue current block; otherwise start new block
        if (Math.random() < pContinue) {
          pos++;
        } else {
          pos = Math.floor(Math.random() * n);
        }
      }

      metrics.push(metricFn(sample));
    }

    return metrics;
  }

  /**
   * Sharpe ratio: mean(returns) / std(returns) * sqrt(252)
   * Annualized assuming daily returns.
   */
  private sharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
    const std = Math.sqrt(variance);
    if (std < 1e-12) return 0;
    return (mean / std) * Math.sqrt(252);
  }

  // ==========================================================================
  // TRD-006: HYBRID TRAILING STOP - PRIVATE HELPERS
  // ==========================================================================

  /**
   * Update exponentially-weighted moving average of ATR for volatility regime.
   * Uses half-life from config to compute decay factor.
   */
  private updateVolatilityEwma(_bar: OHLCV, currentATR: number): void {
    const halfLife = this.config.trailingVolatilityHalfLife;
    const decay = Math.exp(-Math.LN2 / halfLife);

    if (!this.volatilityEwmaInitialized) {
      this.volatilityEwma = currentATR;
      this.volatilityEwmaInitialized = true;
    } else {
      this.volatilityEwma = decay * this.volatilityEwma + (1 - decay) * currentATR;
    }
  }

  // ==========================================================================
  // TRD-007: COMPOSITE REJECTION SCORE
  // ==========================================================================

  /**
   * Compute composite rejection score blending candle, volume,
   * correlation regime, and structure quality factors.
   */
  private calculateCompositeRejectionScore(
    bar: OHLCV,
    actionPrice: number,
    atr: number,
    direction: 'long' | 'short',
    boundaryQScore: number
  ): CompositeRejectionScore {
    // 1. Candle rejection score (original method)
    const candleScore = this.calculateRejectionScore(bar, actionPrice, atr, direction);

    // 2. Volume score: higher volume on rejection = stronger confirmation
    const volumeScore = this.calculateVolumeScore(bar);

    // 3. Correlation score: lower correlation environment = better for mean-reversion retests
    const correlationScore = this.calculateCorrelationScore();

    // 4. Structure score: higher Q-score boundary = stronger support/resistance
    const structureScore = Math.min(1, boundaryQScore);

    // 5. Weighted composite
    const compositeScore = Math.min(1,
      this.config.rejectionCandleWeight * candleScore +
      this.config.rejectionVolumeWeight * volumeScore +
      this.config.rejectionCorrelationWeight * correlationScore +
      this.config.rejectionStructureWeight * structureScore
    );

    return {
      compositeScore,
      candleScore,
      volumeScore,
      correlationScore,
      structureScore,
      breakdown: {
        candleWeighted: this.config.rejectionCandleWeight * candleScore,
        volumeWeighted: this.config.rejectionVolumeWeight * volumeScore,
        correlationWeighted: this.config.rejectionCorrelationWeight * correlationScore,
        structureWeighted: this.config.rejectionStructureWeight * structureScore,
      },
    };
  }

  /**
   * Volume score: compare current bar volume to recent average.
   * Above-average volume on rejection = stronger signal.
   */
  private calculateVolumeScore(bar: OHLCV): number {
    if (this.data.length < 21 || bar.volume <= 0) return 0.5; // Neutral if no volume data

    // Average volume over last 20 bars
    let volSum = 0;
    const lookback = Math.min(20, this.data.length - 1);
    for (let i = this.data.length - 1 - lookback; i < this.data.length - 1; i++) {
      volSum += this.data[i].volume;
    }
    const avgVolume = volSum / lookback;

    if (avgVolume < 1) return 0.5;

    // Volume ratio capped at 3x for scoring
    const ratio = Math.min(3, bar.volume / avgVolume);

    // Map [0, 3] → [0, 1] with diminishing returns above 1.5x
    if (ratio <= 1.5) {
      return ratio / 1.5 * 0.7; // 0 to 0.7
    }
    return 0.7 + (ratio - 1.5) / 1.5 * 0.3; // 0.7 to 1.0
  }

  /**
   * Correlation score: use CorrelationMonitor to assess regime.
   * Low average correlation = favorable for independent signals (score → 1).
   * High correlation / spike = unfavorable (score → 0).
   */
  private calculateCorrelationScore(): number {
    if (!this.correlationMonitor) return 0.5; // Neutral without monitor

    // Check for recent regime changes (spikes)
    const regimeChanges = this.correlationMonitor.detectRegimeChange(
      this.currentSymbol ? [this.currentSymbol] : undefined
    );

    if (regimeChanges.length > 0) {
      // Recent correlation spike — penalize
      const severityMap: Record<string, number> = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
      const maxSeverity = Math.max(...regimeChanges.map(r => severityMap[r.severity] ?? 0.5));
      return Math.max(0, 1 - maxSeverity);
    }

    // Use average correlation: lower = better
    const avgCorr = this.correlationMonitor.getAverageCorrelation();

    // Map [0, 1] → [1, 0]: low correlation = high score
    return Math.max(0, 1 - avgCorr);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPCTTEngine(config?: Partial<PCTTConfig>): PCTTEngine {
  return new PCTTEngine(config);
}
