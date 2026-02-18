/**
 * Fynvita Progress Bar Component
 * Linear progress indicator for goals, budgets, debt payoff, etc.
 */

import React, { useMemo } from "react";
import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "../hooks/useTheme";

interface ProgressBarProps {
  progress: number; // 0-1 (0% to 100%)
  height?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  label?: string;
  animated?: boolean;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  height = 8,
  color,
  backgroundColor,
  showPercentage = false,
  label,
  style,
}: ProgressBarProps) {
  const { colors, fontSize, fontWeight } = useTheme();

  const fillColor = color ?? colors.primary;
  const trackColor = backgroundColor ?? colors.gray200;

  const normalizedProgress = Math.min(1, Math.max(0, progress));
  const percentage = Math.round(normalizedProgress * 100);

  const styles = useMemo(
    () => ({
      container: {
        width: "100%" as const,
      },
      label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: 4,
      },
      track: {
        width: "100%" as const,
        height,
        backgroundColor: trackColor,
        borderRadius: 999,
        overflow: "hidden" as const,
      },
      fill: {
        width: `${percentage}%` as const,
        backgroundColor: fillColor,
        height,
        borderRadius: 999,
      },
      percentage: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: "right" as const,
      },
    }),
    [colors, fontSize, fontWeight, height, trackColor, fillColor, percentage],
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      {showPercentage && <Text style={styles.percentage}>{percentage}%</Text>}
    </View>
  );
}

export default ProgressBar;
