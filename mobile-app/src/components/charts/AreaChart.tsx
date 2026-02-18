/**
 * Fynvita Area Chart Component
 * Displays data as an area chart with gradient fills.
 * Used for cash flow, net worth trends, and cumulative data.
 */

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Path,
  G,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { lightTheme as theme } from "../../constants/theme";

interface DataPoint {
  value: number;
  label: string;
}

interface AreaConfig {
  dataKey: string;
  color?: string;
  gradientOpacity?: number;
}

export interface AreaChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  showDots?: boolean;
  stacked?: boolean;
  minValue?: number;
  maxValue?: number;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
  gradientOpacity?: number;
  /** Multiple series support */
  series?: Array<{ data: DataPoint[]; color: string; name: string }>;
}

const { width: screenWidth } = Dimensions.get("window");

export function AreaChart({
  data,
  width = screenWidth - 48,
  height = 200,
  color = theme.colors.primary,
  showGrid = true,
  showLabels = true,
  showValues = false,
  showDots = false,
  stacked = false,
  minValue,
  maxValue,
  formatValue = (v) => v.toLocaleString(),
  formatLabel = (l) => l,
  gradientOpacity = 0.3,
  series,
}: AreaChartProps) {
  // Use series if provided, otherwise use single data
  const allSeries = series || [{ data, color, name: "default" }];

  if (allSeries.every((s) => s.data.length === 0)) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate min/max across all series
  const allValues = allSeries.flatMap((s) => s.data.map((d) => d.value));
  const min = minValue ?? Math.min(...allValues) * 0.9;
  const max = maxValue ?? Math.max(...allValues) * 1.1;
  const range = max - min || 1;

  const maxDataLength = Math.max(...allSeries.map((s) => s.data.length));

  const getX = (index: number) =>
    padding.left + (index / (maxDataLength - 1 || 1)) * chartWidth;
  const getY = (value: number) =>
    padding.top + chartHeight - ((value - min) / range) * chartHeight;

  // Y-axis labels
  const yLabels = [
    min,
    min + range * 0.25,
    min + range * 0.5,
    min + range * 0.75,
    max,
  ];

  // Generate area path with fill
  const generateAreaPath = (seriesData: DataPoint[]) => {
    if (seriesData.length === 0) return "";

    const linePath = seriesData
      .map((point, index) => {
        const x = getX(index);
        const y = getY(point.value);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    // Close the area path
    const lastX = getX(seriesData.length - 1);
    const firstX = getX(0);
    const bottomY = padding.top + chartHeight;

    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Generate line path only
  const generateLinePath = (seriesData: DataPoint[]) => {
    return seriesData
      .map((point, index) => {
        const x = getX(index);
        const y = getY(point.value);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <View
      style={[styles.container, { width, height }]}
      accessibilityLabel="Area chart showing data trends"
    >
      <Svg width={width} height={height}>
        <Defs>
          {allSeries.map((s, idx) => (
            <LinearGradient
              key={`gradient-${idx}`}
              id={`areaGradient-${idx}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop
                offset="0%"
                stopColor={s.color}
                stopOpacity={gradientOpacity}
              />
              <Stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
            </LinearGradient>
          ))}
        </Defs>

        {/* Grid lines */}
        {showGrid &&
          yLabels.map((value, i) => (
            <G key={`grid-${i}`}>
              <Line
                x1={padding.left}
                y1={getY(value)}
                x2={width - padding.right}
                y2={getY(value)}
                stroke={theme.colors.border}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={padding.left - 8}
                y={getY(value) + 4}
                fontSize={10}
                fill={theme.colors.textSecondary}
                textAnchor="end"
              >
                {formatValue(Math.round(value))}
              </SvgText>
            </G>
          ))}

        {/* Render each series */}
        {allSeries.map((s, idx) => (
          <G key={`series-${idx}`}>
            {/* Area fill */}
            <Path
              d={generateAreaPath(s.data)}
              fill={`url(#areaGradient-${idx})`}
            />
            {/* Line stroke */}
            <Path
              d={generateLinePath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {showDots &&
              s.data.map((point, index) => (
                <G key={`dot-${idx}-${index}`}>
                  <Path
                    d={`M ${getX(index)} ${getY(point.value)} m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0`}
                    fill={s.color}
                    stroke="white"
                    strokeWidth={2}
                  />
                </G>
              ))}
          </G>
        ))}

        {/* X-axis labels */}
        {showLabels &&
          allSeries[0]?.data.map((point, index) => {
            const showEvery = Math.ceil(maxDataLength / 6);
            if (index % showEvery !== 0 && index !== maxDataLength - 1)
              return null;

            return (
              <SvgText
                key={`label-${index}`}
                x={getX(index)}
                y={height - 10}
                fontSize={10}
                fill={theme.colors.textSecondary}
                textAnchor="middle"
              >
                {formatLabel(point.label)}
              </SvgText>
            );
          })}

        {/* Value labels */}
        {showValues &&
          allSeries[0]?.data.map((point, index) => (
            <SvgText
              key={`value-${index}`}
              x={getX(index)}
              y={getY(point.value) - 10}
              fontSize={10}
              fill={theme.colors.text}
              textAnchor="middle"
              fontWeight="600"
            >
              {formatValue(point.value)}
            </SvgText>
          ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
});

export default AreaChart;
