/**
 * Instrument Scoring Service
 * 
 * Computes composite scores for instruments based on:
 * - Liquidity (L): tradability, spread, volume
 * - PCTT Fitness (P): structure quality, regime, geometry
 * - Opportunity (O): momentum, trend strength
 * - Realized Edge (R): historical performance
 * - User Fit (U): budget, constraints
 */

import type {
  Instrument,
  InstrumentFeatures,
  InstrumentPerformance,
  ScoreBreakdown,
  ScoringWeights,
  UserConstraints,
  UserTier,
  AssetClass,
} from './types';
import { TIER_WEIGHTS } from './types';

// ============================================================================
// SCORING CONFIGURATION
// ============================================================================

export interface ScoringConfig {
  // Liquidity thresholds
  minVolumeForMaxScore: number;
  maxSpreadForMaxScore: number;
  
  // PCTT thresholds
  minQScoreForMaxScore: number;
  minEfficiencyForMaxScore: number;
  
  // Performance thresholds
  minTradesForConfidence: number;
  targetExpectancyR: number;
  
  // Momentum scaling
  momentumClipZ: number;      // Clip momentum z-score
  
  // Cold start prior (for new instruments)
  coldStartScore: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minVolumeForMaxScore: 1_000_000,
  maxSpreadForMaxScore: 0.001,    // 0.1% spread
  minQScoreForMaxScore: 0.8,
  minEfficiencyForMaxScore: 0.6,
  minTradesForConfidence: 30,
  targetExpectancyR: 0.5,
  momentumClipZ: 3,
  coldStartScore: 0.5,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sigmoid function for smooth scoring
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation with clamping
 */
function lerp(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

// ============================================================================
// COMPONENT SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate liquidity score based on volume, spread, and slippage
 */
export function scoreLiquidity(
  features: InstrumentFeatures,
  instrument: Instrument,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { score: number; details: ScoreBreakdown['liquidityDetails'] } {
  
  // Volume score (log-scaled)
  const volumeRatio = Math.log(features.adv20 + 1) / Math.log(config.minVolumeForMaxScore + 1);
  const volumeScore = clamp(volumeRatio, 0, 1);
  
  // Spread score (inverse, penalize high spread)
  const spreadPercent = features.spreadEstimate ?? 0.001;
  const spreadScore = 1 - clamp(spreadPercent / (config.maxSpreadForMaxScore * 10), 0, 1);
  
  // Slippage estimate based on ATR and spread
  const spreadAtr = features.spreadAtr ?? 0.1;
  const slippageScore = sigmoid(2 - 6 * spreadAtr);
  
  // Asset-class specific adjustments
  let assetMultiplier = 1.0;
  switch (instrument.assetClass) {
    case 'crypto':
      // Crypto can have wider spreads but high volume
      assetMultiplier = volumeScore > 0.7 ? 1.0 : 0.8;
      break;
    case 'forex':
      // FX liquidity varies by session
      assetMultiplier = 1.0;
      break;
    case 'options':
      // Options need higher volume bar
      assetMultiplier = volumeScore > 0.5 ? 1.0 : 0.7;
      break;
  }
  
  // Combine scores
  const rawScore = (volumeScore * 0.4 + spreadScore * 0.35 + slippageScore * 0.25) * assetMultiplier;
  
  return {
    score: clamp(rawScore, 0, 1),
    details: {
      volumeScore,
      spreadScore,
      slippageScore,
    },
  };
}

/**
 * Calculate PCTT fitness score based on structure quality
 */
export function scorePCTTFitness(
  features: InstrumentFeatures,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { score: number; details: ScoreBreakdown['pcttDetails'] } {
  
  // Q-score contribution (most important)
  const qScoreNorm = features.qScore / config.minQScoreForMaxScore;
  const qScore = clamp(qScoreNorm, 0, 1);
  
  // Regime score (trending is better for PCTT)
  let regimeScore = 0.5;
  switch (features.regime) {
    case 'trend_up':
    case 'trend_down':
      regimeScore = 0.9;
      break;
    case 'range':
      regimeScore = 0.6;
      break;
    case 'transition':
      regimeScore = 0.3;
      break;
  }
  
  // Geometry score based on efficiency ratio and chop
  const erNorm = features.efficiencyRatio / config.minEfficiencyForMaxScore;
  const chopPenalty = features.chopIndex > 50 ? (features.chopIndex - 50) / 50 : 0;
  const geometryScore = clamp(erNorm - chopPenalty * 0.3, 0, 1);
  
  // Event state bonus (retest/entry states are better)
  let eventBonus = 0;
  if (features.event.includes('entry')) {
    eventBonus = 0.15;
  } else if (features.event.includes('retest')) {
    eventBonus = 0.1;
  } else if (features.event.includes('freeze')) {
    eventBonus = 0.05;
  }
  
  // Combine with weights
  const rawScore = sigmoid(
    2 * qScore + 
    1.5 * geometryScore + 
    1.0 * regimeScore - 
    0.5 + 
    eventBonus
  );
  
  return {
    score: clamp(rawScore, 0, 1),
    details: {
      qScore: features.qScore,
      regimeScore,
      geometryScore,
    },
  };
}

/**
 * Calculate opportunity/momentum score
 */
export function scoreOpportunity(
  features: InstrumentFeatures,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { score: number; details: ScoreBreakdown['opportunityDetails'] } {
  
  // Momentum z-score (clipped)
  const momZ = clamp(features.momentumZ, -config.momentumClipZ, config.momentumClipZ);
  const momentumScore = (momZ + config.momentumClipZ) / (2 * config.momentumClipZ);
  
  // Trend strength score
  const trendScore = clamp(features.trendStrength / 40, 0, 1); // ADX-style, 40 = very strong
  
  // Efficiency as trend quality
  const trendQuality = features.efficiencyRatio;
  
  // Volume confirmation
  const volumeConfirmation = features.volumeZ > 0 ? 
    clamp(features.volumeZ / 2, 0, 0.2) : 0;
  
  // Combine
  const rawScore = sigmoid(
    1.2 * momentumScore + 
    0.8 * trendScore + 
    0.5 * trendQuality + 
    volumeConfirmation - 
    0.3
  );
  
  return {
    score: clamp(rawScore, 0, 1),
    details: {
      momentumScore,
      trendScore,
    },
  };
}

/**
 * Calculate realized edge score from performance history
 */
export function scoreRealizedEdge(
  performance: InstrumentPerformance | null,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): { score: number; details: ScoreBreakdown['edgeDetails'] } {
  
  // Cold start: no history
  if (!performance || performance.totalTrades < 5) {
    return {
      score: config.coldStartScore,
      details: {
        expectancy: 0,
        stability: 0.5,
        recency: 0.5,
        confidence: 0,
      },
    };
  }
  
  // Expectancy score
  const expNorm = performance.expectancyR / config.targetExpectancyR;
  const expectancyScore = sigmoid(expNorm * 2 - 1);
  
  // Stability score (inverse of volatility)
  const stabilityScore = sigmoid(1 - performance.stdDevR);
  
  // Drawdown penalty
  const ddPenalty = clamp(performance.maxDrawdownR / 5, 0, 0.3);
  
  // Recency bonus (recent performance weighted more)
  const recentExpNorm = performance.recentExpectancyR / config.targetExpectancyR;
  const recencyScore = sigmoid(recentExpNorm * 2 - 1);
  
  // Confidence based on sample size
  const confidenceScore = sigmoid((performance.totalTrades - config.minTradesForConfidence) / 20);
  
  // Streak adjustment
  let streakAdjust = 0;
  if (performance.currentStreak >= 3) {
    streakAdjust = 0.05;
  } else if (performance.currentStreak <= -3) {
    streakAdjust = -0.1;
  }
  
  // Combine with confidence weighting
  const rawScore = (
    expectancyScore * 0.35 +
    stabilityScore * 0.2 +
    recencyScore * 0.25 +
    confidenceScore * 0.2 -
    ddPenalty +
    streakAdjust
  );
  
  return {
    score: clamp(rawScore, 0, 1),
    details: {
      expectancy: performance.expectancyR,
      stability: stabilityScore,
      recency: recencyScore,
      confidence: confidenceScore,
    },
  };
}

/**
 * Calculate user fit score based on constraints
 */
export function scoreUserFit(
  instrument: Instrument,
  features: InstrumentFeatures,
  constraints: UserConstraints
): { score: number } {
  
  let score = 1.0;
  
  // Asset class check
  if (!constraints.allowedAssetClasses.includes(instrument.assetClass)) {
    return { score: 0 };
  }
  
  // Excluded symbols
  if (constraints.excludedSymbols.includes(instrument.symbol)) {
    return { score: 0 };
  }
  
  // Excluded sectors
  if (constraints.excludedSectors && instrument.sector && 
      constraints.excludedSectors.includes(instrument.sector)) {
    return { score: 0 };
  }
  
  // Budget vs min notional
  const minNotional = instrument.minNotional ?? 0;
  if (minNotional > constraints.maxPositionValue) {
    return { score: 0 };
  }
  const budgetFit = sigmoid((constraints.totalBudget - minNotional) / Math.max(1, minNotional));
  score *= budgetFit;
  
  // Volume check
  if (features.adv20 < constraints.minVolume) {
    score *= 0.5;
  }
  
  // Spread check
  const spreadPercent = features.spreadEstimate ?? 0;
  if (spreadPercent > constraints.maxSpreadPercent) {
    score *= 0.7;
  }
  
  // Leverage check
  if (instrument.maxLeverage && instrument.maxLeverage > constraints.maxLeverage) {
    score *= 0.8;
  }
  
  return { score: clamp(score, 0, 1) };
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Score an instrument with full breakdown
 */
export function scoreInstrument(
  instrument: Instrument,
  features: InstrumentFeatures,
  performance: InstrumentPerformance | null,
  constraints: UserConstraints,
  tier: UserTier,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoreBreakdown {
  
  const weights = TIER_WEIGHTS[tier];
  
  // Calculate component scores
  const liquidityResult = scoreLiquidity(features, instrument, config);
  const pcttResult = scorePCTTFitness(features, config);
  const opportunityResult = scoreOpportunity(features, config);
  const edgeResult = scoreRealizedEdge(performance, config);
  const userFitResult = scoreUserFit(instrument, features, constraints);
  
  // If user fit is 0, total is 0 (hard filter)
  if (userFitResult.score === 0) {
    return {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      liquidity: liquidityResult.score,
      pcttFitness: pcttResult.score,
      opportunity: opportunityResult.score,
      realizedEdge: edgeResult.score,
      userFit: 0,
      total: 0,
      liquidityDetails: liquidityResult.details,
      pcttDetails: pcttResult.details,
      opportunityDetails: opportunityResult.details,
      edgeDetails: edgeResult.details,
      timestamp: new Date(),
    };
  }
  
  // Weighted total
  const total = 
    weights.liquidity * liquidityResult.score +
    weights.pcttFitness * pcttResult.score +
    weights.opportunity * opportunityResult.score +
    weights.realizedEdge * edgeResult.score +
    weights.userFit * userFitResult.score;
  
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    liquidity: liquidityResult.score,
    pcttFitness: pcttResult.score,
    opportunity: opportunityResult.score,
    realizedEdge: edgeResult.score,
    userFit: userFitResult.score,
    total: clamp(total, 0, 1),
    liquidityDetails: liquidityResult.details,
    pcttDetails: pcttResult.details,
    opportunityDetails: opportunityResult.details,
    edgeDetails: edgeResult.details,
    timestamp: new Date(),
  };
}

/**
 * Batch score multiple instruments
 */
export function scoreInstruments(
  instruments: Instrument[],
  featuresMap: Map<string, InstrumentFeatures>,
  performanceMap: Map<string, InstrumentPerformance>,
  constraints: UserConstraints,
  tier: UserTier,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoreBreakdown[] {
  
  const scores: ScoreBreakdown[] = [];
  
  for (const instrument of instruments) {
    const features = featuresMap.get(instrument.symbol);
    if (!features) continue;
    
    const performance = performanceMap.get(instrument.symbol) ?? null;
    
    const score = scoreInstrument(
      instrument,
      features,
      performance,
      constraints,
      tier,
      config
    );
    
    scores.push(score);
  }
  
  // Sort by total score descending
  scores.sort((a, b) => b.total - a.total);
  
  return scores;
}

// ============================================================================
// EXPLANATION GENERATION
// ============================================================================

/**
 * Generate human-readable explanation for a score
 */
export function explainScore(score: ScoreBreakdown, tier: UserTier): string {
  const weights = TIER_WEIGHTS[tier];
  const parts: string[] = [];
  
  // Identify top contributors
  const contributions = [
    { name: 'Liquidity', value: score.liquidity * weights.liquidity, raw: score.liquidity },
    { name: 'PCTT Fitness', value: score.pcttFitness * weights.pcttFitness, raw: score.pcttFitness },
    { name: 'Opportunity', value: score.opportunity * weights.opportunity, raw: score.opportunity },
    { name: 'Performance', value: score.realizedEdge * weights.realizedEdge, raw: score.realizedEdge },
  ].sort((a, b) => b.value - a.value);
  
  // Top contributor
  const top = contributions[0];
  parts.push(`${score.symbol}: Score ${(score.total * 100).toFixed(0)}%.`);
  parts.push(`Top factor: ${top.name} (${(top.raw * 100).toFixed(0)}%).`);
  
  // PCTT specifics
  if (score.pcttDetails.qScore >= 0.7) {
    parts.push(`Strong Q-score (${(score.pcttDetails.qScore * 100).toFixed(0)}%).`);
  }
  
  // Risks
  if (score.liquidity < 0.4) {
    parts.push('Low liquidity.');
  }
  if (score.edgeDetails.confidence < 0.3) {
    parts.push('ℹ️ Limited trade history.');
  }
  
  return parts.join(' ');
}
