/**
 * PCTT Mobile Screen
 *
 * Mobile-optimized visualization for Pivot-Constrained Trendline Trading:
 * - Candlestick chart with support/resistance lines
 * - Pivot markers
 * - Regime indicators
 * - Event state display
 * - Signal alerts with trade setup
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import Svg, {
  Rect,
  Line,
  Circle,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

// ============================================================================
// TYPES
// ============================================================================

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Pivot {
  index: number;
  price: number;
  type: "high" | "low";
}

interface BoundaryLine {
  slope: number;
  intercept: number;
  qScore: number;
  touches: number;
}

interface StructureObject {
  support: BoundaryLine | null;
  resistance: BoundaryLine | null;
  regime: "trend_up" | "trend_down" | "range" | "transition";
  event: string;
  atr: number;
  efficiencyRatio: number;
  distanceToSupport: number;
  distanceToResistance: number;
}

interface PCTTSignal {
  type: "long" | "short";
  entryPrice: number;
  stopPrice: number;
  targetPrices: number[];
  qScore: number;
  riskReward: number;
}

export interface PCTTScreenProps {
  symbol?: string;
  data?: OHLCV[];
  onBuy?: (signal: PCTTSignal) => void;
  onSell?: (signal: PCTTSignal) => void;
  showAIExplanation?: boolean;
}

// AI Explanation Types
interface AIExplanation {
  summary: string;
  narrative: string;
  confidence: number;
  factors: {
    name: string;
    value: string;
    impact: "positive" | "negative" | "neutral";
    explanation: string;
  }[];
  risks: { level: string; description: string }[];
  watchingFor: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 300;
const CHART_PADDING = { top: 20, right: 50, bottom: 30, left: 10 };

const COLORS = {
  background: "#0f0f1a",
  card: "#1a1a2e",
  cardBorder: "#2d2d44",
  text: "#e5e5e5",
  textSecondary: "#9ca3af",
  green: "#26a69a",
  red: "#ef5350",
  support: "#26a69a",
  resistance: "#ef5350",
  pivotHigh: "#ff9800",
  pivotLow: "#2196f3",
  qHigh: "#4caf50",
  qMed: "#ff9800",
  qLow: "#f44336",
  trendUp: "rgba(38, 166, 154, 0.2)",
  trendDown: "rgba(239, 83, 80, 0.2)",
  range: "rgba(158, 158, 158, 0.2)",
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

function generateMockData(bars: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 150;
  const now = Date.now();

  for (let i = 0; i < bars; i++) {
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    const open = price;
    const close = price + change;
    const high =
      Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low =
      Math.min(open, close) - Math.random() * volatility * price * 0.5;

    data.push({
      time: now - (bars - i) * 86400000,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000,
    });

    price = close;
  }

  return data;
}

function extractPivots(data: OHLCV[], depth: number = 5): Pivot[] {
  const pivots: Pivot[] = [];

  for (let i = depth; i < data.length - depth; i++) {
    let isPivotHigh = true;
    let isPivotLow = true;

    for (let j = i - depth; j <= i + depth; j++) {
      if (j === i) continue;
      if (data[j].high >= data[i].high) isPivotHigh = false;
      if (data[j].low <= data[i].low) isPivotLow = false;
    }

    if (isPivotHigh) {
      pivots.push({ index: i, price: data[i].high, type: "high" });
    }
    if (isPivotLow) {
      pivots.push({ index: i, price: data[i].low, type: "low" });
    }
  }

  return pivots;
}

function calculateATR(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 0;

  let sum = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close),
    );
    sum += tr;
  }

  return sum / period;
}

function estimateBoundary(
  pivots: Pivot[],
  type: "support" | "resistance",
  atr: number,
): BoundaryLine | null {
  const filtered = pivots
    .filter((p) => (type === "support" ? p.type === "low" : p.type === "high"))
    .slice(-10);

  if (filtered.length < 2) return null;

  let bestLine: BoundaryLine | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < filtered.length - 1; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const p1 = filtered[i];
      const p2 = filtered[j];

      const slope = (p2.price - p1.price) / (p2.index - p1.index);
      const intercept = p1.price - slope * p1.index;

      let touches = 0;
      const tolerance = 0.15 * atr;

      for (const p of filtered) {
        const linePrice = slope * p.index + intercept;
        if (Math.abs(p.price - linePrice) <= tolerance) {
          touches++;
        }
      }

      const score = touches - Math.abs(slope) / atr;

      if (score > bestScore) {
        bestScore = score;
        bestLine = {
          slope,
          intercept,
          qScore: 1 / (1 + Math.exp(-score)),
          touches,
        };
      }
    }
  }

  return bestLine;
}

function calculateER(data: OHLCV[], period: number = 20): number {
  if (data.length < period + 1) return 0.5;

  const priceChange = Math.abs(
    data[data.length - 1].close - data[data.length - period - 1].close,
  );

  let volatility = 0;
  for (let i = data.length - period; i < data.length; i++) {
    volatility += Math.abs(data[i].close - data[i - 1].close);
  }

  return volatility > 0 ? priceChange / volatility : 0;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PCTTScreen({
  symbol = "AAPL",
  data: propData,
  onBuy,
  onSell,
  showAIExplanation = true,
}: PCTTScreenProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [showPivots, setShowPivots] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [showExplanation, setShowExplanation] = useState(showAIExplanation);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  // Generate or use provided data
  const data = useMemo(() => propData || generateMockData(100), [propData]);

  // Calculate PCTT structure
  const { structure, pivots, signal } = useMemo(() => {
    const atr = calculateATR(data);
    const pivots = extractPivots(data, 5);
    const support = estimateBoundary(pivots, "support", atr);
    const resistance = estimateBoundary(pivots, "resistance", atr);
    const er = calculateER(data);

    const lastPrice = data[data.length - 1].close;
    const supportPrice = support
      ? support.slope * (data.length - 1) + support.intercept
      : 0;
    const resistancePrice = resistance
      ? resistance.slope * (data.length - 1) + resistance.intercept
      : Infinity;

    let regime: StructureObject["regime"] = "transition";
    if (er >= 0.5) {
      regime =
        lastPrice > data[data.length - 20]?.close ? "trend_up" : "trend_down";
    } else if (er < 0.3) {
      regime = "range";
    }

    // Check for signal (simplified)
    let signal: PCTTSignal | null = null;
    if (resistance && resistance.qScore >= 0.65) {
      const lastBar = data[data.length - 1];
      if (lastBar.close > resistancePrice && lastBar.low < resistancePrice) {
        const stopPrice = supportPrice - 0.5 * atr;
        const risk = lastBar.close - stopPrice;
        signal = {
          type: "long",
          entryPrice: lastBar.close,
          stopPrice,
          targetPrices: [
            lastBar.close + risk,
            lastBar.close + risk * 2,
            lastBar.close + risk * 3,
          ],
          qScore: resistance.qScore,
          riskReward: 2,
        };
      }
    }

    const structure: StructureObject = {
      support,
      resistance,
      regime,
      event: signal ? "entry_long" : "idle",
      atr,
      efficiencyRatio: er,
      distanceToSupport: atr > 0 ? (lastPrice - supportPrice) / atr : Infinity,
      distanceToResistance:
        atr > 0 ? (resistancePrice - lastPrice) / atr : Infinity,
    };

    return { structure, pivots, signal };
  }, [data]);

  // Generate AI Explanation
  const aiExplanation: AIExplanation = useMemo(() => {
    const factors: AIExplanation["factors"] = [];

    // Support quality factor
    if (structure.support) {
      factors.push({
        name: "Support Quality",
        value: `${(structure.support.qScore * 100).toFixed(0)}%`,
        impact:
          structure.support.qScore >= 0.65
            ? "positive"
            : structure.support.qScore >= 0.5
              ? "neutral"
              : "negative",
        explanation:
          structure.support.qScore >= 0.65
            ? "Strong support with multiple confirmed touches."
            : "Support structure needs more confirmation.",
      });
    }

    // Resistance quality factor
    if (structure.resistance) {
      factors.push({
        name: "Resistance Quality",
        value: `${(structure.resistance.qScore * 100).toFixed(0)}%`,
        impact:
          structure.resistance.qScore >= 0.65
            ? "positive"
            : structure.resistance.qScore >= 0.5
              ? "neutral"
              : "negative",
        explanation:
          structure.resistance.qScore >= 0.65
            ? "Strong resistance with reliable level."
            : "Resistance needs more price interaction.",
      });
    }

    // Regime factor
    factors.push({
      name: "Market Regime",
      value: structure.regime.replace("_", " "),
      impact:
        structure.regime === "transition"
          ? "negative"
          : structure.regime === "range"
            ? "neutral"
            : "positive",
      explanation:
        structure.regime === "trend_up"
          ? "Uptrend detected - favor long setups."
          : structure.regime === "trend_down"
            ? "Downtrend detected - favor short setups."
            : structure.regime === "range"
              ? "Range-bound market - trade bounces."
              : "Market direction unclear - use caution.",
    });

    // Efficiency factor
    factors.push({
      name: "Trend Efficiency",
      value: `${(structure.efficiencyRatio * 100).toFixed(0)}%`,
      impact:
        structure.efficiencyRatio >= 0.5
          ? "positive"
          : structure.efficiencyRatio >= 0.3
            ? "neutral"
            : "negative",
      explanation:
        structure.efficiencyRatio >= 0.5
          ? "Strong directional movement with low noise."
          : "Choppy price action - signals may whipsaw.",
    });

    // Calculate confidence
    const supportQ = structure.support?.qScore ?? 0;
    const resistanceQ = structure.resistance?.qScore ?? 0;
    const structureScore = ((supportQ + resistanceQ) / 2) * 100;
    const regimeScore = structure.regime.includes("trend")
      ? 80
      : structure.regime === "range"
        ? 60
        : 30;
    const efficiencyScore = structure.efficiencyRatio * 100;
    const confidence = Math.round(
      structureScore * 0.4 + regimeScore * 0.3 + efficiencyScore * 0.3,
    );

    // Identify risks
    const risks: AIExplanation["risks"] = [];
    if (structure.regime === "transition") {
      risks.push({
        level: "high",
        description: "Market in transition - direction unclear",
      });
    }
    if (structure.efficiencyRatio < 0.3) {
      risks.push({
        level: "medium",
        description: "Low trend efficiency - choppy conditions",
      });
    }
    if (supportQ < 0.5 && resistanceQ < 0.5) {
      risks.push({
        level: "high",
        description: "Weak structure quality on both levels",
      });
    }

    // What to watch
    const watchingFor: string[] = [];
    if (structure.event === "idle") {
      watchingFor.push("Break of support or resistance");
      watchingFor.push("Q-score improvement");
    } else if (structure.event.includes("freeze")) {
      watchingFor.push("Retest of broken level");
      watchingFor.push("Rejection candlestick");
    } else if (structure.event.includes("retest")) {
      watchingFor.push("Entry signal confirmation");
      watchingFor.push("Stop loss placement");
    }

    const eventDesc =
      structure.event === "idle"
        ? "Waiting for setup"
        : structure.event.replace("_", " ");

    return {
      summary: `${structure.regime.replace("_", " ")} market, ${eventDesc}. Confidence: ${confidence}%`,
      narrative:
        `The AI has detected a ${structure.regime.replace("_", " ")} market regime with ${(structure.efficiencyRatio * 100).toFixed(0)}% trend efficiency. ` +
        `Support quality is ${supportQ >= 0.65 ? "strong" : "moderate"} and resistance quality is ${resistanceQ >= 0.65 ? "strong" : "moderate"}. ` +
        `${risks.length > 0 ? `Key risks: ${risks.map((r) => r.description).join(", ")}.` : "No major risks identified."}`,
      confidence,
      factors,
      risks,
      watchingFor,
    };
  }, [structure]);

  // Chart calculations
  const chartWidth = SCREEN_WIDTH - 20;
  const chartInnerWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const chartInnerHeight =
    CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const visibleData = data.slice(-60);
  const candleWidth = (chartInnerWidth / visibleData.length) * 0.8;
  const candleGap = (chartInnerWidth / visibleData.length) * 0.2;

  const priceMin = Math.min(...visibleData.map((d) => d.low)) * 0.995;
  const priceMax = Math.max(...visibleData.map((d) => d.high)) * 1.005;
  const priceRange = priceMax - priceMin;

  const xScale = useCallback(
    (index: number) => {
      return (
        CHART_PADDING.left +
        (index / visibleData.length) * chartInnerWidth +
        candleWidth / 2
      );
    },
    [visibleData.length, chartInnerWidth, candleWidth],
  );

  const yScale = useCallback(
    (price: number) => {
      return (
        CHART_PADDING.top +
        (1 - (price - priceMin) / priceRange) * chartInnerHeight
      );
    },
    [priceMin, priceRange, chartInnerHeight],
  );

  const getQScoreColor = (q: number) => {
    if (q >= 0.7) return COLORS.qHigh;
    if (q >= 0.55) return COLORS.qMed;
    return COLORS.qLow;
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "trend_up":
        return COLORS.trendUp;
      case "trend_down":
        return COLORS.trendDown;
      case "range":
        return COLORS.range;
      default:
        return "transparent";
    }
  };

  const handleSignalAction = (action: "buy" | "sell") => {
    if (!signal) return;

    Alert.alert(
      `Confirm ${action.toUpperCase()}`,
      `${action === "buy" ? "Long" : "Short"} ${symbol}\n` +
        `Entry: $${signal.entryPrice.toFixed(2)}\n` +
        `Stop: $${signal.stopPrice.toFixed(2)}\n` +
        `Target: $${signal.targetPrices[1].toFixed(2)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () =>
            action === "buy" ? onBuy?.(signal) : onSell?.(signal),
        },
      ],
    );
  };

  const timeframes = ["1H", "4H", "1D", "1W"];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.price}>
            ${data[data.length - 1].close.toFixed(2)}
          </Text>
        </View>
        <View style={styles.regimeBadge}>
          <View
            style={[
              styles.regimeDot,
              { backgroundColor: getRegimeColor(structure.regime) },
            ]}
          />
          <Text style={styles.regimeText}>
            {structure.regime.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        {timeframes.map((tf) => (
          <TouchableOpacity
            key={tf}
            style={[
              styles.timeframeButton,
              selectedTimeframe === tf && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe(tf)}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === tf && styles.timeframeTextActive,
              ]}
            >
              {tf}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="supportGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.support} stopOpacity="0.3" />
              <Stop offset="1" stopColor={COLORS.support} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={chartWidth}
            height={CHART_HEIGHT}
            fill={COLORS.card}
          />

          {/* Grid Lines */}
          {[0.25, 0.5, 0.75].map((pct, i) => (
            <Line
              key={i}
              x1={CHART_PADDING.left}
              y1={CHART_PADDING.top + pct * chartInnerHeight}
              x2={chartWidth - CHART_PADDING.right}
              y2={CHART_PADDING.top + pct * chartInnerHeight}
              stroke={COLORS.cardBorder}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Candlesticks */}
          {visibleData.map((bar, i) => {
            const x = xScale(i);
            const isUp = bar.close >= bar.open;
            const color = isUp ? COLORS.green : COLORS.red;
            const bodyTop = yScale(Math.max(bar.open, bar.close));
            const bodyBottom = yScale(Math.min(bar.open, bar.close));
            const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

            return (
              <G key={i}>
                {/* Wick */}
                <Line
                  x1={x}
                  y1={yScale(bar.high)}
                  x2={x}
                  y2={yScale(bar.low)}
                  stroke={color}
                  strokeWidth={1}
                />
                {/* Body */}
                <Rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isUp ? color : color}
                  stroke={color}
                  strokeWidth={1}
                />
              </G>
            );
          })}

          {/* Support Line */}
          {structure.support && (
            <Line
              x1={CHART_PADDING.left}
              y1={yScale(
                structure.support.intercept +
                  structure.support.slope * (data.length - 60),
              )}
              x2={chartWidth - CHART_PADDING.right}
              y2={yScale(
                structure.support.intercept +
                  structure.support.slope * (data.length - 1),
              )}
              stroke={COLORS.support}
              strokeWidth={2}
            />
          )}

          {/* Resistance Line */}
          {structure.resistance && (
            <Line
              x1={CHART_PADDING.left}
              y1={yScale(
                structure.resistance.intercept +
                  structure.resistance.slope * (data.length - 60),
              )}
              x2={chartWidth - CHART_PADDING.right}
              y2={yScale(
                structure.resistance.intercept +
                  structure.resistance.slope * (data.length - 1),
              )}
              stroke={COLORS.resistance}
              strokeWidth={2}
            />
          )}

          {/* Pivot Markers */}
          {showPivots &&
            pivots.slice(-20).map((pivot, i) => {
              const dataIndex = pivot.index - (data.length - 60);
              if (dataIndex < 0 || dataIndex >= 60) return null;

              return (
                <Circle
                  key={i}
                  cx={xScale(dataIndex)}
                  cy={yScale(pivot.price)}
                  r={4}
                  fill={
                    pivot.type === "high" ? COLORS.pivotHigh : COLORS.pivotLow
                  }
                />
              );
            })}

          {/* Price Labels */}
          {[priceMin, (priceMin + priceMax) / 2, priceMax].map((price, i) => (
            <SvgText
              key={i}
              x={chartWidth - CHART_PADDING.right + 5}
              y={yScale(price) + 4}
              fill={COLORS.textSecondary}
              fontSize={10}
            >
              ${price.toFixed(2)}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Structure Info */}
      <View style={styles.structureCard}>
        <Text style={styles.cardTitle}>PCTT Structure</Text>

        <View style={styles.structureRow}>
          <View style={styles.structureItem}>
            <Text style={styles.structureLabel}>Support Q</Text>
            <Text
              style={[
                styles.structureValue,
                {
                  color: structure.support
                    ? getQScoreColor(structure.support.qScore)
                    : COLORS.textSecondary,
                },
              ]}
            >
              {structure.support
                ? `${(structure.support.qScore * 100).toFixed(0)}%`
                : "N/A"}
            </Text>
          </View>
          <View style={styles.structureItem}>
            <Text style={styles.structureLabel}>Resistance Q</Text>
            <Text
              style={[
                styles.structureValue,
                {
                  color: structure.resistance
                    ? getQScoreColor(structure.resistance.qScore)
                    : COLORS.textSecondary,
                },
              ]}
            >
              {structure.resistance
                ? `${(structure.resistance.qScore * 100).toFixed(0)}%`
                : "N/A"}
            </Text>
          </View>
          <View style={styles.structureItem}>
            <Text style={styles.structureLabel}>Efficiency</Text>
            <Text style={styles.structureValue}>
              {(structure.efficiencyRatio * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.structureRow}>
          <View style={styles.structureItem}>
            <Text style={styles.structureLabel}>ATR</Text>
            <Text style={styles.structureValue}>
              ${structure.atr.toFixed(2)}
            </Text>
          </View>
          <View style={styles.structureItem}>
            <Text style={styles.structureLabel}>Dist to Support</Text>
            <Text style={[styles.structureValue, { color: COLORS.green }]}>
              {structure.distanceToSupport.toFixed(1)}R
            </Text>
          </View>
          <View style={styles.structureItem}>
            <Text style={styles.structureLabel}>Dist to Resist</Text>
            <Text style={[styles.structureValue, { color: COLORS.red }]}>
              {structure.distanceToResistance.toFixed(1)}R
            </Text>
          </View>
        </View>

        <View style={styles.eventRow}>
          <Text style={styles.structureLabel}>Event State</Text>
          <View
            style={[
              styles.eventBadge,
              {
                backgroundColor: structure.event.includes("entry")
                  ? COLORS.green + "30"
                  : COLORS.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.eventText,
                {
                  color: structure.event.includes("entry")
                    ? COLORS.green
                    : COLORS.text,
                },
              ]}
            >
              {structure.event.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Signal Card */}
      {signal && showSignals && (
        <View
          style={[
            styles.signalCard,
            { borderColor: signal.type === "long" ? COLORS.green : COLORS.red },
          ]}
        >
          <View style={styles.signalHeader}>
            <Text
              style={[
                styles.signalType,
                { color: signal.type === "long" ? COLORS.green : COLORS.red },
              ]}
            >
              {signal.type.toUpperCase()} SIGNAL
            </Text>
            <Text style={styles.signalQ}>
              Q: {(signal.qScore * 100).toFixed(0)}%
            </Text>
          </View>

          <View style={styles.signalDetails}>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>Entry</Text>
              <Text style={styles.signalValue}>
                ${signal.entryPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>Stop</Text>
              <Text style={[styles.signalValue, { color: COLORS.red }]}>
                ${signal.stopPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>Target 1R</Text>
              <Text style={[styles.signalValue, { color: COLORS.green }]}>
                ${signal.targetPrices[0].toFixed(2)}
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>Target 2R</Text>
              <Text style={[styles.signalValue, { color: COLORS.green }]}>
                ${signal.targetPrices[1].toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.signalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.buyButton]}
              onPress={() => handleSignalAction("buy")}
            >
              <Text style={styles.actionButtonText}>EXECUTE LONG</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Explanation Card */}
      {showExplanation && (
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiTitle}>🤖 AI Analysis</Text>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor:
                    aiExplanation.confidence >= 70
                      ? COLORS.green + "30"
                      : aiExplanation.confidence >= 50
                        ? COLORS.qMed + "30"
                        : COLORS.red + "30",
                },
              ]}
            >
              <Text
                style={[
                  styles.confidenceText,
                  {
                    color:
                      aiExplanation.confidence >= 70
                        ? COLORS.green
                        : aiExplanation.confidence >= 50
                          ? COLORS.qMed
                          : COLORS.red,
                  },
                ]}
              >
                {aiExplanation.confidence}% Confidence
              </Text>
            </View>
          </View>

          <Text style={styles.aiSummary}>{aiExplanation.summary}</Text>

          <Text style={styles.aiNarrative}>{aiExplanation.narrative}</Text>

          {/* Decision Factors */}
          <Text style={styles.aiSectionTitle}>Decision Factors</Text>
          {aiExplanation.factors.map((factor, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.factorRow}
              onPress={() =>
                setExpandedFactor(
                  expandedFactor === factor.name ? null : factor.name,
                )
              }
            >
              <View style={styles.factorHeader}>
                <View
                  style={[
                    styles.impactDot,
                    {
                      backgroundColor:
                        factor.impact === "positive"
                          ? COLORS.green
                          : factor.impact === "negative"
                            ? COLORS.red
                            : COLORS.textSecondary,
                    },
                  ]}
                />
                <Text style={styles.factorName}>{factor.name}</Text>
                <Text
                  style={[
                    styles.factorValue,
                    {
                      color:
                        factor.impact === "positive"
                          ? COLORS.green
                          : factor.impact === "negative"
                            ? COLORS.red
                            : COLORS.text,
                    },
                  ]}
                >
                  {factor.value}
                </Text>
              </View>
              {expandedFactor === factor.name && (
                <Text style={styles.factorExplanation}>
                  {factor.explanation}
                </Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Risks */}
          {aiExplanation.risks.length > 0 && (
            <>
              <Text style={styles.aiSectionTitle}>⚠️ Risk Factors</Text>
              {aiExplanation.risks.map((risk, idx) => (
                <View key={idx} style={styles.riskRow}>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          risk.level === "high"
                            ? COLORS.red + "30"
                            : COLORS.qMed + "30",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskLevel,
                        {
                          color:
                            risk.level === "high" ? COLORS.red : COLORS.qMed,
                        },
                      ]}
                    >
                      {risk.level.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.riskDescription}>{risk.description}</Text>
                </View>
              ))}
            </>
          )}

          {/* What to Watch */}
          {aiExplanation.watchingFor.length > 0 && (
            <>
              <Text style={styles.aiSectionTitle}>👁️ Watching For</Text>
              {aiExplanation.watchingFor.map((item, idx) => (
                <View key={idx} style={styles.watchItem}>
                  <Text style={styles.watchBullet}>•</Text>
                  <Text style={styles.watchText}>{item}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Toggle Controls */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, showExplanation && styles.toggleActive]}
          onPress={() => setShowExplanation(!showExplanation)}
        >
          <Text
            style={[
              styles.toggleText,
              showExplanation && styles.toggleTextActive,
            ]}
          >
            🤖 AI
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, showPivots && styles.toggleActive]}
          onPress={() => setShowPivots(!showPivots)}
        >
          <Text
            style={[styles.toggleText, showPivots && styles.toggleTextActive]}
          >
            Pivots
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, showSignals && styles.toggleActive]}
          onPress={() => setShowSignals(!showSignals)}
        >
          <Text
            style={[styles.toggleText, showSignals && styles.toggleTextActive]}
          >
            Show Signals
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendLine, { backgroundColor: COLORS.support }]}
          />
          <Text style={styles.legendText}>Support</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendLine, { backgroundColor: COLORS.resistance }]}
          />
          <Text style={styles.legendText}>Resistance</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.pivotHigh }]}
          />
          <Text style={styles.legendText}>Pivot High</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.pivotLow }]}
          />
          <Text style={styles.legendText}>Pivot Low</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  symbol: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  price: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  regimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  regimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  regimeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  timeframeContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    marginRight: 8,
  },
  timeframeButtonActive: {
    backgroundColor: COLORS.green,
  },
  timeframeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  timeframeTextActive: {
    color: COLORS.text,
  },
  chartContainer: {
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  structureCard: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  structureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  structureItem: {
    flex: 1,
    alignItems: "center",
  },
  structureLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  structureValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  eventBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eventText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  signalCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
  },
  signalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  signalType: {
    fontSize: 18,
    fontWeight: "bold",
  },
  signalQ: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signalDetails: {
    marginBottom: 16,
  },
  signalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  signalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  signalActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buyButton: {
    backgroundColor: COLORS.green,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
  },
  toggleContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  toggleActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green + "20",
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.green,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendLine: {
    width: 16,
    height: 3,
    marginRight: 6,
    borderRadius: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // AI Explanation Styles
  aiCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4a90d9",
  },
  aiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  aiSummary: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  aiNarrative: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  aiSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  factorRow: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  factorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  impactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  factorName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  factorValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  factorExplanation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    paddingLeft: 16,
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  riskLevel: {
    fontSize: 10,
    fontWeight: "bold",
  },
  riskDescription: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  watchItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  watchBullet: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  watchText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default PCTTScreen;
