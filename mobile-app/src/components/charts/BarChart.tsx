/**
 * Fynvita Bar Chart Component
 * Reusable bar chart for budgets, spending categories, etc.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, G, Text as SvgText, Line } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

interface BarData {
  value: number;
  label: string;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  barColor?: string;
  showValues?: boolean;
  showLabels?: boolean;
  horizontal?: boolean;
  maxValue?: number;
  formatValue?: (value: number) => string;
}

const { width: screenWidth } = Dimensions.get('window');

export function BarChart({
  data,
  width = screenWidth - 48,
  height = 200,
  barColor = theme.colors.primary,
  showValues = true,
  showLabels = true,
  horizontal = false,
  maxValue,
  formatValue = (v) => v.toString(),
}: BarChartProps) {
  if (data.length === 0) return null;

  const padding = horizontal 
    ? { top: 10, right: 60, bottom: 10, left: 80 }
    : { top: 20, right: 20, bottom: 50, left: 40 };
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const max = maxValue ?? Math.max(...data.map(d => d.value)) * 1.1;
  const barGap = horizontal ? 8 : 12;
  const barSize = horizontal 
    ? (chartHeight - barGap * (data.length - 1)) / data.length
    : (chartWidth - barGap * (data.length - 1)) / data.length;

  if (horizontal) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Svg width={width} height={height}>
          {data.map((item, index) => {
            const barWidth = (item.value / max) * chartWidth;
            const y = padding.top + index * (barSize + barGap);
            const color = item.color || barColor;

            return (
              <G key={`bar-${index}`}>
                {/* Background bar */}
                <Rect
                  x={padding.left}
                  y={y}
                  width={chartWidth}
                  height={barSize}
                  fill={theme.colors.border}
                  rx={4}
                />
                {/* Value bar */}
                <Rect
                  x={padding.left}
                  y={y}
                  width={barWidth}
                  height={barSize}
                  fill={color}
                  rx={4}
                />
                {/* Label */}
                {showLabels && (
                  <SvgText
                    x={padding.left - 8}
                    y={y + barSize / 2 + 4}
                    fontSize={11}
                    fill={theme.colors.text}
                    textAnchor="end"
                  >
                    {item.label.length > 10 ? item.label.slice(0, 10) + '...' : item.label}
                  </SvgText>
                )}
                {/* Value */}
                {showValues && (
                  <SvgText
                    x={padding.left + barWidth + 8}
                    y={y + barSize / 2 + 4}
                    fontSize={11}
                    fill={theme.colors.text}
                    fontWeight="600"
                  >
                    {formatValue(item.value)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }

  // Vertical bars
  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - ratio)}
            x2={width - padding.right}
            y2={padding.top + chartHeight * (1 - ratio)}
            stroke={theme.colors.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {data.map((item, index) => {
          const barHeight = (item.value / max) * chartHeight;
          const x = padding.left + index * (barSize + barGap);
          const y = padding.top + chartHeight - barHeight;
          const color = item.color || barColor;

          return (
            <G key={`bar-${index}`}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barSize}
                height={barHeight}
                fill={color}
                rx={4}
              />
              {/* Label */}
              {showLabels && (
                <SvgText
                  x={x + barSize / 2}
                  y={height - 10}
                  fontSize={10}
                  fill={theme.colors.textSecondary}
                  textAnchor="middle"
                >
                  {item.label.length > 6 ? item.label.slice(0, 6) : item.label}
                </SvgText>
              )}
              {/* Value */}
              {showValues && (
                <SvgText
                  x={x + barSize / 2}
                  y={y - 6}
                  fontSize={10}
                  fill={theme.colors.text}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {formatValue(item.value)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
});

export default BarChart;
