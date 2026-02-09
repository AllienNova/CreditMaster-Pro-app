/**
 * Fynvita Alerts List Screen
 * All monitoring alerts with filtering
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card, LastUpdated } from '../../src/components';
import { useCreditStore, selectLastAlertFetch } from '../../src/store/creditStore';
import type { CreditMonitoringAlert } from '../../src/services/api/types';

type FilterType = 'all' | 'unread' | 'critical' | 'high' | 'medium' | 'low';
type AlertTypeFilter = 'all' | 'score_change' | 'new_account' | 'inquiry' | 'address_change' | 'fraud_alert' | 'derogatory';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const TYPE_FILTERS: { key: AlertTypeFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All Types', icon: 'apps' },
  { key: 'score_change', label: 'Score Changes', icon: 'trending-up' },
  { key: 'new_account', label: 'New Accounts', icon: 'add-circle' },
  { key: 'inquiry', label: 'Inquiries', icon: 'search' },
  { key: 'address_change', label: 'Address Changes', icon: 'location' },
  { key: 'fraud_alert', label: 'Fraud Alerts', icon: 'shield-checkmark' },
  { key: 'derogatory', label: 'Derogatory Items', icon: 'warning' },
];

const getAlertIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'score_change': return 'trending-up';
    case 'new_account': return 'add-circle';
    case 'inquiry': return 'search';
    case 'address_change': return 'location';
    case 'fraud_alert': return 'shield-checkmark';
    case 'derogatory': return 'warning';
    default: return 'alert-circle';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#DC2626';
    case 'high': return '#EF4444';
    case 'medium': return '#F59E0B';
    case 'low': return '#10B981';
    default: return theme.colors.textSecondary;
  }
};

// Group alerts by date
const groupAlertsByDate = (alerts: CreditMonitoringAlert[]) => {
  const groups: Record<string, CreditMonitoringAlert[]> = {};

  alerts.forEach(alert => {
    const date = new Date(alert.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(alert);
  });

  return groups;
};

export default function AlertsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>('all');
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const { alerts, fetchAlerts, acknowledgeAlert, acknowledgeAllAlerts, unreadAlertCount } = useCreditStore();
  const lastAlertFetch = useCreditStore(selectLastAlertFetch);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Severity filter
      if (filter !== 'all') {
        if (filter === 'unread' && alert.acknowledged) return false;
        if (filter !== 'unread' && alert.severity !== filter) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && alert.alertType !== typeFilter) return false;

      return true;
    });
  }, [alerts, filter, typeFilter]);

  const groupedAlerts = useMemo(() => groupAlertsByDate(filteredAlerts), [filteredAlerts]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Alerts</Text>
          {unreadAlertCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadAlertCount}</Text>
            </View>
          )}
        </View>
        {unreadAlertCount > 0 ? (
          <TouchableOpacity onPress={acknowledgeAllAlerts}>
            <Text style={styles.markAllRead}>Mark All Read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Summary Stats */}
      {alerts.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>
              {alerts.filter(a => a.severity === 'critical').length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {alerts.filter(a => a.severity === 'high').length}
            </Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {unreadAlertCount}
            </Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
        </View>
      )}

      {/* Last Updated */}
      <View style={styles.lastUpdatedContainer}>
        <LastUpdated timestamp={lastAlertFetch} label="Last checked" />
      </View>

      {/* Severity Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type Filter Toggle */}
      <TouchableOpacity
        style={styles.typeFilterToggle}
        onPress={() => setShowTypeFilters(!showTypeFilters)}
      >
        <Ionicons name="filter" size={16} color={theme.colors.primary} />
        <Text style={styles.typeFilterToggleText}>
          {typeFilter === 'all' ? 'Filter by Type' : TYPE_FILTERS.find(t => t.key === typeFilter)?.label}
        </Text>
        <Ionicons
          name={showTypeFilters ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Type Filters */}
      {showTypeFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterScroll} contentContainerStyle={styles.filterContent}>
          {TYPE_FILTERS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeFilterChip, typeFilter === t.key && styles.typeFilterChipActive]}
              onPress={() => {
                setTypeFilter(t.key);
                setShowTypeFilters(false);
              }}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={typeFilter === t.key ? '#fff' : theme.colors.textSecondary}
              />
              <Text style={[styles.typeFilterChipText, typeFilter === t.key && styles.typeFilterChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredAlerts.length > 0 ? (
          Object.entries(groupedAlerts).map(([date, dateAlerts]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {dateAlerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={styles.alertCard}
                  onPress={() => router.push(`/monitoring/alerts/${alert.id}`)}
                >
                  <View style={[styles.alertIcon, { backgroundColor: `${getSeverityColor(alert.severity)}20` }]}>
                    <Ionicons name={getAlertIcon(alert.alertType)} size={24} color={getSeverityColor(alert.severity)} />
                  </View>
                  <View style={styles.alertContent}>
                    <View style={styles.alertHeader}>
                      <Text style={[styles.alertTitle, !alert.acknowledged && styles.alertTitleUnread]} numberOfLines={1}>
                        {alert.title}
                      </Text>
                      {!alert.acknowledged && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.alertDescription} numberOfLines={2}>{alert.description}</Text>
                    <View style={styles.alertMeta}>
                      {alert.bureau && (
                        <View style={styles.bureauBadge}>
                          <Text style={styles.bureauText}>{alert.bureau}</Text>
                        </View>
                      )}
                      <View style={[styles.severityBadge, { backgroundColor: `${getSeverityColor(alert.severity)}20` }]}>
                        <Text style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}>
                          {alert.severity}
                        </Text>
                      </View>
                      <Text style={styles.alertTime}>
                        {new Date(alert.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>
              {filter === 'unread'
                ? 'No unread alerts'
                : typeFilter !== 'all'
                ? `No ${TYPE_FILTERS.find(t => t.key === typeFilter)?.label.toLowerCase()} alerts`
                : 'No alerts match your current filter'}
            </Text>
          </Card>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  backButton: { padding: 4, width: 80 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  markAllRead: { fontSize: 14, color: theme.colors.primary, fontWeight: '500', width: 80, textAlign: 'right' },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  lastUpdatedContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  filterScroll: { maxHeight: 50, marginBottom: theme.spacing.sm },
  filterContent: { paddingHorizontal: theme.spacing.lg },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: { fontSize: 14, color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  typeFilterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 8,
  },
  typeFilterToggleText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  typeFilterScroll: {
    maxHeight: 50,
    marginBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeFilterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeFilterChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  typeFilterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: { flex: 1, paddingHorizontal: theme.spacing.lg },
  dateGroup: {
    marginBottom: theme.spacing.md,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md
  },
  alertContent: { flex: 1 },
  alertHeader: { flexDirection: 'row', alignItems: 'center' },
  alertTitle: { fontSize: 15, color: theme.colors.text, flex: 1 },
  alertTitleUnread: { fontWeight: '600' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 8
  },
  alertDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  bureauBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: `${theme.colors.primary}15`,
  },
  bureauText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  alertTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 'auto',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.xl
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});

