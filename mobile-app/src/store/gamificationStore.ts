/**
 * Fynvita Gamification Store
 * Manages XP, levels, badges, quests, streak, and leaderboard state
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  gamificationApi,
  type GamificationProgress,
  type Badge,
  type UserBadge,
  type BadgeProgress,
  type BadgesResponse,
  type UserQuestProgress,
  type QuestsResponse,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type LeaderboardType,
  type StreakUpdateResponse,
  type BadgeCategory,
} from "../services/api/gamification";
import { seedGamificationProgress, seedBadgesResponse, seedQuestsResponse, seedLeaderboard } from "../data/dev-seed";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface GamificationState {
  // Progress
  progress: GamificationProgress | null;
  lastProgressFetch: string | null;

  // Badges
  earnedBadges: UserBadge[];
  inProgressBadges: BadgeProgress[];
  lockedBadges: Badge[];
  badgeStats: {
    totalEarned: number;
    totalAvailable: number;
    byCategory: Record<BadgeCategory, number>;
  } | null;
  lastBadgesFetch: string | null;

  // Quests
  quests: UserQuestProgress[];
  questsCompletedToday: number;
  totalQuestsToday: number;
  availableXp: number;
  lastQuestsFetch: string | null;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  leaderboardType: LeaderboardType;
  leaderboardPeriod: { start: string; end: string } | null;
  userRank: number | null;
  userPercentile: number | null;
  lastLeaderboardFetch: string | null;

  // Loading States
  isLoadingProgress: boolean;
  isLoadingBadges: boolean;
  isLoadingQuests: boolean;
  isLoadingLeaderboard: boolean;
  isUpdatingStreak: boolean;
  isCompletingQuest: boolean;

  // Errors
  progressError: string | null;
  badgesError: string | null;
  questsError: string | null;
  leaderboardError: string | null;

  // Actions - Progress
  fetchProgress: () => Promise<void>;
  updateStreak: () => Promise<StreakUpdateResponse | null>;

  // Actions - Badges
  fetchBadges: () => Promise<void>;
  awardBadge: (badgeCode: string) => Promise<Badge | null>;

  // Actions - Quests
  fetchQuests: () => Promise<void>;
  completeQuest: (questId: string) => Promise<{ xpEarned: number } | null>;

  // Actions - Leaderboard
  fetchLeaderboard: (type?: LeaderboardType) => Promise<void>;

  // Actions - Utility
  refreshAll: () => Promise<void>;
  clearErrors: () => void;
  resetStore: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Progress
  progress: null as GamificationProgress | null,
  lastProgressFetch: null as string | null,

  // Badges
  earnedBadges: [] as UserBadge[],
  inProgressBadges: [] as BadgeProgress[],
  lockedBadges: [] as Badge[],
  badgeStats: null as GamificationState["badgeStats"],
  lastBadgesFetch: null as string | null,

  // Quests
  quests: [] as UserQuestProgress[],
  questsCompletedToday: 0,
  totalQuestsToday: 0,
  availableXp: 0,
  lastQuestsFetch: null as string | null,

  // Leaderboard
  leaderboard: [] as LeaderboardEntry[],
  leaderboardType: "weekly_xp" as LeaderboardType,
  leaderboardPeriod: null as { start: string; end: string } | null,
  userRank: null as number | null,
  userPercentile: null as number | null,
  lastLeaderboardFetch: null as string | null,

  // Loading States
  isLoadingProgress: false,
  isLoadingBadges: false,
  isLoadingQuests: false,
  isLoadingLeaderboard: false,
  isUpdatingStreak: false,
  isCompletingQuest: false,

  // Errors
  progressError: null as string | null,
  badgesError: null as string | null,
  questsError: null as string | null,
  leaderboardError: null as string | null,
};

// ============================================================================
// STORE
// ============================================================================

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================
      // Progress Actions
      // ========================================

      fetchProgress: async () => {
        set({ isLoadingProgress: true, progressError: null });
        if (__DEV__) {
          set({ progress: seedGamificationProgress, lastProgressFetch: new Date().toISOString(), isLoadingProgress: false });
          return;
        }
        try {
          const response = await gamificationApi.getProgress();
          if (response.success && response.data) {
            set({
              progress: response.data,
              lastProgressFetch: new Date().toISOString(),
              isLoadingProgress: false,
            });
          } else {
            set({
              progressError:
                response.error?.message || "Failed to fetch progress",
              isLoadingProgress: false,
            });
          }
        } catch (error) {
          set({
            progressError:
              error instanceof Error
                ? error.message
                : "Failed to fetch progress",
            isLoadingProgress: false,
          });
        }
      },

      updateStreak: async () => {
        set({ isUpdatingStreak: true });
        try {
          const response = await gamificationApi.updateStreak();
          if (response.success && response.data) {
            const data = response.data;
            // Update progress with new streak data
            const currentProgress = get().progress;
            if (currentProgress) {
              set({
                progress: {
                  ...currentProgress,
                  xp: {
                    ...currentProgress.xp,
                    current: currentProgress.xp.current + (data.xpEarned || 0),
                  },
                  streak: {
                    days: data.streak.currentStreak,
                    multiplier: data.streak.multiplier,
                    longestStreak: data.streak.longestStreak,
                  },
                  level:
                    data.levelUp && data.newLevel
                      ? {
                          current: data.newLevel,
                          title: data.newTitle || currentProgress.level.title,
                          progress: 0,
                        }
                      : currentProgress.level,
                },
                isUpdatingStreak: false,
              });
            }
            return data;
          }
          set({ isUpdatingStreak: false });
          return null;
        } catch (error) {
          set({ isUpdatingStreak: false });
          return null;
        }
      },

      // ========================================
      // Badges Actions
      // ========================================

      fetchBadges: async () => {
        set({ isLoadingBadges: true, badgesError: null });
        if (__DEV__) {
          set({
            earnedBadges: seedBadgesResponse.earned,
            inProgressBadges: seedBadgesResponse.inProgress,
            lockedBadges: seedBadgesResponse.locked,
            badgeStats: seedBadgesResponse.stats,
            lastBadgesFetch: new Date().toISOString(),
            isLoadingBadges: false,
          });
          return;
        }
        try {
          const response = await gamificationApi.getBadges();
          if (response.success && response.data) {
            const data = response.data;
            set({
              earnedBadges: data.earned,
              inProgressBadges: data.inProgress,
              lockedBadges: data.locked,
              badgeStats: data.stats,
              lastBadgesFetch: new Date().toISOString(),
              isLoadingBadges: false,
            });
          } else {
            set({
              badgesError: response.error?.message || "Failed to fetch badges",
              isLoadingBadges: false,
            });
          }
        } catch (error) {
          set({
            badgesError:
              error instanceof Error ? error.message : "Failed to fetch badges",
            isLoadingBadges: false,
          });
        }
      },

      awardBadge: async (badgeCode: string) => {
        try {
          const response = await gamificationApi.awardBadge(badgeCode);
          if (response.success && response.data?.badge) {
            // Refetch badges to update the list
            get().fetchBadges();
            return response.data.badge;
          }
          return null;
        } catch {
          return null;
        }
      },

      // ========================================
      // Quests Actions
      // ========================================

      fetchQuests: async () => {
        set({ isLoadingQuests: true, questsError: null });
        if (__DEV__) {
          set({
            quests: seedQuestsResponse.today,
            questsCompletedToday: seedQuestsResponse.completedToday,
            totalQuestsToday: seedQuestsResponse.totalToday,
            availableXp: seedQuestsResponse.availableXp,
            lastQuestsFetch: new Date().toISOString(),
            isLoadingQuests: false,
          });
          return;
        }
        try {
          const response = await gamificationApi.getQuests();
          if (response.success && response.data) {
            const data = response.data;
            set({
              quests: data.today,
              questsCompletedToday: data.completedToday,
              totalQuestsToday: data.totalToday,
              availableXp: data.availableXp,
              lastQuestsFetch: new Date().toISOString(),
              isLoadingQuests: false,
            });
          } else {
            set({
              questsError: response.error?.message || "Failed to fetch quests",
              isLoadingQuests: false,
            });
          }
        } catch (error) {
          set({
            questsError:
              error instanceof Error ? error.message : "Failed to fetch quests",
            isLoadingQuests: false,
          });
        }
      },

      completeQuest: async (questId: string) => {
        set({ isCompletingQuest: true });
        try {
          const response = await gamificationApi.completeQuest(questId);
          if (response.success && response.data?.success) {
            const xpEarned = response.data.xpEarned || 0;
            // Update quest status locally
            set((state) => ({
              quests: state.quests.map((q) =>
                q.questId === questId
                  ? {
                      ...q,
                      isCompleted: true,
                      completedAt: new Date().toISOString(),
                    }
                  : q,
              ),
              questsCompletedToday: state.questsCompletedToday + 1,
              availableXp: Math.max(0, state.availableXp - xpEarned),
              isCompletingQuest: false,
            }));
            // Refresh progress to get updated XP
            get().fetchProgress();
            return { xpEarned };
          }
          set({ isCompletingQuest: false });
          return null;
        } catch {
          set({ isCompletingQuest: false });
          return null;
        }
      },

      // ========================================
      // Leaderboard Actions
      // ========================================

      fetchLeaderboard: async (type: LeaderboardType = "weekly_xp") => {
        set({ isLoadingLeaderboard: true, leaderboardError: null });
        if (__DEV__) {
          set({
            leaderboard: seedLeaderboard.entries,
            leaderboardType: seedLeaderboard.type,
            leaderboardPeriod: { start: seedLeaderboard.periodStart, end: seedLeaderboard.periodEnd },
            userRank: seedLeaderboard.userRank ?? null,
            userPercentile: seedLeaderboard.userPercentile ?? null,
            lastLeaderboardFetch: new Date().toISOString(),
            isLoadingLeaderboard: false,
          });
          return;
        }
        try {
          const response = await gamificationApi.getLeaderboard(type);
          if (response.success && response.data) {
            const data = response.data;
            set({
              leaderboard: data.entries,
              leaderboardType: data.type,
              leaderboardPeriod: {
                start: data.periodStart,
                end: data.periodEnd,
              },
              userRank: data.userRank ?? null,
              userPercentile: data.userPercentile ?? null,
              lastLeaderboardFetch: new Date().toISOString(),
              isLoadingLeaderboard: false,
            });
          } else {
            set({
              leaderboardError:
                response.error?.message || "Failed to fetch leaderboard",
              isLoadingLeaderboard: false,
            });
          }
        } catch (error) {
          set({
            leaderboardError:
              error instanceof Error
                ? error.message
                : "Failed to fetch leaderboard",
            isLoadingLeaderboard: false,
          });
        }
      },

      // ========================================
      // Utility Actions
      // ========================================

      refreshAll: async () => {
        const { fetchProgress, fetchBadges, fetchQuests, fetchLeaderboard } =
          get();
        await Promise.all([
          fetchProgress(),
          fetchBadges(),
          fetchQuests(),
          fetchLeaderboard(),
        ]);
      },

      clearErrors: () => {
        set({
          progressError: null,
          badgesError: null,
          questsError: null,
          leaderboardError: null,
        });
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: "fynvita-gamification-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist essential data
        progress: state.progress,
        earnedBadges: state.earnedBadges,
        inProgressBadges: state.inProgressBadges,
        badgeStats: state.badgeStats,
        quests: state.quests,
        questsCompletedToday: state.questsCompletedToday,
        lastProgressFetch: state.lastProgressFetch,
        lastBadgesFetch: state.lastBadgesFetch,
        lastQuestsFetch: state.lastQuestsFetch,
      }),
    },
  ),
);

export default useGamificationStore;
