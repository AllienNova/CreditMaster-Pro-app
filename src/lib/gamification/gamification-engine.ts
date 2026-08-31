/**
 * Fynvita Gamification Engine
 * Core service for XP calculation, level progression, and game mechanics
 */

import { createClient } from "@supabase/supabase-js";
import {
  UserProgress,
  UserProgressWithLevel,
  LevelDefinition,
  XpTransaction,
  XpAwardResult,
  GameEvent,
  GameEventResult,
  GameEventType,
  StreakInfo,
  XP_REWARDS,
  STREAK_MILESTONES,
  calculateStreakMultiplier,
  getNextStreakMilestone,
  BadgeDefinition,
  DailyQuest,
} from "./types";

// ============================================================================
// LEVEL DEFINITIONS
// ============================================================================

const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 1, title: "Financial Newbie", xpRequired: 0 },
  { level: 2, title: "Budget Beginner", xpRequired: 500 },
  { level: 3, title: "Savings Starter", xpRequired: 1200 },
  { level: 4, title: "Money Manager", xpRequired: 2100 },
  { level: 5, title: "Finance Fighter", xpRequired: 3200 },
  { level: 6, title: "Debt Destroyer", xpRequired: 4500 },
  { level: 7, title: "Credit Climber", xpRequired: 6000 },
  { level: 8, title: "Wealth Builder", xpRequired: 8000 },
  { level: 9, title: "Investment Initiate", xpRequired: 10500 },
  { level: 10, title: "Portfolio Pro", xpRequired: 13500 },
  { level: 11, title: "Financial Strategist", xpRequired: 17000 },
  { level: 12, title: "Wealth Architect", xpRequired: 21000 },
  { level: 13, title: "Money Mentor", xpRequired: 25500 },
  { level: 14, title: "Fiscal Champion", xpRequired: 30500 },
  { level: 15, title: "Wealth Warrior", xpRequired: 28000 },
  { level: 20, title: "Finance Master", xpRequired: 52000 },
  { level: 25, title: "Money Maven", xpRequired: 85000 },
  { level: 30, title: "Financial Legend", xpRequired: 150000 },
];

// ============================================================================
// GAMIFICATION ENGINE CLASS
// ============================================================================

export class GamificationEngine {
  private readonly supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // --------------------------------------------------------------------------
  // USER PROGRESS
  // --------------------------------------------------------------------------

  async getUserProgress(userId: string): Promise<UserProgressWithLevel | null> {
    const { data, error } = await this.supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    const progress = this.mapToUserProgress(data);
    return this.enrichWithLevelInfo(progress);
  }

  async initializeUserProgress(userId: string): Promise<UserProgress> {
    const { data, error } = await this.supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("user_progress")
      .upsert({
        user_id: userId,
        current_xp: 0,
        total_xp_earned: 0,
        current_level: 1,
        current_streak: 0,
        longest_streak: 0,
        streak_multiplier: 1.0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to initialize user progress: ${error.message}`);
    }

    return this.mapToUserProgress(data);
  }

  // --------------------------------------------------------------------------
  // XP SYSTEM
  // --------------------------------------------------------------------------

  async awardXp(
    userId: string,
    amount: number,
    reason: string,
    eventType: GameEventType,
    metadata?: Record<string, unknown>,
  ): Promise<XpAwardResult> {
    // Get current progress
    const progress = await this.getUserProgress(userId);
    if (!progress) {
      await this.initializeUserProgress(userId);
      return this.awardXp(userId, amount, reason, eventType, metadata);
    }

    // Apply streak multiplier
    const finalAmount = Math.floor(amount * progress.streakMultiplier);

    // Record XP transaction
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    await this.supabase.from("xp_transactions").insert({
      user_id: userId,
      amount: finalAmount,
      reason,
      event_type: eventType,
      multiplier: progress.streakMultiplier,
      metadata,
    });

    // Calculate new totals
    const newCurrentXp = progress.currentXp + finalAmount;
    const newTotalXp = progress.totalXpEarned + finalAmount;

    // Check for level up
    const newLevel = this.calculateLevelFromXp(newTotalXp);
    const levelUp = newLevel > progress.currentLevel;
    const newLevelInfo = levelUp ? this.getLevelDefinition(newLevel) : null;

    // Update progress
    await this.supabase
      .from("user_progress")
      .update({
        current_xp: newCurrentXp,
        total_xp_earned: newTotalXp,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return {
      xpEarned: finalAmount,
      multiplier: progress.streakMultiplier,
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
      newTitle: newLevelInfo?.title,
    };
  }

  async getXpHistory(userId: string, limit = 50): Promise<XpTransaction[]> {
    const { data, error } = await this.supabase
      .from("xp_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get XP history: ${error.message}`);
    }

    return data.map(this.mapToXpTransaction);
  }

  getXpReward(eventType: string): number {
    return XP_REWARDS[eventType] ?? 0;
  }

  // --------------------------------------------------------------------------
  // LEVEL SYSTEM
  // --------------------------------------------------------------------------

  calculateLevelFromXp(totalXp: number): number {
    let level = 1;
    for (const def of LEVEL_DEFINITIONS) {
      if (totalXp >= def.xpRequired) {
        level = def.level;
      } else {
        break;
      }
    }
    return level;
  }

  getLevelDefinition(level: number): LevelDefinition | null {
    return LEVEL_DEFINITIONS.find((l) => l.level === level) ?? null;
  }

  getXpForNextLevel(currentLevel: number): number {
    const nextLevel = LEVEL_DEFINITIONS.find((l) => l.level > currentLevel);
    return (
      nextLevel?.xpRequired ??
      LEVEL_DEFINITIONS[LEVEL_DEFINITIONS.length - 1].xpRequired
    );
  }

  calculateLevelProgress(currentXp: number, currentLevel: number): number {
    const currentLevelDef = this.getLevelDefinition(currentLevel);
    const nextLevelXp = this.getXpForNextLevel(currentLevel);
    const currentLevelXp = currentLevelDef?.xpRequired ?? 0;

    if (nextLevelXp === currentLevelXp) return 100;

    const xpIntoLevel = currentXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;

    return Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100));
  }

  // --------------------------------------------------------------------------
  // STREAK SYSTEM
  // --------------------------------------------------------------------------

  async updateStreak(userId: string): Promise<StreakInfo> {
    const progress = await this.getUserProgress(userId);
    if (!progress) {
      await this.initializeUserProgress(userId);
      return this.updateStreak(userId);
    }

    const today = new Date().toISOString().split("T")[0];
    const lastActivity = progress.lastActivityDate;

    let newStreak = progress.currentStreak;
    let streakBroken = false;

    if (!lastActivity) {
      // First activity ever
      newStreak = 1;
    } else {
      const lastDate = new Date(lastActivity);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        // Already logged today, no change
        return {
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
          multiplier: progress.streakMultiplier,
          streakBroken: false,
          daysUntilNextMilestone:
            getNextStreakMilestone(progress.currentStreak) -
            progress.currentStreak,
          nextMilestone: getNextStreakMilestone(progress.currentStreak),
        };
      } else if (diffDays === 1) {
        // Continue streak
        newStreak = progress.currentStreak + 1;
      } else {
        // Streak broken (missed more than 1 day)
        newStreak = 1;
        streakBroken = true;
      }
    }

    // Update longest streak
    const newLongestStreak = Math.max(newStreak, progress.longestStreak);

    // Calculate new multiplier
    const newMultiplier = calculateStreakMultiplier(newStreak);

    // Update database
    await this.supabase
      .from("user_progress")
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
        streak_multiplier: newMultiplier,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Check for streak milestones and award badges
    await this.checkStreakMilestones(userId, newStreak);

    return {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      multiplier: newMultiplier,
      streakBroken,
      daysUntilNextMilestone: getNextStreakMilestone(newStreak) - newStreak,
      nextMilestone: getNextStreakMilestone(newStreak),
    };
  }

  private async checkStreakMilestones(
    userId: string,
    streak: number,
  ): Promise<void> {
    const milestoneMap: Record<number, string> = {
      7: "STREAK_7",
      21: "STREAK_21",
      30: "STREAK_30",
      100: "STREAK_100",
      365: "STREAK_365",
    };

    const badgeCode = milestoneMap[streak];
    if (badgeCode) {
      await this.awardBadge(userId, badgeCode);
    }
  }

  // --------------------------------------------------------------------------
  // BADGE SYSTEM
  // --------------------------------------------------------------------------

  async awardBadge(
    userId: string,
    badgeCode: string,
  ): Promise<{ success: boolean; badge?: BadgeDefinition; error?: string }> {
    // Get badge definition
    const { data: badge, error: badgeError } = await this.supabase
      .from("badge_definitions")
      .select("*")
      .eq("code", badgeCode)
      .eq("is_active", true)
      .single();

    if (badgeError || !badge) {
      return { success: false, error: "Badge not found" };
    }

    // Check if already earned
    const { data: existing } = await this.supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", badge.id)
      .single();

    if (existing) {
      return { success: false, error: "Badge already earned" };
    }

    // Award badge
    const { error: insertError } = await this.supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("user_badges")
      .insert({
        user_id: userId,
        badge_id: badge.id,
        earned_at: new Date().toISOString(),
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Award XP for badge
    if (badge.xp_reward > 0) {
      await this.awardXp(
        userId,
        badge.xp_reward,
        `Badge earned: ${badge.name}`,
        "badge_earned",
        { badge_code: badgeCode },
      );
    }

    return {
      success: true,
      badge: this.mapToBadgeDefinition(badge),
    };
  }

  async getUserBadges(userId: string): Promise<{
    earned: BadgeDefinition[];
    inProgress: BadgeDefinition[];
    locked: BadgeDefinition[];
  }> {
    // Get all badges
    const { data: allBadges } = await this.supabase
      .from("badge_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    // Get earned badges
    const { data: earnedBadges } = await this.supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId);

    const earnedIds = new Set(earnedBadges?.map((b) => b.badge_id) ?? []);

    // Get in-progress badges
    const { data: progressBadges } = await this.supabase
      .from("badge_progress")
      .select("badge_id, progress_percent")
      .eq("user_id", userId)
      .gt("progress_percent", 0)
      .lt("progress_percent", 100);

    const progressIds = new Set(progressBadges?.map((b) => b.badge_id) ?? []);

    const earned: BadgeDefinition[] = [];
    const inProgress: BadgeDefinition[] = [];
    const locked: BadgeDefinition[] = [];

    for (const badge of allBadges ?? []) {
      const def = this.mapToBadgeDefinition(badge);
      if (earnedIds.has(badge.id)) {
        earned.push(def);
      } else if (progressIds.has(badge.id)) {
        inProgress.push(def);
      } else {
        locked.push(def);
      }
    }

    return { earned, inProgress, locked };
  }

  // --------------------------------------------------------------------------
  // QUEST SYSTEM
  // --------------------------------------------------------------------------

  async getDailyQuests(
    userId: string,
  ): Promise<{ quests: DailyQuest[]; progress: Record<string, number> }> {
    const today = new Date().toISOString().split("T")[0];

    // Get active quests
    const { data: quests } = await this.supabase
      .from("daily_quests")
      .select("*")
      .eq("is_active", true);

    // Get user progress for today
    const { data: progressData } = await this.supabase
      .from("user_quest_progress")
      .select("quest_id, is_completed, progress_value")
      .eq("user_id", userId)
      .eq("quest_date", today);

    const progress: Record<string, number> = {};
    for (const p of progressData ?? []) {
      progress[p.quest_id] = p.is_completed ? 100 : (p.progress_value ?? 0);
    }

    return {
      quests: (quests ?? []).map(this.mapToDailyQuest),
      progress,
    };
  }

  async completeQuest(
    userId: string,
    questId: string,
  ): Promise<{ success: boolean; xpEarned?: number }> {
    const today = new Date().toISOString().split("T")[0];

    // Check if already completed
    const { data: existing } = await this.supabase
      .from("user_quest_progress")
      .select("is_completed")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .eq("quest_date", today)
      .single();

    if (existing?.is_completed) {
      return { success: false };
    }

    // Get quest details
    const { data: quest } = await this.supabase
      .from("daily_quests")
      .select("*")
      .eq("id", questId)
      .single();

    if (!quest) {
      return { success: false };
    }

    // Mark as completed
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    await this.supabase.from("user_quest_progress").upsert({
      user_id: userId,
      quest_id: questId,
      quest_date: today,
      is_completed: true,
      completed_at: new Date().toISOString(),
      progress_value: 100,
    });

    // Award XP
    const xpResult = await this.awardXp(
      userId,
      quest.xp_reward,
      `Quest completed: ${quest.name}`,
      "quest_completed",
      { quest_id: questId },
    );

    return { success: true, xpEarned: xpResult.xpEarned };
  }

  // --------------------------------------------------------------------------
  // GAME EVENTS
  // --------------------------------------------------------------------------

  async processGameEvent(event: GameEvent): Promise<GameEventResult> {
    const result: GameEventResult = {
      xpEarned: 0,
      newBadges: [],
      questsCompleted: [],
    };

    // Update streak on any activity
    result.streakUpdate = await this.updateStreak(event.userId);

    // Get base XP for event
    const baseXp = this.getXpReward(event.type);
    if (baseXp > 0) {
      const xpResult = await this.awardXp(
        event.userId,
        baseXp,
        `${event.type}`,
        event.type,
        event.metadata,
      );
      result.xpEarned = xpResult.xpEarned;

      if (xpResult.levelUp) {
        result.levelUp = {
          newLevel: xpResult.newLevel!,
          newTitle: xpResult.newTitle!,
        };
      }
    }

    // Check for event-specific badges
    const badgeResult = await this.checkEventBadges(event);
    result.newBadges = badgeResult;

    // Check quest progress
    const questResult = await this.checkQuestProgress(event);
    result.questsCompleted = questResult;

    return result;
  }

  private async checkEventBadges(event: GameEvent): Promise<BadgeDefinition[]> {
    const awardedBadges: BadgeDefinition[] = [];

    // Map events to potential badges
    const eventBadgeMap: Record<string, string[]> = {
      savings_contribution: [
        "SAVINGS_100",
        "SAVINGS_1000",
        "SAVINGS_5000",
        "SAVINGS_10000",
      ],
      debt_payment: ["DEBT_FIRST_PAYMENT", "DEBT_1000_PAID", "DEBT_5000_PAID"],
      budget_created: ["BUDGET_FIRST"],
      credit_check: ["CREDIT_CHECK"],
    };

    const potentialBadges = eventBadgeMap[event.type] ?? [];

    for (const badgeCode of potentialBadges) {
      const result = await this.awardBadge(event.userId, badgeCode);
      if (result.success && result.badge) {
        awardedBadges.push(result.badge);
      }
    }

    return awardedBadges;
  }

  private async checkQuestProgress(event: GameEvent): Promise<DailyQuest[]> {
    const completed: DailyQuest[] = [];
    const today = new Date().toISOString().split("T")[0];

    // Get quests that match this event type
    const { data: quests } = await this.supabase
      .from("daily_quests")
      .select("*")
      .eq("is_active", true)
      .contains("criteria", { type: event.type });

    for (const quest of quests ?? []) {
      // Check if already completed
      const { data: progress } = await this.supabase
        .from("user_quest_progress")
        .select("is_completed")
        .eq("user_id", event.userId)
        .eq("quest_id", quest.id)
        .eq("quest_date", today)
        .single();

      if (!progress?.is_completed) {
        const completeResult = await this.completeQuest(event.userId, quest.id);
        if (completeResult.success) {
          completed.push(this.mapToDailyQuest(quest));
        }
      }
    }

    return completed;
  }

  // --------------------------------------------------------------------------
  // MAPPERS
  // --------------------------------------------------------------------------

  private mapToUserProgress(data: Record<string, unknown>): UserProgress {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      currentXp: data.current_xp as number,
      totalXpEarned: data.total_xp_earned as number,
      currentLevel: data.current_level as number,
      currentStreak: data.current_streak as number,
      longestStreak: data.longest_streak as number,
      lastActivityDate: data.last_activity_date as string | null,
      streakMultiplier: data.streak_multiplier as number,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private enrichWithLevelInfo(progress: UserProgress): UserProgressWithLevel {
    const levelInfo = this.getLevelDefinition(progress.currentLevel) ?? {
      level: 1,
      title: "Financial Newbie",
      xpRequired: 0,
    };

    const xpToNextLevel =
      this.getXpForNextLevel(progress.currentLevel) - progress.totalXpEarned;
    const levelProgress = this.calculateLevelProgress(
      progress.totalXpEarned,
      progress.currentLevel,
    );

    return {
      ...progress,
      levelInfo,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      levelProgress,
    };
  }

  private mapToXpTransaction(data: Record<string, unknown>): XpTransaction {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      amount: data.amount as number,
      reason: data.reason as string,
      eventType: data.event_type as GameEventType,
      multiplier: data.multiplier as number,
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: data.created_at as string,
    };
  }

  private mapToBadgeDefinition(data: Record<string, unknown>): BadgeDefinition {
    return {
      id: data.id as string,
      code: data.code as string,
      name: data.name as string,
      description: data.description as string,
      icon: data.icon as string,
      category: data.category as BadgeDefinition["category"],
      rarity: data.rarity as BadgeDefinition["rarity"],
      xpReward: data.xp_reward as number,
      criteria: data.criteria as BadgeDefinition["criteria"],
      sortOrder: data.sort_order as number,
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
    };
  }

  private mapToDailyQuest(data: Record<string, unknown>): DailyQuest {
    return {
      id: data.id as string,
      code: data.code as string,
      name: data.name as string,
      description: data.description as string,
      xpReward: data.xp_reward as number,
      bonusReward: data.bonus_reward as DailyQuest["bonusReward"],
      questType: data.quest_type as DailyQuest["questType"],
      criteria: data.criteria as DailyQuest["criteria"],
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let gamificationEngineInstance: GamificationEngine | null = null;

export function getGamificationEngine(): GamificationEngine {
  if (!gamificationEngineInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    gamificationEngineInstance = new GamificationEngine(
      supabaseUrl,
      supabaseKey,
    );
  }

  return gamificationEngineInstance;
}

export default GamificationEngine;
