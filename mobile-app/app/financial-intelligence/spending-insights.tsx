/**
 * Spending Insights Mobile Screen - Phase 2.6.4
 * AI-powered spending analysis with interactive charts and insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

const { width } = Dimensions.get('window');

// TypeScript Interfaces
interface SpendingData {
  date: string;
  amount: number;
  category?: string;
}

interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
  transactionCount: number;
}

interface SpendingAlert {
  id: string;
  type: 'anomaly' | 'budget_exceeded' | 'unusual_pattern' | 'high_spending';
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  amount: number;
  date: string;
  dismissed: boolean;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  recommendation?: string;
  potentialSavings?: number;
}

interface SpendingAnalysis {
  totalSpent: number;
  averageDaily: number;
  topCategory: string;
  trends: SpendingData[];
  breakdown: CategoryBreakdownItem[];
  alerts: SpendingAlert[];
  insights: AIInsight[];
}

type TimeRange = '7d' | '30d' | '90d' | '1y';

/**
 * TimeRangeSelector Component
 * Segmented control for selecting time range
 */
interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onSelect }) => {
  const ranges: TimeRange[] = ['7d', '30d', '90d', '1y'];
  const labels: Record<TimeRange, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
    '1y': '1 Year',
  };

  return (
    <View style={styles.timeRangeContainer}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            selected === range && styles.timeRangeButtonActive,
          ]}
          onPress={() => onSelect(range)}
        >
          <Text
            style={[
              styles.timeRangeText,
              selected === range && styles.timeRangeTextActive,
            ]}
          >
            {labels[range]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/**
 * SpendingChart Component
 * Interactive line chart with touch controls
 */
interface SpendingChartProps {
  trends: SpendingData[];
  timeRange: TimeRange;
}

const SpendingChart: React.FC<SpendingChartProps> = ({ trends, timeRange }) => {
  const getLabels = (): string[] => {
    if (trends.length === 0) return [];
    
    const step = Math.ceil(trends.length / 7);
    return trends
      .filter((_, index) => index % step === 0)
      .map(t => {
        const date = new Date(t.date);
        return timeRange === '7d' || timeRange === '30d'
          ? date.getDate().toString()
          : `${date.getMonth() + 1}/${date.getDate()}`;
      });
  };

  const chartData = {
    labels: getLabels(),
    datasets: [{
      data: trends.length > 0 ? trends.map(t => t.amount) : [0],
    }],
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card style={styles.chartCard}>
      <Text style={styles.cardTitle}>Spending Trend</Text>
      <Text style={styles.cardSubtitle}>Daily spending over time</Text>

      <LineChart
        data={chartData}
        width={width - 48}
        height={220}
        chartConfig={{
          backgroundColor: theme.colors.background,
          backgroundGradientFrom: theme.colors.background,
          backgroundGradientTo: theme.colors.background,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: theme.colors.error,
          },
          formatYLabel: formatCurrency,
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
      />
    </Card>
  );
};

/**
 * CategoryBreakdown Component
 * Pie chart visualization with category list
 */
interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownItem[];
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ breakdown }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'up': return theme.colors.error;
      case 'down': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  // Prepare pie chart data
  const pieData = breakdown.slice(0, 6).map((item) => ({
    name: item.category,
    amount: item.amount,
    color: item.color,
    legendFontColor: theme.colors.text,
    legendFontSize: 12,
  }));

  if (breakdown.length === 0) {
    return (
      <Card style={styles.breakdownCard}>
        <Text style={styles.cardTitle}>Category Breakdown</Text>
        <View style={styles.emptyState}>
          <Ionicons name="pie-chart-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No spending data available</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.breakdownCard}>
      <Text style={styles.cardTitle}>Category Breakdown</Text>
      <Text style={styles.cardSubtitle}>Top spending categories</Text>

      <PieChart
        data={pieData}
        width={width - 48}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
        style={styles.pieChart}
      />

      <View style={styles.categoryList}>
        {breakdown.map((item) => (
          <TouchableOpacity
            key={item.category}
            style={[
              styles.categoryItem,
              selectedCategory === item.category && styles.categoryItemSelected,
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === item.category ? null : item.category
            )}
          >
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleRow}>
                <View style={[styles.categoryColorDot, { backgroundColor: item.color }]} />
                <Text style={styles.categoryName}>{item.category}</Text>
                <Ionicons
                  name={getTrendIcon(item.trend)}
                  size={16}
                  color={getTrendColor(item.trend)}
                />
              </View>
              <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
            </View>

            <View style={styles.categoryMeta}>
              <View style={styles.categoryProgress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{item.percentage.toFixed(1)}%</Text>
              </View>
              <Text style={styles.transactionCount}>
                {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};

/**
 * Alerts Component
 * Spending anomaly notifications
 */
interface AlertsProps {
  alerts: SpendingAlert[];
  onDismiss: (alertId: string) => void;
}

const Alerts: React.FC<AlertsProps> = ({ alerts, onDismiss }) => {
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'anomaly': return 'alert-circle';
      case 'budget_exceeded': return 'warning';
      case 'unusual_pattern': return 'analytics';
      case 'high_spending': return 'trending-up';
      default: return 'information-circle';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <Card style={styles.alertsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Spending Alerts</Text>
        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>{activeAlerts.length}</Text>
        </View>
      </View>

      {activeAlerts.map((alert) => (
        <View
          key={alert.id}
          style={[
            styles.alertItem,
            { borderLeftColor: getSeverityColor(alert.severity) },
          ]}
        >
          <View style={styles.alertHeader}>
            <View style={styles.alertIconContainer}>
              <Ionicons
                name={getAlertIcon(alert.type)}
                size={24}
                color={getSeverityColor(alert.severity)}
              />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertTitleRow}>
                <Text style={styles.alertCategory}>{alert.category}</Text>
                <Text style={[styles.alertAmount, { color: getSeverityColor(alert.severity) }]}>
                  {formatCurrency(alert.amount)}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertDate}>
                {new Date(alert.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => onDismiss(alert.id)}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </Card>
  );
};

/**
 * Insights Component
 * Expandable cards for AI recommendations
 */
interface InsightsProps {
  insights: AIInsight[];
}

const Insights: React.FC<InsightsProps> = ({ insights }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return theme.colors.success;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.textSecondary;
      default: return theme.colors.text;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return 'flash';
      case 'medium': return 'bulb';
      case 'low': return 'information-circle';
      default: return 'help-circle';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (insights.length === 0) {
    return (
      <Card style={styles.insightsCard}>
        <Text style={styles.cardTitle}>AI Insights</Text>
        <View style={styles.emptyState}>
          <Ionicons name="bulb-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No insights available yet</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.insightsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>AI Insights</Text>
        <View style={styles.insightBadge}>
          <Text style={styles.insightBadgeText}>{insights.length}</Text>
        </View>
      </View>

      {insights.map((insight) => (
        <TouchableOpacity
          key={insight.id}
          style={styles.insightItem}
          onPress={() => toggleExpand(insight.id)}
        >
          <View style={styles.insightHeader}>
            <View
              style={[
                styles.insightIcon,
                { backgroundColor: getImpactColor(insight.impact) + '20' },
              ]}
            >
              <Ionicons
                name={getImpactIcon(insight.impact)}
                size={24}
                color={getImpactColor(insight.impact)}
              />
            </View>
            <View style={styles.insightTitleContainer}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightCategory}>{insight.category}</Text>
            </View>
            <Ionicons
              name={expandedId === insight.id ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>

          {expandedId === insight.id && (
            <View style={styles.insightExpanded}>
              <Text style={styles.insightDescription}>{insight.description}</Text>

              {insight.recommendation && (
                <View style={styles.recommendationBox}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                  <Text style={styles.recommendationText}>{insight.recommendation}</Text>
                </View>
              )}

              <View style={styles.insightMeta}>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {(insight.confidence * 100).toFixed(0)}% confidence
                  </Text>
                </View>
                {insight.potentialSavings && (
                  <View style={styles.savingsBadge}>
                    <Ionicons name="cash" size={16} color={theme.colors.success} />
                    <Text style={styles.savingsText}>
                      Save {formatCurrency(insight.potentialSavings)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </Card>
  );
};

/**
 * Main SpendingInsightsScreen Component
 */
export default function SpendingInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);

  const fetchSpendingData = useCallback(async () => {
    try {
      setLoading(true);

      // Parallel API calls
      const [analysisRes, trendsRes, insightsRes, anomaliesRes] = await Promise.all([
        fetch(`/api/financial/spending/analysis?timeRange=${timeRange}`),
        fetch(`/api/financial/spending/trends?period=daily&timeRange=${timeRange}`),
        fetch(`/api/financial/spending/insights?timeRange=${timeRange}`),
        fetch('/api/financial/spending/anomalies'),
      ]);

      const analysisData = analysisRes.ok ? await analysisRes.json() : null;
      const trendsData = trendsRes.ok ? await trendsRes.json() : null;
      const insightsData = insightsRes.ok ? await insightsRes.json() : null;
      const anomaliesData = anomaliesRes.ok ? await anomaliesRes.json() : null;

      // Combine data
      const combinedAnalysis: SpendingAnalysis = {
        totalSpent: analysisData?.totalSpent || 0,
        averageDaily: analysisData?.averageDaily || 0,
        topCategory: analysisData?.topCategory || 'Unknown',
        trends: trendsData?.trends || [],
        breakdown: analysisData?.categoryBreakdown || [],
        alerts: anomaliesData?.anomalies || [],
        insights: insightsData?.insights || [],
      };

      setAnalysis(combinedAnalysis);
    } catch (error) {
      console.error('Error fetching spending data:', error);
      Alert.alert('Error', 'Failed to load spending insights. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchSpendingData();
  }, [fetchSpendingData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSpendingData();
  }, [fetchSpendingData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const handleDismissAlert = async (alertId: string) => {
    if (!analysis) return;

    // Optimistically update UI
    setAnalysis({
      ...analysis,
      alerts: analysis.alerts.map(a =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
    });

    // TODO: Call API to persist dismissal
    try {
      await fetch(`/api/financial/spending/alerts/${alertId}/dismiss`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  if (loading && !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending Insights</Text>
        {analysis && (
          <View style={styles.headerStats}>
            <Text style={styles.headerStatLabel}>Total Spent</Text>
            <Text style={styles.headerStatValue}>
              ${analysis.totalSpent.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <TimeRangeSelector selected={timeRange} onSelect={handleTimeRangeChange} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Alerts */}
        {analysis && <Alerts alerts={analysis.alerts} onDismiss={handleDismissAlert} />}

        {/* Spending Chart */}
        {analysis && analysis.trends.length > 0 && (
          <SpendingChart trends={analysis.trends} timeRange={timeRange} />
        )}

        {/* Category Breakdown */}
        {analysis && <CategoryBreakdown breakdown={analysis.breakdown} />}

        {/* AI Insights */}
        {analysis && <Insights insights={analysis.insights} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
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
  // Header
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerStatLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  // TimeRangeSelector
  timeRangeContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  timeRangeTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Chart styles
  chartCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  chart: {
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  pieChart: {
    marginVertical: theme.spacing.md,
  },
  // CategoryBreakdown styles
  breakdownCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  categoryList: {
    marginTop: theme.spacing.md,
  },
  categoryItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryItemSelected: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  categoryMeta: {
    gap: theme.spacing.sm,
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  transactionCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  // Alerts styles
  alertsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  alertBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  alertItem: {
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIconContainer: {
    marginRight: theme.spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  alertAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  alertDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  dismissButton: {
    padding: theme.spacing.sm,
  },
  // Insights styles
  insightsCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  insightBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  insightBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  insightItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  insightTitleContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  insightCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  insightExpanded: {
    marginTop: theme.spacing.md,
    paddingLeft: 64,
  },
  insightDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.success + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  insightMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});

