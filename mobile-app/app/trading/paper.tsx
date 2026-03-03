/**
 * Paper Trading Screen
 * Practice trading with virtual money
 */

import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { useTradingStore } from "../../src/store/tradingStore";
import { OrderEntrySheet } from "../../src/components/trading/OrderEntrySheet";
import type { PaperPosition, PaperOrder } from "../../src/services/api/trading";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number, showSign = false): string => {
  const sign = showSign && amount >= 0 ? "+" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
};

// ============================================================================
// COMPONENTS
// ============================================================================

function AccountCard({
  balance,
  equity,
  buyingPower,
  totalPL,
  totalPLPercent,
  onReset,
}: {
  balance: number;
  equity: number;
  buyingPower: number;
  totalPL: number;
  totalPLPercent: number;
  onReset: () => void;
}) {
  const isProfit = totalPL >= 0;

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountBadge}>
          <Ionicons
            name="school-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.accountBadgeText}>Paper Trading</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Ionicons name="refresh-outline" size={16} color="#F59E0B" />
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accountEquity}>
        <Text style={styles.accountEquityLabel}>Account Equity</Text>
        <Text style={styles.accountEquityValue}>{formatCurrency(equity)}</Text>
        <View style={styles.accountPL}>
          <Text
            style={[
              styles.accountPLValue,
              { color: isProfit ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatCurrency(totalPL, true)} ({formatPercent(totalPLPercent)})
          </Text>
        </View>
      </View>

      <View style={styles.accountStats}>
        <View style={styles.accountStatItem}>
          <Text style={styles.accountStatLabel}>Cash Balance</Text>
          <Text style={styles.accountStatValue}>{formatCurrency(balance)}</Text>
        </View>
        <View style={styles.accountStatDivider} />
        <View style={styles.accountStatItem}>
          <Text style={styles.accountStatLabel}>Buying Power</Text>
          <Text style={styles.accountStatValue}>
            {formatCurrency(buyingPower)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PaperPositionCard({
  position,
  onClose,
}: {
  position: PaperPosition;
  onClose: (positionId: string) => void;
}) {
  const isProfit = position.unrealizedPL >= 0;

  const handleClose = () => {
    Alert.alert(
      "Close Position",
      `Close ${position.quantity} shares of ${position.symbol} at market price?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Position",
          style: "destructive",
          onPress: () => onClose(position.id),
        },
      ],
    );
  };

  return (
    <View style={styles.positionCard}>
      <View style={styles.positionHeader}>
        <View style={styles.positionSymbolContainer}>
          <Text style={styles.positionSymbol}>{position.symbol}</Text>
          <View
            style={[
              styles.sideBadge,
              {
                backgroundColor:
                  position.side === "long" ? "#10B98120" : "#EF444420",
              },
            ]}
          >
            <Text
              style={[
                styles.sideBadgeText,
                { color: position.side === "long" ? "#10B981" : "#EF4444" },
              ]}
            >
              {position.side.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.positionPL}>
          <Text
            style={[
              styles.positionPLValue,
              { color: isProfit ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatCurrency(position.unrealizedPL, true)}
          </Text>
          <Text
            style={[
              styles.positionPLPercent,
              { color: isProfit ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatPercent(position.unrealizedPLPercent)}
          </Text>
        </View>
      </View>

      <View style={styles.positionDetails}>
        <View style={styles.positionDetailItem}>
          <Text style={styles.positionDetailLabel}>Qty</Text>
          <Text style={styles.positionDetailValue}>{position.quantity}</Text>
        </View>
        <View style={styles.positionDetailItem}>
          <Text style={styles.positionDetailLabel}>Entry</Text>
          <Text style={styles.positionDetailValue}>
            ${position.avgEntryPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.positionDetailItem}>
          <Text style={styles.positionDetailLabel}>Current</Text>
          <Text style={styles.positionDetailValue}>
            ${position.currentPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.positionDetailItem}>
          <Text style={styles.positionDetailLabel}>Value</Text>
          <Text style={styles.positionDetailValue}>
            {formatCurrency(position.marketValue)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.closePositionButton}
        onPress={handleClose}
      >
        <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
        <Text style={styles.closePositionButtonText}>Close Position</Text>
      </TouchableOpacity>
    </View>
  );
}

function PaperOrderCard({
  order,
  onCancel,
}: {
  order: PaperOrder;
  onCancel: (orderId: string) => void;
}) {
  const isPending = ["pending", "new"].includes(order.status);

  const handleCancel = () => {
    Alert.alert(
      "Cancel Order",
      `Cancel this ${order.side} order for ${order.symbol}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => onCancel(order.id),
        },
      ],
    );
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderSymbolContainer}>
          <Text style={styles.orderSymbol}>{order.symbol}</Text>
          <View
            style={[
              styles.orderSideBadge,
              {
                backgroundColor:
                  order.side === "buy" ? "#10B98120" : "#EF444420",
              },
            ]}
          >
            <Text
              style={[
                styles.orderSideBadgeText,
                { color: order.side === "buy" ? "#10B981" : "#EF4444" },
              ]}
            >
              {order.side.toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.orderStatusBadge,
            {
              backgroundColor:
                order.status === "filled"
                  ? "#10B98120"
                  : isPending
                    ? "#F59E0B20"
                    : "#EF444420",
            },
          ]}
        >
          <Text
            style={[
              styles.orderStatusText,
              {
                color:
                  order.status === "filled"
                    ? "#10B981"
                    : isPending
                      ? "#F59E0B"
                      : "#EF4444",
              },
            ]}
          >
            {order.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.orderDetailText}>
          {order.type.toUpperCase()} · {order.quantity} shares
          {order.limitPrice
            ? ` @ $${order.limitPrice.toFixed(2)}`
            : " @ Market"}
        </Text>
      </View>

      {isPending && (
        <TouchableOpacity
          style={styles.cancelOrderButton}
          onPress={handleCancel}
        >
          <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.cancelOrderButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PaperTradingScreen() {
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [activeTab, setActiveTab] = useState<"positions" | "orders">(
    "positions",
  );

  const {
    paperAccount,
    isLoading,
    isRefreshing,
    fetchPaperAccount,
    resetPaperAccount,
    closePaperPosition,
    cancelPaperOrder,
  } = useTradingStore();

  useEffect(() => {
    fetchPaperAccount();
  }, []);

  const onRefresh = useCallback(() => {
    fetchPaperAccount();
  }, [fetchPaperAccount]);

  const handleReset = () => {
    Alert.alert(
      "Reset Paper Account",
      "This will reset your paper trading account to $100,000 and close all positions. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Account",
          style: "destructive",
          onPress: () => resetPaperAccount(),
        },
      ],
    );
  };

  // Default values
  const balance = paperAccount?.balance ?? 100000;
  const equity = paperAccount?.equity ?? 100000;
  const buyingPower = paperAccount?.buyingPower ?? 100000;
  const positions = paperAccount?.positions ?? [];
  const orders = paperAccount?.orders ?? [];
  const totalPL = equity - 100000;
  const totalPLPercent = totalPL / 100000;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Paper Trading",
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowOrderEntry(true)}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Card */}
        <AccountCard
          balance={balance}
          equity={equity}
          buyingPower={buyingPower}
          totalPL={totalPL}
          totalPLPercent={totalPLPercent}
          onReset={handleReset}
        />

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#3B82F6"
          />
          <Text style={styles.infoBannerText}>
            Practice trading with virtual money. No real funds at risk.
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "positions" && styles.tabActive]}
            onPress={() => setActiveTab("positions")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "positions" && styles.tabTextActive,
              ]}
            >
              Positions ({positions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "orders" && styles.tabActive]}
            onPress={() => setActiveTab("orders")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "orders" && styles.tabTextActive,
              ]}
            >
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading && !paperAccount ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading paper account...</Text>
          </View>
        ) : activeTab === "positions" ? (
          positions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="analytics-outline"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyStateTitle}>No Positions</Text>
              <Text style={styles.emptyStateText}>
                Place an order to open your first paper position
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowOrderEntry(true)}
              >
                <Text style={styles.emptyStateButtonText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {positions.map((position) => (
                <PaperPositionCard
                  key={position.id}
                  position={position}
                  onClose={closePaperPosition}
                />
              ))}
            </View>
          )
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyStateTitle}>No Orders</Text>
            <Text style={styles.emptyStateText}>
              You haven't placed any paper orders yet
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowOrderEntry(true)}
            >
              <Text style={styles.emptyStateButtonText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {orders.map((order) => (
              <PaperOrderCard
                key={order.id}
                order={order}
                onCancel={cancelPaperOrder}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB for New Order */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowOrderEntry(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Order Entry Sheet */}
      <OrderEntrySheet
        visible={showOrderEntry}
        onClose={() => setShowOrderEntry(false)}
        onOrderCreated={() => {
          setShowOrderEntry(false);
          fetchPaperAccount();
        }}
        isPaperTrading={true}
      />
    </View>
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
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  accountBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#F59E0B",
  },
  accountEquity: {
    alignItems: "center",
    marginBottom: 20,
  },
  accountEquityLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  accountEquityValue: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
  },
  accountPL: {
    marginTop: 4,
  },
  accountPLValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  accountStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  accountStatItem: {
    flex: 1,
    alignItems: "center",
  },
  accountStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  accountStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  accountStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#3B82F6",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  emptyStateButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  listContainer: {
    gap: 12,
  },
  positionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  positionSymbolContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  positionSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  positionPL: {
    alignItems: "flex-end",
  },
  positionPLValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  positionPLPercent: {
    fontSize: 13,
    marginTop: 2,
  },
  positionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  positionDetailItem: {
    alignItems: "center",
  },
  positionDetailLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  positionDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  closePositionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  closePositionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderSymbolContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  orderSideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderSideBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderDetails: {
    marginBottom: 8,
  },
  orderDetailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  cancelOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  cancelOrderButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#EF4444",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
