/**
 * CPFI Progress Ring Component
 * Circular progress indicator for goals, budgets, etc.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { lightTheme as theme } from '../constants/theme';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  label?: string;
  value?: string;
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color = theme.colors.primary,
  backgroundColor = theme.colors.border,
  showPercentage = true,
  label,
  value,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.content}>
        {value ? (
          <>
            <Text style={[styles.value, { fontSize: size * 0.2 }]}>{value}</Text>
            {label && <Text style={[styles.label, { fontSize: size * 0.1 }]}>{label}</Text>}
          </>
        ) : showPercentage ? (
          <Text style={[styles.percentage, { fontSize: size * 0.2 }]}>
            {Math.round(normalizedProgress)}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  value: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  label: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default ProgressRing;
