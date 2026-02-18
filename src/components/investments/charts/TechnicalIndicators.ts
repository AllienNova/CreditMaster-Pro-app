/**
 * Technical Indicators Calculator
 *
 * Implementation of common technical analysis indicators:
 * - Moving Averages (SMA, EMA)
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 */

import { CandleData } from "@/lib/investments/types/charting.types";
import { Time } from "lightweight-charts";

// ============================================================================
// TYPES
// ============================================================================

export interface IndicatorPoint {
  time: Time;
  value: number;
}

export interface MACDPoint {
  time: Time;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsPoint {
  time: Time;
  upper: number;
  middle: number;
  lower: number;
}

// ============================================================================
// SIMPLE MOVING AVERAGE (SMA)
// ============================================================================

export function calculateSMA(
  data: CandleData[],
  period: number,
): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: (data[i].timestamp / 1000) as Time,
      value: sum / period,
    });
  }

  return result;
}

// ============================================================================
// EXPONENTIAL MOVING AVERAGE (EMA)
// ============================================================================

export function calculateEMA(
  data: CandleData[],
  period: number,
): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (data.length < period) return result;

  const multiplier = 2 / (period + 1);

  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;

  result.push({
    time: (data[period - 1].timestamp / 1000) as Time,
    value: ema,
  });

  // Calculate EMA for remaining data
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({
      time: (data[i].timestamp / 1000) as Time,
      value: ema,
    });
  }

  return result;
}

// ============================================================================
// RELATIVE STRENGTH INDEX (RSI)
// ============================================================================

export function calculateRSI(
  data: CandleData[],
  period: number = 14,
): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (data.length < period + 1) return result;

  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial average gain/loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First RSI value
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: (data[period].timestamp / 1000) as Time,
    value: 100 - 100 / (1 + rs),
  });

  // Calculate RSI for remaining data using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: (data[i + 1].timestamp / 1000) as Time,
      value: 100 - 100 / (1 + rs),
    });
  }

  return result;
}

// ============================================================================
// MACD (Moving Average Convergence Divergence)
// ============================================================================

export function calculateMACD(
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): MACDPoint[] {
  const result: MACDPoint[] = [];

  if (data.length < slowPeriod + signalPeriod) return result;

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMAValues(
    data.map((d) => d.close),
    fastPeriod,
  );
  const slowEMA = calculateEMAValues(
    data.map((d) => d.close),
    slowPeriod,
  );

  // Calculate MACD line
  const macdLine: number[] = [];
  const startIndex = slowPeriod - 1;

  for (let i = startIndex; i < data.length; i++) {
    const fastIdx = i - (slowPeriod - fastPeriod);
    macdLine.push(fastEMA[fastIdx] - slowEMA[i - startIndex]);
  }

  // Calculate signal line (EMA of MACD)
  const signalLine = calculateEMAValues(macdLine, signalPeriod);

  // Build result
  for (let i = 0; i < signalLine.length; i++) {
    const dataIndex = startIndex + signalPeriod - 1 + i;
    const macdIdx = signalPeriod - 1 + i;

    result.push({
      time: (data[dataIndex].timestamp / 1000) as Time,
      macd: macdLine[macdIdx],
      signal: signalLine[i],
      histogram: macdLine[macdIdx] - signalLine[i],
    });
  }

  return result;
}

// ============================================================================
// BOLLINGER BANDS
// ============================================================================

export function calculateBollingerBands(
  data: CandleData[],
  period: number = 20,
  stdDevMultiplier: number = 2,
): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = [];

  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    // Calculate SMA (middle band)
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const sma = sum / period;

    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - sma;
      sumSquaredDiff += diff * diff;
    }
    const stdDev = Math.sqrt(sumSquaredDiff / period);

    // Calculate bands
    result.push({
      time: (data[i].timestamp / 1000) as Time,
      upper: sma + stdDevMultiplier * stdDev,
      middle: sma,
      lower: sma - stdDevMultiplier * stdDev,
    });
  }

  return result;
}

// ============================================================================
// ATR (Average True Range)
// ============================================================================

export function calculateATR(
  data: CandleData[],
  period: number = 14,
): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (data.length < period + 1) return result;

  // Calculate True Range values
  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const highLow = data[i].high - data[i].low;
    const highPrevClose = Math.abs(data[i].high - data[i - 1].close);
    const lowPrevClose = Math.abs(data[i].low - data[i - 1].close);
    trueRanges.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  // Calculate initial ATR (simple average)
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push({
    time: (data[period].timestamp / 1000) as Time,
    value: atr,
  });

  // Calculate smoothed ATR
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result.push({
      time: (data[i + 1].timestamp / 1000) as Time,
      value: atr,
    });
  }

  return result;
}

// ============================================================================
// VWAP (Volume Weighted Average Price)
// ============================================================================

export function calculateVWAP(data: CandleData[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  let cumulativeTPV = 0; // Cumulative Typical Price * Volume
  let cumulativeVolume = 0;

  for (const candle of data) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;

    result.push({
      time: (candle.timestamp / 1000) as Time,
      value:
        cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice,
    });
  }

  return result;
}

// ============================================================================
// STOCHASTIC OSCILLATOR
// ============================================================================

export interface StochasticPoint {
  time: Time;
  k: number;
  d: number;
}

export function calculateStochastic(
  data: CandleData[],
  kPeriod: number = 14,
  dPeriod: number = 3,
): StochasticPoint[] {
  const result: StochasticPoint[] = [];

  if (data.length < kPeriod + dPeriod) return result;

  // Calculate %K values
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < data.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, data[i - j].high);
      lowestLow = Math.min(lowestLow, data[i - j].low);
    }

    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100;
    kValues.push(k);
  }

  // Calculate %D (SMA of %K)
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    let dSum = 0;
    for (let j = 0; j < dPeriod; j++) {
      dSum += kValues[i - j];
    }

    const dataIndex = kPeriod - 1 + i;
    result.push({
      time: (data[dataIndex].timestamp / 1000) as Time,
      k: kValues[i],
      d: dSum / dPeriod,
    });
  }

  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateEMAValues(values: number[], period: number): number[] {
  const result: number[] = [];

  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);

  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  result.push(ema);

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}
