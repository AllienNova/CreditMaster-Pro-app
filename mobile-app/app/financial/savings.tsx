/**
 * Fynvita Savings Tracker Screen
 *
 * Real-data wiring (PARITY-P1): renders real financial goals from goalStore and
 * real aggregate balances (net worth, savings rate, monthly cash flow, total
 * assets) from dashboardStore. The former hardcoded ACCOUNTS/GOALS arrays, the
 * fake setTimeout load, and the fabricated per-account APY list were removed — no
 * honest mobile source exposes per-account savings balances or APY, so that
 * section is gone rather than faked.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useGoalStore } from "../../src/store/goalStore";
import { useDashboardStore } from "../../src/store/dashboardStore";
import type { FinancialGoal } from "../../src/services/api/types";

// Goal target dates arrive as ISO strings; render a compact "Mon YYYY".
function formatDeadline(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function SavingsScreen() {
  const {
    goals,
    isLoadingGoals,
    error: goalsError,
    fetchGoals,
  } = useGoalStore();
  const {
    dashboard,
    isLoadingDashboard,
    error: dashboardError,
    fetchDashboard,
  } = useDashboardStore();

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    fetchGoals();
    fetchDashboard();
  }, [fetchGoals, fetchDashboard]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchGoals(), fetchDashboard()]);
    setRefreshing(false);
  };

  const loading = isLoadingGoals || isLoadingDashboard;
  const error = goalsError || dashboardError;
  const hasData = dashboard !== null || goals.length > 0;

  const monthlyCashFlow = dashboard
    ? dashboard.monthlyIncome - dashboard.monthlyExpenses
    : 0;

  if (loading && !hasData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="savings-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading savings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !hasData) {
    return (
      <ScreenError
        title="Savings Tracker"
        message={error}
        onRetry={load}
        testID="savings-error"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Savings Tracker</Text>
            <Text style={styles.subtitle}>Watch your money grow</Text>
          </View>
        </View>

        {/* Summary — real aggregates from the financial dashboard */}
        {dashboard && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Worth</Text>
            <Text style={styles.summaryValue}>
              ${Math.round(dashboard.netWorth).toLocaleString()}
            </Text>
            <View style={styles.interestRow}>
              <Ionicons
                name="trending-up"
                size={16}
                color={theme.colors.success}
              />
              <Text style={styles.interestText}>
                {/* `dashboard &&` above only proves the object exists, not that
                    this field does — the same truthiness-guard gap that crashed
                    the Home tab on `gamification.level.current`. A payload
                    without `savingsRate` makes `.toFixed` throw and the
                    ErrorBoundary replaces the screen. dashboardStore already
                    treats the field as optional (`?.savingsRate || 0`, :121),
                    so the type's `savingsRate: number` is not a guarantee. */}
                {(dashboard.savingsRate ?? 0).toFixed(0)}% savings rate
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ${Math.round(monthlyCashFlow).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Monthly Savings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ${Math.round(dashboard.totalAssets).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Total Assets</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Goals — real goals from goalStore */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          {goals.length === 0 ? (
            <View style={styles.emptyCard} testID="savings-empty">
              <Ionicons
                name="flag-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No savings goals yet</Text>
              <Text style={styles.emptyText}>
                Create a goal to start tracking your progress.
              </Text>
            </View>
          ) : (
            goals.map((goal: FinancialGoal) => {
              const progress =
                goal.targetAmount > 0
                  ? (goal.currentAmount / goal.targetAmount) * 100
                  : 0;
              const deadline = formatDeadline(goal.deadline ?? goal.targetDate);
              return (
                <Card key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    {deadline !== "" && (
                      <Text style={styles.goalDeadline}>{deadline}</Text>
                    )}
                  </View>
                  <View style={styles.goalProgress}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(progress, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {progress.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.goalAmounts}>
                    <Text style={styles.currentAmount}>
                      ${Math.round(goal.currentAmount).toLocaleString()}
                    </Text>
                    <Text style={styles.targetAmount}>
                      of ${Math.round(goal.targetAmount).toLocaleString()}
                    </Text>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Tips (static guidance, not user data) */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}> Savings Tips</Text>
          </View>
          <Text style={styles.tipText}>
            • Automate your savings with recurring transfers
          </Text>
          <Text style={styles.tipText}>
            • Keep 3-6 months expenses in emergency fund
          </Text>
          <Text style={styles.tipText}>
            • Take advantage of high-yield savings accounts
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 8,
  },
  interestRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  interestText: { fontSize: 14, color: theme.colors.success, marginLeft: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: "stretch",
    marginTop: theme.spacing.lg,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyCard: { padding: theme.spacing.xl, alignItems: "center" },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  goalCard: { marginBottom: theme.spacing.md, padding: theme.spacing.md },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  goalName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  goalDeadline: { fontSize: 12, color: theme.colors.textSecondary },
  goalProgress: { flexDirection: "row", alignItems: "center" },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
    marginLeft: 8,
    width: 40,
  },
  goalAmounts: { flexDirection: "row", marginTop: 8 },
  currentAmount: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  targetAmount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  tipsCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  tipText: { fontSize: 13, color: theme.colors.text, lineHeight: 22 },
});
