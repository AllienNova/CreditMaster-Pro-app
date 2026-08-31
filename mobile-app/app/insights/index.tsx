/**
 * Fynvita Financial Insights Hub
 *
 * Real-data wiring (PARITY-P1): the insights list is fetched from the same real
 * route the web /insights page renders (GET /api/ai/insights, withAuth) via
 * financialOverviewApi.getInsights, adapted web -> mobile by mapWebInsight. The
 * former hardcoded MOCK_INSIGHTS, HEALTH_SCORE card, QUICK_STATS row, and the fake
 * setTimeout load were removed. The health-score and quick-stats blocks were
 * deleted rather than faked: no mobile store or API service exposes a real
 * financial-health score (score + grade + change + breakdown) or those aggregate
 * stats, and /api/ai/insights carries neither. The Explore grid stays — it is pure
 * navigation (its former unread-count badges, which had no real source, were
 * removed). Nudges and coaching keep their existing hooks.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { NudgeToast } from "../../src/components/ai/NudgeToast";
import { CoachingCard } from "../../src/components/ai/CoachingCard";
import { useNudges } from "../../src/hooks/useNudges";
import { useCoaching } from "../../src/hooks/useCoaching";
import { financialOverviewApi } from "../../src/services/api/financial";
import type { Insight, InsightType } from "../../src/services/api/financial";
import { toArray } from "../../src/store/toArray";

// Explore grid — pure navigation to insight sub-screens (all four routes exist).
const QUICK_ACTIONS: {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}[] = [
  {
    id: "alerts",
    label: "Smart Alerts",
    icon: "notifications",
    color: "#EF4444",
    route: "/insights/alerts",
  },
  {
    id: "weekly",
    label: "Weekly Summary",
    icon: "bar-chart",
    color: "#3B82F6",
    route: "/insights/weekly-summary",
  },
  {
    id: "spending",
    label: "Spending Analysis",
    icon: "pie-chart",
    color: "#22C55E",
    route: "/insights/spending",
  },
  {
    id: "nudges",
    label: "AI Tips",
    icon: "bulb",
    color: "#F59E0B",
    route: "/insights/nudges",
  },
];

const TYPE_ICONS: Record<InsightType, keyof typeof Ionicons.glyphMap> = {
  observation: "information-circle",
  suggestion: "bulb",
  warning: "warning",
  celebration: "trophy",
};

const TYPE_COLORS: Record<InsightType, string> = {
  observation: "#3B82F6",
  suggestion: "#22C55E",
  warning: "#F59E0B",
  celebration: "#8B5CF6",
};

export default function FinancialInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);

  // AI Nudges and Coaching hooks
  const { activeNudge, respondToNudge } = useNudges();
  const { activeSessions, startSession } = useCoaching();

  const loadInsights = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      setError(null);
      const res = await financialOverviewApi.getInsights();
      if (res.success && res.data) {
        setInsights(toArray<Insight>(res?.data?.insights));
      } else {
        setError(res.error?.message ?? "Unable to load insights right now.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const dismissInsight = (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading && insights.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer} testID="insights-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Insights</Text>
          <TouchableOpacity
            onPress={() => router.push("/settings/notifications" as never)}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Explore (navigation) */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.quickActionCard,
                { backgroundColor: `${action.color}10` },
              ]}
              onPress={() => router.push(action.route as never)}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: action.color }]}
              >
                <Ionicons name={action.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Nudge */}
        {activeNudge && (
          <NudgeToast
            nudge={activeNudge}
            onAccept={() => respondToNudge(activeNudge.id, "accepted")}
            onDismiss={() => respondToNudge(activeNudge.id, "dismissed")}
            onSnooze={() => respondToNudge(activeNudge.id, "snoozed")}
          />
        )}

        {/* Coaching Sessions */}
        {activeSessions.length > 0 && (
          <View style={styles.coachingSection}>
            <View style={styles.coachingSectionHeader}>
              <Text style={styles.coachingSectionTitle}>Coaching for You</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/financial-intelligence/chat" as never)
                }
              >
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {activeSessions.slice(0, 2).map((session) => (
              <CoachingCard
                key={session.id}
                session={session}
                compact
                onStart={() => {
                  startSession(session.id);
                  router.push("/financial-intelligence/chat" as never);
                }}
              />
            ))}
          </View>
        )}

        {/* Insights Feed */}
        <Text style={styles.sectionTitle}>Latest Insights</Text>

        {error && insights.length === 0 ? (
          <View style={styles.stateBlock} testID="insights-error">
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadInsights}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : insights.length === 0 ? (
          <View style={styles.stateBlock} testID="insights-empty">
            <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>No new insights right now.</Text>
          </View>
        ) : (
          insights.map((insight) => (
            <Card key={insight.id} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: `${TYPE_COLORS[insight.type]}15` },
                  ]}
                >
                  <Ionicons
                    name={TYPE_ICONS[insight.type]}
                    size={20}
                    color={TYPE_COLORS[insight.type]}
                  />
                </View>
                <View style={styles.insightContent}>
                  <View style={styles.insightTitleRow}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <TouchableOpacity onPress={() => dismissInsight(insight.id)}>
                      <Ionicons
                        name="close"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.insightDescription}>
                    {insight.description}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: theme.spacing.lg,
  },
  quickActionCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 8,
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.text,
    marginTop: 8,
    textAlign: "center",
  },
  coachingSection: {
    marginBottom: theme.spacing.lg,
  },
  coachingSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  coachingSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  viewAllLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  insightCard: { marginBottom: theme.spacing.sm },
  insightHeader: { flexDirection: "row" },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  insightContent: { flex: 1 },
  insightTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  insightDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  stateBlock: {
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
});
