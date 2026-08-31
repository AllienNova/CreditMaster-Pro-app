/**
 * Trading Strategies List Screen
 * Grid/list of available trading strategies with search/filter
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../../src/constants/theme";
import { Card } from "../../../src/components/Card";
import api from "../../../src/services/api/client";
import type { ApiResponse } from "../../../src/services/api/types";
import { toArray } from "../../../src/store/toArray";
import { ScreenHeader } from "../../../src/components/ScreenHeader";

type RiskLevel = "low" | "medium" | "high";

interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  expectedReturn: number;
  requiredCapital: number;
  winRate?: number;
  maxDrawdown?: number;
  category?: string;
  indicators?: string[];
  timeframe?: string;
  isActive?: boolean;
}

interface StrategiesResponse {
  strategies: Strategy[];
}

const RISK_FILTERS: { key: RiskLevel | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low Risk" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High Risk" },
];

export default function StrategiesListScreen() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");

  const fetchStrategies = useCallback(async () => {
    setError(null);
    try {
      const response: ApiResponse<StrategiesResponse> =
        await api.get<StrategiesResponse>("/trading/strategies");
      if (response.data?.strategies) {
        setStrategies(toArray<Strategy>(response?.data?.strategies));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load strategies.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStrategies();
    setRefreshing(false);
  }, [fetchStrategies]);

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

  const getRiskIcon = (risk: RiskLevel): string => {
    switch (risk) {
      case "low":
        return "shield-checkmark-outline";
      case "medium":
        return "shield-half-outline";
      case "high":
        return "warning-outline";
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const filteredStrategies = strategies
    .filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "all" || s.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });

  const renderStrategy = ({ item }: { item: Strategy }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/trading/strategies/${item.id}` as Href)}
    >
      <Card style={styles.strategyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: `${getRiskColor(item.riskLevel)}15` },
              ]}
            >
              <Ionicons
                name={getRiskIcon(item.riskLevel) as keyof typeof Ionicons.glyphMap}
                size={16}
                color={getRiskColor(item.riskLevel)}
              />
              <Text
                style={[
                  styles.riskBadgeText,
                  { color: getRiskColor(item.riskLevel) },
                ]}
              >
                {item.riskLevel.toUpperCase()}
              </Text>
            </View>
            {item.category && (
              <Text style={styles.categoryText}>{item.category}</Text>
            )}
          </View>
        </View>

        <Text style={styles.strategyName}>{item.name}</Text>
        <Text style={styles.strategyDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Expected Return</Text>
            <Text
              style={[styles.metricValue, { color: theme.colors.success }]}
            >
              {formatPercent(item.expectedReturn)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Min. Capital</Text>
            <Text style={styles.metricValue}>
              {formatCurrency(item.requiredCapital)}
            </Text>
          </View>
          {item.winRate !== undefined && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Win Rate</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(item.winRate)}
                </Text>
              </View>
            </>
          )}
        </View>

        {item.timeframe && (
          <View style={styles.timeframeRow}>
            <Ionicons
              name="time-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.timeframeText}>{item.timeframe}</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScreenHeader title="Strategies" />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading strategies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScreenHeader title="Strategies" />
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchStrategies}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScreenHeader title="Strategies" />

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
            placeholder="Search strategies..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Risk Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={RISK_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                riskFilter === item.key && styles.filterChipActive,
              ]}
              onPress={() => setRiskFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  riskFilter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Strategy List */}
      <FlatList
        data={filteredStrategies}
        keyExtractor={(item) => item.id}
        renderItem={renderStrategy}
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
              name="bulb-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Strategies Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || riskFilter !== "all"
                ? "Try adjusting your search or filter"
                : "No trading strategies available yet"}
            </Text>
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
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  searchBar: {
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
  filterContainer: {
    marginBottom: theme.spacing.sm,
  },
  filterList: {
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
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
  strategyCard: {
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  strategyName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  strategyDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  timeframeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  timeframeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
