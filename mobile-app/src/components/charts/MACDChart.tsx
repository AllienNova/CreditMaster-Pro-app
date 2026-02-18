/**
 * Fynvita MACD Chart Component
 * Moving Average Convergence Divergence oscillator for mobile trading
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Line, G, Text as SvgText, Rect } from "react-native-svg";
import { lightTheme as theme } from "../../constants/theme";

// ============================================================================
// TYPES
// ============================================================================

export interface MACDData {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface MACDChartProps {
  data: MACDData[];
  width?: number;
  height?: number;
  macdColor?: string;
  signalColor?: string;
  histogramPosColor?: string;
  histogramNegColor?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: screenWidth } = Dimensions.get("window");

// ============================================================================
// COMPONENT
// ============================================================================

export function MACDChart({
  data,
  width = screenWidth - 32,
  height = 120,
  macdColor = "#2962FF",
  signalColor = "#FF6D00",
  histogramPosColor = "#26a69a",
  histogramNegColor = "#ef5350",
}: MACDChartProps) {
  const padding = { top: 15, right: 50, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate value range
  const valueRange = useMemo(() => {
    if (data.length === 0) return { min: -1, max: 1, range: 2 };
    const allValues = data.flatMap((d) => [d.macd, d.signal, d.histogram]);
    const max = Math.max(...allValues) * 1.1;
    const min = Math.min(...allValues) * 1.1;
    const absMax = Math.max(Math.abs(max), Math.abs(min));
    return { min: -absMax, max: absMax, range: absMax * 2 };
  }, [data]);

  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) =>
    padding.top +
    chartHeight / 2 -
    (value / valueRange.max) * (chartHeight / 2);

  // MACD line path
  const macdPath = useMemo(() => {
    if (data.length < 2) return "";
    return data
      .map((point, i) => {
        const x = getX(i);
        const y = getY(point.macd);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, chartWidth, chartHeight, valueRange]);

  // Signal line path
  const signalPath = useMemo(() => {
    if (data.length < 2) return "";
    return data
      .map((point, i) => {
        const x = getX(i);
        const y = getY(point.signal);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [data, chartWidth, chartHeight, valueRange]);

  // Histogram bar width
  const barWidth = Math.max(2, chartWidth / data.length - 1);

  if (data.length === 0) return null;

  const latestMACD = data[data.length - 1];
  const zeroY = getY(0);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Zero line */}
        <Line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke={theme.colors.border}
          strokeWidth={1}
        />

        {/* Grid lines */}
        {[-valueRange.max / 2, valueRange.max / 2].map((level, i) => (
          <G key={`grid-${i}`}>
            <Line
              x1={padding.left}
              y1={getY(level)}
              x2={width - padding.right}
              y2={getY(level)}
              stroke={`${theme.colors.border}60`}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          </G>
        ))}

        {/* Histogram bars */}
        {data.map((point, i) => {
          const x = getX(i) - barWidth / 2;
          const isPositive = point.histogram >= 0;
          const barHeight =
            Math.abs(point.histogram / valueRange.max) * (chartHeight / 2);
          const y = isPositive ? zeroY - barHeight : zeroY;

          return (
            <Rect
              key={`hist-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              fill={isPositive ? histogramPosColor : histogramNegColor}
              opacity={0.7}
            />
          );
        })}

        {/* MACD Line */}
        <Path
          d={macdPath}
          fill="none"
          stroke={macdColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Signal Line */}
        <Path
          d={signalPath}
          fill="none"
          stroke={signalColor}
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Y-axis labels */}
        <SvgText
          x={width - padding.right + 5}
          y={padding.top + 4}
          fontSize={8}
          fill={theme.colors.textSecondary}
        >
          {valueRange.max.toFixed(2)}
        </SvgText>
        <SvgText
          x={width - padding.right + 5}
          y={zeroY + 3}
          fontSize={8}
          fill={theme.colors.textSecondary}
        >
          0
        </SvgText>
        <SvgText
          x={width - padding.right + 5}
          y={height - padding.bottom}
          fontSize={8}
          fill={theme.colors.textSecondary}
        >
          {valueRange.min.toFixed(2)}
        </SvgText>

        {/* Current value labels */}
        <G>
          {/* MACD value */}
          <Rect
            x={width - padding.right - 5}
            y={getY(latestMACD.macd) - 7}
            width={52}
            height={14}
            fill={macdColor}
            rx={2}
          />
          <SvgText
            x={width - padding.right + 21}
            y={getY(latestMACD.macd) + 3}
            fontSize={8}
            fill="#fff"
            textAnchor="middle"
          >
            M: {latestMACD.macd.toFixed(3)}
          </SvgText>
        </G>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: macdColor }]} />
          <Text style={styles.legendText}>MACD</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: signalColor }]} />
          <Text style={styles.legendText}>Signal</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  legend: {
    position: "absolute",
    top: 2,
    left: 10,
    flexDirection: "row",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
});

export default MACDChart;
