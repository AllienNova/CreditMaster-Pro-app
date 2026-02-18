/**
 * Holdings Management Screen
 * List all holdings with CRUD operations
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  useInvestmentStore,
  selectHoldings,
  selectInvestmentLoading,
} from "../../src/store";
import { Holding } from "../../src/services/api/investments";

type SortKey = "value" | "gainPercent" | "symbol";
type FilterType = "all" | "stocks" | "etfs" | "crypto" | "bonds";

export default function HoldingsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");

  const holdings = useInvestmentStore(selectHoldings);
  const isLoading = useInvestmentStore(selectInvestmentLoading);
  const { fetchPortfolio } = useInvestmentStore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  }, []);

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

  // Filter and sort holdings
  const filteredHoldings = holdings
    .filter((h) => {
      const matchesSearch =
        searchQuery === "" ||
        h.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === "all" || h.asset_type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "value":
          comparison = (b.current_value || 0) - (a.current_value || 0);
          break;
        case "gainPercent":
          comparison = (b.gain_loss_percent || 0) - (a.gain_loss_percent || 0);
          break;
        case "symbol":
          comparison = (a.symbol || "").localeCompare(b.symbol || "");
          break;
      }
      return sortAsc ? -comparison : comparison;
    });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "stocks", label: "Stocks" },
    { key: "etfs", label: "ETFs" },
    { key: "crypto", label: "Crypto" },
    { key: "bonds", label: "Bonds" },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "value", label: "Value" },
    { key: "gainPercent", label: "Gain %" },
    { key: "symbol", label: "Symbol" },
  ];

  const handleDeleteHolding = (holding: Holding) => {
    Alert.alert(
      "Delete Holding",
      `Are you sure you want to delete ${holding.symbol}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `/api/investments/holdings/${holding.id}`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                },
              );
              if (response.ok) {
                Alert.alert("Success", "Holding deleted successfully");
                // Refresh portfolio to reflect deletion
                await fetchPortfolio();
              } else {
                const errorData = await response.json().catch(() => ({}));
                Alert.alert(
                  "Error",
                  errorData.message || "Failed to delete holding",
                );
              }
            } catch (error) {
              console.error("Delete holding error:", error);
              Alert.alert("Error", "Network error. Please try again.");
            }
          },
        },
      ],
    );
  };

  const renderHolding = ({ item: holding }: { item: Holding }) => (
    <TouchableOpacity
      style={styles.holdingCard}
      onPress={() => router.push(`/investments/analyze/${holding.symbol}`)}
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
          <Text style={styles.holdingShares}>
            {holding.quantity} shares @{" "}
            {formatCurrency(holding.average_cost || 0)}
          </Text>
        </View>
      </View>
      <View style={styles.holdingRight}>
        <View style={styles.holdingValues}>
          <Text style={styles.holdingValue}>
            {formatCurrency(holding.current_value || 0)}
          </Text>
          <Text
            style={[
              styles.holdingChange,
              {
                color:
                  (holding.gain_loss_percent || 0) >= 0 ? "#10B981" : "#EF4444",
              },
            ]}
          >
            {formatCurrency(holding.gain_loss || 0)}
          </Text>
          <Text
            style={[
              styles.holdingChangePercent,
              {
                color:
                  (holding.gain_loss_percent || 0) >= 0 ? "#10B981" : "#EF4444",
              },
            ]}
          >
            {formatPercent(holding.gain_loss_percent || 0)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteHolding(holding)}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const totalValue = filteredHoldings.reduce(
    (sum, h) => sum + (h.current_value || 0),
    0,
  );
  const totalGain = filteredHoldings.reduce(
    (sum, h) => sum + (h.gain_loss || 0),
    0,
  );

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
            placeholder="Search holdings..."
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

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterType === item.key && styles.filterChipActive,
              ]}
              onPress={() => setFilterType(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterType === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortChip,
              sortBy === option.key && styles.sortChipActive,
            ]}
            onPress={() => {
              if (sortBy === option.key) {
                setSortAsc(!sortAsc);
              } else {
                setSortBy(option.key);
                setSortAsc(false);
              }
            }}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === option.key && styles.sortChipTextActive,
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.key && (
              <Ionicons
                name={sortAsc ? "arrow-up" : "arrow-down"}
                size={14}
                color={theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Gain/Loss</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totalGain >= 0 ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatCurrency(totalGain)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Holdings</Text>
          <Text style={styles.summaryValue}>{filteredHoldings.length}</Text>
        </View>
      </Card>

      {/* Holdings List */}
      <FlatList
        data={filteredHoldings}
        keyExtractor={(item) =>
          item.id || item.symbol || Math.random().toString()
        }
        renderItem={renderHolding}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="briefcase-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No holdings found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first investment"}
            </Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/investments/add-holding")}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  sortChipActive: {
    backgroundColor: `${theme.colors.primary}20`,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  sortChipTextActive: {
    color: theme.colors.primary,
  },
  summaryCard: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
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
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  holdingShares: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  holdingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  holdingChangePercent: {
    fontSize: 12,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 2,
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
  },
  fab: {
    position: "absolute",
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
