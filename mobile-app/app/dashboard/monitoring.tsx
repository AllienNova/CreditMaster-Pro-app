/**
 * Fynvita Credit Monitoring Dashboard Screen
 * Real-time credit monitoring with alerts.
 *
 * Real-data wiring (PARITY): renders the authenticated user's real bureau
 * scores, monitoring alerts, and score-history trend from useCreditStore
 * (fetchScores / fetchAlerts / fetchScoreHistory on mount, honest inline
 * loading / error+retry / empty states, pull-to-refresh). The former
 * MOCK_SCORES / MOCK_ALERTS / SCORE_HISTORY arrays and the fake setTimeout load
 * were removed; store types are flattened for rendering via
 * monitoringDashboardAdapter (nothing fabricated). The previously hardcoded
 * "Key Factors" block (Payment History / Utilization 32% / Credit Age 7yr /
 * Credit Mix) had no faithful per-user source — the /credit/factors endpoint
 * returns no utilization %, age, or mix values — so it is shown as an honest
 * "Score factors unavailable" state rather than invented numbers.
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { LineChart } from "../../src/components/charts";
import { useCreditStore } from "../../src/store/creditStore";
import {
  mapBureauScore,
  mapMonitoringAlert,
  mapScoreHistoryToTrend,
  type MonitoringAlertView,
} from "../../src/services/api/monitoringDashboardAdapter";
import type { AlertType } from "../../src/services/api/types";

// Real alert severities (low | medium | high | critical) -> semantic colors.
const SEVERITY_COLOR: Record<MonitoringAlertView["severity"], string> = {
  low: theme.colors.primary,
  medium: theme.colors.warning,
  high: theme.colors.error,
  critical: theme.colors.error,
};

// Every real AlertType maps to an icon (no default fabrication).
const TYPE_ICON: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  score_change: "trending-up",
  new_account: "add-circle",
  inquiry: "search",
  address_change: "home",
  fraud_alert: "warning",
  derogatory: "alert-circle",
};

// createdAt arrives as an ISO string; render a compact locale date (empty for a
// missing/invalid timestamp rather than "Invalid Date").
function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

export default function MonitoringScreen() {
  const {
    scores,
    alerts,
    scoreHistory,
    isLoadingScores,
    isLoadingAlerts,
    scoreError,
    alertError,
    fetchScores,
    fetchAlerts,
    fetchScoreHistory,
  } = useCreditStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    fetchScores();
    fetchAlerts();
    fetchScoreHistory();
  }, [fetchScores, fetchAlerts, fetchScoreHistory]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchScores(), fetchAlerts(), fetchScoreHistory()]);
    setRefreshing(false);
  };

  const bureauScores = scores.map(mapBureauScore);
  const alertViews = alerts.map(mapMonitoringAlert);
  const trend = mapScoreHistoryToTrend(scoreHistory);

  const isLoading = isLoadingScores || isLoadingAlerts;
  const error = scoreError ?? alertError;
  const hasData = bureauScores.length > 0 || alertViews.length > 0;
  const showLoading = isLoading && !hasData;
  const showError = !!error && !hasData;
  const showEmpty = !showLoading && !showError && !hasData;

  const unreadCount = alertViews.filter((a) => !a.read).length;

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
        <Text style={styles.title}>Credit Monitoring</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Honest inline states — no mock fallback, nothing fabricated */}
        {showLoading && (
          <View
            style={styles.stateContainer}
            testID="dashboard-monitoring-loading"
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.stateText}>Loading credit monitoring...</Text>
          </View>
        )}

        {showError && (
          <View
            style={styles.stateContainer}
            testID="dashboard-monitoring-error"
          >
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={load}>
              <Text style={styles.emptyButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!showLoading && !showError && showEmpty && (
          <View
            style={styles.stateContainer}
            testID="dashboard-monitoring-empty"
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.stateText}>
              No monitoring data yet. Bureau scores and alerts will appear here
              once your credit is connected.
            </Text>
          </View>
        )}

        {!showLoading && !showError && !showEmpty && (
          <>
            {/* Bureau Scores */}
            <View style={styles.scoresSection}>
              {bureauScores.map((bureau) => (
                <Card key={bureau.id} style={styles.scoreCard}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.bureauName}>{bureau.bureau}</Text>
                    <View
                      style={[
                        styles.changeBadge,
                        {
                          backgroundColor:
                            (bureau.change >= 0
                              ? theme.colors.success
                              : theme.colors.error) + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={bureau.change >= 0 ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={
                          bureau.change >= 0
                            ? theme.colors.success
                            : theme.colors.error
                        }
                      />
                      <Text
                        style={[
                          styles.changeText,
                          {
                            color:
                              bureau.change >= 0
                                ? theme.colors.success
                                : theme.colors.error,
                          },
                        ]}
                      >
                        {Math.abs(bureau.change)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.scoreValue}>{bureau.score}</Text>
                  <Text style={styles.lastUpdated}>
                    Updated: {formatDate(bureau.lastUpdated)}
                  </Text>
                </Card>
              ))}
            </View>

            {/* Score History Chart */}
            <Card style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Score Trend</Text>
              {trend.length > 0 ? (
                <LineChart
                  data={trend}
                  height={180}
                  color={theme.colors.success}
                  showDots
                  showLabels
                  showGrid
                />
              ) : (
                <View
                  style={styles.chartEmpty}
                  testID="dashboard-monitoring-history-empty"
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={36}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.chartEmptyText}>
                    No score history yet. Your score trend will appear here once
                    scores are recorded.
                  </Text>
                </View>
              )}
            </Card>

            {/* Credit Factors — honest empty state.
                The /credit/factors endpoint returns no utilization %, credit
                age, or credit-mix values, so the previously hardcoded numbers
                are not rendered; nothing is fabricated. */}
            <Card style={styles.factorsCard}>
              <Text style={styles.sectionTitle}>Key Factors</Text>
              <View
                style={styles.factorsEmpty}
                testID="dashboard-monitoring-factors-unavailable"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={28}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.factorsEmptyText}>
                  Score factors unavailable. Detailed credit factor data is not
                  available yet.
                </Text>
              </View>
            </Card>

            {/* Alerts */}
            <Card style={styles.alertsCard}>
              <View style={styles.alertsHeader}>
                <Text style={styles.sectionTitle}>Recent Alerts</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              {alertViews.length === 0 ? (
                <View
                  style={styles.alertsEmpty}
                  testID="dashboard-monitoring-alerts-empty"
                >
                  <Text style={styles.alertsEmptyText}>
                    No alerts right now.
                  </Text>
                </View>
              ) : (
                alertViews.map((alert) => (
                  <View
                    key={alert.id}
                    style={[styles.alertItem, !alert.read && styles.alertUnread]}
                  >
                    <View
                      style={[
                        styles.alertIconContainer,
                        { backgroundColor: SEVERITY_COLOR[alert.severity] + "20" },
                      ]}
                    >
                      <Ionicons
                        name={TYPE_ICON[alert.type]}
                        size={18}
                        color={SEVERITY_COLOR[alert.severity]}
                      />
                    </View>
                    <View style={styles.alertContent}>
                      <View style={styles.alertHeader}>
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                        <View
                          style={[
                            styles.severityBadge,
                            {
                              backgroundColor:
                                SEVERITY_COLOR[alert.severity] + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.severityText,
                              { color: SEVERITY_COLOR[alert.severity] },
                            ]}
                          >
                            {alert.severity}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.alertDescription}>
                        {alert.description}
                      </Text>
                      <Text style={styles.alertDate}>
                        {formatDate(alert.date)}
                      </Text>
                    </View>
                    {!alert.read && <View style={styles.unreadDot} />}
                  </View>
                ))
              )}
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  statusText: { fontSize: 13, fontWeight: "600", color: theme.colors.success },
  scrollView: { flex: 1, padding: theme.spacing.lg },

  scoresSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  scoreCard: { flex: 1, padding: theme.spacing.md },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bureauName: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  changeText: { fontSize: 12, fontWeight: "700" },
  scoreValue: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  lastUpdated: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  chartCard: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chartEmpty: { alignItems: "center", paddingVertical: theme.spacing.lg },
  chartEmptyText: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },

  factorsCard: { marginBottom: theme.spacing.md },
  factorsEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: theme.spacing.sm,
  },
  factorsEmptyText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  alertsCard: { marginBottom: theme.spacing.md },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  alertsEmpty: { paddingVertical: theme.spacing.md, alignItems: "center" },
  alertsEmptyText: { fontSize: 13, color: theme.colors.textSecondary },

  alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  alertUnread: {
    backgroundColor: theme.colors.primary + "08",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertContent: { flex: 1 },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  alertDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  alertDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  stateContainer: { alignItems: "center", padding: 40, gap: 12 },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { color: "#fff", fontWeight: "600" },
});
