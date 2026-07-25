/**
 * Fynvita Spending Analysis Screen
 *
 * Real-data wiring (PARITY): renders the user's real spending broken down by
 * category plus a real monthly-expense trend — no mocks, no fabricated fields.
 *
 *  - By-category comes from GET /api/financial/dashboard (withPermission
 *    "financial:read") via financialOverviewApi.getDashboard -> the dashboard's
 *    `spendingByCategory` (each { category, amount, percentage, transactionCount }:
 *    the last 30 days of the user's real Plaid expense transactions grouped by
 *    category, sorted by amount desc; see financial-service.calculateSpendingByCategory).
 *    Each category's progress bar shows its real `percentage` share of total spending,
 *    exactly as the web SpendingOverview does (src/components/financial/SpendingOverview.tsx
 *    line 274) — this screen no longer overlays an invented budget. Budget tracking
 *    lives on its own screen (app/financial/budgets.tsx).
 *  - The monthly trend comes from GET /api/financial/spending/cashflow via
 *    financialOverviewApi.getCashFlowAnalysis(6) -> each month's real `expenses`.
 *
 * The screen previously called getSpendingInsights (/financial/insights/spending) and
 * getCashFlow (/financial/insights/cashflow) — routes that DO NOT EXIST (404); every
 * call fell through to hardcoded MOCK_CATEGORIES / MOCK_TRENDS and an invented
 * `amount * 1.2` budget, so real users saw fabricated figures. Both dead methods were
 * deleted and the mocks removed; on a failed fetch the screen shows an honest error +
 * retry, never fabricated data.
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
import { financialOverviewApi } from "../../src/services/api/financial";

interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number; // real share of total spending, 0-100
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

const { width: screenWidth } = Dimensions.get("window");

const money = (value: number): string =>
  `$${Math.round(value).toLocaleString()}`;

export default function SpendingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [trends, setTrends] = useState<SpendingTrend[]>([]);
  const [chartView, setChartView] = useState<"pie" | "bar">("pie");

  const fetchSpending = useCallback(async () => {
    const [dashboardRes, cashFlowRes] = await Promise.all([
      financialOverviewApi.getDashboard(),
      financialOverviewApi.getCashFlowAnalysis(6),
    ]);

    if (
      dashboardRes.success &&
      dashboardRes.data &&
      cashFlowRes.success &&
      cashFlowRes.data
    ) {
      setCategories(
        dashboardRes.data.spendingByCategory.map((c) => ({
          name: c.category,
          amount: c.amount,
          percentage: c.percentage,
          icon: CATEGORY_ICONS[c.category] ?? "ellipsis-horizontal",
          color: CATEGORY_COLORS[c.category] ?? "#9CA3AF",
        })),
      );
      setTrends(
        cashFlowRes.data.months.map((m) => ({
          month: m.month,
          amount: m.expenses,
        })),
      );
      setError(null);
    } else {
      setError(
        dashboardRes.error?.message ??
          cashFlowRes.error?.message ??
          "Unable to load spending.",
      );
    }
  }, []);

  const loadSpendingData = useCallback(async () => {
    setLoading(true);
    await fetchSpending();
    setLoading(false);
  }, [fetchSpending]);

  useEffect(() => {
    loadSpendingData();
  }, [loadSpendingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSpending();
    setRefreshing(false);
  };

  const totalSpent = categories.reduce((sum, c) => sum + c.amount, 0);
  const avgMonthly =
    trends.length > 0
      ? trends.reduce((sum, t) => sum + t.amount, 0) / trends.length
      : 0;

  // Chart data — all derived from the real fetched values.
  const pieChartData = categories.map((cat) => ({
    value: cat.amount,
    label: cat.name,
    color: cat.color,
  }));
  const lineChartData = trends.map((t) => ({ value: t.amount, label: t.month }));
  const barChartData = categories.map((cat) => ({
    value: cat.amount,
    label: cat.name.split(" ")[0], // Shorten labels
    color: cat.color,
  }));

  // Honest, real-data insights: the largest spending category's real share, and the
  // month-over-month change in the real expense trend. Both are arithmetic facts about
  // the fetched data — nothing is fabricated. Categories arrive sorted by amount desc
  // (financial-service.calculateSpendingByCategory), so categories[0] is the largest.
  const buildInsights = (): string[] => {
    const out: string[] = [];
    if (categories.length > 0) {
      const top = categories[0];
      out.push(
        `${top.name} is your top category — ${top.percentage.toFixed(0)}% of spending (${money(top.amount)})`,
      );
    }
    if (trends.length >= 2) {
      const delta = trends[trends.length - 1].amount - trends[trends.length - 2].amount;
      if (delta > 0) {
        out.push(`Spending rose ${money(delta)} vs last month`);
      } else if (delta < 0) {
        out.push(`Spending fell ${money(-delta)} vs last month`);
      } else {
        out.push("Spending held steady vs last month");
      }
    }
    return out;
  };
  const insights = buildInsights();

  const hasData = categories.length > 0 || trends.length > 0;

  if (loading && !hasData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-spending-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Analyzing spending patterns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !hasData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-spending-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSpendingData}>
            <Text style={styles.retryText}>Try Again</Text>
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
            <Text style={styles.subtitle}>Last 30 days</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/insights")}>
            <Ionicons
              name="bulb-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {!hasData ? (
          <View style={styles.emptyCard} testID="financial-spending-empty">
            <Ionicons
              name="pie-chart-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No spending yet</Text>
            <Text style={styles.emptyText}>
              Once Fynvita sees spending from your linked accounts, your category
              breakdown and monthly trend will show here.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total Spent</Text>
                <Text style={styles.statValue}>{money(totalSpent)}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Avg/Month</Text>
                <Text style={styles.statValue}>{money(avgMonthly)}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Categories</Text>
                <Text style={styles.statValue}>{categories.length}</Text>
              </Card>
            </View>

            {categories.length > 0 && (
              <>
                {/* Chart View Toggle */}
                <View style={styles.chartToggle}>
                  <TouchableOpacity
                    testID="spending-toggle-pie"
                    style={[
                      styles.toggleButton,
                      chartView === "pie" && styles.toggleButtonActive,
                    ]}
                    onPress={() => setChartView("pie")}
                  >
                    <Ionicons
                      name="pie-chart"
                      size={18}
                      color={
                        chartView === "pie" ? "#fff" : theme.colors.textSecondary
                      }
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
                    testID="spending-toggle-bar"
                    style={[
                      styles.toggleButton,
                      chartView === "bar" && styles.toggleButtonActive,
                    ]}
                    onPress={() => setChartView("bar")}
                  >
                    <Ionicons
                      name="bar-chart"
                      size={18}
                      color={
                        chartView === "bar" ? "#fff" : theme.colors.textSecondary
                      }
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
                  {categories.map((category, i) => (
                    <Card key={i} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: `${category.color}20` },
                          ]}
                        >
                          <Ionicons
                            name={
                              category.icon as keyof typeof Ionicons.glyphMap
                            }
                            size={18}
                            color={category.color}
                          />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>
                            {category.name}
                          </Text>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(category.percentage, 100)}%`,
                                  backgroundColor: category.color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.categoryAmounts}>
                          <Text style={styles.spentAmount}>
                            {money(category.amount)}
                          </Text>
                          <Text style={styles.categoryShare}>
                            {category.percentage.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>

                {/* Insights derived from the real category + trend data */}
                <Card style={styles.insightsCard}>
                  <View style={styles.insightsHeader}>
                    <Ionicons name="bulb" size={20} color="#F59E0B" />
                    <Text style={styles.sectionTitle}> Spending Insights</Text>
                  </View>
                  {insights.map((text, i) => (
                    <Text key={i} style={styles.insightText}>
                      • {text}
                    </Text>
                  ))}
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
              </>
            )}

            {trends.length > 0 && (
              /* Monthly Trend Chart */
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
                  <Text style={styles.avgValue}>{money(avgMonthly)}</Text>
                </View>
              </Card>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
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
  stateText: {
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
  emptyCard: {
    alignItems: "center",
    padding: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
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
  categoryShare: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
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
