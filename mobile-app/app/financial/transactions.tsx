/**
 * Fynvita Transactions Screen
 * Transaction list, category filters, spending charts
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: string;
  account: string;
  pending: boolean;
}

const TRANSACTIONS: Transaction[] = [
  { id: '1', name: 'Amazon', amount: -89.99, category: 'Shopping', date: 'Today', account: 'Chase Checking', pending: false },
  { id: '2', name: 'Paycheck - Acme Corp', amount: 3200.00, category: 'Income', date: 'Yesterday', account: 'Chase Checking', pending: false },
  { id: '3', name: 'Whole Foods Market', amount: -156.42, category: 'Groceries', date: 'Dec 4', account: 'Chase Checking', pending: false },
  { id: '4', name: 'Netflix', amount: -15.99, category: 'Entertainment', date: 'Dec 3', account: 'Sapphire Preferred', pending: false },
  { id: '5', name: 'Shell Gas Station', amount: -45.00, category: 'Transportation', date: 'Dec 3', account: 'Chase Checking', pending: true },
  { id: '6', name: 'Starbucks', amount: -6.75, category: 'Food & Dining', date: 'Dec 2', account: 'Sapphire Preferred', pending: false },
  { id: '7', name: 'Uber', amount: -24.50, category: 'Transportation', date: 'Dec 2', account: 'Sapphire Preferred', pending: false },
  { id: '8', name: 'Target', amount: -78.32, category: 'Shopping', date: 'Dec 1', account: 'Chase Checking', pending: false },
];

const CATEGORIES = ['All', 'Income', 'Shopping', 'Groceries', 'Food & Dining', 'Transportation', 'Entertainment'];

const SPENDING_BY_CATEGORY = [
  { category: 'Shopping', amount: 168.31, percent: 28, color: '#8B5CF6' },
  { category: 'Groceries', amount: 156.42, percent: 26, color: '#22C55E' },
  { category: 'Transportation', amount: 69.50, percent: 12, color: '#3B82F6' },
  { category: 'Food & Dining', amount: 6.75, percent: 1, color: '#F59E0B' },
  { category: 'Entertainment', amount: 15.99, percent: 3, color: '#EF4444' },
];

export default function TransactionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredTransactions = TRANSACTIONS.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Income': return 'cash';
      case 'Shopping': return 'bag';
      case 'Groceries': return 'cart';
      case 'Food & Dining': return 'restaurant';
      case 'Transportation': return 'car';
      case 'Entertainment': return 'film';
      default: return 'card';
    }
  };

  const formatCurrency = (amount: number) => {
    const prefix = amount < 0 ? '-' : '+';
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Transactions</Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search transactions..." placeholderTextColor={theme.colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {/* Spending Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending This Month</Text>
          <View style={styles.chartContainer}>
            {SPENDING_BY_CATEGORY.map((item) => (
              <View key={item.category} style={styles.chartItem}>
                <View style={[styles.chartBar, { height: item.percent * 2, backgroundColor: item.color }]} />
                <Text style={styles.chartLabel}>{item.category.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            {SPENDING_BY_CATEGORY.slice(0, 3).map((item) => (
              <View key={item.category} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>${item.amount}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity key={category} style={[styles.filterChip, selectedCategory === category && styles.filterChipActive]} onPress={() => setSelectedCategory(category)}>
              <Text style={[styles.filterChipText, selectedCategory === category && styles.filterChipTextActive]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transactions List */}
        <Text style={styles.sectionTitle}>{filteredTransactions.length} Transactions</Text>
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionRow}>
              <View style={[styles.transactionIcon, { backgroundColor: transaction.amount > 0 ? '#DCFCE7' : '#F3F4F6' }]}>
                <Ionicons name={getCategoryIcon(transaction.category) as keyof typeof Ionicons.glyphMap} size={20} color={transaction.amount > 0 ? '#22C55E' : theme.colors.textSecondary} />
              </View>
              <View style={styles.transactionInfo}>
                <View style={styles.transactionNameRow}>
                  <Text style={styles.transactionName}>{transaction.name}</Text>
                  {transaction.pending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>PENDING</Text></View>}
                </View>
                <Text style={styles.transactionMeta}>{transaction.category} • {transaction.account}</Text>
              </View>
              <View style={styles.transactionAmountContainer}>
                <Text style={[styles.transactionAmount, { color: transaction.amount > 0 ? '#22C55E' : theme.colors.text }]}>{formatCurrency(transaction.amount)}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
              </View>
            </View>
          </Card>
        ))}

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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, paddingHorizontal: 12, paddingVertical: 10, marginBottom: theme.spacing.lg },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 8 },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80 },
  chartItem: { alignItems: 'center' },
  chartBar: { width: 24, borderRadius: 4, marginBottom: 4 },
  chartLabel: { fontSize: 9, color: theme.colors.textSecondary },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  transactionCard: { marginBottom: theme.spacing.sm },
  transactionRow: { flexDirection: 'row', alignItems: 'center' },
  transactionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionNameRow: { flexDirection: 'row', alignItems: 'center' },
  transactionName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  pendingText: { fontSize: 9, fontWeight: '600', color: '#F59E0B' },
  transactionMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  transactionAmountContainer: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 15, fontWeight: '600' },
  transactionDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
});

