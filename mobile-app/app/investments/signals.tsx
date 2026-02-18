/**
 * Trading Signals Mobile Screen
 *
 * Phase 5.5.1: Mobile-optimized trading signals with swipe gestures,
 * pull-to-refresh, and bottom sheet filters
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

const { width, height } = Dimensions.get("window");

// ============================================================================
// TYPES
// ============================================================================

enum SignalType {
  BUY = "buy",
  SELL = "sell",
  HOLD = "hold",
  STRONG_BUY = "strong_buy",
  STRONG_SELL = "strong_sell",
}

enum SignalStatus {
  ACTIVE = "active",
  EXECUTED = "executed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

enum AnalysisType {
  TECHNICAL = "technical",
  FUNDAMENTAL = "fundamental",
  SENTIMENT = "sentiment",
  AI_COMBINED = "ai_combined",
  MOMENTUM = "momentum",
  MEAN_REVERSION = "mean_reversion",
}

interface TradingSignal {
  id: string;
  symbol: string;
  assetType: "stock" | "etf" | "crypto" | "option";
  signalType: SignalType;
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  reasoning: string;
  analysisTypes: AnalysisType[];
  timeframe: string;
  generatedAt: Date;
  status: SignalStatus;
}

interface SignalPerformance {
  totalSignals: number;
  profitableSignals: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  totalReturn: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignalsScreen() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [performance, setPerformance] = useState<SignalPerformance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPerformance, setShowPerformance] = useState(true);

  // Filter states
  const [selectedTypes, setSelectedTypes] = useState<SignalType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<SignalStatus[]>([
    SignalStatus.ACTIVE,
  ]);
  const [minConfidence, setMinConfidence] = useState(0);
  const [timeframe, setTimeframe] = useState<string>("all");

  // Fetch signals
  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTypes.length > 0)
        params.append("types", selectedTypes.join(","));
      if (selectedStatuses.length > 0)
        params.append("statuses", selectedStatuses.join(","));
      if (minConfidence > 0)
        params.append("minConfidence", minConfidence.toString());
      if (timeframe !== "all") params.append("timeframe", timeframe);

      const [signalsRes, perfRes] = await Promise.all([
        fetch(`/api/investments/signals?${params.toString()}`),
        fetch("/api/investments/signals/history"),
      ]);

      if (signalsRes.ok && perfRes.ok) {
        const signalsData = await signalsRes.json();
        const perfData = await perfRes.json();
        setSignals(signalsData.data || []);
        setPerformance(perfData.data || null);
      }
    } catch (error) {
      console.error("Error fetching signals:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTypes, selectedStatuses, minConfidence, timeframe]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSignals();
  }, [fetchSignals]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trading Signals</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={styles.filterButton}
        >
          <Ionicons name="filter" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Performance Stats */}
        {performance && showPerformance && (
          <PerformanceDisplay
            performance={performance}
            onToggle={() => setShowPerformance(!showPerformance)}
          />
        )}

        {/* Signals List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading signals...</Text>
          </View>
        ) : signals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="analytics-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No signals found</Text>
            <Text style={styles.emptySubtext}>
              Adjust your filters or check back later
            </Text>
          </Card>
        ) : (
          <SignalCards signals={signals} />
        )}
      </ScrollView>

      {/* Filter Modal */}
      <SignalFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        minConfidence={minConfidence}
        setMinConfidence={setMinConfidence}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// PERFORMANCE DISPLAY COMPONENT
// ============================================================================

interface PerformanceDisplayProps {
  performance: SignalPerformance;
  onToggle: () => void;
}

function PerformanceDisplay({
  performance,
  onToggle,
}: PerformanceDisplayProps) {
  return (
    <Card style={styles.performanceCard}>
      <TouchableOpacity onPress={onToggle} style={styles.performanceHeader}>
        <Text style={styles.performanceTitle}>Performance</Text>
        <Ionicons
          name="chevron-up"
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.performanceGrid}>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Win Rate</Text>
          <Text
            style={[styles.performanceValue, { color: theme.colors.success }]}
          >
            {performance.winRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Avg Return</Text>
          <Text
            style={[
              styles.performanceValue,
              {
                color:
                  performance.averageReturn >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              },
            ]}
          >
            {performance.averageReturn >= 0 ? "+" : ""}
            {performance.averageReturn.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Sharpe Ratio</Text>
          <Text style={styles.performanceValue}>
            {performance.sharpeRatio.toFixed(2)}
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Total Signals</Text>
          <Text style={styles.performanceValue}>
            {performance.totalSignals}
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Profitable</Text>
          <Text
            style={[styles.performanceValue, { color: theme.colors.success }]}
          >
            {performance.profitableSignals}
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Total Return</Text>
          <Text
            style={[
              styles.performanceValue,
              {
                color:
                  performance.totalReturn >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              },
            ]}
          >
            {performance.totalReturn >= 0 ? "+" : ""}
            {performance.totalReturn.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ============================================================================
// SIGNAL CARDS COMPONENT
// ============================================================================

interface SignalCardsProps {
  signals: TradingSignal[];
}

function SignalCards({ signals }: SignalCardsProps) {
  const scrollX = useRef(new Animated.Value(0)).current;

  const getSignalColor = (type: SignalType): string => {
    switch (type) {
      case SignalType.STRONG_BUY:
      case SignalType.BUY:
        return theme.colors.success;
      case SignalType.STRONG_SELL:
      case SignalType.SELL:
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const getSignalIcon = (type: SignalType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case SignalType.STRONG_BUY:
      case SignalType.BUY:
        return "trending-up";
      case SignalType.STRONG_SELL:
      case SignalType.SELL:
        return "trending-down";
      default:
        return "remove";
    }
  };

  return (
    <View style={styles.signalsContainer}>
      {signals.map((signal, index) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          color={getSignalColor(signal.signalType)}
          icon={getSignalIcon(signal.signalType)}
        />
      ))}
    </View>
  );
}

// ============================================================================
// SIGNAL CARD COMPONENT
// ============================================================================

interface SignalCardProps {
  signal: TradingSignal;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function SignalCard({ signal, color, icon }: SignalCardProps) {
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatDate = (date: Date) => new Date(date).toLocaleDateString();

  return (
    <Card style={styles.signalCard}>
      {/* Header */}
      <View style={styles.signalHeader}>
        <View style={styles.signalTitleRow}>
          <View style={[styles.signalIcon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={styles.signalTitleInfo}>
            <Text style={styles.signalSymbol}>{signal.symbol}</Text>
            <Text style={styles.signalAssetType}>
              {signal.assetType.toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          style={[styles.signalTypeBadge, { backgroundColor: `${color}20` }]}
        >
          <Text style={[styles.signalTypeText, { color }]}>
            {signal.signalType.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Price Targets */}
      <View style={styles.priceTargets}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Current</Text>
          <Text style={styles.priceValue}>
            {formatPrice(signal.currentPrice)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Target</Text>
          <Text style={[styles.priceValue, { color: theme.colors.success }]}>
            {formatPrice(signal.targetPrice)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Stop Loss</Text>
          <Text style={[styles.priceValue, { color: theme.colors.error }]}>
            {formatPrice(signal.stopLoss)}
          </Text>
        </View>
      </View>

      {/* Confidence & Risk/Reward */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Confidence</Text>
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${signal.confidence * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <Text style={styles.metricValue}>
            {(signal.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Risk/Reward</Text>
          <Text style={[styles.metricValue, { fontSize: 18, color }]}>
            {signal.riskRewardRatio.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Reasoning */}
      <Text style={styles.reasoning} numberOfLines={2}>
        {signal.reasoning}
      </Text>

      {/* Analysis Types */}
      <View style={styles.analysisTypes}>
        {signal.analysisTypes.slice(0, 3).map((type, idx) => (
          <View key={idx} style={styles.analysisTag}>
            <Text style={styles.analysisTagText}>{type.replace("_", " ")}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.signalFooter}>
        <Text style={styles.footerText}>{signal.timeframe.toUpperCase()}</Text>
        <Text style={styles.footerText}>{formatDate(signal.generatedAt)}</Text>
      </View>
    </Card>
  );
}

// ============================================================================
// SIGNAL FILTERS COMPONENT
// ============================================================================

interface SignalFiltersProps {
  visible: boolean;
  onClose: () => void;
  selectedTypes: SignalType[];
  setSelectedTypes: (types: SignalType[]) => void;
  selectedStatuses: SignalStatus[];
  setSelectedStatuses: (statuses: SignalStatus[]) => void;
  minConfidence: number;
  setMinConfidence: (confidence: number) => void;
  timeframe: string;
  setTimeframe: (timeframe: string) => void;
}

function SignalFilters({
  visible,
  onClose,
  selectedTypes,
  setSelectedTypes,
  selectedStatuses,
  setSelectedStatuses,
  minConfidence,
  setMinConfidence,
  timeframe,
  setTimeframe,
}: SignalFiltersProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const toggleType = (type: SignalType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const toggleStatus = (status: SignalStatus) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.filterSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetContent}>
              {/* Signal Types */}
              <Text style={styles.filterSectionTitle}>Signal Type</Text>
              <View style={styles.filterChips}>
                {Object.values(SignalType).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      selectedTypes.includes(type) && styles.filterChipActive,
                    ]}
                    onPress={() => toggleType(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedTypes.includes(type) &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {type.replace("_", " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterChips}>
                {Object.values(SignalStatus).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      selectedStatuses.includes(status) &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => toggleStatus(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedStatuses.includes(status) &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Timeframe */}
              <Text style={styles.filterSectionTitle}>Timeframe</Text>
              <View style={styles.filterChips}>
                {["all", "1d", "1w", "1m", "3m", "6m", "1y"].map((tf) => (
                  <TouchableOpacity
                    key={tf}
                    style={[
                      styles.filterChip,
                      timeframe === tf && styles.filterChipActive,
                    ]}
                    onPress={() => setTimeframe(tf)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        timeframe === tf && styles.filterChipTextActive,
                      ]}
                    >
                      {tf.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Confidence Slider */}
              <Text style={styles.filterSectionTitle}>
                Min Confidence: {minConfidence}%
              </Text>
              <View style={styles.confidenceSlider}>
                {[0, 25, 50, 75, 90].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.confidenceButton,
                      minConfidence === value && styles.confidenceButtonActive,
                    ]}
                    onPress={() => setMinConfidence(value)}
                  >
                    <Text
                      style={[
                        styles.confidenceButtonText,
                        minConfidence === value &&
                          styles.confidenceButtonTextActive,
                      ]}
                    >
                      {value}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  filterButton: {
    padding: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  performanceCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  performanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  performanceItem: {
    width: "33.33%",
    marginBottom: theme.spacing.md,
  },
  performanceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  signalsContainer: {
    padding: theme.spacing.lg,
  },
  signalCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  signalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  signalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  signalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
  },
  signalTitleInfo: {
    flex: 1,
  },
  signalSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  signalAssetType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  signalTypeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  signalTypeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  priceTargets: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  priceItem: {
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  metricsRow: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
  },
  metricItem: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: `${theme.colors.border}`,
    borderRadius: 3,
    marginVertical: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  reasoning: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  analysisTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: theme.spacing.sm,
  },
  analysisTag: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  analysisTagText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  signalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: height * 0.8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: theme.spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  sheetContent: {
    padding: theme.spacing.lg,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  confidenceSlider: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confidenceButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  confidenceButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  confidenceButtonText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "500",
  },
  confidenceButtonTextActive: {
    color: "#FFFFFF",
  },
  applyButton: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
