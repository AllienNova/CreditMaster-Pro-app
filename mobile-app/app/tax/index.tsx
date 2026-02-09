/**
 * Tax Optimization Dashboard - Mobile App
 *
 * Main tax optimization screen providing:
 * - Tax savings overview
 * - Personalized recommendations
 * - Quick navigation to tax features
 * - Tax bracket visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTaxStore } from '../../src/store/taxStore';

const { width } = Dimensions.get('window');

// Priority colors
const priorityColors = {
  critical: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  high: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  medium: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  low: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
};

export default function TaxOptimizationScreen() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    analysis,
    recommendations,
    upcomingEvents,
    isLoadingAnalysis,
    error,
    fetchAnalysis,
    fetchRecommendations,
    fetchEvents,
    completeRecommendation,
  } = useTaxStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchAnalysis({
        taxYear: new Date().getFullYear(),
        grossIncome: 300000,
        filingStatus: 'single',
        stateOfResidence: 'CA',
        ytd401kContribution: 10000,
        ytdIraContribution: 0,
        ytdHsaContribution: 1000,
        hasHdhp: true,
      }),
      fetchRecommendations(),
      fetchEvents(undefined, true),
    ]);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const handleRecommendationPress = (rec: typeof recommendations[0]) => {
    Alert.alert(
      rec.title,
      `${rec.summary}\n\nEstimated Savings: ${formatCurrency(rec.estimatedTaxSavings)}${rec.deadline ? `\n\nDeadline: ${new Date(rec.deadline).toLocaleDateString()}` : ''}`,
      [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: () => completeRecommendation(rec.id),
        },
      ]
    );
  };

  if (isLoadingAnalysis && !analysis) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Analyzing your tax situation...</Text>
      </View>
    );
  }

  if (error && !analysis) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#F59E0B"
        />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#F59E0B', '#EA580C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Tax Optimization</Text>
        <Text style={styles.headerSubtitle}>AI-Powered Tax Savings</Text>

        {/* Potential Savings Card */}
        <View style={styles.savingsCard}>
          <Text style={styles.savingsLabel}>Potential Tax Savings</Text>
          <Text style={styles.savingsAmount}>
            {formatCurrency(analysis?.totalPotentialSavings || 0)}
          </Text>
          <Text style={styles.savingsNote}>Available this year</Text>
        </View>
      </LinearGradient>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>
          Tax recommendations are for informational purposes only. Consult a tax
          professional.
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Effective Rate</Text>
          <Text style={styles.statValue}>
            {formatPercent(analysis?.currentProjection.effectiveRate || 0)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Take-Home</Text>
          <Text style={styles.statValue}>
            {formatCurrency(analysis?.currentProjection.monthlyTakeHome || 0)}
          </Text>
        </View>
      </View>

      {/* Tax Breakdown Mini */}
      {analysis && (
        <View style={styles.section}>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Tax Summary</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Gross Income</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(analysis.currentProjection.grossIncome)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Taxable Income</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(analysis.currentProjection.taxableIncome)}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownRowHighlight]}>
              <Text style={styles.breakdownLabel}>Total Tax</Text>
              <Text style={[styles.breakdownValue, styles.breakdownTax]}>
                -{formatCurrency(analysis.currentProjection.totalTax)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Annual Take-Home</Text>
              <Text style={[styles.breakdownValue, styles.breakdownTakeHome]}>
                {formatCurrency(analysis.currentProjection.takeHomePay)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tax-Saving Opportunities</Text>
          <Text style={styles.sectionCount}>
            {recommendations.filter((r) => r.status !== 'completed').length}
          </Text>
        </View>

        {recommendations
          .filter((r) => r.status !== 'completed')
          .slice(0, 3)
          .map((rec) => (
            <TouchableOpacity
              key={rec.id}
              style={styles.recommendationCard}
              onPress={() => handleRecommendationPress(rec)}
              activeOpacity={0.7}
            >
              <View style={styles.recommendationHeader}>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: priorityColors[rec.priority].bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: priorityColors[rec.priority].text },
                    ]}
                  >
                    {rec.priority.toUpperCase()}
                  </Text>
                </View>
                {rec.estimatedTaxSavings > 0 && (
                  <Text style={styles.savingsBadge}>
                    Save {formatCurrency(rec.estimatedTaxSavings)}
                  </Text>
                )}
              </View>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationSummary}>{rec.summary}</Text>
              {rec.deadline && (
                <Text style={styles.deadline}>
                  Deadline: {new Date(rec.deadline).toLocaleDateString()}
                </Text>
              )}
            </TouchableOpacity>
          ))}
      </View>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            <TouchableOpacity onPress={() => router.push('/tax/calendar')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.slice(0, 2).map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View
                style={[
                  styles.eventDot,
                  {
                    backgroundColor:
                      event.priority === 'critical'
                        ? '#DC2626'
                        : event.priority === 'high'
                          ? '#EA580C'
                          : '#3B82F6',
                  },
                ]}
              />
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventDate}>
                  {new Date(event.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax Tools</Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/tax/scenarios')}
          >
            <Text style={styles.actionIcon}>🔮</Text>
            <Text style={styles.actionText}>Scenarios</Text>
            <Text style={styles.actionSubtext}>What-If Analysis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/tax/calendar')}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Calendar</Text>
            <Text style={styles.actionSubtext}>Deadlines</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/tax/optimizer')}
          >
            <Text style={styles.actionIcon}>💡</Text>
            <Text style={styles.actionText}>Optimizer</Text>
            <Text style={styles.actionSubtext}>Smart Tips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/tax/deductions')}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Deductions</Text>
            <Text style={styles.actionSubtext}>Track & Save</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.documentsButton}
          onPress={() => router.push('/tax/documents')}
        >
          <Text style={styles.documentsIcon}>📄</Text>
          <View style={styles.documentsContent}>
            <Text style={styles.documentsTitle}>Tax Documents</Text>
            <Text style={styles.documentsSubtitle}>
              Upload W-2s, 1099s, and more
            </Text>
          </View>
          <Text style={styles.documentsArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Asset Location Score */}
      {analysis && (
        <View style={styles.section}>
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreTitle}>Asset Location Score</Text>
              <Text style={styles.scoreValue}>
                {analysis.assetLocationScore}
                <Text style={styles.scoreMax}>/100</Text>
              </Text>
            </View>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreProgress,
                  { width: `${analysis.assetLocationScore}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreStatus}>
              {analysis.assetLocationScore >= 80
                ? 'Excellent - Your assets are well-positioned'
                : analysis.assetLocationScore >= 60
                  ? 'Good - Some optimization possible'
                  : 'Needs Improvement - Significant savings available'}
            </Text>
          </View>
        </View>
      )}

      {/* Footer Disclaimer */}
      <Text style={styles.footerDisclaimer}>
        Tax optimization powered by AI. All recommendations are based on current
        tax law. Consult a qualified tax professional before making tax
        decisions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#78716C',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  savingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  savingsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  savingsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  savingsNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 8,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1917',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1917',
  },
  sectionCount: {
    fontSize: 14,
    color: '#78716C',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownRowHighlight: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    marginTop: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#78716C',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
  },
  breakdownTax: {
    color: '#DC2626',
  },
  breakdownTakeHome: {
    color: '#16A34A',
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  savingsBadge: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 4,
  },
  recommendationSummary: {
    fontSize: 14,
    color: '#78716C',
  },
  deadline: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1917',
  },
  eventDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
  },
  actionSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  documentsContent: {
    flex: 1,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
  },
  documentsSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  documentsArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1917',
  },
  scoreMax: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: 'normal',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  scoreStatus: {
    fontSize: 13,
    color: '#78716C',
  },
  footerDisclaimer: {
    padding: 16,
    paddingBottom: 40,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
