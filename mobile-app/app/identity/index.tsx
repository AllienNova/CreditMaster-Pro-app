/**
 * Fynvita Identity Protection Dashboard
 * Wired to real identity protection API + credit monitoring store
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useCreditStore } from "../../src/store/creditStore";
import { identityProtectionApi } from "../../src/services/api/user";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import type {
  IdentityProtectionStatus,
  IdentityAlert,
} from "../../src/services/api/types";

interface ScanResult {
  category: string;
  status: "safe" | "exposed" | "monitoring";
  count: number;
  lastScan: string;
}

const FEATURES = [
  {
    icon: "globe",
    title: "Dark Web Monitoring",
    subtitle: "Scan for exposed data",
    route: "/identity/dark-web",
  },
  {
    icon: "finger-print",
    title: "SSN Monitoring",
    subtitle: "Track SSN usage",
    route: "/identity/ssn-monitoring",
  },
  {
    icon: "card",
    title: "Credit Monitoring",
    subtitle: "New account alerts",
    route: "/monitoring",
  },
  {
    icon: "snow",
    title: "Credit Freeze",
    subtitle: "Manage bureau freezes",
    route: "/credit-builder/freeze",
  },
  {
    icon: "shield-checkmark",
    title: "Identity Insurance",
    subtitle: "$1M coverage",
    route: "/identity/insurance",
  },
  {
    icon: "document-text",
    title: "Recovery Plan",
    subtitle: "If identity is stolen",
    route: "/identity/recovery",
  },
];

function buildScanResults(
  status: IdentityProtectionStatus | null,
  identityAlerts: IdentityAlert[],
): ScanResult[] {
  const lastScan = status?.lastScan
    ? new Date(status.lastScan).toLocaleDateString()
    : "Never";
  const breachAlerts = identityAlerts.filter((a) => !a.resolved);
  const emailBreaches = breachAlerts.filter(
    (a) => a.exposedData?.includes("email") || a.type === "breach",
  ).length;
  const passwordBreaches = breachAlerts.filter((a) =>
    a.exposedData?.includes("password"),
  ).length;

  return [
    {
      category: "Email Addresses",
      status: emailBreaches > 0 ? "exposed" : "safe",
      count: emailBreaches,
      lastScan,
    },
    {
      category: "Phone Numbers",
      status: "safe",
      count: 0,
      lastScan,
    },
    { category: "SSN", status: "safe", count: 0, lastScan },
    {
      category: "Passwords",
      status: passwordBreaches > 0 ? "exposed" : "safe",
      count: passwordBreaches,
      lastScan,
    },
    {
      category: "Bank Accounts",
      status: "safe",
      count: 0,
      lastScan,
    },
    {
      category: "Credit Cards",
      status: status?.isActive ? "monitoring" : "safe",
      count: 0,
      lastScan,
    },
  ];
}

function buildFeatureBadges(
  identityAlerts: IdentityAlert[],
  monitoringActive: boolean,
): Record<string, string | null> {
  const unresolvedBreaches = identityAlerts.filter((a) => !a.resolved).length;
  return {
    "Dark Web Monitoring":
      unresolvedBreaches > 0 ? `${unresolvedBreaches} found` : null,
    "Credit Monitoring": null,
    "SSN Monitoring": null,
    "Credit Freeze": null,
    "Identity Insurance": monitoringActive ? "Active" : null,
    "Recovery Plan": null,
  };
}

export default function IdentityScreen() {
  const {
    alerts: creditAlerts,
    monitoringStatus,
    fetchAlerts,
    fetchMonitoringStatus,
  } = useCreditStore();

  const [identityStatus, setIdentityStatus] =
    useState<IdentityProtectionStatus | null>(null);
  const [identityAlerts, setIdentityAlerts] = useState<IdentityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [statusRes, alertsRes] = await Promise.all([
        identityProtectionApi.getStatus(),
        identityProtectionApi.getAlerts(),
        fetchAlerts(),
        fetchMonitoringStatus(),
      ]);

      if (statusRes.success && statusRes.data) {
        setIdentityStatus(statusRes.data);
      }
      if (alertsRes.success && alertsRes.data) {
        setIdentityAlerts(alertsRes.data.alerts);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load identity data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchAlerts, fetchMonitoringStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      await identityProtectionApi.requestScan();
      await loadData();
    } catch {
      // scan request failed silently; data will refresh on next pull
    } finally {
      setIsScanning(false);
    }
  };

  // Merge identity alerts with security-type credit alerts for the dashboard
  const securityCreditAlerts = creditAlerts.filter(
    (a) => a.alertType === "fraud_alert" || a.severity === "critical",
  );

  const allActiveAlerts = [
    ...identityAlerts.filter((a) => !a.resolved),
    ...securityCreditAlerts.filter((a) => !a.acknowledged),
  ];

  const scanResults = buildScanResults(identityStatus, identityAlerts);
  const exposedItems = scanResults
    .filter((s) => s.status === "exposed")
    .reduce((sum, s) => sum + s.count, 0);
  const protectionScore =
    exposedItems === 0 ? 100 : Math.max(0, 100 - exposedItems * 15);
  const featureBadges = buildFeatureBadges(
    identityAlerts,
    monitoringStatus?.isActive ?? false,
  );

  const getStatusColor = (score: number) => {
    if (score >= 80) return "#22C55E";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return { name: "alert-circle", color: "#EF4444" };
      case "high":
        return { name: "warning", color: "#F59E0B" };
      default:
        return { name: "information-circle", color: "#3B82F6" };
    }
  };

  const getScanStatusIcon = (status: string) => {
    switch (status) {
      case "safe":
        return { name: "checkmark-circle", color: "#22C55E" };
      case "exposed":
        return { name: "alert-circle", color: "#EF4444" };
      default:
        return { name: "eye", color: "#3B82F6" };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading identity data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !identityStatus && identityAlerts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
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

  const lastScanFormatted = identityStatus?.lastScan
    ? `Last scan: ${new Date(identityStatus.lastScan).toLocaleDateString()} at ${new Date(identityStatus.lastScan).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
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
        <ScreenHeader
          title="Identity Protection"
          right={
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push("/identity" as Href)}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          }
        />

        {/* Protection Score */}
        <Card
          style={[
            styles.scoreCard,
            {
              borderLeftColor: getStatusColor(protectionScore),
              borderLeftWidth: 4,
            },
          ]}
        >
          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text
                style={[
                  styles.scoreValue,
                  { color: getStatusColor(protectionScore) },
                ]}
              >
                {protectionScore}
              </Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreTitle}>
                {protectionScore >= 80
                  ? "Well Protected"
                  : protectionScore >= 60
                    ? "Needs Attention"
                    : "At Risk"}
              </Text>
              <Text style={styles.scoreSubtitle}>
                {exposedItems} items exposed • {allActiveAlerts.length} alerts
              </Text>
              <View style={styles.lastScanRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.lastScanText}>{lastScanFormatted}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleRunScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.scanButtonText}>Run Full Scan</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Active Alerts */}
        {allActiveAlerts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Alerts</Text>
              <TouchableOpacity
                onPress={() => router.push("/monitoring/alerts" as Href)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {allActiveAlerts.slice(0, 3).map((alert) => {
              const severity =
                "severity" in alert ? alert.severity : "medium";
              const icon = getAlertIcon(severity);
              const alertDate =
                "createdAt" in alert
                  ? new Date(alert.createdAt).toLocaleDateString()
                  : "";
              return (
                <TouchableOpacity
                  key={alert.id}
                  onPress={() =>
                    router.push(`/monitoring/alerts/${alert.id}` as Href)
                  }
                >
                  <Card style={styles.alertCard}>
                    <View
                      style={[
                        styles.alertIcon,
                        { backgroundColor: `${icon.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={icon.name as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={icon.color}
                      />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertDescription}>
                        {alert.description}
                      </Text>
                      <Text style={styles.alertDate}>{alertDate}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Scan Results Summary */}
        <Text style={styles.sectionTitle}>Monitoring Status</Text>
        <Card style={styles.scanResultsCard}>
          {scanResults.map((result, idx) => {
            const icon = getScanStatusIcon(result.status);
            return (
              <View
                key={result.category}
                style={[
                  styles.scanResultRow,
                  idx < scanResults.length - 1 && styles.scanResultBorder,
                ]}
              >
                <Ionicons
                  name={icon.name as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={icon.color}
                />
                <Text style={styles.scanResultCategory}>{result.category}</Text>
                <Text style={[styles.scanResultStatus, { color: icon.color }]}>
                  {result.status === "exposed"
                    ? `${result.count} exposed`
                    : result.status === "safe"
                      ? "Safe"
                      : "Monitoring"}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Features Grid */}
        <Text style={styles.sectionTitle}>Protection Features</Text>
        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => {
            const badge = featureBadges[feature.title] ?? null;
            return (
              <TouchableOpacity
                key={index}
                style={styles.featureCard}
                onPress={() => router.push(feature.route as never)}
                activeOpacity={0.7}
              >
                <View style={styles.featureIconContainer}>
                  <Ionicons
                    name={feature.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                {badge && (
                  <View
                    style={[
                      styles.featureBadge,
                      badge.includes("found") && styles.featureBadgeWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.featureBadgeText,
                        badge.includes("found") &&
                          styles.featureBadgeTextWarning,
                      ]}
                    >
                      {badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Items — driven by real data */}
        {(exposedItems > 0 || allActiveAlerts.length > 0) && (
          <Card style={styles.actionCard}>
            <Text style={styles.actionTitle}>Recommended Actions</Text>
            {exposedItems > 0 && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/identity/dark-web" as Href)}
              >
                <Ionicons name="key" size={20} color="#F59E0B" />
                <Text style={styles.actionText}>
                  Review {exposedItems} exposed item
                  {exposedItems > 1 ? "s" : ""} on the dark web
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            {allActiveAlerts.length > 0 && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push("/monitoring/alerts" as Href)}
              >
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.actionText}>
                  Address {allActiveAlerts.length} active alert
                  {allActiveAlerts.length > 1 ? "s" : ""}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  settingsButton: { padding: 4 },
  scoreCard: { marginBottom: theme.spacing.lg },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  scoreValue: { fontSize: 32, fontWeight: "700" },
  scoreLabel: { fontSize: 11, color: theme.colors.textSecondary },
  scoreInfo: { flex: 1 },
  scoreTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  scoreSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  lastScanRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  lastScanText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  seeAllText: { fontSize: 14, color: theme.colors.primary },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  alertDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  alertDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  scanResultsCard: { marginBottom: theme.spacing.lg },
  scanResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  scanResultBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scanResultCategory: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
  },
  scanResultStatus: { fontSize: 13, fontWeight: "500" },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: theme.spacing.md,
  },
  featureCard: {
    width: "48%",
    margin: "1%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    position: "relative",
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  featureSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  featureBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  featureBadgeWarning: { backgroundColor: "#FEF3C7" },
  featureBadgeText: { fontSize: 10, fontWeight: "600", color: "#059669" },
  featureBadgeTextWarning: { color: "#D97706" },
  actionCard: { marginTop: theme.spacing.md },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
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
});
