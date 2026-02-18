/**
 * Badges Gallery Screen
 * View all badges - earned, in progress, and locked
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
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { lightTheme as theme } from "../../src/constants/theme";
import { BadgeCard } from "../../src/components/gamification";
import { useGamificationStore } from "../../src/store/gamificationStore";
import type {
  Badge,
  BadgeCategory,
  BadgeRarity,
} from "../../src/services/api/gamification";

const categoryLabels: Record<BadgeCategory, { label: string; icon: string }> = {
  savings: { label: "Savings", icon: "💰" },
  debt: { label: "Debt Freedom", icon: "⚔️" },
  budget: { label: "Budget", icon: "📊" },
  credit: { label: "Credit", icon: "📈" },
  investing: { label: "Investing", icon: "📈" },
  trading: { label: "Trading", icon: "📉" },
  tax: { label: "Tax", icon: "📋" },
  streak: { label: "Streaks", icon: "🔥" },
  community: { label: "Community", icon: "🤝" },
  special: { label: "Special", icon: "⭐" },
};

export default function BadgesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<BadgeCategory | "all">("all");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const {
    earnedBadges,
    inProgressBadges,
    lockedBadges,
    badgeStats,
    isLoadingBadges,
    badgesError,
    fetchBadges,
  } = useGamificationStore();

  useEffect(() => {
    fetchBadges();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBadges();
    setRefreshing(false);
  }, [fetchBadges]);

  const filterBadges = (badges: Badge[]) => {
    if (filter === "all") return badges;
    return badges.filter((b) => b.category === filter);
  };

  const allCategories = Object.keys(categoryLabels) as BadgeCategory[];
  const totalBadges =
    earnedBadges.length + inProgressBadges.length + lockedBadges.length;

  // Transform store data to expected format
  const earnedBadgesList = earnedBadges.map((ub) => ({
    badge: ub.badge,
    earnedAt: ub.earnedAt,
  }));

  const inProgressList = inProgressBadges.map((bp) => ({
    badge: bp.badge,
    progress: bp.progressPercent,
  }));

  const loading = isLoadingBadges && earnedBadges.length === 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading badges...</Text>
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
          <Text style={styles.title}>All Badges</Text>
          <Text style={styles.badgeCount}>
            {earnedBadges.length}/{totalBadges}
          </Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === "all" && styles.filterChipActive,
            ]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {allCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                filter === cat && styles.filterChipActive,
              ]}
              onPress={() => setFilter(cat)}
            >
              <Text style={styles.filterIcon}>{categoryLabels[cat].icon}</Text>
              <Text
                style={[
                  styles.filterText,
                  filter === cat && styles.filterTextActive,
                ]}
              >
                {categoryLabels[cat].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Error State */}
        {badgesError && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle"
              size={48}
              color={theme.colors.error}
            />
            <Text style={styles.errorText}>{badgesError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchBadges}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Earned Badges */}
        {earnedBadgesList.length > 0 &&
          filterBadges(earnedBadgesList.map((e) => e.badge)).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✓ Earned</Text>
              <View style={styles.badgeGrid}>
                {filterBadges(earnedBadgesList.map((e) => e.badge)).map(
                  (badge) => {
                    const earned = earnedBadgesList.find(
                      (e) => e.badge.id === badge.id,
                    );
                    return (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned
                        earnedDate={earned?.earnedAt}
                        size="sm"
                        onPress={() => setSelectedBadge(badge)}
                      />
                    );
                  },
                )}
              </View>
            </View>
          )}

        {/* In Progress Badges */}
        {inProgressList.length > 0 &&
          filterBadges(inProgressList.map((e) => e.badge)).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏳ In Progress</Text>
              <View style={styles.badgeGrid}>
                {filterBadges(inProgressList.map((e) => e.badge)).map(
                  (badge) => {
                    const prog = inProgressList.find(
                      (e) => e.badge.id === badge.id,
                    );
                    return (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned={false}
                        progress={prog?.progress}
                        size="sm"
                        onPress={() => setSelectedBadge(badge)}
                      />
                    );
                  },
                )}
              </View>
            </View>
          )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && filterBadges(lockedBadges).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Locked</Text>
            <View style={styles.badgeGrid}>
              {filterBadges(lockedBadges).map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  size="sm"
                  onPress={() => setSelectedBadge(badge)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Badge Detail Modal */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <Text style={styles.modalIcon}>{selectedBadge.icon}</Text>
                <Text style={styles.modalName}>{selectedBadge.name}</Text>
                <Text
                  style={[
                    styles.modalRarity,
                    { color: getRarityColor(selectedBadge.rarity) },
                  ]}
                >
                  {selectedBadge.rarity}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedBadge.description}
                </Text>
                <View style={styles.modalCategory}>
                  <Text>{categoryLabels[selectedBadge.category].icon}</Text>
                  <Text style={styles.modalCategoryText}>
                    {categoryLabels[selectedBadge.category].label}
                  </Text>
                </View>
                <Text style={styles.modalXp}>+{selectedBadge.xpReward} XP</Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setSelectedBadge(null)}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getRarityColor = (rarity: BadgeRarity): string => {
  const colors: Record<BadgeRarity, string> = {
    common: "#6B7280",
    uncommon: "#22C55E",
    rare: "#3B82F6",
    epic: "#A855F7",
    legendary: "#F59E0B",
  };
  return colors[rarity];
};

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: theme.spacing.lg,
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
  badgeCount: { fontSize: 14, color: theme.colors.textSecondary },
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterIcon: { fontSize: 14 },
  filterText: { fontSize: 13, color: theme.colors.textSecondary },
  filterTextActive: { color: "#fff" },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  modalIcon: { fontSize: 56, marginBottom: 12 },
  modalName: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalRarity: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  modalCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  modalCategoryText: { fontSize: 13, color: theme.colors.textSecondary },
  modalXp: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 20,
  },
  modalClose: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseText: { fontSize: 15, fontWeight: "500", color: theme.colors.text },
});
