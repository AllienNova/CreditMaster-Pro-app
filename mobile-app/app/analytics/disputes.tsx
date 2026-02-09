/**
 * Fynvita Dispute Analytics Screen
 * Dispute success rates and patterns analysis
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface DisputeStats {
  total: number;
  successful: number;
  pending: number;
  rejected: number;
}

interface DisputeByType {
  type: string;
  count: number;
  successRate: number;
}

interface MonthlyData {
  month: string;
  filed: number;
  resolved: number;
}

const DISPUTE_STATS: DisputeStats = { total: 24, successful: 18, pending: 4, rejected: 2 };

const DISPUTES_BY_TYPE: DisputeByType[] = [
  { type: 'Late Payments', count: 8, successRate: 87 },
  { type: 'Collections', count: 6, successRate: 75 },
  { type: 'Inquiries', count: 5, successRate: 100 },
  { type: 'Account Errors', count: 3, successRate: 67 },
  { type: 'Identity Errors', count: 2, successRate: 50 },
];

const MONTHLY_DATA: MonthlyData[] = [
  { month: 'Jul', filed: 4, resolved: 3 }, { month: 'Aug', filed: 5, resolved: 4 },
  { month: 'Sep', filed: 3, resolved: 5 }, { month: 'Oct', filed: 6, resolved: 4 },
  { month: 'Nov', filed: 4, resolved: 5 }, { month: 'Dec', filed: 2, resolved: 3 },
];

export default function DisputeAnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const periods = ['1M', '3M', '6M', '1Y', 'ALL'];
  const successRate = Math.round((DISPUTE_STATS.successful / DISPUTE_STATS.total) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dispute Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Success Rate */}
        <Card style={styles.successCard}>
          <View style={styles.successCircle}>
            <Text style={styles.successValue}>{successRate}%</Text>
            <Text style={styles.successLabel}>Success Rate</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{DISPUTE_STATS.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22C55E' }]}>{DISPUTE_STATS.successful}</Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{DISPUTE_STATS.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{DISPUTE_STATS.rejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        </Card>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity key={period} style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]} onPress={() => setSelectedPeriod(period)}>
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monthly Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Activity</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} /><Text style={styles.legendText}>Filed</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={styles.legendText}>Resolved</Text></View>
          </View>
          <View style={styles.chart}>
            {MONTHLY_DATA.map((data, index) => (
              <View key={index} style={styles.chartColumn}>
                <View style={styles.barGroup}>
                  <View style={[styles.bar, { height: data.filed * 15, backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.bar, { height: data.resolved * 15, backgroundColor: '#22C55E' }]} />
                </View>
                <Text style={styles.barLabel}>{data.month}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* By Type */}
        <Text style={styles.sectionTitle}>Success by Type</Text>
        {DISPUTES_BY_TYPE.map((item, index) => (
          <Card key={index} style={styles.typeCard}>
            <View style={styles.typeHeader}>
              <Text style={styles.typeName}>{item.type}</Text>
              <Text style={styles.typeCount}>{item.count} disputes</Text>
            </View>
            <View style={styles.typeProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.successRate}%`, backgroundColor: item.successRate >= 75 ? '#22C55E' : item.successRate >= 50 ? '#F59E0B' : '#EF4444' }]} />
              </View>
              <Text style={[styles.typeRate, { color: item.successRate >= 75 ? '#22C55E' : item.successRate >= 50 ? '#F59E0B' : '#EF4444' }]}>{item.successRate}%</Text>
            </View>
          </Card>
        ))}

        {/* Insights */}
        <Text style={styles.sectionTitle}>Insights</Text>
        <Card style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.insightText}>Inquiry disputes have the highest success rate. Consider disputing more inquiries.</Text>
          </View>
        </Card>
        <Card style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Ionicons name="trending-up" size={20} color="#22C55E" />
            <Text style={styles.insightText}>Your dispute success rate has improved by 12% over the last 3 months.</Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  successCard: { marginBottom: theme.spacing.md },
  successCircle: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  successValue: { fontSize: 48, fontWeight: '700', color: '#22C55E' },
  successLabel: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  periodSelector: { flexDirection: 'row', marginBottom: theme.spacing.md },
  periodButton: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 2, borderRadius: 8 },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  periodTextActive: { color: '#fff' },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  legendRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  chart: { flexDirection: 'row', height: 120, alignItems: 'flex-end' },
  chartColumn: { flex: 1, alignItems: 'center' },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end' },
  bar: { width: 12, marginHorizontal: 2, borderRadius: 3 },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  typeCard: { marginBottom: theme.spacing.sm },
  typeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  typeCount: { fontSize: 12, color: theme.colors.textSecondary },
  typeProgress: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginRight: 12 },
  progressFill: { height: '100%', borderRadius: 4 },
  typeRate: { fontSize: 14, fontWeight: '600', width: 40, textAlign: 'right' },
  insightCard: { marginBottom: theme.spacing.sm },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  insightText: { flex: 1, fontSize: 13, color: theme.colors.text, marginLeft: 12, lineHeight: 18 },
});

