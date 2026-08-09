/**
 * Smart Budget Mobile Screen - Enhanced
 *
 * Real-data wiring: the monthly budget overview (totals, percent used, days
 * remaining, and over-budget alerts) is fetched from the real web route
 * GET /api/financial/budgets/summary via budgetApi.getBudgetSummary, adapted
 * web -> mobile by mapBudgetSummary.
 *
 * The former hardcoded BudgetAnalysis — invented $5,000 budgeted / $3,200 spent /
 * 64% used / 12 days left, shown to every user behind a fake setTimeout — and its
 * empty categories/alerts were removed. A user with no budgets now sees an honest
 * empty state instead of a fabricated overview, and a fetch failure shows an inline
 * error with retry rather than silently rendering invented figures.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { budgetApi } from "../../src/services/api/financial";
import type { BudgetOverviewData } from "../../src/services/api/financial";

/**
 * Budget Overview Component
 * Monthly budget summary with progress bars. Renders the sourced BudgetOverviewData
 * view-model directly — every field comes from GET /api/financial/budgets/summary.
 */
interface BudgetOverviewProps {
  analysis: BudgetOverviewData;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ analysis }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentUsed: number): string => {
    if (percentUsed >= 100) return theme.colors.error;
    if (percentUsed >= 90) return theme.colors.warning;
    if (percentUsed >= 75) return theme.colors.primary;
    return theme.colors.success;
  };

  return (
    <Card style={styles.overviewCard}>
      <Text style={styles.cardTitle}>Monthly Budget Overview</Text>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Ionicons name="wallet" size={24} color={theme.colors.primary} />
          <Text style={styles.metricLabel}>Budgeted</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(analysis.totalBudgeted)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Ionicons
            name="trending-down"
            size={24}
            color={theme.colors.warning}
          />
          <Text style={styles.metricLabel}>Spent</Text>
          <Text
            style={[
              styles.metricValue,
              { color: getProgressColor(analysis.percentUsed) },
            ]}
          >
            {formatCurrency(analysis.totalSpent)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Ionicons name="cash" size={24} color={theme.colors.success} />
          <Text style={styles.metricLabel}>Remaining</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(analysis.totalRemaining)}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Ionicons
            name="calendar"
            size={24}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.metricLabel}>Days Left</Text>
          <Text style={styles.metricValue}>{analysis.daysRemaining}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(analysis.percentUsed, 100)}%`,
                backgroundColor: getProgressColor(analysis.percentUsed),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {analysis.percentUsed.toFixed(1)}% of budget used
        </Text>
      </View>

      {analysis.alerts && analysis.alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.alertsTitle}>⚠️ Alerts</Text>
          {analysis.alerts.slice(0, 3).map((alert, idx) => (
            <View key={idx} style={styles.alertItem}>
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  overviewCard: { padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12, color: theme.colors.text },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  metricBox: { width: "48%", alignItems: "center", paddingVertical: 12, marginBottom: 8, backgroundColor: theme.colors.background, borderRadius: 8 },
  metricLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  metricValue: { fontSize: 18, fontWeight: "700", color: theme.colors.text, marginTop: 2 },
  progressSection: { marginTop: 8 },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, textAlign: "center" },
  alertsSection: { marginTop: 12, padding: 12, backgroundColor: "#FFF3CD", borderRadius: 8 },
  alertsTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  alertItem: { paddingVertical: 2 },
  alertText: { fontSize: 13, color: theme.colors.text },
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  stateBlock: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
});

export default function SmartBudgetEnhancedScreen() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<BudgetOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBudget = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await budgetApi.getBudgetSummary();
    if (res.success && res.data) {
      setAnalysis(res.data);
    } else {
      setError(res.error?.message ?? "Unable to load budget data right now.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  if (loading && !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={styles.loadingContainer}
          testID="smart-budget-enhanced-loading"
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>
            Loading budget data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stateBlock} testID="smart-budget-enhanced-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBudget}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // A user with no active budget yields all-zero totals; empty-state rather than
  // render a $0 "overview" that reads like a real (but empty) budget.
  const hasBudget =
    !!analysis && (analysis.totalBudgeted > 0 || analysis.totalSpent > 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {hasBudget && analysis ? (
          <BudgetOverview analysis={analysis} />
        ) : (
          <View style={styles.stateBlock} testID="smart-budget-enhanced-empty">
            <Ionicons
              name="wallet-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.stateText}>
              No budget set up yet. Create a budget to see your monthly overview
              here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
