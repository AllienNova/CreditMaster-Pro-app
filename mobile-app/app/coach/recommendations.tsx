/**
 * AI Financial Coach - Recommendations Screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useCoachStore } from '../../src/store';
import { Recommendation, RecommendationType } from '../../src/types/coach.types';

const FILTER_OPTIONS: { label: string; value: RecommendationType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Savings', value: 'savings_strategy' },
  { label: 'Debt', value: 'debt_payoff' },
  { label: 'Budget', value: 'budget_adjustment' },
  { label: 'Credit', value: 'credit_improvement' },
  { label: 'Investment', value: 'investment_suggestion' },
];

export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const { recommendations, recommendationsLoading, fetchRecommendations } = useCoachStore();
  const [filter, setFilter] = useState<RecommendationType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations({ limit: 20, includeAI: true });
  }, []);

  const filteredRecs = filter === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.type === filter);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getTypeIcon = (type: RecommendationType) => {
    switch (type) {
      case 'savings_strategy': return 'wallet-outline';
      case 'debt_payoff': return 'trending-down-outline';
      case 'investment_suggestion': return 'trending-up-outline';
      case 'budget_adjustment': return 'pie-chart-outline';
      case 'credit_improvement': return 'shield-checkmark-outline';
      case 'account_optimization': return 'card-outline';
      case 'insurance_needs': return 'umbrella-outline';
      case 'tax_optimization': return 'calculator-outline';
      default: return 'bulb-outline';
    }
  };

  const renderRecommendation = (rec: Recommendation) => {
    const isExpanded = expandedId === rec.id;

    return (
      <TouchableOpacity
        key={rec.id}
        style={[styles.recCard, { backgroundColor: colors.card }]}
        onPress={() => setExpandedId(isExpanded ? null : rec.id)}
        activeOpacity={0.7}
      >
        <View style={styles.recHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name={getTypeIcon(rec.type) as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.recHeaderContent}>
            <View style={styles.recTitleRow}>
              <Text style={[styles.recTitle, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                {rec.title}
              </Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                <Text style={styles.priorityText}>{rec.priority}</Text>
              </View>
            </View>
            <Text style={[styles.recType, { color: colors.textSecondary }]}>
              {rec.type.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <Text style={[styles.recDescription, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
          {rec.description}
        </Text>

        {rec.potentialSavings && (
          <View style={styles.savingsRow}>
            <Ionicons name="cash-outline" size={16} color="#22c55e" />
            <Text style={styles.savingsText}>Potential savings: ${rec.potentialSavings.toFixed(0)}/year</Text>
          </View>
        )}

        {isExpanded && (
          <View style={styles.expandedContent}>
            {rec.aiInsight && (
              <View style={[styles.aiInsight, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.aiInsightText, { color: colors.text }]}>{rec.aiInsight}</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Action Steps</Text>
            {rec.actionSteps.map((step, idx) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                  <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>{step.description}</Text>
                </View>
              </View>
            ))}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Timeframe</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{rec.timeframe.replace(/_/g, ' ')}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Effort</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{rec.estimatedEffort}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Confidence</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{rec.confidenceScore}%</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.expandIndicator}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.filterTab, filter === option.value && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(option.value)}
          >
            <Text style={[styles.filterText, filter === option.value && styles.filterTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={recommendationsLoading} onRefresh={() => fetchRecommendations({ limit: 20, includeAI: true })} />}
      >
        {recommendationsLoading && recommendations.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : filteredRecs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recommendations in this category</Text>
          </View>
        ) : (
          filteredRecs.map(renderRecommendation)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: { paddingHorizontal: 16, paddingVertical: 12, maxHeight: 60 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(0,0,0,0.1)' },
  filterText: { fontSize: 14, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  loader: { marginTop: 40 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  recCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  recHeader: { flexDirection: 'row', marginBottom: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  recHeaderContent: { flex: 1, marginLeft: 12 },
  recTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  recType: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  recDescription: { fontSize: 14, lineHeight: 20 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  savingsText: { color: '#22c55e', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  aiInsight: { flexDirection: 'row', padding: 12, borderRadius: 8, marginBottom: 16 },
  aiInsightText: { flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  stepItem: { flexDirection: 'row', marginBottom: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  stepContent: { flex: 1, marginLeft: 12 },
  stepTitle: { fontSize: 14, fontWeight: '500' },
  stepDescription: { fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 10, textTransform: 'uppercase' },
  metaValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  expandIndicator: { alignItems: 'center', marginTop: 8 },
});

