/**
 * CPFI Home Dashboard Screen
 * Main dashboard with credit score, quick actions, disputes, and activity
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useCreditStore } from '../../src/store/creditStore';
import { useDisputeStore } from '../../src/store/disputeStore';
import { lightTheme as theme, getScoreColor, getScoreLabel } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { ScoreGauge } from '../../src/components/ScoreGauge';
import { LoadingSkeleton, SkeletonScoreGauge, SkeletonCard } from '../../src/components/LoadingSkeleton';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { scores, alerts, unreadAlertCount, fetchScores, fetchAlerts, isLoadingScores } = useCreditStore();
  const { disputes, fetchDisputes, isLoading: isLoadingDisputes } = useDisputeStore();
  const [refreshing, setRefreshing] = useState(false);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchScores();
    fetchAlerts();
    fetchDisputes();
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchScores(), fetchAlerts(), fetchDisputes()]);
    setRefreshing(false);
  }, [fetchScores, fetchAlerts, fetchDisputes]);

  // Get primary score (average or first available)
  const primaryScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;
  const primaryChange = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.change, 0) / scores.length)
    : 0;

  // Dispute stats
  const disputeStats = {
    total: disputes.length,
    pending: disputes.filter(d => d.status === 'pending' || d.status === 'in_progress').length,
    resolved: disputes.filter(d => d.status === 'resolved' || d.status === 'deleted').length,
  };

  // Quick actions
  const quickActions = [
    { icon: 'add-circle', label: 'New Dispute', route: '/dispute/wizard', color: theme.colors.primary },
    { icon: 'speedometer', label: 'Score Details', route: '/(tabs)/credit', color: '#10B981' },
    { icon: 'build', label: 'Credit Builder', route: '/credit-builder', color: '#8B5CF6' },
    { icon: 'wallet', label: 'Finances', route: '/(tabs)/financial', color: '#F59E0B' },
    { icon: 'shield-checkmark', label: 'Identity', route: '/identity', color: '#EF4444' },
    { icon: 'chatbox', label: 'AI Assistant', route: '/chat', color: '#06B6D4' },
  ];

  // Recent activity from alerts and disputes
  const recentActivity = [
    ...alerts.slice(0, 3).map(a => ({
      type: 'alert' as const,
      title: a.title,
      date: new Date(a.createdAt).toLocaleDateString(),
      icon: 'notifications' as const,
    })),
    ...disputes.slice(0, 3).map(d => ({
      type: 'dispute' as const,
      title: `${d.creditorName} - ${d.status}`,
      date: new Date(d.createdAt).toLocaleDateString(),
      icon: 'document-text' as const,
    })),
  ].slice(0, 5);

  const isLoading = isLoadingScores || isLoadingDisputes;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            {unreadAlertCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Credit Score Card */}
        {isLoading ? (
          <Card style={styles.scoreCard}>
            <SkeletonScoreGauge />
          </Card>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(tabs)/credit')} activeOpacity={0.9}>
            <Card style={styles.scoreCard}>
              <View style={styles.scoreContainer}>
                <ScoreGauge
                  score={primaryScore}
                  size={160}
                  showLabel
                  change={primaryChange}
                />
              </View>

              {/* Bureau Scores Row */}
              {scores.length > 0 && (
                <View style={styles.bureauRow}>
                  {scores.map((score) => (
                    <View key={score.bureau} style={styles.bureauItem}>
                      <Text style={styles.bureauName}>{score.bureau}</Text>
                      <Text style={styles.bureauScore}>{score.score}</Text>
                      {score.change !== 0 && (
                        <View style={[styles.bureauChange, { backgroundColor: score.change > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                          <Ionicons
                            name={score.change > 0 ? 'arrow-up' : 'arrow-down'}
                            size={10}
                            color={score.change > 0 ? '#10B981' : '#EF4444'}
                          />
                          <Text style={[styles.bureauChangeText, { color: score.change > 0 ? '#10B981' : '#EF4444' }]}>
                            {Math.abs(score.change)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.viewScoreDetails}>
                <Text style={styles.viewScoreDetailsText}>View Score Details</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionsScroll}
          contentContainerStyle={styles.actionsContent}
        >
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionButton}
              onPress={() => router.push(action.route as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons
                  name={action.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={action.color}
                />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Disputes Overview */}
        <Card style={styles.overviewCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Disputes Overview</Text>
            <TouchableOpacity onPress={() => router.push('/dispute/wizard')}>
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{disputeStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{disputeStats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{disputeStats.resolved}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/disputes')}
          >
            <Text style={styles.viewAllText}>View All Disputes</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Credit Monitoring Status */}
        <Card style={styles.monitoringCard}>
          <View style={styles.cardHeader}>
            <View style={styles.monitoringHeader}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.cardTitle}>Credit Monitoring</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/monitoring')}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.monitoringDescription}>
            Your credit is being monitored across all three bureaus.
          </Text>
          {unreadAlertCount > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => router.push('/monitoring/alerts')}
            >
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.alertBannerText}>
                {unreadAlertCount} new alert{unreadAlertCount > 1 ? 's' : ''}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
            </TouchableOpacity>
          )}
        </Card>

        {/* Recent Activity */}
        <Card style={styles.activityCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/activity')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length > 0 ? (
            recentActivity.map((item, i) => (
              <View key={i} style={[styles.activityItem, i === recentActivity.length - 1 && styles.lastActivityItem]}>
                <View style={styles.activityIcon}>
                  <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.activityDate}>{item.date}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="time-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          )}
        </Card>

        {/* Credit Builder Promo */}
        <TouchableOpacity style={styles.promoCard} onPress={() => router.push('/credit-builder')}>
          <View style={styles.promoContent}>
            <Ionicons name="rocket" size={32} color="#fff" />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Boost Your Score</Text>
              <Text style={styles.promoSubtitle}>18 tools to improve your credit</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  greeting: { fontSize: 14, color: theme.colors.textSecondary },
  userName: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  notificationButton: { position: 'relative', padding: 8 },
  notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scoreCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  scoreContainer: { alignItems: 'center', paddingVertical: theme.spacing.md },
  bureauRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  bureauItem: { alignItems: 'center' },
  bureauName: { fontSize: 11, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  bureauScore: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  bureauChange: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
  bureauChangeText: { fontSize: 10, fontWeight: '600', marginLeft: 2 },
  viewScoreDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: theme.spacing.md, marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  viewScoreDetailsText: { color: theme.colors.primary, fontWeight: '500', marginRight: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginLeft: theme.spacing.lg, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  actionsScroll: { marginBottom: theme.spacing.md },
  actionsContent: { paddingHorizontal: theme.spacing.lg },
  actionButton: { alignItems: 'center', marginRight: theme.spacing.md, width: 80 },
  actionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, color: theme.colors.text, textAlign: 'center' },
  overviewCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.md },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  statValue: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  viewAllText: { color: theme.colors.primary, fontWeight: '500', marginRight: 4 },
  monitoringCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  monitoringHeader: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  manageText: { color: theme.colors.primary, fontWeight: '500' },
  monitoringDescription: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.md },
  alertBannerText: { flex: 1, fontSize: 13, color: '#92400E', marginLeft: 8 },
  activityCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  viewAllLink: { color: theme.colors.primary, fontWeight: '500' },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lastActivityItem: { borderBottomWidth: 0 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  activityDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  emptyActivity: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  emptyActivityText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  promoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.primary, marginHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  promoContent: { flexDirection: 'row', alignItems: 'center' },
  promoText: { marginLeft: theme.spacing.md },
  promoTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  promoSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});

