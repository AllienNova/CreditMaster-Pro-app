/**
 * Fynvita Notification Preferences Screen
 * Full notification preferences with per-category Email/Push/SMS toggles and quiet hours.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { api } from "../../src/services/api/client";

interface ChannelToggles {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  enabled: boolean;
  channels: ChannelToggles;
}

interface QuietHours {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  {
    id: "credit_alerts",
    title: "Credit Alerts",
    description: "Score changes, new inquiries, account updates",
    icon: "trending-up",
    iconColor: "#22C55E",
    enabled: true,
    channels: { email: true, push: true, sms: false },
  },
  {
    id: "dispute_updates",
    title: "Dispute Updates",
    description: "Status changes, bureau responses",
    icon: "document-text",
    iconColor: "#3B82F6",
    enabled: true,
    channels: { email: true, push: true, sms: false },
  },
  {
    id: "bill_reminders",
    title: "Bill Reminders",
    description: "Upcoming bills, overdue payments",
    icon: "calendar",
    iconColor: "#F59E0B",
    enabled: true,
    channels: { email: true, push: true, sms: false },
  },
  {
    id: "goal_milestones",
    title: "Goal Milestones",
    description: "Progress updates, targets reached",
    icon: "trophy",
    iconColor: "#8B5CF6",
    enabled: true,
    channels: { email: true, push: true, sms: false },
  },
  {
    id: "trading_signals",
    title: "Trading Signals",
    description: "New signals, position alerts",
    icon: "pulse",
    iconColor: "#EF4444",
    enabled: false,
    channels: { email: false, push: true, sms: false },
  },
  {
    id: "security_alerts",
    title: "Security Alerts",
    description: "Login attempts, password changes",
    icon: "shield-checkmark",
    iconColor: "#06B6D4",
    enabled: true,
    channels: { email: true, push: true, sms: true },
  },
];

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  startHour: 22,
  startMinute: 0,
  endHour: 7,
  endMinute: 0,
};

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function cycleHour(current: number, direction: "up" | "down"): number {
  if (direction === "up") return (current + 1) % 24;
  return (current - 1 + 24) % 24;
}

export default function NotificationPreferencesScreen() {
  const [categories, setCategories] =
    useState<NotificationCategory[]>(DEFAULT_CATEGORIES);
  const [quietHours, setQuietHours] =
    useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{
        categories: Array<{
          id: string;
          enabled: boolean;
          channels: ChannelToggles;
        }>;
        quietHours: QuietHours;
      }>("/notifications/preferences");
      if (response.success && response.data) {
        const loaded = response.data;
        setCategories((prev) =>
          prev.map((cat) => {
            const saved = loaded.categories?.find((c) => c.id === cat.id);
            if (saved) {
              return {
                ...cat,
                enabled: saved.enabled,
                channels: saved.channels,
              };
            }
            return cat;
          }),
        );
        if (loaded.quietHours) {
          setQuietHours(loaded.quietHours);
        }
      }
    } catch {
      // Use defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const toggleCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat,
      ),
    );
  };

  const toggleChannel = (
    categoryId: string,
    channel: keyof ChannelToggles,
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              channels: { ...cat.channels, [channel]: !cat.channels[channel] },
            }
          : cat,
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        categories: categories.map((cat) => ({
          id: cat.id,
          enabled: cat.enabled,
          channels: cat.channels,
        })),
        quietHours,
      };
      const response = await api.post("/notifications/preferences", payload);
      if (response.success) {
        Alert.alert("Saved", "Notification preferences updated.");
      } else {
        Alert.alert("Error", "Failed to save preferences. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Preferences</Text>
          <View style={{ width: 24 }} />
        </View>

        {categories.map((category) => (
          <View key={category.id}>
            <Card style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: category.iconColor + "15" },
                  ]}
                >
                  <Ionicons
                    name={category.icon}
                    size={20}
                    color={category.iconColor}
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>
                    {category.description}
                  </Text>
                </View>
                <Switch
                  value={category.enabled}
                  onValueChange={() => toggleCategory(category.id)}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </View>

              {category.enabled && (
                <View style={styles.channelContainer}>
                  <View style={styles.channelDivider} />
                  <View style={styles.channelRow}>
                    <View style={styles.channelLabelRow}>
                      <Ionicons
                        name="mail-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.channelLabel}>Email</Text>
                    </View>
                    <Switch
                      value={category.channels.email}
                      onValueChange={() =>
                        toggleChannel(category.id, "email")
                      }
                      trackColor={{
                        false: theme.colors.border,
                        true: theme.colors.primary,
                      }}
                      thumbColor={
                        Platform.OS === "android" ? "#FFFFFF" : undefined
                      }
                    />
                  </View>
                  <View style={styles.channelRow}>
                    <View style={styles.channelLabelRow}>
                      <Ionicons
                        name="phone-portrait-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.channelLabel}>Push</Text>
                    </View>
                    <Switch
                      value={category.channels.push}
                      onValueChange={() =>
                        toggleChannel(category.id, "push")
                      }
                      trackColor={{
                        false: theme.colors.border,
                        true: theme.colors.primary,
                      }}
                      thumbColor={
                        Platform.OS === "android" ? "#FFFFFF" : undefined
                      }
                    />
                  </View>
                  <View style={styles.channelRow}>
                    <View style={styles.channelLabelRow}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.channelLabel}>SMS</Text>
                    </View>
                    <Switch
                      value={category.channels.sms}
                      onValueChange={() =>
                        toggleChannel(category.id, "sms")
                      }
                      trackColor={{
                        false: theme.colors.border,
                        true: theme.colors.primary,
                      }}
                      thumbColor={
                        Platform.OS === "android" ? "#FFFFFF" : undefined
                      }
                    />
                  </View>
                </View>
              )}
            </Card>
          </View>
        ))}

        {/* Quiet Hours */}
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: theme.colors.textSecondary + "15" },
              ]}
            >
              <Ionicons
                name="moon"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryTitle}>Do Not Disturb</Text>
              <Text style={styles.categoryDescription}>
                Silence non-critical notifications
              </Text>
            </View>
            <Switch
              value={quietHours.enabled}
              onValueChange={(val) =>
                setQuietHours((prev) => ({ ...prev, enabled: val }))
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
            />
          </View>

          {quietHours.enabled && (
            <View style={styles.channelContainer}>
              <View style={styles.channelDivider} />
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>From</Text>
                <View style={styles.timePicker}>
                  <TouchableOpacity
                    style={styles.timeArrow}
                    onPress={() =>
                      setQuietHours((prev) => ({
                        ...prev,
                        startHour: cycleHour(prev.startHour, "down"),
                      }))
                    }
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>
                    {formatTime(quietHours.startHour, quietHours.startMinute)}
                  </Text>
                  <TouchableOpacity
                    style={styles.timeArrow}
                    onPress={() =>
                      setQuietHours((prev) => ({
                        ...prev,
                        startHour: cycleHour(prev.startHour, "up"),
                      }))
                    }
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>To</Text>
                <View style={styles.timePicker}>
                  <TouchableOpacity
                    style={styles.timeArrow}
                    onPress={() =>
                      setQuietHours((prev) => ({
                        ...prev,
                        endHour: cycleHour(prev.endHour, "down"),
                      }))
                    }
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>
                    {formatTime(quietHours.endHour, quietHours.endMinute)}
                  </Text>
                  <TouchableOpacity
                    style={styles.timeArrow}
                    onPress={() =>
                      setQuietHours((prev) => ({
                        ...prev,
                        endHour: cycleHour(prev.endHour, "up"),
                      }))
                    }
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  categoryCard: { marginBottom: theme.spacing.sm },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryInfo: { flex: 1, marginRight: 8 },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  categoryDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  channelContainer: {
    marginTop: 4,
  },
  channelDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingLeft: 52,
  },
  channelLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  channelLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingLeft: 52,
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeArrow: {
    padding: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    minWidth: 80,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
