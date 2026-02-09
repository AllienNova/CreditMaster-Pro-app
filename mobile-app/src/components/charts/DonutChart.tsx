/**
 * Fynvita Donut Chart Component
 * A pie chart with a center cutout, ideal for showing percentages
 * with a total or summary value in the center.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

interface DonutData {
  value: number;
  label: string;
  color: string;
}

export interface DonutChartProps {
  data: DonutData[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  showPercentages?: boolean;
  centerLabel?: string;
  centerValue?: string;
  currency?: boolean;
  onSlicePress?: (item: DonutData, index: number) => void;
}

const CHART_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#22C55E', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
];

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 30,
  showLegend = true,
  showPercentages = true,
  centerLabel,
  centerValue,
  currency = false,
  onSlicePress,
}: DonutChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate slices
  let currentAngle = -90; // Start from top
  const slices = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    currentAngle += angle;
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];

    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
      color,
    };
  });

  // Generate arc path for donut segment
  const getArcPath = (startAngle: number, endAngle: number) => {
    const innerRadius = radius - strokeWidth / 2;
    const outerRadius = radius + strokeWidth / 2;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1Outer = center + outerRadius * Math.cos(startRad);
    const y1Outer = center + outerRadius * Math.sin(startRad);
    const x2Outer = center + outerRadius * Math.cos(endRad);
    const y2Outer = center + outerRadius * Math.sin(endRad);

    const x1Inner = center + innerRadius * Math.cos(startRad);
    const y1Inner = center + innerRadius * Math.sin(startRad);
    const x2Inner = center + innerRadius * Math.cos(endRad);
    const y2Inner = center + innerRadius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
      L ${x2Inner} ${y2Inner}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}
      Z
    `;
  };

  const formatValue = (value: number) => {
    if (currency) {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const displayCenterValue = centerValue ?? (currency ? `$${total.toLocaleString()}` : total.toLocaleString());

  return (
    <View style={styles.container} accessibilityLabel="Donut chart showing data distribution">
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {slices.map((slice, index) => {
            // Handle full circle (single item = 100%)
            if (slice.percentage >= 99.9) {
              return (
                <G key={`slice-${index}`}>
                  <Path
                    d={`
                      M ${center} ${center - radius - strokeWidth / 2}
                      A ${radius + strokeWidth / 2} ${radius + strokeWidth / 2} 0 1 1 ${center - 0.01} ${center - radius - strokeWidth / 2}
                      L ${center - 0.01} ${center - radius + strokeWidth / 2}
                      A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 1 0 ${center} ${center - radius + strokeWidth / 2}
                      Z
                    `}
                    fill={slice.color}
                  />
                </G>
              );
            }

            return (
              <G key={`slice-${index}`}>
                <Path
                  d={getArcPath(slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  onPress={() => onSlicePress?.(slice, index)}
                />
              </G>
            );
          })}

          {/* Center content */}
          {(centerLabel || centerValue !== undefined) && (
            <G>
              <SvgText
                x={center}
                y={center - 5}
                fontSize={22}
                fontWeight="bold"
                fill={theme.colors.text}
                textAnchor="middle"
              >
                {displayCenterValue}
              </SvgText>
              {centerLabel && (
                <SvgText
                  x={center}
                  y={center + 18}
                  fontSize={12}
                  fill={theme.colors.textSecondary}
                  textAnchor="middle"
                >
                  {centerLabel}
                </SvgText>
              )}
            </G>
          )}
        </Svg>
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {slices.map((slice, index) => (
            <TouchableOpacity
              key={`legend-${index}`}
              style={styles.legendItem}
              onPress={() => onSlicePress?.(slice, index)}
              activeOpacity={onSlicePress ? 0.7 : 1}
            >
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {slice.label}
              </Text>
              <View style={styles.legendValues}>
                {showPercentages && (
                  <Text style={styles.legendPercentage}>
                    {slice.percentage.toFixed(1)}%
                  </Text>
                )}
                <Text style={styles.legendValue}>
                  {formatValue(slice.value)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    marginBottom: 16,
  },
  legend: {
    width: '100%',
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  legendValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendPercentage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    minWidth: 45,
    textAlign: 'right',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
});

export default DonutChart;
