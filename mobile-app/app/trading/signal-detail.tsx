/**
 * Signal Detail Screen
 *
 * Deep-dive view for an individual trading signal showing entry/exit rules,
 * AI rationale, risk metrics, and trade action button.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// ============================================================================
// TYPES
// ============================================================================

type SignalSource = "pctt" | "rule" | "ml" | "llm" | "fused";
type SignalStatus = "active" | "triggered" | "expired" | "cancelled";

interface SignalDetail {
  id: string;
  symbol: string;
  timestamp: string;
  source: SignalSource;
  type: "entry" | "exit";
  side: "long" | "short";
  strength: number;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  targets?: number[];
  rationale?: string;
  expiresAt?: string;
  status: SignalStatus;
  metadata?: {
    regime?: string;
    pivotType?: string;
    confluenceScore?: number;
    engines?: Record<string, { side: string; confidence: number }>;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getSourceColor(source: SignalSource): string {
  switch (source) {
    case "pctt":
      return theme.colors.primary;
    case "rule":
      return theme.colors.secondary;
    case "ml":
      return theme.colors.accent;
    case "llm":
      return "#F59E0B";
    case "fused":
      return "#EC4899";
  }
}

function getSourceLabel(source: SignalSource): string {
  switch (source) {
    case "pctt":
      return "PCTT Pipeline";
    case "rule":
      return "Rule-Based";
    case "ml":
      return "Machine Learning";
    case "llm":
      return "LLM Analysis";
    case "fused":
      return "Fused Signal";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return theme.colors.success;
  if (confidence >= 0.6) return theme.colors.warning;
  return theme.colors.error;
}

function getStatusColor(status: SignalStatus): string {
  switch (status) {
    case "active":
      return theme.colors.success;
    case "triggered":
      return theme.colors.primary;
    case "expired":
      return theme.colors.textMuted;
    case "cancelled":
      return theme.colors.error;
  }
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MetricRow({
  label,
  value,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLabel}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={theme.colors.textSecondary}
            style={styles.metricIcon}
          />
        )}
        <Text style={styles.metricLabelText}>{label}</Text>
      </View>
      <Text
        style={[styles.metricValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

function EngineCard({
  name,
  side,
  confidence,
}: {
  name: string;
  side: string;
  confidence: number;
}) {
  return (
    <View style={styles.engineCard}>
      <Text style={styles.engineName}>{name}</Text>
      <View style={styles.engineDetails}>
        <View
          style={[
            styles.sideBadgeSmall,
            {
              backgroundColor:
                side === "long"
                  ? theme.colors.success + "20"
                  : theme.colors.error + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.sideBadgeSmallText,
              {
                color:
                  side === "long" ? theme.colors.success : theme.colors.error,
              },
            ]}
          >
            {side.toUpperCase()}
          </Text>
        </View>
        <Text
          style={[
            styles.engineConfidence,
            { color: getConfidenceColor(confidence) },
          ]}
        >
          {formatPercent(confidence)}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignalDetailScreen() {
  const { id, signalData } = useLocalSearchParams<{
    id: string;
    signalData?: string;
  }>();

  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSignal = useCallback(async () => {
    try {
      // Try to parse passed signal data first
      if (signalData && !signal) {
        const parsed = JSON.parse(signalData) as SignalDetail;
        setSignal(parsed);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const res = await fetch(
        `${API_BASE}/api/trading/signals?action=active&limit=50`,
      );
      if (res.ok) {
        const json = await res.json();
        const found = json.data?.signals?.find(
          (s: SignalDetail) => s.id === id,
        );
        if (found) setSignal(found);
      }
    } catch {
      // Signal data was passed or API unavailable
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, signalData, signal]);

  useEffect(() => {
    fetchSignal();
  }, [fetchSignal]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSignal(null); // Force refetch from API
    fetchSignal();
  }, [fetchSignal]);

  const handleTradeFromSignal = () => {
    if (!signal) return;
    router.push({
      pathname: "/trading/orders",
      params: {
        symbol: signal.symbol,
        side: signal.side === "long" ? "buy" : "sell",
        signalId: signal.id,
      },
    });
  };

  const handleCancelSignal = () => {
    Alert.alert("Cancel Signal", "Are you sure you want to cancel this signal?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/api/trading/signals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cancel", signalId: id }),
            });
            router.back();
          } catch {
            Alert.alert("Error", "Failed to cancel signal");
          }
        },
      },
    ]);
  };

  // Loading
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading signal...</Text>
      </View>
    );
  }

  // Not found
  if (!signal) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Signal Not Found</Text>
        <Text style={styles.emptySubtitle}>
          This signal may have expired or been cancelled.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskReward =
    signal.entryPrice && signal.stopLoss && signal.targets?.[0]
      ? Math.abs(signal.targets[0] - signal.entryPrice) /
        Math.abs(signal.entryPrice - signal.stopLoss)
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.symbolText}>{signal.symbol}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(signal.status) + "20" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(signal.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(signal.status) },
              ]}
            >
              {signal.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.headerMeta}>
          <View
            style={[
              styles.sideBadge,
              {
                backgroundColor:
                  signal.side === "long"
                    ? theme.colors.success + "20"
                    : theme.colors.error + "20",
              },
            ]}
          >
            <Ionicons
              name={signal.side === "long" ? "trending-up" : "trending-down"}
              size={16}
              color={
                signal.side === "long"
                  ? theme.colors.success
                  : theme.colors.error
              }
            />
            <Text
              style={[
                styles.sideText,
                {
                  color:
                    signal.side === "long"
                      ? theme.colors.success
                      : theme.colors.error,
                },
              ]}
            >
              {signal.side.toUpperCase()} {signal.type.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.sourceBadge,
              { backgroundColor: getSourceColor(signal.source) + "20" },
            ]}
          >
            <Text
              style={[
                styles.sourceText,
                { color: getSourceColor(signal.source) },
              ]}
            >
              {getSourceLabel(signal.source)}
            </Text>
          </View>
        </View>
      </View>

      {/* Confidence & Strength */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Signal Strength</Text>
        <View style={styles.gaugeRow}>
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>Confidence</Text>
            <Text
              style={[
                styles.gaugeValue,
                { color: getConfidenceColor(signal.confidence) },
              ]}
            >
              {formatPercent(signal.confidence)}
            </Text>
            <View style={styles.gaugeBar}>
              <View
                style={[
                  styles.gaugeBarFill,
                  {
                    width: `${signal.confidence * 100}%`,
                    backgroundColor: getConfidenceColor(signal.confidence),
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.gaugeDivider} />
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>Strength</Text>
            <Text
              style={[
                styles.gaugeValue,
                { color: getConfidenceColor(signal.strength) },
              ]}
            >
              {formatPercent(signal.strength)}
            </Text>
            <View style={styles.gaugeBar}>
              <View
                style={[
                  styles.gaugeBarFill,
                  {
                    width: `${signal.strength * 100}%`,
                    backgroundColor: getConfidenceColor(signal.strength),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Price Levels */}
      {(signal.entryPrice || signal.stopLoss || signal.targets) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Levels</Text>
          {signal.entryPrice && (
            <MetricRow
              label="Entry Price"
              value={formatPrice(signal.entryPrice)}
              icon="enter-outline"
            />
          )}
          {signal.stopLoss && (
            <MetricRow
              label="Stop Loss"
              value={formatPrice(signal.stopLoss)}
              valueColor={theme.colors.error}
              icon="shield-outline"
            />
          )}
          {signal.targets?.map((target, i) => (
            <MetricRow
              key={i}
              label={`Target ${i + 1}`}
              value={formatPrice(target)}
              valueColor={theme.colors.success}
              icon="flag-outline"
            />
          ))}
          {riskReward && (
            <MetricRow
              label="Risk/Reward"
              value={`1:${riskReward.toFixed(2)}`}
              valueColor={
                riskReward >= 2 ? theme.colors.success : theme.colors.warning
              }
              icon="swap-vertical-outline"
            />
          )}
        </View>
      )}

      {/* AI Rationale */}
      {signal.rationale && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons
              name="bulb-outline"
              size={18}
              color={theme.colors.accent}
            />
            <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>
              AI Rationale
            </Text>
          </View>
          <Text style={styles.rationaleText}>{signal.rationale}</Text>
        </View>
      )}

      {/* Engine Breakdown (for fused signals) */}
      {signal.metadata?.engines && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Engine Breakdown</Text>
          <View style={styles.engineGrid}>
            {Object.entries(signal.metadata.engines).map(([name, data]) => (
              <EngineCard
                key={name}
                name={name.toUpperCase()}
                side={data.side}
                confidence={data.confidence}
              />
            ))}
          </View>
        </View>
      )}

      {/* Signal Metadata */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <MetricRow
          label="Generated"
          value={formatTimestamp(signal.timestamp)}
          icon="time-outline"
        />
        {signal.expiresAt && (
          <MetricRow
            label="Expires"
            value={formatTimestamp(signal.expiresAt)}
            icon="hourglass-outline"
          />
        )}
        {signal.metadata?.regime && (
          <MetricRow
            label="Market Regime"
            value={signal.metadata.regime}
            icon="analytics-outline"
          />
        )}
        {signal.metadata?.pivotType && (
          <MetricRow
            label="Pivot Type"
            value={signal.metadata.pivotType}
            icon="git-branch-outline"
          />
        )}
        {signal.metadata?.confluenceScore != null && (
          <MetricRow
            label="Confluence"
            value={formatPercent(signal.metadata.confluenceScore)}
            icon="layers-outline"
          />
        )}
      </View>

      {/* Actions */}
      {signal.status === "active" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.tradeButton}
            onPress={handleTradeFromSignal}
          >
            <Ionicons name="swap-horizontal" size={20} color={theme.colors.white} />
            <Text style={styles.tradeButtonText}>Trade This Signal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSignal}
          >
            <Ionicons name="close-circle-outline" size={20} color={theme.colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Signal</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  content: {
    padding: theme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyTitle: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  emptySubtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  backButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.white,
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.md,
  },

  // Header
  header: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.md,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  symbolText: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  headerMeta: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  sideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  sideText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  sourceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  sourceText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },

  // Gauges
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gaugeItem: {
    flex: 1,
    alignItems: "center",
  },
  gaugeDivider: {
    width: 1,
    height: 48,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  gaugeLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  gaugeValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    marginBottom: 6,
  },
  gaugeBar: {
    width: "80%",
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
  },
  gaugeBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Metrics
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  metricLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    marginRight: 8,
  },
  metricLabelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },

  // Engine Cards
  engineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  engineCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    minWidth: "45%",
    flex: 1,
  },
  engineName: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  engineDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  engineConfidence: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  sideBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  sideBadgeSmallText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
  },

  // Rationale
  rationaleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },

  // Actions
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  tradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadow.md,
  },
  tradeButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error + "40",
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
