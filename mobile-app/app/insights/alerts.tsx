/**
 * Fynvita Smart Alerts Screen
 * AI-powered proactive alerts for financial events
 */

import React, { useState, useCallback, useEffect } from "react";
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
import { creditMonitoringApi } from "../../src/services/api/credit";
import { budgetApi } from "../../src/services/api/financial";
import type { BudgetOverviewAlert } from "../../src/services/api/financial";
import type { CreditMonitoringAlert } from "../../src/services/api/types";

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

/**
 * Namespacing, so the screen can tell a row from a derivation.
 *
 * A credit-monitoring alert is a stored row with an id the PATCH accepts. A
 * budget alert is computed from a category being over budget and has no id at
 * all, so it cannot be acknowledged. Without the prefix, marking one read
 * would PATCH an alert id that does not exist.
 */
const CREDIT_ALERT_PREFIX = "credit:";

/** Credit-monitoring severities map onto this screen's priorities one-to-one. */
function fromCreditAlert(a: CreditMonitoringAlert): Alert {
  return {
    id: `${CREDIT_ALERT_PREFIX}${a.id}`,
    // The route's union is credit-specific: new_account, score_change,
    // inquiry, address_change, fraud_alert, derogatory. Only fraud_alert has a
    // counterpart in this screen's wider set; the rest render as a credit
    // change rather than being forced into a spending shape they are not.
    type: a.alertType === "fraud_alert" ? "fraud_suspected" : "credit_change",
    priority: a.severity,
    title: a.title,
    message: a.message ?? a.description,
    actionRoute: "/credit/monitoring",
    actionLabel: "View monitoring",
    data: a.data ?? {},
    status: a.acknowledged ? "read" : "pending",
    createdAt: new Date(a.createdAt),
  };
}

/**
 * A budget alert carries a category, a severity and a message — no id and no
 * timestamp. Rendered with what it has rather than padded out.
 */
function fromBudgetAlert(a: BudgetOverviewAlert, index: number): Alert {
  return {
    id: `budget:${a.category}:${index}`,
    type: "budget_exceeded",
    priority: a.severity,
    title: a.category,
    message: a.message,
    actionRoute: "/financial/budgets",
    actionLabel: "View budgets",
    data: {},
    status: "pending",
    // Derived at read time, so "now" is the honest stamp: it is when the
    // condition was observed, not when a row was written.
    createdAt: new Date(),
  };
}

export default function SmartAlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const load = useCallback(async () => {
    setError(null);

    // Two independent real sources. Either failing must not hide the other,
    // so neither gates the other and each contributes what it has.
    const [credit, budget] = await Promise.all([
      creditMonitoringApi.getAlerts(),
      budgetApi.getBudgetSummary(),
    ]);

    const next: Alert[] = [];
    if (credit.success && credit.data) {
      next.push(...credit.data.items.map(fromCreditAlert));
    }
    if (budget.success && budget.data) {
      next.push(...budget.data.alerts.map(fromBudgetAlert));
    }

    // Both failing is a FAILED READ, a different statement from having no
    // alerts — and on this screen the difference is whether the user believes
    // nothing is wrong.
    if (!credit.success && !budget.success) {
      setError("We could not load your alerts.");
    }
    setAlerts(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    // This used to be `await new Promise(r => setTimeout(r, 1000))` — a
    // spinner over no request at all.
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  /**
   * Only credit-monitoring alerts can be acknowledged: they are ROWS with an
   * id the PATCH accepts. A budget alert is DERIVED from a category being over
   * budget, so there is nothing to mark — it goes when the spending does.
   */
  const isAcknowledgeable = (id: string) => id.startsWith(CREDIT_ALERT_PREFIX);

  const handleDismiss = (alertId: string) => {
    // Local by design: no endpoint records a dismissal. Saying so beats
    // mark-read's old behaviour of implying the server was told.
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "dismissed" as AlertStatus } : a,
      ),
    );
  };

  const handleMarkRead = async (alertId: string) => {
    if (!isAcknowledgeable(alertId)) return;
    const res = await creditMonitoringApi.acknowledgeAlert(
      alertId.slice(CREDIT_ALERT_PREFIX.length),
    );
    // Reflect it only if the server took it. The previous version set state
    // unconditionally, so an alert marked itself read and came back on the
    // next load with no error shown.
    if (!res.success) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: "read" as AlertStatus } : a,
      ),
    );
  };

  const handleMarkAllRead = async () => {
    const res = await creditMonitoringApi.acknowledgeAllAlerts();
    if (!res.success) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.status === "pending" && isAcknowledgeable(a.id)
          ? { ...a, status: "read" as AlertStatus }
          : a,
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
        {error ? (
          // "You're all caught up" and "we could not read your alerts" are
          // opposite statements about someone's credit. The empty state below
          // must never stand in for a failed read.
          <View style={styles.emptyState}>
            <Ionicons
              name="cloud-offline-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.secondaryActionText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAlerts.length === 0 ? (
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
