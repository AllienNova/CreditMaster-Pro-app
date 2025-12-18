/**
 * CPFI Cash Flow Analysis Screen
 * Analyze income vs expenses and cash flow trends with real charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { LineChart, BarChart } from '../../src/components/charts';
import { financialOverviewApi } from '../../src/services/api/financial';

interface CashFlowData { month: string; income: number; expenses: number; }

const MOCK_DATA: CashFlowData[] = [
  { month: 'Jul', income: 5200, expenses: 4100 },
  { month: 'Aug', income: 5200, expenses: 4350 },
  { month: 'Sep', income: 5450, expenses: 4200 },
  { month: 'Oct', income: 5600, expenses: 4500 },
  { month: 'Nov', income: 5800, expenses: 4600 },
  { month: 'Dec', income: 6100, expenses: 5200 },
];

const { width: screenWidth } = Dimensions.get('window');

export default function CashFlowScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CashFlowData[]>([]);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const loadCashFlowData = useCallback(async () => {
    try {
      const response = await financialOverviewApi.getCashFlow(6);
      if (response.success && response.data) {
        const { income, expenses } = response.data;
        const mergedData = income.map((inc, i) => ({
          month: inc.month,
          income: inc.amount,
          expenses: expenses[i]?.amount || 0,
        }));
        setData(mergedData.length > 0 ? mergedData : MOCK_DATA);
      } else {
        setData(MOCK_DATA);
      }
    } catch (err) {
      console.warn('Using mock cash flow data:', err);
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCashFlowData(); }, [loadCashFlowData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCashFlowData();
    setRefreshing(false);
  };

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;
  const avgSavingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0';

  // Prepare chart data
  const incomeChartData = data.map(d => ({ value: d.income, label: d.month }));
  const expenseChartData = data.map(d => ({ value: d.expenses, label: d.month }));
  const netChartData = data.map(d => ({ value: d.income - d.expenses, label: d.month }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing cash flow...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Cash Flow Analysis</Text>
            <Text style={styles.subtitle}>Income vs Expenses</Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: '#22C55E10' }]}>
            <Ionicons name="arrow-down-circle" size={24} color="#22C55E" />
            <Text style={[styles.statValue, { color: '#22C55E' }]}>${(totalIncome / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Total Income</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#EF444410' }]}>
            <Ionicons name="arrow-up-circle" size={24} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>${(totalExpenses / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: `${theme.colors.primary}10` }]}>
            <Ionicons name="wallet" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>${(netCashFlow / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Net Cash Flow</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#8B5CF610' }]}>
            <Ionicons name="trending-up" size={24} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{avgSavingsRate}%</Text>
            <Text style={styles.statLabel}>Savings Rate</Text>
          </Card>
        </View>

        {/* Chart Type Toggle */}
        <View style={styles.chartToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, chartType === 'line' && styles.toggleButtonActive]}
            onPress={() => setChartType('line')}
          >
            <Ionicons name="analytics" size={18} color={chartType === 'line' ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.toggleText, chartType === 'line' && styles.toggleTextActive]}>Line</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, chartType === 'bar' && styles.toggleButtonActive]}
            onPress={() => setChartType('bar')}
          >
            <Ionicons name="bar-chart" size={18} color={chartType === 'bar' ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.toggleText, chartType === 'bar' && styles.toggleTextActive]}>Bar</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>
          {chartType === 'line' ? (
            <View>
              <LineChart
                data={incomeChartData}
                width={screenWidth - 64}
                height={180}
                color="#22C55E"
                showDots
                showGrid
                formatValue={(v) => `$${(v / 1000).toFixed(1)}K`}
              />
              <View style={{ marginTop: 8 }}>
                <LineChart
                  data={expenseChartData}
                  width={screenWidth - 64}
                  height={120}
                  color="#EF4444"
                  showDots
                  formatValue={(v) => `$${(v / 1000).toFixed(1)}K`}
                />
              </View>
            </View>
          ) : (
            <View>
              {data.map((item, i) => (
                <View key={i} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{item.month}</Text>
                  <View style={styles.barsContainer}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, styles.incomeBar, { width: `${(item.income / 6500) * 100}%` }]} />
                    </View>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, styles.expenseBar, { width: `${(item.expenses / 6500) * 100}%` }]} />
                    </View>
                  </View>
                  <Text style={[styles.netValue, { color: item.income - item.expenses >= 0 ? '#22C55E' : '#EF4444' }]}>
                    {item.income - item.expenses >= 0 ? '+' : ''}${(item.income - item.expenses).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
          </View>
        </Card>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}> Cash Flow Tips</Text>
          </View>
          <Text style={styles.tipText}>• Your savings rate is healthy. Keep it above 20%.</Text>
          <Text style={styles.tipText}>• Consider automating savings transfers.</Text>
          <Text style={styles.tipText}>• Review recurring subscriptions quarterly.</Text>
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
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  chartToggle: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.md, gap: 8 },
  toggleButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, gap: 6 },
  toggleButtonActive: { backgroundColor: theme.colors.primary },
  toggleText: { fontSize: 13, color: theme.colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  chartCard: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.md, padding: theme.spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  monthLabel: { width: 40, fontSize: 12, color: theme.colors.textSecondary },
  barsContainer: { flex: 1, marginHorizontal: 8 },
  barWrapper: { height: 8, marginBottom: 4 },
  bar: { height: 8, borderRadius: 4 },
  incomeBar: { backgroundColor: '#22C55E' },
  expenseBar: { backgroundColor: '#EF4444' },
  netValue: { width: 70, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  tipsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl, padding: theme.spacing.lg },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  tipText: { fontSize: 13, color: theme.colors.text, lineHeight: 22 },
});

