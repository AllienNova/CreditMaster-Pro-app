/**
 * Fynvita Admin System Health Screen
 *
 * Real-data wiring (M4-1): renders live per-service liveness from
 * GET /api/admin/health (withRole("admin")) via adminHealthApi.getSystemHealth,
 * adapted web -> mobile by mapWebSystemHealth. Fetch on mount with honest inline
 * loading / error / empty states and a header refresh that re-fetches.
 *
 * The former hardcoded SERVICES array, the local Service interface, and the fake
 * setTimeout load were removed. Crucially, the route reports NO uptime,
 * response-time, or last-check numbers, so this screen renders none — the old
 * "99.99%" / "45ms" / "30s ago" values were fabricated. Status is shown exactly
 * as the route reports it: healthy=green, degraded/unknown=amber, down=red.
 * `unknown` (a service that could not be assessed — e.g. unconfigured) is shown
 * honestly in amber, never laundered into a green "operational".
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenError } from "../../src/components/ScreenError";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { adminHealthApi } from "../../src/services/api/admin";
import type {
  ServiceHealthStatus,
  SystemHealth,
} from "../../src/services/api/admin";

// Overall headline per status. "All Systems Operational" appears ONLY when the
// route's worst-component-wins overall is genuinely `healthy` (every probe
// succeeded) — it is never hardcoded on. Any other overall reports honestly.
const OVERALL_LABEL: Record<ServiceHealthStatus, string> = {
  healthy: "All Systems Operational",
  degraded: "Some Systems Degraded",
  unknown: "Status Unknown",
  down: "System Outage",
};

// status is a closed union (ServiceHealthStatus); the switch is exhaustive.
function getStatusColor(status: ServiceHealthStatus): string {
  switch (status) {
    case "healthy":
      return theme.colors.success;
    case "degraded":
      return theme.colors.warning;
    case "unknown":
      return theme.colors.warning;
    case "down":
      return theme.colors.error;
  }
}

// checkedAt arrives as an ISO string; render a compact locale time. Absent or
// unparseable -> "" so the caller omits the line rather than showing a fake time.
function formatCheckedAt(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString();
}

export default function AdminHealthScreen() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    const res = await adminHealthApi.getSystemHealth();
    if (res.success && res.data) {
      setHealth(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Unable to load system health.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
      // try/finally: a REJECTED request used to skip setLoading(false)
      // entirely, leaving a permanent spinner the user cannot escape —
      // indistinguishable from a slow network. See G-033.
    try {
      await fetchHealth();
    } finally {
      setLoading(false);
    }
  }, [fetchHealth]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealth();
    setRefreshing(false);
  };

  if (loading && !health) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered} testID="admin-health-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Checking system health...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !health) {
    return (
      <ScreenError
        title="System Health"
        message={error}
        onRetry={load}
        testID="admin-health-error"
      />
    );
  }

  // After the guards above, a successful fetch has populated `health`. The null
  // check narrows the type and covers the impossible not-loading/no-error/no-data
  // state without asserting non-null.
  if (!health) return null;

  const checkedAt = formatCheckedAt(health.checkedAt);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>System Health</Text>
            <Text style={styles.subtitle}>Service status & monitoring</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
            testID="admin-health-refresh"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons
                name="refresh"
                size={24}
                color={theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Overall status — driven by the route's real worst-component-wins status */}
        <Card
          style={[
            styles.statusCard,
            { backgroundColor: `${getStatusColor(health.status)}10` },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(health.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(health.status) },
              ]}
            >
              {OVERALL_LABEL[health.status]}
            </Text>
          </View>
          {checkedAt !== "" && (
            <Text style={styles.checkedAt}>Last checked {checkedAt}</Text>
          )}
        </Card>

        {/* Services List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {health.services.length === 0 ? (
            <View style={styles.emptyCard} testID="admin-health-empty">
              <Ionicons
                name="pulse-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No services reported</Text>
              <Text style={styles.emptyText}>
                The health check returned no monitored services.
              </Text>
            </View>
          ) : (
            health.services.map((service, i) => (
              <Card key={`${service.name}-${i}`} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View
                    style={[
                      styles.serviceDot,
                      { backgroundColor: getStatusColor(service.status) },
                    ]}
                  />
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: `${getStatusColor(service.status)}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getStatusColor(service.status) },
                      ]}
                    >
                      {service.status}
                    </Text>
                  </View>
                </View>
                {service.detail ? (
                  <Text style={styles.serviceDetail}>{service.detail}</Text>
                ) : null}
              </Card>
            ))
          )}
        </View>
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
  refreshButton: { padding: theme.spacing.sm, minWidth: 40, alignItems: "center" },
  statusCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: "600" },
  checkedAt: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  serviceCard: { marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  serviceHeader: { flexDirection: "row", alignItems: "center" },
  serviceDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  serviceDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  emptyCard: { padding: theme.spacing.xl, alignItems: "center" },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
