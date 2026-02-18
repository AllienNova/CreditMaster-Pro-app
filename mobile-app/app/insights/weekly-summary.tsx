/**
 * Fynvita Weekly Summary Screen
 * AI-generated weekly financial health overview
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface WeeklySummary {
  healthScore: number;
  healthScoreChange: number;
  spending: {
    totalSpent: number;
    comparedToLastWeek: number;
    trend: "up" | "down" | "stable";
    topCategories: {
      category: string;
      amount: number;
      percentOfTotal: number;
      icon: keyof typeof Ionicons.glyphMap;
    }[];
  };
  budget: {
    totalBudget: number;
    totalSpent: number;
    percentUsed: number;
    daysRemaining: number;
    categoriesOverBudget: number;
  };
  credit: {
    currentScore: number;
    scoreChange: number;
  };
  bills: {
    upcomingCount: number;
    totalDueThisWeek: number;
    overdueCount: number;
  };
  investments: {
    portfolioValue: number;
    weeklyChange: number;
    weeklyChangePercent: number;
    dividendsReceived: number;
  };
  goals: {
    activeGoals: number;
    goalsOnTrack: number;
    goalsAtRisk: number;
  };
  insights: {
    id: string;
    type: "tip" | "alert" | "achievement";
    title: string;
    description: string;
    actionRoute?: string;
  }[];
}

const MOCK_SUMMARY: WeeklySummary = {
  healthScore: 78,
  healthScoreChange: 3,
  spending: {
    totalSpent: 1245.67,
    comparedToLastWeek: -12.5,
    trend: "down",
    topCategories: [
      {
        category: "Groceries",
        amount: 342.15,
        percentOfTotal: 27.5,
        icon: "cart",
      },
      {
        category: "Dining",
        amount: 256.8,
        percentOfTotal: 20.6,
        icon: "restaurant",
      },
      {
        category: "Transportation",
        amount: 189.45,
        percentOfTotal: 15.2,
        icon: "car",
      },
      {
        category: "Shopping",
        amount: 167.9,
        percentOfTotal: 13.5,
        icon: "bag",
      },
      {
        category: "Entertainment",
        amount: 98.5,
        percentOfTotal: 7.9,
        icon: "film",
      },
    ],
  },
  budget: {
    totalBudget: 4000,
    totalSpent: 2856,
    percentUsed: 71.4,
    daysRemaining: 12,
    categoriesOverBudget: 1,
  },
  credit: {
    currentScore: 742,
    scoreChange: 8,
  },
  bills: {
    upcomingCount: 4,
    totalDueThisWeek: 487.5,
    overdueCount: 0,
  },
  investments: {
    portfolioValue: 45678.9,
    weeklyChange: 1234.56,
    weeklyChangePercent: 2.78,
    dividendsReceived: 45.23,
  },
  goals: {
    activeGoals: 3,
    goalsOnTrack: 2,
    goalsAtRisk: 1,
  },
  insights: [
    {
      id: "1",
      type: "achievement",
      title: "Credit Score Improved!",
      description:
        "Your credit score went up 8 points this week. Great progress!",
      actionRoute: "/(tabs)/credit",
    },
    {
      id: "2",
      type: "tip",
      title: "Spending Down 12.5%",
      description: "You spent less this week than last week. Keep it up!",
      actionRoute: "/financial/transactions",
    },
    {
      id: "3",
      type: "alert",
      title: "Goal Needs Attention",
      description: "Your vacation fund is behind schedule by $150",
      actionRoute: "/financial/goals",
    },
  ],
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value: number, showSign = true) => {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

export default function WeeklySummaryScreen() {
  const [summary] = useState<WeeklySummary>(MOCK_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "#22C55E";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  };

  const getInsightIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "achievement":
        return "checkmark-circle";
      case "alert":
        return "warning";
      default:
        return "bulb";
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "achievement":
        return "#22C55E";
      case "alert":
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Generating your summary...</Text>
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
            tintColor={theme.colors.primary}
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
          <Text style={styles.title}>Weekly Summary</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons
              name="share-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.dateRange}>Jan 27 - Feb 2, 2026</Text>

        {/* Health Score Card */}
        <Card
          style={[
            styles.healthCard,
            { backgroundColor: getHealthScoreColor(summary.healthScore) },
          ]}
        >
          <View style={styles.healthContent}>
            <View>
              <Text style={styles.healthLabel}>Financial Health Score</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.healthScore}>{summary.healthScore}</Text>
                <Text style={styles.healthMax}>/100</Text>
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        summary.healthScoreChange >= 0
                          ? "rgba(255,255,255,0.3)"
                          : "#FEE2E2",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      summary.healthScoreChange >= 0 ? "arrow-up" : "arrow-down"
                    }
                    size={12}
                    color={summary.healthScoreChange >= 0 ? "#fff" : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          summary.healthScoreChange >= 0 ? "#fff" : "#EF4444",
                      },
                    ]}
                  >
                    {Math.abs(summary.healthScoreChange)} pts
                  </Text>
                </View>
              </View>
              <Text style={styles.healthMessage}>
                {summary.healthScore >= 80
                  ? "Excellent! Keep up the great work!"
                  : summary.healthScore >= 60
                    ? "Good progress. A few areas to improve."
                    : "Needs attention. Review recommendations."}
              </Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreCircleText}>{summary.healthScore}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="wallet" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(summary.spending.totalSpent)}
            </Text>
            <Text style={styles.statLabel}>Spent This Week</Text>
            <View style={styles.statTrend}>
              <Ionicons
                name={
                  summary.spending.trend === "down"
                    ? "trending-down"
                    : "trending-up"
                }
                size={14}
                color={
                  summary.spending.trend === "down" ? "#22C55E" : "#EF4444"
                }
              />
              <Text
                style={[
                  styles.statTrendText,
                  {
                    color:
                      summary.spending.trend === "down" ? "#22C55E" : "#EF4444",
                  },
                ]}
              >
                {formatPercent(summary.spending.comparedToLastWeek)}
              </Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="pie-chart" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>
              {summary.budget.percentUsed.toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Budget Used</Text>
            <Text style={styles.statSubtext}>
              {summary.budget.daysRemaining} days left
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="analytics" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{summary.credit.currentScore}</Text>
            <Text style={styles.statLabel}>Credit Score</Text>
            <View style={styles.statTrend}>
              <Ionicons
                name={
                  summary.credit.scoreChange >= 0 ? "arrow-up" : "arrow-down"
                }
                size={14}
                color={summary.credit.scoreChange >= 0 ? "#22C55E" : "#EF4444"}
              />
              <Text
                style={[
                  styles.statTrendText,
                  {
                    color:
                      summary.credit.scoreChange >= 0 ? "#22C55E" : "#EF4444",
                  },
                ]}
              >
                {summary.credit.scoreChange >= 0 ? "+" : ""}
                {summary.credit.scoreChange}
              </Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="trending-up" size={20} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(summary.investments.portfolioValue)}
            </Text>
            <Text style={styles.statLabel}>Portfolio</Text>
            <View style={styles.statTrend}>
              <Ionicons
                name={
                  summary.investments.weeklyChangePercent >= 0
                    ? "arrow-up"
                    : "arrow-down"
                }
                size={14}
                color={
                  summary.investments.weeklyChangePercent >= 0
                    ? "#22C55E"
                    : "#EF4444"
                }
              />
              <Text
                style={[
                  styles.statTrendText,
                  {
                    color:
                      summary.investments.weeklyChangePercent >= 0
                        ? "#22C55E"
                        : "#EF4444",
                  },
                ]}
              >
                {formatPercent(summary.investments.weeklyChangePercent)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Key Insights */}
        <Text style={styles.sectionTitle}>Key Insights</Text>
        {summary.insights.map((insight) => (
          <TouchableOpacity
            key={insight.id}
            onPress={() =>
              insight.actionRoute && router.push(insight.actionRoute as never)
            }
          >
            <Card
              style={[
                styles.insightCard,
                {
                  backgroundColor:
                    insight.type === "achievement"
                      ? "#F0FDF4"
                      : insight.type === "alert"
                        ? "#FFFBEB"
                        : "#EFF6FF",
                  borderLeftColor: getInsightColor(insight.type),
                },
              ]}
            >
              <View style={styles.insightContent}>
                <Ionicons
                  name={getInsightIcon(insight.type)}
                  size={22}
                  color={getInsightColor(insight.type)}
                />
                <View style={styles.insightText}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDescription}>
                    {insight.description}
                  </Text>
                </View>
                {insight.actionRoute && (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Spending Breakdown */}
        <Text style={styles.sectionTitle}>Spending Breakdown</Text>
        <Card style={styles.spendingCard}>
          {summary.spending.topCategories.map((cat, index) => (
            <View key={cat.category} style={styles.categoryRow}>
              <View
                style={[styles.categoryIcon, { backgroundColor: "#EFF6FF" }]}
              >
                <Ionicons name={cat.icon} size={18} color="#3B82F6" />
              </View>
              <View style={styles.categoryContent}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{cat.category}</Text>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(cat.amount)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${cat.percentOfTotal}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push("/financial/transactions" as never)}
          >
            <Text style={styles.viewAllText}>View All Transactions</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#F3E8FF" }]}
            onPress={() => router.push("/financial/bills" as never)}
          >
            <Ionicons name="calendar" size={24} color="#8B5CF6" />
            <Text style={styles.actionLabel}>Bills Due</Text>
            <Text style={styles.actionValue}>
              {summary.bills.upcomingCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#DCFCE7" }]}
            onPress={() => router.push("/financial/goals" as never)}
          >
            <Ionicons name="flag" size={24} color="#22C55E" />
            <Text style={styles.actionLabel}>Goals</Text>
            <Text style={styles.actionValue}>
              {summary.goals.goalsOnTrack}/{summary.goals.activeGoals}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#FEF3C7" }]}
            onPress={() => router.push("/(tabs)/investments" as never)}
          >
            <Ionicons name="trending-up" size={24} color="#F59E0B" />
            <Text style={styles.actionLabel}>Dividends</Text>
            <Text style={styles.actionValue}>
              ${summary.investments.dividendsReceived.toFixed(0)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  dateRange: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  healthCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  healthContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  healthScore: { fontSize: 44, fontWeight: "700", color: "#fff" },
  healthMax: { fontSize: 18, color: "rgba(255,255,255,0.7)", marginLeft: 4 },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  changeText: { fontSize: 12, fontWeight: "600", marginLeft: 2 },
  healthMessage: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreCircleText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: "47%",
    marginHorizontal: "1.5%",
    marginBottom: 12,
    padding: theme.spacing.md,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  statSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statTrend: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statTrendText: { fontSize: 12, fontWeight: "500", marginLeft: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  insightCard: {
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 4,
    padding: theme.spacing.md,
  },
  insightContent: { flexDirection: "row", alignItems: "center" },
  insightText: { flex: 1, marginLeft: 12 },
  insightTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  insightDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  spendingCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.md },
  categoryRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryContent: { flex: 1 },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  categoryName: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  categoryAmount: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
    marginRight: 4,
  },
  actionsRow: { flexDirection: "row", marginBottom: theme.spacing.lg },
  actionCard: {
    flex: 1,
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  actionValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
});
