/**
 * CPFI Financial Overview Screen
 * Net worth, account balances, transactions, budget status
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: number;
  institution: string;
  lastUpdated: string;
}

const ACCOUNTS: Account[] = [
  { id: '1', name: 'Primary Checking', type: 'checking', balance: 4250.00, institution: 'Chase', lastUpdated: '2 min ago' },
  { id: '2', name: 'High-Yield Savings', type: 'savings', balance: 12500.00, institution: 'Marcus', lastUpdated: '1 hr ago' },
  { id: '3', name: 'Sapphire Preferred', type: 'credit', balance: -2340.00, institution: 'Chase', lastUpdated: '5 min ago' },
  { id: '4', name: 'Roth IRA', type: 'investment', balance: 45200.00, institution: 'Fidelity', lastUpdated: '1 day ago' },
];

const RECENT_TRANSACTIONS = [
  { id: '1', name: 'Amazon', amount: -89.99, category: 'Shopping', date: 'Today' },
  { id: '2', name: 'Paycheck', amount: 3200.00, category: 'Income', date: 'Yesterday' },
  { id: '3', name: 'Whole Foods', amount: -156.42, category: 'Groceries', date: 'Dec 4' },
  { id: '4', name: 'Netflix', amount: -15.99, category: 'Entertainment', date: 'Dec 3' },
];

const BUDGET_STATUS = { spent: 2450, budget: 4000, categories: [
  { name: 'Food & Dining', spent: 620, budget: 800, color: '#22C55E' },
  { name: 'Shopping', spent: 450, budget: 400, color: '#EF4444' },
  { name: 'Transportation', spent: 280, budget: 350, color: '#22C55E' },
]};

export default function FinancialOverviewScreen() {
  const netWorth = ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);
  const assets = ACCOUNTS.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
  const liabilities = Math.abs(ACCOUNTS.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0));

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking': return 'wallet';
      case 'savings': return 'cash';
      case 'credit': return 'card';
      case 'investment': return 'trending-up';
      default: return 'wallet';
    }
  };

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Overview</Text>
          <TouchableOpacity onPress={() => router.push('/financial/accounts')}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <Card style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>{formatCurrency(netWorth)}</Text>
          <View style={styles.netWorthBreakdown}>
            <View style={styles.breakdownItem}>
              <Ionicons name="arrow-up-circle" size={16} color="#22C55E" />
              <Text style={styles.breakdownLabel}>Assets</Text>
              <Text style={[styles.breakdownValue, { color: '#22C55E' }]}>{formatCurrency(assets)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Ionicons name="arrow-down-circle" size={16} color="#EF4444" />
              <Text style={styles.breakdownLabel}>Liabilities</Text>
              <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>{formatCurrency(liabilities)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewMoreButton} onPress={() => router.push('/financial/net-worth')}>
            <Text style={styles.viewMoreText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/financial/transactions')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}><Ionicons name="swap-horizontal" size={20} color="#3B82F6" /></View>
            <Text style={styles.quickActionText}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/financial/budgets')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#DCFCE7' }]}><Ionicons name="pie-chart" size={20} color="#22C55E" /></View>
            <Text style={styles.quickActionText}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/financial/goals')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="flag" size={20} color="#F59E0B" /></View>
            <Text style={styles.quickActionText}>Goals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/financial/debt')}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}><Ionicons name="calculator" size={20} color="#EF4444" /></View>
            <Text style={styles.quickActionText}>Debt</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <TouchableOpacity onPress={() => router.push('/financial/accounts')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
        </View>
        {ACCOUNTS.map((account) => (
          <TouchableOpacity key={account.id} onPress={() => router.push(`/financial/account-detail?id=${account.id}`)}>
            <Card style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={[styles.accountIcon, { backgroundColor: account.balance < 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Ionicons name={getAccountIcon(account.type) as keyof typeof Ionicons.glyphMap} size={20} color={account.balance < 0 ? '#EF4444' : '#22C55E'} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountInstitution}>{account.institution} • {account.lastUpdated}</Text>
                </View>
                <Text style={[styles.accountBalance, { color: account.balance < 0 ? '#EF4444' : theme.colors.text }]}>{formatCurrency(account.balance)}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Budget Status */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Budget Status</Text>
          <TouchableOpacity onPress={() => router.push('/financial/budgets')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
        </View>
        <Card style={styles.budgetCard}>
          <View style={styles.budgetOverview}>
            <Text style={styles.budgetSpent}>${BUDGET_STATUS.spent} <Text style={styles.budgetTotal}>/ ${BUDGET_STATUS.budget}</Text></Text>
            <Text style={styles.budgetPercent}>{Math.round((BUDGET_STATUS.spent / BUDGET_STATUS.budget) * 100)}% used</Text>
          </View>
          <View style={styles.budgetProgressContainer}>
            <View style={[styles.budgetProgress, { width: `${(BUDGET_STATUS.spent / BUDGET_STATUS.budget) * 100}%` }]} />
          </View>
          {BUDGET_STATUS.categories.map((cat, idx) => (
            <View key={cat.name} style={[styles.categoryRow, idx < BUDGET_STATUS.categories.length - 1 && styles.categoryRowBorder]}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={[styles.categoryAmount, { color: cat.spent > cat.budget ? '#EF4444' : '#22C55E' }]}>${cat.spent} / ${cat.budget}</Text>
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
  netWorthCard: { marginBottom: theme.spacing.lg, backgroundColor: theme.colors.primary },
  netWorthLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  netWorthValue: { fontSize: 36, fontWeight: '700', color: '#fff', marginTop: 4 },
  netWorthBreakdown: { flexDirection: 'row', marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  breakdownLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  breakdownValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  viewMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  viewMoreText: { fontSize: 13, color: '#fff', fontWeight: '500', marginRight: 4 },
  quickActions: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  quickAction: { flex: 1, alignItems: 'center' },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickActionText: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  seeAllText: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  accountInstitution: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  accountBalance: { fontSize: 16, fontWeight: '600' },
  budgetCard: { marginBottom: theme.spacing.lg },
  budgetOverview: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  budgetSpent: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  budgetTotal: { fontSize: 16, fontWeight: '400', color: theme.colors.textSecondary },
  budgetPercent: { fontSize: 13, color: theme.colors.textSecondary },
  budgetProgressContainer: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  budgetProgress: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm },
  categoryRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  categoryName: { fontSize: 13, color: theme.colors.text },
  categoryAmount: { fontSize: 13, fontWeight: '600' },
});

