/**
 * Trading Signals Screen
 * Display and manage AI-generated trading signals
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
  TextInput,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";
import { useTradingStore } from "../../src/store/tradingStore";
import { OrderEntrySheet } from "../../src/components/trading/OrderEntrySheet";
import type {
  TradingSignal,
  SignalSource,
} from "../../src/services/api/trading";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getSourceColor = (source: SignalSource): string => {
  switch (source) {
    case "pctt":
      return "#8B5CF6";
    case "rule":
      return "#3B82F6";
    case "ml":
      return "#10B981";
    case "llm":
      return "#EC4899";
    case "fused":
    default:
      return "#F59E0B";
  }
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return "#10B981";
  if (confidence >= 0.6) return "#F59E0B";
  return "#EF4444";
};

// ============================================================================
// COMPONENTS
// ============================================================================

function SignalsSummaryCard({
  total,
  bySource,
  avgConfidence,
}: {
  total: number;
  bySource: Record<SignalSource, number>;
  avgConfidence: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryLabel}>Active Signals</Text>
        </View>
        <View style={styles.summaryConfidence}>
          <Text
            style={[
              styles.confidenceValue,
              { color: getConfidenceColor(avgConfidence) },
            ]}
          >
            {(avgConfidence * 100).toFixed(0)}%
          </Text>
          <Text style={styles.confidenceLabel}>Avg Confidence</Text>
        </View>
      </View>
      <View style={styles.sourceBadges}>
        {Object.entries(bySource).map(([source, count]) =>
          count > 0 ? (
            <View
              key={source}
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: `${getSourceColor(source as SignalSource)}20`,
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceBadgeText,
                  { color: getSourceColor(source as SignalSource) },
                ]}
              >
                {source.toUpperCase()}: {count}
              </Text>
            </View>
          ) : null,
        )}
      </View>
    </View>
  );
}

function AnalyzeSymbolCard({
  onAnalyze,
  isAnalyzing,
}: {
  onAnalyze: (symbol: string) => void;
  isAnalyzing: boolean;
}) {
  const [symbol, setSymbol] = useState("");

  const handleAnalyze = () => {
    if (!symbol.trim()) {
      Alert.alert("Error", "Please enter a symbol");
      return;
    }
    onAnalyze(symbol.toUpperCase());
  };

  return (
    <View style={styles.analyzeCard}>
      <Text style={styles.analyzeTitle}>Analyze Symbol</Text>
      <Text style={styles.analyzeSubtitle}>
        Get AI-powered trading signals for any symbol
      </Text>
      <View style={styles.analyzeInputRow}>
        <TextInput
          style={styles.analyzeInput}
          value={symbol}
          onChangeText={(text) => setSymbol(text.toUpperCase())}
          placeholder="Enter symbol (e.g., AAPL)"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="characters"
          editable={!isAnalyzing}
        />
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            isAnalyzing && styles.analyzeButtonDisabled,
          ]}
          onPress={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyze</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SignalCard({
  signal,
  onTrade,
  onCancel,
}: {
  signal: TradingSignal;
  onTrade: (signal: TradingSignal) => void;
  onCancel: (signalId: string) => void;
}) {
  const isLong = signal.side === "long";

  return (
    <View style={styles.signalCard}>
      {/* Header */}
      <View style={styles.signalHeader}>
        <View style={styles.signalSymbolContainer}>
          <View
            style={[
              styles.signalIcon,
              { backgroundColor: isLong ? "#10B98120" : "#EF444420" },
            ]}
          >
            <Ionicons
              name={isLong ? "trending-up" : "trending-down"}
              size={24}
              color={isLong ? "#10B981" : "#EF4444"}
            />
          </View>
          <View>
            <View style={styles.signalSymbolRow}>
              <Text style={styles.signalSymbol}>{signal.symbol}</Text>
              <View
                style={[
                  styles.sideBadge,
                  { backgroundColor: isLong ? "#10B98120" : "#EF444420" },
                ]}
              >
                <Text
                  style={[
                    styles.sideBadgeText,
                    { color: isLong ? "#10B981" : "#EF4444" },
                  ]}
                >
                  {signal.side.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.signalSourceRow}>
              <View
                style={[
                  styles.sourceBadge,
                  { backgroundColor: `${getSourceColor(signal.source)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.sourceBadgeText,
                    { color: getSourceColor(signal.source) },
                  ]}
                >
                  {signal.source.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.signalConfidence}>
          <Text
            style={[
              styles.confidenceValue,
              { color: getConfidenceColor(signal.confidence) },
            ]}
          >
            {(signal.confidence * 100).toFixed(0)}%
          </Text>
          <Text style={styles.confidenceLabel}>Confidence</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.signalDetails}>
        {signal.entryPrice && (
          <View style={styles.signalDetailItem}>
            <Text style={styles.signalDetailLabel}>Entry</Text>
            <Text style={styles.signalDetailValue}>
              ${signal.entryPrice.toFixed(2)}
            </Text>
          </View>
        )}
        {signal.stopLoss && (
          <View style={styles.signalDetailItem}>
            <Text style={styles.signalDetailLabel}>Stop Loss</Text>
            <Text style={[styles.signalDetailValue, { color: "#EF4444" }]}>
              ${signal.stopLoss.toFixed(2)}
            </Text>
          </View>
        )}
        {signal.targets && signal.targets[0] && (
          <View style={styles.signalDetailItem}>
            <Text style={styles.signalDetailLabel}>Target</Text>
            <Text style={[styles.signalDetailValue, { color: "#10B981" }]}>
              ${signal.targets[0].toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.signalDetailItem}>
          <Text style={styles.signalDetailLabel}>Strength</Text>
          <View style={styles.strengthBar}>
            <View
              style={[
                styles.strengthFill,
                {
                  width: `${signal.strength * 100}%`,
                  backgroundColor: getConfidenceColor(signal.strength),
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Rationale */}
      {signal.rationale && (
        <View style={styles.rationaleContainer}>
          <Text style={styles.rationaleText}>{signal.rationale}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.signalActions}>
        <TouchableOpacity
          style={styles.cancelSignalButton}
          onPress={() => onCancel(signal.id)}
        >
          <Ionicons
            name="close-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.cancelSignalText}>Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tradeButton,
            { backgroundColor: isLong ? "#10B981" : "#EF4444" },
          ]}
          onPress={() => onTrade(signal)}
        >
          <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
          <Text style={styles.tradeButtonText}>Trade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignalsScreen() {
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const {
    signals,
    signalSummary,
    isLoading,
    isRefreshing,
    fetchSignals,
    analyzeSymbol,
    cancelSignal,
    refreshAll,
  } = useTradingStore();

  useEffect(() => {
    fetchSignals();
  }, []);

  const onRefresh = useCallback(() => {
    fetchSignals();
  }, [fetchSignals]);

  const handleAnalyze = async (symbol: string) => {
    setIsAnalyzing(true);
    try {
      const signal = await analyzeSymbol(symbol);
      if (signal) {
        Alert.alert(
          "Signal Generated",
          `${signal.side.toUpperCase()} signal for ${symbol} with ${(signal.confidence * 100).toFixed(0)}% confidence`,
          [
            { text: "Dismiss", style: "cancel" },
            {
              text: "Trade Now",
              onPress: () => handleTrade(signal),
            },
          ],
        );
        fetchSignals(); // Refresh signals list
      } else {
        Alert.alert("No Signal", `No trading signal generated for ${symbol}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTrade = (signal: TradingSignal) => {
    setSelectedSignal(signal);
    setShowOrderEntry(true);
  };

  const handleCancelSignal = (signalId: string) => {
    Alert.alert(
      "Dismiss Signal",
      "Are you sure you want to dismiss this signal?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => cancelSignal(signalId) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Trading Signals",
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/trading/chart" as any)}
            >
              <Ionicons
                name="analytics-outline"
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
        {/* Summary */}
        {signalSummary && (
          <SignalsSummaryCard
            total={signalSummary.active}
            bySource={signalSummary.bySource}
            avgConfidence={signalSummary.avgConfidence}
          />
        )}

        {/* Analyze Symbol */}
        <AnalyzeSymbolCard
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />

        {/* Signals List */}
        {isLoading && signals.length === 0 ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading signals...</Text>
          </View>
        ) : signals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="flash-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyStateTitle}>No Active Signals</Text>
            <Text style={styles.emptyStateText}>
              Analyze a symbol to generate trading signals
            </Text>
          </View>
        ) : (
          <View style={styles.signalsList}>
            <Text style={styles.sectionTitle}>
              Active Signals ({signals.length})
            </Text>
            {signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onTrade={handleTrade}
                onCancel={handleCancelSignal}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Order Entry Sheet */}
      <OrderEntrySheet
        visible={showOrderEntry}
        onClose={() => {
          setShowOrderEntry(false);
          setSelectedSignal(null);
        }}
        symbol={selectedSignal?.symbol}
        currentPrice={selectedSignal?.entryPrice}
        suggestedSide={selectedSignal?.side === "long" ? "buy" : "sell"}
        suggestedStopLoss={selectedSignal?.stopLoss}
        suggestedTakeProfit={selectedSignal?.targets?.[0]}
        onOrderCreated={() => {
          setShowOrderEntry(false);
          setSelectedSignal(null);
          refreshAll();
        }}
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
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryMain: {},
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  summaryConfidence: {
    alignItems: "flex-end",
  },
  confidenceValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  confidenceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sourceBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  analyzeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  analyzeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  analyzeSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  analyzeInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  analyzeInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 110,
    justifyContent: "center",
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  signalsList: {
    gap: 12,
  },
  signalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  signalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  signalSymbolContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  signalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  signalSymbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signalSymbol: {
    fontSize: 20,
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
  signalSourceRow: {
    marginTop: 4,
  },
  signalConfidence: {
    alignItems: "flex-end",
  },
  signalDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  signalDetailItem: {
    flex: 1,
    minWidth: "40%",
  },
  signalDetailLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  signalDetailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  strengthBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  strengthFill: {
    height: "100%",
    borderRadius: 4,
  },
  rationaleContainer: {
    marginBottom: 12,
  },
  rationaleText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  signalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelSignalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  cancelSignalText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tradeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tradeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
