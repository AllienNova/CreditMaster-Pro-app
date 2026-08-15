/**
 * Fynvita Debt Payoff Screen
 *
 * Real-data wiring (PARITY): renders the user's real debts, a debt summary, and a real
 * avalanche-vs-snowball payoff comparison from GET /api/financial/debt?compare=true
 * (withAuth) via debtApi.getDebtPlan, adapted web -> mobile by mapWebDebtPlan. The
 * summary (total debt, minimum payments, average APR, account count) comes from the
 * route's `overview`; the two strategy cards' interest + months come from the route's
 * real `comparison` (debtPayoffService), recomputed server-side for the selected extra
 * monthly payment. Fetch on mount with honest inline loading / error+retry / empty
 * states and pull-to-refresh.
 *
 * The former MOCK_DEBTS array, the fabricated STRATEGIES object (hardcoded
 * totalInterest / payoffMonths), the invented "Save $X in interest" heuristic, and the
 * silent catch-fallback were all removed: on a failed fetch the screen shows an honest
 * error + retry, never fabricated balances or payoff figures. The interest-saved line
 * now shows the route's real `interestSaved` for the chosen extra payment.
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
import { debtApi } from "../../src/services/api/financial";
import type {
  DebtPlanData,
  DebtAccountType,
} from "../../src/services/api/financial";

type StrategyKey = "avalanche" | "snowball";

// Display-only labels and icons for each strategy. The financial numbers (interest,
// months, savings) come from the route's real comparison — never invented here.
const STRATEGY_META: Record<
  StrategyKey,
  { name: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  avalanche: {
    name: "Avalanche",
    description: "Pay highest interest first",
    icon: "trending-down",
  },
  snowball: {
    name: "Snowball",
    description: "Pay smallest balance first",
    icon: "snow",
  },
};

const EXTRA_PAYMENT_OPTIONS = [0, 100, 200, 300, 500];

function getDebtIcon(type: DebtAccountType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "credit_card":
      return "card";
    case "student_loan":
      return "school";
    case "auto_loan":
      return "car";
    case "mortgage":
      return "home";
    case "medical":
      return "medkit";
    case "personal_loan":
      return "cash";
    default:
      return "wallet";
  }
}

export default function DebtScreen() {
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyKey>("avalanche");
  const [extraPayment, setExtraPayment] = useState(200);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DebtPlanData | null>(null);

  const fetchPlan = useCallback(async () => {
    const res = await debtApi.getDebtPlan(extraPayment);
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load your debt plan.");
    }
  }, [extraPayment]);

  // Runs on mount and whenever the extra payment changes (the comparison's real
  // interest/months/savings are recomputed server-side for that extra payment). Once
  // data exists, the full-screen loader is suppressed so slider changes update in place.
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
  const totalMinPayment = overview?.totalMinimumPayments ?? 0;
  const avgApr = overview?.averageInterestRate ?? 0;
  const accountCount = overview?.debtCount ?? debts.length;

  const sortedDebts =
    selectedStrategy === "avalanche"
      ? [...debts].sort((a, b) => b.interestRate - a.interestRate)
      : [...debts].sort((a, b) => a.balance - b.balance);

  const selectedMetrics = comparison ? comparison[selectedStrategy] : null;

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-debt-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading debt overview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-debt-error">
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
          <Text style={styles.title}>Debt Payoff</Text>
          <TouchableOpacity
            onPress={() => router.push("/financial/add-debt" as Href)}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {debts.length === 0 ? (
          <View style={styles.emptyCard} testID="financial-debt-empty">
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No debts tracked yet</Text>
            <Text style={styles.emptyText}>
              Add a credit card, loan, or other debt to see your payoff plan and
              compare avalanche vs snowball strategies.
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
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>Min Payment</Text>
                  <Text style={styles.statValue}>
                    ${totalMinPayment.toLocaleString()}/mo
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>Avg APR</Text>
                  <Text style={styles.statValue}>{avgApr.toFixed(1)}%</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.statLabel}>Accounts</Text>
                  <Text style={styles.statValue}>{accountCount}</Text>
                </View>
              </View>
            </Card>

            {/* Strategy Selector */}
            <Text style={styles.sectionTitle}>Payoff Strategy</Text>
            {comparison ? (
              <View style={styles.strategyContainer}>
                {(["avalanche", "snowball"] as StrategyKey[]).map((key) => {
                  const meta = STRATEGY_META[key];
                  const metrics = comparison[key];
                  const isSelected = selectedStrategy === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      testID={`debt-strategy-${key}`}
                      style={[
                        styles.strategyCard,
                        isSelected && styles.strategyCardActive,
                      ]}
                      onPress={() => setSelectedStrategy(key)}
                    >
                      <View
                        style={[
                          styles.strategyIcon,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon}
                          size={24}
                          color={
                            isSelected ? "#fff" : theme.colors.textSecondary
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.strategyName,
                          isSelected && styles.strategyNameActive,
                        ]}
                      >
                        {meta.name}
                      </Text>
                      <Text style={styles.strategyDescription}>
                        {meta.description}
                      </Text>
                      <View style={styles.strategyStats}>
                        <View style={styles.strategyStat}>
                          <Text style={styles.strategyStatLabel}>Interest</Text>
                          <Text
                            style={[
                              styles.strategyStatValue,
                              isSelected && { color: theme.colors.primary },
                            ]}
                          >
                            $
                            {Math.round(
                              metrics.totalInterestPaid,
                            ).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.strategyStat}>
                          <Text style={styles.strategyStatLabel}>Payoff</Text>
                          <Text
                            style={[
                              styles.strategyStatValue,
                              isSelected && { color: theme.colors.primary },
                            ]}
                          >
                            {metrics.totalMonths} mo
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View
                style={styles.strategyUnavailableCard}
                testID="financial-debt-strategy-unavailable"
              >
                <Ionicons
                  name="analytics-outline"
                  size={28}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.strategyUnavailableText}>
                  Strategy comparison isn&apos;t available right now. Pull to
                  refresh to try again.
                </Text>
              </View>
            )}

            {/* Extra Payment Selector */}
            <Card style={styles.extraPaymentCard}>
              <View style={styles.extraPaymentHeader}>
                <Text style={styles.extraPaymentLabel}>
                  Extra Monthly Payment
                </Text>
                <Text style={styles.extraPaymentValue}>${extraPayment}</Text>
              </View>
              <View style={styles.sliderContainer}>
                {EXTRA_PAYMENT_OPTIONS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    testID={`debt-extra-${amount}`}
                    style={[
                      styles.sliderOption,
                      extraPayment === amount && styles.sliderOptionActive,
                    ]}
                    onPress={() => setExtraPayment(amount)}
                  >
                    <Text
                      style={[
                        styles.sliderOptionText,
                        extraPayment === amount &&
                          styles.sliderOptionTextActive,
                      ]}
                    >
                      ${amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedMetrics && selectedMetrics.interestSaved > 0 && (
                <View style={styles.savingsRow}>
                  <Ionicons name="trending-down" size={16} color="#22C55E" />
                  <Text style={styles.savingsText}>
                    {`Save $${Math.round(
                      selectedMetrics.interestSaved,
                    ).toLocaleString()} in interest`}
                  </Text>
                </View>
              )}
            </Card>

            {/* Payoff Order */}
            <Text style={styles.sectionTitle}>
              Payoff Order (
              {selectedStrategy === "avalanche"
                ? "Highest APR First"
                : "Smallest Balance First"}
              )
            </Text>
            {sortedDebts.map((debt, idx) => (
              <Card key={debt.id} style={styles.debtCard}>
                <View style={styles.debtRow}>
                  <View style={styles.debtOrder}>
                    <Text style={styles.debtOrderText}>{idx + 1}</Text>
                  </View>
                  <View
                    style={[
                      styles.debtIcon,
                      { backgroundColor: idx === 0 ? "#DCFCE7" : "#F3F4F6" },
                    ]}
                  >
                    <Ionicons
                      name={getDebtIcon(debt.type)}
                      size={20}
                      color={idx === 0 ? "#22C55E" : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtName}>{debt.name}</Text>
                    <Text style={styles.debtMeta}>
                      {debt.interestRate}% APR • $
                      {debt.minimumPayment.toLocaleString()}/mo min
                    </Text>
                  </View>
                  <Text style={styles.debtBalance}>
                    ${debt.balance.toLocaleString()}
                  </Text>
                </View>
                {idx === 0 && (
                  <View style={styles.focusBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.focusText}>Focus Here</Text>
                  </View>
                )}
              </Card>
            ))}
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
  summaryCard: { marginBottom: theme.spacing.lg, backgroundColor: "#EF4444" },
  summaryLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  summaryStats: {
    flexDirection: "row",
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  statValue: { fontSize: 16, fontWeight: "600", color: "#fff", marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  strategyContainer: { flexDirection: "row", marginBottom: theme.spacing.lg },
  strategyCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  strategyCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  strategyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  strategyName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  strategyNameActive: { color: theme.colors.primary },
  strategyDescription: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  strategyStats: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  strategyStat: { flex: 1, alignItems: "center" },
  strategyStatLabel: { fontSize: 10, color: theme.colors.textSecondary },
  strategyStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  strategyUnavailableCard: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  strategyUnavailableText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  extraPaymentCard: { marginBottom: theme.spacing.lg },
  extraPaymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  extraPaymentLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },
  extraPaymentValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  sliderContainer: { flexDirection: "row", justifyContent: "space-between" },
  sliderOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  sliderOptionActive: { backgroundColor: theme.colors.primary },
  sliderOptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  sliderOptionTextActive: { color: "#fff" },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  savingsText: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "500",
    marginLeft: 6,
  },
  debtCard: { marginBottom: theme.spacing.sm, position: "relative" },
  debtRow: { flexDirection: "row", alignItems: "center" },
  debtOrder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  debtOrderText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  debtIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  debtInfo: { flex: 1 },
  debtName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  debtMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  debtBalance: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  focusBadge: {
    position: "absolute",
    top: -8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  focusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#F59E0B",
    marginLeft: 4,
  },
});
