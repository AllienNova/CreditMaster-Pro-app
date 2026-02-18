/**
 * Leaderboard Screen
 * View rankings for XP and streaks
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
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { Card } from "../../src/components/Card";
import { useGamificationStore } from "../../src/store/gamificationStore";
import type {
  LeaderboardType,
  LeaderboardEntry,
} from "../../src/services/api/gamification";

const tabs: {
  key: LeaderboardType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "weekly_xp", label: "Weekly XP", icon: "flash" },
  { key: "monthly_xp", label: "Monthly XP", icon: "calendar" },
  { key: "streak", label: "Streak", icon: "flame" },
];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>("weekly_xp");
  const [refreshing, setRefreshing] = useState(false);

  const {
    leaderboard,
    leaderboardType,
    leaderboardPeriod,
    userRank,
    userPercentile,
    isLoadingLeaderboard,
    leaderboardError,
    fetchLeaderboard,
    progress,
    fetchProgress,
  } = useGamificationStore();

  useEffect(() => {
    fetchLeaderboard(activeTab);
    fetchProgress();
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchLeaderboard(activeTab), fetchProgress()]);
    setRefreshing(false);
  }, [activeTab, fetchLeaderboard, fetchProgress]);

  const handleTabChange = (tab: LeaderboardType) => {
    setActiveTab(tab);
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return theme.colors.textSecondary;
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const formatValue = (value: number, type: LeaderboardType): string => {
    if (type === "streak") {
      return `${value} days`;
    }
    return `${value.toLocaleString()} XP`;
  };

  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const isTopThree = item.rank <= 3;
    const isCurrentUser = item.isCurrentUser;

    return (
      <View
        style={[
          styles.rankItem,
          isTopThree && styles.rankItemTop,
          isCurrentUser && styles.rankItemCurrentUser,
        ]}
      >
        <View style={styles.rankLeft}>
          <View
            style={[
              styles.rankBadge,
              {
                backgroundColor: isTopThree
                  ? `${getRankColor(item.rank)}20`
                  : theme.colors.surface,
              },
            ]}
          >
            {isTopThree ? (
              <Text style={styles.rankEmoji}>{getRankEmoji(item.rank)}</Text>
            ) : (
              <Text
                style={[styles.rankNumber, { color: getRankColor(item.rank) }]}
              >
                #{item.rank}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text
              style={[styles.userName, isCurrentUser && styles.userNameCurrent]}
              numberOfLines={1}
            >
              {item.displayName}
              {isCurrentUser && " (You)"}
            </Text>
          </View>
        </View>
        <View style={styles.rankRight}>
          <Text
            style={[styles.rankValue, isCurrentUser && styles.rankValueCurrent]}
          >
            {formatValue(item.value, leaderboardType)}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoadingLeaderboard && leaderboard.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
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

      {/* User Stats Card */}
      {userRank !== null && (
        <Card style={styles.userStatsCard}>
          <View style={styles.userStatsRow}>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatLabel}>Your Rank</Text>
              <Text style={styles.userStatValue}>#{userRank}</Text>
            </View>
            <View style={styles.userStatDivider} />
            <View style={styles.userStatItem}>
              <Text style={styles.userStatLabel}>Top %</Text>
              <Text
                style={[styles.userStatValue, { color: theme.colors.success }]}
              >
                {userPercentile !== null
                  ? `${Math.round(userPercentile)}%`
                  : "-"}
              </Text>
            </View>
            <View style={styles.userStatDivider} />
            <View style={styles.userStatItem}>
              <Text style={styles.userStatLabel}>Your XP</Text>
              <Text style={[styles.userStatValue, { color: "#F59E0B" }]}>
                {progress?.xp.totalEarned.toLocaleString() || "0"}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Period Info */}
      {leaderboardPeriod && (
        <View style={styles.periodInfo}>
          <Ionicons
            name="time-outline"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.periodText}>
            {new Date(leaderboardPeriod.start).toLocaleDateString()} -{" "}
            {new Date(leaderboardPeriod.end).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Leaderboard List */}
      {leaderboardError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{leaderboardError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchLeaderboard(activeTab)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="trophy-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptyText}>
            Be the first to earn XP and climb the leaderboard!
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => `${item.rank}-${item.userId}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>Top Players</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
    gap: 4,
  },
  tabActive: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  userStatsCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  userStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userStatItem: {
    flex: 1,
    alignItems: "center",
  },
  userStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  userStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  userStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
  },
  periodInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  periodText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  listHeader: {
    marginBottom: theme.spacing.md,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankItemTop: {
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankItemCurrentUser: {
    backgroundColor: `${theme.colors.primary}10`,
    borderColor: theme.colors.primary,
  },
  rankLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  userNameCurrent: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  rankRight: {
    marginLeft: 12,
  },
  rankValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  rankValueCurrent: {
    color: theme.colors.primary,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
    paddingHorizontal: 40,
  },
});
