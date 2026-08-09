/**
 * Fynvita AI Nudges Screen
 * AI-powered recommendations and behavioral nudges
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
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useNudges } from "../../src/hooks/useNudges";

type NudgeType =
  | "motivational"
  | "progress"
  | "warning"
  | "celebration"
  | "reminder"
  | "insight"
  | "coaching"
  | "social_proof";

const typeConfig: Record<
  NudgeType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  motivational: { icon: "flash", color: "#3B82F6", label: "Motivational" },
  progress: { icon: "analytics", color: "#22C55E", label: "Progress" },
  warning: { icon: "warning", color: "#F59E0B", label: "Warning" },
  celebration: { icon: "trophy", color: "#A855F7", label: "Celebration" },
  reminder: { icon: "alarm", color: "#F97316", label: "Reminder" },
  insight: { icon: "bulb", color: "#06B6D4", label: "Insight" },
  coaching: { icon: "school", color: "#6366F1", label: "Coaching" },
  social_proof: { icon: "people", color: "#EC4899", label: "Social Proof" },
};

export default function NudgesScreen() {
  const { nudges, respondToNudge, fetchNudges, isLoading, error } = useNudges();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history" | "settings">(
    "active",
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNudges();
    setRefreshing(false);
  }, [fetchNudges]);

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer} testID="insights-nudges-loading">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
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
          <Text style={styles.title}>AI Recommendations</Text>
          <TouchableOpacity onPress={() => setActiveTab("settings")}>
            <Ionicons
              name="options-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(["active", "history", "settings"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "active" && nudges.length > 0 && (
                  <Text style={styles.tabBadge}> ({nudges.length})</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Nudges */}
        {activeTab === "active" && (
          <View>
            {error ? (
              <View style={styles.emptyState} testID="insights-nudges-error">
                <Ionicons
                  name="cloud-offline-outline"
                  size={64}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>
                  Couldn&apos;t load recommendations
                </Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchNudges}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : nudges.length === 0 ? (
              <View style={styles.emptyState} testID="insights-nudges-empty">
                <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySubtitle}>
                  No active recommendations right now. Check back later for
                  personalized tips.
                </Text>
              </View>
            ) : (
              nudges.map((nudge) => {
                const config = typeConfig[nudge.nudgeType];
                return (
                  <Card key={nudge.id} style={styles.nudgeCard}>
                    <View style={styles.nudgeHeader}>
                      <View
                        style={[
                          styles.nudgeIcon,
                          { backgroundColor: `${config.color}15` },
                        ]}
                      >
                        <Ionicons
                          name={config.icon}
                          size={24}
                          color={config.color}
                        />
                      </View>
                      <View style={styles.nudgeContent}>
                        <View style={styles.nudgeLabelRow}>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: `${config.color}20` },
                            ]}
                          >
                            <Text
                              style={[styles.typeText, { color: config.color }]}
                            >
                              {config.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.nudgeTitle}>{nudge.title}</Text>
                        <Text style={styles.nudgeMessage}>{nudge.message}</Text>
                      </View>
                    </View>
                    <View style={styles.nudgeActions}>
                      {nudge.actionLabel && (
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: config.color },
                          ]}
                          onPress={() => {
                            respondToNudge(nudge.id, "accepted");
                            nudge.actionRoute &&
                              router.push(nudge.actionRoute as never);
                          }}
                        >
                          <Text style={styles.actionButtonText}>
                            {nudge.actionLabel}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => respondToNudge(nudge.id, "accepted")}
                      >
                        <Text style={styles.secondaryButtonText}>Got it</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.textButton}
                        onPress={() => respondToNudge(nudge.id, "snoozed")}
                      >
                        <Text style={styles.textButtonText}>Later</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={() => respondToNudge(nudge.id, "dismissed")}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color={theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* History — no nudge-history endpoint exists yet (only GET/POST
            /api/ai/nudges), so this is an honest empty state, never mock data. */}
        {activeTab === "history" && (
          <View
            style={styles.emptyState}
            testID="insights-nudges-history-empty"
          >
            <Ionicons
              name="time-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No nudge history yet</Text>
            <Text style={styles.emptySubtitle}>
              Recommendations you respond to will appear here.
            </Text>
          </View>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <View>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <Card style={styles.settingsCard}>
              <NudgeSettingRow
                icon="bulb"
                color="#06B6D4"
                title="Insights"
                description="Spending patterns and financial tips"
                enabled={true}
              />
              <NudgeSettingRow
                icon="warning"
                color="#F59E0B"
                title="Warnings"
                description="Budget alerts and unusual activity"
                enabled={true}
              />
              <NudgeSettingRow
                icon="trophy"
                color="#A855F7"
                title="Celebrations"
                description="Goal achievements and milestones"
                enabled={true}
              />
              <NudgeSettingRow
                icon="alarm"
                color="#F97316"
                title="Reminders"
                description="Bill due dates and payments"
                enabled={true}
              />
              <NudgeSettingRow
                icon="school"
                color="#6366F1"
                title="Coaching"
                description="Educational content and tips"
                enabled={false}
              />
              <NudgeSettingRow
                icon="people"
                color="#EC4899"
                title="Social Proof"
                description="What others are doing"
                enabled={false}
                isLast
              />
            </Card>

            <Text style={styles.sectionTitle}>Frequency</Text>
            <Card style={styles.settingsCard}>
              <TouchableOpacity style={styles.frequencyOption}>
                <Text style={styles.frequencyLabel}>Maximum per day</Text>
                <View style={styles.frequencyValue}>
                  <Text style={styles.frequencyNumber}>5</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.frequencyOption, { borderBottomWidth: 0 }]}
              >
                <Text style={styles.frequencyLabel}>Quiet hours</Text>
                <View style={styles.frequencyValue}>
                  <Text style={styles.frequencyNumber}>10pm - 8am</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NudgeSettingRow({
  icon,
  color,
  title,
  description,
  enabled,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
  enabled: boolean;
  isLast?: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  return (
    <View style={[styles.settingRow, !isLast && styles.settingRowBorder]}>
      <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggle, isEnabled && styles.toggleEnabled]}
        onPress={() => setIsEnabled(!isEnabled)}
      >
        <View
          style={[styles.toggleThumb, isEnabled && styles.toggleThumbEnabled]}
        />
      </TouchableOpacity>
    </View>
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
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: { color: "#fff" },
  tabBadge: { fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  nudgeCard: { marginBottom: theme.spacing.md, padding: theme.spacing.md },
  nudgeHeader: { flexDirection: "row" },
  nudgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  nudgeContent: { flex: 1 },
  nudgeLabelRow: { flexDirection: "row", marginBottom: 6 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 11, fontWeight: "600" },
  nudgeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  nudgeMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  nudgeActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  textButton: { paddingHorizontal: 12, paddingVertical: 10 },
  textButtonText: { fontSize: 14, color: theme.colors.textSecondary },
  dismissButton: { marginLeft: "auto", padding: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  settingsCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.sm },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "500", color: theme.colors.text },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    padding: 2,
    justifyContent: "center",
  },
  toggleEnabled: { backgroundColor: theme.colors.primary },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleThumbEnabled: { alignSelf: "flex-end" },
  frequencyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  frequencyLabel: { fontSize: 15, color: theme.colors.text },
  frequencyValue: { flexDirection: "row", alignItems: "center" },
  frequencyNumber: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
});
