/**
 * Fynvita Settings Dashboard Screen
 *
 * Real-data wiring (PARITY): this composite screen used to render a hardcoded
 * profile ("John Doe" via INITIAL_SETTINGS), a fake setTimeout "save" that
 * persisted nothing, and a hardcoded "$79/month Premium" billing card. Each
 * section is now sourced honestly, or empty-stated when no honest source exists:
 *
 *  - Profile (name / email / phone): the real authenticated user from authStore
 *    (Supabase `profiles`). Name + phone are editable and saved through the real
 *    authStore.updateProfile mutation; email is account identity and shown
 *    read-only (the profile mutation does not change it). No more "John Doe".
 *  - Billing: the real Stripe-backed billing overview from GET /api/payment/billing
 *    via subscriptionApi.getBillingOverview (the same source the subscription
 *    screen uses), replacing the hardcoded $79 / Premium / renewal. No card data
 *    is rendered on this screen.
 *  - Notifications: empty-stated. The only mobile-reachable preferences endpoint
 *    (/api/notifications/preferences) is an unauthenticated in-memory "demo-user"
 *    mock with no per-user persistence, so this screen does NOT present fake
 *    toggles that look saved but aren't.
 *  - Security: unchanged action buttons (out of scope for real-data wiring).
 *
 * Honest inline states use testIDs dashboard-settings-{loading,error,empty}.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useAuthStore } from "../../src/store/authStore";
import { subscriptionApi } from "../../src/services/api/user";
import type { BillingOverview } from "../../src/services/api/user";

type TabType = "profile" | "notifications" | "security" | "billing";

const STATUS_COLORS: Record<string, string> = {
  active: theme.colors.success,
  trialing: theme.colors.success,
  past_due: theme.colors.warning,
  incomplete: theme.colors.warning,
  unpaid: theme.colors.error,
  canceled: theme.colors.error,
};

function formatStatus(status: string): string {
  if (!status) return status;
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatPrice(price: number, interval: string): string {
  if (price <= 0) return "Free";
  const period = interval === "year" ? "yr" : "mo";
  return `$${price.toFixed(2)}/${period}`;
}

export default function SettingsScreen() {
  const { user, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Editable profile fields, seeded from the real user (authStore / Supabase).
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Billing overview (real: GET /api/payment/billing via getBillingOverview).
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);
    const res = await subscriptionApi.getBillingOverview();
    if (res.success && res.data) {
      setBilling(res.data);
    } else {
      setBillingError(
        res.error?.message ?? "Unable to load your billing details right now.",
      );
    }
    setBillingLoading(false);
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "person" },
    { id: "notifications", label: "Alerts", icon: "notifications" },
    { id: "security", label: "Security", icon: "shield-checkmark" },
    { id: "billing", label: "Billing", icon: "card" },
  ];

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ name: fullName.trim(), phone: phone.trim() });
      setSaved(true);
    } catch (error) {
      Alert.alert(
        "Couldn't save changes",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      "Change Password",
      "A password reset link has been sent to your email.",
    );
  };

  const handleEnable2FA = () => {
    Alert.alert(
      "Two-Factor Authentication",
      "Follow the link to set up 2FA for your account.",
    );
  };

  const statusColor = billing
    ? (STATUS_COLORS[billing.status] ?? theme.colors.textSecondary)
    : theme.colors.textSecondary;

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
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={
                  activeTab === tab.id ? "#fff" : theme.colors.textSecondary
                }
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
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Profile Information</Text>

            {!user ? (
              <View
                style={styles.stateBlock}
                testID="dashboard-settings-empty"
              >
                <Ionicons
                  name="person-circle-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.stateText}>
                  Sign in to view and manage your profile.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      setSaved(false);
                    }}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.readonlyField}>
                    <Text style={styles.readonlyValue}>{user.email}</Text>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      setSaved(false);
                    }}
                    placeholder="Enter your phone"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}
          </Card>
        )}

        {/* Notifications Tab — no honest per-user source (the only mobile-reachable
            endpoint is an unauthenticated in-memory mock), so it is empty-stated
            rather than showing fake toggles. */}
        {activeTab === "notifications" && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <View style={styles.stateBlock} testID="dashboard-settings-empty">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.stateText}>
                Notification preferences aren&apos;t available in the app yet.
              </Text>
            </View>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Security Settings</Text>

            <TouchableOpacity
              style={styles.securityButton}
              onPress={handleChangePassword}
            >
              <View style={styles.securityButtonContent}>
                <Ionicons
                  name="key-outline"
                  size={22}
                  color={theme.colors.text}
                />
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>
                    Change Password
                  </Text>
                  <Text style={styles.securityButtonDesc}>
                    Update your account password
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.securityButton}
              onPress={handleEnable2FA}
            >
              <View style={styles.securityButtonContent}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={theme.colors.text}
                />
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>
                    Two-Factor Authentication
                  </Text>
                  <Text style={styles.securityButtonDesc}>
                    Add extra security layer
                  </Text>
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Recommended</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.securityButton}>
              <View style={styles.securityButtonContent}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color={theme.colors.text}
                />
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>
                    Active Sessions
                  </Text>
                  <Text style={styles.securityButtonDesc}>
                    Manage logged in devices
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
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Billing & Subscription</Text>

            {billingLoading && !billing && (
              <View
                style={styles.stateBlock}
                testID="dashboard-settings-loading"
              >
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.stateText}>Loading billing details...</Text>
              </View>
            )}

            {billingError && !billing && (
              <View style={styles.stateBlock} testID="dashboard-settings-error">
                <Ionicons
                  name="cloud-offline-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.stateText}>{billingError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadBilling}
                >
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {billing && (
              <>
                <View style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planLabel}>Current Plan</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusColor}15` },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {formatStatus(billing.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.planName}>{billing.planName}</Text>
                  <Text style={styles.planPrice}>
                    {formatPrice(billing.price, billing.interval)}
                  </Text>
                  {billing.nextBilling && (
                    <Text style={styles.planRenewal}>
                      {billing.cancelAtPeriodEnd ? "Access ends" : "Renews"}{" "}
                      {billing.nextBilling}
                    </Text>
                  )}
                </View>

                <View style={styles.billingActions}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.push("/billing/subscription")}
                  >
                    <Text style={styles.primaryButtonText}>Manage Plan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.push("/billing/invoices")}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={theme.colors.text}
                    />
                    <Text style={styles.secondaryButtonText}>
                      View Billing History
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Card>
        )}

        {/* Save Button — only the profile tab has editable, savable fields. */}
        {activeTab === "profile" && user && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              testID="dashboard-settings-save"
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
            {saved && (
              <View style={styles.savedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.colors.success}
                />
                <Text style={styles.savedText}>Changes saved</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  backButton: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.text },

  tabsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tabsContent: { gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
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
    marginBottom: theme.spacing.lg,
  },

  inputGroup: { marginBottom: theme.spacing.md },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  readonlyField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyValue: { fontSize: 15, color: theme.colors.textSecondary },

  stateBlock: { alignItems: "center", paddingVertical: 32 },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

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
  badge: {
    backgroundColor: theme.colors.primary + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: theme.colors.primary },

  planCard: {
    backgroundColor: theme.colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planLabel: { fontSize: 13, color: theme.colors.textSecondary },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  planName: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  planPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 2,
  },
  planRenewal: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  billingActions: { gap: 12 },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },

  saveContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  savedBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  savedText: { fontSize: 14, color: theme.colors.success, fontWeight: "500" },
});
