/**
 * Dividends Tracking Screen
 * Displays dividend income summary and holdings list
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import investmentsApi from "../../src/services/api/investments";
import type {
  DividendHolding,
  DividendDataResponse,
} from "../../src/services/api/investments";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const capitalizeFrequency = (freq: string) => {
  if (freq === "semi-annual") return "Semi-Annual";
  return freq.charAt(0).toUpperCase() + freq.slice(1);
};

export default function DividendsScreen() {
  const [data, setData] = useState<DividendDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDividends = useCallback(async () => {
    setError(null);
    try {
      const response = await investmentsApi.getDividends();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(
          response.error?.message || "Failed to fetch dividends",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dividend data",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDividends();
  }, [fetchDividends]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDividends();
  }, [fetchDividends]);

  const renderHolding = ({ item }: { item: DividendHolding }) => (
    <View style={styles.holdingCard}>
      <View style={styles.holdingLeft}>
        <View style={styles.holdingIcon}>
          <Text style={styles.holdingIconText}>
            {item.symbol.slice(0, 2)}
          </Text>
        </View>
        <View style={styles.holdingInfo}>
          <Text style={styles.holdingSymbol}>{item.symbol}</Text>
          <Text style={styles.holdingName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.holdingMeta}>
            {item.shares} shares | {capitalizeFrequency(item.frequency)}
          </Text>
        </View>
      </View>
      <View style={styles.holdingRight}>
        <Text style={styles.holdingIncome}>
          {formatCurrency(item.annualDividend)}
        </Text>
        <View style={styles.yieldBadge}>
          <Text style={styles.yieldText}>{item.yield.toFixed(1)}%</Text>
        </View>
        {item.nextPayDate && (
          <Text style={styles.holdingNextPay}>
            Next: {formatDate(item.nextPayDate)}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading dividends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load dividends</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDividends}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.centered}>
          <Ionicons
            name="cash-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No dividend holdings</Text>
          <Text style={styles.emptyMessage}>
            Add dividend-paying stocks or ETFs to your portfolio to start
            tracking income.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const monthlyIncome = data.totalAnnualIncome / 12;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={data.holdings}
        keyExtractor={(item) => item.symbol}
        renderItem={renderHolding}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Summary Cards */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Annual Income</Text>
                  <Text style={styles.summaryValueGreen}>
                    {formatCurrency(data.totalAnnualIncome)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Avg Yield</Text>
                  <Text style={styles.summaryValue}>
                    {data.averageYield.toFixed(2)}%
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRowSecond}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Monthly Income</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(monthlyIncome)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Holdings</Text>
                  <Text style={styles.summaryValue}>
                    {data.holdings.length}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Section Title */}
            <Text style={styles.sectionTitle}>Dividend Holdings</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No dividend holdings</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl * 2,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 280,
  },
  summaryCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
  },
  summaryRowSecond: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  summaryValueGreen: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
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
  holdingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B98120",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  holdingIconText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  holdingName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  holdingMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: "flex-end",
    marginLeft: theme.spacing.sm,
  },
  holdingIncome: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  yieldBadge: {
    backgroundColor: "#10B98120",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  yieldText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  holdingNextPay: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
