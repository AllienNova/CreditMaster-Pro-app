/**
 * Fynvita Admin Settings Screen
 * System configuration and admin settings
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { adminSettingsApi } from "../../src/services/api/admin";
import type { PlatformSettings } from "../../src/services/api/admin";

/*
 * INITIAL_FLAGS and INITIAL_CONFIG lived here.
 *
 * They showed an operator a set of feature flags and system limits that were
 * neither read from nor written to anything — toggling one changed a local
 * array, and Save reported "Settings saved successfully" after a one-second
 * setTimeout with no request. On an ADMIN screen that is worse than an
 * invented balance: the operator believes they have changed platform
 * behaviour.
 *
 * The server side is no better (SF-26): /api/admin/settings keeps its values
 * in a module-level `let` that a serverless recycle discards, and nothing
 * anywhere enforces maintenanceMode or signupsEnabled. So this screen now
 * READS the real settings and states plainly that editing is not wired,
 * rather than offering controls over a setting that changes nothing.
 */

export default function AdminSettingsScreen() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "features" | "system" | "security"
  >("features");

  const load = useCallback(async () => {
    setError(null);
    const res = await adminSettingsApi.get();
    if (!res.success || !res.data) {
      setError("We could not load platform settings.");
      setLoading(false);
      return;
    }
    setSettings(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Editing is not available, and the screen says so rather than offering a
   * control. See SF-26: the route's POST writes to a module-level `let` that
   * a serverless recycle discards, and nothing reads the values anyway.
   */
  const EDITING_UNAVAILABLE =
    "Editing is not available yet. These values are read from the server; " +
    "changing them needs a settings table and enforcement that does not exist.";

  /**
   * The three destructive buttons — Clear All Caches, Reset Analytics, Purge
   * Deleted Users — used to confirm, then report "has been initiated", having
   * done nothing. Telling an operator a purge ran when it did not is the worst
   * kind of theatre on this screen, so they now say what is true.
   */
  const handleDangerousAction = (action: string) => {
    Alert.alert(
      action,
      `${action} is not implemented. Nothing has been run. This button used ` +
        "to report success without sending a request.",
      [{ text: "OK" }],
    );
  };

  const tabs = [
    { id: "features" as const, label: "Features", icon: "toggle" },
    { id: "system" as const, label: "System", icon: "settings" },
    { id: "security" as const, label: "Security", icon: "shield" },
  ];

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
        <Text style={styles.title}>Admin Settings</Text>
        {/* No Save button. It used to setTimeout for a second and then say
            "Settings saved successfully" without sending a request. */}
        <View style={styles.saveButtonPlaceholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={activeTab === tab.id ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Features + System: the real settings, read only. */}
        {!loading && !error && settings && activeTab !== "security" && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Platform Settings</Text>
            <Text style={styles.sectionDescription}>
              {EDITING_UNAVAILABLE}
            </Text>

            {(
              [
                ["Site name", settings.siteName],
                ["Support email", settings.supportEmail],
                ["Max disputes per month", String(settings.maxDisputesPerMonth)],
                ["Default AI model", settings.aiModelDefault],
                ["Maintenance mode", settings.maintenanceMode ? "On" : "Off"],
                ["Signups enabled", settings.signupsEnabled ? "Yes" : "No"],
                ["Stripe test mode", settings.stripeTestMode ? "On" : "Off"],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={styles.configRow}>
                <View style={styles.configInfo}>
                  <Text style={styles.configLabel}>{label}</Text>
                </View>
                <Text style={styles.readOnlyValue}>{value}</Text>
              </View>
            ))}

            {/* Stated, not implied: maintenanceMode and signupsEnabled are
                reported by the server but nothing consults them, so neither
                one currently changes platform behaviour (SF-26). */}
            <Text style={styles.sectionDescription}>
              Maintenance mode and signups are reported here but not yet
              enforced anywhere in the platform.
            </Text>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Security Controls</Text>

              <TouchableOpacity style={styles.securityButton}>
                <View style={styles.securityButtonContent}>
                  <Ionicons
                    name="key-outline"
                    size={22}
                    color={theme.colors.text}
                  />
                  <View style={styles.securityButtonInfo}>
                    <Text style={styles.securityButtonLabel}>
                      Rotate API Keys
                    </Text>
                    <Text style={styles.securityButtonDesc}>
                      Generate new API keys for all services
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.securityButton}>
                <View style={styles.securityButtonContent}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color={theme.colors.text}
                  />
                  <View style={styles.securityButtonInfo}>
                    <Text style={styles.securityButtonLabel}>
                      Force Password Reset
                    </Text>
                    <Text style={styles.securityButtonDesc}>
                      Require all users to reset passwords
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.securityButton}>
                <View style={styles.securityButtonContent}>
                  <Ionicons
                    name="log-out-outline"
                    size={22}
                    color={theme.colors.text}
                  />
                  <View style={styles.securityButtonInfo}>
                    <Text style={styles.securityButtonLabel}>
                      Invalidate All Sessions
                    </Text>
                    <Text style={styles.securityButtonDesc}>
                      Log out all users from all devices
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </Card>

            <Card style={[styles.card, styles.dangerCard]}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.error }]}
              >
                Danger Zone
              </Text>

              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => handleDangerousAction("Clear All Caches")}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.error}
                />
                <Text style={styles.dangerButtonText}>Clear All Caches</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => handleDangerousAction("Reset Analytics")}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={theme.colors.error}
                />
                <Text style={styles.dangerButtonText}>
                  Reset Analytics Data
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => handleDangerousAction("Purge Deleted Users")}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={18}
                  color={theme.colors.error}
                />
                <Text style={styles.dangerButtonText}>Purge Deleted Users</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  saveButtonPlaceholder: { width: 60 },
  stateBlock: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: theme.spacing.sm,
  },
  readOnlyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },

  scrollView: { flex: 1, padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },

  flagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  flagInfo: { flex: 1, marginRight: 12 },
  flagName: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  flagDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  configRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  configInfo: { flex: 1, marginRight: 12 },
  configLabel: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  configDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inputLabel: { fontSize: 14, color: theme.colors.text },
  numberInput: {
    width: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },

  securityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  securityButtonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  securityButtonInfo: { flex: 1 },
  securityButtonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  securityButtonDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  dangerCard: { borderWidth: 1, borderColor: theme.colors.error + "30" },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.error,
  },
});
