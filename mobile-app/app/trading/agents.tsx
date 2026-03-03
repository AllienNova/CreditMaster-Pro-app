/**
 * AI Agent Insights Screen
 *
 * Dashboard showing the status, health, and latest outputs of all
 * AI trading agents (Sentiment, RegimeConfirmation, Earnings,
 * ConsensusArbiter, SignalExplainer, RiskNarrative, NewsImpact).
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme as theme } from "../../src/constants/theme";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// ============================================================================
// TYPES
// ============================================================================

type AgentStatus = "active" | "idle" | "error" | "disabled";

interface AgentInfo {
  name: string;
  type: string;
  status: AgentStatus;
  model: string;
  lastRun?: string;
  avgLatencyMs?: number;
  totalRuns: number;
  successRate: number;
  latestOutput?: {
    summary: string;
    confidence?: number;
    timestamp: string;
  };
  circuitBreaker?: {
    state: "closed" | "open" | "half-open";
    failures: number;
    lastFailure?: string;
  };
}

interface AgentsResponse {
  agents: AgentInfo[];
  summary: {
    totalAgents: number;
    activeAgents: number;
    errorAgents: number;
    avgSuccessRate: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "active":
      return theme.colors.success;
    case "idle":
      return theme.colors.warning;
    case "error":
      return theme.colors.error;
    case "disabled":
      return theme.colors.textMuted;
  }
}

function getStatusIcon(status: AgentStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "active":
      return "checkmark-circle";
    case "idle":
      return "pause-circle";
    case "error":
      return "alert-circle";
    case "disabled":
      return "close-circle";
  }
}

function getAgentIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "sentiment":
      return "happy-outline";
    case "regime-confirmation":
      return "analytics-outline";
    case "earnings":
      return "cash-outline";
    case "consensus-arbiter":
      return "git-merge-outline";
    case "signal-explainer":
      return "bulb-outline";
    case "risk-narrative":
      return "shield-outline";
    case "news-impact":
      return "newspaper-outline";
    default:
      return "hardware-chip-outline";
  }
}

function getCircuitBreakerColor(
  state: "closed" | "open" | "half-open",
): string {
  switch (state) {
    case "closed":
      return theme.colors.success;
    case "half-open":
      return theme.colors.warning;
    case "open":
      return theme.colors.error;
  }
}

function formatTimeAgo(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// MOCK DATA (used when API is unavailable)
// ============================================================================

const MOCK_AGENTS: AgentInfo[] = [
  {
    name: "Sentiment Agent",
    type: "sentiment",
    status: "active",
    model: "gpt-4o-mini",
    lastRun: new Date(Date.now() - 120000).toISOString(),
    avgLatencyMs: 850,
    totalRuns: 1247,
    successRate: 0.97,
    latestOutput: {
      summary:
        "Overall market sentiment is cautiously bullish. Tech sector showing strong positive momentum. Social media sentiment score: 0.72.",
      confidence: 0.78,
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    circuitBreaker: { state: "closed", failures: 0 },
  },
  {
    name: "Regime Confirmation",
    type: "regime-confirmation",
    status: "active",
    model: "claude-sonnet-4-6",
    lastRun: new Date(Date.now() - 300000).toISOString(),
    avgLatencyMs: 1200,
    totalRuns: 856,
    successRate: 0.99,
    latestOutput: {
      summary:
        "Current regime: TRENDING (bullish). Confidence in regime stability: HIGH. Volatility regime: LOW. Suggested position sizing: 1.2x normal.",
      confidence: 0.92,
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    circuitBreaker: { state: "closed", failures: 0 },
  },
  {
    name: "Earnings Agent",
    type: "earnings",
    status: "idle",
    model: "gpt-4o",
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    avgLatencyMs: 2100,
    totalRuns: 312,
    successRate: 0.95,
    latestOutput: {
      summary:
        "Next earnings: AAPL (Feb 28), NVDA (Mar 5). AAPL expected beat probability: 68%. Pre-earnings volatility expansion expected.",
      confidence: 0.71,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    circuitBreaker: { state: "closed", failures: 0 },
  },
  {
    name: "Consensus Arbiter",
    type: "consensus-arbiter",
    status: "active",
    model: "claude-sonnet-4-6",
    lastRun: new Date(Date.now() - 180000).toISOString(),
    avgLatencyMs: 450,
    totalRuns: 2103,
    successRate: 0.98,
    latestOutput: {
      summary:
        "5/7 agents agree on bullish AAPL. Consensus score: 0.82. Disagreement from News agent (neutral). Recommendation: PROCEED with position.",
      confidence: 0.85,
      timestamp: new Date(Date.now() - 180000).toISOString(),
    },
    circuitBreaker: { state: "closed", failures: 0 },
  },
  {
    name: "Signal Explainer",
    type: "signal-explainer",
    status: "active",
    model: "claude-sonnet-4-6",
    lastRun: new Date(Date.now() - 60000).toISOString(),
    avgLatencyMs: 680,
    totalRuns: 1890,
    successRate: 0.96,
    latestOutput: {
      summary:
        "AAPL long signal triggered by PCTT trendline breakout confirmed by volume surge. Entry at $189.50 near support. R:R = 1:2.8.",
      confidence: 0.88,
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    circuitBreaker: { state: "closed", failures: 0 },
  },
  {
    name: "Risk Narrative",
    type: "risk-narrative",
    status: "active",
    model: "gpt-4o-mini",
    lastRun: new Date(Date.now() - 90000).toISOString(),
    avgLatencyMs: 520,
    totalRuns: 1654,
    successRate: 0.97,
    latestOutput: {
      summary:
        "Portfolio heat: 32% (safe). Max drawdown today: -0.8%. No correlated position clusters detected. Risk level: LOW.",
      confidence: 0.91,
      timestamp: new Date(Date.now() - 90000).toISOString(),
    },
    circuitBreaker: { state: "closed", failures: 0 },
  },
  {
    name: "News Impact",
    type: "news-impact",
    status: "error",
    model: "gpt-4o",
    lastRun: new Date(Date.now() - 600000).toISOString(),
    avgLatencyMs: 3200,
    totalRuns: 445,
    successRate: 0.82,
    latestOutput: {
      summary:
        "Fed rate decision tomorrow. Market pricing 85% hold. Tech earnings season ongoing. No major geopolitical events.",
      confidence: 0.65,
      timestamp: new Date(Date.now() - 600000).toISOString(),
    },
    circuitBreaker: { state: "half-open", failures: 3, lastFailure: new Date(Date.now() - 600000).toISOString() },
  },
];

const MOCK_SUMMARY = {
  totalAgents: 7,
  activeAgents: 5,
  errorAgents: 1,
  avgSuccessRate: 0.95,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SummaryCard({ summary }: { summary: AgentsResponse["summary"] }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalAgents}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
            {summary.activeAgents}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  summary.errorAgents > 0
                    ? theme.colors.error
                    : theme.colors.textMuted,
              },
            ]}
          >
            {summary.errorAgents}
          </Text>
          <Text style={styles.summaryLabel}>Errors</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
            {(summary.avgSuccessRate * 100).toFixed(0)}%
          </Text>
          <Text style={styles.summaryLabel}>Success</Text>
        </View>
      </View>
    </View>
  );
}

function AgentCard({
  agent,
  onPress,
}: {
  agent: AgentInfo;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.agentCard} onPress={onPress} activeOpacity={0.7}>
      {/* Agent Header */}
      <View style={styles.agentHeader}>
        <View style={styles.agentHeaderLeft}>
          <View
            style={[
              styles.agentIconContainer,
              { backgroundColor: getStatusColor(agent.status) + "15" },
            ]}
          >
            <Ionicons
              name={getAgentIcon(agent.type)}
              size={20}
              color={getStatusColor(agent.status)}
            />
          </View>
          <View>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentModel}>{agent.model}</Text>
          </View>
        </View>
        <View style={styles.agentHeaderRight}>
          <Ionicons
            name={getStatusIcon(agent.status)}
            size={20}
            color={getStatusColor(agent.status)}
          />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.agentStats}>
        <View style={styles.agentStat}>
          <Text style={styles.agentStatLabel}>Runs</Text>
          <Text style={styles.agentStatValue}>
            {agent.totalRuns.toLocaleString()}
          </Text>
        </View>
        <View style={styles.agentStat}>
          <Text style={styles.agentStatLabel}>Success</Text>
          <Text
            style={[
              styles.agentStatValue,
              {
                color:
                  agent.successRate >= 0.95
                    ? theme.colors.success
                    : agent.successRate >= 0.9
                      ? theme.colors.warning
                      : theme.colors.error,
              },
            ]}
          >
            {(agent.successRate * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.agentStat}>
          <Text style={styles.agentStatLabel}>Latency</Text>
          <Text style={styles.agentStatValue}>
            {agent.avgLatencyMs ? formatLatency(agent.avgLatencyMs) : "—"}
          </Text>
        </View>
        <View style={styles.agentStat}>
          <Text style={styles.agentStatLabel}>Last Run</Text>
          <Text style={styles.agentStatValue}>
            {agent.lastRun ? formatTimeAgo(agent.lastRun) : "Never"}
          </Text>
        </View>
      </View>

      {/* Circuit Breaker */}
      {agent.circuitBreaker && agent.circuitBreaker.state !== "closed" && (
        <View
          style={[
            styles.circuitBreakerBanner,
            {
              backgroundColor:
                getCircuitBreakerColor(agent.circuitBreaker.state) + "15",
            },
          ]}
        >
          <Ionicons
            name="flash-outline"
            size={14}
            color={getCircuitBreakerColor(agent.circuitBreaker.state)}
          />
          <Text
            style={[
              styles.circuitBreakerText,
              {
                color: getCircuitBreakerColor(agent.circuitBreaker.state),
              },
            ]}
          >
            Circuit Breaker: {agent.circuitBreaker.state.toUpperCase()} (
            {agent.circuitBreaker.failures} failures)
          </Text>
        </View>
      )}

      {/* Latest Output */}
      {agent.latestOutput && (
        <View style={styles.agentOutput}>
          <Text style={styles.agentOutputText} numberOfLines={3}>
            {agent.latestOutput.summary}
          </Text>
          <View style={styles.agentOutputMeta}>
            {agent.latestOutput.confidence != null && (
              <Text style={styles.agentOutputConfidence}>
                Confidence: {(agent.latestOutput.confidence * 100).toFixed(0)}%
              </Text>
            )}
            <Text style={styles.agentOutputTime}>
              {formatTimeAgo(agent.latestOutput.timestamp)}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AgentInsightsScreen() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [summary, setSummary] = useState<AgentsResponse["summary"] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/trading/agents`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.agents) {
          setAgents(json.data.agents);
          setSummary(json.data.summary);
          return;
        }
      }
      // Fallback to mock data
      setAgents(MOCK_AGENTS);
      setSummary(MOCK_SUMMARY);
    } catch {
      // API not available — use mock data
      setAgents(MOCK_AGENTS);
      setSummary(MOCK_SUMMARY);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAgents();
  }, [fetchAgents]);

  const toggleExpanded = (name: string) => {
    setExpandedAgent((prev) => (prev === name ? null : name));
  };

  // Loading
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading agents...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Summary */}
      {summary && <SummaryCard summary={summary} />}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Agents</Text>
        <Text style={styles.sectionSubtitle}>
          {agents.length} agents configured
        </Text>
      </View>

      {/* Agent Cards */}
      {agents.map((agent) => (
        <AgentCard
          key={agent.name}
          agent={agent}
          onPress={() => toggleExpanded(agent.name)}
        />
      ))}

      {/* Empty State */}
      {agents.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="hardware-chip-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyTitle}>No Agents Configured</Text>
          <Text style={styles.emptySubtitle}>
            AI trading agents will appear here once configured in your trading
            settings.
          </Text>
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },

  // Agent Card
  agentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  agentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  agentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  agentHeaderRight: {},
  agentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  agentName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  agentModel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },

  // Agent Stats
  agentStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  agentStat: {
    alignItems: "center",
  },
  agentStatLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  agentStatValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },

  // Circuit Breaker
  circuitBreakerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  circuitBreakerText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },

  // Agent Output
  agentOutput: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  agentOutputText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  agentOutputMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  agentOutputConfidence: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  agentOutputTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },

  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
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
    paddingHorizontal: theme.spacing.xl,
  },

  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
