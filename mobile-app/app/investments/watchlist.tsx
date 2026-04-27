/**
 * Watchlist Screen
 * Track stocks you're interested in
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { useInvestmentStore, selectWatchlist } from "../../src/store";

export default function WatchlistScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");

  const watchlist = useInvestmentStore(selectWatchlist);
  const addToWatchlist = useInvestmentStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useInvestmentStore((s) => s.removeFromWatchlist);
  const getRecommendation = useInvestmentStore((s) => s.getRecommendation);

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

  const handleAddSymbol = () => {
    if (!newSymbol.trim()) {
      Alert.alert("Error", "Please enter a stock symbol");
      return;
    }

    const symbol = newSymbol.trim().toUpperCase();

    // Check if already in watchlist
    if (watchlist.some((item) => item.symbol === symbol)) {
      Alert.alert("Already Added", `${symbol} is already in your watchlist`);
      return;
    }

    // Add to watchlist with placeholder data (will be updated when fetched)
    addToWatchlist({
      symbol,
      name: symbol,
      price: 0,
      change: 0,
      changePercent: 0,
    });

    // Fetch real data
    getRecommendation(symbol);

    setNewSymbol("");
    setShowAddModal(false);
  };

  const handleRemoveFromWatchlist = (symbol: string) => {
    Alert.alert(
      "Remove from Watchlist",
      `Remove ${symbol} from your watchlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromWatchlist(symbol),
        },
      ],
    );
  };

  const renderWatchlistItem = ({ item }: { item: (typeof watchlist)[0] }) => (
    <TouchableOpacity
      style={styles.watchlistCard}
      onPress={() => router.push(`/investments/analyze/${item.symbol}`)}
    >
      <View style={styles.itemInfo}>
        <View style={styles.itemIcon}>
          <Text style={styles.itemIconText}>
            {item.symbol.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemSymbol}>{item.symbol}</Text>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <View style={styles.itemValues}>
          <Text style={styles.itemPrice}>
            {item.price > 0 ? formatCurrency(item.price) : "..."}
          </Text>
          {item.price > 0 && (
            <Text
              style={[
                styles.itemChange,
                { color: item.changePercent >= 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {formatPercent(item.changePercent)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromWatchlist(item.symbol)}
        >
          <Ionicons
            name="close-circle"
            size={22}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Default watchlist suggestions
  const suggestions = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "TSLA",
    "NVDA",
    "META",
    "JPM",
  ];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Quick Add Suggestions */}
      {watchlist.length === 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Popular Stocks</Text>
          <Text style={styles.suggestionsSubtitle}>
            Tap to add to your watchlist
          </Text>
          <View style={styles.suggestionsList}>
            {suggestions.map((symbol) => (
              <TouchableOpacity
                key={symbol}
                style={styles.suggestionChip}
                onPress={() => {
                  addToWatchlist({
                    symbol,
                    name: symbol,
                    price: 0,
                    change: 0,
                    changePercent: 0,
                  });
                  getRecommendation(symbol);
                }}
              >
                <Text style={styles.suggestionText}>{symbol}</Text>
                <Ionicons name="add" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Watchlist */}
      <FlatList
        data={watchlist}
        keyExtractor={(item) => item.symbol}
        renderItem={renderWatchlistItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="Watchlist is empty"
            description="Add stocks to track their performance and get alerts"
            actionLabel="Add Stocks"
            onAction={() => setShowAddModal(true)}
          />
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Watchlist</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter a stock symbol to add to your watchlist
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter symbol (e.g., AAPL)"
              placeholderTextColor={theme.colors.textSecondary}
              value={newSymbol}
              onChangeText={setNewSymbol}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleAddSymbol}
              >
                <Text style={styles.modalButtonPrimaryText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Add in Modal */}
            <View style={styles.modalQuickAdd}>
              <Text style={styles.quickAddTitle}>Quick Add:</Text>
              <View style={styles.quickAddList}>
                {suggestions.slice(0, 4).map((symbol) => (
                  <TouchableOpacity
                    key={symbol}
                    style={styles.quickAddChip}
                    onPress={() => {
                      setNewSymbol(symbol);
                    }}
                  >
                    <Text style={styles.quickAddText}>{symbol}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  suggestionsContainer: {
    padding: theme.spacing.lg,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  suggestionsSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  watchlistCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  itemIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  itemDetails: {
    flex: 1,
  },
  itemSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  itemName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemValues: {
    alignItems: "flex-end",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  itemChange: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  modalInput: {
    height: 52,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalButtonPrimary: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalQuickAdd: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  quickAddList: {
    flexDirection: "row",
    gap: 8,
  },
  quickAddChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
});
