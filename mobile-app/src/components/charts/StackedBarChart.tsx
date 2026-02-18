/**
 * Fynvita Stacked Bar Chart Component
 * Displays data as stacked bars for comparing compositions across categories.
 * Used for budget vs actual, income vs expenses by category, etc.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Svg, { Rect, G, Line, Text as SvgText } from "react-native-svg";
import { lightTheme as theme } from "../../constants/theme";

interface StackSegment {
  value: number;
  label: string;
  color: string;
}

interface StackedBarData {
  category: string;
  segments: StackSegment[];
}

export interface StackedBarChartProps {
  data: StackedBarData[];
  width?: number;
  height?: number;
  horizontal?: boolean;
  showValues?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showTotals?: boolean;
  maxValue?: number;
  barSize?: number;
  barGap?: number;
  formatValue?: (value: number) => string;
  onSegmentPress?: (
    segment: StackSegment,
    categoryIndex: number,
    segmentIndex: number,
  ) => void;
}

const { width: screenWidth } = Dimensions.get("window");

const STACK_COLORS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EF4444", // red
  "#06B6D4", // cyan
];

export function StackedBarChart({
  data,
  width = screenWidth - 48,
  height = 250,
  horizontal = false,
  showValues = false,
  showLabels = true,
  showLegend = true,
  showGrid = true,
  showTotals = true,
  maxValue,
  barSize,
  barGap = 12,
  formatValue = (v) => v.toLocaleString(),
  onSegmentPress,
}: StackedBarChartProps) {
  if (data.length === 0) return null;

  // Calculate totals and max
  const totals = data.map((d) =>
    d.segments.reduce((sum, seg) => sum + seg.value, 0),
  );
  const max = maxValue ?? Math.max(...totals) * 1.1;

  // Get unique segment labels for legend
  const uniqueLabels = Array.from(
    new Set(data.flatMap((d) => d.segments.map((s) => s.label))),
  );

  const padding = horizontal
    ? { top: 20, right: 50, bottom: 20, left: 80 }
    : { top: 30, right: 20, bottom: 60, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight =
    height - padding.top - padding.bottom - (showLegend ? 60 : 0);

  const calculatedBarSize =
    barSize ??
    (horizontal
      ? (chartHeight - barGap * (data.length - 1)) / data.length
      : (chartWidth - barGap * (data.length - 1)) / data.length);

  // Grid lines
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((r) => r * max);

  if (horizontal) {
    return (
      <View
        style={[styles.container, { width }]}
        accessibilityLabel="Stacked bar chart showing category breakdown"
      >
        <Svg width={width} height={height - (showLegend ? 60 : 0)}>
          {/* Grid lines */}
          {showGrid &&
            gridValues.map((value, i) => {
              const x = padding.left + (value / max) * chartWidth;
              return (
                <G key={`grid-${i}`}>
                  <Line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke={theme.colors.border}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  <SvgText
                    x={x}
                    y={padding.top - 8}
                    fontSize={10}
                    fill={theme.colors.textSecondary}
                    textAnchor="middle"
                  >
                    {formatValue(Math.round(value))}
                  </SvgText>
                </G>
              );
            })}

          {data.map((item, categoryIndex) => {
            const y =
              padding.top + categoryIndex * (calculatedBarSize + barGap);
            let currentX = padding.left;
            const total = totals[categoryIndex];

            return (
              <G key={`category-${categoryIndex}`}>
                {/* Category label */}
                {showLabels && (
                  <SvgText
                    x={padding.left - 8}
                    y={y + calculatedBarSize / 2 + 4}
                    fontSize={11}
                    fill={theme.colors.text}
                    textAnchor="end"
                  >
                    {item.category.length > 10
                      ? item.category.slice(0, 10) + "..."
                      : item.category}
                  </SvgText>
                )}

                {/* Stacked segments */}
                {item.segments.map((segment, segmentIndex) => {
                  const segmentWidth = (segment.value / max) * chartWidth;
                  const color =
                    segment.color ||
                    STACK_COLORS[segmentIndex % STACK_COLORS.length];
                  const x = currentX;
                  currentX += segmentWidth;

                  const isFirst = segmentIndex === 0;
                  const isLast = segmentIndex === item.segments.length - 1;

                  return (
                    <Rect
                      key={`segment-${categoryIndex}-${segmentIndex}`}
                      x={x}
                      y={y}
                      width={Math.max(segmentWidth, 0)}
                      height={calculatedBarSize}
                      fill={color}
                      rx={isFirst || isLast ? 4 : 0}
                      onPress={() =>
                        onSegmentPress?.(segment, categoryIndex, segmentIndex)
                      }
                    />
                  );
                })}

                {/* Total value */}
                {showTotals && (
                  <SvgText
                    x={padding.left + (total / max) * chartWidth + 8}
                    y={y + calculatedBarSize / 2 + 4}
                    fontSize={11}
                    fill={theme.colors.text}
                    fontWeight="600"
                  >
                    {formatValue(total)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>

        {/* Legend */}
        {showLegend && (
          <View style={styles.legend}>
            {uniqueLabels.map((label, index) => {
              const color =
                data[0]?.segments.find((s) => s.label === label)?.color ||
                STACK_COLORS[index % STACK_COLORS.length];
              return (
                <View key={`legend-${index}`} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: color }]}
                  />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // Vertical stacked bars
  return (
    <View
      style={[styles.container, { width }]}
      accessibilityLabel="Stacked bar chart showing category breakdown"
    >
      <Svg width={width} height={height - (showLegend ? 60 : 0)}>
        {/* Grid lines */}
        {showGrid &&
          gridValues.map((value, i) => {
            const y = padding.top + chartHeight - (value / max) * chartHeight;
            return (
              <G key={`grid-${i}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={theme.colors.border}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={padding.left - 8}
                  y={y + 4}
                  fontSize={10}
                  fill={theme.colors.textSecondary}
                  textAnchor="end"
                >
                  {formatValue(Math.round(value))}
                </SvgText>
              </G>
            );
          })}

        {data.map((item, categoryIndex) => {
          const x = padding.left + categoryIndex * (calculatedBarSize + barGap);
          let currentY = padding.top + chartHeight;
          const total = totals[categoryIndex];

          return (
            <G key={`category-${categoryIndex}`}>
              {/* Stacked segments */}
              {item.segments.map((segment, segmentIndex) => {
                const segmentHeight = (segment.value / max) * chartHeight;
                const color =
                  segment.color ||
                  STACK_COLORS[segmentIndex % STACK_COLORS.length];
                const y = currentY - segmentHeight;
                currentY = y;

                const isLast = segmentIndex === item.segments.length - 1;

                return (
                  <Rect
                    key={`segment-${categoryIndex}-${segmentIndex}`}
                    x={x}
                    y={y}
                    width={calculatedBarSize}
                    height={Math.max(segmentHeight, 0)}
                    fill={color}
                    rx={isLast ? 4 : 0}
                    onPress={() =>
                      onSegmentPress?.(segment, categoryIndex, segmentIndex)
                    }
                  />
                );
              })}

              {/* Category label */}
              {showLabels && (
                <SvgText
                  x={x + calculatedBarSize / 2}
                  y={height - (showLegend ? 70 : 10)}
                  fontSize={10}
                  fill={theme.colors.textSecondary}
                  textAnchor="middle"
                  rotation={-45}
                  origin={`${x + calculatedBarSize / 2}, ${height - (showLegend ? 70 : 10)}`}
                >
                  {item.category.length > 8
                    ? item.category.slice(0, 8) + ".."
                    : item.category}
                </SvgText>
              )}

              {/* Total value on top */}
              {showTotals && (
                <SvgText
                  x={x + calculatedBarSize / 2}
                  y={
                    padding.top + chartHeight - (total / max) * chartHeight - 6
                  }
                  fontSize={10}
                  fill={theme.colors.text}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {formatValue(total)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {uniqueLabels.map((label, index) => {
            const color =
              data[0]?.segments.find((s) => s.label === label)?.color ||
              STACK_COLORS[index % STACK_COLORS.length];
            return (
              <View key={`legend-${index}`} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: theme.colors.text,
  },
});

export default StackedBarChart;
