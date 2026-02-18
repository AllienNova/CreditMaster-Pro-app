/**
 * Fynvita Trading Chart Screen Component
 * Full-featured mobile trading interface with candlestick charts and indicators
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { CandlestickChart, type OHLCV } from "../charts/CandlestickChart";
import { RSIChart, type RSIData } from "../charts/RSIChart";
import { MACDChart, type MACDData } from "../charts/MACDChart";
import { lightTheme as theme } from "../../constants/theme";

// ============================================================================
// TYPES
// ============================================================================

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

export interface TradingChartScreenProps {
  symbol: string;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (tf: Timeframe) => void;
  onBuy?: (price: number) => void;
  onSell?: (price: number) => void;
}

interface IndicatorState {
  sma: boolean;
  ema: boolean;
  rsi: boolean;
  macd: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: screenWidth } = Dimensions.get("window");

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

// ============================================================================
// MOCK DATA GENERATION
// ============================================================================

function generateMockOHLCV(symbol: string, count: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  const now = Date.now();
  const interval = 60000 * 60; // 1 hour

  let price = symbol.includes("BTC")
    ? 45000
    : symbol.includes("ETH")
      ? 2500
      : 175;
  const volatility = price * 0.015;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * interval;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 5000000) + 500000;

    data.push({ timestamp, open, high, low, close, volume });
    price = close;
  }

  return data;
}

function calculateRSI(data: OHLCV[], period: number = 14): RSIData[] {
  const result: RSIData[] = [];
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
      const rsi = 100 - 100 / (1 + rs);

      result.push({ timestamp: data[i].timestamp, value: rsi });
    }
  }

  return result;
}

function calculateMACD(data: OHLCV[]): MACDData[] {
  const result: MACDData[] = [];
  const fast = 12,
    slow = 26,
    signal = 9;

  // Calculate EMAs
  const calcEMA = (prices: number[], period: number): number[] => {
    const ema: number[] = [];
    const mult = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += prices[i];
    ema.push(sum / period);
    for (let i = period; i < prices.length; i++) {
      ema.push((prices[i] - ema[ema.length - 1]) * mult + ema[ema.length - 1]);
    }
    return ema;
  };

  const closes = data.map((d) => d.close);
  const fastEMA = calcEMA(closes, fast);
  const slowEMA = calcEMA(closes, slow);

  // MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + (slow - fast)] - slowEMA[i]);
  }

  // Signal line
  const signalLine = calcEMA(macdLine, signal);

  // Build result
  for (let i = signal - 1; i < macdLine.length; i++) {
    const macd = macdLine[i];
    const sig = signalLine[i - signal + 1];
    result.push({
      timestamp: data[i + slow - 1].timestamp,
      macd,
      signal: sig,
      histogram: macd - sig,
    });
  }

  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TradingChartScreen({
  symbol,
  onSymbolChange,
  onTimeframeChange,
  onBuy,
  onSell,
}: TradingChartScreenProps) {
  // State
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OHLCV[]>([]);
  const [selectedCandle, setSelectedCandle] = useState<OHLCV | null>(null);
  const [indicators, setIndicators] = useState<IndicatorState>({
    sma: true,
    ema: false,
    rsi: true,
    macd: false,
  });

  // Load data
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockData = generateMockOHLCV(symbol, 150);
      setData(mockData);
      setLoading(false);
    }, 500);
  }, [symbol, timeframe]);

  // Calculate indicators
  const rsiData = useMemo(() => calculateRSI(data, 14), [data]);
  const macdData = useMemo(() => calculateMACD(data), [data]);

  // Current price info
  const priceInfo = useMemo(() => {
    if (data.length === 0) return null;
    const latest = data[data.length - 1];
    const prev = data.length > 1 ? data[data.length - 2] : latest;
    const change = latest.close - prev.close;
    const changePct = (change / prev.close) * 100;
    return {
      price: latest.close,
      change,
      changePct,
      high: latest.high,
      low: latest.low,
    };
  }, [data]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback(
    (tf: Timeframe) => {
      setTimeframe(tf);
      onTimeframeChange?.(tf);
    },
    [onTimeframeChange],
  );

  // Toggle indicator
  const toggleIndicator = useCallback((key: keyof IndicatorState) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Chart height calculation
  const mainChartHeight = 280;
  const indicatorHeight = 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbol}>{symbol}</Text>
          {priceInfo && (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>${priceInfo.price.toFixed(2)}</Text>
              <View
                style={[
                  styles.changeBadge,
                  {
                    backgroundColor:
                      priceInfo.change >= 0 ? "#26a69a20" : "#ef535020",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.changeText,
                    { color: priceInfo.change >= 0 ? "#26a69a" : "#ef5350" },
                  ]}
                >
                  {priceInfo.change >= 0 ? "+" : ""}
                  {priceInfo.changePct.toFixed(2)}%
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* OHLCV Display */}
        {selectedCandle && (
          <View style={styles.ohlcvContainer}>
            <Text style={styles.ohlcvText}>
              O: {selectedCandle.open.toFixed(2)} H:{" "}
              {selectedCandle.high.toFixed(2)}
              L: {selectedCandle.low.toFixed(2)} C:{" "}
              {selectedCandle.close.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TIMEFRAMES.map((tf) => (
            <TouchableOpacity
              key={tf.value}
              onPress={() => handleTimeframeChange(tf.value)}
              style={[
                styles.timeframeButton,
                timeframe === tf.value && styles.timeframeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timeframeText,
                  timeframe === tf.value && styles.timeframeTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Charts */}
      <ScrollView style={styles.chartContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        ) : (
          <>
            {/* Main Candlestick Chart */}
            <View style={styles.chartSection}>
              <CandlestickChart
                data={data}
                width={screenWidth - 16}
                height={mainChartHeight}
                showVolume={true}
                onCandleSelect={setSelectedCandle}
                indicators={{
                  sma: indicators.sma
                    ? [
                        { period: 20, color: "#2962FF" },
                        { period: 50, color: "#FF6D00" },
                      ]
                    : undefined,
                  ema: indicators.ema
                    ? [
                        { period: 12, color: "#00BCD4" },
                        { period: 26, color: "#E91E63" },
                      ]
                    : undefined,
                }}
              />
            </View>

            {/* RSI Chart */}
            {indicators.rsi && rsiData.length > 0 && (
              <View style={styles.chartSection}>
                <View style={styles.indicatorHeader}>
                  <Text style={styles.indicatorLabel}>RSI (14)</Text>
                </View>
                <RSIChart
                  data={rsiData}
                  width={screenWidth - 16}
                  height={indicatorHeight}
                />
              </View>
            )}

            {/* MACD Chart */}
            {indicators.macd && macdData.length > 0 && (
              <View style={styles.chartSection}>
                <View style={styles.indicatorHeader}>
                  <Text style={styles.indicatorLabel}>MACD (12, 26, 9)</Text>
                </View>
                <MACDChart
                  data={macdData}
                  width={screenWidth - 16}
                  height={indicatorHeight + 20}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Indicator Toggles */}
      <View style={styles.indicatorToggleContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: "sma", label: "SMA" },
            { key: "ema", label: "EMA" },
            { key: "rsi", label: "RSI" },
            { key: "macd", label: "MACD" },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => toggleIndicator(key as keyof IndicatorState)}
              style={[
                styles.indicatorToggle,
                indicators[key as keyof IndicatorState] &&
                  styles.indicatorToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.indicatorToggleText,
                  indicators[key as keyof IndicatorState] &&
                    styles.indicatorToggleTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trade Buttons */}
      <View style={styles.tradeButtonContainer}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.buyButton]}
          onPress={() => onBuy?.(priceInfo?.price || 0)}
        >
          <Text style={styles.tradeButtonText}>BUY</Text>
          {priceInfo && (
            <Text style={styles.tradeButtonPrice}>
              ${priceInfo.price.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tradeButton, styles.sellButton]}
          onPress={() => onSell?.(priceInfo?.price || 0)}
        >
          <Text style={styles.tradeButtonText}>SELL</Text>
          {priceInfo && (
            <Text style={styles.tradeButtonPrice}>
              ${priceInfo.price.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  symbolContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  symbol: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ohlcvContainer: {
    marginTop: 4,
  },
  ohlcvText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: "monospace",
  },
  timeframeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeframeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  timeframeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  timeframeTextActive: {
    color: "#fff",
  },
  chartContainer: {
    flex: 1,
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
  },
  chartSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  indicatorHeader: {
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  indicatorLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  indicatorToggleContainer: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  indicatorToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  indicatorToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  indicatorToggleText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  indicatorToggleTextActive: {
    color: "#fff",
  },
  tradeButtonContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tradeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buyButton: {
    backgroundColor: "#26a69a",
  },
  sellButton: {
    backgroundColor: "#ef5350",
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  tradeButtonPrice: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});

export default TradingChartScreen;
