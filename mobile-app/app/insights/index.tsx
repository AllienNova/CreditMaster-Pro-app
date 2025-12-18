/**
 * CPFI Financial Insights Screen
 * AI-powered financial insights and recommendations
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

interface Insight {
  id: string;
  type: 'spending_anomaly' | 'savings_opportunity' | 'bill_reminder' | 'budget_alert' | 'income_pattern' | 'account_optimization';
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

const MOCK_INSIGHTS: Insight[] = [
  { id: '1', type: 'spending_anomaly', title: 'Unusual spending detected', description: 'Your dining out spending increased 45% this week compared to your average.', priority: 'high', category: 'dining_out', amount: 234.50, actionLabel: 'View Details', actionRoute: '/financial/spending', dismissed: false, createdAt: new Date() },
  { id: '2', type: 'savings_opportunity', title: 'Subscription savings found', description: 'You have 3 subscriptions that haven\'t been used in 30+ days. Cancel to save $47/month.', priority: 'medium', amount: 47, actionLabel: 'Review Subscriptions', actionRoute: '/financial/bills', dismissed: false, createdAt: new Date() },
  { id: '3', type: 'bill_reminder', title: 'Electric bill due soon', description: 'Your electric bill of $124.50 is due in 3 days.', priority: 'high', amount: 124.50, actionLabel: 'Pay Now', actionRoute: '/financial/bills', dismissed: false, createdAt: new Date() },
  { id: '4', type: 'budget_alert', title: 'Shopping budget exceeded', description: 'You\'ve spent $450 of your $400 shopping budget this month.', priority: 'critical', category: 'shopping', amount: 50, actionLabel: 'Adjust Budget', actionRoute: '/financial/budgets', dismissed: false, createdAt: new Date() },
  { id: '5', type: 'income_pattern', title: 'Income stability detected', description: 'Your income has been consistent for 6 months. Consider increasing your savings rate.', priority: 'info', actionLabel: 'Set Goal', actionRoute: '/financial/goals', dismissed: false, createdAt: new Date() },
  { id: '6', type: 'account_optimization', title: 'Emergency fund low', description: 'Your emergency fund covers only 1.5 months of expenses. Target is 3-6 months.', priority: 'medium', actionLabel: 'Build Fund', actionRoute: '/financial/savings', dismissed: false, createdAt: new Date() },
];

const HEALTH_SCORE = { score: 72, grade: 'B', change: +3, breakdown: [
  { name: 'Savings', score: 65, icon: 'wallet' },
  { name: 'Debt', score: 78, icon: 'trending-down' },
  { name: 'Spending', score: 70, icon: 'cart' },
  { name: 'Credit', score: 82, icon: 'star' },
  { name: 'Investments', score: 68, icon: 'trending-up' },
]};

export default function FinancialInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'savings'>('all');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setInsights(MOCK_INSIGHTS);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const dismissInsight = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const filteredInsights = insights.filter(i => {
    if (filter === 'critical') return i.priority === 'critical' || i.priority === 'high';
    if (filter === 'savings') return i.type === 'savings_opportunity';
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#22C55E';
      default: return theme.colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'spending_anomaly': return 'alert-circle';
      case 'savings_opportunity': return 'bulb';
      case 'bill_reminder': return 'calendar';
      case 'budget_alert': return 'warning';
      case 'income_pattern': return 'trending-up';
      case 'account_optimization': return 'shield-checkmark';
      default: return 'information-circle';
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Insights</Text>
          <TouchableOpacity onPress={() => router.push('/settings/notifications')}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        <Card style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View>
              <Text style={styles.healthLabel}>Financial Health Score</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.healthScore, { color: getScoreColor(HEALTH_SCORE.score) }]}>
                  {HEALTH_SCORE.score}
                </Text>
                <View style={[styles.gradeBadge, { backgroundColor: getScoreColor(HEALTH_SCORE.score) }]}>
                  <Text style={styles.gradeText}>{HEALTH_SCORE.grade}</Text>
                </View>
                <View style={[styles.changeBadge, { backgroundColor: HEALTH_SCORE.change >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Ionicons name={HEALTH_SCORE.change >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={HEALTH_SCORE.change >= 0 ? '#22C55E' : '#EF4444'} />
                  <Text style={[styles.changeText, { color: HEALTH_SCORE.change >= 0 ? '#22C55E' : '#EF4444' }]}>
                    {Math.abs(HEALTH_SCORE.change)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.detailsButton} onPress={() => router.push('/financial/health-score')}>
              <Text style={styles.detailsText}>Details</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.breakdownRow}>
            {HEALTH_SCORE.breakdown.map((item) => (
              <View key={item.name} style={styles.breakdownItem}>
                <View style={[styles.breakdownIcon, { backgroundColor: `${getScoreColor(item.score)}15` }]}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={getScoreColor(item.score)} />
                </View>
                <Text style={styles.breakdownName}>{item.name}</Text>
                <Text style={[styles.breakdownScore, { color: getScoreColor(item.score) }]}>{item.score}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['all', 'critical', 'savings'] as const).map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All Insights' : f === 'critical' ? 'Urgent' : 'Savings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Insights Feed */}
        <Text style={styles.sectionTitle}>{filteredInsights.length} Insights</Text>
        {filteredInsights.map((insight) => (
          <Card key={insight.id} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: `${getPriorityColor(insight.priority)}15` }]}>
                <Ionicons name={getTypeIcon(insight.type)} size={20} color={getPriorityColor(insight.priority)} />
              </View>
              <View style={styles.insightContent}>
                <View style={styles.insightTitleRow}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <TouchableOpacity onPress={() => dismissInsight(insight.id)}>
                    <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.amount && (
                  <Text style={[styles.insightAmount, { color: getPriorityColor(insight.priority) }]}>
                    ${insight.amount.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            {insight.actionLabel && (
              <TouchableOpacity style={styles.actionButton} onPress={() => insight.actionRoute && router.push(insight.actionRoute as never)}>
                <Text style={styles.actionText}>{insight.actionLabel}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  healthCard: { marginBottom: theme.spacing.lg },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  healthLabel: { fontSize: 12, color: theme.colors.textSecondary },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  healthScore: { fontSize: 36, fontWeight: '700' },
  gradeBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  gradeText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  changeText: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  detailsButton: { flexDirection: 'row', alignItems: 'center' },
  detailsText: { fontSize: 13, color: theme.colors.primary, marginRight: 2 },
  breakdownRow: { flexDirection: 'row', marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  breakdownName: { fontSize: 10, color: theme.colors.textSecondary },
  breakdownScore: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  filterRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  insightCard: { marginBottom: theme.spacing.sm },
  insightHeader: { flexDirection: 'row' },
  insightIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  insightContent: { flex: 1 },
  insightTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  insightTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flex: 1, marginRight: 8 },
  insightDescription: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  insightAmount: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  actionText: { fontSize: 14, color: theme.colors.primary, fontWeight: '500', marginRight: 4 },
});
