/**
 * Fynvita RSI Chart Component
 * Relative Strength Index oscillator for mobile trading
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, G, Text as SvgText, Rect } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface RSIData {
  timestamp: number;
  value: number;
}

export interface RSIChartProps {
  data: RSIData[];
  width?: number;
  height?: number;
  overboughtLevel?: number;
  oversoldLevel?: number;
  lineColor?: string;
  overboughtColor?: string;
  oversoldColor?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: screenWidth } = Dimensions.get('window');

// ============================================================================
// COMPONENT
// ============================================================================

export function RSIChart({
  data,
  width = screenWidth - 32,
  height = 100,
  overboughtLevel = 70,
  oversoldLevel = 30,
  lineColor = '#7E57C2',
  overboughtColor = '#ef5350',
  oversoldColor = '#26a69a',
}: RSIChartProps) {
  const padding = { top: 10, right: 40, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // RSI is always 0-100
  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - (value / 100) * chartHeight;

  // Generate path
  const pathD = useMemo(() => {
    if (data.length < 2) return '';
    return data.map((point, i) => {
      const x = getX(i);
      const y = getY(point.value);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [data, chartWidth, chartHeight]);

  // Fill areas for overbought/oversold
  const overboughtFill = useMemo(() => {
    if (data.length < 2) return '';
    const segments: string[] = [];
    let inOverbought = false;
    let startX = 0;

    data.forEach((point, i) => {
      const x = getX(i);
      const y = getY(Math.min(point.value, 100));
      
      if (point.value >= overboughtLevel && !inOverbought) {
        inOverbought = true;
        startX = x;
        segments.push(`M ${x} ${getY(overboughtLevel)}`);
      }
      
      if (inOverbought) {
        segments.push(`L ${x} ${y}`);
      }
      
      if (point.value < overboughtLevel && inOverbought) {
        segments.push(`L ${x} ${getY(overboughtLevel)} Z`);
        inOverbought = false;
      }
    });

    if (inOverbought) {
      segments.push(`L ${getX(data.length - 1)} ${getY(overboughtLevel)} Z`);
    }

    return segments.join(' ');
  }, [data, overboughtLevel]);

  const oversoldFill = useMemo(() => {
    if (data.length < 2) return '';
    const segments: string[] = [];
    let inOversold = false;

    data.forEach((point, i) => {
      const x = getX(i);
      const y = getY(Math.max(point.value, 0));
      
      if (point.value <= oversoldLevel && !inOversold) {
        inOversold = true;
        segments.push(`M ${x} ${getY(oversoldLevel)}`);
      }
      
      if (inOversold) {
        segments.push(`L ${x} ${y}`);
      }
      
      if (point.value > oversoldLevel && inOversold) {
        segments.push(`L ${x} ${getY(oversoldLevel)} Z`);
        inOversold = false;
      }
    });

    if (inOversold) {
      segments.push(`L ${getX(data.length - 1)} ${getY(oversoldLevel)} Z`);
    }

    return segments.join(' ');
  }, [data, oversoldLevel]);

  if (data.length === 0) return null;

  const latestRSI = data[data.length - 1]?.value || 50;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Overbought zone background */}
        <Rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={getY(overboughtLevel) - padding.top}
          fill={`${overboughtColor}10`}
        />

        {/* Oversold zone background */}
        <Rect
          x={padding.left}
          y={getY(oversoldLevel)}
          width={chartWidth}
          height={chartHeight - (getY(oversoldLevel) - padding.top)}
          fill={`${oversoldColor}10`}
        />

        {/* Grid lines */}
        {[0, 30, 50, 70, 100].map((level) => (
          <G key={`level-${level}`}>
            <Line
              x1={padding.left}
              y1={getY(level)}
              x2={width - padding.right}
              y2={getY(level)}
              stroke={level === 50 ? theme.colors.border : `${theme.colors.border}80`}
              strokeWidth={level === 50 ? 1 : 0.5}
              strokeDasharray={level === 50 ? '' : '4,4'}
            />
            <SvgText
              x={width - padding.right + 5}
              y={getY(level) + 4}
              fontSize={9}
              fill={theme.colors.textSecondary}
            >
              {level}
            </SvgText>
          </G>
        ))}

        {/* Overbought fill */}
        {overboughtFill && (
          <Path d={overboughtFill} fill={`${overboughtColor}30`} />
        )}

        {/* Oversold fill */}
        {oversoldFill && (
          <Path d={oversoldFill} fill={`${oversoldColor}30`} />
        )}

        {/* RSI Line */}
        <Path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current value indicator */}
        <G>
          <Rect
            x={width - padding.right - 2}
            y={getY(latestRSI) - 8}
            width={38}
            height={16}
            fill={latestRSI >= overboughtLevel ? overboughtColor : latestRSI <= oversoldLevel ? oversoldColor : lineColor}
            rx={3}
          />
          <SvgText
            x={width - padding.right + 17}
            y={getY(latestRSI) + 4}
            fontSize={10}
            fill="#fff"
            textAnchor="middle"
            fontWeight="600"
          >
            {latestRSI.toFixed(1)}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
});

export default RSIChart;
