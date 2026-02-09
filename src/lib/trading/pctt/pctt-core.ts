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
};

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

    const recentPivots = pivots.slice(-15); // Use last 15 pivots max
    let bestLine: BoundaryLine | null = null;
    let bestScore = -Infinity;

    // Enumerate pivot pairs
    for (let i = 0; i < recentPivots.length - 1; i++) {
      for (let j = i + 1; j < recentPivots.length; j++) {
        const p1 = recentPivots[i];
        const p2 = recentPivots[j];

        if (p1.index === p2.index) continue;

        // Calculate line parameters
        const slope = (p2.price - p1.price) / (p2.index - p1.index);
        const intercept = p1.price - slope * p1.index;

        // Reject extreme slopes
        const maxSlope = this.config.touchTolerance * atr;
        if (Math.abs(slope) > maxSlope) continue;

        // Score the line
        const { score, touches, violations, inlierCount } = this.scoreLine(
          slope, intercept, recentPivots, atr, type
        );

        // RANSAC consensus check: require minimum inliers
        if (inlierCount < this.config.minConsensus) continue;

        if (score > bestScore) {
          bestScore = score;
          bestLine = {
            slope,
            intercept,
            startIndex: p1.index,
            pivots: recentPivots,
            qScore: this.sigmoid(score),
            touches,
            violations,
            frozen: false,
          };
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
        // Keep current line, increment age
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
      // Line exists but not yet tradable - still return it for visualization
      // but with reduced Q-score to prevent trading
      bestLine.qScore = bestLine.qScore * 0.5;
    }

    return bestLine;
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

    // Check for rejection (entry signal) with rejection score
    if (this.breakDirection === 'up') {
      // Long setup: close above action line with wick below
      const rejectionScore = this.calculateRejectionScore(bar, actionPrice, atr, 'long');
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
          confidence: this.frozenActionLine.qScore,
          regime: this.structure?.regime || 'transition',
          timestamp: bar.time,
        };

        this.resetState();
        return signal;
      }
    } else {
      // Short setup: close below action line with wick above
      const rejectionScore = this.calculateRejectionScore(bar, actionPrice, atr, 'short');
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
          confidence: this.frozenActionLine.qScore,
          regime: this.structure?.regime || 'transition',
          timestamp: bar.time,
        };

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
}

// ============================================================================
// FACTORY
// ============================================================================

export function createPCTTEngine(config?: Partial<PCTTConfig>): PCTTEngine {
  return new PCTTEngine(config);
}
