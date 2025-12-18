/**
 * Technical Analysis Type Definitions
 * 
 * Types for 20+ technical indicators, chart patterns, and signals
 */

import { Timeframe, TrendDirection, SignalStrength } from './investment.types';

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

export type IndicatorType = 
  | 'sma' | 'ema' | 'wma' | 'dema' | 'tema'  // Moving Averages
  | 'rsi' | 'stoch' | 'stoch_rsi' | 'cci' | 'williams_r' | 'mfi'  // Oscillators
  | 'macd' | 'ppo' | 'apo'  // Trend
  | 'bbands' | 'keltner' | 'donchian' | 'atr' | 'stddev'  // Volatility
  | 'obv' | 'ad' | 'cmf' | 'vwap' | 'volume_profile'  // Volume
  | 'adx' | 'aroon' | 'ichimoku' | 'parabolic_sar' | 'supertrend'  // Trend Following
  | 'pivot_points' | 'fibonacci' | 'support_resistance';  // Levels

export interface IndicatorConfig {
  type: IndicatorType;
  period?: number;
  periods?: number[];
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  multiplier?: number;
  source?: 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';
}

export interface IndicatorValue {
  timestamp: Date;
  value: number | number[];
  signal?: number;
  histogram?: number;
  upperBand?: number;
  lowerBand?: number;
  middleBand?: number;
}

export interface IndicatorResult {
  indicator: IndicatorType;
  config: IndicatorConfig;
  values: IndicatorValue[];
  currentValue: number | number[];
  signal: SignalStrength;
  interpretation: string;
}

// ============================================================================
// MOVING AVERAGES
// ============================================================================

export interface MovingAverageResult {
  type: 'sma' | 'ema' | 'wma' | 'dema' | 'tema';
  period: number;
  values: Array<{ timestamp: Date; value: number }>;
  currentValue: number;
  pricePosition: 'above' | 'below' | 'touching';
  trend: TrendDirection;
  crossovers: MACrossover[];
}

export interface MACrossover {
  timestamp: Date;
  type: 'golden_cross' | 'death_cross' | 'bullish_cross' | 'bearish_cross';
  fastMA: number;
  slowMA: number;
  significance: 'high' | 'medium' | 'low';
}

// ============================================================================
// OSCILLATORS
// ============================================================================

export interface RSIResult {
  period: number;
  values: Array<{ timestamp: Date; value: number }>;
  currentValue: number;
  zone: 'overbought' | 'oversold' | 'neutral';
  divergence?: Divergence;
  signal: SignalStrength;
}

export interface StochasticResult {
  kPeriod: number;
  dPeriod: number;
  values: Array<{ timestamp: Date; k: number; d: number }>;
  currentK: number;
  currentD: number;
  zone: 'overbought' | 'oversold' | 'neutral';
  crossover?: 'bullish' | 'bearish';
  signal: SignalStrength;
}

export interface MACDResult {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  values: Array<{ timestamp: Date; macd: number; signal: number; histogram: number }>;
  currentMACD: number;
  currentSignal: number;
  currentHistogram: number;
  trend: TrendDirection;
  crossover?: 'bullish' | 'bearish';
  divergence?: Divergence;
  signal: SignalStrength;
}

// ============================================================================
// VOLATILITY INDICATORS
// ============================================================================

export interface BollingerBandsResult {
  period: number;
  stdDev: number;
  values: Array<{ timestamp: Date; upper: number; middle: number; lower: number; bandwidth: number; percentB: number }>;
  currentUpper: number;
  currentMiddle: number;
  currentLower: number;
  bandwidth: number;
  percentB: number;
  squeeze: boolean;
  breakout?: 'upper' | 'lower';
  signal: SignalStrength;
}

export interface ATRResult {
  period: number;
  values: Array<{ timestamp: Date; value: number }>;
  currentValue: number;
  volatilityLevel: 'low' | 'normal' | 'high' | 'extreme';
  percentOfPrice: number;
}

// ============================================================================
// VOLUME INDICATORS
// ============================================================================

export interface VolumeAnalysis {
  currentVolume: number;
  avgVolume: number;
  volumeRatio: number;
  volumeTrend: TrendDirection;
  priceVolumeCorrelation: number;
  accumulationDistribution: 'accumulation' | 'distribution' | 'neutral';
  onBalanceVolume: number;
  obvTrend: TrendDirection;
  moneyFlowIndex: number;
  mfiZone: 'overbought' | 'oversold' | 'neutral';
}

// ============================================================================
// TREND INDICATORS
// ============================================================================

export interface ADXResult {
  period: number;
  values: Array<{ timestamp: Date; adx: number; plusDI: number; minusDI: number }>;
  currentADX: number;
  currentPlusDI: number;
  currentMinusDI: number;
  trendStrength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  trend: TrendDirection;
  signal: SignalStrength;
}

export interface IchimokuResult {
  tenkanSen: number;
  kijunSen: number;
  senkouSpanA: number;
  senkouSpanB: number;
  chikouSpan: number;
  cloudColor: 'green' | 'red';
  pricePosition: 'above_cloud' | 'in_cloud' | 'below_cloud';
  trend: TrendDirection;
  signals: string[];
}

// ============================================================================
// CHART PATTERNS
// ============================================================================

export type ChartPatternType =
  | 'head_and_shoulders' | 'inverse_head_and_shoulders'
  | 'double_top' | 'double_bottom'
  | 'triple_top' | 'triple_bottom'
  | 'ascending_triangle' | 'descending_triangle' | 'symmetrical_triangle'
  | 'rising_wedge' | 'falling_wedge'
  | 'bull_flag' | 'bear_flag'
  | 'cup_and_handle' | 'inverse_cup_and_handle'
  | 'rounding_bottom' | 'rounding_top'
  | 'rectangle' | 'channel';

export interface ChartPattern {
  id: string;
  type: ChartPatternType;
  direction: 'bullish' | 'bearish';
  startDate: Date;
  endDate?: Date;
  breakoutDate?: Date;
  status: 'forming' | 'complete' | 'confirmed' | 'failed';
  reliability: number;
  priceTarget?: number;
  targetPercent?: number;
  stopLoss?: number;
  keyLevels: PriceLevel[];
  description: string;
}

export interface PriceLevel {
  type: 'support' | 'resistance' | 'neckline' | 'trendline';
  price: number;
  strength: 'weak' | 'moderate' | 'strong';
  touchCount: number;
  lastTouched: Date;
}

export interface SupportResistance {
  symbol: string;
  timeframe: Timeframe;
  supports: PriceLevel[];
  resistances: PriceLevel[];
  pivotPoints?: PivotPoints;
  fibonacciLevels?: FibonacciLevels;
}

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  method: 'standard' | 'fibonacci' | 'woodie' | 'camarilla' | 'demark';
}

export interface FibonacciLevels {
  type: 'retracement' | 'extension';
  startPrice: number;
  endPrice: number;
  levels: Array<{ ratio: number; price: number; label: string }>;
}

// ============================================================================
// DIVERGENCE
// ============================================================================

export interface Divergence {
  type: 'regular_bullish' | 'regular_bearish' | 'hidden_bullish' | 'hidden_bearish';
  indicator: string;
  startDate: Date;
  endDate: Date;
  priceStart: number;
  priceEnd: number;
  indicatorStart: number;
  indicatorEnd: number;
  strength: 'weak' | 'moderate' | 'strong';
  confirmed: boolean;
}

// ============================================================================
// COMPREHENSIVE TECHNICAL ANALYSIS
// ============================================================================

export interface TechnicalAnalysis {
  symbol: string;
  timeframe: Timeframe;
  analyzedAt: Date;
  trend: TrendSummary;
  momentum: MomentumSummary;
  volatility: VolatilitySummary;
  volume: VolumeAnalysis;
  supportResistance: SupportResistance;
  patterns: ChartPattern[];
  indicators: IndicatorResult[];
  signals: TechnicalSignal[];
  overallSignal: SignalStrength;
  overallScore: number;
  summary: string;
}

export interface TrendSummary {
  shortTerm: TrendDirection;
  mediumTerm: TrendDirection;
  longTerm: TrendDirection;
  strength: number;
  adx: number;
  movingAverages: {
    ma20: number;
    ma50: number;
    ma200: number;
    priceVs20: 'above' | 'below';
    priceVs50: 'above' | 'below';
    priceVs200: 'above' | 'below';
  };
}

export interface MomentumSummary {
  rsi: number;
  rsiZone: 'overbought' | 'oversold' | 'neutral';
  stochK: number;
  stochD: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  momentum: number;
  overallMomentum: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
}

export interface VolatilitySummary {
  atr: number;
  atrPercent: number;
  bollingerBandwidth: number;
  bollingerPercentB: number;
  volatilityLevel: 'low' | 'normal' | 'high' | 'extreme';
  isSqueezing: boolean;
}

export interface TechnicalSignal {
  id: string;
  type: 'indicator' | 'pattern' | 'crossover' | 'divergence' | 'breakout';
  name: string;
  signal: SignalStrength;
  price: number;
  timestamp: Date;
  description: string;
  reliability: number;
  targetPrice?: number;
  stopLoss?: number;
}
