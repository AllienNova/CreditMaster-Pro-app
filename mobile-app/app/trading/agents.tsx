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
// DERIVING AGENT STATS FROM THE CALLER'S OWN RUNS
// ============================================================================

/** One row of trading_agent_logs (20260226_trading_modes_compliance.sql:98). */
interface AgentLog {
  agent_type: string;
  decision?: unknown;
  confidence?: number;
  model?: string;
  latency_ms?: number;
  validation_passed?: boolean;
  created_at?: string;
}

const AGENT_LABELS: Record<string, string> = {
  sentiment: "Sentiment",
  regime_confirmation: "Regime confirmation",
  news_impact: "News impact",
  signal_explainer: "Signal explainer",
  risk_narrative: "Risk narrative",
  earnings_analysis: "Earnings analysis",
  consensus_arbiter: "Consensus arbiter",
};

/** Minutes after which an agent with no run is no longer "active". */
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

function summaryTextFrom(decision: unknown): string {
  if (typeof decision === "string") return decision;
  if (decision && typeof decision === "object") {
    const record = decision as Record<string, unknown>;
    for (const key of ["summary", "rationale", "explanation", "narrative"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return "";
}

/**
 * Group the caller's real logs into per-agent stats.
 *
 * Every figure below is counted from rows this user actually produced. The
 * screen previously showed MOCK_AGENTS: totalRuns 1247, successRate 0.97,
 * avgLatencyMs 850, and a latestOutput asserting an analysis that never ran.
 *
 * `validationRate` is deliberately NOT called a success rate. The column is
 * `validation_passed` — whether the model's output parsed and satisfied its
 * schema. It says nothing about whether the call was right about the market,
 * and labelling it "success" on a trading screen would imply it did.
 */
function agentsFromLogs(logs: AgentLog[], now: number): AgentInfo[] {
  const byType = new Map<string, AgentLog[]>();
  for (const log of logs) {
    const list = byType.get(log.agent_type) ?? [];
    list.push(log);
    byType.set(log.agent_type, list);
  }

  return [...byType.entries()]
    .map(([type, runs]) => {
      const sorted = [...runs].sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
      );
      const latest = sorted[0];
      const withLatency = runs.filter(
        (r) => typeof r.latency_ms === "number",
      );
      const validated = runs.filter((r) => r.validation_passed === true).length;
      const lastRunAt = latest?.created_at
        ? new Date(latest.created_at).getTime()
        : 0;
      const summary = summaryTextFrom(latest?.decision);

      return {
        name: AGENT_LABELS[type] ?? type,
        type,
        status:
          lastRunAt > 0 && now - lastRunAt < ACTIVE_WINDOW_MS
            ? ("active" as AgentStatus)
            : ("idle" as AgentStatus),
        model: latest?.model ?? "",
        lastRun: latest?.created_at,
        avgLatencyMs: withLatency.length
          ? Math.round(
              withLatency.reduce((sum, r) => sum + (r.latency_ms ?? 0), 0) /
                withLatency.length,
            )
          : undefined,
        totalRuns: runs.length,
        successRate: runs.length ? validated / runs.length : 0,
        latestOutput: summary
          ? {
              summary,
              confidence: latest?.confidence,
              timestamp: latest?.created_at ?? "",
            }
          : undefined,
      };
    })
    .sort((a, b) => b.totalRuns - a.totalRuns);
}

function summaryFrom(agents: AgentInfo[]): AgentsResponse["summary"] {
  const validationRates = agents.map((a) => a.successRate);
  return {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === "active").length,
    errorAgents: agents.filter((a) => a.status === "error").length,
    avgSuccessRate: validationRates.length
      ? validationRates.reduce((sum, r) => sum + r, 0) / validationRates.length
      : 0,
  };
}

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
          <Text style={styles.summaryLabel}>Validated</Text>
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
          {/* `validation_passed`, not a trading outcome — see agentsFromLogs. */}
          <Text style={styles.agentStatLabel}>Validated</Text>
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
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/trading/agents`);
      const json = res.ok ? await res.json().catch(() => null) : null;

      // The route returns `data.logs` (route.ts:101), never `data.agents`.
      // The old code tested for `data.agents`, so the real branch could never
      // be taken and every user fell through to the mock.
      const logs = Array.isArray(json?.data?.logs)
        ? (json.data.logs as AgentLog[])
        : null;

      if (!logs) {
        setAgents([]);
        setSummary(null);
        setError(
          "We could not load your agent activity. Nothing is shown in its place — pull to refresh in a moment.",
        );
        return;
      }

      const derived = agentsFromLogs(logs, Date.now());
      setAgents(derived);
      setSummary(summaryFrom(derived));
    } catch {
      setAgents([]);
      setSummary(null);
      setError("We could not reach the trading service.");
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
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Agent activity is unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      )}

      {/* Summary */}
      {summary && agents.length > 0 && <SummaryCard summary={summary} />}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Agents</Text>
        {/* Agents that have RUN for this user, not a configured roster —
            the roster count came from the mock. */}
        <Text style={styles.sectionSubtitle}>
          {agents.length === 1 ? "1 agent has run" : `${agents.length} agents have run`}
        </Text>
      </View>

      {!error && agents.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.errorTitle}>No agent runs recorded</Text>
          <Text style={styles.errorBody}>
            These figures are counted from your own agent runs. Once an agent
            runs for you, its latency, validation rate and latest output appear
            here.
          </Text>
        </View>
      )}

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
  errorBanner: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorTitle: {
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  errorBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
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
