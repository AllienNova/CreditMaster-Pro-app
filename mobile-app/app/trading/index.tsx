/**
 * Trading Dashboard Screen
 * Main trading hub with positions, orders, signals overview, and risk metrics
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { useTradingStore } from "../../src/store/tradingStore";
import { OrderEntrySheet } from "../../src/components/trading/OrderEntrySheet";
import { ScreenHeader } from "../../src/components/ScreenHeader";

// ============================================================================
// TYPES
// ============================================================================

type QuickAction = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "positions",
    title: "Positions",
    icon: "trending-up",
    route: "/trading/positions",
    color: "#10B981",
  },
  {
    id: "orders",
    title: "Orders",
    icon: "list",
    route: "/trading/orders",
    color: "#3B82F6",
  },
  {
    id: "signals",
    title: "Signals",
    icon: "flash",
    route: "/trading/signals",
    color: "#8B5CF6",
  },
  {
    id: "risk",
    title: "Risk",
    icon: "shield-checkmark",
    route: "/trading/risk",
    color: "#F59E0B",
  },
  {
    id: "paper",
    title: "Paper",
    icon: "document-text",
    route: "/trading/paper",
    color: "#6366F1",
  },
  {
    id: "history",
    title: "History",
    icon: "time",
    route: "/trading/history",
    color: "#EC4899",
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  valueColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
      </View>
      <Text
        style={[styles.statValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function RiskBanner({
  canTrade,
  blockReasons,
  riskLevel,
}: {
  canTrade: boolean;
  blockReasons: string[];
  riskLevel: string;
}) {
  if (canTrade) return null;

  return (
    <View style={styles.riskBanner}>
      <View style={styles.riskBannerContent}>
        <Ionicons name="warning" size={24} color="#DC2626" />
        <View style={styles.riskBannerText}>
          <Text style={styles.riskBannerTitle}>Trading Restricted</Text>
          <Text style={styles.riskBannerSubtitle}>
            {blockReasons[0] || "Risk limits exceeded"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={() => router.push(action.route as any)}
    >
      <View
        style={[
          styles.quickActionIcon,
          { backgroundColor: `${action.color}20` },
        ]}
      >
        <Ionicons name={action.icon} size={24} color={action.color} />
      </View>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
    </TouchableOpacity>
  );
}

function PositionItem({ position }: { position: any }) {
  const isProfit = position.unrealizedPL >= 0;

  return (
    <View style={styles.positionItem}>
      <View style={styles.positionLeft}>
        <Text style={styles.positionSymbol}>{position.symbol}</Text>
        <View style={styles.positionMeta}>
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
          <Text style={styles.positionQty}>{position.quantity} shares</Text>
        </View>
      </View>
      <View style={styles.positionRight}>
        <Text
          style={[
            styles.positionPL,
            { color: isProfit ? "#10B981" : "#EF4444" },
          ]}
        >
          {isProfit ? "+" : ""}${position.unrealizedPL.toFixed(2)}
        </Text>
        <Text style={styles.positionPLPercent}>
          {isProfit ? "+" : ""}
          {(position.unrealizedPLPercent * 100).toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

function SignalItem({ signal }: { signal: any }) {
  return (
    <TouchableOpacity style={styles.signalItem}>
      <View
        style={[
          styles.signalIcon,
          {
            backgroundColor: signal.side === "long" ? "#10B98120" : "#EF444420",
          },
        ]}
      >
        <Ionicons
          name={signal.side === "long" ? "trending-up" : "trending-down"}
          size={20}
          color={signal.side === "long" ? "#10B981" : "#EF4444"}
        />
      </View>
      <View style={styles.signalContent}>
        <View style={styles.signalHeader}>
          <Text style={styles.signalSymbol}>{signal.symbol}</Text>
          <View
            style={[
              styles.sideBadge,
              {
                backgroundColor:
                  signal.side === "long" ? "#10B98120" : "#EF444420",
              },
            ]}
          >
            <Text
              style={[
                styles.sideBadgeText,
                { color: signal.side === "long" ? "#10B981" : "#EF4444" },
              ]}
            >
              {signal.side.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.signalSource}>{signal.source.toUpperCase()}</Text>
      </View>
      <View style={styles.signalConfidence}>
        <Text style={styles.signalConfidenceValue}>
          {(signal.confidence * 100).toFixed(0)}%
        </Text>
        <Text style={styles.signalConfidenceLabel}>Confidence</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TradingDashboard() {
  const [showOrderEntry, setShowOrderEntry] = useState(false);

  const {
    openPositions,
    openOrders,
    signals,
    riskMetrics,
    positionSummary,
    isLoading,
    isRefreshing,
    error,
    refreshAll,
    fetchPositions,
    fetchOrders,
    fetchSignals,
    fetchRiskMetrics,
  } = useTradingStore();

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  // Calculate totals
  const totalUnrealizedPL = openPositions.reduce(
    (sum, p) => sum + p.unrealizedPL,
    0,
  );
  const totalMarketValue = openPositions.reduce(
    (sum, p) => sum + p.marketValue,
    0,
  );
  const highConfidenceSignals = signals.filter((s) => s.confidence > 0.8);

  // Format currency
  const formatCurrency = (amount: number) => {
    const sign = amount >= 0 ? "+" : "";
    return `${sign}$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading && openPositions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Trading" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading trading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ScreenHeader
          title="Trading"
          subtitle="Real-time portfolio management"
        />
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/trading/chart" as any)}
            >
              <Ionicons
                name="analytics-outline"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.text}
              />
              {signals.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {signals.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Risk Banner */}
        {riskMetrics && (
          <RiskBanner
            canTrade={riskMetrics.canTrade}
            blockReasons={riskMetrics.blockReasons}
            riskLevel={riskMetrics.riskLevel}
          />
        )}

        {/* Portfolio Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Portfolio Value"
            value={`$${totalMarketValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            subtitle={`${openPositions.length} positions`}
            icon="wallet-outline"
          />
          <StatCard
            title="Unrealized P&L"
            value={formatCurrency(totalUnrealizedPL)}
            subtitle={
              riskMetrics
                ? `Today: ${formatCurrency(riskMetrics.dailyPL)}`
                : undefined
            }
            icon="trending-up-outline"
            valueColor={totalUnrealizedPL >= 0 ? "#10B981" : "#EF4444"}
          />
          <StatCard
            title="Portfolio Heat"
            value={
              riskMetrics
                ? `${(riskMetrics.heatUtilization * 100).toFixed(1)}%`
                : "--"
            }
            subtitle={`of ${riskMetrics ? (riskMetrics.maxHeat * 100).toFixed(0) : "--"}% max`}
            icon="flame-outline"
            valueColor={
              riskMetrics && riskMetrics.heatUtilization > 0.8
                ? "#EF4444"
                : riskMetrics && riskMetrics.heatUtilization > 0.6
                  ? "#F59E0B"
                  : "#10B981"
            }
          />
          <StatCard
            title="Active Signals"
            value={signals.length.toString()}
            subtitle={`${highConfidenceSignals.length} high confidence`}
            icon="flash-outline"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </View>
        </View>

        {/* Open Positions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Positions</Text>
            <TouchableOpacity
              onPress={() => router.push("/trading/positions" as any)}
            >
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {openPositions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="analytics-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>No open positions</Text>
              <Text style={styles.emptyStateSubtext}>
                Place an order to open a position
              </Text>
            </View>
          ) : (
            <View style={styles.positionsList}>
              {openPositions.slice(0, 5).map((position) => (
                <PositionItem key={position.id} position={position} />
              ))}
            </View>
          )}
        </View>

        {/* Active Signals */}
        {signals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Signals</Text>
              <TouchableOpacity
                onPress={() => router.push("/trading/signals" as any)}
              >
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.signalsList}>
              {signals.slice(0, 3).map((signal) => (
                <SignalItem key={signal.id} signal={signal} />
              ))}
            </View>
          </View>
        )}

        {/* Open Orders Summary */}
        {openOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open Orders</Text>
              <TouchableOpacity
                onPress={() => router.push("/trading/orders" as any)}
              >
                <Text style={styles.sectionLink}>
                  View All ({openOrders.length})
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ordersPreview}>
              <Text style={styles.ordersPreviewText}>
                {openOrders.length} pending order
                {openOrders.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* New Order FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowOrderEntry(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Order Entry Sheet */}
      <OrderEntrySheet
        visible={showOrderEntry}
        onClose={() => setShowOrderEntry(false)}
        onOrderCreated={() => {
          setShowOrderEntry(false);
          refreshAll();
        }}
      />
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  riskBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  riskBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  riskBannerText: {
    flex: 1,
  },
  riskBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
  riskBannerSubtitle: {
    fontSize: 14,
    color: "#B91C1C",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 4,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  statSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sectionLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 12,
  },
  quickActionCard: {
    width: "30%",
    alignItems: "center",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  positionsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  positionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  positionLeft: {
    flex: 1,
  },
  positionSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  positionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sideBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  positionQty: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  positionRight: {
    alignItems: "flex-end",
  },
  positionPL: {
    fontSize: 16,
    fontWeight: "600",
  },
  positionPLPercent: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  signalsList: {
    gap: 8,
  },
  signalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    gap: 12,
  },
  signalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  signalContent: {
    flex: 1,
  },
  signalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signalSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  signalSource: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  signalConfidence: {
    alignItems: "flex-end",
  },
  signalConfidenceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  signalConfidenceLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  ordersPreview: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    alignItems: "center",
  },
  ordersPreviewText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
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
