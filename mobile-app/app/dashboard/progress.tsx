/**
 * Fynvita Dashboard Progress Screen
 * Milestones, achievements, and gamification
 */

import React, { useEffect, useCallback } from "react";
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
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useGamificationStore } from "../../src/store/gamificationStore";

/*
 * Local `Milestone` and `Achievement` types, MILESTONES and ACHIEVEMENTS lived
 * here.
 *
 * Every achievement was hardcoded `unlocked: true` — "First Steps", "Dispute
 * Master" and the rest — so every user was shown the same earned badges
 * regardless of what they had actually done. The milestones carried completion
 * dates ("2024-10-01") and point values for work nobody had done either. And
 * the loading spinner was `setTimeout(() => setLoading(false), 800)`: eight
 * hundred milliseconds over no request at all.
 *
 * All of it is real. `user_badges`, `badge_definitions`, `badge_progress` and
 * `user_achievements` are real tables; GET /api/gamification/badges and
 * /api/gamification/progress are real routes; and the mobile gamificationStore
 * already fetches both, splitting badges into earned / inProgress / locked.
 * Nothing needed building — only connecting.
 */



export default function DashboardProgressScreen() {
  const {
    earnedBadges,
    lockedBadges,
    inProgressBadges,
    progress,
    isLoadingBadges,
    isLoadingProgress,
    badgesError,
    progressError,
    fetchBadges,
    fetchProgress,
  } = useGamificationStore();

  const load = useCallback(async () => {
    await Promise.all([fetchBadges(), fetchProgress()]);
  }, [fetchBadges, fetchProgress]);

  useEffect(() => {
    load();
  }, [load]);

  const loading = isLoadingBadges || isLoadingProgress;
  const error = badgesError ?? progressError;

  // "Milestones" are the badges with progress toward them; "achievements" are
  // the ones actually earned. The old screen showed both as complete for
  // everybody.
  const milestones = [...inProgressBadges, ...lockedBadges];
  const completedCount = earnedBadges.length;
  const totalBadges = completedCount + milestones.length;

  // Real XP, not a points total summed from invented milestones.
  const totalPoints = progress?.xp.totalEarned ?? 0;

  // Guarded: a user with no badges at all would divide by zero here, and React
  // Native drops a NaN width silently — the bar would simply vanish.
  const progressPercent =
    totalBadges > 0 ? (completedCount / totalBadges) * 100 : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading progress...</Text>
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
        {error ? (
          // A failed read and "you have earned nothing" are different
          // statements, and this screen is about the user's own effort.
          <Card style={styles.milestonesCard}>
            <Text style={styles.milestoneDesc}>
              We could not load your progress.
            </Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🏆 My Progress</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsValue}>
              {totalPoints.toLocaleString()}
            </Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Journey Progress</Text>
            <Text style={styles.progressCount}>
              {completedCount}/{milestones.length}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </Card>

        {/* Milestones */}
        <Card style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {/* These are badges NOT yet earned — in-progress and locked. None is
              complete by definition, so the completed branch, the completion
              date and the "+points" credit are gone. The fixture marked every
              one complete with a date. */}
          {milestones.length === 0 ? (
            <Text style={styles.milestoneDesc}>
              Nothing in progress right now.
            </Text>
          ) : null}
          {milestones.map((milestone, i) => (
            <View key={milestone.id} style={styles.milestoneItem}>
              <View style={styles.milestoneIcon}>
                <Text style={styles.milestoneNumber}>{i + 1}</Text>
              </View>
              <View style={styles.milestoneContent}>
                <Text
                  style={[styles.milestoneTitle, styles.milestoneIncomplete]}
                >
                  {"name" in milestone ? milestone.name : milestone.badgeId}
                </Text>
                <Text style={styles.milestoneDesc}>
                  {"description" in milestone ? milestone.description : ""}
                </Text>
              </View>
              {"xpReward" in milestone ? (
                <Text style={styles.milestonePoints}>
                  +{milestone.xpReward}
                </Text>
              ) : null}
            </View>
          ))}
        </Card>

        {/* Achievements */}
        <Card style={styles.achievementsCard}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {/* Only badges the caller has actually EARNED. The fixture
                hardcoded `unlocked: true` on every entry, so the locked style
                below was unreachable and every user saw the same trophies. */}
            {earnedBadges.length === 0 ? (
              <Text style={styles.achievementDesc}>
                No badges earned yet.
              </Text>
            ) : null}
            {earnedBadges.map((earned) => (
              <View key={earned.id} style={styles.achievementItem}>
                <Text style={styles.achievementIcon}>{earned.badge.icon}</Text>
                <Text style={styles.achievementTitle}>{earned.badge.name}</Text>
                <Text style={styles.achievementDesc}>
                  {earned.badge.description}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  retryText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: 8,
  },
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backButton: { padding: theme.spacing.sm },
  headerContent: { flex: 1, marginLeft: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.text },
  pointsBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.secondary,
  },
  pointsLabel: { fontSize: 10, color: theme.colors.textSecondary },
  progressCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  progressTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  progressCount: { fontSize: 14, color: theme.colors.textSecondary },
  progressBarBg: {
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: 5,
  },
  progressBarFill: {
    height: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
  },
  milestonesCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  milestoneIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  milestoneIconCompleted: { backgroundColor: theme.colors.success },
  milestoneNumber: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  milestoneContent: { flex: 1 },
  milestoneTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  milestoneIncomplete: { color: theme.colors.textSecondary },
  milestoneDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  milestoneDate: { fontSize: 11, color: theme.colors.success, marginTop: 4 },
  milestonePoints: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.secondary,
  },
  achievementsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap" },
  achievementItem: {
    width: "48%",
    margin: "1%",
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.warning}10`,
    borderRadius: 12,
    alignItems: "center",
  },
  achievementLocked: { opacity: 0.5, backgroundColor: theme.colors.border },
  achievementIcon: { fontSize: 32, marginBottom: 8 },
  achievementTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  achievementDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
