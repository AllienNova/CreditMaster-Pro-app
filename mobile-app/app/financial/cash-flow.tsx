/**
 * Fynvita Cash Flow Analysis Screen
 *
 * Real-data wiring (PARITY-P2): renders 6 months of the user's real income vs
 * expenses from GET /api/financial/spending/cashflow (withAuth) via
 * financialOverviewApi.getCashFlowAnalysis, adapted web -> mobile by mapWebCashFlow
 * (CashFlowMonthPoint: month / income / expenses). Each month is derived server-side
 * from the user's real Plaid transactions. Fetch on mount with honest inline
 * loading / error+retry / empty states and pull-to-refresh.
 *
 * The former hardcoded MOCK_DATA array and its silent catch-fallback were removed:
 * on a failed fetch the screen shows an honest error + retry, never fabricated
 * figures. The hardcoded "Cash Flow Tips" (which asserted "Your savings rate is
 * healthy" regardless of the data) were replaced with the route's real
 * `recommendations`; when the source returns none, the tips card is omitted rather
 * than invented.
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
import { LineChart } from "../../src/components/charts";
import { financialOverviewApi } from "../../src/services/api/financial";
import { toArray } from "../../src/store/toArray";

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
}

const { width: screenWidth } = Dimensions.get("window");

export default function CashFlowScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CashFlowData[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  const fetchCashFlow = useCallback(async () => {
    const response = await financialOverviewApi.getCashFlowAnalysis(6);
    if (response.success && response.data) {
      setData(toArray<CashFlowData>(response?.data?.months));
      setRecommendations(toArray<string>(response?.data?.recommendations));
      setError(null);
    } else {
      setError(response.error?.message ?? "Unable to load cash flow.");
    }
  }, []);

  const loadCashFlowData = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchCashFlow();
    } finally {
      setLoading(false);
    }
  }, [fetchCashFlow]);

  useEffect(() => {
    loadCashFlowData();
  }, [loadCashFlowData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCashFlow();
    setRefreshing(false);
  };

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;
  const avgSavingsRate =
    totalIncome > 0
      ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)
      : "0";

  // Prepare chart data
  const incomeChartData = data.map((d) => ({
    value: d.income,
    label: d.month,
  }));
  const expenseChartData = data.map((d) => ({
    value: d.expenses,
    label: d.month,
  }));
  // Scale the manual bars by the actual largest monthly flow (the old hardcoded
  // 6500 divisor assumed mock magnitudes and clipped real income/expenses).
  const maxFlow = Math.max(
    1,
    ...data.map((d) => Math.max(d.income, d.expenses)),
  );

  if (loading && data.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-cash-flow-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Analyzing cash flow...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && data.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-cash-flow-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadCashFlowData}
          >
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
            <Text style={styles.title}>Cash Flow Analysis</Text>
            <Text style={styles.subtitle}>Income vs Expenses</Text>
          </View>
        </View>

        {data.length === 0 ? (
          <View style={styles.emptyCard} testID="financial-cash-flow-empty">
            <Ionicons
              name="bar-chart-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No cash flow yet</Text>
            <Text style={styles.emptyText}>
              Once Fynvita has income and spending from your linked accounts,
              your monthly cash flow will show here.
            </Text>
          </View>
        ) : (
          <>
        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: "#22C55E10" }]}>
            <Ionicons name="arrow-down-circle" size={24} color="#22C55E" />
            <Text style={[styles.statValue, { color: "#22C55E" }]}>
              ${(totalIncome / 1000).toFixed(1)}K
            </Text>
            <Text style={styles.statLabel}>Total Income</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: "#EF444410" }]}>
            <Ionicons name="arrow-up-circle" size={24} color="#EF4444" />
            <Text style={[styles.statValue, { color: "#EF4444" }]}>
              ${(totalExpenses / 1000).toFixed(1)}K
            </Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card
            style={[
              styles.statCard,
              { backgroundColor: `${theme.colors.primary}10` },
            ]}
          >
            <Ionicons name="wallet" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              ${(netCashFlow / 1000).toFixed(1)}K
            </Text>
            <Text style={styles.statLabel}>Net Cash Flow</Text>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: "#8B5CF610" }]}>
            <Ionicons name="trending-up" size={24} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: "#8B5CF6" }]}>
              {avgSavingsRate}%
            </Text>
            <Text style={styles.statLabel}>Savings Rate</Text>
          </Card>
        </View>

        {/* Chart Type Toggle */}
        <View style={styles.chartToggle}>
          <TouchableOpacity
            testID="cash-flow-toggle-line"
            style={[
              styles.toggleButton,
              chartType === "line" && styles.toggleButtonActive,
            ]}
            onPress={() => setChartType("line")}
          >
            <Ionicons
              name="analytics"
              size={18}
              color={chartType === "line" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                chartType === "line" && styles.toggleTextActive,
              ]}
            >
              Line
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="cash-flow-toggle-bar"
            style={[
              styles.toggleButton,
              chartType === "bar" && styles.toggleButtonActive,
            ]}
            onPress={() => setChartType("bar")}
          >
            <Ionicons
              name="bar-chart"
              size={18}
              color={chartType === "bar" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                chartType === "bar" && styles.toggleTextActive,
              ]}
            >
              Bar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>
          {chartType === "line" ? (
            <View>
              <LineChart
                data={incomeChartData}
                width={screenWidth - 64}
                height={180}
                color="#22C55E"
                showDots
                showGrid
                formatValue={(v) => `$${(v / 1000).toFixed(1)}K`}
              />
              <View style={{ marginTop: 8 }}>
                <LineChart
                  data={expenseChartData}
                  width={screenWidth - 64}
                  height={120}
                  color="#EF4444"
                  showDots
                  formatValue={(v) => `$${(v / 1000).toFixed(1)}K`}
                />
              </View>
            </View>
          ) : (
            <View>
              {data.map((item, i) => (
                <View key={i} style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{item.month}</Text>
                  <View style={styles.barsContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          styles.incomeBar,
                          { width: `${(item.income / maxFlow) * 100}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          styles.expenseBar,
                          { width: `${(item.expenses / maxFlow) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.netValue,
                      {
                        color:
                          item.income - item.expenses >= 0
                            ? "#22C55E"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {item.income - item.expenses >= 0 ? "+" : ""}$
                    {(item.income - item.expenses).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.error },
                ]}
              />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
          </View>
        </Card>

        {/* Tips — the endpoint's real recommendations; omitted when it returns none */}
        {recommendations.length > 0 && (
          <Card style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color={theme.colors.warning} />
              <Text style={styles.sectionTitle}> Cash Flow Tips</Text>
            </View>
            {recommendations.map((tip, i) => (
              <Text key={i} style={styles.tipText}>
                • {tip}
              </Text>
            ))}
          </Card>
        )}
          </>
        )}
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
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  statValue: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  chartToggle: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
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
    marginVertical: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  monthRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  monthLabel: { width: 40, fontSize: 12, color: theme.colors.textSecondary },
  barsContainer: { flex: 1, marginHorizontal: 8 },
  barWrapper: { height: 8, marginBottom: 4 },
  bar: { height: 8, borderRadius: 4 },
  incomeBar: { backgroundColor: "#22C55E" },
  expenseBar: { backgroundColor: "#EF4444" },
  netValue: { width: 70, fontSize: 12, fontWeight: "600", textAlign: "right" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  tipsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  tipText: { fontSize: 13, color: theme.colors.text, lineHeight: 22 },
});
