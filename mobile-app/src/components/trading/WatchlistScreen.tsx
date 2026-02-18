/**
 * Fynvita Mobile Watchlist Screen
 * Real-time watchlist with mini charts and trading signals
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { lightTheme as theme } from "../../constants/theme";

// ============================================================================
// TYPES
// ============================================================================

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal?: "buy" | "sell" | "hold";
  signalStrength?: number;
  priceHistory: number[];
}

export interface WatchlistScreenProps {
  items: WatchlistItem[];
  onItemPress?: (symbol: string) => void;
  onTradePress?: (symbol: string, side: "buy" | "sell") => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

// ============================================================================
// MINI SPARKLINE
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

function Sparkline({ data, width = 60, height = 24, color }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = color || (isPositive ? "#26a69a" : "#ef5350");

  return (
    <Svg width={width} height={height}>
      <Path
        d={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ============================================================================
// SIGNAL BADGE
// ============================================================================

interface SignalBadgeProps {
  signal: "buy" | "sell" | "hold";
  strength?: number;
}

function SignalBadge({ signal, strength }: SignalBadgeProps) {
  const config = {
    buy: { bg: "#26a69a20", color: "#26a69a", icon: "▲" },
    sell: { bg: "#ef535020", color: "#ef5350", icon: "▼" },
    hold: { bg: "#78909c20", color: "#78909c", icon: "●" },
  };

  const { bg, color, icon } = config[signal];

  return (
    <View style={[styles.signalBadge, { backgroundColor: bg }]}>
      <Text style={[styles.signalIcon, { color }]}>{icon}</Text>
      <Text style={[styles.signalText, { color }]}>{signal.toUpperCase()}</Text>
      {strength !== undefined && (
        <Text style={[styles.signalStrength, { color }]}>{strength}%</Text>
      )}
    </View>
  );
}

// ============================================================================
// WATCHLIST ITEM ROW
// ============================================================================

interface WatchlistRowProps {
  item: WatchlistItem;
  onPress: () => void;
  onBuy: () => void;
  onSell: () => void;
}

function WatchlistRow({ item, onPress, onBuy, onSell }: WatchlistRowProps) {
  const isPositive = item.changePercent >= 0;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Symbol & Name */}
      <View style={styles.symbolContainer}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
      </View>

      {/* Sparkline */}
      <View style={styles.chartContainer}>
        <Sparkline data={item.priceHistory} />
      </View>

      {/* Price & Change */}
      <View style={styles.priceContainer}>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        <View
          style={[
            styles.changeBadge,
            { backgroundColor: isPositive ? "#26a69a20" : "#ef535020" },
          ]}
        >
          <Text
            style={[
              styles.changeText,
              { color: isPositive ? "#26a69a" : "#ef5350" },
            ]}
          >
            {isPositive ? "+" : ""}
            {item.changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Signal */}
      {item.signal && (
        <View style={styles.signalContainer}>
          <SignalBadge signal={item.signal} strength={item.signalStrength} />
        </View>
      )}

      {/* Quick Trade Buttons */}
      <View style={styles.tradeButtons}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.buyButton]}
          onPress={onBuy}
        >
          <Text style={styles.tradeButtonText}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tradeButton, styles.sellButton]}
          onPress={onSell}
        >
          <Text style={styles.tradeButtonText}>S</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WatchlistScreen({
  items,
  onItemPress,
  onTradePress,
  onRefresh,
  loading = false,
}: WatchlistScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"symbol" | "change" | "signal">(
    "symbol",
  );

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items.filter(
      (item) =>
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case "symbol":
          return a.symbol.localeCompare(b.symbol);
        case "change":
          return b.changePercent - a.changePercent;
        case "signal":
          const signalOrder = { buy: 3, hold: 2, sell: 1, undefined: 0 };
          return (
            (signalOrder[b.signal || "undefined"] || 0) -
            (signalOrder[a.signal || "undefined"] || 0)
          );
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchQuery, sortBy]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: WatchlistItem }) => (
      <WatchlistRow
        item={item}
        onPress={() => onItemPress?.(item.symbol)}
        onBuy={() => onTradePress?.(item.symbol, "buy")}
        onSell={() => onTradePress?.(item.symbol, "sell")}
      />
    ),
    [onItemPress, onTradePress],
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search symbols..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(["symbol", "change", "signal"] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.sortButton,
              sortBy === option && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy(option)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === option && styles.sortButtonTextActive,
              ]}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Symbol</Text>
        <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
          Chart
        </Text>
        <Text style={[styles.headerText, { flex: 1, textAlign: "right" }]}>
          Price
        </Text>
        <Text style={[styles.headerText, { flex: 1, textAlign: "center" }]}>
          Signal
        </Text>
        <Text style={[styles.headerText, { flex: 0.6, textAlign: "center" }]}>
          Trade
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.symbol}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No matching symbols" : "No items in watchlist"}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {filteredItems.length} of {items.length} symbols
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const { width: screenWidth } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sortButtonTextActive: {
    color: "#fff",
  },
  listHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  symbolContainer: {
    flex: 1.5,
  },
  symbol: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  name: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  chartContainer: {
    flex: 1,
    alignItems: "center",
  },
  priceContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  signalContainer: {
    flex: 1,
    alignItems: "center",
  },
  signalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 2,
  },
  signalIcon: {
    fontSize: 8,
  },
  signalText: {
    fontSize: 9,
    fontWeight: "600",
  },
  signalStrength: {
    fontSize: 8,
  },
  tradeButtons: {
    flex: 0.6,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  tradeButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  buyButton: {
    backgroundColor: "#26a69a",
  },
  sellButton: {
    backgroundColor: "#ef5350",
  },
  tradeButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});

export default WatchlistScreen;
