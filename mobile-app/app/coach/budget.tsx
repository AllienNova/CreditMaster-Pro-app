/**
 * AI Financial Coach - Budget Optimizer Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useCoachStore } from '../../src/stores/coachStore';
import { BudgetOptimization } from '../../src/types/coach.types';

export default function BudgetOptimizerScreen() {
  const { colors } = useTheme();
  const { budgetOptimization, budgetLoading, fetchBudgetOptimization } = useCoachStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgetOptimization({ includeTemplates: true, includeScenarios: true });
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'moderate': return '#eab308';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reduce': return 'trending-down-outline';
      case 'increase': return 'trending-up-outline';
      case 'reallocate': return 'swap-horizontal-outline';
      case 'eliminate': return 'close-circle-outline';
      default: return 'bulb-outline';
    }
  };

  if (budgetLoading && !budgetOptimization) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing your budget...</Text>
      </View>
    );
  }

  const data = budgetOptimization;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={budgetLoading} onRefresh={() => fetchBudgetOptimization({ includeTemplates: true })} />}
    >
      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.summaryTitle}>Potential Monthly Savings</Text>
        <Text style={styles.summaryAmount}>${data?.potentialMonthlySavings?.toFixed(0) || 0}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryValue}>${data?.totalIncome?.toLocaleString() || 0}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Budgeted</Text>
            <Text style={styles.summaryValue}>${data?.totalBudgeted?.toLocaleString() || 0}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={styles.summaryValue}>${data?.totalSpent?.toLocaleString() || 0}</Text>
          </View>
        </View>
      </View>

      {/* AI Analysis */}
      {data?.aiAnalysis && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>AI Analysis</Text>
          </View>
          <Text style={[styles.analysisText, { color: colors.text }]}>{data.aiAnalysis}</Text>
        </View>
      )}

      {/* Key Insights */}
      {data?.keyInsights && data.keyInsights.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Key Insights</Text>
          {data.keyInsights.map((insight, idx) => (
            <View key={idx} style={styles.insightItem}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.insightText, { color: colors.text }]}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Optimizations */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Optimization Opportunities</Text>
        {data?.optimizations?.map((opt: BudgetOptimization) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optCard}
            onPress={() => setExpandedId(expandedId === opt.id ? null : opt.id)}
          >
            <View style={styles.optHeader}>
              <View style={[styles.optIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name={getTypeIcon(opt.type) as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.optContent}>
                <Text style={[styles.optCategory, { color: colors.text }]}>{opt.category}</Text>
                <Text style={[styles.optType, { color: colors.textSecondary }]}>{opt.type}</Text>
              </View>
              <View style={styles.optSavings}>
                <Text style={styles.optSavingsAmount}>+${opt.potentialSavings.toFixed(0)}</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(opt.difficulty) }]}>
                  <Text style={styles.difficultyText}>{opt.difficulty}</Text>
                </View>
              </View>
            </View>

            <View style={styles.optAmounts}>
              <Text style={[styles.optAmountText, { color: colors.textSecondary }]}>
                Current: ${opt.currentAmount.toFixed(0)} → Suggested: ${opt.suggestedAmount.toFixed(0)}
              </Text>
            </View>

            <Text style={[styles.optReason, { color: colors.text }]}>{opt.reason}</Text>

            {expandedId === opt.id && (
              <View style={styles.optExpanded}>
                <Text style={[styles.stepsTitle, { color: colors.text }]}>Action Steps:</Text>
                {opt.actionSteps.map((step, idx) => (
                  <View key={idx} style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            <Ionicons
              name={expandedId === opt.id ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
              style={styles.expandIcon}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Budget Breakdown */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Current Budget</Text>
        {data?.currentBudget?.map((cat) => (
          <View key={cat.category} style={styles.budgetItem}>
            <View style={styles.budgetHeader}>
              <Text style={[styles.budgetCategory, { color: colors.text }]}>{cat.categoryName}</Text>
              <Text style={[styles.budgetAmount, { color: colors.text }]}>${cat.spent.toFixed(0)} / ${cat.budgeted.toFixed(0)}</Text>
            </View>
            <View style={styles.budgetBar}>
              <View style={[styles.budgetFill, { width: `${Math.min(cat.percentUsed, 100)}%`, backgroundColor: cat.percentUsed > 100 ? '#ef4444' : colors.primary }]} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  summaryCard: { margin: 16, borderRadius: 16, padding: 20 },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4 },
  card: { margin: 16, marginTop: 0, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  analysisText: { fontSize: 14, lineHeight: 22 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  insightText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20 },
  optCard: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 16, marginTop: 12 },
  optHeader: { flexDirection: 'row', alignItems: 'center' },
  optIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  optContent: { flex: 1, marginLeft: 12 },
  optCategory: { fontSize: 14, fontWeight: '600' },
  optType: { fontSize: 12, textTransform: 'capitalize' },
  optSavings: { alignItems: 'flex-end' },
  optSavingsAmount: { color: '#22c55e', fontSize: 16, fontWeight: 'bold' },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  difficultyText: { color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  optAmounts: { marginTop: 12 },
  optAmountText: { fontSize: 12 },
  optReason: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  optExpanded: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  stepsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stepNumber: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  stepText: { flex: 1, marginLeft: 8, fontSize: 14 },
  expandIcon: { alignSelf: 'center', marginTop: 8 },
  budgetItem: { marginTop: 16 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetCategory: { fontSize: 14, fontWeight: '500' },
  budgetAmount: { fontSize: 14 },
  budgetBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 4 },
});

