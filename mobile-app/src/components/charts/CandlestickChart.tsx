/**
 * Fynvita Candlestick Chart Component
 * Professional trading chart for mobile with OHLCV data
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Svg, { Rect, Line, G, Text as SvgText, Path } from "react-native-svg";
import { lightTheme as theme } from "../../constants/theme";

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

export interface CandlestickChartProps {
  data: OHLCV[];
  width?: number;
  height?: number;
  showVolume?: boolean;
  showGrid?: boolean;
  showCrosshair?: boolean;
  bullColor?: string;
  bearColor?: string;
  onCandleSelect?: (candle: OHLCV | null) => void;
  indicators?: {
    sma?: { period: number; color: string }[];
    ema?: { period: number; color: string }[];
  };
}

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: screenWidth } = Dimensions.get("window");
const CANDLE_WIDTH = 8;
const CANDLE_GAP = 2;
const WICK_WIDTH = 1;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateSMA(
  data: OHLCV[],
  period: number,
): { timestamp: number; value: number }[] {
  const result: { timestamp: number; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ timestamp: data[i].timestamp, value: sum / period });
  }
  return result;
}

function calculateEMA(
  data: OHLCV[],
  period: number,
): { timestamp: number; value: number }[] {
  const result: { timestamp: number; value: number }[] = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ timestamp: data[period - 1].timestamp, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ timestamp: data[i].timestamp, value: ema });
  }
  return result;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CandlestickChart({
  data,
  width = screenWidth - 32,
  height = 300,
  showVolume = true,
  showGrid = true,
  showCrosshair = true,
  bullColor = "#26a69a",
  bearColor = "#ef5350",
  onCandleSelect,
  indicators,
}: CandlestickChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Layout calculations
  const padding = {
    top: 20,
    right: 60,
    bottom: showVolume ? 60 : 30,
    left: 10,
  };
  const chartWidth = width - padding.left - padding.right;
  const mainChartHeight = showVolume
    ? (height - padding.top - padding.bottom) * 0.75
    : height - padding.top - padding.bottom;
  const volumeChartHeight = showVolume
    ? (height - padding.top - padding.bottom) * 0.2
    : 0;
  const volumeGap = 10;

  // Visible candles based on width
  const maxVisibleCandles = Math.floor(
    chartWidth / (CANDLE_WIDTH + CANDLE_GAP),
  );
  const visibleData = data.slice(-maxVisibleCandles);

  // Price range
  const priceData = useMemo(() => {
    if (visibleData.length === 0) return { min: 0, max: 100, range: 100 };
    const highs = visibleData.map((d) => d.high);
    const lows = visibleData.map((d) => d.low);
    const min = Math.min(...lows) * 0.998;
    const max = Math.max(...highs) * 1.002;
    return { min, max, range: max - min };
  }, [visibleData]);

  // Volume range
  const volumeData = useMemo(() => {
    if (visibleData.length === 0) return { max: 1 };
    const volumes = visibleData.map((d) => d.volume);
    return { max: Math.max(...volumes) };
  }, [visibleData]);

  // Calculate indicator data
  const smaLines = useMemo(() => {
    if (!indicators?.sma) return [];
    return indicators.sma.map(({ period, color }) => ({
      data: calculateSMA(data, period),
      color,
      period,
    }));
  }, [data, indicators?.sma]);

  const emaLines = useMemo(() => {
    if (!indicators?.ema) return [];
    return indicators.ema.map(({ period, color }) => ({
      data: calculateEMA(data, period),
      color,
      period,
    }));
  }, [data, indicators?.ema]);

  // Coordinate helpers
  const getX = (index: number) =>
    padding.left + index * (CANDLE_WIDTH + CANDLE_GAP) + CANDLE_WIDTH / 2;
  const getPriceY = (price: number) =>
    padding.top +
    mainChartHeight -
    ((price - priceData.min) / priceData.range) * mainChartHeight;
  const getVolumeY = (volume: number) =>
    padding.top +
    mainChartHeight +
    volumeGap +
    volumeChartHeight -
    (volume / volumeData.max) * volumeChartHeight;

  // Price labels
  const priceLabels = useMemo(() => {
    const labels = [];
    const step = priceData.range / 5;
    for (let i = 0; i <= 5; i++) {
      labels.push(priceData.min + step * i);
    }
    return labels;
  }, [priceData]);

  // Handle candle press
  const handleCandlePress = (index: number) => {
    setSelectedIndex(index);
    onCandleSelect?.(visibleData[index]);
  };

  if (visibleData.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noData}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {showGrid &&
          priceLabels.map((price, i) => (
            <G key={`grid-${i}`}>
              <Line
                x1={padding.left}
                y1={getPriceY(price)}
                x2={width - padding.right}
                y2={getPriceY(price)}
                stroke={theme.colors.border}
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
              <SvgText
                x={width - padding.right + 5}
                y={getPriceY(price) + 4}
                fontSize={9}
                fill={theme.colors.textSecondary}
                textAnchor="start"
              >
                {price.toFixed(2)}
              </SvgText>
            </G>
          ))}

        {/* SMA Lines */}
        {smaLines.map((line, lineIndex) => {
          const offset = data.length - visibleData.length;
          const visibleLineData = line.data.filter((d) => {
            const dataIndex = data.findIndex(
              (dd) => dd.timestamp === d.timestamp,
            );
            return dataIndex >= offset;
          });

          if (visibleLineData.length < 2) return null;

          const pathD = visibleLineData
            .map((point, i) => {
              const dataIndex =
                data.findIndex((d) => d.timestamp === point.timestamp) - offset;
              const x = getX(dataIndex);
              const y = getPriceY(point.value);
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

          return (
            <Path
              key={`sma-${lineIndex}`}
              d={pathD}
              fill="none"
              stroke={line.color}
              strokeWidth={1.5}
            />
          );
        })}

        {/* EMA Lines */}
        {emaLines.map((line, lineIndex) => {
          const offset = data.length - visibleData.length;
          const visibleLineData = line.data.filter((d) => {
            const dataIndex = data.findIndex(
              (dd) => dd.timestamp === d.timestamp,
            );
            return dataIndex >= offset;
          });

          if (visibleLineData.length < 2) return null;

          const pathD = visibleLineData
            .map((point, i) => {
              const dataIndex =
                data.findIndex((d) => d.timestamp === point.timestamp) - offset;
              const x = getX(dataIndex);
              const y = getPriceY(point.value);
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ");

          return (
            <Path
              key={`ema-${lineIndex}`}
              d={pathD}
              fill="none"
              stroke={line.color}
              strokeWidth={1.5}
              strokeDasharray="4,2"
            />
          );
        })}

        {/* Candlesticks */}
        {visibleData.map((candle, index) => {
          const x = getX(index);
          const isBullish = candle.close >= candle.open;
          const color = isBullish ? bullColor : bearColor;

          const bodyTop = getPriceY(Math.max(candle.open, candle.close));
          const bodyBottom = getPriceY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

          const wickTop = getPriceY(candle.high);
          const wickBottom = getPriceY(candle.low);

          const isSelected = selectedIndex === index;

          return (
            <G key={`candle-${index}`} onPress={() => handleCandlePress(index)}>
              {/* Upper wick */}
              <Line
                x1={x}
                y1={wickTop}
                x2={x}
                y2={bodyTop}
                stroke={color}
                strokeWidth={WICK_WIDTH}
              />

              {/* Lower wick */}
              <Line
                x1={x}
                y1={bodyBottom}
                x2={x}
                y2={wickBottom}
                stroke={color}
                strokeWidth={WICK_WIDTH}
              />

              {/* Body */}
              <Rect
                x={x - CANDLE_WIDTH / 2}
                y={bodyTop}
                width={CANDLE_WIDTH}
                height={bodyHeight}
                fill={isBullish ? color : color}
                stroke={isSelected ? "#FFD700" : color}
                strokeWidth={isSelected ? 2 : 1}
              />
            </G>
          );
        })}

        {/* Volume bars */}
        {showVolume &&
          visibleData.map((candle, index) => {
            const x = getX(index);
            const isBullish = candle.close >= candle.open;
            const color = isBullish ? `${bullColor}80` : `${bearColor}80`;
            const barHeight =
              (candle.volume / volumeData.max) * volumeChartHeight;

            return (
              <Rect
                key={`vol-${index}`}
                x={x - CANDLE_WIDTH / 2}
                y={
                  padding.top +
                  mainChartHeight +
                  volumeGap +
                  volumeChartHeight -
                  barHeight
                }
                width={CANDLE_WIDTH}
                height={barHeight}
                fill={color}
              />
            );
          })}

        {/* Crosshair for selected candle */}
        {showCrosshair && selectedIndex !== null && (
          <G>
            <Line
              x1={getX(selectedIndex)}
              y1={padding.top}
              x2={getX(selectedIndex)}
              y2={height - padding.bottom}
              stroke={theme.colors.primary}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <Line
              x1={padding.left}
              y1={getPriceY(visibleData[selectedIndex].close)}
              x2={width - padding.right}
              y2={getPriceY(visibleData[selectedIndex].close)}
              stroke={theme.colors.primary}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          </G>
        )}
      </Svg>

      {/* Selected candle info overlay */}
      {selectedIndex !== null && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            O: {visibleData[selectedIndex].open.toFixed(2)}
            H: {visibleData[selectedIndex].high.toFixed(2)}
            L: {visibleData[selectedIndex].low.toFixed(2)}
            C: {visibleData[selectedIndex].close.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  noData: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginTop: 50,
  },
  infoOverlay: {
    position: "absolute",
    top: 4,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "monospace",
  },
});

export default CandlestickChart;
