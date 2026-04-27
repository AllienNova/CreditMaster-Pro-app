/**
 * Fynvita Goals Screen
 * Goal cards with progress, create wizard, milestone tracking
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useGoalStore } from "../../src/store/goalStore";

const GOAL_COLORS: Record<string, string> = {
  emergency_fund: "#22C55E",
  savings: "#3B82F6",
  debt_payoff: "#EF4444",
  investment: "#8B5CF6",
  purchase: "#F59E0B",
  retirement: "#06B6D4",
  vacation: "#3B82F6",
  education: "#8B5CF6",
  home: "#F59E0B",
  other: "#6B7280",
};

const GOAL_ICONS: Record<string, string> = {
  emergency_fund: "shield-checkmark",
  savings: "wallet",
  debt_payoff: "card",
  investment: "trending-up",
  purchase: "cart",
  retirement: "home",
  vacation: "airplane",
  education: "school",
  home: "home",
  other: "flag",
};

const CATEGORIES = ["all", "savings", "debt", "investment", "purchase"];

function mapGoalTypeToCategory(
  type: string | undefined,
): "savings" | "debt" | "investment" | "purchase" {
  if (type === "debt_payoff") return "debt";
  if (type === "investment") return "investment";
  if (type === "purchase") return "purchase";
  return "savings";
}

export default function GoalsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { goals, isLoadingGoals, error, fetchGoals, clearError } =
    useGoalStore();

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const filteredGoals =
    selectedCategory === "all"
      ? goals
      : goals.filter(
          (g) => mapGoalTypeToCategory(g.type) === selectedCategory,
        );
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress =
    totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (isLoadingGoals && goals.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && goals.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.error ?? "#EF4444"}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchGoals();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Financial Goals</Text>
          <TouchableOpacity
            onPress={() => router.push("/financial/create-goal" as Href)}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="flag-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyText}>
              Tap + to create your first financial goal
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/financial/create-goal" as Href)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Overview Card */}
            <Card style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View>
                  <Text style={styles.overviewLabel}>Total Progress</Text>
                  <Text style={styles.overviewValue}>
                    ${totalSaved.toLocaleString()}{" "}
                    <Text style={styles.overviewTarget}>
                      / ${totalTarget.toLocaleString()}
                    </Text>
                  </Text>
                </View>
                <View style={styles.progressCircle}>
                  <Text style={styles.progressPercent}>
                    {overallProgress}%
                  </Text>
                </View>
              </View>
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${overallProgress}%` },
                  ]}
                />
              </View>
              <View style={styles.overviewStats}>
                <View style={styles.overviewStat}>
                  <Ionicons
                    name="flag"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.statValue}>{goals.length}</Text>
                  <Text style={styles.statLabel}>Goals</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#22C55E"
                  />
                  <Text style={styles.statValue}>
                    {goals.filter((g) => g.status === "completed").length}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Ionicons name="trending-up" size={16} color="#3B82F6" />
                  <Text style={styles.statValue}>
                    $
                    {goals.reduce(
                      (sum, g) => sum + (g.monthlyContribution || 0),
                      0,
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Monthly</Text>
                </View>
              </View>
            </Card>

            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    selectedCategory === cat && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === cat && styles.filterChipTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Goals List */}
            <Text style={styles.sectionTitle}>
              {filteredGoals.length} Goals
            </Text>
            {filteredGoals.map((goal) => {
              const progress =
                goal.targetAmount > 0
                  ? Math.round(
                      (goal.currentAmount / goal.targetAmount) * 100,
                    )
                  : 0;
              const goalType = goal.type || "other";
              const goalColor = GOAL_COLORS[goalType] || "#6B7280";
              const goalIcon = GOAL_ICONS[goalType] || "flag";
              const targetDateStr =
                goal.targetDate || goal.deadline || "";
              const formattedDate = targetDateStr
                ? new Date(targetDateStr).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "No deadline";
              const milestones = [
                { percent: 25, reached: progress >= 25 },
                { percent: 50, reached: progress >= 50 },
                { percent: 75, reached: progress >= 75 },
                { percent: 100, reached: progress >= 100 },
              ];
              return (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() =>
                    router.push(
                      `/financial/goal-detail?id=${goal.id}` as Href,
                    )
                  }
                >
                  <Card style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View
                        style={[
                          styles.goalIcon,
                          { backgroundColor: `${goalColor}15` },
                        ]}
                      >
                        <Ionicons
                          name={
                            goalIcon as keyof typeof Ionicons.glyphMap
                          }
                          size={24}
                          color={goalColor}
                        />
                      </View>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <Text style={styles.goalTarget}>
                          Target: {formattedDate}
                        </Text>
                      </View>
                      <View style={styles.goalAmounts}>
                        <Text style={styles.goalCurrent}>
                          ${goal.currentAmount.toLocaleString()}
                        </Text>
                        <Text style={styles.goalTargetAmount}>
                          / ${goal.targetAmount.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.goalProgressContainer}>
                      <View
                        style={[
                          styles.goalProgress,
                          {
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: goalColor,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.milestonesRow}>
                      {milestones.map((m, idx) => (
                        <View key={idx} style={styles.milestone}>
                          <View
                            style={[
                              styles.milestoneIcon,
                              m.reached && {
                                backgroundColor: goalColor,
                              },
                            ]}
                          >
                            {m.reached && (
                              <Ionicons
                                name="checkmark"
                                size={10}
                                color="#fff"
                              />
                            )}
                          </View>
                          <Text style={styles.milestoneText}>
                            {m.percent}%
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.goalFooter}>
                      <View style={styles.contributionBadge}>
                        <Ionicons
                          name="repeat"
                          size={12}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.contributionText}>
                          ${goal.monthlyContribution || 0}/mo
                        </Text>
                      </View>
                      <Text style={styles.progressText}>
                        {progress}% complete
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}

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
  errorText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  overviewCard: { marginBottom: theme.spacing.lg },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  overviewLabel: { fontSize: 12, color: theme.colors.textSecondary },
  overviewValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  overviewTarget: {
    fontSize: 14,
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercent: { fontSize: 16, fontWeight: "700", color: "#fff" },
  progressContainer: {
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
  overviewStats: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  overviewStat: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 4,
  },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  filterScroll: { marginBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, color: theme.colors.textSecondary },
  filterChipTextActive: { color: "#fff" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  goalCard: { marginBottom: theme.spacing.md },
  goalHeader: { flexDirection: "row", alignItems: "center" },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  goalTarget: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  goalAmounts: { alignItems: "flex-end" },
  goalCurrent: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  goalTargetAmount: { fontSize: 11, color: theme.colors.textSecondary },
  goalProgressContainer: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginTop: theme.spacing.md,
  },
  goalProgress: { height: "100%", borderRadius: 3 },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  milestone: { alignItems: "center" },
  milestoneIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  milestoneText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  goalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contributionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.colors.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contributionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "500",
    marginLeft: 4,
  },
  progressText: { fontSize: 12, color: theme.colors.textSecondary },
});
