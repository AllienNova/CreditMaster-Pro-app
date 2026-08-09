/**
 * 5-Regime Market Classifier
 *
 * Classifies the current market into one of five regimes using:
 *   - Kaufman Efficiency Ratio (trend quality)
 *   - ATR-based volatility relative to its own rolling average
 *   - Volume spikes vs rolling average
 *
 * Classification rules (all thresholds from canonical policy via getPolicy()):
 *   TRENDING    — ER > erTrendThreshold  AND  ATR ≤ 2× avgATR
 *   RANGING     — ER < erRangeThreshold  AND  ATR ≤ 2× avgATR
 *   TRANSITION  — erRangeThreshold ≤ ER ≤ erTrendThreshold
 *   SHOCK       — ATR > 3× avgATR  AND  ER > erCrisisErFloor
 *   CRISIS      — ATR > 5× avgATR  OR  gap > gapSigmaThreshold  OR  volume > 5× avgVolume
 *
 * Confidence reflects how far the triggering metric is from the nearest boundary.
 */

import { getPolicy } from "@/lib/trading/config";
import type { MarketRegime } from "@/lib/trading/config";
import { calculateEfficiencyRatio } from "./efficiency-ratio";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface RegimeConfig {
  /** KER lookback period (bars). Default: 20 */
  erPeriod: number;
  /** ATR lookback period (bars). Default: 14 */
  atrPeriod: number;
  /** ATR average lookback for normalisation (bars). Default: 50 */
  atrAvgPeriod: number;
  /** Volume average lookback for spike detection (bars). Default: 20 */
  volumeAvgPeriod: number;
  /** ER above this → TRENDING (when volatility is normal). Default: 0.5 */
  erTrendThreshold: number;
  /** ER below this → RANGING (when volatility is normal). Default: 0.3 */
  erRangeThreshold: number;
  /** ATR multiple above which SHOCK triggers. Default: 3 */
  shockAtrMultiple: number;
  /** ATR multiple above which CRISIS triggers. Default: 5 */
  crisisAtrMultiple: number;
  /** Min ER required to call SHOCK instead of staying in CRISIS. Default: 0.4 */
  crisisErFloor: number;
  /** Volume multiple above which CRISIS triggers. Default: 5 */
  crisisVolumeMultiple: number;
  /** Gap size in sigma units above which CRISIS triggers.
   *  Sourced from policy.dataQuality.gap.sigma_threshold. Default: 5 */
  crisisGapSigmaThreshold: number;
}

export interface RegimeClassification {
  regime: MarketRegime;
  /** 0–1: how far from the nearest boundary that triggered this regime */
  confidence: number;
  efficiencyRatio: number;
  volatility: number; // current ATR value
  trendStrength: number; // normalised ATR ratio (atr / avgAtr)
  details: string;
}

// ============================================================================
// DEFAULTS (always overridden by canonical policy values at call time)
// ============================================================================

function buildDefaultConfig(): RegimeConfig {
  const policy = getPolicy();
  return {
    erPeriod: 20,
    atrPeriod: 14,
    atrAvgPeriod: 50,
    volumeAvgPeriod: 20,
    erTrendThreshold: 0.5,
    erRangeThreshold: 0.3,
    shockAtrMultiple: 3,
    crisisAtrMultiple: 5,
    crisisErFloor: 0.4,
    crisisVolumeMultiple: 5,
    crisisGapSigmaThreshold: policy.dataQuality.gap.sigma_threshold,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simple average true range over the last `period` bars.
 * Requires at least period + 1 data points.
 */
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): number {
  const end = closes.length - 1;
  if (end < period) return 0;

  let sum = 0;
  for (let i = end - period + 1; i <= end; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    sum += tr;
  }
  return sum / period;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const variance =
    arr.reduce((acc, v) => acc + (v - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Clamp confidence to [0, 1].
 */
function clampConfidence(v: number): number {
  return Math.min(1, Math.max(0, v));
}

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

/**
 * Classify current market regime from OHLCV arrays (oldest first).
 *
 * All arrays must be the same length. A minimum of
 * max(erPeriod, atrAvgPeriod, volumeAvgPeriod) + 2 bars is required.
 * If insufficient data, returns TRANSITION with low confidence.
 */
export function classifyRegime(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  config?: Partial<RegimeConfig>,
): RegimeClassification {
  const cfg: RegimeConfig = { ...buildDefaultConfig(), ...config };

  const minBars = Math.max(cfg.erPeriod, cfg.atrAvgPeriod, cfg.volumeAvgPeriod) + 2;

  if (closes.length < minBars) {
    return {
      regime: "transition",
      confidence: 0,
      efficiencyRatio: 0.5,
      volatility: 0,
      trendStrength: 1,
      details: `Insufficient data: need ${minBars} bars, got ${closes.length}`,
    };
  }

  const er = calculateEfficiencyRatio(closes, cfg.erPeriod);

  // Current ATR
  const currentATR = calculateATR(highs, lows, closes, cfg.atrPeriod);

  // Long-run ATR average for normalisation
  const end = closes.length - 1;
  const atrSamples: number[] = [];
  const sampleStart = Math.max(cfg.atrPeriod, end - cfg.atrAvgPeriod);
  for (let i = sampleStart; i <= end; i++) {
    const slice = {
      h: highs.slice(0, i + 1),
      l: lows.slice(0, i + 1),
      c: closes.slice(0, i + 1),
    };
    const sample = calculateATR(slice.h, slice.l, slice.c, cfg.atrPeriod);
    if (sample > 0) atrSamples.push(sample);
  }
  const avgATR = atrSamples.length > 0 ? mean(atrSamples) : currentATR || 1;
  const atrRatio = avgATR > 0 ? currentATR / avgATR : 1;

  // Volume spike check
  const recentVolumes = volumes.slice(-cfg.volumeAvgPeriod - 1, -1);
  const avgVolume = mean(recentVolumes) || 1;
  const currentVolume = volumes[end] ?? 0;
  const volumeRatio = currentVolume / avgVolume;

  // Gap detection: |close - prevClose| in standard deviations
  const closeDiffs: number[] = [];
  for (let i = 1; i <= end; i++) {
    closeDiffs.push(closes[i] - closes[i - 1]);
  }
  const recentDiffs = closeDiffs.slice(-cfg.atrAvgPeriod);
  const diffStd = stddev(recentDiffs) || 1;
  const lastGapSigma =
    recentDiffs.length > 0
      ? Math.abs(recentDiffs[recentDiffs.length - 1]) / diffStd
      : 0;

  // ── Classification (CRISIS > SHOCK > TRANSITION > TRENDING/RANGING) ──

  // CRISIS: extreme volatility OR extreme gap OR extreme volume
  if (
    atrRatio > cfg.crisisAtrMultiple ||
    lastGapSigma > cfg.crisisGapSigmaThreshold ||
    volumeRatio > cfg.crisisVolumeMultiple
  ) {
    const worstRatio = Math.max(
      atrRatio / cfg.crisisAtrMultiple,
      lastGapSigma / cfg.crisisGapSigmaThreshold,
      volumeRatio / cfg.crisisVolumeMultiple,
    );
    return {
      regime: "crisis",
      confidence: clampConfidence(worstRatio - 1),
      efficiencyRatio: er,
      volatility: currentATR,
      trendStrength: atrRatio,
      details: `CRISIS: atrRatio=${atrRatio.toFixed(2)}, gapSigma=${lastGapSigma.toFixed(2)}, volumeRatio=${volumeRatio.toFixed(2)}`,
    };
  }

  // SHOCK: elevated volatility (3–5× avg) with some directional movement
  if (atrRatio > cfg.shockAtrMultiple && er > cfg.crisisErFloor) {
    const depth = (atrRatio - cfg.shockAtrMultiple) / (cfg.crisisAtrMultiple - cfg.shockAtrMultiple);
    return {
      regime: "shock",
      confidence: clampConfidence(depth),
      efficiencyRatio: er,
      volatility: currentATR,
      trendStrength: atrRatio,
      details: `SHOCK: atrRatio=${atrRatio.toFixed(2)}, er=${er.toFixed(3)}`,
    };
  }

  // TRANSITION: ER in the uncertain band
  if (er >= cfg.erRangeThreshold && er <= cfg.erTrendThreshold) {
    // Confidence is lowest at the midpoint, higher toward either boundary
    const bandwidth = cfg.erTrendThreshold - cfg.erRangeThreshold;
    const midpoint = cfg.erRangeThreshold + bandwidth / 2;
    const distFromMid = Math.abs(er - midpoint) / (bandwidth / 2);
    return {
      regime: "transition",
      confidence: clampConfidence(1 - distFromMid),
      efficiencyRatio: er,
      volatility: currentATR,
      trendStrength: atrRatio,
      details: `TRANSITION: er=${er.toFixed(3)} (range ${cfg.erRangeThreshold}–${cfg.erTrendThreshold})`,
    };
  }

  // TRENDING: ER above trend threshold with normal volatility
  if (er > cfg.erTrendThreshold) {
    const excessER = er - cfg.erTrendThreshold;
    const maxExcess = 1 - cfg.erTrendThreshold;
    return {
      regime: "trending",
      confidence: clampConfidence(maxExcess > 0 ? excessER / maxExcess : 1),
      efficiencyRatio: er,
      volatility: currentATR,
      trendStrength: atrRatio,
      details: `TRENDING: er=${er.toFixed(3)}, atrRatio=${atrRatio.toFixed(2)}`,
    };
  }

  // RANGING: ER below range threshold with normal volatility
  const excessBelow = cfg.erRangeThreshold - er;
  return {
    regime: "ranging",
    confidence: clampConfidence(
      cfg.erRangeThreshold > 0 ? excessBelow / cfg.erRangeThreshold : 1,
    ),
    efficiencyRatio: er,
    volatility: currentATR,
    trendStrength: atrRatio,
    details: `RANGING: er=${er.toFixed(3)}, atrRatio=${atrRatio.toFixed(2)}`,
  };
}
