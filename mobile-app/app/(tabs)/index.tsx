/**
 * Fynvita Home Dashboard Screen
 * Main dashboard with credit score, quick actions, disputes, and activity
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ViewStyle,
  TextStyle,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/store/authStore";
import { useCreditStore } from "../../src/store/creditStore";
import { useDisputeStore } from "../../src/store/disputeStore";
import { useDashboardStore } from "../../src/store/dashboardStore";
import { useGamificationStore } from "../../src/store/gamificationStore";
import { useTheme } from "../../src/hooks/useTheme";
import { Card } from "../../src/components/Card";
import { ScoreGauge } from "../../src/components/ScoreGauge";
import {
  LoadingSkeleton,
  SkeletonScoreGauge,
  SkeletonCard,
} from "../../src/components/LoadingSkeleton";
import {
  SpendingOverview,
  PaydayCountdown,
} from "../../src/components/financial";
import { XpBar, StreakDisplay } from "../../src/components/gamification";

// Stable colors for the spending donut/bar. Real category names (Plaid taxonomy)
// won't match SpendingOverview's built-in name->color map, so assign by index.
const SPENDING_PALETTE = [
  "#22C55E",
  "#3B82F6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#9CA3AF",
];

export default function HomeScreen() {
  const {
    colors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    iconSize,
    withOpacity,
  } = useTheme();
  const { user } = useAuthStore();
  const {
    scores,
    alerts,
    unreadAlertCount,
    fetchScores,
    fetchAlerts,
    isLoadingScores,
  } = useCreditStore();
  const {
    disputes,
    fetchDisputes,
    isLoading: isLoadingDisputes,
  } = useDisputeStore();
  const { dashboard, isLoadingDashboard, fetchDashboard } = useDashboardStore();
  const {
    progress: gamification,
    isLoadingProgress,
    fetchProgress,
  } = useGamificationStore();
  const [refreshing, setRefreshing] = useState(false);

  // Spending — real per-category month spend + last-month delta from the
  // financial dashboard aggregate (dashboardStore). No fabricated fallback: an
  // empty/loading dashboard renders the widget's own empty/skeleton state.
  const spendingCategories = useMemo(
    () =>
      (dashboard?.spendingByCategory ?? []).map((c, i) => ({
        name: c.category,
        value: c.amount,
        percentage: c.percentage,
        color: SPENDING_PALETTE[i % SPENDING_PALETTE.length],
      })),
    [dashboard],
  );
  const spendingTotal = dashboard?.monthlyExpenses ?? 0;
  // monthlyTrend is chronological (oldest -> current month last); the entry before
  // the last is last month's real expenses. Absent history -> neutral (equal).
  const spendingLastMonth =
    dashboard?.monthlyTrend && dashboard.monthlyTrend.length >= 2
      ? dashboard.monthlyTrend[dashboard.monthlyTrend.length - 2].expenses
      : spendingTotal;
  const isDashboardLoading = isLoadingDashboard && !dashboard;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchScores();
    fetchAlerts();
    fetchDisputes();
    fetchDashboard();
    fetchProgress();
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchScores(),
      fetchAlerts(),
      fetchDisputes(),
      fetchDashboard(),
      fetchProgress(),
    ]);
    setRefreshing(false);
  }, [
    fetchScores,
    fetchAlerts,
    fetchDisputes,
    fetchDashboard,
    fetchProgress,
  ]);

  // Get primary score (average or first available)
  const primaryScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0;
  const primaryChange =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, s) => sum + (s.change ?? 0), 0) / scores.length,
        )
      : 0;

  // Dispute stats
  const disputeStats = {
    total: disputes.length,
    pending: disputes.filter(
      (d) =>
        d.status === "pending" ||
        d.status === "in_progress" ||
        d.status === "sent" ||
        d.status === "under_review",
    ).length,
    resolved: disputes.filter((d) => d.status === "resolved").length,
  };

  // Quick actions
  const quickActions = [
    {
      icon: "add-circle",
      label: "New Dispute",
      route: "/dispute/wizard",
      color: colors.primary,
    },
    {
      icon: "speedometer",
      label: "Score Details",
      route: "/(tabs)/credit",
      color: colors.success,
    },
    {
      icon: "build",
      label: "Credit Builder",
      route: "/credit-builder",
      color: "#8B5CF6",
    },
    {
      icon: "wallet",
      label: "Finances",
      route: "/(tabs)/financial",
      color: colors.warning,
    },
    {
      icon: "shield-checkmark",
      label: "Identity",
      route: "/identity",
      color: colors.error,
    },
    {
      icon: "chatbox",
      label: "AI Assistant",
      route: "/financial-intelligence/chat",
      color: "#06B6D4",
    },
  ];

  // Recent activity from alerts and disputes
  const recentActivity = [
    ...alerts.slice(0, 3).map((a) => ({
      type: "alert" as const,
      title: a.title,
      date: new Date(a.createdAt).toLocaleDateString(),
      icon: "notifications" as const,
    })),
    ...disputes.slice(0, 3).map((d) => ({
      type: "dispute" as const,
      title: `${d.creditorName} - ${d.status}`,
      date: new Date(d.createdAt).toLocaleDateString(),
      icon: "document-text" as const,
    })),
  ].slice(0, 5);

  const isLoading = isLoadingScores || isLoadingDisputes;

  // Build styles using theme values
  const styles = useMemo(() => {
    const container: ViewStyle = {
      flex: 1,
      backgroundColor: colors.background,
    };
    const scrollView: ViewStyle = { flex: 1 };
    const header: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    };
    const greeting: TextStyle = { fontSize: 14, color: colors.textSecondary };
    const userName: TextStyle = {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    };
    const notificationButton: ViewStyle = { position: "relative", padding: 8 };
    const notificationBadge: ViewStyle = {
      position: "absolute",
      top: 4,
      right: 4,
      backgroundColor: colors.error,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: "center",
      alignItems: "center",
    };
    const notificationBadgeText: TextStyle = {
      color: colors.white,
      fontSize: 10,
      fontWeight: "700",
    };
    const scoreCard: ViewStyle = {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    };
    const scoreContainer: ViewStyle = {
      alignItems: "center",
      paddingVertical: spacing.md,
    };
    const bureauRow: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    };
    const bureauItem: ViewStyle = { alignItems: "center" };
    const bureauName: TextStyle = {
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: "capitalize",
    };
    const bureauScore: TextStyle = {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    };
    const bureauChange: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginTop: 2,
    };
    const bureauChangeText: TextStyle = {
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 2,
    };
    const viewScoreDetails: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: spacing.md,
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    };
    const viewScoreDetailsText: TextStyle = {
      color: colors.primary,
      fontWeight: "500",
      marginRight: 4,
    };
    const sectionTitle: TextStyle = {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginLeft: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    };
    const actionsScroll: ViewStyle = { marginBottom: spacing.md };
    const actionsContent: ViewStyle = { paddingHorizontal: spacing.lg };
    const actionButton: ViewStyle = {
      alignItems: "center",
      marginRight: spacing.md,
      width: 80,
    };
    const actionIcon: ViewStyle = {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    };
    const actionLabel: TextStyle = {
      fontSize: 11,
      color: colors.text,
      textAlign: "center",
    };
    const overviewCard: ViewStyle = {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    };
    const cardHeader: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    };
    const cardTitle: TextStyle = {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    };
    const statsRow: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: spacing.md,
    };
    const statItem: ViewStyle = { alignItems: "center", flex: 1 };
    const statDivider: ViewStyle = {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    };
    const statValue: TextStyle = {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    };
    const statLabel: TextStyle = {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    };
    const viewAllButton: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    };
    const viewAllText: TextStyle = {
      color: colors.primary,
      fontWeight: "500",
      marginRight: 4,
    };
    const monitoringCard: ViewStyle = {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    };
    const monitoringHeader: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
    };
    const statusDot: ViewStyle = {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    };
    const manageText: TextStyle = { color: colors.primary, fontWeight: "500" };
    const monitoringDescription: TextStyle = {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    };
    const alertBanner: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withOpacity(colors.warning, 0.15),
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      marginTop: spacing.md,
    };
    const alertBannerText: TextStyle = {
      flex: 1,
      fontSize: 13,
      color: "#92400E",
      marginLeft: 8,
    };
    const activityCard: ViewStyle = {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    };
    const viewAllLink: TextStyle = { color: colors.primary, fontWeight: "500" };
    const activityItem: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    };
    const lastActivityItem: ViewStyle = { borderBottomWidth: 0 };
    const activityIcon: ViewStyle = {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: withOpacity(colors.primary, 0.15),
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    };
    const activityContent: ViewStyle = { flex: 1 };
    const activityTitle: TextStyle = {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    };
    const activityDate: TextStyle = {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    };
    const emptyActivity: ViewStyle = {
      alignItems: "center",
      paddingVertical: spacing.xl,
    };
    const emptyActivityText: TextStyle = {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    };
    const promoCard: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.primary,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
    };
    const promoContent: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
    };
    const promoText: ViewStyle = { marginLeft: spacing.md };
    const promoTitle: TextStyle = {
      fontSize: 16,
      fontWeight: "700",
      color: colors.white,
    };
    const promoSubtitle: TextStyle = {
      fontSize: 12,
      color: "rgba(255,255,255,0.8)",
      marginTop: 2,
    };
    const gamificationCard: ViewStyle = {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    };
    const gamificationHeader: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    };
    const levelBadge: ViewStyle = {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    };
    const levelNumber: TextStyle = {
      fontSize: 18,
      fontWeight: "800",
      color: colors.white,
    };
    const levelInfo: ViewStyle = { flex: 1 };
    const levelTitle: TextStyle = {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    };
    const levelLabel: TextStyle = { fontSize: 12, color: colors.textSecondary };
    const gamificationFooter: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.sm,
    };
    const xpProgressText: TextStyle = {
      fontSize: 12,
      color: colors.textSecondary,
    };
    const viewRewardsLink: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
    };
    const viewRewardsText: TextStyle = {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "500",
      marginRight: 2,
    };
    const exploreSection: ViewStyle = {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    };
    const exploreGrid: ViewStyle = {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    };
    const exploreCard: ViewStyle = {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    };
    const exploreCardIcon: ViewStyle = {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    };
    const exploreCardTitle: TextStyle = {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    };
    const exploreCardSubtitle: TextStyle = {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    };

    return {
      container,
      scrollView,
      header,
      greeting,
      userName,
      notificationButton,
      notificationBadge,
      notificationBadgeText,
      scoreCard,
      scoreContainer,
      bureauRow,
      bureauItem,
      bureauName,
      bureauScore,
      bureauChange,
      bureauChangeText,
      viewScoreDetails,
      viewScoreDetailsText,
      sectionTitle,
      actionsScroll,
      actionsContent,
      actionButton,
      actionIcon,
      actionLabel,
      overviewCard,
      cardHeader,
      cardTitle,
      statsRow,
      statItem,
      statDivider,
      statValue,
      statLabel,
      viewAllButton,
      viewAllText,
      monitoringCard,
      monitoringHeader,
      statusDot,
      manageText,
      monitoringDescription,
      alertBanner,
      alertBannerText,
      activityCard,
      viewAllLink,
      activityItem,
      lastActivityItem,
      activityIcon,
      activityContent,
      activityTitle,
      activityDate,
      emptyActivity,
      emptyActivityText,
      promoCard,
      promoContent,
      promoText,
      promoTitle,
      promoSubtitle,
      gamificationCard,
      gamificationHeader,
      levelBadge,
      levelNumber,
      levelInfo,
      levelTitle,
      levelLabel,
      gamificationFooter,
      xpProgressText,
      viewRewardsLink,
      viewRewardsText,
      exploreSection,
      exploreGrid,
      exploreCard,
      exploreCardIcon,
      exploreCardTitle,
      exploreCardSubtitle,
    };
  }, [colors, spacing, borderRadius, withOpacity]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.text}
            />
            {unreadAlertCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Credit Score Card */}
        {isLoading ? (
          <Card style={styles.scoreCard}>
            <SkeletonScoreGauge />
          </Card>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/credit")}
            activeOpacity={0.9}
          >
            <Card style={styles.scoreCard}>
              <View style={styles.scoreContainer}>
                <ScoreGauge
                  score={primaryScore}
                  size={160}
                  showLabel
                  change={primaryChange}
                />
              </View>

              {/* Bureau Scores Row */}
              {scores.length > 0 && (
                <View style={styles.bureauRow}>
                  {scores.map((score) => {
                    const change = score.change ?? 0;
                    return (
                      <View key={score.bureau} style={styles.bureauItem}>
                        <Text style={styles.bureauName}>{score.bureau}</Text>
                        <Text style={styles.bureauScore}>{score.score}</Text>
                        {change !== 0 && (
                          <View
                            style={[
                              styles.bureauChange,
                              {
                                backgroundColor:
                                  change > 0
                                    ? withOpacity(colors.success, 0.15)
                                    : withOpacity(colors.error, 0.1),
                              },
                            ]}
                          >
                            <Ionicons
                              name={change > 0 ? "arrow-up" : "arrow-down"}
                              size={10}
                              color={change > 0 ? colors.success : colors.error}
                            />
                            <Text
                              style={[
                                styles.bureauChangeText,
                                {
                                  color:
                                    change > 0 ? colors.success : colors.error,
                                },
                              ]}
                            >
                              {Math.abs(change)}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.viewScoreDetails}>
                <Text style={styles.viewScoreDetailsText}>
                  View Score Details
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.primary}
                />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Gamification Widget — real XP/level/streak from gamificationStore.
            Real data renders the card; while loading with no data yet, an inline
            skeleton; on no-data/error the widget is simply hidden (never faked). */}
        {gamification ? (
          <TouchableOpacity
            onPress={() => router.push("/rewards" as never)}
            activeOpacity={0.9}
          >
            <Card style={styles.gamificationCard}>
              <View style={styles.gamificationHeader}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelNumber}>
                    {gamification.level.current}
                  </Text>
                </View>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelTitle}>
                    {gamification.level.title}
                  </Text>
                  <Text style={styles.levelLabel}>
                    Level {gamification.level.current}
                  </Text>
                </View>
                <StreakDisplay
                  streak={gamification.streak.days}
                  multiplier={gamification.streak.multiplier}
                  longestStreak={gamification.streak.longestStreak}
                  size="sm"
                />
              </View>
              <XpBar
                currentXp={gamification.xp.current}
                xpToNextLevel={gamification.xp.toNextLevel}
                currentLevel={gamification.level.current}
                showDetails={false}
              />
              <View style={styles.gamificationFooter}>
                <Text style={styles.xpProgressText}>
                  {gamification.xp.current.toLocaleString()} /{" "}
                  {gamification.xp.toNextLevel.toLocaleString()} XP
                </Text>
                <View style={styles.viewRewardsLink}>
                  <Text style={styles.viewRewardsText}>View Rewards</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.primary}
                  />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : isLoadingProgress ? (
          <Card style={styles.gamificationCard}>
            <View style={styles.gamificationHeader}>
              <LoadingSkeleton
                width={44}
                height={44}
                borderRadius={22}
                style={{ marginRight: 12 }}
              />
              <View style={styles.levelInfo}>
                <LoadingSkeleton
                  width="60%"
                  height={16}
                  style={{ marginBottom: 6 }}
                />
                <LoadingSkeleton width="40%" height={12} />
              </View>
            </View>
            <LoadingSkeleton width="100%" height={10} borderRadius={5} />
          </Card>
        ) : null}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionsScroll}
          contentContainerStyle={styles.actionsContent}
        >
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionButton}
              onPress={() => router.push(action.route as never)}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${action.color}15` },
                ]}
              >
                <Ionicons
                  name={action.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={action.color}
                />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Disputes Overview */}
        <Card style={styles.overviewCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Disputes Overview</Text>
            <TouchableOpacity onPress={() => router.push("/dispute/wizard")}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{disputeStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {disputeStats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {disputeStats.resolved}
              </Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push("/(tabs)/disputes")}
          >
            <Text style={styles.viewAllText}>View All Disputes</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Payday Countdown — no honest pay-schedule source is wired: the
            dashboard aggregate carries no next-pay date/amount/source and there is
            no mobile income client. Render the widget's own "add income" empty
            state (CTA -> real income screen) instead of fabricating a countdown. */}
        <Text style={styles.sectionTitle}>Payday</Text>
        <PaydayCountdown
          hasIncomeSources={false}
          onAddIncome={() => router.push("/financial/income")}
        />

        {/* Spending Overview — real month spend + category breakdown + last-month
            delta from the financial dashboard aggregate (dashboardStore). */}
        <Text style={styles.sectionTitle}>Spending</Text>
        <SpendingOverview
          totalSpent={spendingTotal}
          lastMonthSpent={spendingLastMonth}
          categories={spendingCategories}
          isLoading={isDashboardLoading}
        />

        {/* Credit Monitoring Status */}
        <Card style={styles.monitoringCard}>
          <View style={styles.cardHeader}>
            <View style={styles.monitoringHeader}>
              <View
                style={[styles.statusDot, { backgroundColor: colors.success }]}
              />
              <Text style={styles.cardTitle}>Credit Monitoring</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/monitoring")}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.monitoringDescription}>
            Your credit is being monitored across all three bureaus.
          </Text>
          {unreadAlertCount > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => router.push("/monitoring/alerts")}
            >
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.alertBannerText}>
                {unreadAlertCount} new alert{unreadAlertCount > 1 ? "s" : ""}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.warning}
              />
            </TouchableOpacity>
          )}
        </Card>

        {/* Recent Activity */}
        <Card style={styles.activityCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/activity")}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length > 0 ? (
            recentActivity.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.activityItem,
                  i === recentActivity.length - 1 && styles.lastActivityItem,
                ]}
              >
                <View style={styles.activityIcon}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.activityDate}>{item.date}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons
                name="time-outline"
                size={iconSize.xl}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          )}
        </Card>

        {/* Credit Builder Promo */}
        <TouchableOpacity
          style={styles.promoCard}
          onPress={() => router.push("/credit-builder")}
        >
          <View style={styles.promoContent}>
            <Ionicons
              name="rocket-outline"
              size={iconSize.xl}
              color={colors.white}
            />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Boost Your Score</Text>
              <Text style={styles.promoSubtitle}>
                18 tools to improve your credit
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.white} />
        </TouchableOpacity>

        {/* Explore Features */}
        <View style={styles.exploreSection}>
          <Text style={[styles.sectionTitle, { marginLeft: 0 }]}>Explore</Text>
          <View style={styles.exploreGrid}>
            {[
              {
                icon: "trending-up",
                label: "Trading",
                subtitle: "Stocks & crypto",
                route: "/trading",
                color: "#10B981",
              },
              {
                icon: "chatbox-ellipses",
                label: "AI Assistant",
                subtitle: "Financial chat",
                route: "/financial-intelligence/chat",
                color: "#06B6D4",
              },
              {
                icon: "receipt",
                label: "Tax Center",
                subtitle: "Optimize & file",
                route: "/tax",
                color: "#8B5CF6",
              },
              {
                icon: "storefront",
                label: "Marketplace",
                subtitle: "Financial products",
                route: "/marketplace",
                color: "#F59E0B",
              },
              {
                icon: "school",
                label: "AI Coach",
                subtitle: "Personal coaching",
                route: "/coach",
                color: "#EC4899",
              },
              {
                icon: "bar-chart",
                label: "Analytics",
                subtitle: "Spending insights",
                route: "/insights",
                color: "#3B82F6",
              },
              {
                icon: "folder",
                label: "Documents",
                subtitle: "Upload & manage",
                route: "/documents",
                color: "#6366F1",
              },
              {
                icon: "construct",
                label: "Credit Repair",
                subtitle: "Dispute strategies",
                route: "/credit-repair",
                color: "#EF4444",
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.exploreCard}
                onPress={() => router.push(item.route as never)}
              >
                <View
                  style={[
                    styles.exploreCardIcon,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={item.color}
                  />
                </View>
                <Text style={styles.exploreCardTitle}>{item.label}</Text>
                <Text style={styles.exploreCardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
