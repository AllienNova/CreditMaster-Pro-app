/**
 * AI Financial Coach - Debt Strategy Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useCoachStore } from '../../src/stores/coachStore';
import { DebtStrategyPlan } from '../../src/types/coach.types';

export default function DebtStrategyScreen() {
  const { colors } = useTheme();
  const { debtStrategy, debtLoading, fetchDebtStrategy } = useCoachStore();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  useEffect(() => {
    fetchDebtStrategy({ includeRefinancing: true });
  }, []);

  useEffect(() => {
    if (debtStrategy?.recommendedStrategy) {
      setSelectedStrategy(debtStrategy.recommendedStrategy);
    }
  }, [debtStrategy]);

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'avalanche': return 'trending-down-outline';
      case 'snowball': return 'snow-outline';
      case 'hybrid': return 'git-merge-outline';
      case 'consolidation': return 'layers-outline';
      default: return 'card-outline';
    }
  };

  if (debtLoading && !debtStrategy) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing your debt...</Text>
      </View>
    );
  }

  if (!debtStrategy || debtStrategy.totalDebt === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="checkmark-circle-outline" size={64} color="#22c55e" />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Debt Free!</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Congratulations! You have no debt to manage.
        </Text>
      </View>
    );
  }

  const data = debtStrategy;
  const activeStrategy = data.strategies.find(s => s.strategy === selectedStrategy);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={debtLoading} onRefresh={() => fetchDebtStrategy({ includeRefinancing: true })} />}
    >
      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.summaryTitle}>Total Debt</Text>
        <Text style={styles.summaryAmount}>${data.totalDebt.toLocaleString()}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Accounts</Text>
            <Text style={styles.summaryValue}>{data.debtCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Avg Rate</Text>
            <Text style={styles.summaryValue}>{data.averageInterestRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Monthly</Text>
            <Text style={styles.summaryValue}>${data.monthlyPayments.toFixed(0)}</Text>
          </View>
        </View>
        {data.debtToIncomeRatio > 40 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={16} color="#fff" />
            <Text style={styles.warningText}>High debt-to-income ratio: {data.debtToIncomeRatio.toFixed(0)}%</Text>
          </View>
        )}
      </View>

      {/* Strategy Selector */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Choose Your Strategy</Text>
        <Text style={[styles.recommendedText, { color: colors.textSecondary }]}>
          Recommended: {data.recommendedStrategy}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strategySelector}>
          {data.strategies.map((strategy) => (
            <TouchableOpacity
              key={strategy.id}
              style={[
                styles.strategyTab,
                selectedStrategy === strategy.strategy && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedStrategy(strategy.strategy)}
            >
              <Ionicons
                name={getStrategyIcon(strategy.strategy) as any}
                size={24}
                color={selectedStrategy === strategy.strategy ? '#fff' : colors.text}
              />
              <Text style={[styles.strategyTabText, selectedStrategy === strategy.strategy && { color: '#fff' }]}>
                {strategy.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Active Strategy Details */}
      {activeStrategy && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{activeStrategy.name}</Text>
          <Text style={[styles.strategyDescription, { color: colors.textSecondary }]}>{activeStrategy.description}</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.text }]}>{activeStrategy.totalMonths}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Months</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: colors.text }]}>${activeStrategy.totalInterestPaid.toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Interest</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#22c55e' }]}>${activeStrategy.interestSaved.toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Saved</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#22c55e' }]}>{activeStrategy.monthsSaved}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Mo. Saved</Text>
            </View>
          </View>

          <View style={styles.payoffDate}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.payoffDateText, { color: colors.text }]}>
              Debt-free by: {new Date(activeStrategy.payoffDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.prosConsContainer}>
            <View style={styles.prosSection}>
              <Text style={[styles.prosConsTitle, { color: '#22c55e' }]}>Advantages</Text>
              {activeStrategy.advantages.map((adv, idx) => (
                <View key={idx} style={styles.prosConsItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={[styles.prosConsText, { color: colors.text }]}>{adv}</Text>
                </View>
              ))}
            </View>
            <View style={styles.consSection}>
              <Text style={[styles.prosConsTitle, { color: '#ef4444' }]}>Considerations</Text>
              {activeStrategy.disadvantages.map((dis, idx) => (
                <View key={idx} style={styles.prosConsItem}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={[styles.prosConsText, { color: colors.text }]}>{dis}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Refinancing Opportunities */}
      {data.refinancingOpportunities && data.refinancingOpportunities.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Refinancing Opportunities</Text>
          {data.refinancingOpportunities.map((opp) => (
            <View key={opp.debtId} style={styles.refiCard}>
              <Text style={[styles.refiName, { color: colors.text }]}>{opp.debtName}</Text>
              <View style={styles.refiRates}>
                <Text style={[styles.refiRate, { color: '#ef4444' }]}>{opp.currentRate}%</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                <Text style={[styles.refiRate, { color: '#22c55e' }]}>{opp.potentialRate}%</Text>
              </View>
              <Text style={[styles.refiSavings, { color: '#22c55e' }]}>
                Save ${opp.monthlySavings.toFixed(0)}/mo (${opp.totalSavings.toLocaleString()} total)
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Insights */}
      {data.aiInsights && data.aiInsights.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>AI Insights</Text>
          </View>
          {data.aiInsights.map((insight, idx) => (
            <View key={idx} style={styles.insightItem}>
              <Ionicons name="bulb-outline" size={16} color={colors.primary} />
              <Text style={[styles.insightText, { color: colors.text }]}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Motivational Tips */}
      {data.motivationalTips && data.motivationalTips.length > 0 && (
        <View style={[styles.card, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Stay Motivated</Text>
          {data.motivationalTips.map((tip, idx) => (
            <View key={idx} style={styles.tipItem}>
              <Ionicons name="heart-outline" size={16} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 24, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 8 },
  summaryCard: { margin: 16, borderRadius: 16, padding: 20 },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.3)', padding: 12, borderRadius: 8, marginTop: 16 },
  warningText: { color: '#fff', marginLeft: 8, fontSize: 14 },
  card: { margin: 16, marginTop: 0, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  recommendedText: { fontSize: 12, marginBottom: 12 },
  strategySelector: { marginTop: 8 },
  strategyTab: { alignItems: 'center', padding: 16, borderRadius: 12, marginRight: 12, backgroundColor: 'rgba(0,0,0,0.05)', minWidth: 100 },
  strategyTabText: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  strategyDescription: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricItem: { width: '48%', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8, marginBottom: 8 },
  metricValue: { fontSize: 18, fontWeight: 'bold' },
  metricLabel: { fontSize: 12, marginTop: 4 },
  payoffDate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 12, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8 },
  payoffDateText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  prosConsContainer: { marginTop: 16 },
  prosSection: { marginBottom: 16 },
  consSection: {},
  prosConsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  prosConsItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  prosConsText: { flex: 1, marginLeft: 8, fontSize: 14 },
  refiCard: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 12, marginTop: 12 },
  refiName: { fontSize: 14, fontWeight: '600' },
  refiRates: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  refiRate: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 8 },
  refiSavings: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  insightText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  tipText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20 },
});

