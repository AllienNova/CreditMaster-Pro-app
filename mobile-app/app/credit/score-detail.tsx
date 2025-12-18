/**
 * CPFI Credit Score Detail Screen
 * Large animated score display with history chart and bureau comparison
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  lightTheme as theme,
  getScoreColor,
  getScoreLabel,
} from '../../src/constants/theme';
import { ScoreGauge } from '../../src/components/ScoreGauge';
import { Card } from '../../src/components/Card';
import { LineChart } from '../../src/components/charts/LineChart';
import { useCreditStore } from '../../src/store/creditStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Score range definitions
const SCORE_RANGES = [
  { min: 300, max: 579, label: 'Poor', color: '#EF4444', description: 'Well below average' },
  { min: 580, max: 669, label: 'Fair', color: '#F59E0B', description: 'Below average' },
  { min: 670, max: 739, label: 'Good', color: '#EAB308', description: 'Near or slightly above average' },
  { min: 740, max: 799, label: 'Very Good', color: '#84CC16', description: 'Above average' },
  { min: 800, max: 850, label: 'Excellent', color: '#22C55E', description: 'Well above average' },
];

const getScoreRange = (score: number) => {
  return SCORE_RANGES.find(range => score >= range.min && score <= range.max) || SCORE_RANGES[0];
};

export default function ScoreDetailScreen() {
  const { bureau } = useLocalSearchParams<{ bureau?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBureau, setSelectedBureau] = useState(bureau || 'experian');
  const [showHistoryTable, setShowHistoryTable] = useState(false);

  const {
    scores,
    scoreHistory,
    factors,
    fetchScores,
    fetchScoreHistory,
    fetchFactors,
    isLoadingScores,
  } = useCreditStore();

  useEffect(() => {
    fetchScores();
    fetchScoreHistory(6);
    fetchFactors();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchScores(), fetchScoreHistory(6), fetchFactors()]);
    setRefreshing(false);
  };

  const currentScore =
    scores.find(
      (s) => s.bureau.toLowerCase() === selectedBureau.toLowerCase()
    ) || scores[0];
  const scoreColor = getScoreColor(currentScore?.score || 0);
  const scoreLabel = getScoreLabel(currentScore?.score || 0);
  const scoreRange = getScoreRange(currentScore?.score || 0);

  // Calculate score statistics
  const scoreStats = useMemo(() => {
    if (!scoreHistory?.history || scoreHistory.history.length === 0) {
      return null;
    }

    const scores = scoreHistory.history.map(h => h.score);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const current = currentScore?.score || 0;

    // Calculate trend
    const recentScores = scores.slice(-3);
    const trend = recentScores.length >= 2
      ? recentScores[recentScores.length - 1] > recentScores[0] ? 'improving' :
        recentScores[recentScores.length - 1] < recentScores[0] ? 'declining' : 'stable'
      : 'stable';

    return { average, highest, lowest, current, trend };
  }, [scoreHistory, currentScore]);

  // Prepare chart data from score history
  const chartData =
    scoreHistory?.history?.map((h) => ({
      label: new Date(h.date).toLocaleDateString('en-US', { month: 'short' }),
      value: h.score,
    })) || [];

  // Bureau breakdown with factors
  const bureauBreakdown = useMemo(() => {
    return scores.map(score => {
      const bureauFactors = factors.filter(f =>
        // In a real app, factors would be bureau-specific
        // For now, we'll use the same factors for all bureaus
        true
      );
      return {
        ...score,
        factors: bureauFactors,
      };
    });
  }, [scores, factors]);

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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Score Details</Text>
          <TouchableOpacity
            onPress={() => router.push('/credit-builder/simulator')}
          >
            <Ionicons
              name="calculator-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Bureau Selector */}
        <View style={styles.bureauSelector}>
          {scores.map((score) => (
            <TouchableOpacity
              key={score.bureau}
              style={[
                styles.bureauTab,
                selectedBureau.toLowerCase() === score.bureau.toLowerCase() &&
                  styles.bureauTabActive,
              ]}
              onPress={() => setSelectedBureau(score.bureau)}
            >
              <Text
                style={[
                  styles.bureauTabText,
                  selectedBureau.toLowerCase() === score.bureau.toLowerCase() &&
                    styles.bureauTabTextActive,
                ]}
              >
                {score.bureau}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Large Score Display */}
        {isLoadingScores && scores.length === 0 ? (
          <Card style={styles.scoreCard}>
            <View style={styles.loadingContainer}>
              <Ionicons name="sync" size={64} color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading score details...</Text>
            </View>
          </Card>
        ) : scores.length === 0 ? (
          <Card style={styles.scoreCard}>
            <View style={styles.emptyContainer}>
              <Ionicons
                name="speedometer-outline"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No Score Data</Text>
              <Text style={styles.emptyText}>
                Connect to a credit bureau to view your score
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => router.push('/monitoring/bureaus')}
              >
                <Text style={styles.connectButtonText}>Connect Bureau</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card style={styles.scoreCard}>
            <View style={styles.scoreContainer}>
              <ScoreGauge
                score={currentScore?.score || 0}
                size={200}
                showLabel
                change={currentScore?.change}
              />
            </View>
            <View style={styles.scoreInfo}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: `${scoreColor}20` },
                ]}
              >
                <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                  {scoreLabel}
                </Text>
              </View>
              <Text style={styles.scoreRangeText}>{scoreRange.description}</Text>
              <Text style={styles.lastUpdated}>
                Updated:{' '}
                {currentScore?.lastUpdated
                  ? new Date(currentScore.lastUpdated).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </Card>
        )}

        {/* Score Statistics */}
        {scoreStats && (
          <Card style={styles.statsCard}>
            <Text style={styles.cardTitle}>Score Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={20} color={theme.colors.primary} />
                <Text style={styles.statValue}>{scoreStats.highest}</Text>
                <Text style={styles.statLabel}>Highest</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="analytics" size={20} color={theme.colors.primary} />
                <Text style={styles.statValue}>{scoreStats.average}</Text>
                <Text style={styles.statLabel}>Average</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-down" size={20} color={theme.colors.primary} />
                <Text style={styles.statValue}>{scoreStats.lowest}</Text>
                <Text style={styles.statLabel}>Lowest</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons
                  name={scoreStats.trend === 'improving' ? 'arrow-up-circle' : scoreStats.trend === 'declining' ? 'arrow-down-circle' : 'remove-circle'}
                  size={20}
                  color={scoreStats.trend === 'improving' ? '#22C55E' : scoreStats.trend === 'declining' ? '#EF4444' : '#6B7280'}
                />
                <Text style={[
                  styles.statValue,
                  { color: scoreStats.trend === 'improving' ? '#22C55E' : scoreStats.trend === 'declining' ? '#EF4444' : '#6B7280' }
                ]}>
                  {scoreStats.trend === 'improving' ? '+' : scoreStats.trend === 'declining' ? '-' : '~'}
                  {Math.abs(scoreStats.current - scoreStats.average)}
                </Text>
                <Text style={styles.statLabel}>Trend</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Score Range Indicator */}
        <Card style={styles.rangeCard}>
          <Text style={styles.cardTitle}>Score Range</Text>
          <View style={styles.rangeBar}>
            <View
              style={[
                styles.rangeSegment,
                { backgroundColor: '#EF4444', flex: 1 },
              ]}
            />
            <View
              style={[
                styles.rangeSegment,
                { backgroundColor: '#F59E0B', flex: 1 },
              ]}
            />
            <View
              style={[
                styles.rangeSegment,
                { backgroundColor: '#EAB308', flex: 1 },
              ]}
            />
            <View
              style={[
                styles.rangeSegment,
                { backgroundColor: '#84CC16', flex: 1 },
              ]}
            />
            <View
              style={[
                styles.rangeSegment,
                { backgroundColor: '#22C55E', flex: 1 },
              ]}
            />
          </View>
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>300</Text>
            <Text style={styles.rangeLabel}>579</Text>
            <Text style={styles.rangeLabel}>669</Text>
            <Text style={styles.rangeLabel}>739</Text>
            <Text style={styles.rangeLabel}>799</Text>
            <Text style={styles.rangeLabel}>850</Text>
          </View>
          <View style={styles.rangeCategories}>
            <Text style={styles.rangeCategory}>Poor</Text>
            <Text style={styles.rangeCategory}>Fair</Text>
            <Text style={styles.rangeCategory}>Good</Text>
            <Text style={styles.rangeCategory}>Very Good</Text>
            <Text style={styles.rangeCategory}>Excellent</Text>
          </View>
        </Card>

        {/* Score History Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Score History</Text>
            <View style={styles.chartHeaderActions}>
              <TouchableOpacity
                onPress={() => setShowHistoryTable(!showHistoryTable)}
                style={styles.toggleButton}
              >
                <Ionicons
                  name={showHistoryTable ? 'bar-chart' : 'list'}
                  size={18}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/credit/history')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
          </View>
          {chartData.length > 0 ? (
            showHistoryTable ? (
              <View style={styles.historyTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Change</Text>
                </View>
                <ScrollView style={styles.tableBody} nestedScrollEnabled>
                  {scoreHistory?.history?.slice().reverse().map((item, index, arr) => {
                    const prevScore = index < arr.length - 1 ? arr[index + 1].score : item.score;
                    const change = item.score - prevScore;
                    return (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2 }]}>
                          {new Date(item.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>
                          {item.score}
                        </Text>
                        <View style={{ flex: 1, alignItems: 'flex-end', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm }}>
                          {change !== 0 && (
                            <View style={[
                              styles.tableChange,
                              { backgroundColor: change > 0 ? '#D1FAE5' : '#FEE2E2' }
                            ]}>
                              <Ionicons
                                name={change > 0 ? 'arrow-up' : 'arrow-down'}
                                size={10}
                                color={change > 0 ? '#10B981' : '#EF4444'}
                              />
                              <Text style={{
                                fontSize: 10,
                                color: change > 0 ? '#10B981' : '#EF4444',
                                marginLeft: 2,
                              }}>
                                {Math.abs(change)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <LineChart
                data={chartData}
                height={180}
                color={theme.colors.primary}
                showDots
                showArea
              />
            )
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="analytics-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyChartText}>
                No history data available
              </Text>
            </View>
          )}
        </Card>

        {/* Detailed Bureau Breakdown */}
        <Card style={styles.comparisonCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Bureau Breakdown</Text>
            <TouchableOpacity onPress={() => router.push('/credit/factors')}>
              <Text style={styles.viewAllLink}>View Factors</Text>
            </TouchableOpacity>
          </View>
          {bureauBreakdown.map((bureau) => (
            <View key={bureau.bureau} style={styles.bureauBreakdownItem}>
              <View style={styles.bureauBreakdownHeader}>
                <View style={styles.bureauInfo}>
                  <Text style={styles.bureauName}>{bureau.bureau}</Text>
                  <Text style={styles.bureauDate}>
                    {bureau.lastUpdated
                      ? new Date(bureau.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'N/A'}
                  </Text>
                </View>
                <View style={styles.bureauScoreContainer}>
                  <Text style={[styles.bureauScore, { color: getScoreColor(bureau.score) }]}>
                    {bureau.score}
                  </Text>
                  {bureau.change !== undefined && bureau.change !== 0 && (
                    <View style={[
                      styles.bureauChange,
                      { backgroundColor: bureau.change > 0 ? '#D1FAE5' : '#FEE2E2' }
                    ]}>
                      <Ionicons
                        name={bureau.change > 0 ? 'arrow-up' : 'arrow-down'}
                        size={10}
                        color={bureau.change > 0 ? '#10B981' : '#EF4444'}
                      />
                      <Text style={{
                        fontSize: 10,
                        color: bureau.change > 0 ? '#10B981' : '#EF4444',
                        marginLeft: 2,
                      }}>
                        {Math.abs(bureau.change)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {bureau.factors && bureau.factors.length > 0 && (
                <View style={styles.bureauFactors}>
                  <Text style={styles.bureauFactorsTitle}>Key Factors:</Text>
                  {bureau.factors.slice(0, 3).map((factor, idx) => (
                    <View key={idx} style={styles.bureauFactorItem}>
                      <View style={[
                        styles.factorDot,
                        { backgroundColor: factor.status === 'excellent' ? '#22C55E' :
                                          factor.status === 'good' ? '#84CC16' :
                                          factor.status === 'fair' ? '#F59E0B' : '#EF4444' }
                      ]} />
                      <Text style={styles.bureauFactorText}>{factor.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Card>

        {/* Score Simulator CTA */}
        <Card style={styles.simulatorCard}>
          <View style={styles.simulatorContent}>
            <View style={styles.simulatorIcon}>
              <Ionicons name="calculator" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.simulatorText}>
              <Text style={styles.simulatorTitle}>Score Simulator</Text>
              <Text style={styles.simulatorDescription}>
                See how different actions could impact your credit score
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.simulatorButton}
            onPress={() => router.push('/credit-builder/simulator')}
          >
            <Text style={styles.simulatorButtonText}>Try Simulator</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </Card>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/credit/factors')}
          >
            <Ionicons name="pie-chart" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Factors</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/credit-builder/simulator')}
          >
            <Ionicons
              name="calculator"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.quickActionText}>Simulator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/credit-builder')}
          >
            <Ionicons name="build" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Builder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/monitoring')}
          >
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.quickActionText}>Monitor</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  bureauSelector: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
  },
  bureauTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  bureauTabActive: { backgroundColor: theme.colors.primary },
  bureauTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  bureauTabTextActive: { color: '#fff' },
  scoreCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  connectButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  scoreInfo: { alignItems: 'center' },
  scoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '600' },
  scoreRangeText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  lastUpdated: { fontSize: 12, color: theme.colors.textSecondary },
  // Score Statistics Styles
  statsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rangeCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  rangeBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rangeSegment: { height: '100%' },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeLabel: { fontSize: 10, color: theme.colors.textSecondary },
  rangeCategories: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  rangeCategory: { fontSize: 10, color: theme.colors.textSecondary },
  chartCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  chartHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleButton: {
    padding: 4,
  },
  viewAllLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
  emptyChart: { height: 180, justifyContent: 'center', alignItems: 'center' },
  emptyChartText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  // Historical Data Table Styles
  historyTable: {
    marginTop: theme.spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableBody: {
    maxHeight: 200,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableCell: {
    fontSize: 13,
    color: theme.colors.text,
  },
  tableChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  // Bureau Breakdown Styles
  comparisonCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  bureauBreakdownItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bureauBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  bureauInfo: {
    flex: 1,
  },
  bureauName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  bureauDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bureauScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bureauScore: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  bureauChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bureauFactors: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bureauFactorsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  bureauFactorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  bureauFactorText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  comparisonBureau: {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  comparisonScore: { flexDirection: 'row', alignItems: 'center' },
  comparisonValue: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  comparisonChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  // Score Simulator CTA Styles
  simulatorCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary + '08',
  },
  simulatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  simulatorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  simulatorText: {
    flex: 1,
  },
  simulatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  simulatorDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  simulatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  simulatorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    width: (SCREEN_WIDTH - 64) / 4 - 8,
  },
  quickActionText: { fontSize: 11, color: theme.colors.text, marginTop: 4 },
});
