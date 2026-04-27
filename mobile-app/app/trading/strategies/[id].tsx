/**
 * Strategy Detail Screen
 * Shows full details of a trading strategy with action buttons
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
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../../src/constants/theme";
import { Card } from "../../../src/components/Card";
import api from "../../../src/services/api/client";
import type { ApiResponse } from "../../../src/services/api/types";

type RiskLevel = "low" | "medium" | "high";

interface StrategyDetail {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  expectedReturn: number;
  requiredCapital: number;
  winRate?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  profitFactor?: number;
  category?: string;
  timeframe?: string;
  indicators: string[];
  rules: string[];
  entryConditions?: string[];
  exitConditions?: string[];
  backtestResults?: {
    period: string;
    totalReturn: number;
    tradeCount: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  isActive?: boolean;
  createdAt?: string;
}

interface StrategyResponse {
  strategy: StrategyDetail;
}

export default function StrategyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStrategy = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const response: ApiResponse<StrategyResponse> =
        await api.get<StrategyResponse>(`/trading/strategies/${id}`);
      if (response.data?.strategy) {
        setStrategy(response.data.strategy);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load strategy details.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStrategy();
    setRefreshing(false);
  }, [fetchStrategy]);

  const handlePaperTrade = () => {
    Alert.alert(
      "Paper Trade",
      `Start paper trading with "${strategy?.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: () => {
            Alert.alert("Paper Trading", "Paper trading session started.");
          },
        },
      ],
    );
  };

  const handleLiveTrade = () => {
    Alert.alert(
      "Live Trade",
      `Are you sure you want to enable live trading with "${strategy?.name}"? This will use real funds.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable",
          style: "destructive",
          onPress: () => {
            Alert.alert("Live Trading", "Live trading enabled for this strategy.");
          },
        },
      ],
    );
  };

  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case "low":
        return theme.colors.success;
      case "medium":
        return theme.colors.warning;
      case "high":
        return theme.colors.error;
    }
  };

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

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading strategy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !strategy) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>
            {error || "Strategy not found."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStrategy}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: `${getRiskColor(strategy.riskLevel)}15` },
            ]}
          >
            <Text
              style={[
                styles.riskBadgeText,
                { color: getRiskColor(strategy.riskLevel) },
              ]}
            >
              {strategy.riskLevel.toUpperCase()} RISK
            </Text>
          </View>
          <Text style={styles.strategyName}>{strategy.name}</Text>
          <Text style={styles.strategyDescription}>
            {strategy.description}
          </Text>
        </View>

        {/* Key Metrics */}
        <Card style={styles.metricsCard}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Expected Return</Text>
              <Text
                style={[styles.metricValue, { color: theme.colors.success }]}
              >
                {formatPercent(strategy.expectedReturn)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Min. Capital</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(strategy.requiredCapital)}
              </Text>
            </View>
            {strategy.winRate !== undefined && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Win Rate</Text>
                <Text style={styles.metricValue}>
                  {(strategy.winRate).toFixed(1)}%
                </Text>
              </View>
            )}
            {strategy.maxDrawdown !== undefined && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Max Drawdown</Text>
                <Text
                  style={[styles.metricValue, { color: theme.colors.error }]}
                >
                  {formatPercent(-Math.abs(strategy.maxDrawdown))}
                </Text>
              </View>
            )}
            {strategy.sharpeRatio !== undefined && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Sharpe Ratio</Text>
                <Text style={styles.metricValue}>
                  {strategy.sharpeRatio.toFixed(2)}
                </Text>
              </View>
            )}
            {strategy.profitFactor !== undefined && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Profit Factor</Text>
                <Text style={styles.metricValue}>
                  {strategy.profitFactor.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Indicators */}
        {strategy.indicators.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Indicators Used</Text>
            <View style={styles.tagContainer}>
              {strategy.indicators.map((indicator, idx) => (
                <View key={`ind-${idx}`} style={styles.tag}>
                  <Text style={styles.tagText}>{indicator}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Rules */}
        {strategy.rules.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Strategy Rules</Text>
            {strategy.rules.map((rule, idx) => (
              <View key={`rule-${idx}`} style={styles.ruleRow}>
                <View style={styles.ruleBullet}>
                  <Text style={styles.ruleBulletText}>{idx + 1}</Text>
                </View>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Entry Conditions */}
        {strategy.entryConditions && strategy.entryConditions.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Entry Conditions</Text>
            {strategy.entryConditions.map((condition, idx) => (
              <View key={`entry-${idx}`} style={styles.conditionRow}>
                <Ionicons
                  name="log-in-outline"
                  size={16}
                  color={theme.colors.success}
                />
                <Text style={styles.conditionText}>{condition}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Exit Conditions */}
        {strategy.exitConditions && strategy.exitConditions.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Exit Conditions</Text>
            {strategy.exitConditions.map((condition, idx) => (
              <View key={`exit-${idx}`} style={styles.conditionRow}>
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color={theme.colors.error}
                />
                <Text style={styles.conditionText}>{condition}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Backtest Results */}
        {strategy.backtestResults && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Backtest Results</Text>
            <Text style={styles.backtestPeriod}>
              Period: {strategy.backtestResults.period}
            </Text>
            <View style={styles.backtestGrid}>
              <View style={styles.backtestItem}>
                <Text style={styles.backtestLabel}>Total Return</Text>
                <Text
                  style={[
                    styles.backtestValue,
                    {
                      color:
                        strategy.backtestResults.totalReturn >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {formatPercent(strategy.backtestResults.totalReturn)}
                </Text>
              </View>
              <View style={styles.backtestItem}>
                <Text style={styles.backtestLabel}>Trades</Text>
                <Text style={styles.backtestValue}>
                  {strategy.backtestResults.tradeCount}
                </Text>
              </View>
              <View style={styles.backtestItem}>
                <Text style={styles.backtestLabel}>Win Rate</Text>
                <Text style={styles.backtestValue}>
                  {(strategy.backtestResults.winRate * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.backtestItem}>
                <Text style={styles.backtestLabel}>Max Drawdown</Text>
                <Text style={[styles.backtestValue, { color: theme.colors.error }]}>
                  {formatPercent(-Math.abs(strategy.backtestResults.maxDrawdown))}
                </Text>
              </View>
              <View style={styles.backtestItem}>
                <Text style={styles.backtestLabel}>Sharpe</Text>
                <Text style={styles.backtestValue}>
                  {strategy.backtestResults.sharpeRatio.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Timeframe */}
        {strategy.timeframe && (
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={20}
                color={theme.colors.primary}
              />
              <View>
                <Text style={styles.infoLabel}>Trading Timeframe</Text>
                <Text style={styles.infoValue}>{strategy.timeframe}</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.paperButton}
          onPress={handlePaperTrade}
        >
          <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.paperButtonText}>Paper Trade</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.liveButton}
          onPress={handleLiveTrade}
        >
          <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.liveButtonText}>Live Trade</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
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
  header: {
    marginBottom: 4,
  },
  riskBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 8,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  strategyName: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  },
  strategyDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
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
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  sectionCard: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  ruleBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  ruleBulletText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  conditionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  backtestPeriod: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  backtestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  backtestItem: {
    width: "31%",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
  },
  backtestLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  backtestValue: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  infoCard: {
    padding: theme.spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  paperButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  paperButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  liveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  liveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
