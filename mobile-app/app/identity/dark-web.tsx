/**
 * Fynvita Dark Web Monitoring Screen
 * Wired to real identity protection API for breach data
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { identityProtectionApi } from "../../src/services/api/user";
import type {
  IdentityProtectionStatus,
  IdentityAlert,
} from "../../src/services/api/types";

interface Breach {
  id: string;
  source: string;
  date: string;
  dataTypes: string[];
  severity: "critical" | "high" | "medium" | "low";
  resolved: boolean;
}

interface MonitoredItem {
  id: string;
  type: "email" | "phone" | "ssn" | "password";
  value: string;
  status: "safe" | "exposed";
  breachCount: number;
}

function alertsToBreaches(alerts: IdentityAlert[]): Breach[] {
  return alerts.map((alert) => ({
    id: alert.id,
    source: alert.title.replace(/\s*breach.*$/i, "").trim() || alert.title,
    date: new Date(alert.createdAt).toISOString().split("T")[0],
    dataTypes: alert.exposedData ?? [],
    severity: alert.severity,
    resolved: alert.resolved,
  }));
}

function buildMonitoredItems(
  status: IdentityProtectionStatus | null,
  alerts: IdentityAlert[],
): MonitoredItem[] {
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const emailBreaches = unresolvedAlerts.filter(
    (a) => a.exposedData?.includes("email") || a.type === "breach",
  ).length;

  const items: MonitoredItem[] = [
    {
      id: "monitored-email",
      type: "email",
      value: status?.isActive ? "Primary email" : "Not monitored",
      status: emailBreaches > 0 ? "exposed" : "safe",
      breachCount: emailBreaches,
    },
    {
      id: "monitored-phone",
      type: "phone",
      value: status?.isActive ? "Phone number" : "Not monitored",
      status: "safe",
      breachCount: 0,
    },
    {
      id: "monitored-ssn",
      type: "ssn",
      value: status?.isActive ? "SSN (protected)" : "Not monitored",
      status: "safe",
      breachCount: 0,
    },
  ];

  return items;
}

export default function DarkWebScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"breaches" | "monitored">(
    "breaches",
  );
  const [identityStatus, setIdentityStatus] =
    useState<IdentityProtectionStatus | null>(null);
  const [identityAlerts, setIdentityAlerts] = useState<IdentityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [statusRes, alertsRes] = await Promise.all([
        identityProtectionApi.getStatus(),
        identityProtectionApi.getAlerts(),
      ]);

      if (statusRes.success && statusRes.data) {
        setIdentityStatus(statusRes.data);
      }
      if (alertsRes.success && alertsRes.data) {
        setIdentityAlerts(alertsRes.data.alerts);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dark web data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const breaches = alertsToBreaches(identityAlerts);
  const monitoredItems = buildMonitoredItems(identityStatus, identityAlerts);
  const unresolvedBreaches = breaches.filter((b) => !b.resolved).length;
  const exposedItems = monitoredItems.filter(
    (i) => i.status === "exposed",
  ).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      case "medium":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return "mail";
      case "phone":
        return "call";
      case "ssn":
        return "finger-print";
      default:
        return "key";
    }
  };

  const runScan = async () => {
    setIsScanning(true);
    try {
      await identityProtectionApi.requestScan();
      await loadData();
    } catch {
      // scan request failed; UI will show existing data
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Scanning dark web data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && identityAlerts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dark Web Monitoring</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lastScanDisplay = identityStatus?.lastScan
    ? `Last scan: ${new Date(identityStatus.lastScan).toLocaleDateString()}`
    : "No scan yet";

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
          <Text style={styles.title}>Dark Web Monitoring</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status Card */}
        <Card
          style={[
            styles.statusCard,
            unresolvedBreaches > 0
              ? styles.statusCardWarning
              : styles.statusCardSafe,
          ]}
        >
          <View style={styles.statusIcon}>
            <Ionicons
              name={unresolvedBreaches > 0 ? "warning" : "shield-checkmark"}
              size={40}
              color={unresolvedBreaches > 0 ? "#F59E0B" : "#22C55E"}
            />
          </View>
          <Text style={styles.statusTitle}>
            {unresolvedBreaches > 0
              ? `${unresolvedBreaches} Breach${unresolvedBreaches > 1 ? "es" : ""} Found`
              : "No Active Breaches"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {exposedItems} item{exposedItems !== 1 ? "s" : ""} exposed •{" "}
            {lastScanDisplay}
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={runScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.scanButtonText}>Scan Now</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "breaches" && styles.tabActive]}
            onPress={() => setSelectedTab("breaches")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "breaches" && styles.tabTextActive,
              ]}
            >
              Breaches ({breaches.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === "monitored" && styles.tabActive,
            ]}
            onPress={() => setSelectedTab("monitored")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "monitored" && styles.tabTextActive,
              ]}
            >
              Monitored ({monitoredItems.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Breaches Tab */}
        {selectedTab === "breaches" && (
          <>
            {breaches.length === 0 && (
              <Card style={styles.emptyCard}>
                <Ionicons name="shield-checkmark" size={48} color="#22C55E" />
                <Text style={styles.emptyTitle}>No Breaches Found</Text>
                <Text style={styles.emptyText}>
                  Your monitored data has not been found in any known breaches.
                </Text>
              </Card>
            )}
            {breaches.map((breach) => (
              <TouchableOpacity
                key={breach.id}
                onPress={() => router.push(`/identity/breach/${breach.id}` as Href)}
              >
                <Card
                  style={[
                    styles.breachCard,
                    breach.resolved && styles.breachCardResolved,
                  ]}
                >
                  <View style={styles.breachRow}>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor: `${getSeverityColor(breach.severity)}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: getSeverityColor(breach.severity) },
                        ]}
                      >
                        {breach.severity.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.breachInfo}>
                      <Text style={styles.breachSource}>{breach.source}</Text>
                      <Text style={styles.breachDate}>{breach.date}</Text>
                    </View>
                    {breach.resolved ? (
                      <View style={styles.resolvedBadge}>
                        <Text style={styles.resolvedText}>Resolved</Text>
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    )}
                  </View>
                  <View style={styles.dataTypesRow}>
                    {breach.dataTypes.map((type, idx) => (
                      <View key={idx} style={styles.dataTypeBadge}>
                        <Text style={styles.dataTypeText}>{type}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Monitored Tab */}
        {selectedTab === "monitored" && (
          <>
            {monitoredItems.length === 0 && (
              <Card style={styles.emptyCard}>
                <Ionicons
                  name="eye-off-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>Nothing Monitored</Text>
                <Text style={styles.emptyText}>
                  Enable dark web monitoring to track your personal data.
                </Text>
              </Card>
            )}
            {monitoredItems.map((item) => (
              <Card key={item.id} style={styles.monitoredCard}>
                <View style={styles.monitoredRow}>
                  <View
                    style={[
                      styles.monitoredIcon,
                      {
                        backgroundColor:
                          item.status === "exposed" ? "#FEE2E2" : "#D1FAE5",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        getTypeIcon(item.type) as keyof typeof Ionicons.glyphMap
                      }
                      size={20}
                      color={item.status === "exposed" ? "#EF4444" : "#22C55E"}
                    />
                  </View>
                  <View style={styles.monitoredInfo}>
                    <Text style={styles.monitoredValue}>{item.value}</Text>
                    <Text style={styles.monitoredType}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.monitoredStatus}>
                    <Ionicons
                      name={
                        item.status === "exposed"
                          ? "alert-circle"
                          : "checkmark-circle"
                      }
                      size={24}
                      color={item.status === "exposed" ? "#EF4444" : "#22C55E"}
                    />
                    {item.breachCount > 0 && (
                      <Text style={styles.breachCountText}>
                        {item.breachCount} breach
                        {item.breachCount > 1 ? "es" : ""}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/identity" as Href)}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.addButtonText}>Add Item to Monitor</Text>
            </TouchableOpacity>
          </>
        )}

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
  statusCard: { alignItems: "center", marginBottom: theme.spacing.lg },
  statusCardWarning: { backgroundColor: "#FEF3C720" },
  statusCardSafe: { backgroundColor: "#D1FAE520" },
  statusIcon: { marginBottom: theme.spacing.sm },
  statusTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statusSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },
  breachCard: { marginBottom: theme.spacing.sm },
  breachCardResolved: { opacity: 0.6 },
  breachRow: { flexDirection: "row", alignItems: "center" },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  severityText: { fontSize: 10, fontWeight: "700" },
  breachInfo: { flex: 1 },
  breachSource: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  breachDate: { fontSize: 12, color: theme.colors.textSecondary },
  resolvedBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resolvedText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  dataTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.spacing.sm,
  },
  dataTypeBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4,
  },
  dataTypeText: { fontSize: 11, color: theme.colors.textSecondary },
  monitoredCard: { marginBottom: theme.spacing.sm },
  monitoredRow: { flexDirection: "row", alignItems: "center" },
  monitoredIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  monitoredInfo: { flex: 1 },
  monitoredValue: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  monitoredType: { fontSize: 12, color: theme.colors.textSecondary },
  monitoredStatus: { alignItems: "flex-end" },
  breachCountText: { fontSize: 11, color: "#EF4444", marginTop: 2 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    borderStyle: "dashed",
    marginTop: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
});
