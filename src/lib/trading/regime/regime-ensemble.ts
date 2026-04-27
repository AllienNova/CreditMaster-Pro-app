/**
 * Weighted Regime Ensemble
 *
 * Classifies market regime using 7 independent methods with accuracy-weighted
 * voting. Extends the existing KER-based regime detection with:
 *   1. KER (Kaufman Efficiency Ratio) — existing
 *   2. ADX trend strength
 *   3. Bollinger Band width (volatility)
 *   4. ATR ratio (current vs historical)
 *   5. Volume trend
 *   6. Price-MA distance
 *   7. Return distribution kurtosis
 *
 * Final regime = weighted majority vote across all methods.
 */

import type { MarketRegime } from "@/lib/trading/config";
import { calculateEfficiencyRatio } from "./efficiency-ratio";

// ============================================================================
// TYPES
// ============================================================================

export interface MethodVote {
  method: string;
  regime: MarketRegime;
  confidence: number;
  weight: number;
}

export interface EnsembleResult {
  regime: MarketRegime;
  confidence: number;
  votes: MethodVote[];
  consensusStrength: number;
}

export interface EnsembleConfig {
  /** KER lookback (default: 20) */
  kerPeriod: number;
  /** ADX lookback (default: 14) */
  adxPeriod: number;
  /** Bollinger Band lookback (default: 20) */
  bbPeriod: number;
  /** ATR lookback (default: 14) */
  atrPeriod: number;
  /** ATR historical lookback (default: 50) */
  atrHistoryPeriod: number;
  /** Volume lookback (default: 20) */
  volumePeriod: number;
  /** Moving average lookback for price-MA distance (default: 50) */
  maPeriod: number;
  /** Kurtosis lookback (default: 30) */
  kurtosisPeriod: number;
  /** Accuracy-based weights for each method (default: equal at 1.0) */
  weights: {
    ker: number;
    adx: number;
    bbWidth: number;
    atrRatio: number;
    volumeTrend: number;
    priceMA: number;
    kurtosis: number;
  };
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  kerPeriod: 20,
  adxPeriod: 14,
  bbPeriod: 20,
  atrPeriod: 14,
  atrHistoryPeriod: 50,
  volumePeriod: 20,
  maPeriod: 50,
  kurtosisPeriod: 30,
  weights: {
    ker: 1.5,
    adx: 1.3,
    bbWidth: 1.0,
    atrRatio: 1.2,
    volumeTrend: 0.8,
    priceMA: 1.0,
    kurtosis: 0.7,
  },
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Classify market regime using a weighted ensemble of 7 methods.
 *
 * @param prices - Closing prices (oldest first)
 * @param volumes - Volume data (oldest first, optional)
 * @param config - Override ensemble configuration
 * @returns EnsembleResult with regime, confidence, votes, and consensus
 */
export function classifyRegimeEnsemble(
  prices: number[],
  volumes?: number[],
  config?: Partial<EnsembleConfig>,
): EnsembleResult {
  const cfg: EnsembleConfig = {
    ...DEFAULT_ENSEMBLE_CONFIG,
    ...config,
    weights: { ...DEFAULT_ENSEMBLE_CONFIG.weights, ...config?.weights },
  };

  const minBars = Math.max(
    cfg.kerPeriod + 1,
    cfg.adxPeriod * 2 + 1,
    cfg.bbPeriod + 1,
    cfg.atrHistoryPeriod + cfg.atrPeriod + 1,
    cfg.maPeriod + 1,
    cfg.kurtosisPeriod + 1,
  );

  if (prices.length < minBars) {
    return {
      regime: "transition",
      confidence: 0,
      votes: [],
      consensusStrength: 0,
    };
  }

  const votes: MethodVote[] = [];

  // Method 1: KER
  votes.push(kerVote(prices, cfg));

  // Method 2: ADX
  votes.push(adxVote(prices, cfg));

  // Method 3: Bollinger Band width
  votes.push(bbWidthVote(prices, cfg));

  // Method 4: ATR ratio
  votes.push(atrRatioVote(prices, cfg));

  // Method 5: Volume trend
  votes.push(volumeTrendVote(prices, volumes, cfg));

  // Method 6: Price-MA distance
  votes.push(priceMAVote(prices, cfg));

  // Method 7: Return distribution kurtosis
  votes.push(kurtosisVote(prices, cfg));

  // Weighted majority vote
  const regimes: MarketRegime[] = ["trending", "ranging", "transition", "shock", "crisis"];
  const regimeWeights = new Map<MarketRegime, number>();

  for (const r of regimes) {
    regimeWeights.set(r, 0);
  }

  let totalWeight = 0;
  for (const vote of votes) {
    const current = regimeWeights.get(vote.regime) ?? 0;
    regimeWeights.set(vote.regime, current + vote.weight * vote.confidence);
    totalWeight += vote.weight * vote.confidence;
  }

  // Find winner
  let winnerRegime: MarketRegime = "transition";
  let winnerWeight = -1;
  for (const [regime, weight] of regimeWeights) {
    if (weight > winnerWeight) {
      winnerWeight = weight;
      winnerRegime = regime;
    }
  }

  // Consensus strength: fraction of total weight that agrees with the winner
  const consensusStrength = totalWeight > 0 ? winnerWeight / totalWeight : 0;

  // Overall confidence: consensus strength scaled by average confidence
  const avgConfidence = votes.length > 0
    ? votes.reduce((s, v) => s + v.confidence, 0) / votes.length
    : 0;
  const confidence = Math.min(1, consensusStrength * avgConfidence * 1.5);

  return {
    regime: winnerRegime,
    confidence,
    votes,
    consensusStrength,
  };
}

// ============================================================================
// METHOD IMPLEMENTATIONS
// ============================================================================

function kerVote(prices: number[], cfg: EnsembleConfig): MethodVote {
  const er = calculateEfficiencyRatio(prices, cfg.kerPeriod);
  let regime: MarketRegime;
  let confidence: number;

  if (er > 0.5) {
    regime = "trending";
    confidence = Math.min(1, (er - 0.5) / 0.5 + 0.5);
  } else if (er < 0.3) {
    regime = "ranging";
    confidence = Math.min(1, (0.3 - er) / 0.3 + 0.5);
  } else {
    regime = "transition";
    confidence = 0.5;
  }

  return { method: "ker", regime, confidence, weight: cfg.weights.ker };
}

function adxVote(prices: number[], cfg: EnsembleConfig): MethodVote {
  const adx = computeADX(prices, cfg.adxPeriod);
  let regime: MarketRegime;
  let confidence: number;

  if (adx > 25) {
    regime = "trending";
    confidence = Math.min(1, adx / 50);
  } else if (adx < 15) {
    regime = "ranging";
    confidence = Math.min(1, (15 - adx) / 15 + 0.5);
  } else {
    regime = "transition";
    confidence = 0.5;
  }

  return { method: "adx", regime, confidence, weight: cfg.weights.adx };
}

function bbWidthVote(prices: number[], cfg: EnsembleConfig): MethodVote {
  const width = computeBBWidth(prices, cfg.bbPeriod);
  const avgPrice = mean(prices.slice(-cfg.bbPeriod));
  const normalizedWidth = avgPrice > 0 ? width / avgPrice : 0;

  let regime: MarketRegime;
  let confidence: number;

  if (normalizedWidth > 0.06) {
    regime = "shock";
    confidence = Math.min(1, normalizedWidth / 0.1);
  } else if (normalizedWidth > 0.04) {
    regime = "trending";
    confidence = 0.6;
  } else if (normalizedWidth < 0.015) {
    regime = "ranging";
    confidence = 0.7;
  } else {
    regime = "transition";
    confidence = 0.5;
  }

  return { method: "bbWidth", regime, confidence, weight: cfg.weights.bbWidth };
}

function atrRatioVote(prices: number[], cfg: EnsembleConfig): MethodVote {
  const currentATR = computeSimpleATR(prices, cfg.atrPeriod);
  const historicalATR = computeSimpleATR(
    prices.slice(0, -cfg.atrPeriod),
    cfg.atrHistoryPeriod,
  );

  const ratio = historicalATR > 0 ? currentATR / historicalATR : 1;

  let regime: MarketRegime;
  let confidence: number;

  if (ratio > 3) {
    regime = "crisis";
    confidence = Math.min(1, ratio / 5);
  } else if (ratio > 2) {
    regime = "shock";
    confidence = Math.min(1, (ratio - 2) / 1 + 0.5);
  } else if (ratio < 0.7) {
    regime = "ranging";
    confidence = 0.6;
  } else {
    regime = "transition";
    confidence = 0.4;
  }

  return { method: "atrRatio", regime, confidence, weight: cfg.weights.atrRatio };
}

function volumeTrendVote(
  prices: number[],
  volumes: number[] | undefined,
  cfg: EnsembleConfig,
): MethodVote {
  if (!volumes || volumes.length < cfg.volumePeriod + 1) {
    return { method: "volumeTrend", regime: "transition", confidence: 0.3, weight: cfg.weights.volumeTrend };
  }

  const recentVol = volumes.slice(-cfg.volumePeriod);
  const avgVol = mean(recentVol);
  const prevVol = volumes.slice(-cfg.volumePeriod * 2, -cfg.volumePeriod);
  const prevAvgVol = prevVol.length > 0 ? mean(prevVol) : avgVol;

  const volRatio = prevAvgVol > 0 ? avgVol / prevAvgVol : 1;

  // Also check if volume is expanding with price direction
  const priceDir = prices[prices.length - 1] - prices[prices.length - cfg.volumePeriod];

  let regime: MarketRegime;
  let confidence: number;

  if (volRatio > 2.5) {
    regime = "crisis";
    confidence = 0.7;
  } else if (volRatio > 1.5 && Math.abs(priceDir) > 0) {
    regime = "trending";
    confidence = 0.6;
  } else if (volRatio < 0.7) {
    regime = "ranging";
    confidence = 0.6;
  } else {
    regime = "transition";
    confidence = 0.4;
  }

  return { method: "volumeTrend", regime, confidence, weight: cfg.weights.volumeTrend };
}

function priceMAVote(prices: number[], cfg: EnsembleConfig): MethodVote {
  const ma = mean(prices.slice(-cfg.maPeriod));
  const currentPrice = prices[prices.length - 1];
  const distance = ma > 0 ? (currentPrice - ma) / ma : 0;

  let regime: MarketRegime;
  let confidence: number;

  if (Math.abs(distance) > 0.05) {
    regime = "trending";
    confidence = Math.min(1, Math.abs(distance) / 0.1 * 0.7 + 0.3);
  } else if (Math.abs(distance) < 0.01) {
    regime = "ranging";
    confidence = 0.6;
  } else {
    regime = "transition";
    confidence = 0.5;
  }

  return { method: "priceMA", regime, confidence, weight: cfg.weights.priceMA };
}

function kurtosisVote(prices: number[], cfg: EnsembleConfig): MethodVote {
  const returns = computeReturns(prices.slice(-cfg.kurtosisPeriod - 1));
  const kurt = computeKurtosis(returns);

  let regime: MarketRegime;
  let confidence: number;

  // Excess kurtosis: normal = 0, fat tails > 0
  if (kurt > 6) {
    regime = "crisis";
    confidence = Math.min(1, kurt / 10);
  } else if (kurt > 3) {
    regime = "shock";
    confidence = 0.6;
  } else if (kurt < 0) {
    regime = "ranging";
    confidence = 0.5;
  } else {
    regime = "transition";
    confidence = 0.4;
  }

  return { method: "kurtosis", regime, confidence, weight: cfg.weights.kurtosis };
}

// ============================================================================
// MATH HELPERS
// ============================================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance = arr.reduce((a, b) => a + (b - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function computeReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(prices[i - 1] !== 0 ? (prices[i] - prices[i - 1]) / prices[i - 1] : 0);
  }
  return returns;
}

/**
 * Compute excess kurtosis of a series.
 * Normal distribution = 0, fat tails > 0.
 */
function computeKurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  const avg = mean(values);
  const n = values.length;
  let m2 = 0;
  let m4 = 0;
  for (const v of values) {
    const diff = v - avg;
    m2 += diff ** 2;
    m4 += diff ** 4;
  }
  m2 /= n;
  m4 /= n;
  if (m2 < 1e-12) return 0;
  return m4 / (m2 * m2) - 3;
}

/**
 * Simplified ATR using only close prices (True Range approximated as
 * |close[i] - close[i-1]|). Sufficient for regime classification.
 */
function computeSimpleATR(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;
  let sum = 0;
  const start = prices.length - period;
  for (let i = start; i < prices.length; i++) {
    sum += Math.abs(prices[i] - prices[i - 1]);
  }
  return sum / period;
}

/**
 * Compute Bollinger Band width = 2 * stddev(close, period).
 */
function computeBBWidth(prices: number[], period: number): number {
  const recent = prices.slice(-period);
  return 2 * stddev(recent);
}

/**
 * Simplified ADX computation from close prices.
 *
 * Uses directional movement approximated from consecutive closes,
 * smoothed over `period` bars with Wilder's method.
 */
function computeADX(prices: number[], period: number): number {
  if (prices.length < period * 2 + 1) return 15; // neutral default

  const n = prices.length;
  const dxValues: number[] = [];

  // Compute +DM and -DM from close diffs (simplified)
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  let smoothTR = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    const tr = Math.abs(diff);
    smoothTR += tr;
    if (diff > 0) {
      smoothPlusDM += diff;
    } else {
      smoothMinusDM += Math.abs(diff);
    }
  }

  for (let i = period + 1; i < n; i++) {
    const diff = prices[i] - prices[i - 1];
    const tr = Math.abs(diff);

    smoothTR = smoothTR - smoothTR / period + tr;
    const plusDM = diff > 0 ? diff : 0;
    const minusDM = diff < 0 ? Math.abs(diff) : 0;

    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;

    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxValues.push(dx);
  }

  if (dxValues.length === 0) return 15;

  // ADX = smoothed average of DX over last `period` values
  const recentDX = dxValues.slice(-period);
  return mean(recentDX);
}
