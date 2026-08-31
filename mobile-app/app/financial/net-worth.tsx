/**
 * Fynvita Net Worth Tracker Screen
 *
 * Real-data wiring (PARITY): renders the user's real assets, liabilities, and net
 * worth from GET /api/financial/accounts (withPermission "financial:read") via
 * financialOverviewApi.getNetWorth, adapted web -> mobile by mapWebAccountsToNetWorth.
 * Accounts are classified by their real Plaid accountType exactly as the web dashboard
 * does (depository + investment = assets at currentBalance; credit + loan = liabilities
 * at |currentBalance|) — NOT by balance sign, which is wrong for Plaid because credit
 * and loan balances are positive amounts owed. Fetch on mount with honest inline
 * loading / error+retry / empty states and pull-to-refresh.
 *
 * The former MOCK_ASSETS / MOCK_LIABILITIES arrays and their silent catch-fallback
 * were removed: on a failed fetch the screen shows an honest error + retry, never
 * fabricated balances. MOCK_HISTORY (a fabricated 6-month net-worth series) and the
 * "$X this month" delta derived from it were also removed — there is no honest source
 * for a net-worth-over-time series (the dashboard's monthlyTrend is income/expense/
 * savings, not net worth), so the history chart is empty-stated rather than invented.
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
import { PieChart } from "../../src/components/charts";
import { financialOverviewApi } from "../../src/services/api/financial";
import type {
  NetWorthData,
  NetWorthAccount,
  NetWorthAccountType,
} from "../../src/services/api/financial";

// Presentation palettes and icons. These are display-only concerns derived from the
// account's real type — no financial value is invented here.
const ASSET_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#8B5CF6",
  "#F59E0B",
  "#06B6D4",
  "#EC4899",
];
const LIABILITY_COLORS = ["#EF4444", "#F97316", "#DC2626", "#B91C1C"];

function assetIcon(
  accountType: NetWorthAccountType,
  subtype: string,
): keyof typeof Ionicons.glyphMap {
  if (accountType === "investment") return "trending-up";
  if (accountType === "depository") {
    return subtype.toLowerCase().includes("savings") ? "cash" : "wallet";
  }
  return "wallet";
}

function liabilityIcon(
  accountType: NetWorthAccountType,
): keyof typeof Ionicons.glyphMap {
  return accountType === "credit" ? "card" : "document-text";
}

export default function NetWorthScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NetWorthData | null>(null);
  const [showAssetBreakdown, setShowAssetBreakdown] = useState(true);

  const fetchNetWorth = useCallback(async () => {
    const response = await financialOverviewApi.getNetWorth();
    if (response.success && response.data) {
      setData(response.data);
      setError(null);
    } else {
      setError(response.error?.message ?? "Unable to load net worth.");
    }
  }, []);

  const loadNetWorthData = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchNetWorth();
    } finally {
      setLoading(false);
    }
  }, [fetchNetWorth]);

  useEffect(() => {
    loadNetWorthData();
  }, [loadNetWorthData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNetWorth();
    setRefreshing(false);
  };

  const assets: NetWorthAccount[] = data?.assets ?? [];
  const liabilities: NetWorthAccount[] = data?.liabilities ?? [];
  const totalAssets = data?.totalAssets ?? 0;
  const totalLiabilities = data?.totalLiabilities ?? 0;
  const netWorth = data?.netWorth ?? 0;
  const isEmpty = assets.length === 0 && liabilities.length === 0;

  const assetPieData = assets.map((a, i) => ({
    value: a.value,
    label: a.name,
    color: ASSET_COLORS[i % ASSET_COLORS.length],
  }));
  const liabilityPieData = liabilities.map((l, i) => ({
    value: l.value,
    label: l.name,
    color: LIABILITY_COLORS[i % LIABILITY_COLORS.length],
  }));

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-net-worth-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Calculating net worth...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="financial-net-worth-error">
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadNetWorthData}
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
            <Text style={styles.title}>Net Worth Tracker</Text>
            <Text style={styles.subtitle}>Your financial snapshot</Text>
          </View>
        </View>

        {isEmpty ? (
          <View style={styles.emptyCard} testID="financial-net-worth-empty">
            <Ionicons
              name="wallet-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No accounts yet</Text>
            <Text style={styles.emptyText}>
              Once you link a bank, credit, loan, or investment account, your
              assets, liabilities, and net worth will show here.
            </Text>
          </View>
        ) : (
          <>
            {/* Net Worth Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net Worth</Text>
              <Text style={styles.summaryValue}>
                ${netWorth.toLocaleString()}
              </Text>
            </Card>

            {/* Assets vs Liabilities */}
            <View style={styles.compareRow}>
              <TouchableOpacity
                style={[styles.compareCard, { backgroundColor: "#22C55E08" }]}
                onPress={() => setShowAssetBreakdown(true)}
              >
                <Ionicons name="trending-up" size={24} color="#22C55E" />
                <Text style={[styles.compareValue, { color: "#22C55E" }]}>
                  ${(totalAssets / 1000).toFixed(0)}K
                </Text>
                <Text style={styles.compareLabel}>Total Assets</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compareCard, { backgroundColor: "#EF444408" }]}
                onPress={() => setShowAssetBreakdown(false)}
              >
                <Ionicons name="trending-down" size={24} color="#EF4444" />
                <Text style={[styles.compareValue, { color: "#EF4444" }]}>
                  ${(totalLiabilities / 1000).toFixed(0)}K
                </Text>
                <Text style={styles.compareLabel}>Total Liabilities</Text>
              </TouchableOpacity>
            </View>

            {/* Net Worth History — no honest over-time source exists yet, so this is
                empty-stated rather than fabricated. */}
            <Card style={styles.historyCard}>
              <Text style={styles.sectionTitle}>Net Worth History</Text>
              <View
                style={styles.historyUnavailable}
                testID="net-worth-history-unavailable"
              >
                <Ionicons
                  name="analytics-outline"
                  size={28}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.historyUnavailableText}>
                  Net-worth history isn&apos;t available yet. Your trend will
                  appear here as Fynvita records your balances over time.
                </Text>
              </View>
            </Card>

            {/* Asset/Liability Breakdown Pie Chart */}
            <Card style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <TouchableOpacity
                  style={[
                    styles.breakdownTab,
                    showAssetBreakdown && styles.breakdownTabActive,
                  ]}
                  onPress={() => setShowAssetBreakdown(true)}
                >
                  <Text
                    style={[
                      styles.breakdownTabText,
                      showAssetBreakdown && styles.breakdownTabTextActive,
                    ]}
                  >
                    Assets
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.breakdownTab,
                    !showAssetBreakdown && styles.breakdownTabActive,
                  ]}
                  onPress={() => setShowAssetBreakdown(false)}
                >
                  <Text
                    style={[
                      styles.breakdownTabText,
                      !showAssetBreakdown && styles.breakdownTabTextActive,
                    ]}
                  >
                    Liabilities
                  </Text>
                </TouchableOpacity>
              </View>
              <PieChart
                data={showAssetBreakdown ? assetPieData : liabilityPieData}
                size={160}
                innerRadius={45}
                centerValue={`$${((showAssetBreakdown ? totalAssets : totalLiabilities) / 1000).toFixed(0)}K`}
                centerLabel={showAssetBreakdown ? "Assets" : "Debt"}
                showPercentages
              />
            </Card>

            {/* Assets List */}
            {assets.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assets</Text>
                {assets.map((asset, i) => {
                  const color = ASSET_COLORS[i % ASSET_COLORS.length];
                  return (
                    <View key={asset.id || i} style={styles.listItem}>
                      <View
                        style={[
                          styles.itemIcon,
                          { backgroundColor: `${color}15` },
                        ]}
                      >
                        <Ionicons
                          name={assetIcon(asset.accountType, asset.subtype)}
                          size={18}
                          color={color}
                        />
                      </View>
                      <Text style={styles.itemName}>{asset.name}</Text>
                      <Text style={[styles.itemValue, { color: "#22C55E" }]}>
                        ${asset.value.toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Liabilities List */}
            {liabilities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Liabilities</Text>
                {liabilities.map((liability, i) => {
                  const color = LIABILITY_COLORS[i % LIABILITY_COLORS.length];
                  return (
                    <View key={liability.id || i} style={styles.listItem}>
                      <View
                        style={[
                          styles.itemIcon,
                          { backgroundColor: `${color}15` },
                        ]}
                      >
                        <Ionicons
                          name={liabilityIcon(liability.accountType)}
                          size={18}
                          color={color}
                        />
                      </View>
                      <Text style={styles.itemName}>{liability.name}</Text>
                      <Text style={[styles.itemValue, { color: "#EF4444" }]}>
                        -${liability.value.toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </View>
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
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 8,
  },
  compareRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  compareCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    borderRadius: 12,
  },
  compareValue: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  compareLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  historyCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  historyUnavailable: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
  },
  historyUnavailableText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  breakdownCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  breakdownHeader: { flexDirection: "row", marginBottom: theme.spacing.md },
  breakdownTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 4,
  },
  breakdownTabActive: { backgroundColor: theme.colors.primary },
  breakdownTabText: { fontSize: 13, color: theme.colors.textSecondary },
  breakdownTabTextActive: { color: "#fff" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: { flex: 1, fontSize: 14, color: theme.colors.text, marginLeft: 12 },
  itemValue: { fontSize: 14, fontWeight: "600" },
});
