/**
 * Fynvita Insights > Spending Analysis Screen
 *
 * Real-data wiring (PARITY): renders the user's real spending analysis — category
 * breakdown, detected patterns, and recommendations — from POST
 * /api/financial/spending/analyze (withPermission "financial:read") ->
 * spendingAnalysisService.analyzeSpending, a DETERMINISTIC (no-LLM) analysis of the
 * user's real Plaid transactions, via financialOverviewApi.getSpendingAnalysis and the
 * mapWebSpendingAnalysis adapter (services/api/financial.ts). The 7d/30d/90d filter is
 * sent as the analyze date range and refetches on change.
 *
 * The screen previously rendered a hardcoded MOCK_ANALYSIS (invented totals,
 * categories, an overall "risk score", per-category budgets, a monthly projection, and
 * pattern/recommendation copy) behind a fake setTimeout, so every user saw the same
 * fabricated figures. That mock and the fake load are removed. Fields the endpoint does
 * not provide are omitted rather than faked: the overall risk-score card, the
 * monthly-projection subtext, and the per-category budget overlay are gone (budget
 * tracking lives on app/financial/budgets.tsx). Each category's trend badge now
 * reflects the REAL period-over-period change; on a failed fetch the screen shows an
 * honest error + retry, never fabricated data.
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { financialOverviewApi } from "../../src/services/api/financial";
import type {
  SpendingAnalysisData,
  SpendingPatternKind,
  SpendingSeverity,
} from "../../src/services/api/financial";

type Period = "7d" | "30d" | "90d";
const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90 };
const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
};

// Icons/colors are pure presentation — the display name comes from the real payload.
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Housing: "home",
  Utilities: "flash",
  Groceries: "cart",
  Transportation: "car",
  Insurance: "shield-checkmark",
  Healthcare: "medical",
  "Debt Payments": "card",
  "Dining Out": "restaurant",
  Entertainment: "film",
  Shopping: "bag",
  "Personal Care": "person",
  Fitness: "barbell",
  Subscriptions: "repeat",
  Savings: "wallet",
  Investments: "trending-up",
  Travel: "airplane",
  Other: "ellipsis-horizontal",
};

const CATEGORY_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#6366F1",
  "#F97316",
  "#9CA3AF",
];

const PATTERN_ICONS: Record<
  SpendingPatternKind,
  keyof typeof Ionicons.glyphMap
> = {
  anomaly: "alert-circle",
  trend: "trending-up",
  recurring: "repeat",
  opportunity: "bulb",
};
const PATTERN_COLORS: Record<SpendingPatternKind, string> = {
  anomaly: "#EF4444",
  trend: "#F59E0B",
  recurring: "#3B82F6",
  opportunity: "#22C55E",
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

function rangeForPeriod(period: Period): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - PERIOD_DAYS[period]);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function severityBadge(severity: SpendingSeverity) {
  switch (severity) {
    case "high":
      return { bg: "#FEE2E2", text: "#DC2626" };
    case "medium":
      return { bg: "#FEF3C7", text: "#D97706" };
    default:
      return { bg: "#D1FAE5", text: "#059669" };
  }
}

export default function SpendingAnalysisScreen() {
  const [analysis, setAnalysis] = useState<SpendingAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30d");

  const fetchAnalysis = useCallback(async () => {
    const res = await financialOverviewApi.getSpendingAnalysis(
      rangeForPeriod(period),
    );
    if (res.success && res.data) {
      setAnalysis(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load spending analysis.");
    }
  }, [period]);

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchAnalysis();
    } finally {
      setLoading(false);
    }
  }, [fetchAnalysis]);

  // Fetch on mount and whenever the period filter changes (fetchAnalysis depends on it).
  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalysis();
    setRefreshing(false);
  };

  const hasData =
    !!analysis &&
    (analysis.categories.length > 0 || analysis.patterns.length > 0);

  if (loading && !analysis) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="insights-spending-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Analyzing your spending...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !analysis) {
    return (
      <ScreenError
        title="Spending Analysis"
        message={error}
        onRetry={loadAnalysis}
        testID="insights-spending-error"
      />
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
          <Text style={styles.title}>Spending Analysis</Text>
          <TouchableOpacity
            onPress={() => router.push("/financial/transactions" as never)}
          >
            <Ionicons
              name="list-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Period Filter */}
        <View style={styles.periodFilter}>
          {(["7d", "30d", "90d"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              testID={`spending-period-${p}`}
              style={[
                styles.periodChip,
                period === p && styles.periodChipActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === p && styles.periodTextActive,
                ]}
              >
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!hasData ? (
          <View style={styles.emptyCard} testID="insights-spending-empty">
            <Ionicons
              name="pie-chart-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No spending yet</Text>
            <Text style={styles.emptyText}>
              Once Fynvita sees spending from your linked accounts, your category
              breakdown and detected patterns will show here.
            </Text>
          </View>
        ) : (
          analysis && (
            <>
              {/* Overview Cards — every value is real; the mock's risk-score card and
                  monthly-projection subtext were removed (no source). */}
              <View style={styles.overviewGrid}>
                <Card style={styles.overviewCard}>
                  <Text style={styles.overviewLabel}>Total Spent</Text>
                  <Text style={styles.overviewValue}>
                    {money(analysis.totalSpending)}
                  </Text>
                  <View style={styles.overviewTrend}>
                    <Ionicons
                      name={
                        analysis.comparedToLastPeriod >= 0
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={14}
                      color={
                        analysis.comparedToLastPeriod >= 0
                          ? "#EF4444"
                          : "#22C55E"
                      }
                    />
                    <Text
                      style={[
                        styles.overviewTrendText,
                        {
                          color:
                            analysis.comparedToLastPeriod >= 0
                              ? "#EF4444"
                              : "#22C55E",
                        },
                      ]}
                    >
                      {analysis.comparedToLastPeriod >= 0 ? "+" : ""}
                      {analysis.comparedToLastPeriod.toFixed(1)}% vs prev
                    </Text>
                  </View>
                </Card>

                <Card style={styles.overviewCard}>
                  <Text style={styles.overviewLabel}>Transactions</Text>
                  <Text style={styles.overviewValue}>
                    {analysis.transactionCount}
                  </Text>
                  <Text style={styles.overviewSubtext}>
                    Avg: {money(analysis.averageTransaction)}
                  </Text>
                </Card>

                <Card style={styles.overviewCard}>
                  <Text style={styles.overviewLabel}>Daily Average</Text>
                  <Text style={styles.overviewValue}>
                    {money(analysis.dailyAverage)}
                  </Text>
                  <Text style={styles.overviewSubtext}>
                    over {PERIOD_LABELS[period].toLowerCase()}
                  </Text>
                </Card>
              </View>

              {/* Spending by Category */}
              {analysis.categories.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Spending by Category</Text>
                  <Card style={styles.categoryCard}>
                    {analysis.categories.map((cat, i) => (
                      <View key={cat.name} style={styles.categoryRow}>
                        <View
                          style={[
                            styles.categoryIcon,
                            {
                              backgroundColor: `${
                                CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                              }20`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={CATEGORY_ICONS[cat.name] ?? "pricetag"}
                            size={20}
                            color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                          />
                        </View>
                        <View style={styles.categoryContent}>
                          <View style={styles.categoryHeader}>
                            <Text style={styles.categoryName}>{cat.name}</Text>
                            <View style={styles.categoryAmountRow}>
                              <Text style={styles.categoryAmount}>
                                {money(cat.amount)}
                              </Text>
                              <View
                                style={[
                                  styles.trendBadge,
                                  {
                                    backgroundColor:
                                      cat.trend === "down"
                                        ? "#D1FAE5"
                                        : cat.trend === "up"
                                          ? "#FEE2E2"
                                          : "#F3F4F6",
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    cat.trend === "up"
                                      ? "arrow-up"
                                      : cat.trend === "down"
                                        ? "arrow-down"
                                        : "remove"
                                  }
                                  size={10}
                                  color={
                                    cat.trend === "down"
                                      ? "#22C55E"
                                      : cat.trend === "up"
                                        ? "#EF4444"
                                        : "#6B7280"
                                  }
                                />
                                {cat.trend !== "stable" && (
                                  <Text
                                    style={[
                                      styles.trendText,
                                      {
                                        color:
                                          cat.trend === "down"
                                            ? "#22C55E"
                                            : "#EF4444",
                                      },
                                    ]}
                                  >
                                    {cat.trendPercent}%
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.min(cat.percentOfTotal, 100)}%`,
                                    backgroundColor:
                                      CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.percentText}>
                              {cat.percentOfTotal.toFixed(0)}%
                            </Text>
                          </View>
                          <Text style={styles.categoryMeta}>
                            {cat.transactionCount} transaction
                            {cat.transactionCount === 1 ? "" : "s"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {/* Detected Patterns */}
              {analysis.patterns.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Detected Patterns</Text>
                  {analysis.patterns.map((pattern) => {
                    const badge = severityBadge(pattern.severity);
                    return (
                      <Card key={pattern.id} style={styles.patternCard}>
                        <View style={styles.patternHeader}>
                          <View
                            style={[
                              styles.patternIcon,
                              {
                                backgroundColor: `${PATTERN_COLORS[pattern.kind]}15`,
                              },
                            ]}
                          >
                            <Ionicons
                              name={PATTERN_ICONS[pattern.kind]}
                              size={20}
                              color={PATTERN_COLORS[pattern.kind]}
                            />
                          </View>
                          <View style={styles.patternContent}>
                            <View style={styles.patternTitleRow}>
                              <Text style={styles.patternTitle}>
                                {pattern.title}
                              </Text>
                              <View
                                style={[
                                  styles.severityBadge,
                                  { backgroundColor: badge.bg },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.severityText,
                                    { color: badge.text },
                                  ]}
                                >
                                  {pattern.severity}
                                </Text>
                              </View>
                            </View>
                            {pattern.description.length > 0 && (
                              <Text style={styles.patternDescription}>
                                {pattern.description}
                              </Text>
                            )}
                            <Text
                              style={[
                                styles.patternImpact,
                                { color: PATTERN_COLORS[pattern.kind] },
                              ]}
                            >
                              {pattern.impact}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                  <Card style={styles.recommendationsCard}>
                    {analysis.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#22C55E"
                        />
                        <Text style={styles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/financial/budgets" as never)}
              >
                <Ionicons name="settings" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Adjust Budgets</Text>
              </TouchableOpacity>
            </>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
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
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  periodFilter: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  periodChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 4,
  },
  periodChipActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  periodTextActive: { color: "#fff" },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: theme.spacing.lg,
  },
  overviewCard: {
    width: "47%",
    marginHorizontal: "1.5%",
    marginBottom: 12,
    padding: theme.spacing.md,
  },
  overviewLabel: { fontSize: 12, color: theme.colors.textSecondary },
  overviewValue: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  overviewTrend: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  overviewTrendText: { fontSize: 12, fontWeight: "500", marginLeft: 2 },
  overviewSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoryCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.md },
  categoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryContent: { flex: 1 },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  categoryName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  categoryAmountRow: { flexDirection: "row", alignItems: "center" },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginRight: 8,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: { fontSize: 10, fontWeight: "600", marginLeft: 2 },
  progressContainer: { flexDirection: "row", alignItems: "center" },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  percentText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    width: 32,
  },
  categoryMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  patternCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  patternHeader: { flexDirection: "row" },
  patternIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patternContent: { flex: 1 },
  patternTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  patternTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  severityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  patternDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  patternImpact: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  recommendationsCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});
