/**
 * Fynvita Spending Analysis Screen
 * Analyze spending patterns and get insights with real charts
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
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { PieChart, LineChart, BarChart } from "../../src/components/charts";
import { useBudgetStore } from "../../src/store/budgetStore";
import { financialOverviewApi } from "../../src/services/api/financial";

interface SpendingCategory {
  name: string;
  amount: number;
  budget: number;
  icon: string;
  color: string;
}
interface SpendingTrend {
  month: string;
  amount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Housing: "#3B82F6",
  "Food & Dining": "#F59E0B",
  Transportation: "#10B981",
  Shopping: "#EC4899",
  Entertainment: "#8B5CF6",
  Utilities: "#F97316",
  Healthcare: "#06B6D4",
  Personal: "#6366F1",
  Other: "#9CA3AF",
};

const CATEGORY_ICONS: Record<string, string> = {
  Housing: "home",
  "Food & Dining": "restaurant",
  Transportation: "car",
  Shopping: "bag",
  Entertainment: "game-controller",
  Utilities: "flash",
  Healthcare: "medical",
  Personal: "person",
  Other: "ellipsis-horizontal",
};

// Fallback mock data when API is unavailable
const MOCK_CATEGORIES: SpendingCategory[] = [
  {
    name: "Housing",
    amount: 1800,
    budget: 1800,
    icon: "home",
    color: "#3B82F6",
  },
  {
    name: "Food & Dining",
    amount: 650,
    budget: 600,
    icon: "restaurant",
    color: "#F59E0B",
  },
  {
    name: "Transportation",
    amount: 420,
    budget: 500,
    icon: "car",
    color: "#10B981",
  },
  { name: "Shopping", amount: 380, budget: 300, icon: "bag", color: "#EC4899" },
  {
    name: "Entertainment",
    amount: 180,
    budget: 200,
    icon: "game-controller",
    color: "#8B5CF6",
  },
  {
    name: "Utilities",
    amount: 220,
    budget: 250,
    icon: "flash",
    color: "#F97316",
  },
];

const MOCK_TRENDS: SpendingTrend[] = [
  { month: "Jul", amount: 3200 },
  { month: "Aug", amount: 3450 },
  { month: "Sep", amount: 3100 },
  { month: "Oct", amount: 3650 },
  { month: "Nov", amount: 3380 },
  { month: "Dec", amount: 3650 },
];

const { width: screenWidth } = Dimensions.get("window");

export default function SpendingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [trends, setTrends] = useState<SpendingTrend[]>([]);
  const [chartView, setChartView] = useState<"pie" | "bar">("pie");
  const [error, setError] = useState<string | null>(null);

  const { budgets, fetchBudgets } = useBudgetStore();

  const loadSpendingData = useCallback(async () => {
    try {
      setError(null);
      const response = await financialOverviewApi.getSpendingInsights("month");

      if (response.success && response.data) {
        const catData = response.data.byCategory.map((cat) => ({
          name: cat.category,
          amount: cat.amount,
          budget:
            budgets.find((b) => b.category === cat.category)?.limit ||
            cat.amount * 1.2,
          icon: CATEGORY_ICONS[cat.category] || "ellipsis-horizontal",
          color: CATEGORY_COLORS[cat.category] || "#9CA3AF",
        }));
        setCategories(catData.length > 0 ? catData : MOCK_CATEGORIES);
      } else {
        setCategories(MOCK_CATEGORIES);
      }

      const cashFlowResponse = await financialOverviewApi.getCashFlow(6);
      if (cashFlowResponse.success && cashFlowResponse.data) {
        const trendData = cashFlowResponse.data.expenses.map((e) => ({
          month: e.month,
          amount: e.amount,
        }));
        setTrends(trendData.length > 0 ? trendData : MOCK_TRENDS);
      } else {
        setTrends(MOCK_TRENDS);
      }
    } catch (err) {
      // Fallback to mock data silently in production
      setCategories(MOCK_CATEGORIES);
      setTrends(MOCK_TRENDS);
    } finally {
      setLoading(false);
    }
  }, [budgets]);

  useEffect(() => {
    fetchBudgets();
    loadSpendingData();
  }, [loadSpendingData, fetchBudgets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSpendingData();
    setRefreshing(false);
  };

  const totalSpent = categories.reduce((sum, c) => sum + c.amount, 0);
  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const avgMonthly =
    trends.length > 0
      ? trends.reduce((sum, t) => sum + t.amount, 0) / trends.length
      : 0;

  // Prepare chart data
  const pieChartData = categories.map((cat) => ({
    value: cat.amount,
    label: cat.name,
    color: cat.color,
  }));

  const lineChartData = trends.map((t) => ({
    value: t.amount,
    label: t.month,
  }));

  const barChartData = categories.map((cat) => ({
    value: cat.amount,
    label: cat.name.split(" ")[0], // Shorten labels
    color: cat.color,
  }));

  // Generate dynamic insights
  const generateInsights = () => {
    const insights: { type: "warning" | "success"; text: string }[] = [];
    categories.forEach((cat) => {
      const percent = (cat.amount / cat.budget) * 100;
      if (percent > 100) {
        insights.push({
          type: "warning",
          text: `${cat.name} exceeded budget by $${(cat.amount - cat.budget).toFixed(0)}`,
        });
      } else if (percent < 80) {
        insights.push({
          type: "success",
          text: `${cat.name} is ${(100 - percent).toFixed(0)}% under budget`,
        });
      }
    });
    return insights.slice(0, 4); // Limit to 4 insights
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing spending patterns...</Text>
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Spending Analysis</Text>
            <Text style={styles.subtitle}>This month's overview</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/insights")}>
            <Ionicons
              name="bulb-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValue}>${totalSpent.toLocaleString()}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Budget</Text>
            <Text style={styles.statValue}>
              ${totalBudget.toLocaleString()}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: totalBudget - totalSpent >= 0 ? "#22C55E" : "#EF4444",
                },
              ]}
            >
              ${Math.abs(totalBudget - totalSpent).toLocaleString()}
            </Text>
          </Card>
        </View>

        {/* Chart View Toggle */}
        <View style={styles.chartToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              chartView === "pie" && styles.toggleButtonActive,
            ]}
            onPress={() => setChartView("pie")}
          >
            <Ionicons
              name="pie-chart"
              size={18}
              color={chartView === "pie" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                chartView === "pie" && styles.toggleTextActive,
              ]}
            >
              Pie
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              chartView === "bar" && styles.toggleButtonActive,
            ]}
            onPress={() => setChartView("bar")}
          >
            <Ionicons
              name="bar-chart"
              size={18}
              color={chartView === "bar" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                chartView === "bar" && styles.toggleTextActive,
              ]}
            >
              Bar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Spending Breakdown Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Spending Breakdown</Text>
          {chartView === "pie" ? (
            <PieChart
              data={pieChartData}
              size={180}
              innerRadius={50}
              centerValue={`$${(totalSpent / 1000).toFixed(1)}K`}
              centerLabel="Total"
              showPercentages
            />
          ) : (
            <BarChart
              data={barChartData}
              width={screenWidth - 64}
              height={200}
              formatValue={(v) => `$${v}`}
            />
          )}
        </Card>

        {/* Spending by Category List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {categories.map((category, i) => {
            const progress = (category.amount / category.budget) * 100;
            const isOver = progress > 100;
            return (
              <Card key={i} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${category.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={category.color}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: isOver
                              ? "#EF4444"
                              : category.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.categoryAmounts}>
                    <Text
                      style={[
                        styles.spentAmount,
                        isOver && { color: "#EF4444" },
                      ]}
                    >
                      ${category.amount}
                    </Text>
                    <Text style={styles.budgetAmount}>
                      / ${category.budget}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* Monthly Trend Chart */}
        <Card style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 64}
            height={180}
            color={theme.colors.primary}
            showDots
            showGrid
            formatValue={(v) => `$${(v / 1000).toFixed(1)}K`}
          />
          <View style={styles.avgRow}>
            <Text style={styles.avgLabel}>Monthly Average:</Text>
            <Text style={styles.avgValue}>${avgMonthly.toLocaleString()}</Text>
          </View>
        </Card>

        {/* AI Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}> Spending Insights</Text>
          </View>
          {insights.length > 0 ? (
            insights.map((insight, i) => (
              <Text key={i} style={styles.insightText}>
                {insight.type === "warning" ? "⚠️" : "✅"} {insight.text}
              </Text>
            ))
          ) : (
            <Text style={styles.insightText}>
              ✅ All categories are within budget!
            </Text>
          )}
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push("/insights")}
          >
            <Text style={styles.viewAllText}>View All Insights</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  statsRow: { flexDirection: "row", paddingHorizontal: theme.spacing.lg },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  chartToggle: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.lg,
    gap: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  toggleButtonActive: { backgroundColor: theme.colors.primary },
  toggleText: { fontSize: 13, color: theme.colors.textSecondary },
  toggleTextActive: { color: "#fff" },
  chartCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  section: { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  categoryHeader: { flexDirection: "row", alignItems: "center" },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: { flex: 1, marginLeft: 12 },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  categoryAmounts: { flexDirection: "row", alignItems: "baseline" },
  spentAmount: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  budgetAmount: { fontSize: 12, color: theme.colors.textSecondary },
  trendCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  avgRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
  avgLabel: { fontSize: 12, color: theme.colors.textSecondary },
  avgValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 4,
  },
  insightsCard: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  insightText: { fontSize: 13, color: theme.colors.text, lineHeight: 24 },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewAllText: { fontSize: 14, color: theme.colors.primary, fontWeight: "500" },
});
