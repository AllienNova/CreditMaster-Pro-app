/**
 * Fynvita Credits Settings Screen
 * Manage credit balance, purchase packs, and view transaction history.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  useCreditBalanceStore,
  selectBalance,
  selectTransactions,
  selectCreditLoading,
  selectIsLow,
} from "../../src/store/creditBalanceStore";

type CreditPackType = "starter" | "value" | "power";

const PACKS: {
  type: CreditPackType;
  credits: number;
  price: string;
  perThousand: string;
  popular?: boolean;
}[] = [
  { type: "starter", credits: 1000, price: "$4.99", perThousand: "$4.99" },
  {
    type: "value",
    credits: 5000,
    price: "$19.99",
    perThousand: "$4.00",
    popular: true,
  },
  { type: "power", credits: 15000, price: "$49.99", perThousand: "$3.33" },
];

const ACTION_LABELS: Record<string, string> = {
  signal_analysis: "Signal Analysis",
  trade_execution: "Trade Execution",
  backtest_standard: "Standard Backtest",
  backtest_ai: "AI Backtest",
  chat_message: "AI Chat",
  dispute_letter_single: "Dispute Letter",
  dispute_letter_all: "Dispute (All Bureaus)",
  credit_analysis: "Credit Analysis",
  monthly_reset: "Monthly Reset",
  credit_purchase: "Credit Purchase",
  addon_credit: "Add-on Credit",
};

export default function CreditsScreen() {
  const balance = useCreditBalanceStore(selectBalance);
  const transactions = useCreditBalanceStore(selectTransactions);
  const loading = useCreditBalanceStore(selectCreditLoading);
  const isLow = useCreditBalanceStore(selectIsLow);
  const { fetchBalance, fetchHistory, purchasePack } =
    useCreditBalanceStore();
  const [purchasing, setPurchasing] = useState<CreditPackType | null>(null);

  useEffect(() => {
    fetchBalance();
    fetchHistory(20, 0);
  }, [fetchBalance, fetchHistory]);

  const handlePurchase = async (packType: CreditPackType) => {
    setPurchasing(packType);
    const result = await purchasePack(packType);
    setPurchasing(null);

    if (result.success) {
      Alert.alert(
        "Purchase Successful",
        `Your new balance is ${result.newBalance?.toLocaleString()} credits.`,
      );
      fetchBalance();
    } else {
      Alert.alert("Purchase Failed", result.error ?? "Something went wrong.");
    }
  };

  const totalAllowance = balance
    ? balance.subscriptionAllowance + balance.purchasedCredits
    : 0;
  const remainingPercent =
    totalAllowance > 0 && balance
      ? Math.round(
          ((totalAllowance - balance.usedThisPeriod) / totalAllowance) * 100,
        )
      : 100;

  const barColor =
    remainingPercent > 50
      ? theme.colors.secondary
      : remainingPercent > 20
        ? theme.colors.warning
        : theme.colors.error;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Balance card */}
        <Card style={styles.balanceCard}>
          {loading && !balance ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : balance ? (
            <>
              <Text style={styles.balanceLabel}>Available Credits</Text>
              <Text style={styles.balanceValue}>
                {balance.creditBalance.toLocaleString()}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Monthly</Text>
                  <Text style={styles.statValue}>
                    {balance.subscriptionAllowance.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Purchased</Text>
                  <Text style={styles.statValue}>
                    {balance.purchasedCredits.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Used</Text>
                  <Text style={styles.statValue}>
                    {balance.usedThisPeriod.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>
                    {balance.usedThisPeriod.toLocaleString()} /{" "}
                    {totalAllowance.toLocaleString()} used
                  </Text>
                  <Text style={styles.progressText}>
                    {remainingPercent}% left
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.max(remainingPercent, 2)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>

              {isLow && (
                <View style={styles.lowBanner}>
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={theme.colors.warning}
                  />
                  <Text style={styles.lowBannerText}>
                    Running low on credits
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </Card>

        {/* Purchase packs */}
        <Text style={styles.sectionTitle}>Buy Credit Packs</Text>
        {PACKS.map((pack) => (
          <Card key={pack.type} style={styles.packCard}>
            {pack.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
            )}
            <View style={styles.packContent}>
              <View>
                <Text style={styles.packCredits}>
                  {pack.credits.toLocaleString()} credits
                </Text>
                <Text style={styles.packPer}>
                  {pack.perThousand} per 1,000
                </Text>
              </View>
              <View style={styles.packRight}>
                <Text style={styles.packPrice}>{pack.price}</Text>
                <TouchableOpacity
                  onPress={() => handlePurchase(pack.type)}
                  disabled={purchasing !== null}
                  style={[
                    styles.buyButton,
                    pack.popular && styles.buyButtonPopular,
                  ]}
                >
                  {purchasing === pack.type ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buyButtonText}>Buy</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={32}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>No credit activity yet</Text>
            </View>
          </Card>
        ) : (
          <Card padding="none">
            {transactions.map((tx, index) => {
              const isDebit = tx.creditsConsumed > 0;
              const amount = isDebit ? tx.creditsConsumed : tx.creditsAdded;

              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txRow,
                    index < transactions.length - 1 && styles.txRowBorder,
                  ]}
                >
                  <View style={styles.txLeft}>
                    <Ionicons
                      name={isDebit ? "remove-circle-outline" : "add-circle-outline"}
                      size={20}
                      color={isDebit ? theme.colors.error : theme.colors.secondary}
                    />
                    <View>
                      <Text style={styles.txAction}>
                        {ACTION_LABELS[tx.actionType] ?? tx.actionType}
                      </Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isDebit ? theme.colors.error : theme.colors.secondary },
                    ]}
                  >
                    {isDebit ? "-" : "+"}
                    {amount.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  headerSpacer: { width: 40 },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  lowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 8,
    borderRadius: 8,
  },
  lowBannerText: {
    fontSize: 13,
    color: theme.colors.warning,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  packCard: {
    marginBottom: 12,
    overflow: "visible",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    left: 16,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  popularBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  packContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packCredits: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  packPer: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  packRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  packPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  buyButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  buyButtonPopular: {
    backgroundColor: theme.colors.secondary,
  },
  buyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  txRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  txAction: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  txDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
});
