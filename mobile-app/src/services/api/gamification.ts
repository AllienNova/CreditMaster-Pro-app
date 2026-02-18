/**
 * Fynvita Mobile Gamification API Service
 * Handles XP, levels, badges, quests, and leaderboard endpoints
 */

import { api } from "./client";
import type { ApiResponse } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export type BadgeCategory =
  | "savings"
  | "debt"
  | "budget"
  | "credit"
  | "investing"
  | "trading"
  | "tax"
  | "streak"
  | "community"
  | "special";

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type QuestType =
  | "transaction"
  | "savings"
  | "budget"
  | "credit"
  | "education"
  | "engagement";

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xpReward: number;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
  earnedAt: string;
  progress: number;
  isPinned: boolean;
  userId: string;
}

export interface BadgeProgress {
  id: string;
  userId: string;
  badgeId: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  lastUpdated: string;
  badge: Badge;
}

export interface BadgesResponse {
  earned: UserBadge[];
  inProgress: BadgeProgress[];
  locked: Badge[];
  stats: {
    totalEarned: number;
    totalAvailable: number;
    byCategory: Record<BadgeCategory, number>;
  };
}

export interface GamificationProgress {
  xp: {
    current: number;
    toNextLevel: number;
    totalEarned: number;
  };
  level: {
    current: number;
    title: string;
    progress: number;
  };
  streak: {
    days: number;
    multiplier: number;
    longestStreak: number;
  };
}

export interface DailyQuest {
  id: string;
  code: string;
  name: string;
  description: string;
  xpReward: number;
  bonusReward?: {
    emoji?: string;
    badge?: string;
    bonus_xp?: number;
  };
  questType: QuestType;
  criteria: {
    type: string;
    min?: number;
    min_amount?: number;
    categories?: string | string[];
  };
  isActive: boolean;
  createdAt: string;
}

export interface UserQuestProgress {
  id: string;
  userId: string;
  questId: string;
  quest: DailyQuest;
  questDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  progressValue: number;
}

export interface QuestsResponse {
  today: UserQuestProgress[];
  completedToday: number;
  totalToday: number;
  availableXp: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  isCurrentUser?: boolean;
}

export type LeaderboardType =
  | "weekly_xp"
  | "monthly_xp"
  | "streak"
  | "challenge";

export interface LeaderboardResponse {
  type: LeaderboardType;
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  userPercentile?: number;
}

export interface StreakUpdateResponse {
  streak: {
    currentStreak: number;
    longestStreak: number;
    multiplier: number;
    streakBroken: boolean;
    daysUntilNextMilestone: number;
    nextMilestone: number;
  };
  xpEarned: number;
  levelUp: boolean;
  newLevel?: number;
  newTitle?: string;
}

export interface AwardBadgeResponse {
  success: boolean;
  badge?: Badge;
  error?: string;
}

export interface CompleteQuestResponse {
  success: boolean;
  xpEarned?: number;
  error?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get user's gamification progress (XP, level, streak)
 */
export async function getProgress(): Promise<
  ApiResponse<GamificationProgress>
> {
  return api.get<GamificationProgress>("/gamification/progress", {
    enableCache: true,
    cacheTime: 60 * 1000, // 1 minute cache
  });
}

/**
 * Update streak (daily check-in) and get XP
 */
export async function updateStreak(): Promise<
  ApiResponse<StreakUpdateResponse>
> {
  return api.post<StreakUpdateResponse>("/gamification/progress");
}

/**
 * Get user's badges (earned, in progress, locked)
 */
export async function getBadges(): Promise<ApiResponse<BadgesResponse>> {
  return api.get<BadgesResponse>("/gamification/badges", {
    enableCache: true,
    cacheTime: 5 * 60 * 1000, // 5 minute cache
  });
}

/**
 * Award a badge to the user
 */
export async function awardBadge(
  badgeCode: string,
): Promise<ApiResponse<AwardBadgeResponse>> {
  return api.post<AwardBadgeResponse>("/gamification/badges", { badgeCode });
}

/**
 * Get daily quests
 */
export async function getQuests(): Promise<ApiResponse<QuestsResponse>> {
  return api.get<QuestsResponse>("/gamification/quests", {
    enableCache: true,
    cacheTime: 60 * 1000, // 1 minute cache
  });
}

/**
 * Complete a quest and claim reward
 */
export async function completeQuest(
  questId: string,
): Promise<ApiResponse<CompleteQuestResponse>> {
  return api.post<CompleteQuestResponse>("/gamification/quests", { questId });
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  type: LeaderboardType = "weekly_xp",
): Promise<ApiResponse<LeaderboardResponse>> {
  return api.get<LeaderboardResponse>(
    `/gamification/leaderboard?type=${type}`,
    {
      enableCache: true,
      cacheTime: 5 * 60 * 1000, // 5 minute cache
    },
  );
}

// ============================================================================
// EXPORT API OBJECT
// ============================================================================

export const gamificationApi = {
  getProgress,
  updateStreak,
  getBadges,
  awardBadge,
  getQuests,
  completeQuest,
  getLeaderboard,
};

export default gamificationApi;
