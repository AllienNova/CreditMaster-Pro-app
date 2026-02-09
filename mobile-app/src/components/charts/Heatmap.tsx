/**
 * Fynvita Heatmap Component
 * Displays data intensity using color gradients in a grid format.
 * Used for spending patterns by day/time, activity heatmaps, etc.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { lightTheme as theme } from '../../constants/theme';

export interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
}

export interface HeatmapProps {
  data: HeatmapDataPoint[];
  xLabels: string[];
  yLabels: string[];
  width?: number;
  height?: number;
  colorScale?: 'blue' | 'green' | 'red' | 'purple' | 'custom';
  customColors?: { low: string; mid: string; high: string };
  showValues?: boolean;
  currency?: boolean;
  cellSize?: number;
  cellGap?: number;
  onCellPress?: (point: HeatmapDataPoint) => void;
  formatValue?: (value: number) => string;
}

const COLOR_SCALES: Record<string, { low: string; mid: string; high: string }> = {
  blue: { low: '#EFF6FF', mid: '#60A5FA', high: '#1D4ED8' },
  green: { low: '#ECFDF5', mid: '#34D399', high: '#059669' },
  red: { low: '#FEF2F2', mid: '#F87171', high: '#DC2626' },
  purple: { low: '#FAF5FF', mid: '#A78BFA', high: '#7C3AED' },
};

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Interpolate between two colors
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get text color based on background luminance
function getTextColor(bgColor: string): string {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#374151' : '#FFFFFF';
}

export function Heatmap({
  data,
  xLabels,
  yLabels,
  width,
  height,
  colorScale = 'blue',
  customColors,
  showValues = true,
  currency = false,
  cellSize = 36,
  cellGap = 2,
  onCellPress,
  formatValue,
}: HeatmapProps) {
  const colors = customColors || COLOR_SCALES[colorScale];

  // Create a map for quick value lookup
  const valueMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((point) => {
      map.set(`${point.x}-${point.y}`, point.value);
    });
    return map;
  }, [data]);

  // Calculate min/max for color scaling
  const { minValue, maxValue } = useMemo(() => {
    if (data.length === 0) return { minValue: 0, maxValue: 0 };
    const values = data.map((d) => d.value);
    return { minValue: Math.min(...values), maxValue: Math.max(...values) };
  }, [data]);

  // Interpolate color based on value
  const getColor = (value: number): string => {
    if (maxValue === minValue) return colors.mid;
    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio <= 0.5) {
      return interpolateColor(colors.low, colors.mid, ratio * 2);
    } else {
      return interpolateColor(colors.mid, colors.high, (ratio - 0.5) * 2);
    }
  };

  const defaultFormatValue = (value: number): string => {
    if (currency) return `$${value.toLocaleString()}`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  };

  const valueFormatter = formatValue || defaultFormatValue;

  const labelWidth = 60;
  const totalWidth = width || labelWidth + xLabels.length * (cellSize + cellGap) + 20;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollContainer}
      accessibilityLabel="Heatmap chart showing data intensity"
    >
      <View style={[styles.container, { width: totalWidth }]}>
        {/* X-axis labels at top */}
        <View style={[styles.xLabelsRow, { paddingLeft: labelWidth + 4 }]}>
          {xLabels.map((label, index) => (
            <View
              key={`x-${index}`}
              style={[styles.xLabelContainer, { width: cellSize, marginRight: cellGap }]}
            >
              <Text style={styles.xLabel} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Grid rows */}
        <View style={styles.gridContainer}>
          {yLabels.map((yLabel, yIndex) => (
            <View key={`row-${yIndex}`} style={styles.row}>
              {/* Y-axis label */}
              <View style={[styles.yLabelContainer, { width: labelWidth }]}>
                <Text style={styles.yLabel} numberOfLines={1}>
                  {yLabel}
                </Text>
              </View>

              {/* Cells */}
              <View style={styles.cellsContainer}>
                {xLabels.map((xLabel, xIndex) => {
                  const value = valueMap.get(`${xLabel}-${yLabel}`) ?? 0;
                  const bgColor = getColor(value);
                  const textColor = getTextColor(bgColor);
                  const point = { x: xLabel, y: yLabel, value };

                  return (
                    <TouchableOpacity
                      key={`cell-${xIndex}-${yIndex}`}
                      onPress={() => onCellPress?.(point)}
                      disabled={!onCellPress}
                      activeOpacity={onCellPress ? 0.7 : 1}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: bgColor,
                          marginRight: cellGap,
                          marginBottom: cellGap,
                        },
                      ]}
                      accessibilityLabel={`${xLabel}, ${yLabel}: ${valueFormatter(value)}`}
                    >
                      {showValues && (
                        <Text style={[styles.cellValue, { color: textColor }]}>
                          {valueFormatter(value)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>Low</Text>
          <View style={styles.legendGradient}>
            <View style={[styles.legendSegment, { backgroundColor: colors.low }]} />
            <View style={[styles.legendSegment, { backgroundColor: colors.mid }]} />
            <View style={[styles.legendSegment, { backgroundColor: colors.high }]} />
          </View>
          <Text style={styles.legendText}>High</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 0,
  },
  container: {
    paddingVertical: 8,
  },
  xLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  xLabelContainer: {
    alignItems: 'center',
  },
  xLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  gridContainer: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yLabelContainer: {
    paddingRight: 8,
  },
  yLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'right',
  },
  cellsContainer: {
    flexDirection: 'row',
  },
  cell: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellValue: {
    fontSize: 9,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  legendText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  legendGradient: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    height: 12,
    width: 100,
  },
  legendSegment: {
    flex: 1,
  },
});

export default Heatmap;
