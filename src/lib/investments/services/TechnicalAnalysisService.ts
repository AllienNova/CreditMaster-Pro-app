/**
 * Technical Analysis Service
 *
 * Comprehensive technical analysis engine:
 * - Technical indicators (RSI, MACD, Bollinger Bands, etc.)
 * - Trend analysis (short, medium, long-term)
 * - Support/Resistance levels
 * - Chart pattern recognition
 * - Signal generation
 * - Composite technical scoring
 */

import type {
  TechnicalAnalysis,
  TechnicalSignal,
  TrendSummary,
  MomentumSummary,
  VolatilitySummary,
  VolumeAnalysis,
  SupportResistance,
  ChartPattern,
  IndicatorResult,
  PriceLevel,
} from "../types/technical-analysis.types";
import type {
  SignalStrength,
  TrendDirection,
  Timeframe,
} from "../types/investment.types";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface MACDData {
  line: number;
  signal: number;
  histogram: number;
}

interface StochasticData {
  k: number;
  d: number;
}

interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: MACDData;
  stochastic: StochasticData;
  bollingerBands: BollingerBands;
  atr: number;
  obv: number;
  vwap: number;
  adx: number;
  cci: number;
}

// ============================================================================
// TECHNICAL ANALYSIS SERVICE
// ============================================================================

export class TechnicalAnalysisService {
  /**
   * Perform comprehensive technical analysis on a symbol
   */
  async analyzeTechnical(
    symbol: string,
    timeframe: Timeframe,
    historicalData: {
      close: number;
      high: number;
      low: number;
      volume: number;
      timestamp: Date;
    }[],
    options?: {
      includePatterns?: boolean;
      includeSignals?: boolean;
    },
  ): Promise<TechnicalAnalysis> {
    const { includePatterns = true, includeSignals = true } = options || {};

    const closes = historicalData.map((d) => d.close);
    const highs = historicalData.map((d) => d.high);
    const lows = historicalData.map((d) => d.low);
    const volumes = historicalData.map((d) => d.volume);
    const currentPrice = closes[closes.length - 1];

    // Calculate all technical indicators
    const indicators = this.calculateIndicators(closes, highs, lows, volumes);

    // Build trend summary
    const trend = this.buildTrendSummary(closes, indicators, currentPrice);

    // Build momentum summary
    const momentum = this.buildMomentumSummary(indicators);

    // Build volatility summary
    const volatility = this.buildVolatilitySummary(indicators, currentPrice);

    // Build volume analysis
    const volume = this.buildVolumeAnalysis(closes, volumes, indicators);

    // Find support and resistance levels
    const supportResistance = this.buildSupportResistance(
      symbol,
      timeframe,
      highs,
      lows,
      closes,
    );

    // Generate trading signals
    const signals = includeSignals
      ? this.generateSignals(indicators, currentPrice, symbol)
      : [];

    // Calculate overall signal and score
    const { overallSignal, overallScore } = this.calculateOverallSignal(
      trend,
      momentum,
      signals,
    );

    // Generate summary
    const summary = this.generateSummary(
      trend,
      momentum,
      volatility,
      overallSignal,
    );

    return {
      symbol,
      timeframe,
      analyzedAt: new Date(),
      trend,
      momentum,
      volatility,
      volume,
      supportResistance,
      patterns: [], // Pattern recognition would be integrated here
      indicators: [], // Detailed indicator results would be here
      signals,
      overallSignal,
      overallScore,
      summary,
    };
  }

  /**
   * Calculate all technical indicators
   */
  private calculateIndicators(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
  ): TechnicalIndicators {
    return {
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      ema12: this.calculateEMA(closes, 12),
      ema26: this.calculateEMA(closes, 26),
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      stochastic: this.calculateStochastic(closes, highs, lows),
      bollingerBands: this.calculateBollingerBands(closes, 20),
      atr: this.calculateATR(highs, lows, closes, 14),
      obv: this.calculateOBV(closes, volumes),
      vwap: this.calculateVWAP(closes, highs, lows, volumes),
      adx: this.calculateADX(highs, lows, closes, 14),
      cci: this.calculateCCI(highs, lows, closes, 20),
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(values.slice(0, period), period);

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(closes: number[]): MACDData {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdHistory: number[] = [];
    for (let i = 26; i < closes.length; i++) {
      const ema12_i = this.calculateEMA(closes.slice(0, i + 1), 12);
      const ema26_i = this.calculateEMA(closes.slice(0, i + 1), 26);
      macdHistory.push(ema12_i - ema26_i);
    }

    const signalLine = this.calculateEMA(macdHistory, 9);
    const histogram = macdLine - signalLine;

    return {
      line: macdLine,
      signal: signalLine,
      histogram,
    };
  }

  /**
   * Calculate Stochastic Oscillator
   */
  private calculateStochastic(
    closes: number[],
    highs: number[],
    lows: number[],
    period: number = 14,
  ): StochasticData {
    if (closes.length < period) {
      return { k: 50, d: 50 };
    }

    const recentCloses = closes.slice(-period);
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    const currentClose = closes[closes.length - 1];

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

    // Calculate %D (3-period SMA of %K)
    const kValues: number[] = [];
    for (let i = period; i <= closes.length; i++) {
      const slice = closes.slice(i - period, i);
      const h = Math.max(...highs.slice(i - period, i));
      const l = Math.min(...lows.slice(i - period, i));
      kValues.push(((slice[slice.length - 1] - l) / (h - l)) * 100);
    }

    const d = kValues.length >= 3 ? this.calculateSMA(kValues, 3) : k;

    return { k, d };
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    closes: number[],
    period: number = 20,
  ): BollingerBands {
    const middle = this.calculateSMA(closes, period);
    const slice = closes.slice(-period);

    // Calculate standard deviation
    const variance =
      slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: middle + 2 * stdDev,
      middle,
      lower: middle - 2 * stdDev,
      bandwidth: ((middle + 2 * stdDev - (middle - 2 * stdDev)) / middle) * 100,
    };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14,
  ): number {
    if (highs.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose),
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges, period);
  }

  /**
   * Calculate On-Balance Volume (OBV)
   */
  private calculateOBV(closes: number[], volumes: number[]): number {
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        obv -= volumes[i];
      }
    }
    return obv;
  }

  /**
   * Calculate Volume Weighted Average Price (VWAP)
   */
  private calculateVWAP(
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
  ): number {
    let totalVolume = 0;
    let totalPriceVolume = 0;

    for (let i = 0; i < closes.length; i++) {
      const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
      totalPriceVolume += typicalPrice * volumes[i];
      totalVolume += volumes[i];
    }

    return totalVolume > 0
      ? totalPriceVolume / totalVolume
      : closes[closes.length - 1];
  }

  /**
   * Calculate Average Directional Index (ADX)
   */
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14,
  ): number {
    if (highs.length < period + 1) return 25;

    // Simplified ADX calculation
    const trueRanges: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
      trueRanges.push(tr);

      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    const avgTR = this.calculateSMA(trueRanges, period);
    const avgPlusDM = this.calculateSMA(plusDM, period);
    const avgMinusDM = this.calculateSMA(minusDM, period);

    const plusDI = (avgPlusDM / avgTR) * 100;
    const minusDI = (avgMinusDM / avgTR) * 100;

    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    return dx;
  }

  /**
   * Calculate Commodity Channel Index (CCI)
   */
  private calculateCCI(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 20,
  ): number {
    if (closes.length < period) return 0;

    const typicalPrices: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    const sma = this.calculateSMA(typicalPrices, period);
    const recentTP = typicalPrices.slice(-period);

    const meanDeviation =
      recentTP.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;

    const currentTP = typicalPrices[typicalPrices.length - 1];
    return (currentTP - sma) / (0.015 * meanDeviation);
  }

  /**
   * Generate trading signals based on indicators
   */
  private generateSignals(
    indicators: TechnicalIndicators,
    currentPrice: number,
    symbol: string,
  ): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    let signalId = 1;

    // RSI signals
    if (indicators.rsi < 30) {
      signals.push({
        id: `${symbol}-rsi-${signalId++}`,
        type: "indicator",
        name: "RSI Oversold",
        signal: "strong_buy",
        price: currentPrice,
        timestamp: new Date(),
        description: `RSI is oversold at ${indicators.rsi.toFixed(2)}`,
        reliability: 75,
      });
    } else if (indicators.rsi > 70) {
      signals.push({
        id: `${symbol}-rsi-${signalId++}`,
        type: "indicator",
        name: "RSI Overbought",
        signal: "strong_sell",
        price: currentPrice,
        timestamp: new Date(),
        description: `RSI is overbought at ${indicators.rsi.toFixed(2)}`,
        reliability: 75,
      });
    }

    // MACD signals
    if (
      indicators.macd.histogram > 0 &&
      indicators.macd.line > indicators.macd.signal
    ) {
      signals.push({
        id: `${symbol}-macd-${signalId++}`,
        type: "crossover",
        name: "MACD Bullish Crossover",
        signal: "buy",
        price: currentPrice,
        timestamp: new Date(),
        description: "MACD line crossed above signal line",
        reliability: 70,
      });
    } else if (
      indicators.macd.histogram < 0 &&
      indicators.macd.line < indicators.macd.signal
    ) {
      signals.push({
        id: `${symbol}-macd-${signalId++}`,
        type: "crossover",
        name: "MACD Bearish Crossover",
        signal: "sell",
        price: currentPrice,
        timestamp: new Date(),
        description: "MACD line crossed below signal line",
        reliability: 70,
      });
    }

    // Moving Average signals
    if (
      currentPrice > indicators.sma50 &&
      indicators.sma50 > indicators.sma200
    ) {
      signals.push({
        id: `${symbol}-ma-${signalId++}`,
        type: "crossover",
        name: "Golden Cross",
        signal: "buy",
        price: currentPrice,
        timestamp: new Date(),
        description: "Golden Cross pattern (SMA50 > SMA200)",
        reliability: 80,
      });
    } else if (
      currentPrice < indicators.sma50 &&
      indicators.sma50 < indicators.sma200
    ) {
      signals.push({
        id: `${symbol}-ma-${signalId++}`,
        type: "crossover",
        name: "Death Cross",
        signal: "sell",
        price: currentPrice,
        timestamp: new Date(),
        description: "Death Cross pattern (SMA50 < SMA200)",
        reliability: 80,
      });
    }

    // Bollinger Bands signals
    if (currentPrice < indicators.bollingerBands.lower) {
      signals.push({
        id: `${symbol}-bb-${signalId++}`,
        type: "breakout",
        name: "Bollinger Band Breakout",
        signal: "buy",
        price: currentPrice,
        timestamp: new Date(),
        description: "Price below lower Bollinger Band",
        reliability: 65,
      });
    } else if (currentPrice > indicators.bollingerBands.upper) {
      signals.push({
        id: `${symbol}-bb-${signalId++}`,
        type: "breakout",
        name: "Bollinger Band Breakout",
        signal: "sell",
        price: currentPrice,
        timestamp: new Date(),
        description: "Price above upper Bollinger Band",
        reliability: 65,
      });
    }

    return signals;
  }

  /**
   * Build trend summary
   */
  private buildTrendSummary(
    closes: number[],
    indicators: TechnicalIndicators,
    currentPrice: number,
  ): TrendSummary {
    // Short-term trend (20-day SMA)
    const shortTerm: TrendDirection =
      currentPrice > indicators.sma20
        ? "bullish"
        : currentPrice < indicators.sma20
          ? "bearish"
          : "neutral";

    // Medium-term trend (50-day SMA)
    const mediumTerm: TrendDirection =
      currentPrice > indicators.sma50
        ? "bullish"
        : currentPrice < indicators.sma50
          ? "bearish"
          : "neutral";

    // Long-term trend (200-day SMA)
    const longTerm: TrendDirection =
      currentPrice > indicators.sma200
        ? "bullish"
        : currentPrice < indicators.sma200
          ? "bearish"
          : "neutral";

    return {
      shortTerm,
      mediumTerm,
      longTerm,
      strength: indicators.adx,
      adx: indicators.adx,
      movingAverages: {
        ma20: indicators.sma20,
        ma50: indicators.sma50,
        ma200: indicators.sma200,
        priceVs20: currentPrice > indicators.sma20 ? "above" : "below",
        priceVs50: currentPrice > indicators.sma50 ? "above" : "below",
        priceVs200: currentPrice > indicators.sma200 ? "above" : "below",
      },
    };
  }

  /**
   * Build momentum summary
   */
  private buildMomentumSummary(
    indicators: TechnicalIndicators,
  ): MomentumSummary {
    const rsiZone: "overbought" | "oversold" | "neutral" =
      indicators.rsi > 70
        ? "overbought"
        : indicators.rsi < 30
          ? "oversold"
          : "neutral";

    let overallMomentum:
      | "strong_bullish"
      | "bullish"
      | "neutral"
      | "bearish"
      | "strong_bearish";
    if (indicators.rsi > 70 && indicators.macd.histogram > 0) {
      overallMomentum = "strong_bullish";
    } else if (indicators.rsi > 50 && indicators.macd.histogram > 0) {
      overallMomentum = "bullish";
    } else if (indicators.rsi < 30 && indicators.macd.histogram < 0) {
      overallMomentum = "strong_bearish";
    } else if (indicators.rsi < 50 && indicators.macd.histogram < 0) {
      overallMomentum = "bearish";
    } else {
      overallMomentum = "neutral";
    }

    return {
      rsi: indicators.rsi,
      rsiZone,
      stochK: indicators.stochastic.k,
      stochD: indicators.stochastic.d,
      macd: indicators.macd.line,
      macdSignal: indicators.macd.signal,
      macdHistogram: indicators.macd.histogram,
      momentum: indicators.rsi - 50, // Simplified momentum calculation
      overallMomentum,
    };
  }

  /**
   * Build volatility summary
   */
  private buildVolatilitySummary(
    indicators: TechnicalIndicators,
    currentPrice: number,
  ): VolatilitySummary {
    const atrPercent = (indicators.atr / currentPrice) * 100;
    const bollingerPercentB =
      (currentPrice - indicators.bollingerBands.lower) /
      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);

    let volatilityLevel: "low" | "normal" | "high" | "extreme";
    if (atrPercent < 1) volatilityLevel = "low";
    else if (atrPercent < 2) volatilityLevel = "normal";
    else if (atrPercent < 4) volatilityLevel = "high";
    else volatilityLevel = "extreme";

    const isSqueezing = indicators.bollingerBands.bandwidth < 10;

    return {
      atr: indicators.atr,
      atrPercent,
      bollingerBandwidth: indicators.bollingerBands.bandwidth,
      bollingerPercentB,
      volatilityLevel,
      isSqueezing,
    };
  }

  /**
   * Build volume analysis
   */
  private buildVolumeAnalysis(
    closes: number[],
    volumes: number[],
    indicators: TechnicalIndicators,
  ): VolumeAnalysis {
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const volumeRatio = currentVolume / avgVolume;

    // Determine volume trend
    const recentVolumes = volumes.slice(-10);
    const avgRecentVolume =
      recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const volumeTrend: TrendDirection =
      avgRecentVolume > avgVolume * 1.1
        ? "bullish"
        : avgRecentVolume < avgVolume * 0.9
          ? "bearish"
          : "neutral";

    // Price-volume correlation (simplified)
    const priceVolumeCorrelation = 0.5; // Would need more complex calculation

    // Accumulation/Distribution
    const accumulationDistribution:
      | "accumulation"
      | "distribution"
      | "neutral" =
      indicators.obv > 0
        ? "accumulation"
        : indicators.obv < 0
          ? "distribution"
          : "neutral";

    return {
      currentVolume,
      avgVolume,
      volumeRatio,
      volumeTrend,
      priceVolumeCorrelation,
      accumulationDistribution,
      onBalanceVolume: indicators.obv,
      obvTrend: volumeTrend,
      moneyFlowIndex: 50, // Simplified
      mfiZone: "neutral",
    };
  }

  /**
   * Build support and resistance
   */
  private buildSupportResistance(
    symbol: string,
    timeframe: Timeframe,
    highs: number[],
    lows: number[],
    closes: number[],
  ): SupportResistance {
    const { support, resistance } = this.findSupportResistance(
      highs,
      lows,
      closes,
    );

    const supports: PriceLevel[] = support.map((price, index) => ({
      type: "support" as const,
      price,
      strength: index === 0 ? "strong" : index === 1 ? "moderate" : "weak",
      touchCount: 2,
      lastTouched: new Date(),
    }));

    const resistances: PriceLevel[] = resistance.map((price, index) => ({
      type: "resistance" as const,
      price,
      strength: index === 0 ? "strong" : index === 1 ? "moderate" : "weak",
      touchCount: 2,
      lastTouched: new Date(),
    }));

    return {
      symbol,
      timeframe,
      supports,
      resistances,
    };
  }

  /**
   * Find support and resistance levels
   */
  private findSupportResistance(
    highs: number[],
    lows: number[],
    closes: number[],
  ): { support: number[]; resistance: number[] } {
    const support: number[] = [];
    const resistance: number[] = [];

    // Find local minima (support) and maxima (resistance)
    for (let i = 2; i < closes.length - 2; i++) {
      // Support: local minimum
      if (
        lows[i] < lows[i - 1] &&
        lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] &&
        lows[i] < lows[i + 2]
      ) {
        support.push(lows[i]);
      }

      // Resistance: local maximum
      if (
        highs[i] > highs[i - 1] &&
        highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] &&
        highs[i] > highs[i + 2]
      ) {
        resistance.push(highs[i]);
      }
    }

    // Return top 3 support and resistance levels
    return {
      support: support.sort((a, b) => b - a).slice(0, 3),
      resistance: resistance.sort((a, b) => a - b).slice(0, 3),
    };
  }

  /**
   * Calculate overall signal and score
   */
  private calculateOverallSignal(
    trend: TrendSummary,
    momentum: MomentumSummary,
    signals: TechnicalSignal[],
  ): { overallSignal: SignalStrength; overallScore: number } {
    let score = 50; // Start at neutral (0-100 scale)

    // Trend contribution (30%)
    if (trend.shortTerm === "bullish") score += 10;
    else if (trend.shortTerm === "bearish") score -= 10;

    if (trend.mediumTerm === "bullish") score += 15;
    else if (trend.mediumTerm === "bearish") score -= 15;

    if (trend.longTerm === "bullish") score += 5;
    else if (trend.longTerm === "bearish") score -= 5;

    // Momentum contribution (30%)
    if (momentum.overallMomentum === "strong_bullish") score += 15;
    else if (momentum.overallMomentum === "bullish") score += 10;
    else if (momentum.overallMomentum === "strong_bearish") score -= 15;
    else if (momentum.overallMomentum === "bearish") score -= 10;

    // Signals contribution (40%)
    signals.forEach((signal) => {
      const weight = signal.reliability / 100;
      if (signal.signal === "strong_buy") score += 8 * weight;
      else if (signal.signal === "buy") score += 5 * weight;
      else if (signal.signal === "strong_sell") score -= 8 * weight;
      else if (signal.signal === "sell") score -= 5 * weight;
    });

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine overall signal
    let overallSignal: SignalStrength;
    if (score >= 75) overallSignal = "strong_buy";
    else if (score >= 60) overallSignal = "buy";
    else if (score <= 25) overallSignal = "strong_sell";
    else if (score <= 40) overallSignal = "sell";
    else overallSignal = "neutral";

    return { overallSignal, overallScore: score };
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    trend: TrendSummary,
    momentum: MomentumSummary,
    volatility: VolatilitySummary,
    overallSignal: SignalStrength,
  ): string {
    const parts: string[] = [];

    // Trend summary
    if (
      trend.shortTerm === trend.mediumTerm &&
      trend.mediumTerm === trend.longTerm
    ) {
      parts.push(`Strong ${trend.mediumTerm} trend across all timeframes`);
    } else {
      parts.push(
        `Mixed trend: short-term ${trend.shortTerm}, medium-term ${trend.mediumTerm}, long-term ${trend.longTerm}`,
      );
    }

    // Momentum summary
    parts.push(`Momentum is ${momentum.overallMomentum.replace("_", " ")}`);

    // Volatility summary
    parts.push(`Volatility is ${volatility.volatilityLevel}`);

    // Overall signal
    parts.push(
      `Overall signal: ${overallSignal.replace("_", " ").toUpperCase()}`,
    );

    return parts.join(". ") + ".";
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let technicalAnalysisServiceInstance: TechnicalAnalysisService | null = null;

export function getTechnicalAnalysisService(): TechnicalAnalysisService {
  if (!technicalAnalysisServiceInstance) {
    technicalAnalysisServiceInstance = new TechnicalAnalysisService();
  }
  return technicalAnalysisServiceInstance;
}
