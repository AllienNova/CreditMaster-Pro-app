/**
 * CPFI Dashboard Analytics Screen
 * Credit analytics with score progress, dispute stats, and AI recommendations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface CreditHistory { date: string; score: number; }
interface ScoreFactor { factor: string; impact: number; status: 'positive' | 'negative' | 'neutral'; }
interface DisputeStats { total: number; resolved: number; pending: number; successRate: number; }

const MOCK_DATA = {
  creditHistory: [
    { date: 'Jul', score: 620 }, { date: 'Aug', score: 635 }, { date: 'Sep', score: 648 },
    { date: 'Oct', score: 655 }, { date: 'Nov', score: 668 }, { date: 'Dec', score: 678 },
  ],
  disputeStats: { total: 12, resolved: 9, pending: 3, successRate: 75 },
  scoreFactors: [
    { factor: 'Payment History', impact: 35, status: 'positive' as const },
    { factor: 'Credit Utilization', impact: 30, status: 'negative' as const },
    { factor: 'Credit Age', impact: 15, status: 'neutral' as const },
    { factor: 'Credit Mix', impact: 10, status: 'positive' as const },
    { factor: 'New Credit', impact: 10, status: 'neutral' as const },
  ],
  recommendations: [
    'Pay down credit card balances to reduce utilization below 30%',
    'Continue making on-time payments to build positive history',
    'Consider a secured credit card to improve credit mix',
    'Avoid opening new credit accounts for the next 6 months',
  ],
};

export default function DashboardAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6m');
  const [data, setData] = useState(MOCK_DATA);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const maxScore = Math.max(...data.creditHistory.map(h => h.score));
  const minScore = Math.min(...data.creditHistory.map(h => h.score));
  const scoreGain = data.creditHistory[data.creditHistory.length - 1].score - data.creditHistory[0].score;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Credit Analytics</Text>
            <Text style={styles.subtitle}>Your credit health overview</Text>
          </View>
          <TouchableOpacity style={styles.rangeSelector}>
            <Text style={styles.rangeText}>{timeRange === '6m' ? 'Last 6 months' : timeRange}</Text>
          </TouchableOpacity>
        </View>

        {/* Score Progress Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Credit Score Progress</Text>
          <View style={styles.chartContainer}>
            {data.creditHistory.map((item, i) => (
              <View key={i} style={styles.barColumn}>
                <Text style={styles.barValue}>{item.score}</Text>
                <View style={[styles.bar, { height: ((item.score - 300) / 550) * 120 }]} />
                <Text style={styles.barLabel}>{item.date}</Text>
              </View>
            ))}
          </View>
          <View style={styles.scoreGainRow}>
            <Text style={styles.scoreGainValue}>+{scoreGain}</Text>
            <Text style={styles.scoreGainLabel}> points gained</Text>
          </View>
        </Card>

        {/* Dispute Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Dispute Performance</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: `${theme.colors.primary}10` }]}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{data.disputeStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: `${theme.colors.success}10` }]}>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>{data.disputeStats.resolved}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: `${theme.colors.warning}10` }]}>
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>{data.disputeStats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: `${theme.colors.secondary}10` }]}>
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{data.disputeStats.successRate}%</Text>
              <Text style={styles.statLabel}>Success</Text>
            </View>
          </View>
        </Card>

        {/* Score Factors */}
        <Card style={styles.factorsCard}>
          <Text style={styles.sectionTitle}>Score Factors</Text>
          {data.scoreFactors.map((factor, i) => (
            <View key={i} style={styles.factorRow}>
              <Text style={styles.factorName}>{factor.factor}</Text>
              <View style={styles.factorBar}>
                <View style={[styles.factorFill, { width: `${factor.impact}%`, backgroundColor: factor.status === 'positive' ? theme.colors.success : factor.status === 'negative' ? theme.colors.error : theme.colors.warning }]} />
              </View>
              <Text style={styles.factorPercent}>{factor.impact}%</Text>
            </View>
          ))}
        </Card>

        {/* AI Recommendations */}
        <Card style={styles.recommendationsCard}>
          <View style={styles.recommendationsHeader}>
            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}> AI Recommendations</Text>
          </View>
          {data.recommendations.map((rec, i) => (
            <View key={i} style={styles.recommendationItem}>
              <Ionicons name="bulb" size={18} color={theme.colors.primary} />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  rangeSelector: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.surface, borderRadius: 8 },
  rangeText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  chartCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingTop: 20 },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 10, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  bar: { width: 24, backgroundColor: theme.colors.primary, borderRadius: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  scoreGainRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.md },
  scoreGainValue: { fontSize: 28, fontWeight: '700', color: theme.colors.success },
  scoreGainLabel: { fontSize: 14, color: theme.colors.textSecondary },
  statsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statBox: { width: '48%', padding: theme.spacing.md, borderRadius: 12, alignItems: 'center', margin: '1%' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  factorsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  factorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  factorName: { width: 100, fontSize: 12, color: theme.colors.textSecondary },
  factorBar: { flex: 1, height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginHorizontal: 8 },
  factorFill: { height: 8, borderRadius: 4 },
  factorPercent: { width: 35, fontSize: 12, fontWeight: '600', color: theme.colors.text, textAlign: 'right' },
  recommendationsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl, padding: theme.spacing.lg },
  recommendationsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: `${theme.colors.primary}08`, padding: theme.spacing.md, borderRadius: 8, marginBottom: 8 },
  recommendationText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 8, lineHeight: 18 },
});

