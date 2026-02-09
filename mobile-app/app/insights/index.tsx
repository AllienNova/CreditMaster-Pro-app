/**
 * Fynvita Financial Insights Hub
 * Main screen for AI-powered financial insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { NudgeToast } from '../../src/components/ai/NudgeToast';
import { CoachingCard } from '../../src/components/ai/CoachingCard';
import { useNudges } from '../../src/hooks/useNudges';
import { useCoaching } from '../../src/hooks/useCoaching';

interface Insight {
  id: string;
  type:
    | 'spending_anomaly'
    | 'savings_opportunity'
    | 'bill_reminder'
    | 'budget_alert'
    | 'income_pattern'
    | 'account_optimization';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category?: string;
  amount?: number;
  actionLabel?: string;
  actionRoute?: string;
  dismissed: boolean;
  createdAt: Date;
}

interface QuickStat {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MOCK_INSIGHTS: Insight[] = [
  {
    id: '1',
    type: 'spending_anomaly',
    title: 'Unusual spending detected',
    description:
      'Your dining out spending increased 45% this week compared to your average.',
    priority: 'high',
    category: 'dining_out',
    amount: 234.5,
    actionLabel: 'View Details',
    actionRoute: '/insights/spending',
    dismissed: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    type: 'savings_opportunity',
    title: 'Subscription savings found',
    description:
      "You have 3 subscriptions that haven't been used in 30+ days. Cancel to save $47/month.",
    priority: 'medium',
    amount: 47,
    actionLabel: 'Review Subscriptions',
    actionRoute: '/financial/bills',
    dismissed: false,
    createdAt: new Date(),
  },
  {
    id: '3',
    type: 'bill_reminder',
    title: 'Electric bill due soon',
    description: 'Your electric bill of $124.50 is due in 3 days.',
    priority: 'high',
    amount: 124.5,
    actionLabel: 'Pay Now',
    actionRoute: '/financial/bills',
    dismissed: false,
    createdAt: new Date(),
  },
];

const HEALTH_SCORE = {
  score: 72,
  grade: 'B',
  change: +3,
  breakdown: [
    { name: 'Savings', score: 65, icon: 'wallet' as const },
    { name: 'Debt', score: 78, icon: 'trending-down' as const },
    { name: 'Spending', score: 70, icon: 'cart' as const },
    { name: 'Credit', score: 82, icon: 'star' as const },
    { name: 'Investments', score: 68, icon: 'trending-up' as const },
  ],
};

const QUICK_STATS: QuickStat[] = [
  {
    label: 'Weekly Spending',
    value: '$1,245',
    trend: 'down',
    trendValue: '-12%',
    color: '#22C55E',
    icon: 'wallet',
  },
  {
    label: 'Active Alerts',
    value: '4',
    color: '#F59E0B',
    icon: 'notifications',
  },
  {
    label: 'Savings Rate',
    value: '18%',
    trend: 'up',
    trendValue: '+2%',
    color: '#3B82F6',
    icon: 'trending-up',
  },
  {
    label: 'Credit Score',
    value: '742',
    trend: 'up',
    trendValue: '+8',
    color: '#8B5CF6',
    icon: 'analytics',
  },
];

const QUICK_ACTIONS = [
  {
    id: 'alerts',
    label: 'Smart Alerts',
    icon: 'notifications' as const,
    color: '#EF4444',
    route: '/insights/alerts',
    badge: 4,
  },
  {
    id: 'weekly',
    label: 'Weekly Summary',
    icon: 'bar-chart' as const,
    color: '#3B82F6',
    route: '/insights/weekly-summary',
  },
  {
    id: 'spending',
    label: 'Spending Analysis',
    icon: 'pie-chart' as const,
    color: '#22C55E',
    route: '/insights/spending',
  },
  {
    id: 'nudges',
    label: 'AI Tips',
    icon: 'bulb' as const,
    color: '#F59E0B',
    route: '/insights/nudges',
    badge: 2,
  },
];

export default function FinancialInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'savings'>('all');

  // AI Nudges and Coaching hooks
  const { activeNudge, respondToNudge } = useNudges();
  const { activeSessions, startSession } = useCoaching();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setInsights(MOCK_INSIGHTS);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const dismissInsight = (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  const filteredInsights = insights.filter((i) => {
    if (filter === 'critical')
      return i.priority === 'critical' || i.priority === 'high';
    if (filter === 'savings') return i.type === 'savings_opportunity';
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#22C55E';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'spending_anomaly':
        return 'alert-circle';
      case 'savings_opportunity':
        return 'bulb';
      case 'bill_reminder':
        return 'calendar';
      case 'budget_alert':
        return 'warning';
      case 'income_pattern':
        return 'trending-up';
      case 'account_optimization':
        return 'shield-checkmark';
      default:
        return 'information-circle';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Insights</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/notifications' as never)}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        <Card style={[styles.healthCard, { backgroundColor: getScoreColor(HEALTH_SCORE.score) }]}>
          <View style={styles.healthHeader}>
            <View>
              <Text style={styles.healthLabel}>Financial Health Score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.healthScore}>{HEALTH_SCORE.score}</Text>
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeText}>{HEALTH_SCORE.grade}</Text>
                </View>
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        HEALTH_SCORE.change >= 0 ? 'rgba(255,255,255,0.3)' : '#FEE2E2',
                    },
                  ]}
                >
                  <Ionicons
                    name={HEALTH_SCORE.change >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={HEALTH_SCORE.change >= 0 ? '#fff' : '#EF4444'}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color: HEALTH_SCORE.change >= 0 ? '#fff' : '#EF4444',
                      },
                    ]}
                  >
                    {Math.abs(HEALTH_SCORE.change)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => router.push('/insights/weekly-summary' as never)}
            >
              <Text style={styles.detailsText}>Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.breakdownRow}>
            {HEALTH_SCORE.breakdown.map((item) => (
              <View key={item.name} style={styles.breakdownItem}>
                <View style={styles.breakdownIcon}>
                  <Ionicons name={item.icon} size={14} color="#fff" />
                </View>
                <Text style={styles.breakdownName}>{item.name}</Text>
                <Text style={styles.breakdownScore}>{item.score}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          {QUICK_STATS.map((stat) => (
            <Card key={stat.label} style={styles.quickStatCard}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
              <Text style={styles.quickStatValue}>{stat.value}</Text>
              <Text style={styles.quickStatLabel}>{stat.label}</Text>
              {stat.trend && (
                <View style={styles.quickStatTrend}>
                  <Ionicons
                    name={stat.trend === 'up' ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={stat.trend === 'down' ? '#22C55E' : stat.color}
                  />
                  <Text
                    style={[
                      styles.quickStatTrendText,
                      { color: stat.trend === 'down' ? '#22C55E' : stat.color },
                    ]}
                  >
                    {stat.trendValue}
                  </Text>
                </View>
              )}
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionCard, { backgroundColor: `${action.color}10` }]}
              onPress={() => router.push(action.route as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={22} color="#fff" />
                {action.badge && (
                  <View style={styles.quickActionBadge}>
                    <Text style={styles.quickActionBadgeText}>{action.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Nudge */}
        {activeNudge && (
          <NudgeToast
            nudge={activeNudge}
            onAccept={() => respondToNudge(activeNudge.id, 'accepted')}
            onDismiss={() => respondToNudge(activeNudge.id, 'dismissed')}
            onSnooze={() => respondToNudge(activeNudge.id, 'snoozed')}
          />
        )}

        {/* Coaching Sessions */}
        {activeSessions.length > 0 && (
          <View style={styles.coachingSection}>
            <View style={styles.coachingSectionHeader}>
              <Text style={styles.coachingSectionTitle}>Coaching for You</Text>
              <TouchableOpacity onPress={() => router.push('/chat' as never)}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {activeSessions.slice(0, 2).map((session) => (
              <CoachingCard
                key={session.id}
                session={session}
                compact
                onStart={() => {
                  startSession(session.id);
                  router.push('/chat' as never);
                }}
              />
            ))}
          </View>
        )}

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>Latest Insights</Text>
          <View style={styles.filterRow}>
            {(['all', 'critical', 'savings'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  filter === f && styles.filterChipActive,
                ]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f === 'all'
                    ? 'All'
                    : f === 'critical'
                      ? 'Urgent'
                      : 'Savings'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Insights Feed */}
        {filteredInsights.map((insight) => (
          <Card key={insight.id} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View
                style={[
                  styles.insightIcon,
                  {
                    backgroundColor: `${getPriorityColor(insight.priority)}15`,
                  },
                ]}
              >
                <Ionicons
                  name={getTypeIcon(insight.type)}
                  size={20}
                  color={getPriorityColor(insight.priority)}
                />
              </View>
              <View style={styles.insightContent}>
                <View style={styles.insightTitleRow}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <TouchableOpacity onPress={() => dismissInsight(insight.id)}>
                    <Ionicons
                      name="close"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.insightDescription}>
                  {insight.description}
                </Text>
                {insight.amount && (
                  <Text
                    style={[
                      styles.insightAmount,
                      { color: getPriorityColor(insight.priority) },
                    ]}
                  >
                    ${insight.amount.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            {insight.actionLabel && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  insight.actionRoute &&
                  router.push(insight.actionRoute as never)
                }
              >
                <Text style={styles.actionText}>{insight.actionLabel}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
          </Card>
        ))}

        {filteredInsights.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>
              No {filter === 'critical' ? 'urgent' : filter === 'savings' ? 'savings' : ''} insights right now.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  healthCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.lg },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  healthLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  healthScore: { fontSize: 36, fontWeight: '700', color: '#fff' },
  gradeBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  gradeText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  changeText: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  detailsButton: { flexDirection: 'row', alignItems: 'center' },
  detailsText: { fontSize: 13, color: '#fff', marginRight: 2, fontWeight: '500' },
  breakdownRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  breakdownName: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  breakdownScore: { fontSize: 14, fontWeight: '600', marginTop: 2, color: '#fff' },
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  quickStatCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 8,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  quickStatLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  quickStatTrend: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  quickStatTrendText: { fontSize: 12, fontWeight: '500', marginLeft: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  quickActionCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 8,
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  quickActionBadgeText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  filterRow: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginLeft: 6,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  insightCard: { marginBottom: theme.spacing.sm },
  insightHeader: { flexDirection: 'row' },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: { flex: 1 },
  insightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  insightDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  insightAmount: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  coachingSection: {
    marginBottom: theme.spacing.lg,
  },
  coachingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  coachingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  viewAllLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
