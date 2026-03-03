/**
 * Investment Portfolio Dashboard
 * Main screen showing portfolio overview, allocation, performance, and holdings
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  useInvestmentStore,
  selectPortfolio,
  selectHoldings,
  selectInvestmentLoading,
  selectInvestmentError,
} from "../../src/store";
import { AreaChart } from "../../src/components/charts/AreaChart";
import { DonutChart } from "../../src/components/charts/DonutChart";

const { width } = Dimensions.get("window");

export default function InvestmentPortfolioScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("1M");

  const portfolio = useInvestmentStore(selectPortfolio);
  const holdings = useInvestmentStore(selectHoldings);
  const isLoading = useInvestmentStore(selectInvestmentLoading);
  const error = useInvestmentStore(selectInvestmentError);
  const fetchPortfolio = useInvestmentStore((state) => state.fetchPortfolio);

  useEffect(() => {
    fetchPortfolio(selectedPeriod);
  }, [selectedPeriod]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio(selectedPeriod);
    setRefreshing(false);
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const periods = ["7D", "1M", "3M", "1Y", "ALL"];

  // Calculate portfolio totals from holdings
  const totalValue = holdings.reduce(
    (sum, h) => sum + (h.current_value || 0),
    0,
  );
  const totalGain = holdings.reduce((sum, h) => sum + (h.gain_loss || 0), 0);
  const totalGainPercent =
    holdings.reduce((sum, h) => sum + (h.gain_loss_percent || 0), 0) /
    (holdings.length || 1);
  const todayChange = holdings.reduce((sum, h) => sum + (h.day_change || 0), 0);
  const todayChangePercent =
    holdings.reduce((sum, h) => sum + (h.day_change_percent || 0), 0) /
    (holdings.length || 1);

  // Group holdings by asset type for allocation
  const allocation = holdings.reduce(
    (acc, h) => {
      const type = h.asset_type || "stock";
      if (!acc[type]) {
        acc[type] = { value: 0, percent: 0, color: getAllocationColor(type) };
      }
      acc[type].value += h.current_value || 0;
      return acc;
    },
    {} as Record<string, { value: number; percent: number; color: string }>,
  );

  // Calculate percentages
  Object.keys(allocation).forEach((key) => {
    allocation[key].percent =
      totalValue > 0 ? (allocation[key].value / totalValue) * 100 : 0;
  });

  function getAllocationColor(type: string): string {
    const colors: Record<string, string> = {
      stocks: "#3B82F6",
      etfs: "#10B981",
      bonds: "#F59E0B",
      crypto: "#8B5CF6",
      mutual_funds: "#EC4899",
      options: "#EF4444",
      other: "#6B7280",
    };
    return colors[type] || colors.other;
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
          <Text style={styles.title}>Investments</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/investments/watchlist")}
            >
              <Ionicons
                name="eye-outline"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/investments/add-holding")}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Portfolio Summary Cards */}
        <View style={styles.summaryCards}>
          <Card style={styles.mainSummaryCard}>
            <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalValue)}
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Total Gain/Loss</Text>
                <Text
                  style={[
                    styles.summaryItemValue,
                    { color: totalGain >= 0 ? "#10B981" : "#EF4444" },
                  ]}
                >
                  {formatCurrency(totalGain)} ({formatPercent(totalGainPercent)}
                  )
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Today</Text>
                <Text
                  style={[
                    styles.summaryItemValue,
                    { color: todayChange >= 0 ? "#10B981" : "#EF4444" },
                  ]}
                >
                  {formatCurrency(todayChange)} (
                  {formatPercent(todayChangePercent)})
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
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
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Chart */}
        {portfolio?.performanceHistory && portfolio.performanceHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <Card style={styles.chartCard}>
              <AreaChart
                data={portfolio.performanceHistory.map((p) => ({
                  value: p.value,
                  label: new Date(p.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                }))}
                height={180}
                showGrid
                showDots
                formatValue={(v) =>
                  `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
                }
                color={totalGain >= 0 ? "#10B981" : "#EF4444"}
              />
            </Card>
          </View>
        )}

        {/* Allocation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Allocation</Text>
          <Card style={styles.allocationCard}>
            {Object.keys(allocation).length > 0 ? (
              <DonutChart
                data={Object.entries(allocation).map(([type, data]) => ({
                  value: data.value,
                  label:
                    type.charAt(0).toUpperCase() +
                    type.slice(1).replace("_", " "),
                  color: data.color,
                }))}
                size={180}
                centerLabel="Total"
                centerValue={formatCurrency(totalValue)}
                showLegend
                showPercentages
                currency
              />
            ) : (
              <Text style={styles.emptySubtext}>No allocation data</Text>
            )}
          </Card>
        </View>

        {/* Holdings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Holdings</Text>
            <TouchableOpacity
              onPress={() => router.push("/investments/holdings")}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {holdings.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons
                name="trending-up-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>No holdings yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first investment to get started
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/investments/add-holding")}
              >
                <Text style={styles.addButtonText}>Add Holding</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            holdings.slice(0, 5).map((holding, index) => (
              <TouchableOpacity
                key={holding.id || index}
                style={styles.holdingCard}
                onPress={() =>
                  router.push(`/investments/analyze/${holding.symbol}`)
                }
              >
                <View style={styles.holdingInfo}>
                  <View style={styles.holdingIcon}>
                    <Text style={styles.holdingIconText}>
                      {holding.symbol?.slice(0, 2).toUpperCase() || "XX"}
                    </Text>
                  </View>
                  <View style={styles.holdingDetails}>
                    <Text style={styles.holdingSymbol}>
                      {holding.symbol || "Unknown"}
                    </Text>
                    <Text style={styles.holdingName} numberOfLines={1}>
                      {holding.name || holding.symbol}
                    </Text>
                  </View>
                </View>
                <View style={styles.holdingValues}>
                  <Text style={styles.holdingValue}>
                    {formatCurrency(holding.current_value || 0)}
                  </Text>
                  <Text
                    style={[
                      styles.holdingChange,
                      {
                        color:
                          (holding.gain_loss_percent || 0) >= 0
                            ? "#10B981"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {formatPercent(holding.gain_loss_percent || 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push("/investments/holdings")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons
                  name="list-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.quickActionText}>Manage Holdings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push("/investments/watchlist")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons
                  name="star-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.quickActionText}>Watchlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push("/investments/analyze/AAPL")}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons
                  name="analytics-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.quickActionText}>AI Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  summaryCards: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  mainSummaryCard: {
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  summaryItemLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  seeAll: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  chartCard: {
    padding: theme.spacing.md,
    alignItems: "center",
  },
  allocationCard: {
    padding: theme.spacing.md,
    alignItems: "center",
  },
  holdingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  holdingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  holdingIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  holdingDetails: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  holdingName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingValues: {
    alignItems: "flex-end",
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  holdingChange: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  quickActionText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "500",
    textAlign: "center",
  },
});
