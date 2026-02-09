/**
 * Fynvita Mobile Payday Countdown Widget
 * Shows countdown to next payday with circular progress
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { lightTheme as theme } from '../../constants/theme';

interface PaydayCountdownProps {
  daysUntilPayday?: number;
  nextPayDate?: Date;
  expectedAmount?: number;
  sourceName?: string;
  percentComplete?: number;
  isLoading?: boolean;
  hasIncomeSources?: boolean;
  onAddIncome?: () => void;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function CircularProgress({
  value,
  size = 100,
  strokeWidth = 8,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#22C55E" />
            <Stop offset="100%" stopColor="#10B981" />
          </LinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={[styles.progressContent, { width: size, height: size }]}>
        {children}
      </View>
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonDetails}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}

function EmptyState({ onAddIncome }: { onAddIncome?: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.emptyContent}>
        <View style={styles.emptyIcon}>
          <Ionicons name="wallet-outline" size={28} color={theme.colors.success} />
        </View>
        <View style={styles.emptyTextContainer}>
          <Text style={styles.emptyTitle}>Track Your Payday</Text>
          <Text style={styles.emptySubtitle}>
            Add income to see countdown
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddIncome}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function PaydayCountdown({
  daysUntilPayday = 0,
  nextPayDate,
  expectedAmount = 0,
  sourceName = 'Paycheck',
  percentComplete = 0,
  isLoading = false,
  hasIncomeSources = true,
  onAddIncome,
}: PaydayCountdownProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(percentComplete);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentComplete]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!hasIncomeSources) {
    return <EmptyState onAddIncome={onAddIncome} />;
  }

  const isPayday = daysUntilPayday === 0;
  const isTomorrow = daysUntilPayday === 1;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/dashboard/income')}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <CircularProgress value={animatedValue} size={90}>
          <View style={styles.daysContainer}>
            {isPayday ? (
              <>
                <Text style={styles.payDayEmoji}>🎉</Text>
                <Text style={styles.payDayText}>Payday!</Text>
              </>
            ) : (
              <>
                <Text style={styles.daysNumber}>{daysUntilPayday}</Text>
                <Text style={styles.daysLabel}>{isTomorrow ? 'day' : 'days'}</Text>
              </>
            )}
          </View>
        </CircularProgress>

        <View style={styles.details}>
          <Text style={styles.title}>
            {isPayday
              ? "Today's payday!"
              : isTomorrow
                ? 'Payday tomorrow!'
                : 'Days until payday'}
          </Text>
          <Text style={styles.amount}>{formatCurrency(expectedAmount)}</Text>
          <Text style={styles.source}>{sourceName}</Text>

          <View style={styles.infoRow}>
            {nextPayDate && (
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.infoText}>{formatDate(nextPayDate)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{percentComplete}% through pay period</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysContainer: {
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  daysLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  payDayEmoji: {
    fontSize: 24,
  },
  payDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  source: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  // Empty state styles
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Skeleton styles
  skeletonCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.border,
  },
  skeletonDetails: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    width: '80%',
  },
});

export default PaydayCountdown;
