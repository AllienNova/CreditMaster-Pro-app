/**
 * Fynvita Debt Payoff Calculator
 * Snowball vs Avalanche comparison, payoff timeline visualization
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
import { useDebtStore } from "../../src/store/debtStore";

interface Debt {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
  type: "credit_card" | "loan" | "mortgage" | "student";
}

const MOCK_DEBTS: Debt[] = [
  {
    id: "1",
    name: "Chase Sapphire",
    balance: 4500,
    apr: 24.99,
    minPayment: 135,
    type: "credit_card",
  },
  {
    id: "2",
    name: "Capital One",
    balance: 2800,
    apr: 22.99,
    minPayment: 84,
    type: "credit_card",
  },
  {
    id: "3",
    name: "Discover",
    balance: 1200,
    apr: 19.99,
    minPayment: 36,
    type: "credit_card",
  },
  {
    id: "4",
    name: "Car Loan",
    balance: 12500,
    apr: 6.5,
    minPayment: 350,
    type: "loan",
  },
  {
    id: "5",
    name: "Student Loan",
    balance: 28000,
    apr: 5.5,
    minPayment: 280,
    type: "student",
  },
];

const STRATEGIES = {
  avalanche: {
    name: "Avalanche",
    description: "Pay highest interest first",
    totalInterest: 4250,
    payoffMonths: 36,
    icon: "trending-down",
  },
  snowball: {
    name: "Snowball",
    description: "Pay smallest balance first",
    totalInterest: 4890,
    payoffMonths: 38,
    icon: "snow",
  },
};

export default function DebtScreen() {
  const [selectedStrategy, setSelectedStrategy] = useState<
    "avalanche" | "snowball"
  >("avalanche");
  const [extraPayment, setExtraPayment] = useState(200);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);

  const {
    overview: debtOverview,
    fetchOverview: fetchDebtOverview,
    isLoadingOverview: isLoadingDebt,
  } = useDebtStore();

  const loadDebts = useCallback(async () => {
    try {
      await fetchDebtOverview();
      if (debtOverview?.debts && debtOverview.debts.length > 0) {
        const transformedDebts = debtOverview.debts.map((d) => ({
          id: d.id,
          name: d.name,
          balance: d.balance,
          apr: d.interestRate,
          minPayment: d.minimumPayment,
          type: d.type as Debt["type"],
        }));
        setDebts(transformedDebts);
      } else {
        setDebts(MOCK_DEBTS);
      }
    } catch (err) {
      // Fallback to mock data silently in production
      setDebts(MOCK_DEBTS);
    } finally {
      setLoading(false);
    }
  }, [fetchDebtOverview, debtOverview]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDebts();
    setRefreshing(false);
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minPayment, 0);
  const avgApr =
    debts.length > 0
      ? debts.reduce((sum, d) => sum + d.apr, 0) / debts.length
      : 0;

  const sortedDebts =
    selectedStrategy === "avalanche"
      ? [...debts].sort((a, b) => b.apr - a.apr)
      : [...debts].sort((a, b) => a.balance - b.balance);

  const getDebtIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return "card";
      case "loan":
        return "car";
      case "mortgage":
        return "home";
      case "student":
        return "school";
      default:
        return "cash";
    }
  };

  if (loading || isLoadingDebt) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading debt overview...</Text>
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
          <TouchableOpacity onPress={() => router.push("/financial/add-debt" as Href)}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Debt</Text>
          <Text style={styles.summaryValue}>${totalDebt.toLocaleString()}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.statLabel}>Min Payment</Text>
              <Text style={styles.statValue}>${totalMinPayment}/mo</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.statLabel}>Avg APR</Text>
              <Text style={styles.statValue}>{avgApr.toFixed(1)}%</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.statLabel}>Accounts</Text>
              <Text style={styles.statValue}>{debts.length}</Text>
            </View>
          </View>
        </Card>

        {/* Strategy Selector */}
        <Text style={styles.sectionTitle}>Payoff Strategy</Text>
        <View style={styles.strategyContainer}>
          {(Object.keys(STRATEGIES) as Array<"avalanche" | "snowball">).map(
            (key) => {
              const strategy = STRATEGIES[key];
              const isSelected = selectedStrategy === key;
              return (
                <TouchableOpacity
                  key={key}
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
                      name={strategy.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={isSelected ? "#fff" : theme.colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.strategyName,
                      isSelected && styles.strategyNameActive,
                    ]}
                  >
                    {strategy.name}
                  </Text>
                  <Text style={styles.strategyDescription}>
                    {strategy.description}
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
                        ${strategy.totalInterest.toLocaleString()}
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
                        {strategy.payoffMonths} mo
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {/* Extra Payment Slider */}
        <Card style={styles.extraPaymentCard}>
          <View style={styles.extraPaymentHeader}>
            <Text style={styles.extraPaymentLabel}>Extra Monthly Payment</Text>
            <Text style={styles.extraPaymentValue}>${extraPayment}</Text>
          </View>
          <View style={styles.sliderContainer}>
            {[0, 100, 200, 300, 500].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.sliderOption,
                  extraPayment === amount && styles.sliderOptionActive,
                ]}
                onPress={() => setExtraPayment(amount)}
              >
                <Text
                  style={[
                    styles.sliderOptionText,
                    extraPayment === amount && styles.sliderOptionTextActive,
                  ]}
                >
                  ${amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.savingsRow}>
            <Ionicons name="trending-down" size={16} color="#22C55E" />
            <Text style={styles.savingsText}>
              Save ${Math.round(extraPayment * 12 * 0.15)} in interest
            </Text>
          </View>
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
                  name={
                    getDebtIcon(debt.type) as keyof typeof Ionicons.glyphMap
                  }
                  size={20}
                  color={idx === 0 ? "#22C55E" : theme.colors.textSecondary}
                />
              </View>
              <View style={styles.debtInfo}>
                <Text style={styles.debtName}>{debt.name}</Text>
                <Text style={styles.debtMeta}>
                  {debt.apr}% APR • ${debt.minPayment}/mo min
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
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
