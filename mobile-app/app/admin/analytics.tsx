/**
 * Fynvita Admin Analytics Screen
 *
 * Real-data wiring (PARITY-P1): the former hardcoded MOCK_DATA object, the fake
 * setTimeout load, and the inert time-range pill were removed. The screen now
 * fetches live platform analytics from the same real, admin-guarded route the web
 * admin analytics page renders (GET /api/admin/analytics?range=, withRole("admin"))
 * via adminAnalyticsApi.getAnalytics, with honest loading / error / empty states.
 * The time-range selector is a functional segmented control (7d/30d/90d/1y) that
 * refetches on change. topFeatures usage values are rendered exactly as the route
 * returns them (only "Dispute Letters" is a real count today; the rest are 0) —
 * never fabricated on the client.
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
import {
  adminAnalyticsApi,
  ANALYTICS_RANGES,
} from "../../src/services/api/admin";
import type {
  AdminAnalytics,
  AnalyticsRange,
} from "../../src/services/api/admin";

// Bar charts divide by the series max; floor it at 1 so an all-zero (or empty)
// series renders flat, honest zero-height bars instead of dividing by 0 / -Infinity.
function chartMax(values: number[]): number {
  return Math.max(1, ...values);
}

export default function AdminAnalyticsScreen() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      setError(null);
      const res = await adminAnalyticsApi.getAnalytics(range);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message ?? "Unable to load analytics right now.");
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Refetch on mount and whenever the selected range changes.
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  // First load only: a range switch keeps the previous data on screen until the
  // new range resolves, so the spinner does not flash between range changes.
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="admin-analytics-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <ScreenError
        title="Admin Analytics"
        message={error}
        onRetry={loadAnalytics}
        testID="admin-analytics-error"
      />
    );
  }

  const userGrowth = data?.userGrowth ?? [];
  const revenueByMonth = data?.revenueByMonth ?? [];
  const disputesByStatus = data?.disputesByStatus ?? [];
  const subscriptionsByTier = data?.subscriptionsByTier ?? [];
  const topFeatures = data?.topFeatures ?? [];

  const maxUsers = chartMax(userGrowth.map((d) => d.count));
  const maxRevenue = chartMax(revenueByMonth.map((d) => d.revenue));
  const maxDisputes = chartMax(disputesByStatus.map((d) => d.count));
  const maxSubs = chartMax(subscriptionsByTier.map((d) => d.count));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Admin Analytics</Text>
            <Text style={styles.subtitle}>Platform performance</Text>
          </View>
        </View>

        {/* Time-range selector — refetches on change */}
        <View style={styles.rangeSelector}>
          {ANALYTICS_RANGES.map((r) => {
            const active = r === range;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.rangePill, active && styles.rangePillActive]}
                onPress={() => setRange(r)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.rangeText, active && styles.rangeTextActive]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User Growth */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>User Growth</Text>
          {userGrowth.length === 0 ? (
            <Text style={styles.emptyNote} testID="admin-usergrowth-empty">
              No user-growth data yet.
            </Text>
          ) : (
            <View style={styles.chartContainer}>
              {userGrowth.map((item, i) => (
                <View key={i} style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      styles.blueBar,
                      { height: (item.count / maxUsers) * 80 },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.date}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Revenue */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Revenue</Text>
          {revenueByMonth.length === 0 ? (
            <Text style={styles.emptyNote} testID="admin-revenue-empty">
              No revenue data yet.
            </Text>
          ) : (
            <View style={styles.chartContainer}>
              {revenueByMonth.map((item, i) => (
                <View key={i} style={styles.barColumn}>
                  <Text style={styles.barValue}>
                    ${(item.revenue / 1000).toFixed(0)}K
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      styles.greenBar,
                      { height: (item.revenue / maxRevenue) * 80 },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.month}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Disputes by Status */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Disputes by Status</Text>
          {disputesByStatus.length === 0 ? (
            <Text style={styles.emptyNote} testID="admin-disputes-empty">
              No disputes to report yet.
            </Text>
          ) : (
            disputesByStatus.map((item, i) => (
              <View key={i} style={styles.statusRow}>
                <Text style={styles.statusLabel}>{item.status}</Text>
                <View style={styles.statusBarBg}>
                  <View
                    style={[
                      styles.statusBarFill,
                      { width: `${(item.count / maxDisputes) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.statusCount}>{item.count}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Subscriptions by Tier */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Subscriptions by Tier</Text>
          {subscriptionsByTier.length === 0 ? (
            <Text style={styles.emptyNote} testID="admin-subscriptions-empty">
              No subscriptions to report yet.
            </Text>
          ) : (
            subscriptionsByTier.map((item, i) => (
              <View key={i} style={styles.statusRow}>
                <Text style={styles.statusLabel}>{item.tier}</Text>
                <View style={styles.statusBarBg}>
                  <View
                    style={[
                      styles.subsBarFill,
                      { width: `${(item.count / maxSubs) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.statusCount}>{item.count}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Top Features */}
        <Card style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Top Features by Usage</Text>
          {topFeatures.length === 0 ? (
            <Text style={styles.emptyNote} testID="admin-features-empty">
              No feature-usage data yet.
            </Text>
          ) : (
            <View style={styles.featuresGrid}>
              {topFeatures.map((item, i) => (
                <View key={i} style={styles.featureItem}>
                  <Text style={styles.featureValue}>
                    {item.usage.toLocaleString()}
                  </Text>
                  <Text style={styles.featureLabel}>{item.feature}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
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
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  errorText: {
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
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
  },
  rangePillActive: { backgroundColor: theme.colors.primary },
  rangeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  rangeTextActive: { color: "#FFFFFF" },
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
  emptyNote: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    paddingVertical: theme.spacing.sm,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  barColumn: { alignItems: "center", flex: 1 },
  bar: { width: 20, borderRadius: 4 },
  blueBar: { backgroundColor: theme.colors.primary },
  greenBar: { backgroundColor: theme.colors.success },
  barLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  barValue: {
    fontSize: 9,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusLabel: { width: 80, fontSize: 12, color: theme.colors.textSecondary },
  statusBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: 5,
    marginHorizontal: 8,
  },
  statusBarFill: {
    height: 10,
    backgroundColor: theme.colors.secondary,
    borderRadius: 5,
  },
  subsBarFill: {
    height: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
  },
  statusCount: {
    width: 40,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "right",
  },
  featuresCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap" },
  featureItem: {
    width: "50%",
    padding: theme.spacing.sm,
    alignItems: "center",
  },
  featureValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  featureLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
