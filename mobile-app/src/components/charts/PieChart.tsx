/**
 * CPFI Pie Chart Component
 * Reusable pie/donut chart for spending breakdown, allocations, etc.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

interface PieData {
  value: number;
  label: string;
  color: string;
}

interface PieChartProps {
  data: PieData[];
  size?: number;
  innerRadius?: number; // 0 for pie, > 0 for donut
  showLabels?: boolean;
  showLegend?: boolean;
  showPercentages?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

export function PieChart({
  data,
  size = 200,
  innerRadius = 0,
  showLabels = false,
  showLegend = true,
  showPercentages = true,
  centerLabel,
  centerValue,
}: PieChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const center = size / 2;

  // Calculate pie slices
  let currentAngle = -90; // Start from top
  const slices = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
    };
  });

  // Generate arc path
  const getArcPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = center + outerR * Math.cos(startRad);
    const y1 = center + outerR * Math.sin(startRad);
    const x2 = center + outerR * Math.cos(endRad);
    const y2 = center + outerR * Math.sin(endRad);
    
    const x3 = center + innerR * Math.cos(endRad);
    const y3 = center + innerR * Math.sin(endRad);
    const x4 = center + innerR * Math.cos(startRad);
    const y4 = center + innerR * Math.sin(startRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    if (innerR === 0) {
      return `M ${center} ${center} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }
    
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {slices.map((slice, index) => (
            <Path
              key={`slice-${index}`}
              d={getArcPath(slice.startAngle, slice.endAngle, radius, innerRadius)}
              fill={slice.color}
            />
          ))}
          
          {/* Center content for donut */}
          {innerRadius > 0 && (centerLabel || centerValue) && (
            <G>
              {centerValue && (
                <SvgText
                  x={center}
                  y={center - 5}
                  fontSize={24}
                  fontWeight="bold"
                  fill={theme.colors.text}
                  textAnchor="middle"
                >
                  {centerValue}
                </SvgText>
              )}
              {centerLabel && (
                <SvgText
                  x={center}
                  y={center + 15}
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
            <View key={`legend-${index}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {slice.label}
              </Text>
              {showPercentages && (
                <Text style={styles.legendValue}>
                  {slice.percentage.toFixed(1)}%
                </Text>
              )}
            </View>
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
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
});

export default PieChart;
