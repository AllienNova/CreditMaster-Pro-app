/**
 * Fynvita Admin Settings Screen
 * System configuration and admin settings
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface SystemConfig {
  maintenanceMode: boolean;
  registrationOpen: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  maxDisputes: number;
  maxDocuments: number;
  apiRateLimit: number;
}

const INITIAL_FLAGS: FeatureFlag[] = [
  {
    id: "1",
    name: "AI Chat",
    description: "Enable AI-powered chat assistant",
    enabled: true,
  },
  {
    id: "2",
    name: "Score Simulator",
    description: "Credit score simulation tool",
    enabled: true,
  },
  {
    id: "3",
    name: "Auto Disputes",
    description: "Automatic dispute generation",
    enabled: false,
  },
  {
    id: "4",
    name: "Premium Analytics",
    description: "Advanced analytics dashboard",
    enabled: true,
  },
  {
    id: "5",
    name: "Beta Features",
    description: "Experimental features for testing",
    enabled: false,
  },
];

const INITIAL_CONFIG: SystemConfig = {
  maintenanceMode: false,
  registrationOpen: true,
  emailNotifications: true,
  smsNotifications: false,
  maxDisputes: 10,
  maxDocuments: 20,
  apiRateLimit: 100,
};

export default function AdminSettingsScreen() {
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);
  const [config, setConfig] = useState<SystemConfig>(INITIAL_CONFIG);
  const [activeTab, setActiveTab] = useState<
    "features" | "system" | "security"
  >("features");
  const [saving, setSaving] = useState(false);

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert("Success", "Settings saved successfully");
    }, 1000);
  };

  const handleDangerousAction = (action: string) => {
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to ${action.toLowerCase()}? This action may affect all users.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => {
            Alert.alert("Action Completed", `${action} has been initiated.`);
          },
        },
      ],
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
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
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
        {/* Features Tab */}
        {activeTab === "features" && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Feature Flags</Text>
            <Text style={styles.sectionDescription}>
              Enable or disable features for all users
            </Text>

            {flags.map((flag) => (
              <View key={flag.id} style={styles.flagRow}>
                <View style={styles.flagInfo}>
                  <Text style={styles.flagName}>{flag.name}</Text>
                  <Text style={styles.flagDescription}>{flag.description}</Text>
                </View>
                <Switch
                  value={flag.enabled}
                  onValueChange={() => toggleFlag(flag.id)}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.success + "50",
                  }}
                  thumbColor={flag.enabled ? theme.colors.success : "#f4f4f4"}
                />
              </View>
            ))}
          </Card>
        )}

        {/* System Tab */}
        {activeTab === "system" && (
          <>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>System Configuration</Text>

              <View style={styles.configRow}>
                <View style={styles.configInfo}>
                  <Text style={styles.configLabel}>Maintenance Mode</Text>
                  <Text style={styles.configDescription}>
                    Take the platform offline for maintenance
                  </Text>
                </View>
                <Switch
                  value={config.maintenanceMode}
                  onValueChange={(val) =>
                    setConfig({ ...config, maintenanceMode: val })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.warning + "50",
                  }}
                  thumbColor={
                    config.maintenanceMode ? theme.colors.warning : "#f4f4f4"
                  }
                />
              </View>

              <View style={styles.configRow}>
                <View style={styles.configInfo}>
                  <Text style={styles.configLabel}>Open Registration</Text>
                  <Text style={styles.configDescription}>
                    Allow new user registrations
                  </Text>
                </View>
                <Switch
                  value={config.registrationOpen}
                  onValueChange={(val) =>
                    setConfig({ ...config, registrationOpen: val })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.success + "50",
                  }}
                  thumbColor={
                    config.registrationOpen ? theme.colors.success : "#f4f4f4"
                  }
                />
              </View>

              <View style={styles.configRow}>
                <View style={styles.configInfo}>
                  <Text style={styles.configLabel}>Email Notifications</Text>
                  <Text style={styles.configDescription}>
                    Send transactional emails
                  </Text>
                </View>
                <Switch
                  value={config.emailNotifications}
                  onValueChange={(val) =>
                    setConfig({ ...config, emailNotifications: val })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.success + "50",
                  }}
                  thumbColor={
                    config.emailNotifications ? theme.colors.success : "#f4f4f4"
                  }
                />
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Rate Limits</Text>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Max Disputes per User</Text>
                <TextInput
                  style={styles.numberInput}
                  value={config.maxDisputes.toString()}
                  onChangeText={(val) =>
                    setConfig({ ...config, maxDisputes: parseInt(val) || 0 })
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Max Documents per User</Text>
                <TextInput
                  style={styles.numberInput}
                  value={config.maxDocuments.toString()}
                  onChangeText={(val) =>
                    setConfig({ ...config, maxDocuments: parseInt(val) || 0 })
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>API Rate Limit (req/min)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={config.apiRateLimit.toString()}
                  onChangeText={(val) =>
                    setConfig({ ...config, apiRateLimit: parseInt(val) || 0 })
                  }
                  keyboardType="number-pad"
                />
              </View>
            </Card>
          </>
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
