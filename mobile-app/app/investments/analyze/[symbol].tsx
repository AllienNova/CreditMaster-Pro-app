/**
 * Stock Analysis Screen
 * AI-powered stock analysis with technical indicators and recommendations
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../../src/constants/theme";
import { Card } from "../../../src/components/Card";
import { ScreenHeader } from "../../../src/components/ScreenHeader";
import {
  useInvestmentStore,
  selectCurrentRecommendation,
  selectInvestmentLoading,
  selectInvestmentError,
} from "../../../src/store";

export default function StockAnalysisScreen() {
  const { symbol: paramSymbol } = useLocalSearchParams<{ symbol: string }>();
  const [searchSymbol, setSearchSymbol] = useState(paramSymbol || "");

  const recommendation = useInvestmentStore(selectCurrentRecommendation);
  const isLoading = useInvestmentStore(selectInvestmentLoading);
  const error = useInvestmentStore(selectInvestmentError);
  const getRecommendation = useInvestmentStore((s) => s.getRecommendation);
  const addToWatchlist = useInvestmentStore((s) => s.addToWatchlist);

  useEffect(() => {
    if (paramSymbol) {
      getRecommendation(paramSymbol);
    }
  }, [paramSymbol]);

  const handleSearch = () => {
    if (searchSymbol.trim()) {
      getRecommendation(searchSymbol.trim().toUpperCase());
    }
  };

  // Extract nested recommendation data for easier access
  const rec = recommendation?.recommendation;
  const pricePrediction = recommendation?.pricePrediction;
  const technicalSummary = recommendation?.technicalSummary;

  const handleAddToWatchlist = () => {
    if (rec) {
      addToWatchlist({
        symbol: rec.symbol,
        name: rec.symbol, // API doesn't provide company name in recommendation
        price: rec.currentPrice || 0,
        change: 0, // Price change not available in recommendation
        changePercent: rec.expectedReturn || 0,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec?.toLowerCase()) {
      case "strong_buy":
      case "buy":
        return "#10B981";
      case "hold":
        return "#F59E0B";
      case "sell":
      case "strong_sell":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec?.toLowerCase()) {
      case "strong_buy":
        return "Strong Buy";
      case "buy":
        return "Buy";
      case "hold":
        return "Hold";
      case "sell":
        return "Sell";
      case "strong_sell":
        return "Strong Sell";
      default:
        return "N/A";
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal?.toLowerCase()) {
      case "bullish":
        return { name: "arrow-up-circle", color: "#10B981" };
      case "bearish":
        return { name: "arrow-down-circle", color: "#EF4444" };
      default:
        return { name: "remove-circle", color: "#F59E0B" };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader title={paramSymbol ?? "Analysis"} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter stock symbol (e.g., AAPL)"
              placeholderTextColor={theme.colors.textSecondary}
              value={searchSymbol}
              onChangeText={setSearchSymbol}
              autoCapitalize="characters"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Analyzing {searchSymbol}...</Text>
          </View>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {rec && !isLoading && (
          <>
            {/* Stock Header */}
            <Card style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View style={styles.stockInfo}>
                  <Text style={styles.symbol}>{rec.symbol}</Text>
                  <Text style={styles.companyName}>{rec.symbol}</Text>
                </View>
                <TouchableOpacity
                  style={styles.watchlistButton}
                  onPress={handleAddToWatchlist}
                >
                  <Ionicons
                    name="star-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {formatCurrency(rec.currentPrice || 0)}
                </Text>
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        (rec.expectedReturn || 0) >= 0
                          ? "#10B98120"
                          : "#EF444420",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      (rec.expectedReturn || 0) >= 0 ? "arrow-up" : "arrow-down"
                    }
                    size={14}
                    color={
                      (rec.expectedReturn || 0) >= 0 ? "#10B981" : "#EF4444"
                    }
                  />
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          (rec.expectedReturn || 0) >= 0
                            ? "#10B981"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {formatPercent(rec.expectedReturn || 0)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* AI Recommendation */}
            <Card style={styles.recommendationCard}>
              <Text style={styles.sectionTitle}>AI Recommendation</Text>
              <View style={styles.recContent}>
                <View
                  style={[
                    styles.recBadge,
                    {
                      backgroundColor: `${getRecommendationColor(rec.action)}20`,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      rec.action?.includes("buy")
                        ? "trending-up"
                        : rec.action?.includes("sell")
                          ? "trending-down"
                          : "remove"
                    }
                    size={32}
                    color={getRecommendationColor(rec.action)}
                  />
                  <Text
                    style={[
                      styles.recText,
                      { color: getRecommendationColor(rec.action) },
                    ]}
                  >
                    {getRecommendationLabel(rec.action)}
                  </Text>
                </View>
                <View style={styles.recDetails}>
                  <View style={styles.recDetailItem}>
                    <Text style={styles.recDetailLabel}>Confidence</Text>
                    <Text style={styles.recDetailValue}>
                      {((rec.confidence || 0) * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.recDetailItem}>
                    <Text style={styles.recDetailLabel}>Target Price</Text>
                    <Text style={styles.recDetailValue}>
                      {formatCurrency(rec.priceTarget || 0)}
                    </Text>
                  </View>
                  <View style={styles.recDetailItem}>
                    <Text style={styles.recDetailLabel}>Expected Return</Text>
                    <Text
                      style={[
                        styles.recDetailValue,
                        {
                          color:
                            (rec.expectedReturn || 0) >= 0
                              ? "#10B981"
                              : "#EF4444",
                        },
                      ]}
                    >
                      {formatPercent(rec.expectedReturn || 0)}
                    </Text>
                  </View>
                </View>
              </View>
              {rec.reasons && rec.reasons.length > 0 && (
                <Text style={styles.summary}>
                  {rec.reasons[0]?.description}
                </Text>
              )}
            </Card>

            {/* Technical Indicators */}
            <Card style={styles.technicalCard}>
              <Text style={styles.sectionTitle}>Technical Analysis</Text>
              <View style={styles.indicatorGrid}>
                {[
                  {
                    label: "RSI (14)",
                    value: technicalSummary?.rsi,
                    signal: getRsiSignal(technicalSummary?.rsi),
                  },
                  {
                    label: "Technical Score",
                    value: rec.technicalScore,
                    signal: rec.technicalScore > 50 ? "bullish" : "bearish",
                  },
                  {
                    label: "Fundamental Score",
                    value: rec.fundamentalScore,
                    signal: rec.fundamentalScore > 50 ? "bullish" : "bearish",
                  },
                  {
                    label: "Trend",
                    value: technicalSummary?.trend,
                    signal: technicalSummary?.trend,
                  },
                ].map((indicator, index) => {
                  const iconData = getSignalIcon(indicator.signal || "");
                  return (
                    <View key={index} style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>
                        {indicator.label}
                      </Text>
                      <View style={styles.indicatorValue}>
                        <Text style={styles.indicatorValueText}>
                          {typeof indicator.value === "number"
                            ? indicator.value.toFixed(2)
                            : indicator.value || "N/A"}
                        </Text>
                        <Ionicons
                          name={iconData.name as any}
                          size={18}
                          color={iconData.color}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Risk Assessment */}
            <Card style={styles.riskCard}>
              <Text style={styles.sectionTitle}>Risk Assessment</Text>
              <View style={styles.riskContent}>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Risk Score</Text>
                  <View style={styles.riskBar}>
                    <View
                      style={[
                        styles.riskFill,
                        {
                          width: `${Math.min(rec.riskScore || 0, 100)}%`,
                          backgroundColor: getRiskColor(
                            (rec.riskScore || 0) / 100,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.riskValue}>
                    {(rec.riskScore || 0).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Time Horizon</Text>
                  <Text style={styles.riskMetric}>
                    {rec.timeHorizon?.replace("_", " ") || "N/A"}
                  </Text>
                </View>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Stop Loss</Text>
                  <View
                    style={[
                      styles.riskLevelBadge,
                      { backgroundColor: "#EF444420" },
                    ]}
                  >
                    <Text style={styles.riskLevelText}>
                      {formatCurrency(rec.stopLoss || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Reasons */}
            {rec.reasons && rec.reasons.length > 0 && (
              <Card style={styles.reasonsCard}>
                <Text style={styles.sectionTitle}>Analysis Factors</Text>
                {rec.reasons.map((reason, index) => (
                  <View key={index} style={styles.reasonItem}>
                    <Ionicons
                      name={
                        reason.impact === "positive"
                          ? "checkmark-circle"
                          : reason.impact === "negative"
                            ? "close-circle"
                            : "remove-circle"
                      }
                      size={18}
                      color={
                        reason.impact === "positive"
                          ? "#10B981"
                          : reason.impact === "negative"
                            ? "#EF4444"
                            : "#F59E0B"
                      }
                    />
                    <Text style={styles.reasonText}>{reason.description}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getRsiSignal(rsi: number | undefined): string {
  if (!rsi) return "neutral";
  if (rsi > 70) return "bearish";
  if (rsi < 30) return "bullish";
  return "neutral";
}

function getRiskColor(volatility: number): string {
  if (volatility < 0.15) return "#10B981";
  if (volatility < 0.25) return "#F59E0B";
  return "#EF4444";
}

function getRiskLevelColor(level: string | undefined): string {
  switch (level?.toLowerCase()) {
    case "low":
      return "#10B98120";
    case "high":
      return "#EF444420";
    default:
      return "#F59E0B20";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: theme.spacing.xl * 2,
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#EF4444",
  },
  headerCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stockInfo: {
    flex: 1,
  },
  symbol: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
  },
  companyName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  watchlistButton: {
    padding: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    gap: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.text,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  recommendationCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  recContent: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  recBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  recText: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  recDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  recDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recDetailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  recDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  summary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    lineHeight: 20,
  },
  technicalCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  indicatorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  indicatorItem: {
    width: "47%",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  indicatorLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  indicatorValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  indicatorValueText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  riskCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  riskContent: {
    gap: theme.spacing.md,
  },
  riskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  riskLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    width: 80,
  },
  riskBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  riskFill: {
    height: "100%",
    borderRadius: 4,
  },
  riskValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    width: 40,
    textAlign: "right",
  },
  riskMetric: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  riskLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  riskLevelText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  reasonsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
});
