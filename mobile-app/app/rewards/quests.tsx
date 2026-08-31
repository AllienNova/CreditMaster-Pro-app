/**
 * Quests Screen
 * View and complete daily, weekly, and challenge quests
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { QuestCard } from "../../src/components/gamification";
import { useGamificationStore } from "../../src/store/gamificationStore";

type TabType = "daily" | "weekly" | "challenge";

export default function QuestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [refreshing, setRefreshing] = useState(false);

  const {
    quests,
    questsCompletedToday,
    totalQuestsToday,
    availableXp,
    progress,
    isLoadingQuests,
    isCompletingQuest,
    questsError,
    fetchQuests,
    fetchProgress,
    completeQuest,
  } = useGamificationStore();

  useEffect(() => {
    fetchQuests();
    fetchProgress();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchQuests(), fetchProgress()]);
    setRefreshing(false);
  }, [fetchQuests, fetchProgress]);

  const handleCompleteQuest = async (questId: string) => {
    const result = await completeQuest(questId);
    if (result) {
      // Quest completed successfully
    }
  };

  // Map API questType to the daily/weekly/challenge types QuestCard expects
  const mapQuestType = (
    questType: string,
  ): "daily" | "weekly" | "challenge" => {
    switch (questType) {
      case "savings":
      case "budget":
      case "credit":
        return "weekly";
      case "education":
        return "challenge";
      case "transaction":
      case "engagement":
      default:
        return "daily";
    }
  };

  // Transform API quests to the format QuestCard expects
  const transformedQuests = quests.map((q) => ({
    id: q.questId,
    title: q.quest.name,
    description: q.quest.description,
    xpReward: q.quest.xpReward,
    type: mapQuestType(q.quest.questType),
    progress: q.progressValue,
    target: 100, // API returns percent
    completed: q.isCompleted,
  }));

  // Filter quests by tab
  const filteredQuests = transformedQuests.filter((q) => q.type === activeTab);

  const tabs: {
    key: TabType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "daily", label: "Daily", icon: "sunny" },
    { key: "weekly", label: "Weekly", icon: "calendar" },
    { key: "challenge", label: "Challenges", icon: "trophy" },
  ];

  if (isLoadingQuests && quests.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading quests...</Text>
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
          <Text style={styles.title}>Quests</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {questsCompletedToday}/{totalQuestsToday}
              </Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                {availableXp}
              </Text>
              <Text style={styles.statLabel}>XP Available</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#EF4444" }]}>
                {progress?.streak?.days || 0}
              </Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
          {/* Daily progress bar */}
          <View style={styles.dailyProgress}>
            <Text style={styles.dailyProgressLabel}>Daily Progress</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      totalQuestsToday > 0
                        ? (questsCompletedToday / totalQuestsToday) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={
                  activeTab === tab.key
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quest List */}
        <View style={styles.questList}>
          {questsError ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={48}
                color={theme.colors.error}
              />
              <Text style={styles.errorText}>{questsError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchQuests}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredQuests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-done-circle"
                size={64}
                color={theme.colors.success}
              />
              <Text style={styles.emptyTitle}>All Done!</Text>
              <Text style={styles.emptyText}>
                You've completed all {activeTab} quests. Check back later for
                more!
              </Text>
            </View>
          ) : (
            filteredQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onComplete={() => handleCompleteQuest(quest.id)}
              />
            ))
          )}
        </View>

        {/* Bonus XP Info */}
        <Card style={styles.bonusCard}>
          <View style={styles.bonusHeader}>
            <Ionicons name="sparkles" size={24} color="#F59E0B" />
            <Text style={styles.bonusTitle}>Streak Bonus Active!</Text>
          </View>
          <Text style={styles.bonusText}>
            You're earning{" "}
            {((progress?.streak?.multiplier || 1) * 100 - 100).toFixed(0)}% extra
            XP on all completed quests thanks to your{" "}
            {progress?.streak?.days || 0}-day streak!
          </Text>
        </Card>

        {/* Tips Section */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Quest Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="sunny" size={16} color="#F59E0B" />
            <Text style={styles.tipText}>
              Daily quests reset at midnight in your timezone
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="calendar" size={16} color="#3B82F6" />
            <Text style={styles.tipText}>
              Weekly quests reset every Monday at midnight
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="trophy" size={16} color="#A855F7" />
            <Text style={styles.tipText}>
              Challenges have limited time - complete them before they expire!
            </Text>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Completing quest overlay */}
      {isCompletingQuest && (
        <View style={styles.completingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.completingText}>Claiming reward...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: theme.colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  statsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  dailyProgress: { marginTop: theme.spacing.md },
  dailyProgressLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  questList: {
    paddingHorizontal: theme.spacing.lg,
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  bonusCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
  },
  bonusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  bonusTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#92400E",
  },
  bonusText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 20,
  },
  tipsCard: {
    marginHorizontal: theme.spacing.lg,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  completingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  completingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
  },
});
