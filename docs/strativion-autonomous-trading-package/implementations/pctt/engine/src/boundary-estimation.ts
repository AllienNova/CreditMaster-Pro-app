/**
 * @module boundary-estimation
 * Robust boundary estimation using Huber loss, RANSAC consensus, and pairwise enumeration.
 *
 * Generates candidate lines from pivot pairs, scores them with Touch_Reward + Span_Reward
 * - Violation_Penalty, normalizes via sigmoid to Q-Score, and grades setups.
 */

import type {
  PivotPoint,
  CandleData,
  BoundaryEstimate,
  TrendLine,
  BoundaryConfig,
  ScoringConfig,
} from './types.js';
import { SetupGrade, DEFAULT_BOUNDARY_CONFIG, DEFAULT_SCORING_CONFIG } from './types.js';

/**
 * Compute the Huber loss for a single residual.
 *
 * L_delta(r) = (1/2) * r^2           if |r| <= delta
 * L_delta(r) = delta * (|r| - delta/2) otherwise
 *
 * @param residual - The residual value r.
 * @param delta - Transition point between L2 and L1 behavior.
 * @returns The Huber loss value.
 */
export function huberLoss(residual: number, delta: number): number {
  const absR = Math.abs(residual);
  if (absR <= delta) {
    return 0.5 * residual * residual;
  }
  return delta * (absR - delta / 2);
}

/**
 * Evaluate a candidate line's price at a given bar.
 *
 * @param line - Line defined by slope and intercept at anchor bar 0.
 * @param bar - Bar index to evaluate at.
 * @param anchorBar - The bar at which intercept is defined.
 * @returns Price value of the line at the given bar.
 */
function lineValueAt(
  line: { slope: number; intercept: number },
  bar: number,
  anchorBar: number = 0,
): number {
  return line.intercept + line.slope * (bar - anchorBar);
}

/**
 * Score a candidate trendline against pivot data and candles.
 *
 * Score(l) = Touch_Reward + Span_Reward - Violation_Penalty
 *
 * Touch_Reward = SUM(w_k) for pivots within tolerance
 *   w_k = 1 - (distance_k / tau_k)
 *
 * Span_Reward = omega_s * ln(1 + span)
 *
 * Violation_Penalty = lambda * SUM(V_u) where V_u is ATR-normalized violation
 *   severity, capped at max_violation_cap ATR per bar.
 *
 * @param pivots - Pivot points to evaluate against.
 * @param line - Candidate line (slope, intercept at anchor_bar).
 * @param candles - Full candle data for violation checking.
 * @param atr - ATR values per candle index.
 * @param config - Scoring configuration parameters.
 * @param anchorBar - Bar index at which the line intercept is defined.
 * @param lineType - Whether this is a 'support' or 'resistance' line.
 * @returns Raw score value.
 */
export function scoreLine(
  pivots: PivotPoint[],
  line: { slope: number; intercept: number },
  candles: CandleData[],
  atr: number[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  anchorBar: number = 0,
  lineType: 'support' | 'resistance' = 'support',
): number {
  // Build bar-to-index map for candles
  const barToIdx = new Map<number, number>();
  for (let i = 0; i < candles.length; i++) {
    barToIdx.set(candles[i].bar, i);
  }

  // --- Touch Reward ---
  let touchReward = 0;
  let touchCount = 0;
  const relevantPivots = pivots.filter(
    (p) => (lineType === 'support' && p.type === 'low') ||
           (lineType === 'resistance' && p.type === 'high'),
  );

  for (const pivot of relevantPivots) {
    const idx = barToIdx.get(pivot.bar);
    if (idx === undefined) continue;
    const currentATR = atr[idx] || 1;
    const tau = config.touch_tolerance_atr * currentATR;
    const linePrice = lineValueAt(line, pivot.bar, anchorBar);

    let distance: number;
    if (lineType === 'support') {
      // One-sided: pivot low should be at or just above the support line
      distance = pivot.price - linePrice;
      if (distance < 0 || distance > tau) continue;
    } else {
      // One-sided: pivot high should be at or just below the resistance line
      distance = linePrice - pivot.price;
      if (distance < 0 || distance > tau) continue;
    }

    const weight = 1 - distance / tau;
    touchReward += weight;
    touchCount++;
  }

  // --- Span Reward ---
  const firstBar = relevantPivots.length > 0 ? relevantPivots[0].bar : 0;
  const lastBar = relevantPivots.length > 0 ? relevantPivots[relevantPivots.length - 1].bar : 0;
  const span = lastBar - firstBar;
  const spanReward = config.span_reward_weight * Math.log(1 + span);

  // --- Violation Penalty ---
  let violationPenalty = 0;
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentATR = atr[i] || 1;
    const linePrice = lineValueAt(line, candle.bar, anchorBar);

    let violation = 0;
    if (lineType === 'support') {
      // Violation: bar low penetrates below support beyond tolerance
      const penetration = linePrice - candle.low;
      const tolerance = config.touch_tolerance_atr * currentATR;
      if (penetration > tolerance) {
        violation = penetration / currentATR;
      }
    } else {
      // Violation: bar high penetrates above resistance beyond tolerance
      const penetration = candle.high - linePrice;
      const tolerance = config.touch_tolerance_atr * currentATR;
      if (penetration > tolerance) {
        violation = penetration / currentATR;
      }
    }

    // Cap violation at max_violation_cap ATR
    violation = Math.min(violation, config.max_violation_cap);
    violationPenalty += violation;
  }

  return touchReward + spanReward - config.violation_penalty_weight * violationPenalty;
}

/**
 * Map a raw score to a Q-Score in [0, 1] using sigmoid normalization.
 *
 * Q = 1 / (1 + e^{-Score/3})
 *
 * @param rawScore - The raw score from the scoring function.
 * @returns Normalized Q-Score in [0, 1].
 */
export function calculateQScore(rawScore: number): number {
  return 1 / (1 + Math.exp(-rawScore / 3));
}

/**
 * Grade a setup based on Q-Score and touch count.
 *
 * A: Q >= 0.70 AND touches >= 3 -> 1.0% equity risk
 * B: Q >= 0.55 AND touches >= 2 -> 0.5% equity risk
 * SKIP: otherwise -> no trade
 *
 * @param qScore - Normalized quality score in [0, 1].
 * @param touches - Number of confirmed pivot touches.
 * @returns Setup grade (A, B, or SKIP).
 */
export function gradeSetup(qScore: number, touches: number): SetupGrade {
  if (qScore >= 0.70 && touches >= 3) return SetupGrade.A;
  if (qScore >= 0.55 && touches >= 2) return SetupGrade.B;
  return SetupGrade.SKIP;
}

/**
 * Generate a line from two pivot points.
 *
 * l(t) = p_a + m * (t - t_a), where m = (p_b - p_a) / (t_b - t_a)
 *
 * @param pivotA - First (earlier) pivot point.
 * @param pivotB - Second (later) pivot point.
 * @returns Line definition with slope, intercept at pivotA's bar.
 */
function lineFromPivots(
  pivotA: PivotPoint,
  pivotB: PivotPoint,
): { slope: number; intercept: number; anchorBar: number } {
  const slope = (pivotB.price - pivotA.price) / (pivotB.bar - pivotA.bar);
  return { slope, intercept: pivotA.price, anchorBar: pivotA.bar };
}

/**
 * Count how many pivots are touched by a candidate line within tolerance.
 *
 * @param pivots - Relevant pivots (same type as line).
 * @param line - Candidate line.
 * @param anchorBar - Bar index where intercept is defined.
 * @param atr - ATR values per candle index.
 * @param barToIdx - Map from bar index to candle array index.
 * @param toleranceATR - Touch tolerance in ATR multiples.
 * @param lineType - 'support' or 'resistance'.
 * @returns Number of pivot touches.
 */
function countTouches(
  pivots: PivotPoint[],
  line: { slope: number; intercept: number },
  anchorBar: number,
  atr: number[],
  barToIdx: Map<number, number>,
  toleranceATR: number,
  lineType: 'support' | 'resistance',
): number {
  let count = 0;
  for (const pivot of pivots) {
    const idx = barToIdx.get(pivot.bar);
    if (idx === undefined) continue;
    const currentATR = atr[idx] || 1;
    const tau = toleranceATR * currentATR;
    const linePrice = lineValueAt(line, pivot.bar, anchorBar);

    if (lineType === 'support') {
      const dist = pivot.price - linePrice;
      if (dist >= 0 && dist <= tau) count++;
    } else {
      const dist = linePrice - pivot.price;
      if (dist >= 0 && dist <= tau) count++;
    }
  }
  return count;
}

/**
 * Count violations of a candidate line across all candles.
 */
function countViolations(
  candles: CandleData[],
  line: { slope: number; intercept: number },
  anchorBar: number,
  atr: number[],
  toleranceATR: number,
  maxViolationATR: number,
  lineType: 'support' | 'resistance',
): number {
  let violations = 0;
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentATR = atr[i] || 1;
    const linePrice = lineValueAt(line, candle.bar, anchorBar);
    const tolerance = toleranceATR * currentATR;

    if (lineType === 'support') {
      const penetration = linePrice - candle.low;
      if (penetration > tolerance && penetration / currentATR > maxViolationATR) {
        violations++;
      }
    } else {
      const penetration = candle.high - linePrice;
      if (penetration > tolerance && penetration / currentATR > maxViolationATR) {
        violations++;
      }
    }
  }
  return violations;
}

/**
 * Find the best line for a given type (support or resistance) using pairwise enumeration.
 */
function findBestLine(
  pivots: PivotPoint[],
  candles: CandleData[],
  atr: number[],
  config: BoundaryConfig,
  scoringConfig: ScoringConfig,
  lineType: 'support' | 'resistance',
): TrendLine | null {
  const relevantPivots = pivots.filter(
    (p) => (lineType === 'support' && p.type === 'low') ||
           (lineType === 'resistance' && p.type === 'high'),
  );

  if (relevantPivots.length < 2) return null;

  const barToIdx = new Map<number, number>();
  for (let i = 0; i < candles.length; i++) {
    barToIdx.set(candles[i].bar, i);
  }

  let bestLine: TrendLine | null = null;
  let bestScore = -Infinity;

  // Enumerate all pivot pairs
  for (let a = 0; a < relevantPivots.length - 1; a++) {
    for (let b = a + 1; b < relevantPivots.length; b++) {
      const pA = relevantPivots[a];
      const pB = relevantPivots[b];

      // Check minimum span
      const span = pB.bar - pA.bar;
      if (span < config.min_span_bars) continue;

      const candidate = lineFromPivots(pA, pB);

      // Check slope constraint: |m| <= max_slope_per_bar * ATR per bar
      const idxA = barToIdx.get(pA.bar);
      if (idxA !== undefined) {
        const currentATR = atr[idxA] || 1;
        if (Math.abs(candidate.slope) > config.max_slope_per_bar * currentATR) continue;
      }

      // Count touches
      const touches = countTouches(
        relevantPivots,
        candidate,
        candidate.anchorBar,
        atr,
        barToIdx,
        config.touch_tolerance_atr,
        lineType,
      );

      if (touches < config.min_touches) continue;

      // Check violation count
      const violations = countViolations(
        candles,
        candidate,
        candidate.anchorBar,
        atr,
        config.touch_tolerance_atr,
        config.max_violation_atr,
        lineType,
      );

      if (violations > config.max_violations) continue;

      // Score the line
      const rawScore = scoreLine(
        pivots,
        candidate,
        candles,
        atr,
        scoringConfig,
        candidate.anchorBar,
        lineType,
      );

      if (rawScore > bestScore) {
        bestScore = rawScore;
        const qScore = calculateQScore(rawScore);
        bestLine = {
          slope: candidate.slope,
          intercept: candidate.intercept,
          anchor_bar: candidate.anchorBar,
          touches,
          span,
          q_score: qScore,
          grade: gradeSetup(qScore, touches),
        };
      }
    }
  }

  return bestLine;
}

/**
 * Perform RANSAC consensus validation on pivot points to find a robust line.
 *
 * 1. Randomly select subset of pivots (min_samples).
 * 2. Fit candidate line to subset.
 * 3. Count inlier pivots within residual_threshold * ATR.
 * 4. Repeat for max_trials iterations.
 * 5. Select line with largest inlier set; refit on all inliers.
 *
 * @param pivots - Relevant pivots for this line type.
 * @param atr - ATR values per candle index.
 * @param barToIdx - Map from bar to candle index.
 * @param config - Boundary configuration.
 * @param lineType - 'support' or 'resistance'.
 * @returns Best line found by RANSAC, or null.
 */
function ransacFit(
  pivots: PivotPoint[],
  atr: number[],
  barToIdx: Map<number, number>,
  config: BoundaryConfig,
  lineType: 'support' | 'resistance',
): { slope: number; intercept: number; anchorBar: number; inliers: number } | null {
  if (pivots.length < config.ransac_min_samples) return null;

  let bestInlierCount = 0;
  let bestLine: { slope: number; intercept: number; anchorBar: number } | null = null;
  let bestInlierIndices: number[] = [];

  for (let trial = 0; trial < config.ransac_max_trials; trial++) {
    // Random subset
    const indices = randomSubset(pivots.length, config.ransac_min_samples);
    if (indices.length < 2) continue;

    const pA = pivots[indices[0]];
    const pB = pivots[indices[indices.length - 1]];
    if (pB.bar === pA.bar) continue;

    const candidate = lineFromPivots(pA, pB);

    // Count inliers
    const inlierIndices: number[] = [];
    for (let i = 0; i < pivots.length; i++) {
      const pivot = pivots[i];
      const idx = barToIdx.get(pivot.bar);
      if (idx === undefined) continue;
      const currentATR = atr[idx] || 1;
      const threshold = config.ransac_residual_threshold_atr * currentATR;
      const linePrice = lineValueAt(candidate, pivot.bar, candidate.anchorBar);
      const residual = Math.abs(pivot.price - linePrice);
      if (residual <= threshold) {
        inlierIndices.push(i);
      }
    }

    if (inlierIndices.length > bestInlierCount) {
      bestInlierCount = inlierIndices.length;
      bestLine = candidate;
      bestInlierIndices = inlierIndices;
    }
  }

  if (!bestLine || bestInlierCount < config.ransac_min_samples) return null;

  // Refit on all inliers using least squares
  const inlierPivots = bestInlierIndices.map((i) => pivots[i]);
  if (inlierPivots.length >= 2) {
    const refit = leastSquaresFit(inlierPivots);
    if (refit) {
      return { ...refit, inliers: bestInlierCount };
    }
  }

  return { ...bestLine, inliers: bestInlierCount };
}

/**
 * Simple least squares line fit to pivot points.
 */
function leastSquaresFit(
  pivots: PivotPoint[],
): { slope: number; intercept: number; anchorBar: number } | null {
  const n = pivots.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of pivots) {
    sumX += p.bar;
    sumY += p.price;
    sumXY += p.bar * p.price;
    sumX2 += p.bar * p.bar;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const meanBar = sumX / n;
  const meanPrice = sumY / n;
  const intercept = meanPrice - slope * meanBar;

  // Express intercept at the first pivot's bar
  const anchorBar = pivots[0].bar;
  const interceptAtAnchor = intercept + slope * anchorBar;

  // Wait, intercept in y = slope * x + intercept form.
  // We want: value at anchorBar = intercept + slope * anchorBar
  // Our line: l(t) = interceptAtAnchor + slope * (t - anchorBar)
  return { slope, intercept: intercept + slope * anchorBar, anchorBar };
}

/**
 * Generate a random subset of indices.
 */
function randomSubset(n: number, k: number): number[] {
  const indices: number[] = [];
  const pool = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < Math.min(k, n); i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    indices.push(pool[i]);
  }
  return indices.sort((a, b) => a - b);
}

/**
 * Estimate upper (resistance) and lower (support) boundaries from pivot data.
 *
 * Attempts three methods in order:
 * 1. Huber + pairwise enumeration (primary)
 * 2. RANSAC consensus validation
 * 3. Pure pairwise enumeration (fallback)
 *
 * Returns the best-scoring boundary pair.
 *
 * @param pivots - All detected pivots within the lookback window.
 * @param candles - OHLCV candle data.
 * @param atr - ATR values per candle.
 * @param config - Boundary estimation configuration.
 * @returns Upper and lower boundary estimates with Q-Score.
 */
export function estimateBoundaries(
  pivots: PivotPoint[],
  candles: CandleData[],
  atr: number[],
  config: BoundaryConfig = DEFAULT_BOUNDARY_CONFIG,
): BoundaryEstimate {
  const scoringConfig: ScoringConfig = {
    touch_tolerance_atr: config.touch_tolerance_atr,
    violation_penalty_weight: config.violation_penalty_weight,
    span_reward_weight: config.span_reward_weight,
    max_violation_cap: 3.0,
  };

  const barToIdx = new Map<number, number>();
  for (let i = 0; i < candles.length; i++) {
    barToIdx.set(candles[i].bar, i);
  }

  // Separate high and low pivots
  const highPivots = pivots.filter((p) => p.type === 'high');
  const lowPivots = pivots.filter((p) => p.type === 'low');

  // --- Method 1: Pairwise enumeration with scoring ---
  const supportLine = findBestLine(pivots, candles, atr, config, scoringConfig, 'support');
  const resistanceLine = findBestLine(pivots, candles, atr, config, scoringConfig, 'resistance');

  // --- Method 2: RANSAC ---
  const ransacSupport = ransacFit(lowPivots, atr, barToIdx, config, 'support');
  const ransacResistance = ransacFit(highPivots, atr, barToIdx, config, 'resistance');

  // Choose the best support line
  let bestSupport: { slope: number; intercept: number; anchorBar: number } | null = null;
  let bestSupportScore = -Infinity;
  let method = 'pairwise';

  if (supportLine) {
    const score = scoreLine(pivots, supportLine, candles, atr, scoringConfig, supportLine.anchor_bar, 'support');
    if (score > bestSupportScore) {
      bestSupportScore = score;
      bestSupport = { slope: supportLine.slope, intercept: supportLine.intercept, anchorBar: supportLine.anchor_bar };
      method = 'pairwise';
    }
  }

  if (ransacSupport) {
    const score = scoreLine(
      pivots,
      { slope: ransacSupport.slope, intercept: ransacSupport.intercept },
      candles, atr, scoringConfig, ransacSupport.anchorBar, 'support',
    );
    // Add RANSAC consensus bonus
    const totalPivots = lowPivots.length || 1;
    const bonus = 0.5 * (ransacSupport.inliers / totalPivots);
    if (score + bonus > bestSupportScore) {
      bestSupportScore = score + bonus;
      bestSupport = ransacSupport;
      method = 'ransac';
    }
  }

  // Choose the best resistance line
  let bestResistance: { slope: number; intercept: number; anchorBar: number } | null = null;
  let bestResistanceScore = -Infinity;

  if (resistanceLine) {
    const score = scoreLine(pivots, resistanceLine, candles, atr, scoringConfig, resistanceLine.anchor_bar, 'resistance');
    if (score > bestResistanceScore) {
      bestResistanceScore = score;
      bestResistance = { slope: resistanceLine.slope, intercept: resistanceLine.intercept, anchorBar: resistanceLine.anchor_bar };
    }
  }

  if (ransacResistance) {
    const score = scoreLine(
      pivots,
      { slope: ransacResistance.slope, intercept: ransacResistance.intercept },
      candles, atr, scoringConfig, ransacResistance.anchorBar, 'resistance',
    );
    const totalPivots = highPivots.length || 1;
    const bonus = 0.5 * (ransacResistance.inliers / totalPivots);
    if (score + bonus > bestResistanceScore) {
      bestResistanceScore = score + bonus;
      bestResistance = ransacResistance;
      if (method !== 'ransac') method = 'ransac';
    }
  }

  // Fallback: if no valid boundaries, return zero lines
  const lowerSlope = bestSupport?.slope ?? 0;
  const lowerIntercept = bestSupport?.intercept ?? (candles.length > 0 ? candles[candles.length - 1].low : 0);
  const upperSlope = bestResistance?.slope ?? 0;
  const upperIntercept = bestResistance?.intercept ?? (candles.length > 0 ? candles[candles.length - 1].high : 0);

  // Compute combined Q-Score as the average of both boundaries
  const combinedRawScore = (bestSupportScore + bestResistanceScore) / 2;
  const qScore = calculateQScore(
    Number.isFinite(combinedRawScore) ? combinedRawScore : 0,
  );

  return {
    upper: { slope: upperSlope, intercept: upperIntercept },
    lower: { slope: lowerSlope, intercept: lowerIntercept },
    q_score: qScore,
    method,
  };
}
