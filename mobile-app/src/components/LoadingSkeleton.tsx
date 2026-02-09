/**
 * Fynvita Loading Skeleton Component
 * Animated loading placeholders
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { lightTheme as theme } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: typeof width === 'string' ? width as `${number}%` : width,
          height,
          borderRadius,
          opacity
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton components
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }: { lines?: number; lastLineWidth?: string }) {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
}

export function SkeletonScoreGauge({ size = 150 }: { size?: number }) {
  return (
    <View style={[styles.gaugeContainer, { width: size, height: size }]}>
      <Skeleton width={size} height={size} borderRadius={size / 2} />
    </View>
  );
}

export function SkeletonListItem() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={40} height={40} borderRadius={8} />
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={12} />
      </View>
      <Skeleton width={60} height={16} />
    </View>
  );
}

export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <View style={[styles.chartContainer, { height }]}>
      <Skeleton width="100%" height={height} borderRadius={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listItemContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  chartContainer: {
    marginVertical: theme.spacing.md,
  },
});

export { Skeleton as LoadingSkeleton };
export default Skeleton;
