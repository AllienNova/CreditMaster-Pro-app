/**
 * Fynvita Goal Detail Screen
 * Shows goal progress, investment projections, and recommended strategy
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useGoalStore, selectGoalById } from "../../src/store/goalStore";

const ANNUAL_RETURN_RATE = 0.07;

interface InvestmentProjection {
  withInvesting: number;
  withoutInvesting: number;
  monthsToGoalWithInvesting: number | null;
  monthsToGoalWithoutInvesting: number | null;
  recommendedAllocation: { label: string; percent: number; color: string }[];
  suggestedMonthly: number;
}

function calculateProjection(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number,
  targetDateStr: string | undefined,
): InvestmentProjection {
  const now = new Date();
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date(now.getFullYear() + 5, now.getMonth());
  const monthsRemaining = Math.max(
    1,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth()),
  );

  const monthlyReturn = ANNUAL_RETURN_RATE / 12;

  // With investing (compound interest)
  let withInvesting = currentAmount;
  for (let i = 0; i < monthsRemaining; i++) {
    withInvesting = withInvesting * (1 + monthlyReturn) + monthlyContribution;
  }

  // Without investing (just savings)
  const withoutInvesting = currentAmount + monthlyContribution * monthsRemaining;

  // Months to goal with investing
  let monthsWithInv: number | null = null;
  if (monthlyContribution > 0 || currentAmount > 0) {
    let balance = currentAmount;
    for (let m = 1; m <= 600; m++) {
      balance = balance * (1 + monthlyReturn) + monthlyContribution;
      if (balance >= targetAmount) {
        monthsWithInv = m;
        break;
      }
    }
  }

  // Months to goal without investing
  let monthsWithoutInv: number | null = null;
  if (monthlyContribution > 0) {
    const remaining = targetAmount - currentAmount;
    monthsWithoutInv = Math.ceil(remaining / monthlyContribution);
  }

  // Required monthly contribution to reach target by date (with investing)
  let suggestedMonthly = monthlyContribution;
  if (withInvesting < targetAmount && monthsRemaining > 0) {
    const compoundFactor = Math.pow(1 + monthlyReturn, monthsRemaining);
    const annuityFactor = (compoundFactor - 1) / monthlyReturn;
    suggestedMonthly = Math.max(
      0,
      Math.ceil((targetAmount - currentAmount * compoundFactor) / annuityFactor),
    );
  }

  // Allocation based on years to goal
  const yearsToGoal = monthsRemaining / 12;
  let recommendedAllocation: { label: string; percent: number; color: string }[];
  if (yearsToGoal <= 2) {
    recommendedAllocation = [
      { label: "Bonds", percent: 60, color: "#22C55E" },
      { label: "Stocks", percent: 25, color: "#3B82F6" },
      { label: "Cash", percent: 15, color: "#F59E0B" },
    ];
  } else if (yearsToGoal <= 5) {
    recommendedAllocation = [
      { label: "Stocks", percent: 50, color: "#3B82F6" },
      { label: "Bonds", percent: 35, color: "#22C55E" },
      { label: "Alternatives", percent: 10, color: "#8B5CF6" },
      { label: "Cash", percent: 5, color: "#F59E0B" },
    ];
  } else {
    recommendedAllocation = [
      { label: "Stocks", percent: 80, color: "#3B82F6" },
      { label: "Alternatives", percent: 15, color: "#8B5CF6" },
      { label: "Bonds", percent: 5, color: "#22C55E" },
    ];
  }

  return {
    withInvesting: Math.round(withInvesting),
    withoutInvesting: Math.round(withoutInvesting),
    monthsToGoalWithInvesting: monthsWithInv,
    monthsToGoalWithoutInvesting: monthsWithoutInv,
    recommendedAllocation,
    suggestedMonthly,
  };
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useGoalStore(selectGoalById(id || ""));
  const { fetchGoals, contributeToGoal, isContributing } = useGoalStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!goal) {
      fetchGoals();
    }
  }, [goal, fetchGoals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  if (!goal) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading goal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress =
    goal.targetAmount > 0
      ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
      : 0;

  const targetDateStr = goal.targetDate || goal.deadline;
  const projection = calculateProjection(
    goal.currentAmount,
    goal.targetAmount,
    goal.monthlyContribution || 0,
    targetDateStr,
  );

  const investmentGain = projection.withInvesting - projection.withoutInvesting;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
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
          <Text style={styles.title} numberOfLines={1}>
            {goal.name}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>Current Progress</Text>
              <Text style={styles.progressAmount}>
                ${goal.currentAmount.toLocaleString()}
              </Text>
              <Text style={styles.targetText}>
                of ${goal.targetAmount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]}
            />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>${remaining.toLocaleString()}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Monthly</Text>
              <Text style={styles.statValue}>
                ${(goal.monthlyContribution || 0).toLocaleString()}/mo
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Status</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      goal.status === "completed"
                        ? "#22C55E"
                        : goal.status === "active"
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                  },
                ]}
              >
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Investment Projections */}
        <Text style={styles.sectionTitle}>Investment Projections</Text>
        <Card style={styles.investCard}>
          <View style={styles.projectionRow}>
            <View style={styles.projectionItem}>
              <Ionicons name="trending-up" size={20} color="#22C55E" />
              <Text style={styles.projectionLabel}>With Investing</Text>
              <Text style={[styles.projectionValue, { color: "#22C55E" }]}>
                ${projection.withInvesting.toLocaleString()}
              </Text>
              {projection.monthsToGoalWithInvesting !== null && (
                <Text style={styles.projectionSubtext}>
                  ~{projection.monthsToGoalWithInvesting} months to goal
                </Text>
              )}
            </View>
            <View style={styles.projectionDivider} />
            <View style={styles.projectionItem}>
              <Ionicons name="wallet" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.projectionLabel}>Savings Only</Text>
              <Text style={styles.projectionValue}>
                ${projection.withoutInvesting.toLocaleString()}
              </Text>
              {projection.monthsToGoalWithoutInvesting !== null && (
                <Text style={styles.projectionSubtext}>
                  ~{projection.monthsToGoalWithoutInvesting} months to goal
                </Text>
              )}
            </View>
          </View>
          {investmentGain > 0 && (
            <View style={styles.gainBanner}>
              <Ionicons name="sparkles" size={16} color="#22C55E" />
              <Text style={styles.gainText}>
                Investing could earn you ${investmentGain.toLocaleString()} more
                at 7% annual return
              </Text>
            </View>
          )}
        </Card>

        {/* Suggested Monthly Contribution */}
        {projection.suggestedMonthly > (goal.monthlyContribution || 0) && (
          <Card style={styles.suggestCard}>
            <View style={styles.suggestHeader}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.suggestTitle}>Suggested Contribution</Text>
            </View>
            <Text style={styles.suggestText}>
              To reach your goal on time with investing, consider contributing{" "}
              <Text style={styles.suggestAmount}>
                ${projection.suggestedMonthly.toLocaleString()}/mo
              </Text>{" "}
              (currently ${(goal.monthlyContribution || 0).toLocaleString()}/mo)
            </Text>
          </Card>
        )}

        {/* Recommended Allocation */}
        <Text style={styles.sectionTitle}>Recommended Portfolio</Text>
        <Card style={styles.allocationCard}>
          {/* Stacked bar */}
          <View style={styles.allocationBar}>
            {projection.recommendedAllocation.map((a, idx) => (
              <View
                key={idx}
                style={[
                  styles.allocationSegment,
                  {
                    flex: a.percent,
                    backgroundColor: a.color,
                    borderTopLeftRadius: idx === 0 ? 6 : 0,
                    borderBottomLeftRadius: idx === 0 ? 6 : 0,
                    borderTopRightRadius:
                      idx === projection.recommendedAllocation.length - 1 ? 6 : 0,
                    borderBottomRightRadius:
                      idx === projection.recommendedAllocation.length - 1 ? 6 : 0,
                  },
                ]}
              />
            ))}
          </View>
          {/* Legend */}
          <View style={styles.allocationLegend}>
            {projection.recommendedAllocation.map((a, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: a.color }]}
                />
                <Text style={styles.legendLabel}>{a.label}</Text>
                <Text style={styles.legendPercent}>{a.percent}%</Text>
              </View>
            ))}
          </View>
          <Text style={styles.allocationNote}>
            Based on your goal timeline. Longer timelines favor stocks for growth.
          </Text>
        </Card>

        {/* Milestones */}
        <Text style={styles.sectionTitle}>Milestones</Text>
        <Card style={styles.milestonesCard}>
          {[25, 50, 75, 100].map((pct) => {
            const reached = progress >= pct;
            const amount = Math.round((goal.targetAmount * pct) / 100);
            return (
              <View key={pct} style={styles.milestoneRow}>
                <View
                  style={[
                    styles.milestoneCheck,
                    reached && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  {reached && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <View style={styles.milestoneInfo}>
                  <Text
                    style={[
                      styles.milestoneLabel,
                      reached && { color: theme.colors.text },
                    ]}
                  >
                    {pct}% - ${amount.toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.milestoneStatus,
                    reached && { color: "#22C55E" },
                  ]}
                >
                  {reached ? "Reached" : "Pending"}
                </Text>
              </View>
            );
          })}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginHorizontal: theme.spacing.sm,
  },
  progressCard: { marginBottom: theme.spacing.lg },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  progressLabel: { fontSize: 12, color: theme.colors.textSecondary },
  progressAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  targetText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercent: { fontSize: 16, fontWeight: "700", color: "#fff" },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginTop: theme.spacing.md,
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  investCard: { marginBottom: theme.spacing.md },
  projectionRow: { flexDirection: "row" },
  projectionItem: { flex: 1, alignItems: "center", paddingVertical: 8 },
  projectionDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  projectionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  projectionValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  projectionSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  gainBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    padding: theme.spacing.sm,
    borderRadius: 8,
    marginTop: theme.spacing.md,
  },
  gainText: {
    fontSize: 13,
    color: "#22C55E",
    marginLeft: 8,
    flex: 1,
  },
  suggestCard: { marginBottom: theme.spacing.md },
  suggestHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F59E0B",
    marginLeft: 8,
  },
  suggestText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20 },
  suggestAmount: { fontWeight: "700", color: theme.colors.text },
  allocationCard: { marginBottom: theme.spacing.lg },
  allocationBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
  },
  allocationSegment: { height: "100%" },
  allocationLegend: { gap: 8 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
  legendPercent: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  allocationNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    fontStyle: "italic",
  },
  milestonesCard: { marginBottom: theme.spacing.lg },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  milestoneCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  milestoneInfo: { flex: 1 },
  milestoneLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  milestoneStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
});
