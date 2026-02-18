/**
 * Portfolio Analytics Mobile Screen
 *
 * Phase 5.5.2: Mobile-optimized portfolio analytics with tabbed interface,
 * interactive charts, and swipeable recommendations
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width } = Dimensions.get("window");

// ============================================================================
// TYPES
// ============================================================================

enum RiskLevel {
  CONSERVATIVE = "conservative",
  MODERATE = "moderate",
  AGGRESSIVE = "aggressive",
  VERY_AGGRESSIVE = "very_aggressive",
}

interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  valueAtRisk: { var95: number; var99: number };
  conditionalVaR: { cvar95: number; cvar99: number };
  maxDrawdown: number;
  volatility: { daily: number; annualized: number; downside: number };
}

interface DiversificationScore {
  overallScore: number;
  sectorDiversification: number;
  assetClassDiversification: number;
  geographicDiversification: number;
  concentrationRisk: number;
}

interface SectorExposure {
  sector: string;
  allocation: number;
  value: number;
  riskWeight: number;
}

interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  avgCorrelation: number;
  highlyCorrelated: Array<{ pair: [string, string]; correlation: number }>;
}

interface RebalanceTrade {
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  value: number;
  reason: string;
}

interface RebalanceRecommendation {
  trades: RebalanceTrade[];
  estimatedCost: number;
  expectedImprovement: { sharpeRatio: number; diversification: number };
  taxImplications: Array<{
    symbol: string;
    gainLoss: number;
    estimatedTax: number;
    holdingPeriod: string;
  }>;
}

type TimeHorizon = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";
type AnalyticsTab = "risk" | "diversification" | "correlation" | "rebalance";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("risk");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("1Y");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [diversification, setDiversification] =
    useState<DiversificationScore | null>(null);
  const [sectorExposure, setSectorExposure] = useState<SectorExposure[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationMatrix | null>(
    null,
  );
  const [rebalance, setRebalance] = useState<RebalanceRecommendation | null>(
    null,
  );

  const portfolioId = "default-portfolio-id"; // In production, get from context/store

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      const [riskRes, divRes, corrRes, rebalRes] = await Promise.all([
        fetch(
          `/api/investments/analytics/risk?portfolioId=${portfolioId}&timeHorizon=${timeHorizon}`,
        ),
        fetch(
          `/api/investments/analytics/diversification?portfolioId=${portfolioId}`,
        ),
        fetch(
          `/api/investments/analytics/correlation?portfolioId=${portfolioId}`,
        ),
        fetch(
          `/api/investments/analytics/rebalance?portfolioId=${portfolioId}`,
        ),
      ]);

      if (riskRes.ok && divRes.ok && corrRes.ok && rebalRes.ok) {
        const [riskData, divData, corrData, rebalData] = await Promise.all([
          riskRes.json(),
          divRes.json(),
          corrRes.json(),
          rebalRes.json(),
        ]);

        setRiskMetrics(riskData.data.metrics);
        setDiversification(divData.data.score);
        setSectorExposure(divData.data.sectorExposure || []);
        setCorrelation(corrData.data);
        setRebalance(rebalData.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [portfolioId, timeHorizon]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio Analytics</Text>
        <View style={styles.backButton} />
      </View>

      {/* Time Horizon Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeHorizonScroll}
      >
        {(["1M", "3M", "6M", "1Y", "3Y", "5Y"] as TimeHorizon[]).map(
          (horizon) => (
            <TouchableOpacity
              key={horizon}
              style={[
                styles.timeHorizonButton,
                timeHorizon === horizon && styles.timeHorizonButtonActive,
              ]}
              onPress={() => setTimeHorizon(horizon)}
            >
              <Text
                style={[
                  styles.timeHorizonText,
                  timeHorizon === horizon && styles.timeHorizonTextActive,
                ]}
              >
                {horizon}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </ScrollView>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === "risk" && styles.tabActive]}
          onPress={() => setActiveTab("risk")}
        >
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={
              activeTab === "risk"
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "risk" && styles.tabTextActive,
            ]}
          >
            Risk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "diversification" && styles.tabActive,
          ]}
          onPress={() => setActiveTab("diversification")}
        >
          <Ionicons
            name="pie-chart"
            size={20}
            color={
              activeTab === "diversification"
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "diversification" && styles.tabTextActive,
            ]}
          >
            Diversification
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "correlation" && styles.tabActive]}
          onPress={() => setActiveTab("correlation")}
        >
          <Ionicons
            name="git-network"
            size={20}
            color={
              activeTab === "correlation"
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "correlation" && styles.tabTextActive,
            ]}
          >
            Correlation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "rebalance" && styles.tabActive]}
          onPress={() => setActiveTab("rebalance")}
        >
          <Ionicons
            name="swap-horizontal"
            size={20}
            color={
              activeTab === "rebalance"
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "rebalance" && styles.tabTextActive,
            ]}
          >
            Rebalance
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {activeTab === "risk" && riskMetrics && (
              <RiskCard metrics={riskMetrics} />
            )}
            {activeTab === "diversification" && diversification && (
              <>
                <DiversificationChart score={diversification} />
                <SectorBreakdown sectors={sectorExposure} />
              </>
            )}
            {activeTab === "correlation" && correlation && (
              <CorrelationCard correlation={correlation} />
            )}
            {activeTab === "rebalance" && rebalance && (
              <RebalanceList recommendation={rebalance} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// RISK CARD COMPONENT
// ============================================================================

interface RiskCardProps {
  metrics: RiskMetrics;
}

function RiskCard({ metrics }: RiskCardProps) {
  const getRiskLevel = (sharpe: number): { level: string; color: string } => {
    if (sharpe >= 2) return { level: "Low", color: theme.colors.success };
    if (sharpe >= 1) return { level: "Moderate", color: theme.colors.warning };
    if (sharpe >= 0) return { level: "High", color: "#F59E0B" };
    return { level: "Very High", color: theme.colors.error };
  };

  const risk = getRiskLevel(metrics.sharpeRatio);

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Risk Assessment</Text>

      {/* Risk Level Indicator */}
      <View
        style={[styles.riskIndicator, { backgroundColor: `${risk.color}20` }]}
      >
        <Ionicons name="shield-checkmark" size={32} color={risk.color} />
        <View style={styles.riskInfo}>
          <Text style={styles.riskLabel}>Risk Level</Text>
          <Text style={[styles.riskLevel, { color: risk.color }]}>
            {risk.level}
          </Text>
        </View>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Sharpe Ratio</Text>
          <Text style={styles.metricValue}>
            {metrics.sharpeRatio.toFixed(2)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Beta</Text>
          <Text style={styles.metricValue}>{metrics.beta.toFixed(2)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Alpha</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color:
                  metrics.alpha >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              },
            ]}
          >
            {metrics.alpha >= 0 ? "+" : ""}
            {metrics.alpha.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>VaR (95%)</Text>
          <Text style={[styles.metricValue, { color: theme.colors.error }]}>
            {metrics.valueAtRisk.var95.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CVaR (95%)</Text>
          <Text style={[styles.metricValue, { color: theme.colors.error }]}>
            {metrics.conditionalVaR.cvar95.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Max Drawdown</Text>
          <Text style={[styles.metricValue, { color: theme.colors.error }]}>
            {metrics.maxDrawdown.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Volatility</Text>
          <Text style={styles.metricValue}>
            {metrics.volatility.annualized.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Sortino Ratio</Text>
          <Text style={styles.metricValue}>
            {metrics.sortinoRatio.toFixed(2)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// DIVERSIFICATION CHART COMPONENT
// ============================================================================

interface DiversificationChartProps {
  score: DiversificationScore;
}

function DiversificationChart({ score }: DiversificationChartProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Diversification Score</Text>

      {/* Overall Score */}
      <View style={styles.overallScore}>
        <Text
          style={[
            styles.scoreValue,
            { color: getScoreColor(score.overallScore) },
          ]}
        >
          {score.overallScore.toFixed(0)}
        </Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>

      {/* Score Breakdown */}
      <View style={styles.scoreBreakdown}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>Sector</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${score.sectorDiversification}%`,
                  backgroundColor: getScoreColor(score.sectorDiversification),
                },
              ]}
            />
          </View>
          <Text style={styles.scoreItemValue}>
            {score.sectorDiversification.toFixed(0)}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>Asset Class</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${score.assetClassDiversification}%`,
                  backgroundColor: getScoreColor(
                    score.assetClassDiversification,
                  ),
                },
              ]}
            />
          </View>
          <Text style={styles.scoreItemValue}>
            {score.assetClassDiversification.toFixed(0)}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>Geographic</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${score.geographicDiversification}%`,
                  backgroundColor: getScoreColor(
                    score.geographicDiversification,
                  ),
                },
              ]}
            />
          </View>
          <Text style={styles.scoreItemValue}>
            {score.geographicDiversification.toFixed(0)}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>Concentration Risk</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${score.concentrationRisk}%`,
                  backgroundColor: theme.colors.error,
                },
              ]}
            />
          </View>
          <Text style={styles.scoreItemValue}>
            {score.concentrationRisk.toFixed(0)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// SECTOR BREAKDOWN COMPONENT
// ============================================================================

interface SectorBreakdownProps {
  sectors: SectorExposure[];
}

function SectorBreakdown({ sectors }: SectorBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const displaySectors = expanded ? sectors : sectors.slice(0, 5);

  const getSectorColor = (index: number): string => {
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
      "#6366F1",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Sector Allocation</Text>

      <View style={styles.sectorList}>
        {displaySectors.map((sector, index) => (
          <View key={sector.sector} style={styles.sectorItem}>
            <View style={styles.sectorInfo}>
              <View
                style={[
                  styles.sectorDot,
                  { backgroundColor: getSectorColor(index) },
                ]}
              />
              <Text style={styles.sectorName}>
                {sector.sector.replace("_", " ")}
              </Text>
            </View>
            <View style={styles.sectorValues}>
              <Text style={styles.sectorAllocation}>
                {sector.allocation.toFixed(1)}%
              </Text>
              <Text style={styles.sectorValue}>
                ${(sector.value / 1000).toFixed(1)}K
              </Text>
            </View>
          </View>
        ))}
      </View>

      {sectors.length > 5 && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? "Show Less" : `Show ${sectors.length - 5} More`}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ============================================================================
// CORRELATION CARD COMPONENT
// ============================================================================

interface CorrelationCardProps {
  correlation: CorrelationMatrix;
}

function CorrelationCard({ correlation }: CorrelationCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Asset Correlation</Text>

      <View style={styles.correlationSummary}>
        <Text style={styles.correlationLabel}>Average Correlation</Text>
        <Text
          style={[
            styles.correlationValue,
            {
              color:
                correlation.avgCorrelation > 0.7
                  ? theme.colors.error
                  : theme.colors.success,
            },
          ]}
        >
          {correlation.avgCorrelation.toFixed(2)}
        </Text>
      </View>

      {/* Highly Correlated Pairs */}
      {correlation.highlyCorrelated.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Highly Correlated Pairs</Text>
          <View style={styles.correlationPairs}>
            {correlation.highlyCorrelated.slice(0, 5).map((pair, idx) => (
              <View key={idx} style={styles.correlationPair}>
                <Text style={styles.pairSymbols}>
                  {pair.pair[0]} ↔ {pair.pair[1]}
                </Text>
                <Text
                  style={[
                    styles.pairValue,
                    {
                      color:
                        pair.correlation > 0
                          ? theme.colors.error
                          : theme.colors.success,
                    },
                  ]}
                >
                  {pair.correlation.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.infoText}>
        High correlation (&gt;0.7) indicates assets move together, reducing
        diversification benefits.
      </Text>
    </Card>
  );
}

// ============================================================================
// REBALANCE LIST COMPONENT
// ============================================================================

interface RebalanceListProps {
  recommendation: RebalanceRecommendation;
}

function RebalanceList({ recommendation }: RebalanceListProps) {
  const buyTrades = recommendation.trades.filter((t) => t.action === "buy");
  const sellTrades = recommendation.trades.filter((t) => t.action === "sell");

  return (
    <>
      {/* Summary Card */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Rebalancing Summary</Text>

        <View style={styles.rebalanceSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Trades</Text>
            <Text style={styles.summaryValue}>
              {recommendation.trades.length}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expected Improvement</Text>
            <Text
              style={[styles.summaryValue, { color: theme.colors.success }]}
            >
              +
              {(recommendation.expectedImprovement.sharpeRatio * 100).toFixed(
                1,
              )}
              %
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Estimated Cost</Text>
            <Text style={styles.summaryValue}>
              ${recommendation.estimatedCost.toFixed(2)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Buy Recommendations */}
      {buyTrades.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Buy Recommendations ({buyTrades.length})
          </Text>
          {buyTrades.map((trade, idx) => (
            <View
              key={idx}
              style={[
                styles.tradeCard,
                { backgroundColor: `${theme.colors.success}10` },
              ]}
            >
              <View style={styles.tradeHeader}>
                <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                <Text
                  style={[styles.tradeValue, { color: theme.colors.success }]}
                >
                  ${trade.value.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.tradeShares}>{trade.shares} shares</Text>
              <Text style={styles.tradeReason}>{trade.reason}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Sell Recommendations */}
      {sellTrades.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Sell Recommendations ({sellTrades.length})
          </Text>
          {sellTrades.map((trade, idx) => (
            <View
              key={idx}
              style={[
                styles.tradeCard,
                { backgroundColor: `${theme.colors.error}10` },
              ]}
            >
              <View style={styles.tradeHeader}>
                <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
                <Text
                  style={[styles.tradeValue, { color: theme.colors.error }]}
                >
                  ${trade.value.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.tradeShares}>{trade.shares} shares</Text>
              <Text style={styles.tradeReason}>{trade.reason}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Tax Implications */}
      {recommendation.taxImplications &&
        recommendation.taxImplications.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Tax Implications</Text>
            {recommendation.taxImplications.map((tax, idx) => (
              <View key={idx} style={styles.taxItem}>
                <Text style={styles.taxSymbol}>{tax.symbol}</Text>
                <View style={styles.taxDetails}>
                  <Text style={styles.taxPeriod}>
                    {tax.holdingPeriod.replace("_", " ")}
                  </Text>
                  <Text
                    style={[
                      styles.taxAmount,
                      {
                        color:
                          tax.gainLoss >= 0
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    ${tax.estimatedTax.toFixed(2)} tax
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  timeHorizonScroll: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeHorizonButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: 4,
  },
  timeHorizonButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  timeHorizonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  timeHorizonTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  tabsScroll: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginHorizontal: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: "500",
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  card: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  riskIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  riskInfo: {
    marginLeft: theme.spacing.md,
  },
  riskLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metricItem: {
    width: "50%",
    marginBottom: theme.spacing.md,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  overallScore: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  scoreBreakdown: {
    marginTop: theme.spacing.md,
  },
  scoreItem: {
    marginBottom: theme.spacing.md,
  },
  scoreItemLabel: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: "500",
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreItemValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "right",
  },
  sectorList: {
    marginTop: theme.spacing.sm,
  },
  sectorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  sectorName: {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: "capitalize",
  },
  sectorValues: {
    alignItems: "flex-end",
  },
  sectorAllocation: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sectorValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  expandButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "500",
    marginRight: theme.spacing.xs,
  },
  correlationSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  correlationLabel: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },
  correlationValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  correlationPairs: {
    marginTop: theme.spacing.sm,
  },
  correlationPair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pairSymbols: {
    fontSize: 13,
    color: theme.colors.text,
  },
  pairValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
  rebalanceSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  tradeCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  tradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  tradeSymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  tradeValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  tradeShares: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  tradeReason: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  taxItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  taxSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  taxDetails: {
    alignItems: "flex-end",
  },
  taxPeriod: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: "capitalize",
  },
  taxAmount: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
});
