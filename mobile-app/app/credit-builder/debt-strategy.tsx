/**
 * CPFI Debt Strategy Screen
 * Avalanche vs Snowball debt payoff strategies
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface Debt {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
}

const MOCK_DEBTS: Debt[] = [
  { id: '1', name: 'Credit Card 1', balance: 5000, apr: 24.99, minPayment: 100 },
  { id: '2', name: 'Credit Card 2', balance: 2500, apr: 19.99, minPayment: 50 },
  { id: '3', name: 'Personal Loan', balance: 8000, apr: 12.5, minPayment: 200 },
  { id: '4', name: 'Store Card', balance: 800, apr: 29.99, minPayment: 25 },
];

export default function DebtStrategyScreen() {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const totalDebt = MOCK_DEBTS.reduce((sum, d) => sum + d.balance, 0);
  const avgApr = MOCK_DEBTS.reduce((sum, d) => sum + d.apr, 0) / MOCK_DEBTS.length;

  const sortedDebts = [...MOCK_DEBTS].sort((a, b) => 
    strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance
  );

  // Calculate payoff estimates (simplified)
  const avalancheSavings = 1250; // Mock savings
  const snowballMonths = 24;
  const avalancheMonths = 22;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Debt Strategy</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Debt</Text>
          <Text style={styles.summaryValue}>${totalDebt.toLocaleString()}</Text>
          <Text style={styles.summarySubtext}>Avg APR: {avgApr.toFixed(1)}%</Text>
        </Card>

        {/* Strategy Toggle */}
        <View style={styles.strategyToggle}>
          <TouchableOpacity style={[styles.strategyButton, strategy === 'avalanche' && styles.strategyButtonActive]} onPress={() => setStrategy('avalanche')}>
            <Ionicons name="trending-down" size={20} color={strategy === 'avalanche' ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.strategyButtonText, strategy === 'avalanche' && styles.strategyButtonTextActive]}>Avalanche</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.strategyButton, strategy === 'snowball' && styles.strategyButtonActive]} onPress={() => setStrategy('snowball')}>
            <Ionicons name="snow" size={20} color={strategy === 'snowball' ? '#fff' : theme.colors.textSecondary} />
            <Text style={[styles.strategyButtonText, strategy === 'snowball' && styles.strategyButtonTextActive]}>Snowball</Text>
          </TouchableOpacity>
        </View>

        {/* Strategy Explanation */}
        <Card style={styles.explanationCard}>
          <View style={styles.explanationHeader}>
            <Ionicons name={strategy === 'avalanche' ? 'trending-down' : 'snow'} size={24} color={theme.colors.primary} />
            <Text style={styles.explanationTitle}>{strategy === 'avalanche' ? 'Debt Avalanche' : 'Debt Snowball'}</Text>
          </View>
          <Text style={styles.explanationText}>
            {strategy === 'avalanche' 
              ? 'Pay off debts with the highest interest rate first. This saves the most money in interest over time.'
              : 'Pay off debts with the smallest balance first. This provides quick wins and psychological motivation.'}
          </Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Payoff Time</Text>
              <Text style={styles.comparisonValue}>{strategy === 'avalanche' ? avalancheMonths : snowballMonths} months</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Interest Saved</Text>
              <Text style={[styles.comparisonValue, { color: '#22C55E' }]}>{strategy === 'avalanche' ? `$${avalancheSavings}` : '$0'}</Text>
            </View>
          </View>
        </Card>

        {/* Payoff Order */}
        <Text style={styles.sectionTitle}>Payoff Order</Text>
        {sortedDebts.map((debt, idx) => (
          <Card key={debt.id} style={styles.debtCard}>
            <View style={styles.debtRow}>
              <View style={styles.orderBadge}><Text style={styles.orderText}>{idx + 1}</Text></View>
              <View style={styles.debtInfo}>
                <Text style={styles.debtName}>{debt.name}</Text>
                <Text style={styles.debtDetails}>{debt.apr}% APR • ${debt.minPayment}/mo min</Text>
              </View>
              <View style={styles.debtRight}>
                <Text style={styles.debtBalance}>${debt.balance.toLocaleString()}</Text>
                {idx === 0 && <Text style={styles.focusLabel}>Focus Here</Text>}
              </View>
            </View>
          </Card>
        ))}

        {/* Recommendation */}
        <Card style={styles.recommendCard}>
          <Ionicons name="bulb" size={24} color="#F59E0B" />
          <View style={styles.recommendContent}>
            <Text style={styles.recommendTitle}>Our Recommendation</Text>
            <Text style={styles.recommendText}>
              {avgApr > 20 
                ? 'With high-interest debt, the Avalanche method will save you the most money.'
                : 'Consider the Snowball method for quick wins and motivation.'}
            </Text>
          </View>
        </Card>

        {/* Calculator Link */}
        <TouchableOpacity style={styles.calculatorButton} onPress={() => router.push('/credit-builder/debt-calculator')}>
          <Ionicons name="calculator" size={20} color={theme.colors.primary} />
          <Text style={styles.calculatorButtonText}>Open Payoff Calculator</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
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
  summaryCard: { alignItems: 'center', marginBottom: theme.spacing.md },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 36, fontWeight: '700', color: theme.colors.text },
  summarySubtext: { fontSize: 14, color: theme.colors.textSecondary },
  strategyToggle: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 4, marginBottom: theme.spacing.md },
  strategyButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: theme.borderRadius.md },
  strategyButtonActive: { backgroundColor: theme.colors.primary },
  strategyButtonText: { fontSize: 15, fontWeight: '500', color: theme.colors.textSecondary, marginLeft: 8 },
  strategyButtonTextActive: { color: '#fff' },
  explanationCard: { marginBottom: theme.spacing.lg },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  explanationTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginLeft: 10 },
  explanationText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: theme.spacing.md },
  comparisonRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  comparisonItem: { alignItems: 'center' },
  comparisonLabel: { fontSize: 12, color: theme.colors.textSecondary },
  comparisonValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  debtCard: { marginBottom: theme.spacing.sm },
  debtRow: { flexDirection: 'row', alignItems: 'center' },
  orderBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  orderText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  debtDetails: { fontSize: 12, color: theme.colors.textSecondary },
  debtRight: { alignItems: 'flex-end' },
  debtBalance: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  focusLabel: { fontSize: 11, color: '#22C55E', fontWeight: '500', marginTop: 2 },
  recommendCard: { flexDirection: 'row', alignItems: 'flex-start', marginTop: theme.spacing.md, backgroundColor: '#FEF3C720' },
  recommendContent: { flex: 1, marginLeft: 12 },
  recommendTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  recommendText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  calculatorButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, paddingVertical: 16, borderRadius: theme.borderRadius.lg, marginTop: theme.spacing.lg },
  calculatorButtonText: { fontSize: 15, fontWeight: '500', color: theme.colors.primary, marginHorizontal: 8 },
});

