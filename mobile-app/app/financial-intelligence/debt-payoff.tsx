/**
 * Debt Payoff Planner Mobile Screen
 * Strategic debt elimination with Avalanche, Snowball, and Hybrid methods
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';
import { ProgressBar } from '../../src/components/ProgressBar';

type Strategy = 'avalanche' | 'snowball' | 'hybrid' | 'ai_optimized';

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  payoffMonths?: number;
  type?: string;
}

interface StrategyComparison {
  method: Strategy;
  totalInterest: number;
  payoffMonths: number;
  monthlyPayment: number;
}

export default function DebtPayoffScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [payoffDate, setPayoffDate] = useState('');
  const [strategies, setStrategies] = useState<StrategyComparison[]>([]);
  const [extraPayment, setExtraPayment] = useState(0);
  const [hasAIOptimized, setHasAIOptimized] = useState(false);

  const fetchDebtData = useCallback(async () => {
    try {
      setLoading(true);

      // First, get the list of debts
      const debtsResponse = await fetch('/api/financial/debt');
      if (!debtsResponse.ok) throw new Error('Failed to fetch debts');
      const debtsResult = await debtsResponse.json();
      const debtsList = debtsResult.data?.debts || debtsResult.debts || [];

      setDebts(debtsList);
      setTotalDebt(debtsResult.data?.overview?.totalDebt || debtsResult.totalDebt || 0);

      // If user has debts, use the new debt strategy optimizer API
      if (debtsList.length > 0) {
        const strategyResponse = await fetch('/api/ai/financial-coach/debt-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debts: debtsList.map((d: Debt) => ({
              id: d.id,
              name: d.name,
              balance: d.balance,
              interestRate: d.interestRate,
              minimumPayment: d.minimumPayment,
              type: d.type || 'credit_card',
            })),
            extraPayment: extraPayment,
            includeAIOptimization: true,
          }),
        });

        if (strategyResponse.ok) {
          const strategyResult = await strategyResponse.json();
          const data = strategyResult.data || strategyResult;

          if (data.strategies) {
            setStrategies(data.strategies);
            setHasAIOptimized(data.strategies.some((s: StrategyComparison) => s.method === 'ai_optimized'));

            // Set payoff date for selected strategy
            const selectedStrategy = data.strategies.find((s: StrategyComparison) => s.method === strategy);
            if (selectedStrategy) {
              const months = selectedStrategy.payoffMonths;
              const date = new Date();
              date.setMonth(date.getMonth() + months);
              setPayoffDate(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching debt data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [strategy, extraPayment]);

  useEffect(() => {
    fetchDebtData();
  }, [fetchDebtData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDebtData();
  }, [fetchDebtData]);

  if (loading && debts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Debt Plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Strategy Selector */}
        <View style={styles.strategyContainer}>
          <Text style={styles.sectionTitle}>Payoff Strategy</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strategyScroll}>
            <View style={styles.strategyButtons}>
              <TouchableOpacity
                style={[styles.strategyButton, strategy === 'avalanche' && styles.strategyButtonActive]}
                onPress={() => setStrategy('avalanche')}
              >
                <Text style={styles.strategyIcon}>🏔️</Text>
                <Text style={[styles.strategyButtonText, strategy === 'avalanche' && styles.strategyButtonTextActive]}>
                  Avalanche
                </Text>
                <Text style={styles.strategyDescription}>Highest interest first</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.strategyButton, strategy === 'snowball' && styles.strategyButtonActive]}
                onPress={() => setStrategy('snowball')}
              >
                <Text style={styles.strategyIcon}>⛄</Text>
                <Text style={[styles.strategyButtonText, strategy === 'snowball' && styles.strategyButtonTextActive]}>
                  Snowball
                </Text>
                <Text style={styles.strategyDescription}>Smallest balance first</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.strategyButton, strategy === 'hybrid' && styles.strategyButtonActive]}
                onPress={() => setStrategy('hybrid')}
              >
                <Text style={styles.strategyIcon}>⚖️</Text>
                <Text style={[styles.strategyButtonText, strategy === 'hybrid' && styles.strategyButtonTextActive]}>
                  Hybrid
                </Text>
                <Text style={styles.strategyDescription}>Balanced approach</Text>
              </TouchableOpacity>
              {hasAIOptimized && (
                <TouchableOpacity
                  style={[styles.strategyButton, strategy === 'ai_optimized' && styles.strategyButtonActive]}
                  onPress={() => setStrategy('ai_optimized')}
                >
                  <Text style={styles.strategyIcon}>🤖</Text>
                  <Text style={[styles.strategyButtonText, strategy === 'ai_optimized' && styles.strategyButtonTextActive]}>
                    AI-Optimized
                  </Text>
                  <Text style={styles.strategyDescription}>AI-powered strategy</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Summary */}
        <Card style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Debt</Text>
            <Text style={styles.summaryValue}>${totalDebt.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Debt-Free Date</Text>
            <Text style={styles.summaryValue}>{payoffDate}</Text>
          </View>
          {strategies.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Interest</Text>
              <Text style={styles.summaryValue}>
                ${strategies.find(s => s.method === strategy)?.totalInterest.toLocaleString() || '0'}
              </Text>
            </View>
          )}
        </Card>

        {/* Strategy Comparison */}
        {strategies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compare Strategies</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {strategies.map((strat) => (
                <Card key={strat.method} style={styles.comparisonCard}>
                  <Text style={styles.comparisonMethod}>
                    {strat.method === 'ai_optimized' ? '🤖 AI-Optimized' :
                     strat.method === 'avalanche' ? '🏔️ Avalanche' :
                     strat.method === 'snowball' ? '⛄ Snowball' : '⚖️ Hybrid'}
                  </Text>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonLabel}>Payoff Time</Text>
                    <Text style={styles.comparisonValue}>{strat.payoffMonths} months</Text>
                  </View>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonLabel}>Total Interest</Text>
                    <Text style={styles.comparisonValue}>${strat.totalInterest.toLocaleString()}</Text>
                  </View>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonLabel}>Monthly Payment</Text>
                    <Text style={styles.comparisonValue}>${strat.monthlyPayment.toLocaleString()}</Text>
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Debt List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Debts</Text>
          {debts.map((debt, index) => (
            <Card key={debt.id} style={styles.debtCard}>
              <View style={styles.debtHeader}>
                <View style={styles.debtRank}>
                  <Text style={styles.debtRankText}>{index + 1}</Text>
                </View>
                <View style={styles.debtInfo}>
                  <Text style={styles.debtName}>{debt.name}</Text>
                  <Text style={styles.debtBalance}>${debt.balance.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.debtDetails}>
                <View style={styles.debtDetailRow}>
                  <Text style={styles.debtDetailLabel}>Interest Rate</Text>
                  <Text style={styles.debtDetailValue}>{debt.interestRate}%</Text>
                </View>
                <View style={styles.debtDetailRow}>
                  <Text style={styles.debtDetailLabel}>Min Payment</Text>
                  <Text style={styles.debtDetailValue}>${debt.minimumPayment}</Text>
                </View>
                <View style={styles.debtDetailRow}>
                  <Text style={styles.debtDetailLabel}>Payoff Time</Text>
                  <Text style={styles.debtDetailValue}>{debt.payoffMonths} months</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  strategyContainer: {
    padding: theme.spacing.md,
  },
  strategyScroll: {
    marginTop: theme.spacing.sm,
  },
  strategyButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  strategyButton: {
    width: 120,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyButtonActive: {
    backgroundColor: `${theme.colors.primary}15`,
    borderColor: theme.colors.primary,
  },
  strategyIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  strategyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  strategyButtonTextActive: {
    color: theme.colors.primary,
  },
  strategyDescription: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    margin: theme.spacing.md,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  debtCard: {
    marginBottom: theme.spacing.md,
  },
  debtHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  debtRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  debtRankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  debtInfo: {
    flex: 1,
  },
  debtName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  debtBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  debtDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: theme.spacing.md,
  },
  debtDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  debtDetailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  debtDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  section: {
    padding: theme.spacing.md,
  },
  comparisonCard: {
    width: 180,
    marginRight: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  comparisonMethod: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  comparisonRow: {
    marginBottom: theme.spacing.xs,
  },
  comparisonLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});

