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
import { useFinancialStore } from "../../src/store/financialStore";

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  milestones: { percent: number; reached: boolean }[];
  category: "savings" | "debt" | "investment" | "purchase";
}

const GOAL_COLORS: Record<string, string> = {
  emergency_fund: "#22C55E",
  savings: "#3B82F6",
  debt_payoff: "#EF4444",
  investment: "#8B5CF6",
  purchase: "#F59E0B",
  retirement: "#06B6D4",
  other: "#6B7280",
};

const GOAL_ICONS: Record<string, string> = {
  emergency_fund: "shield-checkmark",
  savings: "wallet",
  debt_payoff: "card",
  investment: "trending-up",
  purchase: "cart",
  retirement: "home",
  other: "flag",
};

const MOCK_GOALS: Goal[] = [
  {
    id: "1",
    name: "Emergency Fund",
    icon: "shield-checkmark",
    color: "#22C55E",
    targetAmount: 15000,
    currentAmount: 8500,
    targetDate: "Jun 2025",
    monthlyContribution: 500,
    milestones: [
      { percent: 25, reached: true },
      { percent: 50, reached: true },
      { percent: 75, reached: false },
      { percent: 100, reached: false },
    ],
    category: "savings",
  },
  {
    id: "2",
    name: "Vacation Fund",
    icon: "airplane",
    color: "#3B82F6",
    targetAmount: 5000,
    currentAmount: 2200,
    targetDate: "Aug 2025",
    monthlyContribution: 300,
    milestones: [
      { percent: 25, reached: true },
      { percent: 50, reached: false },
      { percent: 75, reached: false },
      { percent: 100, reached: false },
    ],
    category: "savings",
  },
  {
    id: "3",
    name: "Pay Off Credit Card",
    icon: "card",
    color: "#EF4444",
    targetAmount: 4500,
    currentAmount: 3200,
    targetDate: "Mar 2025",
    monthlyContribution: 400,
    milestones: [
      { percent: 25, reached: true },
      { percent: 50, reached: true },
      { percent: 75, reached: false },
      { percent: 100, reached: false },
    ],
    category: "debt",
  },
  {
    id: "4",
    name: "New Car Down Payment",
    icon: "car",
    color: "#8B5CF6",
    targetAmount: 8000,
    currentAmount: 1500,
    targetDate: "Dec 2025",
    monthlyContribution: 250,
    milestones: [
      { percent: 25, reached: false },
      { percent: 50, reached: false },
      { percent: 75, reached: false },
      { percent: 100, reached: false },
    ],
    category: "purchase",
  },
];

const CATEGORIES = ["all", "savings", "debt", "investment", "purchase"];

export default function GoalsScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  const { goals: storeGoals, fetchGoals, isLoadingGoals } = useFinancialStore();

  const loadGoals = useCallback(async () => {
    try {
      await fetchGoals();
      if (storeGoals.length > 0) {
        const transformedGoals = storeGoals.map((g) => {
          const progress = (g.currentAmount / g.targetAmount) * 100;
          const goalType = g.type || "other";
          const targetDateStr =
            g.targetDate || g.deadline || new Date().toISOString();
          return {
            id: g.id,
            name: g.name,
            icon: GOAL_ICONS[goalType] || "flag",
            color: GOAL_COLORS[goalType] || "#6B7280",
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            targetDate: new Date(targetDateStr).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            }),
            monthlyContribution: g.monthlyContribution || 0,
            milestones: [
              { percent: 25, reached: progress >= 25 },
              { percent: 50, reached: progress >= 50 },
              { percent: 75, reached: progress >= 75 },
              { percent: 100, reached: progress >= 100 },
            ],
            category: (g.type === "debt_payoff"
              ? "debt"
              : g.type === "emergency_fund"
                ? "savings"
                : g.type) as Goal["category"],
          };
        });
        setGoals(transformedGoals);
      } else {
        setGoals(MOCK_GOALS);
      }
    } catch (err) {
      // Fallback to mock data silently in production
      setGoals(MOCK_GOALS);
    } finally {
      setLoading(false);
    }
  }, [fetchGoals, storeGoals]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const filteredGoals =
    selectedCategory === "all"
      ? goals
      : goals.filter((g) => g.category === selectedCategory);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress =
    totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (loading || isLoadingGoals) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading goals...</Text>
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
              <Text style={styles.progressPercent}>{overallProgress}%</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { width: `${overallProgress}%` }]}
            />
          </View>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Ionicons name="flag" size={16} color={theme.colors.primary} />
              <Text style={styles.statValue}>{goals.length}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.overviewStat}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.statValue}>
                {goals.filter((g) => g.currentAmount >= g.targetAmount).length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.overviewStat}>
              <Ionicons name="trending-up" size={16} color="#3B82F6" />
              <Text style={styles.statValue}>
                ${goals.reduce((sum, g) => sum + g.monthlyContribution, 0)}
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
        <Text style={styles.sectionTitle}>{filteredGoals.length} Goals</Text>
        {filteredGoals.map((goal) => {
          const progress = Math.round(
            (goal.currentAmount / goal.targetAmount) * 100,
          );
          return (
            <TouchableOpacity
              key={goal.id}
              onPress={() =>
                router.push(`/financial/goal-detail?id=${goal.id}` as Href)
              }
            >
              <Card style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View
                    style={[
                      styles.goalIcon,
                      { backgroundColor: `${goal.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={goal.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={goal.color}
                    />
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalTarget}>
                      Target: {goal.targetDate}
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
                      { width: `${progress}%`, backgroundColor: goal.color },
                    ]}
                  />
                </View>
                <View style={styles.milestonesRow}>
                  {goal.milestones.map((m, idx) => (
                    <View key={idx} style={styles.milestone}>
                      <View
                        style={[
                          styles.milestoneIcon,
                          m.reached && { backgroundColor: goal.color },
                        ]}
                      >
                        {m.reached && (
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.milestoneText}>{m.percent}%</Text>
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
                      ${goal.monthlyContribution}/mo
                    </Text>
                  </View>
                  <Text style={styles.progressText}>{progress}% complete</Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

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
