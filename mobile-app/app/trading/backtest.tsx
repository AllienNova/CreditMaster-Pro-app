/**
 * Backtest Results Screen
 * Lists past backtest results with expandable detail view
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import api from "../../src/services/api/client";
import type { ApiResponse } from "../../src/services/api/types";

interface BacktestResult {
  id: string;
  strategyName: string;
  strategyId?: string;
  symbol?: string;
  period: string;
  startDate: string;
  endDate: string;
  totalReturn: number;
  annualizedReturn?: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradeCount: number;
  winRate: number;
  profitFactor?: number;
  avgWin?: number;
  avgLoss?: number;
  bestTrade?: number;
  worstTrade?: number;
  status: "completed" | "running" | "failed";
  createdAt: string;
}

interface BacktestResponse {
  results: BacktestResult[];
}

export default function BacktestScreen() {
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setError(null);
    try {
      const response: ApiResponse<BacktestResponse> =
        await api.get<BacktestResponse>("/trading/backtest");
      if (response.data?.results) {
        setResults(response.data.results);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load backtest results.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchResults();
    setRefreshing(false);
  }, [fetchResults]);

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderResult = ({ item }: { item: BacktestResult }) => {
    const isExpanded = expandedId === item.id;
    const isPositive = item.totalReturn >= 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleExpand(item.id)}
      >
        <Card style={styles.resultCard}>
          {/* Header Row */}
          <View style={styles.resultHeader}>
            <View style={styles.resultHeaderLeft}>
              <Text style={styles.strategyName}>{item.strategyName}</Text>
              <Text style={styles.periodText}>
                {item.period}
                {item.symbol ? ` | ${item.symbol}` : ""}
              </Text>
            </View>
            <View style={styles.resultHeaderRight}>
              <Text
                style={[
                  styles.returnText,
                  { color: isPositive ? theme.colors.success : theme.colors.error },
                ]}
              >
                {formatPercent(item.totalReturn)}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Summary Metrics */}
          <View style={styles.summaryRow}>
            <MetricChip label="Sharpe" value={item.sharpeRatio.toFixed(2)} />
            <MetricChip
              label="Max DD"
              value={formatPercent(-Math.abs(item.maxDrawdown))}
            />
            <MetricChip label="Trades" value={item.tradeCount.toString()} />
            <MetricChip
              label="Win Rate"
              value={`${(item.winRate * 100).toFixed(0)}%`}
            />
          </View>

          {/* Expanded Details */}
          {isExpanded && (
            <View style={styles.expandedSection}>
              <View style={styles.divider} />
              <View style={styles.detailGrid}>
                <DetailRow label="Period" value={item.period} />
                <DetailRow label="Start" value={formatDate(item.startDate)} />
                <DetailRow label="End" value={formatDate(item.endDate)} />
                <DetailRow
                  label="Total Return"
                  value={formatPercent(item.totalReturn)}
                  valueColor={
                    isPositive ? theme.colors.success : theme.colors.error
                  }
                />
                {item.annualizedReturn !== undefined && (
                  <DetailRow
                    label="Annualized"
                    value={formatPercent(item.annualizedReturn)}
                  />
                )}
                <DetailRow
                  label="Sharpe Ratio"
                  value={item.sharpeRatio.toFixed(2)}
                />
                <DetailRow
                  label="Max Drawdown"
                  value={formatPercent(-Math.abs(item.maxDrawdown))}
                />
                <DetailRow
                  label="Trade Count"
                  value={item.tradeCount.toString()}
                />
                <DetailRow
                  label="Win Rate"
                  value={`${(item.winRate * 100).toFixed(1)}%`}
                />
                {item.profitFactor !== undefined && (
                  <DetailRow
                    label="Profit Factor"
                    value={item.profitFactor.toFixed(2)}
                  />
                )}
                {item.avgWin !== undefined && (
                  <DetailRow
                    label="Avg Win"
                    value={formatPercent(item.avgWin)}
                  />
                )}
                {item.avgLoss !== undefined && (
                  <DetailRow
                    label="Avg Loss"
                    value={formatPercent(item.avgLoss)}
                  />
                )}
                {item.bestTrade !== undefined && (
                  <DetailRow
                    label="Best Trade"
                    value={formatPercent(item.bestTrade)}
                  />
                )}
                {item.worstTrade !== undefined && (
                  <DetailRow
                    label="Worst Trade"
                    value={formatPercent(item.worstTrade)}
                  />
                )}
              </View>
              <Text style={styles.createdAt}>
                Run on {formatDate(item.createdAt)}
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading backtest results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchResults}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.centerState}>
            <Ionicons
              name="flask-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Backtest Results</Text>
            <Text style={styles.emptySubtext}>
              Run a backtest on a trading strategy to see results here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipLabel}>{label}</Text>
      <Text style={styles.metricChipValue}>{value}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: 12,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl * 2,
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
  resultCard: {
    padding: theme.spacing.md,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  resultHeaderLeft: {
    flex: 1,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  periodText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  resultHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  returnText: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  metricChip: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.sm,
    padding: 6,
    alignItems: "center",
  },
  metricChipLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  metricChipValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 1,
  },
  expandedSection: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  detailGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  createdAt: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 12,
    textAlign: "right",
  },
});
