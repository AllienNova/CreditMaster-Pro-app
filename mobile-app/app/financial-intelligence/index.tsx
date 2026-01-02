/**
 * CPFI Financial Intelligence Dashboard
 * Central hub for AI-powered financial features
 * Enhanced with Phase 2.1-2.4 integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useFinancialStore } from '../../src/store/financialStore';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface FinancialSnapshot {
  healthScore: number;
  healthGrade: string;
  healthTrend: 'up' | 'down' | 'stable';
  netWorth: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution: string;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  percentUsed: number;
  daysRemaining: number;
  topCategories: Array<{
    category: string;
    budgeted: number;
    spent: number;
    percentUsed: number;
  }>;
}

interface Insight {
  id: string;
  type: 'pattern' | 'trend' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'ai-coach',
    title: 'AI Coach',
    description: 'Get personalized advice',
    icon: 'chatbubbles',
    route: '/financial-intelligence/ai-coach',
    color: theme.colors.primary,
  },
  {
    id: 'smart-budget',
    title: 'Smart Budget',
    description: 'AI-powered budgeting',
    icon: 'calculator',
    route: '/financial-intelligence/smart-budget',
    color: '#10B981',
  },
  {
    id: 'debt-payoff',
    title: 'Debt Payoff',
    description: 'Strategic debt elimination',
    icon: 'trending-down',
    route: '/financial-intelligence/debt-payoff',
    color: '#F59E0B',
  },
  {
    id: 'spending-insights',
    title: 'Spending Insights',
    description: 'AI spending analysis',
    icon: 'analytics',
    route: '/financial-intelligence/spending-insights',
    color: '#8B5CF6',
  },
  {
    id: 'goals-manager',
    title: 'Goals Manager',
    description: 'Track financial goals',
    icon: 'flag',
    route: '/financial-intelligence/goals-manager',
    color: '#EF4444',
  },
  {
    id: 'bill-negotiator',
    title: 'Bill Negotiator',
    description: 'Save on recurring bills',
    icon: 'receipt',
    route: '/financial-intelligence/bill-negotiator',
    color: '#06B6D4',
  },
];

/**
 * Health Score Gauge Component
 * Circular progress gauge for financial health score
 */
interface HealthScoreGaugeProps {
  score: number;
  grade: string;
  trend: 'up' | 'down' | 'stable';
}

const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score, grade, trend }) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#22C55E';
    if (score >= 80) return '#84CC16';
    if (score >= 70) return '#3B82F6';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return 'trending-up';
    if (trend === 'down') return 'trending-down';
    return 'remove';
  };

  const getTrendColor = () => {
    if (trend === 'up') return theme.colors.success;
    if (trend === 'down') return theme.colors.error;
    return theme.colors.textSecondary;
  };

  return (
    <Card style={styles.healthScoreCard}>
      <Text style={styles.cardTitle}>Financial Health Score</Text>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getScoreColor(score)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>{score}</Text>
          <Text style={styles.scoreGrade}>{grade}</Text>
          <View style={styles.trendContainer}>
            <Ionicons name={getTrendIcon()} size={16} color={getTrendColor()} />
          </View>
        </View>
      </View>
    </Card>
  );
};

/**
 * Account Cards Component
 * Swipeable cards showing account balances with privacy toggle
 */
interface AccountCardsProps {
  accounts: Account[];
}

const AccountCards: React.FC<AccountCardsProps> = ({ accounts }) => {
  const [balancesHidden, setBalancesHidden] = useState(false);

  const formatCurrency = (amount: number): string => {
    if (balancesHidden) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Card style={styles.accountsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Accounts Summary</Text>
        <TouchableOpacity onPress={() => setBalancesHidden(!balancesHidden)}>
          <Ionicons
            name={balancesHidden ? 'eye-off' : 'eye'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.totalBalanceContainer}>
        <Text style={styles.totalBalanceLabel}>Total Balance</Text>
        <Text style={styles.totalBalanceValue}>{formatCurrency(totalBalance)}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
        {accounts.slice(0, 5).map((account) => (
          <View key={account.id} style={styles.accountCard}>
            <View style={styles.accountIcon}>
              <Ionicons name="wallet" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
            <Text style={styles.accountType}>{account.type}</Text>
            <Text style={styles.accountBalance}>{formatCurrency(account.balance)}</Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
};

/**
 * Budget Summary Component
 * Monthly budget progress with visual indicators
 */
interface BudgetSummaryProps {
  budget: BudgetSummary | null;
}

const BudgetSummaryComponent: React.FC<BudgetSummaryProps> = ({ budget }) => {
  if (!budget) return null;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return theme.colors.error;
    if (percentUsed >= 90) return theme.colors.warning;
    if (percentUsed >= 75) return theme.colors.primary;
    return theme.colors.success;
  };

  return (
    <Card style={styles.budgetCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Monthly Budget</Text>
        <TouchableOpacity onPress={() => router.push('/financial-intelligence/smart-budget')}>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.budgetOverview}>
        <View style={styles.budgetMetric}>
          <Text style={styles.budgetLabel}>Budgeted</Text>
          <Text style={styles.budgetValue}>{formatCurrency(budget.totalBudgeted)}</Text>
        </View>
        <View style={styles.budgetMetric}>
          <Text style={styles.budgetLabel}>Spent</Text>
          <Text style={[styles.budgetValue, { color: getProgressColor(budget.percentUsed) }]}>
            {formatCurrency(budget.totalSpent)}
          </Text>
        </View>
        <View style={styles.budgetMetric}>
          <Text style={styles.budgetLabel}>Remaining</Text>
          <Text style={styles.budgetValue}>
            {formatCurrency(budget.totalBudgeted - budget.totalSpent)}
          </Text>
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(budget.percentUsed, 100)}%`,
                backgroundColor: getProgressColor(budget.percentUsed),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{budget.percentUsed.toFixed(0)}% used</Text>
      </View>

      {budget.topCategories && budget.topCategories.length > 0 && (
        <View style={styles.topCategories}>
          <Text style={styles.topCategoriesTitle}>Top Spending Categories</Text>
          {budget.topCategories.slice(0, 3).map((cat, idx) => (
            <View key={idx} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{cat.category.replace(/_/g, ' ')}</Text>
              <Text style={styles.categoryAmount}>{formatCurrency(cat.spent)}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

/**
 * Insights List Component
 * Scrollable list of AI-generated financial insights
 */
interface InsightsListProps {
  insights: Insight[];
}

const InsightsList: React.FC<InsightsListProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return 'analytics';
      case 'trend': return 'trending-up';
      case 'recommendation': return 'bulb';
      case 'warning': return 'warning';
      case 'opportunity': return 'star';
      default: return 'information-circle';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return '#8B5CF6';
      case 'trend': return '#3B82F6';
      case 'recommendation': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'opportunity': return '#F59E0B';
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <Card style={styles.insightsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>AI Insights</Text>
        <TouchableOpacity onPress={() => router.push('/financial-intelligence/spending-insights')}>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {insights.slice(0, 5).map((insight) => (
        <View key={insight.id} style={styles.insightItem}>
          <View style={[styles.insightIcon, { backgroundColor: getInsightColor(insight.type) + '20' }]}>
            <Ionicons name={getInsightIcon(insight.type)} size={20} color={getInsightColor(insight.type)} />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightDescription} numberOfLines={2}>{insight.description}</Text>
            <View style={styles.insightMeta}>
              <Text style={styles.insightConfidence}>{(insight.confidence * 100).toFixed(0)}% confidence</Text>
              {insight.actionable && (
                <View style={styles.actionableBadge}>
                  <Text style={styles.actionableText}>Actionable</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
};

export default function FinancialIntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const { accounts } = useFinancialStore();

  const fetchSnapshot = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch health score and financial context
      const contextResponse = await fetch('/api/financial/context');
      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        setSnapshot({
          healthScore: contextData.healthScore?.score || 0,
          healthGrade: contextData.healthScore?.grade || 'N/A',
          healthTrend: contextData.healthScore?.trend || 'stable',
          netWorth: contextData.netWorth || 0,
          totalDebt: contextData.totalDebt || 0,
          monthlyIncome: contextData.monthlyIncome || 0,
          monthlyExpenses: contextData.monthlyExpenses || 0,
          savingsRate: contextData.savingsRate || 0,
        });
      }

      // Fetch budget summary from Phase 2.1
      const budgetResponse = await fetch('/api/financial/budgets/analyze?period=monthly');
      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        setBudgetSummary(budgetData.data);
      }

      // Fetch insights from Phase 2.3
      const insightsResponse = await fetch('/api/financial/spending/insights?timeRange=30d');
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.data?.insights || []);
      }

      // Fetch accounts from dashboard
      const dashboardResponse = await fetch('/api/financial/dashboard');
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setAccountsList(dashboardData.data?.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching snapshot:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSnapshot();
  }, [fetchSnapshot]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  if (loading && !snapshot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Financial Intelligence...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Intelligence</Text>
          <Text style={styles.headerSubtitle}>AI-Powered Financial Management</Text>
        </View>

        {/* Financial Snapshot */}
        {/* Health Score Gauge */}
        {snapshot && (
          <HealthScoreGauge
            score={snapshot.healthScore}
            grade={snapshot.healthGrade}
            trend={snapshot.healthTrend}
          />
        )}

        {/* Account Cards */}
        {accountsList.length > 0 && (
          <AccountCards accounts={accountsList} />
        )}

        {/* Budget Summary */}
        {budgetSummary && (
          <BudgetSummaryComponent budget={budgetSummary} />
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <InsightsList insights={insights} />
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Connected Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          <Card>
            <View style={styles.accountsInfo}>
              <Ionicons name="link" size={24} color={theme.colors.primary} />
              <Text style={styles.accountsText}>
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} connected
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  snapshotCard: {
    margin: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  healthScoreText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  healthGradeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  healthMetrics: {
    flex: 1,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  section: {
    padding: theme.spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    margin: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  accountsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountsText: {
    marginLeft: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
  },
  // Health Score Gauge styles
  healthScoreCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreGrade: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  trendContainer: {
    marginTop: 4,
  },
  // Account Cards styles
  accountsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalBalanceContainer: {
    marginBottom: theme.spacing.md,
  },
  totalBalanceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  totalBalanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  accountsScroll: {
    marginHorizontal: -theme.spacing.sm,
  },
  accountCard: {
    width: 140,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.sm,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  accountType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  // Budget Summary styles
  budgetCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  budgetOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  budgetMetric: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  progressBarContainer: {
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  topCategories: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  topCategoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  categoryName: {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  // Insights List styles
  insightsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  insightItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  insightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightConfidence: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  actionableBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionableText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '600',
  },
});
