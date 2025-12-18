/**
 * CPFI Timeline Item Component
 * Activity timeline for disputes, credit history, etc.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../constants/theme';

type TimelineStatus = 'completed' | 'current' | 'pending' | 'error';

interface TimelineItemProps {
  title: string;
  description?: string;
  timestamp?: string;
  status: TimelineStatus;
  icon?: keyof typeof Ionicons.glyphMap;
  isFirst?: boolean;
  isLast?: boolean;
}

const statusConfig: Record<TimelineStatus, { color: string; bgColor: string; icon: string }> = {
  completed: { color: '#10B981', bgColor: '#D1FAE5', icon: 'checkmark' },
  current: { color: '#3B82F6', bgColor: '#DBEAFE', icon: 'ellipse' },
  pending: { color: '#9CA3AF', bgColor: '#F3F4F6', icon: 'ellipse-outline' },
  error: { color: '#EF4444', bgColor: '#FEE2E2', icon: 'close' },
};

export function TimelineItem({
  title,
  description,
  timestamp,
  status,
  icon,
  isFirst = false,
  isLast = false,
}: TimelineItemProps) {
  const config = statusConfig[status];
  const displayIcon = icon || config.icon;

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Timeline line */}
      <View style={styles.lineContainer}>
        {!isFirst && <View style={[styles.line, styles.lineTop, { backgroundColor: config.color }]} />}
        <View style={[styles.dot, { backgroundColor: config.bgColor, borderColor: config.color }]}>
          <Ionicons 
            name={displayIcon as keyof typeof Ionicons.glyphMap} 
            size={14} 
            color={config.color} 
          />
        </View>
        {!isLast && <View style={[styles.line, styles.lineBottom, { backgroundColor: theme.colors.border }]} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, status === 'current' && styles.currentTitle]}>
          {title}
        </Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
        {timestamp && (
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 60,
  },
  lineContainer: {
    width: 40,
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
  },
  lineTop: {
    marginBottom: 0,
  },
  lineBottom: {
    marginTop: 0,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    paddingBottom: theme.spacing.lg,
    paddingLeft: theme.spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  currentTitle: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default TimelineItem;
