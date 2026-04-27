/**
 * Portfolio Performance Screen
 * Shows returns, metrics, and holdings breakdown by time period
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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  useInvestmentStore,
  selectPortfolio,
  selectHoldings,
  selectPortfolioAnalysis,
  selectInvestmentLoading,
  selectInvestmentError,
} from "../../src/store";
import type { PortfolioHoldingInput } from "../../src/services/api/investments";

type Period = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const PERIODS: Period[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const periodToApiParam: Record<Period, string> = {
  "1D": "1d",
  "1W": "1w",
  "1M": "1m",
  "3M": "3m",
  "1Y": "1y",
  ALL: "all",
};

export default function PerformanceScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("1M");
  const [refreshing, setRefreshing] = useState(false);

  const portfolio = useInvestmentStore(selectPortfolio);
  const holdings = useInvestmentStore(selectHoldings);
  const portfolioAnalysis = useInvestmentStore(selectPortfolioAnalysis);
  const isLoading = useInvestmentStore(selectInvestmentLoading);
  const error = useInvestmentStore(selectInvestmentError);
  const fetchPortfolio = useInvestmentStore((s) => s.fetchPortfolio);
  const analyzePortfolio = useInvestmentStore((s) => s.analyzePortfolio);
  const clearError = useInvestmentStore((s) => s.clearError);

  const loadData = useCallback(async () => {
    await fetchPortfolio(periodToApiParam[selectedPeriod]);
  }, [fetchPortfolio, selectedPeriod]);

  const loadAnalysis = useCallback(async () => {
    if (holdings.length === 0) return;

    const portfolioHoldings: PortfolioHoldingInput[] = holdings.map((h) => ({
      symbol: h.symbol,
      shares: h.quantity,
      costBasis: h.average_cost * h.quantity,
      currentPrice: h.current_price,
      sector: h.sector,
      assetClass: h.asset_type === "etf" ? "etf" : h.asset_type as PortfolioHoldingInput["assetClass"],
    }));

    await analyzePortfolio(portfolioHoldings);
  }, [holdings, analyzePortfolio]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (holdings.length > 0 && !portfolioAnalysis) {
      loadAnalysis();
    }
  }, [holdings, portfolioAnalysis, loadAnalysis]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    await loadData();
    setRefreshing(false);
  }, [loadData, clearError]);

  const handlePeriodChange = useCallback(
    (period: Period) => {
      setSelectedPeriod(period);
    },
    [],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const summary = portfolio?.summary;
  const metrics = portfolioAnalysis?.metrics;

  // Sort holdings by gain/loss for best/worst performers
  const sortedHoldings = [...holdings].sort(
    (a, b) => (b.gain_loss_percent || 0) - (a.gain_loss_percent || 0),
  );
  const bestPerformers = sortedHoldings.slice(0, 3);
  const worstPerformers = sortedHoldings
    .filter((h) => (h.gain_loss_percent || 0) < 0)
    .slice(-3)
    .reverse();

  // Loading state
  if (isLoading && !portfolio) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !portfolio) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              loadData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!portfolio && !isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <Ionicons
            name="trending-up-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Performance Data</Text>
          <Text style={styles.emptySubtext}>
            Add holdings to track your portfolio performance over time
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Period Selector */}
      <View style={styles.periodBar}>
        {PERIODS.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodChip,
              selectedPeriod === period && styles.periodChipActive,
            ]}
            onPress={() => handlePeriodChange(period)}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Total Return */}
        {summary && (
          <Card style={styles.returnCard}>
            <Text style={styles.returnLabel}>Total Portfolio Value</Text>
            <Text style={styles.returnValue}>
              {formatCurrency(summary.totalValue)}
            </Text>
            <View style={styles.returnChangeRow}>
              <Text
                style={[
                  styles.returnChange,
                  {
                    color:
                      summary.totalGainLoss >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {formatCurrency(summary.totalGainLoss)}
              </Text>
              <View
                style={[
                  styles.returnBadge,
                  {
                    backgroundColor:
                      summary.totalGainLossPercent >= 0
                        ? `${theme.colors.success}20`
                        : `${theme.colors.error}20`,
                  },
                ]}
              >
                <Ionicons
                  name={
                    summary.totalGainLossPercent >= 0
                      ? "trending-up"
                      : "trending-down"
                  }
                  size={14}
                  color={
                    summary.totalGainLossPercent >= 0
                      ? theme.colors.success
                      : theme.colors.error
                  }
                />
                <Text
                  style={[
                    styles.returnBadgeText,
                    {
                      color:
                        summary.totalGainLossPercent >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {formatPercent(summary.totalGainLossPercent)}
                </Text>
              </View>
            </View>
            <View style={styles.dayChangeRow}>
              <Text style={styles.dayChangeLabel}>Today</Text>
              <Text
                style={[
                  styles.dayChangeValue,
                  {
                    color:
                      summary.dayChange >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {formatCurrency(summary.dayChange)} (
                {formatPercent(summary.dayChangePercent)})
              </Text>
            </View>
          </Card>
        )}

        {/* Key Metrics */}
        {metrics && (
          <Card style={styles.metricsCard}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricBox
                label="Sharpe Ratio"
                value={metrics.sharpeRatio.toFixed(2)}
                hint={
                  metrics.sharpeRatio >= 1
                    ? "Good"
                    : metrics.sharpeRatio >= 0.5
                      ? "Fair"
                      : "Low"
                }
                hintColor={
                  metrics.sharpeRatio >= 1
                    ? theme.colors.success
                    : metrics.sharpeRatio >= 0.5
                      ? theme.colors.warning
                      : theme.colors.error
                }
              />
              <MetricBox
                label="Max Drawdown"
                value={formatPercent(-Math.abs(metrics.maxDrawdown))}
                hint={
                  Math.abs(metrics.maxDrawdown) < 10
                    ? "Low"
                    : Math.abs(metrics.maxDrawdown) < 20
                      ? "Moderate"
                      : "High"
                }
                hintColor={
                  Math.abs(metrics.maxDrawdown) < 10
                    ? theme.colors.success
                    : Math.abs(metrics.maxDrawdown) < 20
                      ? theme.colors.warning
                      : theme.colors.error
                }
              />
              <MetricBox
                label="Volatility"
                value={formatPercent(metrics.volatility)}
              />
              <MetricBox
                label="Beta"
                value={metrics.beta.toFixed(2)}
              />
              <MetricBox
                label="Alpha"
                value={formatPercent(metrics.alpha)}
              />
              <MetricBox
                label="Sortino"
                value={metrics.sortinoRatio.toFixed(2)}
              />
            </View>
          </Card>
        )}

        {/* Return Periods */}
        {metrics && (
          <Card style={styles.returnsCard}>
            <Text style={styles.sectionTitle}>Returns</Text>
            <ReturnRow label="Daily" value={metrics.dailyReturn} />
            <ReturnRow label="Weekly" value={metrics.weeklyReturn} />
            <ReturnRow label="Monthly" value={metrics.monthlyReturn} />
            <ReturnRow label="YTD" value={metrics.ytdReturn} />
            <ReturnRow label="Annualized" value={metrics.annualizedReturn} />
          </Card>
        )}

        {/* Best Performers */}
        {bestPerformers.length > 0 && (
          <Card style={styles.performersCard}>
            <Text style={styles.sectionTitle}>Best Performers</Text>
            {bestPerformers.map((holding) => (
              <View key={holding.id || holding.symbol} style={styles.performerRow}>
                <View style={styles.performerLeft}>
                  <Text style={styles.performerSymbol}>{holding.symbol}</Text>
                  <Text style={styles.performerName} numberOfLines={1}>
                    {holding.name}
                  </Text>
                </View>
                <View style={styles.performerRight}>
                  <Text
                    style={[styles.performerGain, { color: theme.colors.success }]}
                  >
                    {formatPercent(holding.gain_loss_percent || 0)}
                  </Text>
                  <Text style={styles.performerValue}>
                    {formatCurrency(holding.gain_loss || 0)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Worst Performers */}
        {worstPerformers.length > 0 && (
          <Card style={styles.performersCard}>
            <Text style={styles.sectionTitle}>Worst Performers</Text>
            {worstPerformers.map((holding) => (
              <View key={holding.id || holding.symbol} style={styles.performerRow}>
                <View style={styles.performerLeft}>
                  <Text style={styles.performerSymbol}>{holding.symbol}</Text>
                  <Text style={styles.performerName} numberOfLines={1}>
                    {holding.name}
                  </Text>
                </View>
                <View style={styles.performerRight}>
                  <Text
                    style={[styles.performerGain, { color: theme.colors.error }]}
                  >
                    {formatPercent(holding.gain_loss_percent || 0)}
                  </Text>
                  <Text style={styles.performerValue}>
                    {formatCurrency(holding.gain_loss || 0)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Value at Risk */}
        {metrics?.valueAtRisk && (
          <Card style={styles.varCard}>
            <Text style={styles.sectionTitle}>Value at Risk</Text>
            <MetricRowLine
              label="Daily (95%)"
              value={formatCurrency(metrics.valueAtRisk.daily95)}
            />
            <MetricRowLine
              label="Daily (99%)"
              value={formatCurrency(metrics.valueAtRisk.daily99)}
            />
            <MetricRowLine
              label="Weekly (95%)"
              value={formatCurrency(metrics.valueAtRisk.weekly95)}
            />
            <MetricRowLine
              label="Monthly (95%)"
              value={formatCurrency(metrics.valueAtRisk.monthly95)}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricBox({
  label,
  value,
  hint,
  hintColor,
}: {
  label: string;
  value: string;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricBoxLabel}>{label}</Text>
      <Text style={styles.metricBoxValue}>{value}</Text>
      {hint && (
        <Text style={[styles.metricBoxHint, hintColor ? { color: hintColor } : undefined]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

function ReturnRow({ label, value }: { label: string; value: number }) {
  const formatPercent = (v: number) => {
    const sign = v >= 0 ? "+" : "";
    return `${sign}${v.toFixed(2)}%`;
  };

  return (
    <View style={styles.returnRow}>
      <Text style={styles.returnRowLabel}>{label}</Text>
      <Text
        style={[
          styles.returnRowValue,
          { color: value >= 0 ? theme.colors.success : theme.colors.error },
        ]}
      >
        {formatPercent(value)}
      </Text>
    </View>
  );
}

function MetricRowLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRowLine}>
      <Text style={styles.metricRowLineLabel}>{label}</Text>
      <Text style={styles.metricRowLineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  periodBar: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 6,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  periodChipActive: {
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
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: 12,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  returnCard: {
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  returnLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  returnValue: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4,
  },
  returnChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  returnChange: {
    fontSize: 16,
    fontWeight: "600",
  },
  returnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  returnBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    width: "100%",
    justifyContent: "center",
  },
  dayChangeLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  dayChangeValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  metricsCard: {
    padding: theme.spacing.md,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricBox: {
    width: "31%",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  metricBoxLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  metricBoxValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  metricBoxHint: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  returnsCard: {
    padding: theme.spacing.md,
  },
  returnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  returnRowLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  returnRowValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  performersCard: {
    padding: theme.spacing.md,
  },
  performerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  performerLeft: {
    flex: 1,
  },
  performerSymbol: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  performerName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  performerRight: {
    alignItems: "flex-end",
  },
  performerGain: {
    fontSize: 15,
    fontWeight: "600",
  },
  performerValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  varCard: {
    padding: theme.spacing.md,
  },
  metricRowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  metricRowLineLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metricRowLineValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
