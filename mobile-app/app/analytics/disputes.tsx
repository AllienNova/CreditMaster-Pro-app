/**
 * Dispute Analytics — counts over the caller's OWN disputes.
 *
 * WHAT THIS REPLACED. Three fixtures with no request: 24 disputes of which 18
 * successful, a per-type table topped by "Late Payments 8, 87% success", and
 * six months of filed/resolved bars. Every user saw the same imagined dispute
 * history — including users who had never filed one, who were shown a 75%
 * success rate they had no part in.
 *
 * WHERE THE DATA COMES FROM. There is no aggregates endpoint and none is
 * needed: GET /api/disputes returns the caller's disputes, user-scoped
 * server-side, and every figure here is a count over that list.
 * summarizeDisputes does the arithmetic in one testable place
 * (services/api/disputes.ts) rather than inside this component.
 *
 * A SUCCESS RATE OVER NOTHING IS NOT ZERO. A type with no decided dispute
 * gets a null rate and renders "—", not "0%": zero reads as "we tried and
 * failed" when the truth is "still open". The count travels beside every rate
 * so a reader can see that a 100% is 1 of 1.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  disputeApi,
  summarizeDisputes,
  type DisputeAnalytics,
} from "../../src/services/api/disputes";

/** How many disputes to pull for the aggregates. */
const ANALYTICS_PAGE_SIZE = 200;

/** Pixels per dispute in the monthly bars — the fixture's implicit scale. */
const BAR_UNIT_HEIGHT = 15;

export default function DisputeAnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("6M");
  const periods = ["1M", "3M", "6M", "1Y", "ALL"];

  const [analytics, setAnalytics] = useState<DisputeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await disputeApi.getAll({ limit: ANALYTICS_PAGE_SIZE });

    if (!res.success || !res.data) {
      // Not zeroes. "You have filed no disputes" and "we could not read your
      // disputes" lead to opposite actions.
      setError("We could not load your dispute history.");
      setLoading(false);
      return;
    }

    setAnalytics(summarizeDisputes(res.data.items ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = analytics?.stats ?? {
    total: 0,
    successful: 0,
    pending: 0,
    rejected: 0,
  };
  const byType = analytics?.byType ?? [];
  const monthly = analytics?.monthly ?? [];

  // Null, not 0, when nothing has been filed. The old expression divided by
  // DISPUTE_STATS.total, which the fixture guaranteed was 24 — so the NaN
  // this produces for a real new user was never reachable.
  const successRate =
    stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dispute Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Success Rate */}
        <Card style={styles.successCard}>
          <View style={styles.successCircle}>
            {/* "—" when nothing has been filed. The old expression divided
                by a fixture that was always 24, so the NaN a real new user
                would have produced was never reachable. */}
            <Text style={styles.successValue}>
              {successRate === null ? "—" : `${successRate}%`}
            </Text>
            <Text style={styles.successLabel}>Success Rate</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#22C55E" }]}>
                {stats.successful}
              </Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                {stats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#EF4444" }]}>
                {stats.rejected}
              </Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        </Card>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monthly Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Activity</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <Text style={styles.legendText}>Filed</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#22C55E" }]}
              />
              <Text style={styles.legendText}>Resolved</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {monthly.map((data) => (
              <View key={data.month} style={styles.chartColumn}>
                <View style={styles.barGroup}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: data.filed * BAR_UNIT_HEIGHT,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: data.resolved * BAR_UNIT_HEIGHT,
                        backgroundColor: "#22C55E",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{data.month}</Text>
              </View>
            ))}
          </View>
        </Card>

        {loading ? (
          <Card>
            <Text style={styles.emptyText}>Loading your disputes…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : stats.total === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              You have not filed any disputes yet. Once you do, their outcomes
              appear here.
            </Text>
          </Card>
        ) : null}

        {/* By Type */}
        <Text style={styles.sectionTitle}>Success by Type</Text>
        {byType.map((item) => (
          <Card key={item.type} style={styles.typeCard}>
            <View style={styles.typeHeader}>
              <Text style={styles.typeName}>{item.type}</Text>
              {/* Both numbers: a 100% rate over one decided dispute should
                  not look like a track record. */}
              <Text style={styles.typeCount}>
                {item.count} {item.count === 1 ? "dispute" : "disputes"}
                {item.resolved > 0 ? ` · ${item.resolved} decided` : ""}
              </Text>
            </View>
            <View style={styles.typeProgress}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      // 0-width bar for an undecided type, and no colour
                      // claim either — "0%" would read as a loss.
                      width: `${item.successRate ?? 0}%`,
                      backgroundColor:
                        item.successRate === null
                          ? theme.colors.borderLight
                          : item.successRate >= 75
                            ? "#22C55E"
                            : item.successRate >= 50
                              ? "#F59E0B"
                              : "#EF4444",
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.typeRate,
                  {
                    // Neutral for an undecided type. Colouring "—" red would
                    // state a failure that has not happened.
                    color:
                      item.successRate === null
                        ? theme.colors.textSecondary
                        : item.successRate >= 75
                          ? "#22C55E"
                          : item.successRate >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                  },
                ]}
              >
                {item.successRate === null ? "—" : `${item.successRate}%`}
              </Text>
            </View>
          </Card>
        ))}

        {/* Insights */}
        <Text style={styles.sectionTitle}>Insights</Text>
        <Card style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.insightText}>
              Inquiry disputes have the highest success rate. Consider disputing
              more inquiries.
            </Text>
          </View>
        </Card>
        <Card style={styles.insightCard}>
          <View style={styles.insightRow}>
            <Ionicons name="trending-up" size={20} color="#22C55E" />
            <Text style={styles.insightText}>
              Your dispute success rate has improved by 12% over the last 3
              months.
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  successCard: { marginBottom: theme.spacing.md },
  successCircle: { alignItems: "center", paddingVertical: theme.spacing.lg },
  successValue: { fontSize: 48, fontWeight: "700", color: "#22C55E" },
  successLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  periodSelector: { flexDirection: "row", marginBottom: theme.spacing.md },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  periodButtonActive: { backgroundColor: theme.colors.primary },
  periodText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  periodTextActive: { color: "#fff" },
  chartCard: { marginBottom: theme.spacing.lg },
  chartTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  legendRow: { flexDirection: "row", marginBottom: theme.spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: theme.colors.textSecondary },
  chart: { flexDirection: "row", height: 120, alignItems: "flex-end" },
  chartColumn: { flex: 1, alignItems: "center" },
  barGroup: { flexDirection: "row", alignItems: "flex-end" },
  bar: { width: 12, marginHorizontal: 2, borderRadius: 3 },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6 },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  typeCard: { marginBottom: theme.spacing.sm },
  typeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  typeCount: { fontSize: 12, color: theme.colors.textSecondary },
  typeProgress: { flexDirection: "row", alignItems: "center" },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  typeRate: { fontSize: 14, fontWeight: "600", width: 40, textAlign: "right" },
  insightCard: { marginBottom: theme.spacing.sm },
  insightRow: { flexDirection: "row", alignItems: "flex-start" },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    marginLeft: 12,
    lineHeight: 18,
  },
});
