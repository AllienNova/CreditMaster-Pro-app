/**
 * Streak Display Component for Mobile
 * Shows current streak with fire emoji intensity
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../../constants/theme';

interface StreakDisplayProps {
  streak: number;
  multiplier?: number;
  longestStreak?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakDisplay({
  streak,
  multiplier = 1,
  longestStreak,
  size = 'md',
}: StreakDisplayProps) {
  const getFireIntensity = (): string => {
    if (streak >= 30) return '🔥🔥🔥';
    if (streak >= 14) return '🔥🔥';
    if (streak >= 7) return '🔥';
    return '🔥';
  };

  const getFireColor = (): string => {
    if (streak >= 30) return '#EF4444';
    if (streak >= 14) return '#F97316';
    if (streak >= 7) return '#F59E0B';
    return '#FCD34D';
  };

  const sizeStyles = {
    sm: { container: styles.containerSm, text: styles.textSm, icon: 20 },
    md: { container: styles.containerMd, text: styles.textMd, icon: 28 },
    lg: { container: styles.containerLg, text: styles.textLg, icon: 36 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.container, currentSize.container]}>
      <View style={styles.mainDisplay}>
        <Text style={styles.fireEmoji}>{getFireIntensity()}</Text>
        <Text
          style={[
            styles.streakNumber,
            currentSize.text,
            { color: getFireColor() },
          ]}
        >
          {streak}
        </Text>
        <Text style={styles.dayLabel}>day{streak !== 1 ? 's' : ''}</Text>
      </View>

      {multiplier > 1 && (
        <View
          style={[styles.multiplierBadge, { backgroundColor: getFireColor() }]}
        >
          <Text style={styles.multiplierText}>{multiplier.toFixed(1)}x</Text>
        </View>
      )}

      {longestStreak !== undefined && longestStreak > streak && (
        <View style={styles.bestStreak}>
          <Ionicons
            name="trophy"
            size={12}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.bestText}>Best: {longestStreak}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSm: {
    padding: 8,
  },
  containerMd: {
    padding: 12,
  },
  containerLg: {
    padding: 16,
  },
  mainDisplay: {
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakNumber: {
    fontWeight: '800',
  },
  textSm: {
    fontSize: 20,
  },
  textMd: {
    fontSize: 28,
  },
  textLg: {
    fontSize: 36,
  },
  dayLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  multiplierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  multiplierText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  bestStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  bestText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});

export default StreakDisplay;
