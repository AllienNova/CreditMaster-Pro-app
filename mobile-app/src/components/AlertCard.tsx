/**
 * CPFI Alert Card Component
 * Displays credit monitoring alerts and notifications
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../constants/theme';

type AlertType = 'score_change' | 'new_account' | 'inquiry' | 'derogatory' | 'identity' | 'payment' | 'info';
type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

interface AlertCardProps {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
}

const typeIcons: Record<AlertType, string> = {
  score_change: 'trending-up',
  new_account: 'card-outline',
  inquiry: 'search-outline',
  derogatory: 'warning-outline',
  identity: 'shield-outline',
  payment: 'cash-outline',
  info: 'information-circle-outline',
};

const severityConfig: Record<AlertSeverity, { color: string; bgColor: string }> = {
  critical: { color: '#DC2626', bgColor: '#FEE2E2' },
  warning: { color: '#F59E0B', bgColor: '#FEF3C7' },
  info: { color: '#3B82F6', bgColor: '#DBEAFE' },
  success: { color: '#10B981', bgColor: '#D1FAE5' },
};

export function AlertCard({
  type,
  severity,
  title,
  message,
  timestamp,
  read = false,
  onPress,
  onDismiss,
}: AlertCardProps) {
  const config = severityConfig[severity];
  const icon = typeIcons[type] || 'information-circle-outline';

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity 
      style={[styles.container, !read && styles.unread]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={config.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, !read && styles.unreadTitle]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>

      {onDismiss && (
        <TouchableOpacity 
          style={styles.dismissButton} 
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}

      {!read && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unread: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.primary + '30',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  message: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
    marginLeft: theme.spacing.sm,
  },
  unreadDot: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default AlertCard;
