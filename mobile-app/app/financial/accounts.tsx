/**
 * Fynvita Accounts Screen
 * All linked financial accounts with balances
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Account {
  id: string;
  name: string;
  institution: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  balance: number;
  available?: number;
  lastUpdated: string;
  status: 'connected' | 'needs_attention' | 'disconnected';
}

const ACCOUNTS: Account[] = [
  { id: '1', name: 'Primary Checking', institution: 'Chase', type: 'checking', balance: 8542.50, available: 8342.50, lastUpdated: '2 min ago', status: 'connected' },
  { id: '2', name: 'High-Yield Savings', institution: 'Marcus', type: 'savings', balance: 25000.00, lastUpdated: '5 min ago', status: 'connected' },
  { id: '3', name: 'Sapphire Preferred', institution: 'Chase', type: 'credit', balance: -2450.00, available: 7550.00, lastUpdated: '2 min ago', status: 'connected' },
  { id: '4', name: '401(k)', institution: 'Fidelity', type: 'investment', balance: 85000.00, lastUpdated: '1 hour ago', status: 'connected' },
  { id: '5', name: 'Roth IRA', institution: 'Vanguard', type: 'investment', balance: 32000.00, lastUpdated: '1 day ago', status: 'needs_attention' },
  { id: '6', name: 'Auto Loan', institution: 'Capital One', type: 'loan', balance: -12000.00, lastUpdated: '3 hours ago', status: 'connected' },
  { id: '7', name: 'Student Loans', institution: 'Nelnet', type: 'loan', balance: -35000.00, lastUpdated: '1 week ago', status: 'disconnected' },
];

const getTypeIcon = (type: Account['type']): keyof typeof Ionicons.glyphMap => {
  const icons: Record<Account['type'], keyof typeof Ionicons.glyphMap> = {
    checking: 'wallet', savings: 'cash', credit: 'card', investment: 'trending-up', loan: 'document-text'
  };
  return icons[type];
};

const getTypeColor = (type: Account['type']): string => {
  const colors: Record<Account['type'], string> = {
    checking: '#3B82F6', savings: '#22C55E', credit: '#F59E0B', investment: '#8B5CF6', loan: '#EF4444'
  };
  return colors[type];
};

const getStatusColor = (status: Account['status']): string => {
  const colors: Record<Account['status'], string> = {
    connected: '#22C55E', needs_attention: '#F59E0B', disconnected: '#EF4444'
  };
  return colors[status];
};

export default function AccountsScreen() {
  const [filter, setFilter] = useState<'all' | Account['type']>('all');
  const filters: Array<'all' | Account['type']> = ['all', 'checking', 'savings', 'credit', 'investment', 'loan'];
  
  const filteredAccounts = filter === 'all' ? ACCOUNTS : ACCOUNTS.filter(a => a.type === filter);
  const totalAssets = ACCOUNTS.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = Math.abs(ACCOUNTS.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Accounts</Text>
          <TouchableOpacity>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Assets</Text>
              <Text style={[styles.summaryValue, { color: '#22C55E' }]}>${totalAssets.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Liabilities</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>${totalLiabilities.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Worth</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>${netWorth.toLocaleString()}</Text>
            </View>
          </View>
        </Card>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Accounts List */}
        {filteredAccounts.map((account) => {
          const color = getTypeColor(account.type);
          const statusColor = getStatusColor(account.status);
          return (
            <Card key={account.id} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={[styles.accountIcon, { backgroundColor: `${color}15` }]}>
                  <Ionicons name={getTypeIcon(account.type)} size={22} color={color} />
                </View>
                <View style={styles.accountInfo}>
                  <View style={styles.accountHeader}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  </View>
                  <Text style={styles.accountInstitution}>{account.institution}</Text>
                  <Text style={styles.accountUpdated}>Updated {account.lastUpdated}</Text>
                </View>
                <View style={styles.accountValues}>
                  <Text style={[styles.accountBalance, { color: account.balance >= 0 ? theme.colors.text : '#EF4444' }]}>
                    {account.balance >= 0 ? '' : '-'}${Math.abs(account.balance).toLocaleString()}
                  </Text>
                  {account.available !== undefined && (
                    <Text style={styles.accountAvailable}>Available: ${account.available.toLocaleString()}</Text>
                  )}
                </View>
              </View>
              {account.status !== 'connected' && (
                <TouchableOpacity style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
                  <Ionicons name={account.status === 'needs_attention' ? 'warning' : 'link'} size={14} color={statusColor} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {account.status === 'needs_attention' ? 'Needs re-authentication' : 'Reconnect account'}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        {/* Add Account Button */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Link New Account</Text>
        </TouchableOpacity>

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
  summaryCard: { marginBottom: theme.spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  summaryLabel: { fontSize: 11, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.surface, borderRadius: 20, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  accountCard: { marginBottom: theme.spacing.sm },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountInfo: { flex: 1 },
  accountHeader: { flexDirection: 'row', alignItems: 'center' },
  accountName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  accountInstitution: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  accountUpdated: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  accountValues: { alignItems: 'flex-end' },
  accountBalance: { fontSize: 16, fontWeight: '600' },
  accountAvailable: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, marginTop: theme.spacing.sm },
  statusText: { fontSize: 12, fontWeight: '500', marginLeft: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed', borderRadius: 12, marginTop: theme.spacing.md },
  addButtonText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginLeft: 8 },
});

