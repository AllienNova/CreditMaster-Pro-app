/**
 * CPFI Line Chart Component
 * Reusable line chart for credit score history, trends, etc.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

interface DataPoint {
  value: number;
  label: string;
  date?: Date;
}

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  minValue?: number;
  maxValue?: number;
  yAxisLabels?: number[];
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
}

const { width: screenWidth } = Dimensions.get('window');

export function LineChart({
  data,
  width = screenWidth - 48,
  height = 200,
  color = theme.colors.primary,
  showDots = true,
  showGrid = true,
  showLabels = true,
  showValues = false,
  minValue,
  maxValue,
  yAxisLabels,
  formatValue = (v) => v.toString(),
  formatLabel = (l) => l,
}: LineChartProps) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const min = minValue ?? Math.min(...values) - 10;
  const max = maxValue ?? Math.max(...values) + 10;
  const range = max - min;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - ((value - min) / range) * chartHeight;

  // Generate path
  const pathData = data
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Y-axis labels
  const yLabels = yAxisLabels || [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max];

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {showGrid && yLabels.map((value, i) => (
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

        {/* Line */}
        <Path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && data.map((point, index) => (
          <Circle
            key={`dot-${index}`}
            cx={getX(index)}
            cy={getY(point.value)}
            r={4}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* X-axis labels */}
        {showLabels && data.map((point, index) => {
          // Show every nth label to avoid crowding
          const showEvery = Math.ceil(data.length / 6);
          if (index % showEvery !== 0 && index !== data.length - 1) return null;
          
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

        {/* Value labels on dots */}
        {showValues && data.map((point, index) => (
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
    backgroundColor: 'transparent',
  },
});

export default LineChart;
