/**
 * Opportunity Radar Screen
 *
 * Full-screen wrapper that connects OpportunityRadar to the useISE hook
 * for live data and integrates with navigation.
 */

import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { OpportunityRadar } from "./OpportunityRadar";
import { useISE, type UserTier } from "../../hooks/useISE";

// ============================================================================
// PROPS
// ============================================================================

export interface OpportunityRadarScreenProps {
  initialTier?: UserTier;
  onSymbolSelect?: (symbol: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OpportunityRadarScreen({
  initialTier = "pro",
  onSymbolSelect,
}: OpportunityRadarScreenProps) {
  const navigation = useNavigation();

  // Connect to ISE
  const {
    state,
    config,
    setTier,
    setMaxActiveSize,
    setAutoRotate,
    forceAddSymbol,
    forceRemoveSymbol,
    refresh,
  } = useISE({
    initialTier,
    pollingIntervalMs: 30000,
    enabled: true,
  });

  // Transform rankings for OpportunityRadar component
  const transformedRankings = state.rankings.map((r) => ({
    rank: r.rank,
    symbol: r.symbol,
    name: r.symbol, // Could fetch names from a symbol lookup
    assetClass: r.assetClass,
    score: r.score,
    liquidity: r.scoreBreakdown.liquidity,
    pcttFitness: r.scoreBreakdown.pcttFitness,
    opportunity: r.scoreBreakdown.opportunity,
    realizedEdge: r.scoreBreakdown.realizedEdge,
    regime: r.regime,
    qScore: r.scoreBreakdown.pcttFitness, // Approximate
    event: r.event,
    isPCTTReady: r.isPCTTReady,
    isActive: r.isActive,
    inCooldown: r.inCooldown,
  }));

  // Transform events to agent thoughts
  const agentThoughts = state.recentEvents.map((e) => ({
    id: e.id,
    message:
      e.eventType === "enter"
        ? `📈 ${e.symbol} promoted → ${e.reason}`
        : `📉 ${e.symbol} demoted → ${e.reason}`,
    timestamp: new Date(e.timestamp),
    type:
      e.eventType === "enter" ? ("promotion" as const) : ("demotion" as const),
  }));

  // Handlers
  const handleSymbolPress = useCallback(
    (symbol: string) => {
      if (onSymbolSelect) {
        onSymbolSelect(symbol);
      } else {
        // Navigate to PCTT chart screen
        (navigation as any).navigate?.("PCTTChart", { symbol });
      }
    },
    [navigation, onSymbolSelect],
  );

  const handleForceAdd = useCallback(
    async (symbol: string) => {
      const success = await forceAddSymbol(symbol);
      if (!success && __DEV__) {
        console.warn("Failed to add symbol to active set");
      }
    },
    [forceAddSymbol],
  );

  const handleForceRemove = useCallback(
    async (symbol: string) => {
      const success = await forceRemoveSymbol(symbol);
      if (!success && __DEV__) {
        console.warn("Failed to remove symbol from active set");
      }
    },
    [forceRemoveSymbol],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      {/* Header with refresh */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Opportunity Radar</Text>
          {state.lastUpdate && (
            <Text style={styles.headerSubtitle}>
              Updated {formatTimeAgo(state.lastUpdate)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refresh}
          disabled={state.isLoading}
        >
          {state.isLoading ? (
            <ActivityIndicator size="small" color="#4a90d9" />
          ) : (
            <Text style={styles.refreshText}>↻</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {state.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {state.error}</Text>
          <TouchableOpacity onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main content */}
      <OpportunityRadar
        rankings={transformedRankings}
        activeSymbols={state.activeSymbols}
        agentThoughts={agentThoughts}
        tier={config.tier}
        maxActiveSize={config.maxActiveSize}
        autoRotateEnabled={config.autoRotateEnabled}
        onTierChange={setTier}
        onMaxActiveSizeChange={setMaxActiveSize}
        onAutoRotateToggle={setAutoRotate}
        onSymbolPress={handleSymbolPress}
        onForceAdd={handleForceAdd}
        onForceRemove={handleForceRemove}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a3a",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    fontSize: 24,
    color: "#ffffff",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#8a8a9a",
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshText: {
    fontSize: 22,
    color: "#4a90d9",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ef535020",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ef5350",
  },
  errorText: {
    fontSize: 13,
    color: "#ef5350",
    flex: 1,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a90d9",
    marginLeft: 12,
  },
});

export default OpportunityRadarScreen;
