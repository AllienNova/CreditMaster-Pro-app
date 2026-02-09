/**
 * Technical Indicators Library
 * 
 * Pure calculation functions for technical analysis indicators.
 * Used by both chart overlays and trading engines.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMAResult {
  timestamp: number;
  value: number;
}

export interface EMAResult {
  timestamp: number;
  value: number;
}

export interface BollingerBandsResult {
  timestamp: number;
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export interface RSIResult {
  timestamp: number;
  value: number;
  overbought: boolean;
  oversold: boolean;
}

export interface MACDResult {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
  bullish: boolean;
}

export interface StochasticResult {
  timestamp: number;
  k: number;
  d: number;
  overbought: boolean;
  oversold: boolean;
}

export interface ATRResult {
  timestamp: number;
  value: number;
}

export interface ADXResult {
  timestamp: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  trend: 'strong' | 'weak' | 'none';
}

export interface IchimokuResult {
  timestamp: number;
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
}

export interface VWAPResult {
  timestamp: number;
  vwap: number;
  upperBand: number;
  lowerBand: number;
}

export interface PivotPointsResult {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface FibonacciLevels {
  high: number;
  low: number;
  levels: {
    level: number;
    price: number;
    label: string;
  }[];
}

// ============================================================================
// MOVING AVERAGES
// ============================================================================

export function calculateSMA(data: OHLCV[], period: number): SMAResult[] {
  const results: SMAResult[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    results.push({
      timestamp: data[i].timestamp,
      value: sum / period,
    });
  }
  
  return results;
}

export function calculateEMA(data: OHLCV[], period: number): EMAResult[] {
  const results: EMAResult[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  
  results.push({
    timestamp: data[period - 1].timestamp,
    value: ema,
  });
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    results.push({
      timestamp: data[i].timestamp,
      value: ema,
    });
  }
  
  return results;
}

export function calculateWMA(data: OHLCV[], period: number): SMAResult[] {
  const results: SMAResult[] = [];
  const weightSum = (period * (period + 1)) / 2;
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close * (period - j);
    }
    results.push({
      timestamp: data[i].timestamp,
      value: sum / weightSum,
    });
  }
  
  return results;
}

// ============================================================================
// VOLATILITY INDICATORS
// ============================================================================

export function calculateBollingerBands(
  data: OHLCV[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult[] {
  const results: BollingerBandsResult[] = [];
  const sma = calculateSMA(data, period);
  
  for (let i = period - 1; i < data.length; i++) {
    const smaIndex = i - (period - 1);
    const middle = sma[smaIndex].value;
    
    // Calculate standard deviation
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      sumSquares += Math.pow(data[i - j].close - middle, 2);
    }
    const std = Math.sqrt(sumSquares / period);
    
    const upper = middle + stdDev * std;
    const lower = middle - stdDev * std;
    const bandwidth = (upper - lower) / middle * 100;
    const percentB = (data[i].close - lower) / (upper - lower) * 100;
    
    results.push({
      timestamp: data[i].timestamp,
      upper,
      middle,
      lower,
      bandwidth,
      percentB,
    });
  }
  
  return results;
}

export function calculateATR(data: OHLCV[], period: number = 14): ATRResult[] {
  const results: ATRResult[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
    
    if (trueRanges.length >= period) {
      const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
      results.push({
        timestamp: data[i].timestamp,
        value: atr,
      });
    }
  }
  
  return results;
}

// ============================================================================
// MOMENTUM INDICATORS
// ============================================================================

export function calculateRSI(data: OHLCV[], period: number = 14): RSIResult[] {
  const results: RSIResult[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    
    if (gains.length >= period) {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      results.push({
        timestamp: data[i].timestamp,
        value: rsi,
        overbought: rsi >= 70,
        oversold: rsi <= 30,
      });
    }
  }
  
  return results;
}

export function calculateMACD(
  data: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  const results: MACDResult[] = [];
  
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // Align the data
  const offset = slowPeriod - fastPeriod;
  const macdLine: { timestamp: number; value: number }[] = [];
  
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push({
      timestamp: slowEMA[i].timestamp,
      value: fastEMA[i + offset].value - slowEMA[i].value,
    });
  }
  
  // Calculate signal line (EMA of MACD)
  if (macdLine.length >= signalPeriod) {
    const multiplier = 2 / (signalPeriod + 1);
    let signal = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b.value, 0) / signalPeriod;
    
    for (let i = signalPeriod - 1; i < macdLine.length; i++) {
      if (i >= signalPeriod) {
        signal = (macdLine[i].value - signal) * multiplier + signal;
      }
      
      const histogram = macdLine[i].value - signal;
      const prevHistogram = i > signalPeriod - 1 ? macdLine[i - 1].value - signal : histogram;
      
      results.push({
        timestamp: macdLine[i].timestamp,
        macd: macdLine[i].value,
        signal,
        histogram,
        bullish: histogram > 0 && histogram > prevHistogram,
      });
    }
  }
  
  return results;
}

export function calculateStochastic(
  data: OHLCV[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult[] {
  const results: StochasticResult[] = [];
  const kValues: number[] = [];
  
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    const close = data[i].close;
    
    const k = high === low ? 50 : ((close - low) / (high - low)) * 100;
    kValues.push(k);
    
    if (kValues.length >= dPeriod) {
      const d = kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod;
      
      results.push({
        timestamp: data[i].timestamp,
        k,
        d,
        overbought: k >= 80,
        oversold: k <= 20,
      });
    }
  }
  
  return results;
}

// ============================================================================
// TREND INDICATORS
// ============================================================================

export function calculateADX(data: OHLCV[], period: number = 14): ADXResult[] {
  const results: ADXResult[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];
  const trs: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevHigh = data[i - 1].high;
    const prevLow = data[i - 1].low;
    const prevClose = data[i - 1].close;
    
    const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
    const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
    trs.push(tr);
    
    if (plusDMs.length >= period) {
      const smoothedPlusDM = plusDMs.slice(-period).reduce((a, b) => a + b, 0);
      const smoothedMinusDM = minusDMs.slice(-period).reduce((a, b) => a + b, 0);
      const smoothedTR = trs.slice(-period).reduce((a, b) => a + b, 0);
      
      const plusDI = (smoothedPlusDM / smoothedTR) * 100;
      const minusDI = (smoothedMinusDM / smoothedTR) * 100;
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
      
      // Calculate ADX (smoothed DX)
      const adx = dx; // Simplified - would use smoothed average in production
      
      let trend: 'strong' | 'weak' | 'none' = 'none';
      if (adx >= 25) trend = 'strong';
      else if (adx >= 20) trend = 'weak';
      
      results.push({
        timestamp: data[i].timestamp,
        adx,
        plusDI,
        minusDI,
        trend,
      });
    }
  }
  
  return results;
}

export function calculateIchimoku(
  data: OHLCV[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52
): IchimokuResult[] {
  const results: IchimokuResult[] = [];
  
  const getHighLow = (slice: OHLCV[]) => ({
    high: Math.max(...slice.map(d => d.high)),
    low: Math.min(...slice.map(d => d.low)),
  });
  
  for (let i = senkouBPeriod - 1; i < data.length; i++) {
    const tenkanHL = getHighLow(data.slice(i - tenkanPeriod + 1, i + 1));
    const kijunHL = getHighLow(data.slice(i - kijunPeriod + 1, i + 1));
    const senkouBHL = getHighLow(data.slice(i - senkouBPeriod + 1, i + 1));
    
    const tenkan = (tenkanHL.high + tenkanHL.low) / 2;
    const kijun = (kijunHL.high + kijunHL.low) / 2;
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = (senkouBHL.high + senkouBHL.low) / 2;
    const chikou = data[i].close;
    
    results.push({
      timestamp: data[i].timestamp,
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou,
    });
  }
  
  return results;
}

// ============================================================================
// VOLUME INDICATORS
// ============================================================================

export function calculateVWAP(data: OHLCV[], stdDevBands: number = 2): VWAPResult[] {
  const results: VWAPResult[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  const tpvList: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    const tpv = typicalPrice * data[i].volume;
    
    cumulativeTPV += tpv;
    cumulativeVolume += data[i].volume;
    tpvList.push(typicalPrice);
    
    const vwap = cumulativeTPV / cumulativeVolume;
    
    // Calculate standard deviation for bands
    const mean = tpvList.reduce((a, b) => a + b, 0) / tpvList.length;
    const variance = tpvList.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / tpvList.length;
    const std = Math.sqrt(variance);
    
    results.push({
      timestamp: data[i].timestamp,
      vwap,
      upperBand: vwap + stdDevBands * std,
      lowerBand: vwap - stdDevBands * std,
    });
  }
  
  return results;
}

export function calculateOBV(data: OHLCV[]): { timestamp: number; value: number }[] {
  const results: { timestamp: number; value: number }[] = [];
  let obv = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i > 0) {
      if (data[i].close > data[i - 1].close) {
        obv += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        obv -= data[i].volume;
      }
    }
    
    results.push({
      timestamp: data[i].timestamp,
      value: obv,
    });
  }
  
  return results;
}

// ============================================================================
// SUPPORT/RESISTANCE
// ============================================================================

export function calculatePivotPoints(data: OHLCV): PivotPointsResult {
  const pivot = (data.high + data.low + data.close) / 3;
  
  return {
    pivot,
    r1: 2 * pivot - data.low,
    r2: pivot + (data.high - data.low),
    r3: data.high + 2 * (pivot - data.low),
    s1: 2 * pivot - data.high,
    s2: pivot - (data.high - data.low),
    s3: data.low - 2 * (data.high - pivot),
  };
}

export function calculateFibonacciRetracement(
  high: number,
  low: number,
  isUptrend: boolean = true
): FibonacciLevels {
  const diff = high - low;
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  
  const levels = ratios.map(ratio => ({
    level: ratio,
    price: isUptrend ? high - diff * ratio : low + diff * ratio,
    label: `${(ratio * 100).toFixed(1)}%`,
  }));
  
  return { high, low, levels };
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

export interface CandlePattern {
  timestamp: number;
  pattern: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: 'low' | 'medium' | 'high';
}

export function detectCandlePatterns(data: OHLCV[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  
  for (let i = 2; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];
    const prev2 = data[i - 2];
    
    const body = Math.abs(current.close - current.open);
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const range = current.high - current.low;
    const isBullish = current.close > current.open;
    
    // Doji
    if (body < range * 0.1) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Doji',
        type: 'neutral',
        reliability: 'medium',
      });
    }
    
    // Hammer (bullish reversal)
    if (lowerWick > body * 2 && upperWick < body * 0.5 && !isBullish) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Hammer',
        type: 'bullish',
        reliability: 'high',
      });
    }
    
    // Shooting Star (bearish reversal)
    if (upperWick > body * 2 && lowerWick < body * 0.5 && isBullish) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Shooting Star',
        type: 'bearish',
        reliability: 'high',
      });
    }
    
    // Engulfing patterns
    const prevBody = Math.abs(prev.close - prev.open);
    const prevIsBullish = prev.close > prev.open;
    
    if (!prevIsBullish && isBullish && body > prevBody * 1.5 && 
        current.open < prev.close && current.close > prev.open) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Bullish Engulfing',
        type: 'bullish',
        reliability: 'high',
      });
    }
    
    if (prevIsBullish && !isBullish && body > prevBody * 1.5 &&
        current.open > prev.close && current.close < prev.open) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Bearish Engulfing',
        type: 'bearish',
        reliability: 'high',
      });
    }
    
    // Morning Star (3-candle bullish reversal)
    const prev2Body = Math.abs(prev2.close - prev2.open);
    const prev2IsBullish = prev2.close > prev2.open;
    
    if (!prev2IsBullish && prev2Body > range * 0.5 &&
        Math.abs(prev.close - prev.open) < prev2Body * 0.3 &&
        isBullish && current.close > (prev2.open + prev2.close) / 2) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Morning Star',
        type: 'bullish',
        reliability: 'high',
      });
    }
    
    // Evening Star (3-candle bearish reversal)
    if (prev2IsBullish && prev2Body > range * 0.5 &&
        Math.abs(prev.close - prev.open) < prev2Body * 0.3 &&
        !isBullish && current.close < (prev2.open + prev2.close) / 2) {
      patterns.push({
        timestamp: current.timestamp,
        pattern: 'Evening Star',
        type: 'bearish',
        reliability: 'high',
      });
    }
  }
  
  return patterns;
}

// Export all types and functions
export default {
  calculateSMA,
  calculateEMA,
  calculateWMA,
  calculateBollingerBands,
  calculateATR,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateADX,
  calculateIchimoku,
  calculateVWAP,
  calculateOBV,
  calculatePivotPoints,
  calculateFibonacciRetracement,
  detectCandlePatterns,
};
