/**
 * CPFI Credit Factor Analysis Screen
 * 5 factor breakdown with impact indicators and recommendations
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useCreditStore } from '../../src/store/creditStore';
import type { CreditFactor } from '../../src/services/api/types';

interface FactorInfo {
  name: string;
  weight: number;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  tips: string[];
  improvementActions: {
    action: string;
    impact: 'high' | 'medium' | 'low';
    timeframe: string;
  }[];
}

const FACTOR_INFO: Record<string, FactorInfo> = {
  payment_history: {
    name: 'Payment History',
    weight: 35,
    icon: 'calendar-outline',
    description: 'Your track record of paying bills on time. This is the most important factor in your credit score.',
    tips: [
      'Set up autopay for all accounts',
      'Pay at least the minimum before due date',
      'Contact creditors if you might miss a payment',
    ],
    improvementActions: [
      { action: 'Set up automatic payments', impact: 'high', timeframe: 'Immediate' },
      { action: 'Request goodwill adjustment for late payments', impact: 'high', timeframe: '30-60 days' },
      { action: 'Become an authorized user on account with perfect history', impact: 'medium', timeframe: '30-45 days' },
    ],
  },
  credit_utilization: {
    name: 'Credit Utilization',
    weight: 30,
    icon: 'card-outline',
    description: "How much of your available credit you're using. Lower is better - aim for under 30%.",
    tips: [
      'Keep utilization below 30%',
      'Pay down balances before statement closes',
      'Request credit limit increases',
    ],
    improvementActions: [
      { action: 'Pay down credit card balances', impact: 'high', timeframe: '1-2 billing cycles' },
      { action: 'Request credit limit increase', impact: 'medium', timeframe: '7-14 days' },
      { action: 'Open a new credit card (if appropriate)', impact: 'medium', timeframe: '30-45 days' },
    ],
  },
  credit_age: {
    name: 'Credit Age',
    weight: 15,
    icon: 'time-outline',
    description: 'The average age of your credit accounts. Longer history shows stability.',
    tips: [
      'Keep old accounts open',
      'Avoid opening too many new accounts',
      'Become an authorized user on old accounts',
    ],
    improvementActions: [
      { action: 'Keep oldest accounts open and active', impact: 'high', timeframe: 'Ongoing' },
      { action: 'Become authorized user on old account', impact: 'medium', timeframe: '30-45 days' },
      { action: 'Avoid opening unnecessary new accounts', impact: 'low', timeframe: 'Ongoing' },
    ],
  },
  credit_mix: {
    name: 'Credit Mix',
    weight: 10,
    icon: 'layers-outline',
    description: 'The variety of credit types you have. A healthy mix shows you can manage different types.',
    tips: [
      'Have a mix of credit cards and loans',
      'Consider a credit builder loan',
      "Don't open accounts just for mix",
    ],
    improvementActions: [
      { action: 'Consider a credit builder loan', impact: 'medium', timeframe: '30-60 days' },
      { action: 'Add a secured credit card', impact: 'medium', timeframe: '14-30 days' },
      { action: 'Keep existing account types active', impact: 'low', timeframe: 'Ongoing' },
    ],
  },
  new_credit: {
    name: 'New Credit',
    weight: 10,
    icon: 'add-circle-outline',
    description: 'Recent credit inquiries and new accounts. Too many can signal risk.',
    tips: [
      'Limit hard inquiries',
      'Space out credit applications',
      'Rate shop within 14-45 days',
    ],
    improvementActions: [
      { action: 'Wait before applying for new credit', impact: 'medium', timeframe: '6-12 months' },
      { action: 'Rate shop within 14-45 day window', impact: 'low', timeframe: 'When needed' },
      { action: 'Use pre-qualification tools (soft pulls)', impact: 'low', timeframe: 'Immediate' },
    ],
  },
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent':
      return '#22C55E';
    case 'good':
      return '#84CC16';
    case 'fair':
      return '#F59E0B';
    case 'poor':
    case 'very_poor':
      return '#EF4444';
    default:
      return theme.colors.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Needs Work';
    case 'poor':
      return 'Poor';
    case 'very_poor':
      return 'Critical';
    default:
      return 'Unknown';
  }
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high_positive':
      return '#22C55E';
    case 'positive':
      return '#84CC16';
    case 'neutral':
      return '#6B7280';
    case 'negative':
      return '#F59E0B';
    case 'high_negative':
      return '#EF4444';
    default:
      return theme.colors.textSecondary;
  }
};

const getImpactLabel = (impact: string) => {
  switch (impact) {
    case 'high_positive':
      return 'Strong Positive';
    case 'positive':
      return 'Positive';
    case 'neutral':
      return 'Neutral';
    case 'negative':
      return 'Negative';
    case 'high_negative':
      return 'Strong Negative';
    default:
      return 'Unknown';
  }
};

const getImpactIcon = (impact: string): keyof typeof Ionicons.glyphMap => {
  switch (impact) {
    case 'high_positive':
    case 'positive':
      return 'trending-up';
    case 'neutral':
      return 'remove';
    case 'negative':
    case 'high_negative':
      return 'trending-down';
    default:
      return 'help-circle';
  }
};

// Calculate score impact points based on status and weight
const calculateImpactPoints = (status: string, weight: number): number => {
  const statusMultiplier: Record<string, number> = {
    excellent: 1.0,
    good: 0.8,
    fair: 0.5,
    poor: 0.2,
    very_poor: 0.0,
  };
  return Math.round(weight * (statusMultiplier[status] || 0.5));
};

export default function FactorsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
  const { factors, fetchFactors, isLoadingScores, scores } = useCreditStore();

  useEffect(() => {
    fetchFactors();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFactors();
    setRefreshing(false);
  };

  const toggleFactor = (factorId: string) => {
    setExpandedFactor(expandedFactor === factorId ? null : factorId);
  };

  // Calculate total impact score
  const totalImpactScore = useMemo(() => {
    if (factors.length === 0) return 0;
    return factors.reduce((total, factor) => {
      const info = FACTOR_INFO[factor.id];
      if (!info) return total;
      return total + calculateImpactPoints(factor.status || 'fair', info.weight);
    }, 0);
  }, [factors]);

  // Get factors that need improvement
  const factorsNeedingImprovement = useMemo(() => {
    return factors.filter(f => f.status === 'fair' || f.status === 'poor' || f.status === 'very_poor');
  }, [factors]);

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
          <Text style={styles.title}>Credit Factors</Text>
          <TouchableOpacity
            onPress={() => router.push('/help/guides/credit-factors')}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Score Impact Summary */}
        {factors.length > 0 && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>Factor Score</Text>
                <Text style={styles.summarySubtitle}>Based on your credit profile</Text>
              </View>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{totalImpactScore}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>
            {factorsNeedingImprovement.length > 0 && (
              <View style={styles.improvementAlert}>
                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                <Text style={styles.improvementText}>
                  {factorsNeedingImprovement.length} factor{factorsNeedingImprovement.length > 1 ? 's' : ''} need{factorsNeedingImprovement.length === 1 ? 's' : ''} attention
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Overview Card */}
        <Card style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>What Affects Your Score</Text>
          <Text style={styles.overviewText}>
            Your credit score is calculated based on 5 key factors.
            Understanding these can help you improve your score.
          </Text>
          <View style={styles.weightChart}>
            {Object.entries(FACTOR_INFO).map(([key, info]) => {
              const factor = factors.find((f) => f.id === key);
              const status = factor?.status || 'fair';
              return (
                <View
                  key={key}
                  style={[
                    styles.weightBar,
                    {
                      flex: info.weight,
                      backgroundColor: getStatusColor(status),
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.weightLabels}>
            <Text style={styles.weightLabel}>35%</Text>
            <Text style={styles.weightLabel}>30%</Text>
            <Text style={styles.weightLabel}>15%</Text>
            <Text style={styles.weightLabel}>10%</Text>
            <Text style={styles.weightLabel}>10%</Text>
          </View>
          <View style={styles.legendContainer}>
            {[
              { label: 'Excellent', color: '#22C55E' },
              { label: 'Good', color: '#84CC16' },
              { label: 'Fair', color: '#F59E0B' },
              { label: 'Poor', color: '#EF4444' },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Factor Cards */}
        {isLoadingScores && factors.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="sync" size={48} color={theme.colors.primary} />
            <Text style={styles.emptyText}>Loading credit factors...</Text>
          </Card>
        ) : factors.length > 0 ? (
          factors.map((factor) => {
            const info = FACTOR_INFO[factor.id] || {
              name: factor.name,
              weight: factor.percentImpact || 0,
              icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
              description: factor.description || '',
              tips: [],
              improvementActions: [],
            };
            const isExpanded = expandedFactor === factor.id;
            const statusColor = getStatusColor(factor.status || 'fair');
            const impactColor = getImpactColor(factor.impact);
            const impactPoints = calculateImpactPoints(factor.status || 'fair', info.weight);

            return (
              <TouchableOpacity
                key={factor.id}
                onPress={() => toggleFactor(factor.id)}
                activeOpacity={0.9}
              >
                <Card style={styles.factorCard}>
                  <View style={styles.factorHeader}>
                    <View
                      style={[
                        styles.factorIcon,
                        { backgroundColor: `${statusColor}20` },
                      ]}
                    >
                      <Ionicons
                        name={info.icon}
                        size={24}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.factorInfo}>
                      <Text style={styles.factorName}>{info.name}</Text>
                      <View style={styles.factorMeta}>
                        <Text style={styles.factorWeight}>
                          {info.weight}% weight
                        </Text>
                        <View style={styles.impactBadge}>
                          <Ionicons
                            name={getImpactIcon(factor.impact)}
                            size={12}
                            color={impactColor}
                          />
                          <Text style={[styles.impactText, { color: impactColor }]}>
                            {getImpactLabel(factor.impact)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.factorStatus}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${statusColor}20` },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: statusColor }]}
                        >
                          {getStatusLabel(factor.status || 'fair')}
                        </Text>
                      </View>
                      <Text style={styles.pointsText}>{impactPoints} pts</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.factorDetails}>
                      {/* Description */}
                      <Text style={styles.factorDescription}>
                        {factor.description || info.description}
                      </Text>

                      {/* Current Value */}
                      {factor.value && (
                        <View style={styles.currentValueContainer}>
                          <Ionicons name="analytics" size={16} color={theme.colors.primary} />
                          <Text style={styles.factorValue}>
                            Current: {factor.value}
                          </Text>
                        </View>
                      )}

                      {/* Personalized Recommendation */}
                      {factor.recommendation && (
                        <View style={styles.recommendationBox}>
                          <View style={styles.recommendationHeader}>
                            <Ionicons name="bulb" size={18} color="#F59E0B" />
                            <Text style={styles.recommendationTitle}>AI Recommendation</Text>
                          </View>
                          <Text style={styles.recommendationText}>{factor.recommendation}</Text>
                        </View>
                      )}

                      {/* Improvement Actions */}
                      {info.improvementActions && info.improvementActions.length > 0 && (
                        <View style={styles.actionsSection}>
                          <Text style={styles.tipsTitle}>Action Plan</Text>
                          {info.improvementActions.map((action, index) => (
                            <View key={index} style={styles.actionItem}>
                              <View style={[
                                styles.actionImpactDot,
                                { backgroundColor: action.impact === 'high' ? '#22C55E' : action.impact === 'medium' ? '#F59E0B' : '#6B7280' }
                              ]} />
                              <View style={styles.actionContent}>
                                <Text style={styles.actionText}>{action.action}</Text>
                                <View style={styles.actionMeta}>
                                  <Text style={styles.actionTimeframe}>{action.timeframe}</Text>
                                  <View style={[
                                    styles.actionImpactBadge,
                                    { backgroundColor: action.impact === 'high' ? '#22C55E20' : action.impact === 'medium' ? '#F59E0B20' : '#6B728020' }
                                  ]}>
                                    <Text style={[
                                      styles.actionImpactText,
                                      { color: action.impact === 'high' ? '#22C55E' : action.impact === 'medium' ? '#F59E0B' : '#6B7280' }
                                    ]}>
                                      {action.impact.toUpperCase()} IMPACT
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Quick Tips */}
                      <View style={styles.tipsSection}>
                        <Text style={styles.tipsTitle}>Quick Tips</Text>
                        {info.tips.map((tip, index) => (
                          <View key={index} style={styles.tipItem}>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={theme.colors.primary}
                            />
                            <Text style={styles.tipText}>{tip}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Action Button */}
                      <TouchableOpacity
                        style={styles.learnMoreButton}
                        onPress={() =>
                          router.push(
                            `/credit-builder/${factor.id.replace('_', '-')}`
                          )
                        }
                      >
                        <Text style={styles.learnMoreText}>
                          Improve This Factor
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="pie-chart-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No factor data available</Text>
            <Text style={styles.emptySubtext}>
              Pull to refresh to load your credit factors
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
  // Summary Card Styles
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary + '08',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  summarySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  scoreMax: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  improvementAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  improvementText: {
    fontSize: 13,
    color: '#F59E0B',
    marginLeft: 8,
    fontWeight: '500',
  },
  // Overview Card Styles
  overviewCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  overviewText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  weightChart: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  weightBar: { height: '100%' },
  weightLabels: { flexDirection: 'row', marginTop: 4 },
  weightLabel: {
    flex: 1,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  // Factor Card Styles
  factorCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  factorHeader: { flexDirection: 'row', alignItems: 'center' },
  factorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  factorInfo: { flex: 1 },
  factorName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  factorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  factorWeight: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.colors.background,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  factorStatus: { alignItems: 'flex-end' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  pointsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  // Factor Details Styles
  factorDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  factorDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  currentValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.sm,
  },
  factorValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: 8,
  },
  // Recommendation Box Styles
  recommendationBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  // Action Plan Styles
  actionsSection: {
    marginBottom: theme.spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  actionImpactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionTimeframe: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  actionImpactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionImpactText: {
    fontSize: 9,
    fontWeight: '600',
  },
  // Tips Section Styles
  tipsSection: { marginBottom: theme.spacing.md },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  tipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginRight: 4,
  },
  emptyCard: {
    marginHorizontal: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
