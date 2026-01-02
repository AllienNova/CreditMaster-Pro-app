/**
 * Student Loans Portfolio Dashboard
 * Main screen showing loan overview, stats, and quick actions
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme as theme } from '../../src/constants/theme';
import {
  useStudentLoanStore,
  selectStudentLoans,
  selectStudentLoanStats,
  selectStudentLoanLoading,
  selectStudentLoanError,
  selectFederalLoans,
  selectPrivateLoans,
  selectRecommendedStrategy,
} from '../../src/store';

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format percentage
const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// Get loan type display name
const getLoanTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    federal_direct_subsidized: 'Direct Subsidized',
    federal_direct_unsubsidized: 'Direct Unsubsidized',
    federal_plus_parent: 'Parent PLUS',
    federal_plus_grad: 'Grad PLUS',
    federal_perkins: 'Perkins',
    private: 'Private',
    consolidated: 'Consolidated',
  };
  return labels[type] || type;
};

// Get status color
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    in_repayment: theme.colors.success,
    in_grace: theme.colors.primary,
    deferment: theme.colors.warning,
    forbearance: theme.colors.warning,
    default: theme.colors.error,
    cancelled: theme.colors.textSecondary,
    paid_in_full: theme.colors.success,
  };
  return colors[status] || theme.colors.textSecondary;
};

export default function StudentLoansPortfolio() {
  const router = useRouter();

  // Store state
  const loans = useStudentLoanStore(selectStudentLoans);
  const stats = useStudentLoanStore(selectStudentLoanStats);
  const isLoading = useStudentLoanStore(selectStudentLoanLoading);
  const error = useStudentLoanStore(selectStudentLoanError);
  const federalLoans = useStudentLoanStore(selectFederalLoans);
  const privateLoans = useStudentLoanStore(selectPrivateLoans);
  const recommendedStrategy = useStudentLoanStore(selectRecommendedStrategy);

  // Store actions
  const fetchLoans = useStudentLoanStore((state) => state.fetchLoans);
  const analyzePortfolio = useStudentLoanStore((state) => state.analyzePortfolio);
  const clearError = useStudentLoanStore((state) => state.clearError);

  // Initial fetch
  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Analyze portfolio when loans change
  useEffect(() => {
    if (loans.length > 0) {
      analyzePortfolio();
    }
  }, [loans.length, analyzePortfolio]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await fetchLoans();
    if (loans.length > 0) {
      await analyzePortfolio();
    }
  }, [fetchLoans, analyzePortfolio, loans.length]);

  // Calculate local stats if API stats not available
  const totalDebt = stats?.totalDebt || loans.reduce((sum, l) => sum + l.currentBalance, 0);
  const monthlyPayment = stats?.totalMonthlyPayment || loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const avgRate = stats?.weightedInterestRate || (loans.length > 0
    ? loans.reduce((sum, l) => sum + l.interestRate, 0) / loans.length
    : 0);

  if (isLoading && loans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your student loans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Student Loans</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/student-loans/add')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Ionicons name="close" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        )}

        {/* Portfolio Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Student Debt</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalDebt)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Monthly Payment</Text>
              <Text style={styles.summaryItemValue}>{formatCurrency(monthlyPayment)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Avg. Interest Rate</Text>
              <Text style={styles.summaryItemValue}>{formatPercent(avgRate)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Loans</Text>
              <Text style={styles.summaryItemValue}>{loans.length}</Text>
            </View>
          </View>
        </View>

        {/* Loan Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Loan Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.breakdownLabel}>Federal Loans</Text>
              <Text style={styles.breakdownValue}>{federalLoans.length}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={styles.breakdownLabel}>Private Loans</Text>
              <Text style={styles.breakdownValue}>{privateLoans.length}</Text>
            </View>
          </View>
          {stats && (
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={styles.breakdownLabel}>In Repayment</Text>
                <Text style={styles.breakdownValue}>{stats.inRepayment}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Ionicons name="pause-circle" size={16} color={theme.colors.warning} />
                <Text style={styles.breakdownLabel}>In Deferment</Text>
                <Text style={styles.breakdownValue}>{stats.inDeferment}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/student-loans/strategies')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="bulb" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionLabel}>AI Strategies</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/student-loans/eligibility')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.success + '20' }]}>
                <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
              </View>
              <Text style={styles.actionLabel}>Check Eligibility</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/student-loans/add')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                <Ionicons name="add-circle" size={24} color={theme.colors.warning} />
              </View>
              <Text style={styles.actionLabel}>Add Loan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recommended Strategy */}
        {recommendedStrategy && (
          <TouchableOpacity
            style={styles.strategyCard}
            onPress={() => router.push('/student-loans/strategies')}
          >
            <View style={styles.strategyHeader}>
              <Ionicons name="star" size={20} color={theme.colors.warning} />
              <Text style={styles.strategyTitle}>Recommended Strategy</Text>
            </View>
            <Text style={styles.strategyName}>{recommendedStrategy.name}</Text>
            <Text style={styles.strategyDescription}>{recommendedStrategy.description}</Text>
            <View style={styles.strategyStats}>
              <View style={styles.strategyStat}>
                <Text style={styles.strategyStatLabel}>Monthly</Text>
                <Text style={styles.strategyStatValue}>
                  {formatCurrency(recommendedStrategy.monthlyPayment)}
                </Text>
              </View>
              <View style={styles.strategyStat}>
                <Text style={styles.strategyStatLabel}>Total Interest</Text>
                <Text style={styles.strategyStatValue}>
                  {formatCurrency(recommendedStrategy.totalInterest)}
                </Text>
              </View>
              <View style={styles.strategyStat}>
                <Text style={styles.strategyStatLabel}>Payoff Time</Text>
                <Text style={styles.strategyStatValue}>
                  {Math.floor(recommendedStrategy.payoffMonths / 12)} yrs
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Loans List */}
        <View style={styles.loansSection}>
          <Text style={styles.sectionTitle}>Your Loans</Text>
          {loans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Loans Added</Text>
              <Text style={styles.emptyText}>
                Add your student loans to track them and get AI-powered repayment strategies.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/student-loans/add')}
              >
                <Text style={styles.emptyButtonText}>Add Your First Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            loans.map((loan) => (
              <TouchableOpacity
                key={loan.id}
                style={styles.loanCard}
                onPress={() => router.push(`/student-loans/${loan.id}`)}
              >
                <View style={styles.loanHeader}>
                  <View>
                    <Text style={styles.loanType}>{getLoanTypeLabel(loan.loanType)}</Text>
                    <Text style={styles.loanServicer}>{loan.servicer}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
                      {loan.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.loanDetails}>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Balance</Text>
                    <Text style={styles.loanDetailValue}>{formatCurrency(loan.currentBalance)}</Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Rate</Text>
                    <Text style={styles.loanDetailValue}>{formatPercent(loan.interestRate)}</Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Payment</Text>
                    <Text style={styles.loanDetailValue}>{formatCurrency(loan.monthlyPayment)}/mo</Text>
                  </View>
                </View>
                <View style={styles.loanFooter}>
                  {loan.pslf_eligible && (
                    <View style={styles.eligibilityBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
                      <Text style={styles.eligibilityText}>PSLF Eligible</Text>
                    </View>
                  )}
                  {loan.idr_eligible && (
                    <View style={styles.eligibilityBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={theme.colors.primary} />
                      <Text style={styles.eligibilityText}>IDR Eligible</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.error + '10',
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  summaryCard: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryItemLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  breakdownCard: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionsCard: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  strategyCard: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  strategyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
    textTransform: 'uppercase',
  },
  strategyName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  strategyDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  strategyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strategyStat: {
    alignItems: 'center',
  },
  strategyStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  strategyStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loansSection: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loanCard: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  loanType: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loanServicer: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  loanDetail: {
    alignItems: 'center',
  },
  loanDetailLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  loanDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
  },
  eligibilityText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
});
