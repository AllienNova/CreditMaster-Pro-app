/**
 * Fynvita Smart Alerts Screen
 * AI-powered proactive alerts for financial events
 */

import React, { useState, useCallback } from "react";
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

type AlertType =
  | "unusual_spending"
  | "low_balance"
  | "large_transaction"
  | "bill_due"
  | "subscription_change"
  | "savings_opportunity"
  | "credit_change"
  | "budget_exceeded"
  | "fraud_suspected";

type AlertPriority = "low" | "medium" | "high" | "critical";
type AlertStatus = "pending" | "read" | "dismissed" | "acted_upon";

interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  actionRoute: string;
  actionLabel: string;
  data: Record<string, unknown>;
  status: AlertStatus;
  createdAt: Date;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "1",
    type: "fraud_suspected",
    priority: "critical",
    title: "Suspicious Activity Detected",
    message:
      "Unusual transaction pattern detected on your credit card ending in 4532",
    actionRoute: "/settings/security",
    actionLabel: "Review Activity",
    data: { amount: 847.99, merchant: "Unknown Merchant", location: "Foreign" },
    status: "pending",
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "2",
    type: "bill_due",
    priority: "high",
    title: "Bill Due Tomorrow",
    message: "Your electricity bill of $142.50 is due tomorrow",
    actionRoute: "/financial/bills",
    actionLabel: "Pay Now",
    data: { billName: "Electric Company", amount: 142.5 },
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "3",
    type: "budget_exceeded",
    priority: "high",
    title: "Budget Exceeded",
    message: "Your Dining Out budget has exceeded the limit by $45.00",
    actionRoute: "/financial/budgets",
    actionLabel: "Adjust Budget",
    data: { category: "Dining Out", spent: 345, budget: 300, overage: 45 },
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "4",
    type: "unusual_spending",
    priority: "medium",
    title: "Unusual Spending Pattern",
    message: "Your shopping spending is 85% higher than your monthly average",
    actionRoute: "/insights/spending",
    actionLabel: "View Details",
    data: {
      category: "Shopping",
      currentSpending: 650,
      average: 350,
      percentIncrease: 85,
    },
    status: "read",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "5",
    type: "credit_change",
    priority: "medium",
    title: "Credit Score Update",
    message: "Your credit score increased by 15 points to 742",
    actionRoute: "/(tabs)/credit",
    actionLabel: "View Score",
    data: { currentScore: 742, previousScore: 727, change: 15 },
    status: "read",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "6",
    type: "savings_opportunity",
    priority: "low",
    title: "Savings Opportunity",
    message: "You could save $35/month by switching your streaming services",
    actionRoute: "/financial/bills",
    actionLabel: "Review",
    data: {
      potentialSavings: 35,
      subscriptions: ["Netflix", "Hulu", "Disney+"],
    },
    status: "pending",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const ALERT_TYPE_CONFIG: Record<
  AlertType,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  unusual_spending: { icon: "trending-up", color: "#F59E0B" },
  low_balance: { icon: "wallet", color: "#EF4444" },
  large_transaction: { icon: "card", color: "#3B82F6" },
  bill_due: { icon: "calendar", color: "#8B5CF6" },
  subscription_change: { icon: "refresh", color: "#6366F1" },
  savings_opportunity: { icon: "bulb", color: "#22C55E" },
  credit_change: { icon: "analytics", color: "#10B981" },
  budget_exceeded: { icon: "warning", color: "#EF4444" },
  fraud_suspected: { icon: "shield", color: "#DC2626" },
};

export default function SmartAlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "read">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | AlertPriority>(
    "all",
  );

  const filteredAlerts = alerts.filter((alert) => {
    if (filter !== "all" && alert.status !== filter) return false;
    if (priorityFilter !== "all" && alert.priority !== priorityFilter)
      return false;
    return true;
  });

  const pendingCount = alerts.filter((a) => a.status === "pending").length;
  const criticalCount = alerts.filter(
    (a) => a.priority === "critical" && a.status === "pending",
  ).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleDismiss = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "dismissed" as AlertStatus } : a,
      ),
    );
  };

  const handleMarkRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "read" as AlertStatus } : a,
      ),
    );
  };

  const handleMarkAllRead = () => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.status === "pending" ? { ...a, status: "read" as AlertStatus } : a,
      ),
    );
  };

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case "critical":
        return "#DC2626";
      case "high":
        return "#F59E0B";
      case "medium":
        return "#3B82F6";
      case "low":
        return "#22C55E";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading alerts...</Text>
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
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Smart Alerts</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
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

        {/* Critical Alert Banner */}
        {criticalCount > 0 && (
          <View style={styles.criticalBanner}>
            <Ionicons name="shield" size={24} color="#DC2626" />
            <View style={styles.criticalContent}>
              <Text style={styles.criticalTitle}>
                {criticalCount} Critical Alert{criticalCount > 1 ? "s" : ""}
              </Text>
              <Text style={styles.criticalSubtitle}>
                Requires immediate attention
              </Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {(["all", "pending", "read"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    filter === f && styles.filterChipActive,
                  ]}
                  onPress={() => setFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === f && styles.filterTextActive,
                    ]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={styles.filterDivider} />
              {(["all", "critical", "high", "medium", "low"] as const).map(
                (p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.filterChip,
                      priorityFilter === p && styles.filterChipActive,
                    ]}
                    onPress={() => setPriorityFilter(p)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        priorityFilter === p && styles.filterTextActive,
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </ScrollView>
        </View>

        {/* Mark All Read */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
          >
            <Ionicons
              name="checkmark-done"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.markAllText}>Mark All Read</Text>
          </TouchableOpacity>
        )}

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Alerts</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up! No alerts match your current filters.
            </Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => {
            const config = ALERT_TYPE_CONFIG[alert.type];
            return (
              <Card
                key={alert.id}
                style={[
                  styles.alertCard,
                  alert.status === "pending" && styles.alertCardPending,
                ]}
              >
                <View style={styles.alertHeader}>
                  <View
                    style={[
                      styles.alertIcon,
                      { backgroundColor: `${config.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={config.icon}
                      size={22}
                      color={config.color}
                    />
                  </View>
                  <View style={styles.alertContent}>
                    <View style={styles.alertTitleRow}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      {alert.status === "pending" && (
                        <TouchableOpacity
                          onPress={() => handleDismiss(alert.id)}
                        >
                          <Ionicons
                            name="close"
                            size={18}
                            color={theme.colors.textSecondary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.alertMeta}>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor: `${getPriorityColor(alert.priority)}15`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(alert.priority) },
                          ]}
                        >
                          {alert.priority}
                        </Text>
                      </View>
                      <Text style={styles.timeAgo}>
                        {formatTimeAgo(alert.createdAt)}
                      </Text>
                      {alert.status === "pending" && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                  </View>
                </View>
                <View style={styles.alertActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: config.color },
                    ]}
                    onPress={() => {
                      handleMarkRead(alert.id);
                      router.push(alert.actionRoute as never);
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      {alert.actionLabel}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                  {alert.status === "pending" && (
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={() => handleMarkRead(alert.id)}
                    >
                      <Text style={styles.secondaryActionText}>
                        Mark as read
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* Alert Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {alerts.filter((a) => a.status === "pending").length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#DC2626" }]}>
              {alerts.filter((a) => a.priority === "critical").length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#22C55E" }]}>
              {alerts.filter((a) => a.status === "acted_upon").length}
            </Text>
            <Text style={styles.statLabel}>Acted On</Text>
          </View>
        </View>

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
  headerCenter: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  badge: {
    marginLeft: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  criticalBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  criticalContent: { marginLeft: 12, flex: 1 },
  criticalTitle: { fontSize: 15, fontWeight: "600", color: "#DC2626" },
  criticalSubtitle: { fontSize: 13, color: "#991B1B", marginTop: 2 },
  filtersContainer: { marginBottom: theme.spacing.md },
  filterRow: { flexDirection: "row", alignItems: "center" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 13, color: theme.colors.textSecondary },
  filterTextActive: { color: "#fff", fontWeight: "500" },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: theme.spacing.md,
    padding: 8,
  },
  markAllText: {
    fontSize: 13,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
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
  alertCard: { marginBottom: theme.spacing.md },
  alertCardPending: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  alertHeader: { flexDirection: "row" },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertContent: { flex: 1 },
  alertTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  alertMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeAgo: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 8 },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  alertActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginRight: 4,
  },
  secondaryAction: { marginLeft: 12, padding: 8 },
  secondaryActionText: { fontSize: 13, color: theme.colors.textSecondary },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
});
