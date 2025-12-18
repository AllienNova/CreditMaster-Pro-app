/**
 * CPFI Admin Metrics Screen
 * Detailed metrics and analytics
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

const { width } = Dimensions.get('window');

interface MetricData {
  label: string;
  value: number;
  color: string;
}

const REVENUE_DATA: MetricData[] = [
  { label: 'Basic', value: 45000, color: '#3B82F6' },
  { label: 'Premium', value: 125000, color: theme.colors.primary },
  { label: 'Enterprise', value: 75890, color: '#8B5CF6' },
];

const DISPUTE_DATA: MetricData[] = [
  { label: 'Pending', value: 234, color: '#F59E0B' },
  { label: 'In Progress', value: 567, color: '#3B82F6' },
  { label: 'Resolved', value: 1234, color: '#22C55E' },
  { label: 'Rejected', value: 89, color: '#EF4444' },
];

export default function AdminMetricsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const periods = ['week', 'month', 'year'] as const;

  const totalRevenue = REVENUE_DATA.reduce((sum, item) => sum + item.value, 0);
  const totalDisputes = DISPUTE_DATA.reduce((sum, item) => sum + item.value, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Metrics</Text>
          <TouchableOpacity><Ionicons name="download" size={24} color={theme.colors.text} /></TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {periods.map((period) => (
            <TouchableOpacity key={period} style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]} onPress={() => setSelectedPeriod(period)}>
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Card */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Breakdown</Text>
          <Text style={styles.chartTotal}>${totalRevenue.toLocaleString()}</Text>
          <View style={styles.barChart}>
            {REVENUE_DATA.map((item, idx) => (
              <View key={idx} style={styles.barItem}>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { height: `${(item.value / totalRevenue) * 100}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
                <Text style={styles.barValue}>${(item.value / 1000).toFixed(0)}K</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Disputes Card */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Dispute Status</Text>
          <Text style={styles.chartTotal}>{totalDisputes.toLocaleString()} Total</Text>
          <View style={styles.horizontalBars}>
            {DISPUTE_DATA.map((item, idx) => (
              <View key={idx} style={styles.horizontalBarItem}>
                <View style={styles.horizontalBarHeader}>
                  <Text style={styles.horizontalBarLabel}>{item.label}</Text>
                  <Text style={styles.horizontalBarValue}>{item.value}</Text>
                </View>
                <View style={styles.horizontalBarBg}>
                  <View style={[styles.horizontalBar, { width: `${(item.value / totalDisputes) * 100}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          {[
            { title: 'Conversion Rate', value: '12.5%', change: '+2.3%', icon: 'trending-up' },
            { title: 'Churn Rate', value: '3.2%', change: '-0.5%', icon: 'trending-down' },
            { title: 'Avg Session', value: '8m 32s', change: '+1m 12s', icon: 'time' },
            { title: 'NPS Score', value: '72', change: '+5', icon: 'happy' },
          ].map((kpi, idx) => (
            <Card key={idx} style={styles.kpiCard}>
              <Ionicons name={kpi.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.colors.primary} />
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiTitle}>{kpi.title}</Text>
              <Text style={[styles.kpiChange, { color: kpi.change.startsWith('+') ? '#22C55E' : '#EF4444' }]}>{kpi.change}</Text>
            </Card>
          ))}
        </View>

        {/* Top Features */}
        <Text style={styles.sectionTitle}>Most Used Features</Text>
        <Card style={styles.featuresCard}>
          {[
            { name: 'Credit Score Check', usage: 89 },
            { name: 'Dispute Generation', usage: 76 },
            { name: 'Score Simulator', usage: 65 },
            { name: 'Budget Tracking', usage: 54 },
            { name: 'Bill Reminders', usage: 43 },
          ].map((feature, idx) => (
            <View key={idx} style={[styles.featureItem, idx < 4 && styles.featureBorder]}>
              <Text style={styles.featureName}>{feature.name}</Text>
              <View style={styles.featureBarBg}>
                <View style={[styles.featureBar, { width: `${feature.usage}%` }]} />
              </View>
              <Text style={styles.featureUsage}>{feature.usage}%</Text>
            </View>
          ))}
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
  periodRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 4, marginBottom: theme.spacing.lg },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  periodTextActive: { color: '#fff' },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  chartTotal: { fontSize: 24, fontWeight: '700', color: theme.colors.primary, marginTop: 4, marginBottom: theme.spacing.md },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', height: 150 },
  barItem: { alignItems: 'center', flex: 1 },
  barContainer: { height: 100, width: 40, backgroundColor: theme.colors.border, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8 },
  barValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  horizontalBars: { marginTop: theme.spacing.sm },
  horizontalBarItem: { marginBottom: theme.spacing.sm },
  horizontalBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  horizontalBarLabel: { fontSize: 13, color: theme.colors.text },
  horizontalBarValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  horizontalBarBg: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  horizontalBar: { height: '100%', borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: theme.spacing.lg },
  kpiCard: { width: '48%', margin: '1%', alignItems: 'center', paddingVertical: theme.spacing.md },
  kpiValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  kpiTitle: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  kpiChange: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  featuresCard: { padding: 0 },
  featureItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md },
  featureBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  featureName: { width: 120, fontSize: 13, color: theme.colors.text },
  featureBarBg: { flex: 1, height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  featureBar: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  featureUsage: { width: 40, fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'right' },
});

