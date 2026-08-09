/**
 * Positions Screen
 * Position tracking with P&L display and close functionality
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
import { EmptyState } from "../../src/components/EmptyState";
import { useTradingStore } from "../../src/store/tradingStore";
import type { Position } from "../../src/services/api/trading";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
  const sign = amount >= 0 ? "+" : "";
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

function PositionSummaryCard({
  totalValue,
  totalPL,
  positionCount,
  dayPL,
}: {
  totalValue: number;
  totalPL: number;
  positionCount: number;
  dayPL: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Positions</Text>
          <Text style={styles.summaryValue}>{positionCount}</Text>
        </View>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Unrealized P&L</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totalPL >= 0 ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatCurrency(totalPL)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Day P&L</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: dayPL >= 0 ? "#10B981" : "#EF4444" },
            ]}
          >
            {formatCurrency(dayPL)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PositionCard({
  position,
  onClose,
  onSelect,
}: {
  position: Position;
  onClose: (positionId: string) => void;
  onSelect: (symbol: string) => void;
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
    <TouchableOpacity
      style={styles.positionCard}
      onPress={() => onSelect(position.symbol)}
    >
      {/* Header */}
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
            <Ionicons
              name={position.side === "long" ? "trending-up" : "trending-down"}
              size={12}
              color={position.side === "long" ? "#10B981" : "#EF4444"}
            />
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
            {formatCurrency(position.unrealizedPL)}
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

      {/* Details */}
      <View style={styles.positionDetails}>
        <View style={styles.positionDetailRow}>
          <View style={styles.positionDetailItem}>
            <Text style={styles.positionDetailLabel}>Quantity</Text>
            <Text style={styles.positionDetailValue}>{position.quantity}</Text>
          </View>
          <View style={styles.positionDetailItem}>
            <Text style={styles.positionDetailLabel}>Avg Entry</Text>
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
              $
              {position.marketValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Risk Info */}
      {(position.stopLoss || position.takeProfit) && (
        <View style={styles.positionRisk}>
          {position.stopLoss && (
            <View style={styles.positionRiskItem}>
              <Text style={styles.positionRiskLabel}>SL</Text>
              <Text style={styles.positionRiskValue}>
                ${position.stopLoss.toFixed(2)}
              </Text>
            </View>
          )}
          {position.takeProfit && (
            <View style={styles.positionRiskItem}>
              <Text style={styles.positionRiskLabel}>TP</Text>
              <Text style={styles.positionRiskValue}>
                ${position.takeProfit.toFixed(2)}
              </Text>
            </View>
          )}
          {position.riskPercent && (
            <View style={styles.positionRiskItem}>
              <Text style={styles.positionRiskLabel}>Risk</Text>
              <Text style={styles.positionRiskValue}>
                {(position.riskPercent * 100).toFixed(2)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.positionFooter}>
        <TouchableOpacity
          style={styles.chartButton}
          onPress={() =>
            router.push(`/trading/chart?symbol=${position.symbol}` as any)
          }
        >
          <Ionicons
            name="analytics-outline"
            size={18}
            color={theme.colors.primary}
          />
          <Text style={styles.chartButtonText}>Chart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PositionsScreen() {
  const {
    openPositions,
    positionSummary,
    riskMetrics,
    isLoading,
    isRefreshing,
    fetchPositions,
    fetchRiskMetrics,
    closePosition,
    closeAllPositions,
    setSelectedSymbol,
  } = useTradingStore();

  useEffect(() => {
    fetchPositions();
    fetchRiskMetrics();
  }, []);

  const onRefresh = useCallback(() => {
    Promise.all([fetchPositions(), fetchRiskMetrics()]);
  }, [fetchPositions, fetchRiskMetrics]);

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    router.push(`/trading/chart?symbol=${symbol}` as any);
  };

  const handleCloseAll = () => {
    if (openPositions.length === 0) return;

    Alert.alert(
      "Close All Positions",
      `Are you sure you want to close all ${openPositions.length} positions at market price?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close All",
          style: "destructive",
          onPress: closeAllPositions,
        },
      ],
    );
  };

  // Calculate totals
  const totalUnrealizedPL = openPositions.reduce(
    (sum, p) => sum + p.unrealizedPL,
    0,
  );
  const totalMarketValue = openPositions.reduce(
    (sum, p) => sum + p.marketValue,
    0,
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Positions",
          headerRight: () =>
            openPositions.length > 0 ? (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleCloseAll}
              >
                <Text style={styles.headerButtonText}>Close All</Text>
              </TouchableOpacity>
            ) : null,
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
        {/* Summary Card */}
        <PositionSummaryCard
          totalValue={totalMarketValue}
          totalPL={totalUnrealizedPL}
          positionCount={openPositions.length}
          dayPL={riskMetrics?.dailyPL || 0}
        />

        {/* Positions List */}
        {isLoading && openPositions.length === 0 ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading positions...</Text>
          </View>
        ) : openPositions.length === 0 ? (
          <EmptyState
            icon="analytics-outline"
            title="No open positions"
            description="Place an order to open your first trading position"
            actionLabel="Explore Strategies"
            onAction={() => router.push("/trading/strategies" as never)}
          />
        ) : (
          <View style={styles.positionsList}>
            <Text style={styles.sectionTitle}>
              Open Positions ({openPositions.length})
            </Text>
            {openPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onClose={closePosition}
                onSelect={handleSelectSymbol}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
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
    paddingTop: 60,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  positionsList: {
    gap: 12,
  },
  positionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  positionSymbolContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  positionSymbol: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sideBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  positionPL: {
    alignItems: "flex-end",
  },
  positionPLValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  positionPLPercent: {
    fontSize: 13,
    marginTop: 2,
  },
  positionDetails: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  positionDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  positionRisk: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  positionRiskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  positionRiskLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  positionRiskValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },
  positionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${theme.colors.primary}15`,
    borderRadius: 8,
  },
  chartButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
  },
});
