/**
 * Pattern Recognition Service
 *
 * Automatic detection of common chart patterns:
 * - Head and Shoulders (bullish/bearish)
 * - Double Top/Bottom
 * - Triangle Patterns (ascending, descending, symmetrical)
 * - Flag and Pennant patterns
 * - Cup and Handle
 * - Support/Resistance breakouts
 */

import { CandleData } from "../types/charting.types";

// ============================================================================
// TYPES
// ============================================================================

export type PatternType =
  | "head_and_shoulders"
  | "inverse_head_and_shoulders"
  | "double_top"
  | "double_bottom"
  | "triple_top"
  | "triple_bottom"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "bull_flag"
  | "bear_flag"
  | "bull_pennant"
  | "bear_pennant"
  | "cup_and_handle"
  | "rising_wedge"
  | "falling_wedge"
  | "rectangle"
  | "channel_up"
  | "channel_down";

export type PatternDirection = "bullish" | "bearish" | "neutral";
export type PatternStatus =
  | "forming"
  | "complete"
  | "confirmed"
  | "failed"
  | "invalidated";

export interface DetectedPattern {
  id: string;
  type: PatternType;
  direction: PatternDirection;
  status: PatternStatus;
  reliability: number; // 0-100
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  keyPoints: PatternPoint[];
  neckline?: TrendLine;
  priceTarget?: number;
  targetPercent?: number;
  stopLoss?: number;
  breakoutPrice?: number;
  description: string;
  tradingImplication: string;
}

export interface PatternPoint {
  index: number;
  timestamp: number;
  price: number;
  type: "peak" | "trough" | "breakout" | "support" | "resistance";
  label?: string;
}

export interface TrendLine {
  startPrice: number;
  endPrice: number;
  startIndex: number;
  endIndex: number;
  slope: number;
}

export interface PatternScanResult {
  symbol: string;
  timeframe: string;
  scannedAt: Date;
  patterns: DetectedPattern[];
  pivotPoints: PatternPoint[];
  supportLevels: number[];
  resistanceLevels: number[];
}

// ============================================================================
// PATTERN RECOGNITION SERVICE
// ============================================================================

export class PatternRecognitionService {
  private minPatternBars = 10;
  private maxPatternBars = 200;
  private pivotStrength = 3;

  // ============================================================================
  // MAIN SCAN METHOD
  // ============================================================================

  scanForPatterns(
    data: CandleData[],
    symbol: string = "",
    timeframe: string = "",
  ): PatternScanResult {
    const pivots = this.findPivotPoints(data);
    const patterns: DetectedPattern[] = [];

    // Detect various patterns
    patterns.push(...this.detectHeadAndShoulders(data, pivots));
    patterns.push(...this.detectDoublePatterns(data, pivots));
    patterns.push(...this.detectTriangles(data, pivots));
    patterns.push(...this.detectFlags(data, pivots));
    patterns.push(...this.detectWedges(data, pivots));
    patterns.push(...this.detectCupAndHandle(data, pivots));

    // Calculate support/resistance levels
    const { supports, resistances } = this.calculateSupportResistance(
      data,
      pivots,
    );

    return {
      symbol,
      timeframe,
      scannedAt: new Date(),
      patterns: patterns.sort((a, b) => b.reliability - a.reliability),
      pivotPoints: pivots,
      supportLevels: supports,
      resistanceLevels: resistances,
    };
  }

  // ============================================================================
  // PIVOT POINT DETECTION
  // ============================================================================

  findPivotPoints(data: CandleData[]): PatternPoint[] {
    const pivots: PatternPoint[] = [];
    const strength = this.pivotStrength;

    for (let i = strength; i < data.length - strength; i++) {
      const current = data[i];
      let isPeakHigh = true;
      let isTroughLow = true;

      for (let j = 1; j <= strength; j++) {
        if (
          data[i - j].high >= current.high ||
          data[i + j].high >= current.high
        ) {
          isPeakHigh = false;
        }
        if (data[i - j].low <= current.low || data[i + j].low <= current.low) {
          isTroughLow = false;
        }
      }

      if (isPeakHigh) {
        pivots.push({
          index: i,
          timestamp: current.timestamp,
          price: current.high,
          type: "peak",
        });
      }

      if (isTroughLow) {
        pivots.push({
          index: i,
          timestamp: current.timestamp,
          price: current.low,
          type: "trough",
        });
      }
    }

    return pivots.sort((a, b) => a.index - b.index);
  }

  // ============================================================================
  // HEAD AND SHOULDERS DETECTION
  // ============================================================================

  private detectHeadAndShoulders(
    data: CandleData[],
    pivots: PatternPoint[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const peaks = pivots.filter((p) => p.type === "peak");
    const troughs = pivots.filter((p) => p.type === "trough");

    // Need at least 3 peaks for H&S
    for (let i = 0; i < peaks.length - 2; i++) {
      const leftShoulder = peaks[i];
      const head = peaks[i + 1];
      const rightShoulder = peaks[i + 2];

      // Head must be higher than both shoulders
      if (head.price <= leftShoulder.price || head.price <= rightShoulder.price)
        continue;

      // Shoulders should be roughly equal height (within 5%)
      const shoulderDiff =
        Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;
      if (shoulderDiff > 0.05) continue;

      // Find neckline troughs
      const neckTroughs = troughs.filter(
        (t) => t.index > leftShoulder.index && t.index < rightShoulder.index,
      );
      if (neckTroughs.length < 2) continue;

      const necklinePrice =
        (neckTroughs[0].price + neckTroughs[neckTroughs.length - 1].price) / 2;
      const patternHeight = head.price - necklinePrice;
      const priceTarget = necklinePrice - patternHeight;

      // Calculate reliability based on symmetry and proportions
      const symmetryScore = 1 - shoulderDiff;
      const proportionScore = Math.min((patternHeight / head.price) * 10, 1);
      const reliability = Math.round(
        (symmetryScore * 0.5 + proportionScore * 0.5) * 100,
      );

      patterns.push({
        id: this.generateId(),
        type: "head_and_shoulders",
        direction: "bearish",
        status: this.determinePatternStatus(data, necklinePrice, "below"),
        reliability,
        startIndex: leftShoulder.index,
        endIndex: rightShoulder.index,
        startTime: leftShoulder.timestamp,
        endTime: rightShoulder.timestamp,
        keyPoints: [
          { ...leftShoulder, label: "Left Shoulder" },
          { ...head, label: "Head" },
          { ...rightShoulder, label: "Right Shoulder" },
          ...neckTroughs.map((t) => ({ ...t, label: "Neckline" })),
        ],
        neckline: {
          startPrice: neckTroughs[0].price,
          endPrice: neckTroughs[neckTroughs.length - 1].price,
          startIndex: neckTroughs[0].index,
          endIndex: neckTroughs[neckTroughs.length - 1].index,
          slope:
            (neckTroughs[neckTroughs.length - 1].price - neckTroughs[0].price) /
            (neckTroughs[neckTroughs.length - 1].index - neckTroughs[0].index),
        },
        priceTarget,
        targetPercent: ((necklinePrice - priceTarget) / necklinePrice) * 100,
        stopLoss: head.price * 1.02,
        breakoutPrice: necklinePrice,
        description:
          "Head and Shoulders pattern detected - bearish reversal signal",
        tradingImplication:
          "Consider short position on neckline break with target at measured move",
      });
    }

    // Inverse Head and Shoulders (bullish)
    for (let i = 0; i < troughs.length - 2; i++) {
      const leftShoulder = troughs[i];
      const head = troughs[i + 1];
      const rightShoulder = troughs[i + 2];

      if (head.price >= leftShoulder.price || head.price >= rightShoulder.price)
        continue;

      const shoulderDiff =
        Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;
      if (shoulderDiff > 0.05) continue;

      const neckPeaks = peaks.filter(
        (p) => p.index > leftShoulder.index && p.index < rightShoulder.index,
      );
      if (neckPeaks.length < 2) continue;

      const necklinePrice =
        (neckPeaks[0].price + neckPeaks[neckPeaks.length - 1].price) / 2;
      const patternHeight = necklinePrice - head.price;
      const priceTarget = necklinePrice + patternHeight;

      const symmetryScore = 1 - shoulderDiff;
      const proportionScore = Math.min((patternHeight / head.price) * 10, 1);
      const reliability = Math.round(
        (symmetryScore * 0.5 + proportionScore * 0.5) * 100,
      );

      patterns.push({
        id: this.generateId(),
        type: "inverse_head_and_shoulders",
        direction: "bullish",
        status: this.determinePatternStatus(data, necklinePrice, "above"),
        reliability,
        startIndex: leftShoulder.index,
        endIndex: rightShoulder.index,
        startTime: leftShoulder.timestamp,
        endTime: rightShoulder.timestamp,
        keyPoints: [
          { ...leftShoulder, label: "Left Shoulder" },
          { ...head, label: "Head" },
          { ...rightShoulder, label: "Right Shoulder" },
          ...neckPeaks.map((p) => ({ ...p, label: "Neckline" })),
        ],
        priceTarget,
        targetPercent: ((priceTarget - necklinePrice) / necklinePrice) * 100,
        stopLoss: head.price * 0.98,
        breakoutPrice: necklinePrice,
        description:
          "Inverse Head and Shoulders pattern detected - bullish reversal signal",
        tradingImplication:
          "Consider long position on neckline break with target at measured move",
      });
    }

    return patterns;
  }

  // ============================================================================
  // DOUBLE TOP/BOTTOM DETECTION
  // ============================================================================

  private detectDoublePatterns(
    data: CandleData[],
    pivots: PatternPoint[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const peaks = pivots.filter((p) => p.type === "peak");
    const troughs = pivots.filter((p) => p.type === "trough");

    // Double Top
    for (let i = 0; i < peaks.length - 1; i++) {
      const firstPeak = peaks[i];
      const secondPeak = peaks[i + 1];

      // Peaks should be roughly equal (within 3%)
      const priceDiff =
        Math.abs(firstPeak.price - secondPeak.price) / firstPeak.price;
      if (priceDiff > 0.03) continue;

      // Find the trough between peaks
      const middleTrough = troughs.find(
        (t) => t.index > firstPeak.index && t.index < secondPeak.index,
      );
      if (!middleTrough) continue;

      // Trough should be significantly lower (at least 3%)
      const retracement =
        (firstPeak.price - middleTrough.price) / firstPeak.price;
      if (retracement < 0.03) continue;

      const necklinePrice = middleTrough.price;
      const patternHeight = firstPeak.price - necklinePrice;
      const priceTarget = necklinePrice - patternHeight;

      patterns.push({
        id: this.generateId(),
        type: "double_top",
        direction: "bearish",
        status: this.determinePatternStatus(data, necklinePrice, "below"),
        reliability: Math.round((1 - priceDiff) * 100),
        startIndex: firstPeak.index,
        endIndex: secondPeak.index,
        startTime: firstPeak.timestamp,
        endTime: secondPeak.timestamp,
        keyPoints: [
          { ...firstPeak, label: "First Top" },
          { ...middleTrough, label: "Neckline" },
          { ...secondPeak, label: "Second Top" },
        ],
        priceTarget,
        targetPercent: ((necklinePrice - priceTarget) / necklinePrice) * 100,
        stopLoss: Math.max(firstPeak.price, secondPeak.price) * 1.02,
        breakoutPrice: necklinePrice,
        description: "Double Top pattern detected - bearish reversal signal",
        tradingImplication: "Consider short position on neckline break",
      });
    }

    // Double Bottom
    for (let i = 0; i < troughs.length - 1; i++) {
      const firstTrough = troughs[i];
      const secondTrough = troughs[i + 1];

      const priceDiff =
        Math.abs(firstTrough.price - secondTrough.price) / firstTrough.price;
      if (priceDiff > 0.03) continue;

      const middlePeak = peaks.find(
        (p) => p.index > firstTrough.index && p.index < secondTrough.index,
      );
      if (!middlePeak) continue;

      const retracement =
        (middlePeak.price - firstTrough.price) / firstTrough.price;
      if (retracement < 0.03) continue;

      const necklinePrice = middlePeak.price;
      const patternHeight = necklinePrice - firstTrough.price;
      const priceTarget = necklinePrice + patternHeight;

      patterns.push({
        id: this.generateId(),
        type: "double_bottom",
        direction: "bullish",
        status: this.determinePatternStatus(data, necklinePrice, "above"),
        reliability: Math.round((1 - priceDiff) * 100),
        startIndex: firstTrough.index,
        endIndex: secondTrough.index,
        startTime: firstTrough.timestamp,
        endTime: secondTrough.timestamp,
        keyPoints: [
          { ...firstTrough, label: "First Bottom" },
          { ...middlePeak, label: "Neckline" },
          { ...secondTrough, label: "Second Bottom" },
        ],
        priceTarget,
        targetPercent: ((priceTarget - necklinePrice) / necklinePrice) * 100,
        stopLoss: Math.min(firstTrough.price, secondTrough.price) * 0.98,
        breakoutPrice: necklinePrice,
        description: "Double Bottom pattern detected - bullish reversal signal",
        tradingImplication: "Consider long position on neckline break",
      });
    }

    return patterns;
  }

  // ============================================================================
  // TRIANGLE PATTERN DETECTION
  // ============================================================================

  private detectTriangles(
    data: CandleData[],
    pivots: PatternPoint[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const peaks = pivots.filter((p) => p.type === "peak");
    const troughs = pivots.filter((p) => p.type === "trough");

    if (peaks.length < 2 || troughs.length < 2) return patterns;

    for (let i = 0; i < peaks.length - 1; i++) {
      const upperLine = this.calculateTrendLine(peaks.slice(i, i + 2));

      for (let j = 0; j < troughs.length - 1; j++) {
        const lowerLine = this.calculateTrendLine(troughs.slice(j, j + 2));

        if (!this.areLinesConverging(upperLine, lowerLine)) continue;

        const triangleType = this.classifyTriangle(
          upperLine.slope,
          lowerLine.slope,
        );
        if (!triangleType) continue;

        const startIndex = Math.min(peaks[i].index, troughs[j].index);
        const endIndex = Math.max(peaks[i + 1].index, troughs[j + 1].index);
        const patternHeight = peaks[i].price - troughs[j].price;

        const direction: PatternDirection =
          triangleType === "ascending_triangle"
            ? "bullish"
            : triangleType === "descending_triangle"
              ? "bearish"
              : "neutral";

        patterns.push({
          id: this.generateId(),
          type: triangleType,
          direction,
          status: "forming",
          reliability: 70,
          startIndex,
          endIndex,
          startTime: data[startIndex].timestamp,
          endTime: data[endIndex].timestamp,
          keyPoints: [peaks[i], peaks[i + 1], troughs[j], troughs[j + 1]],
          priceTarget:
            direction === "bullish"
              ? peaks[i].price + patternHeight
              : direction === "bearish"
                ? troughs[j].price - patternHeight
                : undefined,
          description: `${triangleType.replace(/_/g, " ")} pattern forming`,
          tradingImplication: `Watch for breakout ${direction === "bullish" ? "above resistance" : "below support"}`,
        });
      }
    }

    return patterns;
  }

  // ============================================================================
  // FLAG PATTERN DETECTION
  // ============================================================================

  private detectFlags(
    data: CandleData[],
    pivots: PatternPoint[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    for (let i = 20; i < data.length - 10; i++) {
      const poleStart = i - 20;
      const poleEnd = i;
      const poleMove =
        (data[poleEnd].close - data[poleStart].close) / data[poleStart].close;

      if (Math.abs(poleMove) < 0.05) continue;

      const flagData = data.slice(poleEnd, Math.min(poleEnd + 15, data.length));
      const flagRange = this.calculateRange(flagData);
      const avgRange = Math.abs(data[poleEnd].close - data[poleStart].close);

      if (flagRange > avgRange * 0.5) continue;

      const isBullish = poleMove > 0;
      const type: PatternType = isBullish ? "bull_flag" : "bear_flag";
      const priceTarget = isBullish
        ? data[poleEnd].close +
          Math.abs(data[poleEnd].close - data[poleStart].close)
        : data[poleEnd].close -
          Math.abs(data[poleEnd].close - data[poleStart].close);

      patterns.push({
        id: this.generateId(),
        type,
        direction: isBullish ? "bullish" : "bearish",
        status: "forming",
        reliability: 65,
        startIndex: poleStart,
        endIndex: Math.min(poleEnd + 15, data.length - 1),
        startTime: data[poleStart].timestamp,
        endTime: data[Math.min(poleEnd + 15, data.length - 1)].timestamp,
        keyPoints: [],
        priceTarget,
        targetPercent: Math.abs(poleMove) * 100,
        description: `${isBullish ? "Bull" : "Bear"} Flag pattern - continuation signal`,
        tradingImplication: `Watch for breakout in ${isBullish ? "upward" : "downward"} direction`,
      });
    }

    return patterns;
  }

  // ============================================================================
  // WEDGE PATTERN DETECTION
  // ============================================================================

  private detectWedges(
    data: CandleData[],
    pivots: PatternPoint[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const peaks = pivots.filter((p) => p.type === "peak");
    const troughs = pivots.filter((p) => p.type === "trough");

    if (peaks.length < 2 || troughs.length < 2) return patterns;

    for (let i = 0; i < peaks.length - 1; i++) {
      const upperLine = this.calculateTrendLine(peaks.slice(i, i + 2));

      for (let j = 0; j < troughs.length - 1; j++) {
        const lowerLine = this.calculateTrendLine(troughs.slice(j, j + 2));

        if (Math.sign(upperLine.slope) !== Math.sign(lowerLine.slope)) continue;
        if (!this.areLinesConverging(upperLine, lowerLine)) continue;

        const isRising = upperLine.slope > 0;
        const type: PatternType = isRising ? "rising_wedge" : "falling_wedge";
        const direction: PatternDirection = isRising ? "bearish" : "bullish";

        patterns.push({
          id: this.generateId(),
          type,
          direction,
          status: "forming",
          reliability: 60,
          startIndex: Math.min(peaks[i].index, troughs[j].index),
          endIndex: Math.max(peaks[i + 1].index, troughs[j + 1].index),
          startTime: data[Math.min(peaks[i].index, troughs[j].index)].timestamp,
          endTime:
            data[Math.max(peaks[i + 1].index, troughs[j + 1].index)].timestamp,
          keyPoints: [peaks[i], peaks[i + 1], troughs[j], troughs[j + 1]],
          description: `${type.replace(/_/g, " ")} pattern - ${direction} signal`,
          tradingImplication: `${isRising ? "Rising wedge typically breaks down" : "Falling wedge typically breaks up"}`,
        });
      }
    }

    return patterns;
  }

  // ============================================================================
  // CUP AND HANDLE DETECTION
  // ============================================================================

  private detectCupAndHandle(
    data: CandleData[],
    pivots: PatternPoint[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const troughs = pivots.filter((p) => p.type === "trough");

    for (let i = 0; i < troughs.length - 2; i++) {
      const cupBottom = troughs[i];

      const leftRim = data
        .slice(Math.max(0, cupBottom.index - 30), cupBottom.index)
        .reduce(
          (max, d, idx) =>
            d.high > max.high
              ? { high: d.high, idx: cupBottom.index - 30 + idx }
              : max,
          { high: 0, idx: 0 },
        );

      const rightRim = data
        .slice(cupBottom.index, Math.min(data.length, cupBottom.index + 30))
        .reduce(
          (max, d, idx) =>
            d.high > max.high
              ? { high: d.high, idx: cupBottom.index + idx }
              : max,
          { high: 0, idx: 0 },
        );

      if (Math.abs(leftRim.high - rightRim.high) / leftRim.high > 0.05)
        continue;

      const cupDepth = (leftRim.high - cupBottom.price) / leftRim.high;
      if (cupDepth < 0.12 || cupDepth > 0.33) continue;

      const handleData = data.slice(
        rightRim.idx,
        Math.min(data.length, rightRim.idx + 15),
      );
      if (handleData.length < 5) continue;

      const handleLow = Math.min(...handleData.map((d) => d.low));
      const handleDepth = (rightRim.high - handleLow) / rightRim.high;

      if (handleDepth > cupDepth * 0.5) continue;

      const priceTarget = rightRim.high + (rightRim.high - cupBottom.price);

      patterns.push({
        id: this.generateId(),
        type: "cup_and_handle",
        direction: "bullish",
        status: "forming",
        reliability: 75,
        startIndex: leftRim.idx,
        endIndex: rightRim.idx + handleData.length - 1,
        startTime: data[leftRim.idx].timestamp,
        endTime: handleData[handleData.length - 1].timestamp,
        keyPoints: [
          {
            index: leftRim.idx,
            timestamp: data[leftRim.idx].timestamp,
            price: leftRim.high,
            type: "resistance",
            label: "Left Rim",
          },
          { ...cupBottom, label: "Cup Bottom" },
          {
            index: rightRim.idx,
            timestamp: data[rightRim.idx].timestamp,
            price: rightRim.high,
            type: "resistance",
            label: "Right Rim",
          },
        ],
        priceTarget,
        targetPercent: ((priceTarget - rightRim.high) / rightRim.high) * 100,
        breakoutPrice: rightRim.high,
        description: "Cup and Handle pattern - strong bullish continuation",
        tradingImplication:
          "Consider long on breakout above rim with target at measured move",
      });
    }

    return patterns;
  }

  // ============================================================================
  // SUPPORT/RESISTANCE CALCULATION
  // ============================================================================

  private calculateSupportResistance(
    data: CandleData[],
    pivots: PatternPoint[],
  ): { supports: number[]; resistances: number[] } {
    const peaks = pivots.filter((p) => p.type === "peak").map((p) => p.price);
    const troughs = pivots
      .filter((p) => p.type === "trough")
      .map((p) => p.price);

    // Cluster nearby levels
    const resistances = this.clusterLevels(peaks, 0.02);
    const supports = this.clusterLevels(troughs, 0.02);

    return {
      supports: supports.slice(0, 5),
      resistances: resistances.slice(0, 5),
    };
  }

  private clusterLevels(prices: number[], threshold: number): number[] {
    if (prices.length === 0) return [];

    const sorted = [...prices].sort((a, b) => b - a);
    const clusters: number[][] = [];

    for (const price of sorted) {
      const existingCluster = clusters.find(
        (c) => Math.abs(c[0] - price) / c[0] <= threshold,
      );

      if (existingCluster) {
        existingCluster.push(price);
      } else {
        clusters.push([price]);
      }
    }

    // Return average of each cluster, sorted by cluster size (most touches first)
    return clusters
      .sort((a, b) => b.length - a.length)
      .map((c) => c.reduce((sum, p) => sum + p, 0) / c.length);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateTrendLine(points: PatternPoint[]): TrendLine {
    if (points.length < 2) {
      return {
        startPrice: 0,
        endPrice: 0,
        startIndex: 0,
        endIndex: 0,
        slope: 0,
      };
    }

    const start = points[0];
    const end = points[points.length - 1];
    const slope = (end.price - start.price) / (end.index - start.index);

    return {
      startPrice: start.price,
      endPrice: end.price,
      startIndex: start.index,
      endIndex: end.index,
      slope,
    };
  }

  private areLinesConverging(upper: TrendLine, lower: TrendLine): boolean {
    // Lines converge if upper slope is less than lower slope
    return upper.slope < lower.slope;
  }

  private classifyTriangle(
    upperSlope: number,
    lowerSlope: number,
  ): PatternType | null {
    const flatThreshold = 0.001;

    const upperFlat = Math.abs(upperSlope) < flatThreshold;
    const lowerFlat = Math.abs(lowerSlope) < flatThreshold;

    if (upperFlat && lowerSlope > 0) return "ascending_triangle";
    if (lowerFlat && upperSlope < 0) return "descending_triangle";
    if (upperSlope < 0 && lowerSlope > 0) return "symmetrical_triangle";

    return null;
  }

  private calculateRange(data: CandleData[]): number {
    if (data.length === 0) return 0;
    const high = Math.max(...data.map((d) => d.high));
    const low = Math.min(...data.map((d) => d.low));
    return high - low;
  }

  private determinePatternStatus(
    data: CandleData[],
    breakoutLevel: number,
    breakDirection: "above" | "below",
  ): PatternStatus {
    const lastPrice = data[data.length - 1]?.close;
    if (!lastPrice) return "forming";

    if (breakDirection === "above" && lastPrice > breakoutLevel) {
      return "confirmed";
    }
    if (breakDirection === "below" && lastPrice < breakoutLevel) {
      return "confirmed";
    }

    return "complete";
  }

  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let patternServiceInstance: PatternRecognitionService | null = null;

export function getPatternRecognitionService(): PatternRecognitionService {
  if (!patternServiceInstance) {
    patternServiceInstance = new PatternRecognitionService();
  }
  return patternServiceInstance;
}

// Pattern metadata for UI
export const PATTERN_INFO: Record<
  PatternType,
  { name: string; description: string; reliability: string }
> = {
  head_and_shoulders: {
    name: "Head & Shoulders",
    description:
      "Bearish reversal pattern with three peaks, middle being highest",
    reliability: "High (83%)",
  },
  inverse_head_and_shoulders: {
    name: "Inverse H&S",
    description:
      "Bullish reversal pattern with three troughs, middle being lowest",
    reliability: "High (83%)",
  },
  double_top: {
    name: "Double Top",
    description: "Bearish reversal with two roughly equal peaks",
    reliability: "High (75%)",
  },
  double_bottom: {
    name: "Double Bottom",
    description: "Bullish reversal with two roughly equal troughs",
    reliability: "High (78%)",
  },
  triple_top: {
    name: "Triple Top",
    description: "Bearish reversal with three roughly equal peaks",
    reliability: "Very High (87%)",
  },
  triple_bottom: {
    name: "Triple Bottom",
    description: "Bullish reversal with three roughly equal troughs",
    reliability: "Very High (87%)",
  },
  ascending_triangle: {
    name: "Ascending Triangle",
    description: "Bullish continuation with flat resistance and rising support",
    reliability: "High (75%)",
  },
  descending_triangle: {
    name: "Descending Triangle",
    description:
      "Bearish continuation with flat support and falling resistance",
    reliability: "High (72%)",
  },
  symmetrical_triangle: {
    name: "Symmetrical Triangle",
    description: "Neutral pattern that can break either direction",
    reliability: "Medium (65%)",
  },
  bull_flag: {
    name: "Bull Flag",
    description: "Bullish continuation after strong upward move",
    reliability: "High (70%)",
  },
  bear_flag: {
    name: "Bear Flag",
    description: "Bearish continuation after strong downward move",
    reliability: "High (67%)",
  },
  bull_pennant: {
    name: "Bull Pennant",
    description: "Bullish continuation with converging trendlines after rally",
    reliability: "High (70%)",
  },
  bear_pennant: {
    name: "Bear Pennant",
    description: "Bearish continuation with converging trendlines after drop",
    reliability: "High (67%)",
  },
  cup_and_handle: {
    name: "Cup & Handle",
    description: "Bullish continuation with rounded bottom and small pullback",
    reliability: "Very High (85%)",
  },
  rising_wedge: {
    name: "Rising Wedge",
    description: "Bearish pattern with converging upward trendlines",
    reliability: "High (72%)",
  },
  falling_wedge: {
    name: "Falling Wedge",
    description: "Bullish pattern with converging downward trendlines",
    reliability: "High (74%)",
  },
  rectangle: {
    name: "Rectangle",
    description: "Consolidation pattern with horizontal support and resistance",
    reliability: "Medium (65%)",
  },
  channel_up: {
    name: "Channel Up",
    description: "Bullish trend with parallel ascending trendlines",
    reliability: "Medium (60%)",
  },
  channel_down: {
    name: "Channel Down",
    description: "Bearish trend with parallel descending trendlines",
    reliability: "Medium (60%)",
  },
};
