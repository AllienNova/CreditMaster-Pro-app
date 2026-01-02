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

type Strategy = 'avalanche' | 'snowball' | 'hybrid';

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  payoffMonths: number;
}

export default function DebtPayoffScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [payoffDate, setPayoffDate] = useState('');

  const fetchDebtData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/financial/debt?strategy=${strategy}`);
      if (response.ok) {
        const data = await response.json();
        setDebts(data.debts || []);
        setTotalDebt(data.totalDebt || 0);
        setPayoffDate(data.payoffDate || '');
      }
    } catch (error) {
      console.error('Error fetching debt data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [strategy]);

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
          <View style={styles.strategyButtons}>
            <TouchableOpacity
              style={[styles.strategyButton, strategy === 'avalanche' && styles.strategyButtonActive]}
              onPress={() => setStrategy('avalanche')}
            >
              <Text style={[styles.strategyButtonText, strategy === 'avalanche' && styles.strategyButtonTextActive]}>
                Avalanche
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.strategyButton, strategy === 'snowball' && styles.strategyButtonActive]}
              onPress={() => setStrategy('snowball')}
            >
              <Text style={[styles.strategyButtonText, strategy === 'snowball' && styles.strategyButtonTextActive]}>
                Snowball
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.strategyButton, strategy === 'hybrid' && styles.strategyButtonActive]}
              onPress={() => setStrategy('hybrid')}
            >
              <Text style={[styles.strategyButtonText, strategy === 'hybrid' && styles.strategyButtonTextActive]}>
                Hybrid
              </Text>
            </TouchableOpacity>
          </View>
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
        </Card>

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
  strategyButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  strategyButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  strategyButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  strategyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  strategyButtonTextActive: {
    color: '#FFFFFF',
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
});

