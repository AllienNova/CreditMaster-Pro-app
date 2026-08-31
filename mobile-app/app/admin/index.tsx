/**
 * Admin home — the real platform counts.
 *
 * WHAT THIS REPLACED. A METRICS fixture: "Total Users 12,458 +12%", "Monthly
 * Revenue $245,890 +15%", "Dispute Success Rate 78% +3%" and three more, shown
 * to every operator with no request. Pull-to-refresh was
 * `await new Promise((r) => setTimeout(r, 1000))` — a spinner over a constant.
 *
 * GET /api/admin/stats (withRole "admin") counts the real tables.
 *
 * TWO METRICS ARE GONE BECAUSE THEY HAVE NO SOURCE. "Avg Score Improvement"
 * and "Support Tickets" have no table, no route and no service anywhere in
 * this codebase. Rendering them from a fixture is how a number nobody computes
 * ends up on an operator's dashboard.
 *
 * AND ONLY ONE CHANGE PERCENTAGE IS REAL. /admin/stats returns `userGrowth`.
 * The other five green arrows were decoration — a "+15%" beside revenue is a
 * claim about a trend nobody measured — so they are shown only where the route
 * actually provides one.
 *
 * QUICK_ACTIONS stays. It is the admin navigation menu — product content, not
 * user data — and is classified `catalogue` rather than fabrication.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import {
  adminStatsApi,
  type AdminPlatformStats,
} from "../../src/services/api/admin";

const formatCount = (n: number): string => new Intl.NumberFormat("en-US").format(n);

const formatMoney = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * The four metrics /api/admin/stats can actually answer.
 *
 * `change` is present on exactly one of them, because userGrowth is the only
 * trend the route computes. The rest carry no change at all rather than a
 * plausible-looking percentage.
 */
function metricsFrom(stats: AdminPlatformStats) {
  const successRate =
    stats.totalDisputes > 0
      ? Math.round((stats.resolvedDisputes / stats.totalDisputes) * 100)
      : null;

  return [
    {
      id: "users",
      title: "Total Users",
      value: formatCount(stats.totalUsers),
      change: `${stats.userGrowth >= 0 ? "+" : ""}${stats.userGrowth}%`,
      changeType: stats.userGrowth >= 0 ? "positive" : "negative",
      icon: "people" as const,
    },
    {
      id: "subs",
      title: "Active Subscriptions",
      value: formatCount(stats.activeSubscriptions),
      change: null,
      changeType: "positive",
      icon: "card" as const,
    },
    {
      id: "revenue",
      title: "Monthly Revenue",
      value: formatMoney(stats.monthlyRevenue),
      change: null,
      changeType: "positive",
      icon: "cash" as const,
    },
    {
      id: "disputes",
      title: "Dispute Success Rate",
      // Null, and rendered as "—", when no dispute has been filed. The old
      // screen's flat "78%" asserted a rate for a platform with no disputes.
      value: successRate === null ? "—" : `${successRate}%`,
      change: null,
      changeType: "positive",
      icon: "document-text" as const,
    },
  ];
}

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "1", title: "Users", icon: "people", route: "/admin/users" },
  { id: "2", title: "Metrics", icon: "stats-chart", route: "/admin/metrics" },
  { id: "3", title: "Analytics", icon: "bar-chart", route: "/admin/analytics" },
  { id: "4", title: "Disputes", icon: "document-text", route: "/admin/disputes" },
  { id: "5", title: "Subscriptions", icon: "card", route: "/admin/subscriptions" },
  { id: "6", title: "System health", icon: "pulse", route: "/admin/health" },
  { id: "7", title: "Logs", icon: "list", route: "/admin/logs" },
  { id: "8", title: "Audit trail", icon: "shield-checkmark", route: "/admin/audit" },
  { id: "9", title: "Feature flags", icon: "flag", route: "/admin/features" },
  { id: "10", title: "System config", icon: "construct", route: "/admin/config" },
  { id: "11", title: "Admin settings", icon: "settings", route: "/admin/settings" },
  { id: "12", title: "App settings", icon: "options", route: "/settings" },
];

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await adminStatsApi.getStats();
    if (!res.success || !res.data) {
      // No zero-filled fallback. An operator seeing 0 users would conclude
      // something very different from "we could not read the counts".
      setError("We could not load the platform stats.");
      setStats(null);
      setLoading(false);
      return;
    }
    setStats(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Was `await new Promise((r) => setTimeout(r, 1000))` — a spinner that
  // refreshed nothing.
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const metrics = stats ? metricsFrom(stats) : [];

  const getChangeColor = (type: string) => {
    switch (type) {
      case "positive":
        return "#22C55E";
      case "negative":
        return "#EF4444";
      default:
        return theme.colors.textSecondary;
    }
  };

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
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity>
            <Ionicons
              name="notifications"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Admin Badge */}
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#fff" />
          <Text style={styles.adminBadgeText}>Administrator Access</Text>
        </View>

        {/* Metrics Grid */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        {loading ? (
          <Card>
            <Text style={styles.metricTitle}>Loading platform stats…</Text>
          </Card>
        ) : error ? (
          <Card>
            <Text style={styles.metricTitle}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : null}
        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <Card key={metric.id} style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <Ionicons
                  name={metric.icon}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricTitle}>{metric.title}</Text>
              {/* Rendered only where the route computes a trend. Four of the
                  old six carried a green arrow over a number nobody
                  measured. */}
              {metric.change ? (
                <View style={styles.changeRow}>
                  <Ionicons
                    name={
                      metric.changeType === "positive"
                        ? "arrow-up"
                        : "arrow-down"
                    }
                    size={12}
                    color={getChangeColor(metric.changeType)}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      { color: getChangeColor(metric.changeType) },
                    ]}
                  >
                    {metric.change}
                  </Text>
                </View>
              ) : null}
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={() => router.push(action.route as never)}
            >
              <View style={styles.actionIcon}>
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard}>
          {[
            {
              time: "2 min ago",
              text: "New user registered: john@example.com",
              icon: "person-add",
            },
            {
              time: "15 min ago",
              text: "Dispute #4521 resolved successfully",
              icon: "checkmark-circle",
            },
            {
              time: "1 hour ago",
              text: "Premium subscription: sarah@example.com",
              icon: "card",
            },
            {
              time: "2 hours ago",
              text: "Support ticket #892 closed",
              icon: "help-circle",
            },
          ].map((activity, idx) => (
            <View
              key={idx}
              style={[styles.activityItem, idx < 3 && styles.activityBorder]}
            >
              <View style={styles.activityIcon}>
                <Ionicons
                  name={activity.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
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
    marginBottom: theme.spacing.md,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: theme.spacing.lg,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 6,
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
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  metricCard: {
    width: "48%",
    margin: "1%",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricValue: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  metricTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  changeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  changeText: { fontSize: 11, fontWeight: "600", marginLeft: 2 },
  actionsRow: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: { alignItems: "center", padding: theme.spacing.md },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionTitle: { fontSize: 12, fontWeight: "500", color: theme.colors.text },
  activityCard: { padding: 0 },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: theme.colors.text },
  activityTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
