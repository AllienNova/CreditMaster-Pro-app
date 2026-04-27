/**
 * Stock Research Screen
 * Search and analyze stocks/crypto with tabbed data display
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import investmentsApi, {
  StockAnalysis,
} from "../../src/services/api/investments";

type Tab = "overview" | "technical" | "fundamental" | "sentiment";

export default function ResearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const symbol = searchQuery.trim().toUpperCase();
    if (!symbol) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await investmentsApi.analyzeStock(symbol);
      if (response.data?.analysis) {
        setAnalysis(response.data.analysis);
      } else {
        setError("No data found for this symbol.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch stock data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return formatCurrency(num);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getRecommendationColor = (
    rec: StockAnalysis["recommendation"],
  ): string => {
    switch (rec) {
      case "strong_buy":
        return "#22C55E";
      case "buy":
        return "#4ADE80";
      case "hold":
        return "#F59E0B";
      case "sell":
        return "#F87171";
      case "strong_sell":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRecommendationLabel = (
    rec: StockAnalysis["recommendation"],
  ): string => {
    switch (rec) {
      case "strong_buy":
        return "STRONG BUY";
      case "buy":
        return "BUY";
      case "hold":
        return "HOLD";
      case "sell":
        return "SELL";
      case "strong_sell":
        return "STRONG SELL";
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "technical", label: "Technical" },
    { key: "fundamental", label: "Fundamental" },
    { key: "sentiment", label: "Sentiment" },
  ];

  const renderOverview = () => {
    if (!analysis) return null;
    return (
      <View style={styles.tabContent}>
        <Card style={styles.priceCard}>
          <Text style={styles.companyName}>{analysis.company_name}</Text>
          <Text style={styles.priceText}>
            {formatCurrency(analysis.current_price)}
          </Text>
          <Text
            style={[
              styles.changeText,
              {
                color:
                  analysis.price_change >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              },
            ]}
          >
            {formatCurrency(analysis.price_change)} (
            {formatPercent(analysis.price_change_percent)})
          </Text>
        </Card>

        <View style={styles.recommendBadge}>
          <Text
            style={[
              styles.recommendText,
              { color: getRecommendationColor(analysis.recommendation) },
            ]}
          >
            {getRecommendationLabel(analysis.recommendation)}
          </Text>
          <Text style={styles.confidenceText}>
            Confidence: {(analysis.confidence_score * 100).toFixed(0)}%
          </Text>
        </View>

        <Card style={styles.metricsCard}>
          <MetricRow label="Volume" value={analysis.volume.toLocaleString()} />
          <MetricRow
            label="Avg Volume"
            value={analysis.avg_volume.toLocaleString()}
          />
          <MetricRow
            label="Market Cap"
            value={formatLargeNumber(analysis.market_cap)}
          />
          <MetricRow
            label="52W High"
            value={formatCurrency(analysis.high_52_week)}
          />
          <MetricRow
            label="52W Low"
            value={formatCurrency(analysis.low_52_week)}
          />
          <MetricRow
            label="Target Price"
            value={formatCurrency(analysis.target_price)}
          />
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Analysis Summary</Text>
          <Text style={styles.summaryText}>{analysis.analysis_summary}</Text>
        </Card>
      </View>
    );
  };

  const renderTechnical = () => {
    if (!analysis) return null;
    const { technical_indicators } = analysis;
    return (
      <View style={styles.tabContent}>
        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Technical Indicators</Text>
          <MetricRow label="RSI" value={technical_indicators.rsi.toFixed(1)} />
          <MetricRow
            label="MACD Signal"
            value={technical_indicators.macd_signal}
          />
          <MetricRow
            label="Moving Avg"
            value={technical_indicators.moving_average_signal}
          />
        </Card>

        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>RSI Interpretation</Text>
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeBar}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    width: `${Math.min(technical_indicators.rsi, 100)}%`,
                    backgroundColor:
                      technical_indicators.rsi > 70
                        ? theme.colors.error
                        : technical_indicators.rsi < 30
                          ? theme.colors.success
                          : theme.colors.warning,
                  },
                ]}
              />
            </View>
            <View style={styles.gaugeLabels}>
              <Text style={styles.gaugeLabel}>Oversold</Text>
              <Text style={styles.gaugeLabel}>Neutral</Text>
              <Text style={styles.gaugeLabel}>Overbought</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Price Levels</Text>
          <MetricRow
            label="Current"
            value={formatCurrency(analysis.current_price)}
          />
          <MetricRow
            label="52W High"
            value={formatCurrency(analysis.high_52_week)}
          />
          <MetricRow
            label="52W Low"
            value={formatCurrency(analysis.low_52_week)}
          />
          <MetricRow
            label="Target"
            value={formatCurrency(analysis.target_price)}
          />
        </Card>
      </View>
    );
  };

  const renderFundamental = () => {
    if (!analysis) return null;
    return (
      <View style={styles.tabContent}>
        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Valuation Metrics</Text>
          <MetricRow
            label="P/E Ratio"
            value={analysis.pe_ratio?.toFixed(2) ?? "N/A"}
          />
          <MetricRow
            label="Market Cap"
            value={formatLargeNumber(analysis.market_cap)}
          />
          <MetricRow
            label="Dividend Yield"
            value={
              analysis.dividend_yield
                ? `${(analysis.dividend_yield * 100).toFixed(2)}%`
                : "N/A"
            }
          />
        </Card>

        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Price Performance</Text>
          <MetricRow
            label="Current Price"
            value={formatCurrency(analysis.current_price)}
          />
          <MetricRow
            label="Target Price"
            value={formatCurrency(analysis.target_price)}
          />
          <MetricRow
            label="Upside"
            value={formatPercent(
              ((analysis.target_price - analysis.current_price) /
                analysis.current_price) *
                100,
            )}
          />
        </Card>
      </View>
    );
  };

  const renderSentiment = () => {
    if (!analysis) return null;
    const bullishPercent =
      analysis.bullish_factors.length /
      Math.max(
        analysis.bullish_factors.length + analysis.bearish_factors.length,
        1,
      );

    return (
      <View style={styles.tabContent}>
        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Sentiment Gauge</Text>
          <View style={styles.sentimentGauge}>
            <View style={styles.gaugeBar}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    width: `${bullishPercent * 100}%`,
                    backgroundColor: theme.colors.success,
                  },
                ]}
              />
            </View>
            <View style={styles.gaugeLabels}>
              <Text style={[styles.gaugeLabel, { color: theme.colors.error }]}>
                Bearish
              </Text>
              <Text
                style={[styles.gaugeLabel, { color: theme.colors.success }]}
              >
                Bullish
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Bullish Factors</Text>
          {analysis.bullish_factors.map((factor, idx) => (
            <View key={`bull-${idx}`} style={styles.factorRow}>
              <Ionicons
                name="arrow-up-circle"
                size={18}
                color={theme.colors.success}
              />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
          {analysis.bullish_factors.length === 0 && (
            <Text style={styles.noDataText}>No bullish factors identified</Text>
          )}
        </Card>

        <Card style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Bearish Factors</Text>
          {analysis.bearish_factors.map((factor, idx) => (
            <View key={`bear-${idx}`} style={styles.factorRow}>
              <Ionicons
                name="arrow-down-circle"
                size={18}
                color={theme.colors.error}
              />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
          {analysis.bearish_factors.length === 0 && (
            <Text style={styles.noDataText}>
              No bearish factors identified
            </Text>
          )}
        </Card>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "technical":
        return renderTechnical();
      case "fundamental":
        return renderFundamental();
      case "sentiment":
        return renderSentiment();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search symbol (e.g. AAPL, BTC)"
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setAnalysis(null);
                setError(null);
              }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
        >
          <Text style={styles.searchButtonText}>Analyze</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Analyzing {searchQuery.toUpperCase()}...
          </Text>
        </View>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleSearch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {!analysis && !isLoading && !error && (
        <View style={styles.centerState}>
          <Ionicons
            name="analytics-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>Stock Research</Text>
          <Text style={styles.emptySubtext}>
            Enter a stock or crypto symbol to get a detailed analysis
          </Text>
        </View>
      )}

      {/* Results */}
      {analysis && !isLoading && (
        <>
          {/* Tabs */}
          <View style={styles.tabBar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {renderTabContent()}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    justifyContent: "center",
    height: 44,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  tabContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: 12,
  },
  priceCard: {
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  companyName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
  },
  changeText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  recommendBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  recommendText: {
    fontSize: 16,
    fontWeight: "700",
  },
  confidenceText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  metricsCard: {
    padding: theme.spacing.md,
    gap: 8,
  },
  summaryCard: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  gaugeContainer: {
    marginTop: 8,
  },
  gaugeBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 4,
  },
  gaugeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  gaugeLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  sentimentGauge: {
    marginVertical: 8,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  factorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});
