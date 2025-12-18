/**
 * CPFI Financial Tab Screen
 * Financial overview with accounts, transactions, budgets
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { useFinancialStore } from '../../src/store/financialStore';

export default function FinancialScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { 
    dashboard, 
    accounts, 
    fetchDashboard, 
    fetchAccounts,
    isLoading 
  } = useFinancialStore();

  useEffect(() => {
    fetchDashboard();
    fetchAccounts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchAccounts()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const menuItems = [
    { icon: 'wallet', title: 'Accounts', subtitle: `${accounts.length} connected`, route: '/financial/accounts' },
    { icon: 'swap-horizontal', title: 'Transactions', subtitle: 'View all transactions', route: '/financial/transactions' },
    { icon: 'pie-chart', title: 'Budgets', subtitle: 'Track your spending', route: '/financial/budgets' },
    { icon: 'flag', title: 'Goals', subtitle: 'Savings goals', route: '/financial/goals' },
    { icon: 'trending-down', title: 'Debt Payoff', subtitle: 'Payoff calculator', route: '/financial/debt' },
    { icon: 'calendar', title: 'Bills', subtitle: 'Upcoming payments', route: '/financial/bills' },
    { icon: 'bar-chart', title: 'Insights', subtitle: 'Spending analysis', route: '/financial/insights' },
    { icon: 'cash', title: 'Cash Flow', subtitle: 'Income vs expenses', route: '/financial/cashflow' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Finances</Text>
          <TouchableOpacity onPress={() => router.push('/financial/accounts')}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <Card style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatCurrency(dashboard?.netWorth || 0)}</Text>
          <View style={styles.netWorthBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Assets</Text>
              <Text style={[styles.breakdownValue, { color: '#10B981' }]}>
                {formatCurrency(dashboard?.totalAssets || 0)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Liabilities</Text>
              <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>
                {formatCurrency(dashboard?.totalLiabilities || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="arrow-up-circle" size={24} color="#10B981" />
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboard?.monthlyIncome || 0)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="arrow-down-circle" size={24} color="#EF4444" />
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboard?.monthlyExpenses || 0)}</Text>
          </Card>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  netWorthCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg, alignItems: 'center', paddingVertical: theme.spacing.xl },
  netWorthLabel: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 },
  netWorthValue: { fontSize: 36, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.lg },
  netWorthBreakdown: { flexDirection: 'row', alignItems: 'center' },
  breakdownItem: { alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  breakdownLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  breakdownValue: { fontSize: 16, fontWeight: '600' },
  breakdownDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },
  statsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: theme.spacing.md },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  statValue: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  menuSection: { paddingHorizontal: theme.spacing.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  menuIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  menuSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});
