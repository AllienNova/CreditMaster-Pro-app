/**
 * Spending Dashboard.
 *
 * WHAT THIS SCREEN SHOWED ABOUT THE READER'S OWN MONEY.
 *
 * `mockCategories`, `mockMonthlyTrend` and `mockBudgets` gave everyone the same
 * spending: a category breakdown with per-category trends, six months of
 * history, and budgets with amounts already spent against them. `loadData`
 * waited 800 ms on a `setTimeout` first, so it looked like the figures had been
 * fetched.
 *
 * It is reachable — `src/navigation/primary-nav.ts:59` links it and
 * `src/components/financial/SpendingOverview.tsx:182` pushes to it — so this
 * was live, not dead code.
 *
 * WHAT IT READS NOW, all of it already built and used by app/financial/
 * spending.tsx:
 *
 *   financialOverviewApi.getSpendingAnalysis(range)
 *     -> POST /api/financial/spending/analyze -> the caller's real Plaid
 *        transactions: totalSpending, transactionCount, dailyAverage, and
 *        per-category amount / share / period-over-period trend
 *   financialOverviewApi.getCashFlowAnalysis(6)
 *     -> GET /api/financial/spending/cashflow -> each month's real expenses
 *   budgetApi.getAll()
 *     -> GET /api/financial/budgets -> each budget's own category, limit, spent
 *
 * THE DAILY AVERAGE WAS ALSO WRONG BEFORE THE MOCKS. It divided by a hardcoded
 * `daysInMonth = 31` — wrong for seven months of the year, and wrong for every
 * period other than "month" even though the screen has week/month/year filters.
 * The endpoint returns a real `dailyAverage`, so nothing is re-derived here.
 *
 * The period filter now reaches the request instead of only re-labelling the
 * same numbers.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { DonutChart } from "../../src/components/charts";
import { LineChart } from "../../src/components/charts";
// From the declaring module rather than the barrel, matching the sibling
// screen app/financial/spending.tsx — the barrel does not re-export
// SpendingAnalysisRange, and a locally restated request shape is how callers
// drift from the route they call.
import {
  financialOverviewApi,
  budgetApi,
  type SpendingAnalysisRange,
} from "../../src/services/api/financial";

/** Months of history the trend chart asks the cash-flow endpoint for. */
const TREND_MONTHS = 6;

interface SpendingTotals {
  totalSpending: number;
  transactionCount: number;
  dailyAverage: number;
}

/**
 * The screen's week/month/year filter as the date range the analyze endpoint
 * takes. Previously the filter changed a label and nothing else — the same
 * hardcoded figures were shown for all three.
 */
function rangeFor(period: "week" | "month" | "year"): SpendingAnalysisRange {
  const end = new Date();
  const start = new Date(end);
  if (period === "week") start.setDate(start.getDate() - 7);
  else if (period === "year") start.setFullYear(start.getFullYear() - 1);
  else start.setMonth(start.getMonth() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

// Category colors for spending
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#22C55E",
  Shopping: "#3B82F6",
  Transportation: "#F59E0B",
  Entertainment: "#EC4899",
  "Bills & Utilities": "#EF4444",
  "Health & Fitness": "#8B5CF6",
  Travel: "#06B6D4",
  Education: "#84CC16",
  "Personal Care": "#F97316",
  Groceries: "#10B981",
  "Gas & Fuel": "#6366F1",
  Home: "#14B8A6",
  Other: "#9CA3AF",
};

interface SpendingCategory {
  label: string;
  value: number;
  color: string;
  transactionCount: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

interface MonthlySpending {
  label: string;
  value: number;
}

interface BudgetItem {
  category: string;
  spent: number;
  budget: number;
}


function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") {
    return <Ionicons name="trending-up" size={16} color={theme.colors.error} />;
  }
  if (trend === "down") {
    return (
      <Ionicons name="trending-down" size={16} color={theme.colors.success} />
    );
  }
  return (
    <Ionicons name="remove" size={16} color={theme.colors.textSecondary} />
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
    </View>
  );
}

function BudgetProgress({ item }: { item: BudgetItem }) {
  const percentage = Math.min((item.spent / item.budget) * 100, 100);
  const isOverBudget = item.spent > item.budget;

  return (
    <View style={styles.budgetItem}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetCategory}>{item.category}</Text>
        <Text style={[styles.budgetAmount, isOverBudget && styles.overBudget]}>
          {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${percentage}%` },
            isOverBudget ? styles.progressOverBudget : styles.progressNormal,
          ]}
        />
      </View>
    </View>
  );
}

function CategoryItem({
  category,
  onPress,
}: {
  category: SpendingCategory;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryLeft}>
        <View
          style={[styles.categoryDot, { backgroundColor: category.color }]}
        />
        <View>
          <Text style={styles.categoryName}>{category.label}</Text>
          <Text style={styles.transactionCount}>
            {category.transactionCount} transactions
          </Text>
        </View>
      </View>
      <View style={styles.categoryRight}>
        <Text style={styles.categoryValue}>
          {formatCurrency(category.value)}
        </Text>
        <View style={styles.trendContainer}>
          <TrendIcon trend={category.trend} />
          <Text
            style={[
              styles.trendText,
              category.trend === "up" && styles.trendUp,
              category.trend === "down" && styles.trendDown,
            ]}
          >
            {category.changePercent}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SpendingScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "year"
  >("month");
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlySpending[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [totals, setTotals] = useState<SpendingTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The endpoint returns these; they are not re-derived here. The previous
  // daily average divided by a hardcoded `daysInMonth = 31`, which is wrong for
  // seven months of the year and wrong for every period other than "month".
  const totalSpending = totals?.totalSpending ?? 0;
  const transactionCount = totals?.transactionCount ?? 0;
  const dailyAverage = Math.round(totals?.dailyAverage ?? 0);

  const donutData = categories.map((cat) => ({
    value: cat.value,
    label: cat.label,
    color: cat.color,
  }));

  const loadData = useCallback(async () => {
    setError(null);

    const [analysis, cashFlow, budgetRes] = await Promise.all([
      financialOverviewApi.getSpendingAnalysis(rangeFor(selectedPeriod)),
      financialOverviewApi.getCashFlowAnalysis(TREND_MONTHS),
      budgetApi.getAll(),
    ]);

    if (analysis.success && analysis.data) {
      setTotals({
        totalSpending: analysis.data.totalSpending,
        transactionCount: analysis.data.transactionCount,
        dailyAverage: analysis.data.dailyAverage,
      });
      setCategories(
        analysis.data.categories.map((category) => ({
          label: category.name,
          value: category.amount,
          color: CATEGORY_COLORS[category.name] ?? CATEGORY_COLORS.Other,
          transactionCount: category.transactionCount,
          trend: category.trend,
          changePercent: category.trendPercent,
        })),
      );
    } else {
      setTotals(null);
      setCategories([]);
    }

    // Each month's real EXPENSES. The cash-flow endpoint also carries income;
    // this chart is spending, so income is not folded in to make a nicer line.
    setMonthlyTrend(
      cashFlow.success && cashFlow.data
        ? cashFlow.data.months.map((point) => ({
            label: point.month,
            value: point.expenses,
          }))
        : [],
    );

    setBudgets(
      budgetRes.success && Array.isArray(budgetRes.data?.budgets)
        ? budgetRes.data.budgets.map((budget) => ({
            category: budget.category,
            spent: budget.spent,
            budget: budget.limit,
          }))
        : [],
    );

    if (!analysis.success && !cashFlow.success && !budgetRes.success) {
      setError(
        "We could not load your spending. Nothing is estimated in its place — pull to refresh in a moment.",
      );
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCategoryPress = (category: SpendingCategory) => {
    router.push({
      pathname: "/financial/transactions",
      params: { category: category.label },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading spending data...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Spending",
          // This screen configured a header — title, styling, on
          // subscriptions even a headerRight button — but never set
          // headerShown, so app/dashboard/_layout.tsx's `false` won and
          // NONE of it rendered. Turning it on makes the declared intent
          // real and gives a pushed screen its back button.
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTitle}>Spending is unavailable</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        )}

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(["week", "month", "year"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard
            title="Total Spent"
            value={formatCurrency(totalSpending)}
            subtitle="This month"
            icon="wallet"
            iconColor={theme.colors.primary}
          />
          <SummaryCard
            title="Daily Avg"
            value={formatCurrency(dailyAverage)}
            icon="calendar"
            iconColor={theme.colors.success}
          />
          <SummaryCard
            title="Transactions"
            value={transactionCount.toString()}
            icon="receipt"
            iconColor={theme.colors.warning}
          />
        </View>

        {/* Donut Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <View style={styles.chartContainer}>
            <DonutChart
              data={donutData}
              size={220}
              strokeWidth={40}
              showLegend={false}
              showPercentages={true}
              centerValue={formatCurrency(totalSpending)}
              centerLabel="Total"
              currency={true}
            />
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          <View style={styles.trendChartContainer}>
            <LineChart
              data={monthlyTrend}
              height={180}
              showGrid={true}
              showDots={true}
              showValues={true}
              currency={true}
              lineColor={theme.colors.primary}
              gradientFrom={`${theme.colors.primary}40`}
              gradientTo={`${theme.colors.primary}05`}
            />
          </View>
        </View>

        {/* Budget vs Actual */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget vs Actual</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>Edit Budgets</Text>
            </TouchableOpacity>
          </View>
          {budgets.map((item, index) => (
            <BudgetProgress key={index} item={item} />
          ))}
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Categories</Text>
          {categories.map((category, index) => (
            <CategoryItem
              key={index}
              category={category}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorTitle: {
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 13,
    color: "#92400E",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  summaryTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  summarySubtitle: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
  },
  seeAllLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  trendChartContainer: {
    marginTop: 8,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  budgetAmount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  overBudget: {
    color: theme.colors.error,
  },
  progressContainer: {
    height: 8,
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressNormal: {
    backgroundColor: theme.colors.primary,
  },
  progressOverBudget: {
    backgroundColor: theme.colors.error,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  transactionCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: "flex-end",
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  trendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  trendUp: {
    color: theme.colors.error,
  },
  trendDown: {
    color: theme.colors.success,
  },
});
