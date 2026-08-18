/**
 * Fynvita Dashboard Analytics Screen
 * Credit analytics with score progress, dispute stats, and recommendations.
 *
 * Real-data wiring (PARITY): renders the authenticated user's analytics from
 * GET /api/user/analytics (withAuth) via userAnalyticsApi.getAnalytics. The
 * former MOCK_DATA object + fake setTimeout load were removed. creditHistory
 * and disputeStats are the user's real data (honestly empty/zeroed when the
 * source is empty); scoreFactors and recommendations are the endpoint's own
 * reference data. Fetch on mount with honest inline loading / error+retry
 * states and pull-to-refresh; when the user has no score history the chart
 * shows an honest empty note instead of crashing on an empty series, and the
 * recommendations card is omitted rather than invented when the API returns
 * none. Nothing is fabricated.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { userAnalyticsApi } from "../../src/services/api/user";
import type { UserAnalytics } from "../../src/services/api/user";
import { ScreenLoading } from "../../src/components/ScreenLoading";

export default function DashboardAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [timeRange] = useState("6m");

  const fetchAnalytics = useCallback(async () => {
    const response = await userAnalyticsApi.getAnalytics(timeRange);
    if (response.success && response.data) {
      setData(response.data);
      setError(null);
    } else {
      setError(response.error?.message ?? "Unable to load analytics.");
    }
  }, [timeRange]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchAnalytics();
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  if (loading && !data) {
    return <ScreenLoading title="Credit Analytics" message="Loading analytics..." testID="dashboard-analytics-loading" />;
  }

  if (error && !data) {
    return (
      <ScreenError
        title="Credit Analytics"
        message={error}
        onRetry={loadAnalytics}
        testID="dashboard-analytics-error"
      />
    );
  }

  // Unreachable once a fetch succeeds (success populates data); narrows the type.
  if (!data) return null;

  const { creditHistory, disputeStats, scoreFactors, recommendations } = data;
  const hasHistory = creditHistory.length > 0;
  const scoreGain = hasHistory
    ? creditHistory[creditHistory.length - 1].score - creditHistory[0].score
    : 0;
  const scoreGainText = `${scoreGain >= 0 ? "+" : ""}${scoreGain}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Credit Analytics</Text>
            <Text style={styles.subtitle}>Your credit health overview</Text>
          </View>
          <TouchableOpacity style={styles.rangeSelector}>
            <Text style={styles.rangeText}>
              {timeRange === "6m" ? "Last 6 months" : timeRange}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Score Progress Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Credit Score Progress</Text>
          {hasHistory ? (
            <>
              <View style={styles.chartContainer}>
                {creditHistory.map((item, i) => (
                  <View key={i} style={styles.barColumn}>
                    <Text style={styles.barValue}>{item.score}</Text>
                    <View
                      style={[
                        styles.bar,
                        { height: ((item.score - 300) / 550) * 120 },
                      ]}
                    />
                    <Text style={styles.barLabel}>{item.date}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.scoreGainRow}>
                <Text
                  style={[
                    styles.scoreGainValue,
                    {
                      color:
                        scoreGain >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  {scoreGainText}
                </Text>
                <Text style={styles.scoreGainLabel}> points gained</Text>
              </View>
            </>
          ) : (
            <View style={styles.chartEmpty} testID="dashboard-analytics-empty">
              <Ionicons
                name="stats-chart-outline"
                size={36}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.chartEmptyText}>
                No score history yet. Your credit score trend will appear here
                once scores are recorded.
              </Text>
            </View>
          )}
        </Card>

        {/* Dispute Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Dispute Performance</Text>
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statBox,
                { backgroundColor: `${theme.colors.primary}10` },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {disputeStats.total}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: `${theme.colors.success}10` },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.success }]}>
                {disputeStats.resolved}
              </Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: `${theme.colors.warning}10` },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                {disputeStats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: `${theme.colors.secondary}10` },
              ]}
            >
              <Text
                style={[styles.statValue, { color: theme.colors.secondary }]}
              >
                {disputeStats.successRate}%
              </Text>
              <Text style={styles.statLabel}>Success</Text>
            </View>
          </View>
        </Card>

        {/* Score Factors */}
        {scoreFactors.length > 0 && (
          <Card style={styles.factorsCard}>
            <Text style={styles.sectionTitle}>Score Factors</Text>
            {scoreFactors.map((factor, i) => (
              <View key={i} style={styles.factorRow}>
                <Text style={styles.factorName}>{factor.factor}</Text>
                <View style={styles.factorBar}>
                  <View
                    style={[
                      styles.factorFill,
                      {
                        width: `${factor.impact}%`,
                        backgroundColor:
                          factor.status === "positive"
                            ? theme.colors.success
                            : factor.status === "negative"
                              ? theme.colors.error
                              : theme.colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.factorPercent}>{factor.impact}%</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Recommendations — omitted when the endpoint returns none */}
        {recommendations.length > 0 && (
          <Card style={styles.recommendationsCard}>
            <View style={styles.recommendationsHeader}>
              <Ionicons
                name="sparkles"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.sectionTitle}> Recommendations</Text>
            </View>
            {recommendations.map((rec, i) => (
              <View key={i} style={styles.recommendationItem}>
                <Ionicons name="bulb" size={18} color={theme.colors.primary} />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  stateText: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary },
  rangeSelector: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  rangeText: { fontSize: 12, color: theme.colors.primary, fontWeight: "600" },
  chartCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 20,
  },
  barColumn: { alignItems: "center", flex: 1 },
  barValue: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  bar: { width: 24, backgroundColor: theme.colors.primary, borderRadius: 4 },
  barLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  scoreGainRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  scoreGainValue: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.success,
  },
  scoreGainLabel: { fontSize: 14, color: theme.colors.textSecondary },
  chartEmpty: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
  },
  chartEmptyText: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  statsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statBox: {
    width: "48%",
    padding: theme.spacing.md,
    borderRadius: 12,
    alignItems: "center",
    margin: "1%",
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  factorsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  factorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  factorName: { width: 100, fontSize: 12, color: theme.colors.textSecondary },
  factorBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  factorFill: { height: 8, borderRadius: 4 },
  factorPercent: {
    width: 35,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "right",
  },
  recommendationsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${theme.colors.primary}08`,
    padding: theme.spacing.md,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 8,
    lineHeight: 18,
  },
});
