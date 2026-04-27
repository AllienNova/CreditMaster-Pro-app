/**
 * Portfolio Rebalance Screen
 * Shows current vs target allocation and recommended trades
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
  selectHoldings,
  selectPortfolioAnalysis,
  selectInvestmentLoading,
  selectInvestmentError,
} from "../../src/store";
import type { PortfolioHoldingInput } from "../../src/services/api/investments";

const ALLOCATION_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export default function RebalanceScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const holdings = useInvestmentStore(selectHoldings);
  const portfolioAnalysis = useInvestmentStore(selectPortfolioAnalysis);
  const isLoading = useInvestmentStore(selectInvestmentLoading);
  const error = useInvestmentStore(selectInvestmentError);
  const analyzePortfolio = useInvestmentStore((s) => s.analyzePortfolio);
  const fetchPortfolio = useInvestmentStore((s) => s.fetchPortfolio);
  const clearError = useInvestmentStore((s) => s.clearError);

  const loadData = useCallback(async () => {
    await fetchPortfolio();
  }, [fetchPortfolio]);

  const runAnalysis = useCallback(async () => {
    if (holdings.length === 0) return;

    const portfolioHoldings: PortfolioHoldingInput[] = holdings.map((h) => ({
      symbol: h.symbol,
      shares: h.quantity,
      costBasis: h.average_cost * h.quantity,
      currentPrice: h.current_price,
      sector: h.sector,
      assetClass: h.asset_type === "etf" ? "etf" : h.asset_type as PortfolioHoldingInput["assetClass"],
    }));

    await analyzePortfolio(portfolioHoldings, {
      includeRebalance: true,
      includeStressTest: false,
    });
  }, [holdings, analyzePortfolio]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (holdings.length > 0 && !portfolioAnalysis) {
      runAnalysis();
    }
  }, [holdings, portfolioAnalysis, runAnalysis]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    await loadData();
    setRefreshing(false);
  }, [loadData, clearError]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const rebalance = portfolioAnalysis?.rebalanceRecommendation;
  const assetAllocation = portfolioAnalysis?.metrics?.assetClassAllocation;
  const sectorExposure = portfolioAnalysis?.metrics?.sectorExposure;

  // Loading state
  if (isLoading && !portfolioAnalysis) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !portfolioAnalysis) {
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
              runAnalysis();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (holdings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <Ionicons
            name="pie-chart-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Holdings</Text>
          <Text style={styles.emptySubtext}>
            Add holdings to your portfolio to see rebalancing recommendations
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
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
        {/* Diversification Score */}
        {portfolioAnalysis?.diversification && (
          <Card style={styles.scoreCard}>
            <Text style={styles.sectionTitle}>Diversification Score</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreValue}>
                  {portfolioAnalysis.diversification.score.toFixed(0)}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <View style={styles.scoreDetails}>
                <ScoreBar
                  label="Sector"
                  value={portfolioAnalysis.diversification.sectorDiversification}
                />
                <ScoreBar
                  label="Asset Class"
                  value={portfolioAnalysis.diversification.assetClassDiversification}
                />
                <ScoreBar
                  label="Geographic"
                  value={portfolioAnalysis.diversification.geographicDiversification}
                />
              </View>
            </View>
          </Card>
        )}

        {/* Current Asset Allocation */}
        {assetAllocation && Object.keys(assetAllocation).length > 0 && (
          <Card style={styles.allocationCard}>
            <Text style={styles.sectionTitle}>Current Allocation</Text>
            {Object.entries(assetAllocation).map(([key, value], idx) => (
              <View key={key} style={styles.allocationRow}>
                <View style={styles.allocationLeft}>
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor:
                          ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
                      },
                    ]}
                  />
                  <Text style={styles.allocationLabel}>
                    {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </View>
                <View style={styles.allocationRight}>
                  <View style={styles.allocationBarContainer}>
                    <View
                      style={[
                        styles.allocationBar,
                        {
                          width: `${Math.min(value, 100)}%`,
                          backgroundColor:
                            ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.allocationPercent}>
                    {formatPercent(value)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Sector Exposure */}
        {sectorExposure && Object.keys(sectorExposure).length > 0 && (
          <Card style={styles.allocationCard}>
            <Text style={styles.sectionTitle}>Sector Exposure</Text>
            {Object.entries(sectorExposure)
              .sort(([, a], [, b]) => b - a)
              .map(([key, value], idx) => (
                <View key={key} style={styles.allocationRow}>
                  <View style={styles.allocationLeft}>
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor:
                            ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
                        },
                      ]}
                    />
                    <Text style={styles.allocationLabel}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                  <Text style={styles.allocationPercent}>
                    {formatPercent(value)}
                  </Text>
                </View>
              ))}
          </Card>
        )}

        {/* Recommended Trades */}
        {rebalance && rebalance.trades.length > 0 && (
          <Card style={styles.tradesCard}>
            <Text style={styles.sectionTitle}>Recommended Trades</Text>
            <View style={styles.tradeSummary}>
              <View style={styles.tradeSummaryItem}>
                <Text style={styles.tradeSummaryLabel}>Est. Cost</Text>
                <Text style={styles.tradeSummaryValue}>
                  {formatCurrency(rebalance.estimatedCost)}
                </Text>
              </View>
              <View style={styles.tradeSummaryItem}>
                <Text style={styles.tradeSummaryLabel}>Current Risk</Text>
                <Text style={styles.tradeSummaryValue}>
                  {rebalance.currentRisk.toFixed(1)}
                </Text>
              </View>
              <View style={styles.tradeSummaryItem}>
                <Text style={styles.tradeSummaryLabel}>Proj. Risk</Text>
                <Text
                  style={[
                    styles.tradeSummaryValue,
                    {
                      color:
                        rebalance.projectedRisk < rebalance.currentRisk
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {rebalance.projectedRisk.toFixed(1)}
                </Text>
              </View>
            </View>

            {rebalance.trades.map((trade, idx) => (
              <View key={`trade-${idx}`} style={styles.tradeRow}>
                <View style={styles.tradeLeft}>
                  <View
                    style={[
                      styles.tradeActionBadge,
                      {
                        backgroundColor:
                          trade.action === "buy"
                            ? `${theme.colors.success}20`
                            : `${theme.colors.error}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tradeActionText,
                        {
                          color:
                            trade.action === "buy"
                              ? theme.colors.success
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {trade.action.toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                    <Text style={styles.tradeShares}>
                      {trade.shares} shares
                    </Text>
                  </View>
                </View>
                <View style={styles.tradeRight}>
                  <Text style={styles.tradeValue}>
                    {formatCurrency(trade.value)}
                  </Text>
                  <Text style={styles.tradeDrift}>
                    {formatPercent(trade.currentWeight)} →{" "}
                    {formatPercent(trade.targetWeight)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* No rebalance needed */}
        {rebalance && rebalance.trades.length === 0 && (
          <Card style={styles.noRebalanceCard}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={theme.colors.success}
            />
            <Text style={styles.noRebalanceTitle}>Portfolio Balanced</Text>
            <Text style={styles.noRebalanceText}>
              Your portfolio is well-balanced. No trades recommended at this
              time.
            </Text>
          </Card>
        )}

        {/* Recommendations */}
        {portfolioAnalysis?.diversification?.recommendations &&
          portfolioAnalysis.diversification.recommendations.length > 0 && (
            <Card style={styles.recommendationsCard}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {portfolioAnalysis.diversification.recommendations.map(
                (rec, idx) => (
                  <View key={`rec-${idx}`} style={styles.recommendationRow}>
                    <Ionicons
                      name="bulb-outline"
                      size={18}
                      color={theme.colors.warning}
                    />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ),
              )}
            </Card>
          )}

        {/* Analyze button if no analysis yet */}
        {!portfolioAnalysis && holdings.length > 0 && (
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={runAnalysis}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze Portfolio</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={styles.scoreBarValue}>{value.toFixed(0)}</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            {
              width: `${Math.min(value, 100)}%`,
              backgroundColor:
                value >= 70
                  ? theme.colors.success
                  : value >= 40
                    ? theme.colors.warning
                    : theme.colors.error,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  scoreCard: {
    padding: theme.spacing.md,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 16,
  },
  scoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  scoreMax: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  scoreDetails: {
    flex: 1,
    gap: 8,
  },
  scoreBarContainer: {
    gap: 2,
  },
  scoreBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreBarLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  scoreBarValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },
  scoreBarTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  allocationCard: {
    padding: theme.spacing.md,
  },
  allocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  allocationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allocationLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  allocationRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  allocationBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  allocationBar: {
    height: "100%",
    borderRadius: 3,
  },
  allocationPercent: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    width: 48,
    textAlign: "right",
  },
  tradesCard: {
    padding: theme.spacing.md,
  },
  tradeSummary: {
    flexDirection: "row",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: 12,
  },
  tradeSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  tradeSummaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  tradeSummaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  tradeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tradeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tradeActionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  tradeActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tradeSymbol: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  tradeShares: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  tradeRight: {
    alignItems: "flex-end",
  },
  tradeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  tradeDrift: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  noRebalanceCard: {
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  noRebalanceTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  noRebalanceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  recommendationsCard: {
    padding: theme.spacing.md,
  },
  recommendationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  analyzeButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
