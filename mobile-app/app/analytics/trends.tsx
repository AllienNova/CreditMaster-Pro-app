/**
 * Fynvita Trends Analytics Screen
 * Historical data analysis and trend visualization
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface TrendMetric {
  name: string;
  current: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  data: number[];
}

const TREND_METRICS: TrendMetric[] = [
  { name: 'Credit Score', current: '742', change: 62, trend: 'up', data: [680, 695, 702, 715, 728, 742] },
  { name: 'Credit Utilization', current: '18%', change: -12, trend: 'down', data: [30, 28, 25, 22, 20, 18] },
  { name: 'Total Debt', current: '$12,450', change: -8500, trend: 'down', data: [20950, 18500, 16200, 14800, 13200, 12450] },
  { name: 'On-Time Payments', current: '100%', change: 0, trend: 'stable', data: [100, 100, 100, 100, 100, 100] },
  { name: 'Account Age', current: '4.5 yrs', change: 0.5, trend: 'up', data: [4.0, 4.1, 4.2, 4.3, 4.4, 4.5] },
];

const getTrendColor = (trend: TrendMetric['trend'], isPositive: boolean): string => {
  if (trend === 'stable') return '#F59E0B';
  return isPositive ? '#22C55E' : '#EF4444';
};

const isPositiveTrend = (name: string, trend: TrendMetric['trend']): boolean => {
  if (trend === 'stable') return true;
  const positiveUp = ['Credit Score', 'On-Time Payments', 'Account Age'];
  const positiveDown = ['Credit Utilization', 'Total Debt'];
  if (positiveUp.includes(name)) return trend === 'up';
  if (positiveDown.includes(name)) return trend === 'down';
  return true;
};

export default function TrendsAnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>(TREND_METRICS[0]);
  const periods = ['1M', '3M', '6M', '1Y', 'ALL'];
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const maxValue = Math.max(...selectedMetric.data);
  const minValue = Math.min(...selectedMetric.data);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Trends</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity key={period} style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]} onPress={() => setSelectedPeriod(period)}>
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Metric Chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{selectedMetric.name}</Text>
            <View style={styles.chartValue}>
              <Text style={styles.currentValue}>{selectedMetric.current}</Text>
              <View style={[styles.changeBadge, { backgroundColor: `${getTrendColor(selectedMetric.trend, isPositiveTrend(selectedMetric.name, selectedMetric.trend))}15` }]}>
                <Ionicons name={selectedMetric.trend === 'up' ? 'arrow-up' : selectedMetric.trend === 'down' ? 'arrow-down' : 'remove'} size={12} color={getTrendColor(selectedMetric.trend, isPositiveTrend(selectedMetric.name, selectedMetric.trend))} />
                <Text style={[styles.changeText, { color: getTrendColor(selectedMetric.trend, isPositiveTrend(selectedMetric.name, selectedMetric.trend)) }]}>
                  {selectedMetric.change > 0 ? '+' : ''}{selectedMetric.change}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.chart}>
            {selectedMetric.data.map((value, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={[styles.bar, { height: `${((value - minValue + 1) / (maxValue - minValue + 2)) * 100}%`, backgroundColor: getTrendColor(selectedMetric.trend, isPositiveTrend(selectedMetric.name, selectedMetric.trend)) }]} />
                <Text style={styles.barLabel}>{months[index]}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* All Metrics */}
        <Text style={styles.sectionTitle}>All Metrics</Text>
        {TREND_METRICS.map((metric, index) => {
          const positive = isPositiveTrend(metric.name, metric.trend);
          const color = getTrendColor(metric.trend, positive);
          return (
            <TouchableOpacity key={index} onPress={() => setSelectedMetric(metric)}>
              <Card style={[styles.metricCard, selectedMetric.name === metric.name && styles.metricCardSelected]}>
                <View style={styles.metricRow}>
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricName}>{metric.name}</Text>
                    <Text style={styles.metricValue}>{metric.current}</Text>
                  </View>
                  <View style={styles.metricTrend}>
                    <View style={[styles.trendBadge, { backgroundColor: `${color}15` }]}>
                      <Ionicons name={metric.trend === 'up' ? 'arrow-up' : metric.trend === 'down' ? 'arrow-down' : 'remove'} size={14} color={color} />
                    </View>
                    <Text style={[styles.trendText, { color }]}>
                      {metric.change > 0 ? '+' : ''}{metric.change}
                    </Text>
                  </View>
                </View>
                <View style={styles.miniChart}>
                  {metric.data.map((value, i) => (
                    <View key={i} style={[styles.miniBar, { height: `${((value - Math.min(...metric.data) + 1) / (Math.max(...metric.data) - Math.min(...metric.data) + 2)) * 100}%`, backgroundColor: color }]} />
                  ))}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

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
  periodSelector: { flexDirection: 'row', marginBottom: theme.spacing.md },
  periodButton: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 2, borderRadius: 8 },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  periodTextActive: { color: '#fff' },
  chartCard: { marginBottom: theme.spacing.lg },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  chartTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  chartValue: { alignItems: 'flex-end' },
  currentValue: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  changeText: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  chart: { flexDirection: 'row', height: 120, alignItems: 'flex-end' },
  chartBar: { flex: 1, alignItems: 'center' },
  bar: { width: '60%', borderRadius: 4 },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  metricCard: { marginBottom: theme.spacing.sm },
  metricCardSelected: { borderWidth: 2, borderColor: theme.colors.primary },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricInfo: {},
  metricName: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  metricValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  metricTrend: { alignItems: 'flex-end' },
  trendBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  trendText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  miniChart: { flexDirection: 'row', height: 30, alignItems: 'flex-end', marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  miniBar: { flex: 1, marginHorizontal: 2, borderRadius: 2 },
});

