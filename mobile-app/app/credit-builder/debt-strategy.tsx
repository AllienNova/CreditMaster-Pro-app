/**
 * Fynvita Debt Strategy Screen (Credit Builder)
 *
 * Real-data wiring (PARITY): renders the user's real debts and a real
 * avalanche-vs-snowball payoff comparison from GET /api/financial/debt?compare=true
 * (withAuth) via debtApi.getDebtPlan, adapted web -> mobile by mapWebDebtPlan — the same
 * proven adapter the sibling Debt Payoff screen (app/financial/debt.tsx) uses. The
 * summary (total debt, average APR) comes from the route's `overview`; each strategy's
 * payoff months + interest saved come from the route's real `comparison`
 * (debtPayoffService), computed server-side for the minimum-payment baseline
 * (extraPayment = 0). The avalanche/snowball toggle stays local — the comparison already
 * carries both strategies, so switching never re-fetches.
 *
 * The former MOCK_DEBTS array and the fabricated avalancheSavings ($1,250) /
 * avalancheMonths (22) / snowballMonths (24) constants were removed. On a failed fetch the
 * screen shows an honest inline error + retry, never fabricated balances or payoff figures;
 * the "Our Recommendation" text now uses the route's real recommendationReason (omitted when
 * the route provides none). Fetch on mount with honest inline loading / error+retry / empty
 * states and pull-to-refresh. Nothing is fabricated.
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { debtApi } from "../../src/services/api/financial";
import type { DebtPlanData } from "../../src/services/api/financial";

type StrategyKey = "avalanche" | "snowball";

export default function DebtStrategyScreen() {
  const [strategy, setStrategy] = useState<StrategyKey>("avalanche");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DebtPlanData | null>(null);

  // extraPayment = 0 → the comparison reflects the minimum-payment baseline. This screen
  // has no extra-payment selector (unlike app/financial/debt.tsx), so the numbers are the
  // honest minimum-payment payoff, never fabricated on the client.
  const fetchPlan = useCallback(async () => {
    const res = await debtApi.getDebtPlan(0);
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load your debt strategy.");
    }
  }, []);

  const loadPlan = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchPlan();
    } finally {
      setLoading(false);
    }
  }, [fetchPlan]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlan();
    setRefreshing(false);
  };

  const overview = data?.overview;
  const debts = data?.debts ?? [];
  const comparison = data?.comparison ?? null;

  const totalDebt = overview?.totalDebt ?? 0;
  const avgApr = overview?.averageInterestRate ?? 0;

  const sortedDebts =
    strategy === "avalanche"
      ? [...debts].sort((a, b) => b.interestRate - a.interestRate)
      : [...debts].sort((a, b) => a.balance - b.balance);

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-builder-debt-strategy-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading debt strategy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="credit-builder-debt-strategy-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlan}>
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
          <Text style={styles.title}>Debt Strategy</Text>
          <View style={{ width: 24 }} />
        </View>

        {debts.length === 0 ? (
          <View style={styles.emptyCard} testID="credit-builder-debt-strategy-empty">
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No debts tracked yet</Text>
            <Text style={styles.emptyText}>
              Add a credit card, loan, or other debt to compare the avalanche and
              snowball payoff strategies.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Debt</Text>
              <Text style={styles.summaryValue}>
                ${totalDebt.toLocaleString()}
              </Text>
              <Text style={styles.summarySubtext}>
                Avg APR: {avgApr.toFixed(1)}%
              </Text>
            </Card>

            {/* Strategy Toggle */}
            <View style={styles.strategyToggle}>
              <TouchableOpacity
                testID="credit-builder-strategy-avalanche"
                style={[
                  styles.strategyButton,
                  strategy === "avalanche" && styles.strategyButtonActive,
                ]}
                onPress={() => setStrategy("avalanche")}
              >
                <Ionicons
                  name="trending-down"
                  size={20}
                  color={
                    strategy === "avalanche" ? "#fff" : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.strategyButtonText,
                    strategy === "avalanche" && styles.strategyButtonTextActive,
                  ]}
                >
                  Avalanche
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="credit-builder-strategy-snowball"
                style={[
                  styles.strategyButton,
                  strategy === "snowball" && styles.strategyButtonActive,
                ]}
                onPress={() => setStrategy("snowball")}
              >
                <Ionicons
                  name="snow"
                  size={20}
                  color={
                    strategy === "snowball" ? "#fff" : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.strategyButtonText,
                    strategy === "snowball" && styles.strategyButtonTextActive,
                  ]}
                >
                  Snowball
                </Text>
              </TouchableOpacity>
            </View>

            {/* Strategy Explanation */}
            <Card style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Ionicons
                  name={strategy === "avalanche" ? "trending-down" : "snow"}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.explanationTitle}>
                  {strategy === "avalanche" ? "Debt Avalanche" : "Debt Snowball"}
                </Text>
              </View>
              <Text style={styles.explanationText}>
                {strategy === "avalanche"
                  ? "Pay off debts with the highest interest rate first. This saves the most money in interest over time."
                  : "Pay off debts with the smallest balance first. This provides quick wins and psychological motivation."}
              </Text>
              {comparison ? (
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>Payoff Time</Text>
                    <Text style={styles.comparisonValue}>
                      {comparison[strategy].totalMonths} months
                    </Text>
                  </View>
                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>Interest Saved</Text>
                    <Text style={[styles.comparisonValue, { color: "#22C55E" }]}>
                      $
                      {Math.round(
                        comparison[strategy].interestSaved,
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  style={styles.comparisonUnavailable}
                  testID="credit-builder-debt-strategy-comparison-unavailable"
                >
                  Payoff comparison isn&apos;t available right now. Pull to refresh
                  to try again.
                </Text>
              )}
            </Card>

            {/* Payoff Order */}
            <Text style={styles.sectionTitle}>Payoff Order</Text>
            {sortedDebts.map((debt, idx) => (
              <Card key={debt.id} style={styles.debtCard}>
                <View style={styles.debtRow}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtName}>{debt.name}</Text>
                    <Text style={styles.debtDetails}>
                      {debt.interestRate}% APR • $
                      {debt.minimumPayment.toLocaleString()}/mo min
                    </Text>
                  </View>
                  <View style={styles.debtRight}>
                    <Text style={styles.debtBalance}>
                      ${debt.balance.toLocaleString()}
                    </Text>
                    {idx === 0 && (
                      <Text style={styles.focusLabel}>Focus Here</Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}

            {/* Recommendation — real recommendationReason from the route's comparison */}
            {comparison && comparison.recommendationReason ? (
              <Card style={styles.recommendCard}>
                <Ionicons name="bulb" size={24} color="#F59E0B" />
                <View style={styles.recommendContent}>
                  <Text style={styles.recommendTitle}>Our Recommendation</Text>
                  <Text style={styles.recommendText}>
                    {comparison.recommendationReason}
                  </Text>
                </View>
              </Card>
            ) : null}

            {/* Calculator Link */}
            <TouchableOpacity
              style={styles.calculatorButton}
              onPress={() =>
                router.push("/loans/calculator" as never)
              }
            >
              <Ionicons
                name="calculator"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.calculatorButtonText}>
                Open Payoff Calculator
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </>
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
  summaryCard: { alignItems: "center", marginBottom: theme.spacing.md },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 36, fontWeight: "700", color: theme.colors.text },
  summarySubtext: { fontSize: 14, color: theme.colors.textSecondary },
  strategyToggle: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  strategyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  strategyButtonActive: { backgroundColor: theme.colors.primary },
  strategyButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  strategyButtonTextActive: { color: "#fff" },
  explanationCard: { marginBottom: theme.spacing.lg },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginLeft: 10,
  },
  explanationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  comparisonItem: { alignItems: "center" },
  comparisonLabel: { fontSize: 12, color: theme.colors.textSecondary },
  comparisonValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  comparisonUnavailable: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  debtCard: { marginBottom: theme.spacing.sm },
  debtRow: { flexDirection: "row", alignItems: "center" },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  debtDetails: { fontSize: 12, color: theme.colors.textSecondary },
  debtRight: { alignItems: "flex-end" },
  debtBalance: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  focusLabel: {
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "500",
    marginTop: 2,
  },
  recommendCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: theme.spacing.md,
    backgroundColor: "#FEF3C720",
  },
  recommendContent: { flex: 1, marginLeft: 12 },
  recommendTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  recommendText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  calculatorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
  },
  calculatorButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.primary,
    marginHorizontal: 8,
  },
});
