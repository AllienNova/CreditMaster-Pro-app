/**
 * Rewards & Gamification Screen
 * Main hub for XP, levels, badges, and quests
 */

import React, { useEffect, useCallback } from "react";
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
import {
  XpBar,
  StreakDisplay,
  BadgeCard,
  QuestCard,
} from "../../src/components/gamification";
import { useGamificationStore } from "../../src/store/gamificationStore";

export default function RewardsScreen() {
  const {
    progress,
    earnedBadges,
    quests,
    questsCompletedToday,
    totalQuestsToday,
    isLoadingProgress,
    isLoadingBadges,
    isLoadingQuests,
    isUpdatingStreak,
    fetchProgress,
    fetchBadges,
    fetchQuests,
    completeQuest,
    updateStreak,
  } = useGamificationStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    // Load all gamification data on mount
    fetchProgress();
    fetchBadges();
    fetchQuests();
    // Check in for daily streak
    updateStreak();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProgress(), fetchBadges(), fetchQuests()]);
    setRefreshing(false);
  }, [fetchProgress, fetchBadges, fetchQuests]);

  const handleClaimQuest = async (questId: string) => {
    await completeQuest(questId);
  };

  // Transform earned badges for display
  const displayBadges = earnedBadges.slice(0, 5).map((ub) => ({
    badge: ub.badge,
    earnedAt: ub.earnedAt,
  }));

  // Transform quests for QuestCard component
  const displayQuests = quests.slice(0, 3).map((q) => ({
    id: q.questId,
    title: q.quest.name,
    description: q.quest.description,
    xpReward: q.quest.xpReward,
    type: "daily" as const,
    progress: q.progressValue,
    target: 100,
    completed: q.isCompleted,
  }));

  const loading = isLoadingProgress && !progress;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading rewards...</Text>
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
          <Text style={styles.title}>Rewards</Text>
          <TouchableOpacity onPress={() => router.push("/rewards/leaderboard")}>
            <Ionicons name="trophy" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Level & XP Card */}
        {progress && (
          <Card style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{progress.level.current}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>{progress.level.title}</Text>
                <Text style={styles.levelLabel}>
                  Level {progress.level.current}
                </Text>
              </View>
              <StreakDisplay
                streak={progress.streak.days}
                multiplier={progress.streak.multiplier}
                longestStreak={progress.streak.longestStreak}
                size="sm"
              />
            </View>
            <View style={styles.xpSection}>
              <XpBar
                currentXp={progress.xp.current}
                xpToNextLevel={progress.xp.toNextLevel}
                currentLevel={progress.level.current}
                showDetails={false}
              />
              <Text style={styles.xpText}>
                {progress.xp.current.toLocaleString()} /{" "}
                {progress.xp.toNextLevel.toLocaleString()} XP
              </Text>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/rewards/quests")}
          >
            <Ionicons name="list" size={24} color="#F59E0B" />
            <Text style={styles.actionTitle}>Quests</Text>
            <Text style={styles.actionSubtitle}>
              {questsCompletedToday}/{totalQuestsToday} done
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/rewards/badges")}
          >
            <Ionicons name="ribbon" size={24} color="#A855F7" />
            <Text style={styles.actionTitle}>Badges</Text>
            <Text style={styles.actionSubtitle}>
              {earnedBadges.length} earned
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/rewards/leaderboard")}
          >
            <Ionicons name="trophy" size={24} color="#22C55E" />
            <Text style={styles.actionTitle}>Ranks</Text>
            <Text style={styles.actionSubtitle}>View leaders</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Quests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎯 Daily Quests</Text>
            <TouchableOpacity onPress={() => router.push("/rewards/quests")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {displayQuests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons
                name="checkmark-done-circle"
                size={32}
                color={theme.colors.success}
              />
              <Text style={styles.emptyText}>All quests completed!</Text>
            </Card>
          ) : (
            displayQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onComplete={() => handleClaimQuest(quest.id)}
              />
            ))
          )}
        </View>

        {/* Recent Badges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏅 Recent Badges</Text>
            <TouchableOpacity onPress={() => router.push("/rewards/badges")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {displayBadges.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons
                name="ribbon-outline"
                size={32}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                Complete quests to earn badges!
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {displayBadges.map(({ badge, earnedAt }) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned
                  earnedDate={earnedAt}
                  size="md"
                  onPress={() => router.push("/rewards/badges")}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Stats Summary */}
        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>
                {progress?.xp.totalEarned?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="ribbon" size={24} color="#A855F7" />
              <Text style={styles.statValue}>{earnedBadges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={24} color="#EF4444" />
              <Text style={styles.statValue}>
                {progress?.streak.longestStreak || 0}
              </Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <Text style={styles.statValue}>{questsCompletedToday}</Text>
              <Text style={styles.statLabel}>Quests Done</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Daily check-in overlay */}
      {isUpdatingStreak && (
        <View style={styles.checkInOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.checkInText}>Checking in...</Text>
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
  levelCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  levelInfo: { flex: 1 },
  levelTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  levelLabel: { fontSize: 13, color: theme.colors.textSecondary },
  xpSection: { marginTop: 8 },
  xpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "right",
    marginTop: 6,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  questCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  viewAll: { fontSize: 14, color: theme.colors.primary, fontWeight: "500" },
  badgesRow: { gap: 12, paddingRight: theme.spacing.lg },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  statsCard: { marginHorizontal: theme.spacing.lg },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 6,
  },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  checkInOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkInText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
  },
});
