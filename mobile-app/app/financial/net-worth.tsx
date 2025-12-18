/**
 * CPFI Net Worth Tracker Screen
 * Track assets, liabilities, and net worth over time with real charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { LineChart, PieChart } from '../../src/components/charts';
import { useFinancialStore } from '../../src/store/financialStore';

interface Asset { name: string; value: number; icon: string; color: string; }
interface Liability { name: string; value: number; icon: string; color: string; }
interface NetWorthHistory { month: string; value: number; }

const MOCK_ASSETS: Asset[] = [
  { name: 'Checking Account', value: 8500, icon: 'wallet', color: '#3B82F6' },
  { name: 'Savings Account', value: 25000, icon: 'cash', color: '#22C55E' },
  { name: 'Investment Portfolio', value: 38070, icon: 'trending-up', color: '#8B5CF6' },
  { name: 'Retirement (401k)', value: 85000, icon: 'shield-checkmark', color: '#F59E0B' },
  { name: 'Home Value', value: 350000, icon: 'home', color: '#06B6D4' },
  { name: 'Vehicle', value: 18000, icon: 'car', color: '#EC4899' },
];

const MOCK_LIABILITIES: Liability[] = [
  { name: 'Mortgage', value: 280000, icon: 'home', color: '#EF4444' },
  { name: 'Auto Loan', value: 12000, icon: 'car', color: '#F97316' },
  { name: 'Credit Cards', value: 4500, icon: 'card', color: '#DC2626' },
  { name: 'Student Loans', value: 22000, icon: 'school', color: '#B91C1C' },
];

const MOCK_HISTORY: NetWorthHistory[] = [
  { month: 'Jul', value: 185000 },
  { month: 'Aug', value: 188000 },
  { month: 'Sep', value: 192000 },
  { month: 'Oct', value: 198000 },
  { month: 'Nov', value: 202000 },
  { month: 'Dec', value: 206070 },
];

const { width: screenWidth } = Dimensions.get('window');

export default function NetWorthScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [history, setHistory] = useState<NetWorthHistory[]>([]);
  const [showAssetBreakdown, setShowAssetBreakdown] = useState(false);

  const { accounts, fetchAccounts } = useFinancialStore();

  const loadNetWorthData = useCallback(async () => {
    try {
      await fetchAccounts();
      // Transform accounts to assets/liabilities
      const assetAccounts = accounts.filter(a => a.balance > 0);
      const liabilityAccounts = accounts.filter(a => a.balance < 0);

      if (assetAccounts.length > 0) {
        setAssets(assetAccounts.map((a, i) => ({
          name: a.name,
          value: a.balance,
          icon: a.type === 'investment' ? 'trending-up' : a.type === 'savings' ? 'cash' : 'wallet',
          color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899'][i % 6],
        })));
      } else {
        setAssets(MOCK_ASSETS);
      }

      if (liabilityAccounts.length > 0) {
        setLiabilities(liabilityAccounts.map((a, i) => ({
          name: a.name,
          value: Math.abs(a.balance),
          icon: a.type === 'credit' ? 'card' : 'document-text',
          color: ['#EF4444', '#F97316', '#DC2626', '#B91C1C'][i % 4],
        })));
      } else {
        setLiabilities(MOCK_LIABILITIES);
      }

      setHistory(MOCK_HISTORY); // Would come from API in production
    } catch (err) {
      console.warn('Using mock net worth data:', err);
      setAssets(MOCK_ASSETS);
      setLiabilities(MOCK_LIABILITIES);
      setHistory(MOCK_HISTORY);
    } finally {
      setLoading(false);
    }
  }, [accounts, fetchAccounts]);

  useEffect(() => { loadNetWorthData(); }, [loadNetWorthData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNetWorthData();
    setRefreshing(false);
  };

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;
  const monthlyChange = history.length >= 2 ? history[history.length - 1].value - history[history.length - 2].value : 0;

  // Prepare chart data
  const historyChartData = history.map(h => ({ value: h.value, label: h.month }));
  const assetPieData = assets.map(a => ({ value: a.value, label: a.name, color: a.color }));
  const liabilityPieData = liabilities.map(l => ({ value: l.value, label: l.name, color: l.color }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Calculating net worth...</Text>
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
            <Text style={styles.title}>Net Worth Tracker</Text>
            <Text style={styles.subtitle}>Your financial snapshot</Text>
          </View>
        </View>

        {/* Net Worth Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Worth</Text>
          <Text style={styles.summaryValue}>${netWorth.toLocaleString()}</Text>
          <View style={styles.changeRow}>
            <Ionicons name={monthlyChange >= 0 ? 'arrow-up' : 'arrow-down'} size={16} color={monthlyChange >= 0 ? '#22C55E' : '#EF4444'} />
            <Text style={[styles.changeText, { color: monthlyChange >= 0 ? '#22C55E' : '#EF4444' }]}>
              {monthlyChange >= 0 ? '+' : ''}${monthlyChange.toLocaleString()} this month
            </Text>
          </View>
        </Card>

        {/* Assets vs Liabilities */}
        <View style={styles.compareRow}>
          <TouchableOpacity style={[styles.compareCard, { backgroundColor: '#22C55E08' }]} onPress={() => setShowAssetBreakdown(true)}>
            <Ionicons name="trending-up" size={24} color="#22C55E" />
            <Text style={[styles.compareValue, { color: '#22C55E' }]}>${(totalAssets / 1000).toFixed(0)}K</Text>
            <Text style={styles.compareLabel}>Total Assets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.compareCard, { backgroundColor: '#EF444408' }]} onPress={() => setShowAssetBreakdown(false)}>
            <Ionicons name="trending-down" size={24} color="#EF4444" />
            <Text style={[styles.compareValue, { color: '#EF4444' }]}>${(totalLiabilities / 1000).toFixed(0)}K</Text>
            <Text style={styles.compareLabel}>Total Liabilities</Text>
          </TouchableOpacity>
        </View>

        {/* Net Worth History Chart */}
        <Card style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Net Worth History</Text>
          <LineChart
            data={historyChartData}
            width={screenWidth - 64}
            height={180}
            color={theme.colors.primary}
            showDots
            showGrid
            formatValue={(v) => `$${(v / 1000).toFixed(0)}K`}
          />
        </Card>

        {/* Asset/Liability Breakdown Pie Chart */}
        <Card style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <TouchableOpacity
              style={[styles.breakdownTab, showAssetBreakdown && styles.breakdownTabActive]}
              onPress={() => setShowAssetBreakdown(true)}
            >
              <Text style={[styles.breakdownTabText, showAssetBreakdown && styles.breakdownTabTextActive]}>Assets</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.breakdownTab, !showAssetBreakdown && styles.breakdownTabActive]}
              onPress={() => setShowAssetBreakdown(false)}
            >
              <Text style={[styles.breakdownTabText, !showAssetBreakdown && styles.breakdownTabTextActive]}>Liabilities</Text>
            </TouchableOpacity>
          </View>
          <PieChart
            data={showAssetBreakdown ? assetPieData : liabilityPieData}
            size={160}
            innerRadius={45}
            centerValue={`$${((showAssetBreakdown ? totalAssets : totalLiabilities) / 1000).toFixed(0)}K`}
            centerLabel={showAssetBreakdown ? 'Assets' : 'Debt'}
            showPercentages
          />
        </Card>

        {/* Assets List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assets</Text>
          {assets.map((asset, i) => (
            <View key={i} style={styles.listItem}>
              <View style={[styles.itemIcon, { backgroundColor: `${asset.color}15` }]}>
                <Ionicons name={asset.icon as keyof typeof Ionicons.glyphMap} size={18} color={asset.color} />
              </View>
              <Text style={styles.itemName}>{asset.name}</Text>
              <Text style={[styles.itemValue, { color: '#22C55E' }]}>${asset.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Liabilities List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liabilities</Text>
          {liabilities.map((liability, i) => (
            <View key={i} style={styles.listItem}>
              <View style={[styles.itemIcon, { backgroundColor: `${liability.color}15` }]}>
                <Ionicons name={liability.icon as keyof typeof Ionicons.glyphMap} size={18} color={liability.color} />
              </View>
              <Text style={styles.itemName}>{liability.name}</Text>
              <Text style={[styles.itemValue, { color: '#EF4444' }]}>-${liability.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
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
  summaryCard: { marginHorizontal: theme.spacing.lg, padding: theme.spacing.xl, alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 36, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  changeText: { fontSize: 14, marginLeft: 4 },
  compareRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
  compareCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.lg, borderRadius: 12 },
  compareValue: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  compareLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  historyCard: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  breakdownCard: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, padding: theme.spacing.lg, alignItems: 'center' },
  breakdownHeader: { flexDirection: 'row', marginBottom: theme.spacing.md },
  breakdownTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginHorizontal: 4 },
  breakdownTabActive: { backgroundColor: theme.colors.primary },
  breakdownTabText: { fontSize: 13, color: theme.colors.textSecondary },
  breakdownTabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  itemName: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 12 },
  itemValue: { fontSize: 14, fontWeight: '600' },
});

