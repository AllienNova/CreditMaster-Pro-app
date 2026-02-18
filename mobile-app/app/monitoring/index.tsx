/**
 * Fynvita Credit Monitoring Dashboard
 * Monitoring status, bureau connections, alerts list
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useCreditStore } from "../../src/store/creditStore";

const BUREAUS = [
  { id: "experian", name: "Experian", color: "#0066CC" },
  { id: "equifax", name: "Equifax", color: "#C41230" },
  { id: "transunion", name: "TransUnion", color: "#00A3E0" },
];

export default function MonitoringScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    monitoringStatus,
    alerts,
    unreadAlertCount,
    fetchMonitoringStatus,
    fetchAlerts,
    toggleBureauMonitoring,
  } = useCreditStore();

  useEffect(() => {
    fetchMonitoringStatus();
    fetchAlerts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMonitoringStatus(), fetchAlerts()]);
    setRefreshing(false);
  };

  const isActive = monitoringStatus?.isActive ?? true;
  const recentAlerts = alerts.slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
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
          <Text style={styles.title}>Credit Monitoring</Text>
          <TouchableOpacity onPress={() => router.push("/monitoring/settings")}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={isActive ? "shield-checkmark" : "shield-outline"}
              size={48}
              color={isActive ? "#10B981" : theme.colors.textSecondary}
            />
          </View>
          <Text style={styles.statusTitle}>
            {isActive ? "Monitoring Active" : "Monitoring Paused"}
          </Text>
          <Text style={styles.statusDescription}>
            {isActive
              ? "Your credit is being monitored 24/7 across all three bureaus"
              : "Enable monitoring to receive alerts about changes to your credit"}
          </Text>
          {unreadAlertCount > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => router.push("/monitoring/alerts")}
            >
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.alertBannerText}>
                {unreadAlertCount} unread alert{unreadAlertCount > 1 ? "s" : ""}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
            </TouchableOpacity>
          )}
        </Card>

        {/* Bureau Connections */}
        <Card style={styles.bureauCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bureau Connections</Text>
            <TouchableOpacity
              onPress={() => router.push("/monitoring/bureaus")}
            >
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          {BUREAUS.map((bureau) => {
            const isConnected =
              monitoringStatus?.bureaus?.[bureau.id]?.connected ?? true;
            const isEnabled =
              monitoringStatus?.bureaus?.[bureau.id]?.enabled ?? true;
            return (
              <View key={bureau.id} style={styles.bureauRow}>
                <View
                  style={[
                    styles.bureauIcon,
                    { backgroundColor: `${bureau.color}20` },
                  ]}
                >
                  <Text style={[styles.bureauInitial, { color: bureau.color }]}>
                    {bureau.name[0]}
                  </Text>
                </View>
                <View style={styles.bureauInfo}>
                  <Text style={styles.bureauName}>{bureau.name}</Text>
                  <Text style={styles.bureauStatus}>
                    {isConnected ? "Connected" : "Not connected"}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={(value) =>
                    toggleBureauMonitoring(bureau.id, value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: `${theme.colors.primary}50`,
                  }}
                  thumbColor={isEnabled ? theme.colors.primary : "#f4f3f4"}
                />
              </View>
            );
          })}
        </Card>

        {/* Recent Alerts */}
        <Card style={styles.alertsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Alerts</Text>
            <TouchableOpacity onPress={() => router.push("/monitoring/alerts")}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertItem}
                onPress={() => router.push(`/monitoring/alerts/${alert.id}`)}
              >
                <View
                  style={[
                    styles.alertIcon,
                    {
                      backgroundColor:
                        alert.severity === "high"
                          ? "#FEE2E2"
                          : alert.severity === "medium"
                            ? "#FEF3C7"
                            : "#D1FAE5",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      alert.type === "score_change"
                        ? "trending-up"
                        : alert.type === "new_account"
                          ? "add-circle"
                          : alert.type === "inquiry"
                            ? "search"
                            : "alert-circle"
                    }
                    size={18}
                    color={
                      alert.severity === "high"
                        ? "#EF4444"
                        : alert.severity === "medium"
                          ? "#F59E0B"
                          : "#10B981"
                    }
                  />
                </View>
                <View style={styles.alertContent}>
                  <Text
                    style={[
                      styles.alertTitle,
                      !alert.acknowledged && styles.alertTitleUnread,
                    ]}
                  >
                    {alert.title}
                  </Text>
                  <Text style={styles.alertDate}>
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {!alert.acknowledged && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyAlerts}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.emptyAlertsText}>No recent alerts</Text>
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/monitoring/alerts")}
          >
            <Ionicons
              name="notifications"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.quickActionText}>All Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/monitoring/settings")}
          >
            <Ionicons name="settings" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push("/identity")}
          >
            <Ionicons name="shield" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Identity</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statusCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  statusIcon: { marginBottom: theme.spacing.md },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  alertBannerText: { flex: 1, fontSize: 14, color: "#92400E", marginLeft: 8 },
  bureauCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  manageLink: { fontSize: 14, color: theme.colors.primary, fontWeight: "500" },
  bureauRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bureauIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  bureauInitial: { fontSize: 18, fontWeight: "700" },
  bureauInfo: { flex: 1 },
  bureauName: { fontSize: 15, fontWeight: "500", color: theme.colors.text },
  bureauStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  alertsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  viewAllLink: { fontSize: 14, color: theme.colors.primary, fontWeight: "500" },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, color: theme.colors.text },
  alertTitleUnread: { fontWeight: "600" },
  alertDate: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  emptyAlerts: { alignItems: "center", paddingVertical: theme.spacing.lg },
  emptyAlertsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    width: 100,
  },
  quickActionText: { fontSize: 12, color: theme.colors.text, marginTop: 8 },
});
