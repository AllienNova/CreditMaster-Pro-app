/**
 * Achievement Service
 *
 * Manages achievement definitions, condition checking, progress tracking,
 * and badge awarding for the Fynvita gamification system.
 *
 * Achievement categories: Financial, Usage, Learning
 * Badge tiers: Bronze, Silver, Gold, Platinum
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type AchievementCategory = "financial" | "usage" | "learning";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type AchievementStatus = "locked" | "in_progress" | "completed";

export type ConditionOperator = "gte" | "lte" | "eq" | "gt" | "lt";

export interface AchievementCondition {
  metric: string;
  operator: ConditionOperator;
  targetValue: number;
  description: string;
}

export interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: BadgeTier;
  xpReward: number;
  conditions: AchievementCondition[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  status: AchievementStatus;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  completedAt: string | null;
  notificationSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievementWithDefinition extends UserAchievement {
  achievement: AchievementDefinition;
}

export interface AchievementCheckResult {
  achievementId: string;
  achievementCode: string;
  met: boolean;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
}

export interface AchievementAwardResult {
  success: boolean;
  achievement?: AchievementDefinition;
  xpEarned?: number;
  error?: string;
  alreadyEarned?: boolean;
}

export interface AchievementProgressUpdate {
  achievementId: string;
  previousProgress: number;
  newProgress: number;
  completed: boolean;
}

export interface AchievementStats {
  totalAchievements: number;
  completedCount: number;
  inProgressCount: number;
  lockedCount: number;
  completionPercent: number;
  totalXpEarned: number;
  byCategory: Record<AchievementCategory, CategoryStats>;
  byTier: Record<BadgeTier, TierStats>;
  recentCompletions: UserAchievementWithDefinition[];
}

export interface CategoryStats {
  total: number;
  completed: number;
  inProgress: number;
  completionPercent: number;
}

export interface TierStats {
  total: number;
  completed: number;
  completionPercent: number;
}

export interface AchievementNotification {
  userId: string;
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  tier: BadgeTier;
  category: AchievementCategory;
  xpEarned: number;
  message: string;
  createdAt: string;
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const TIER_CONFIG: Record<
  BadgeTier,
  { label: string; color: string; xpMultiplier: number; order: number }
> = {
  bronze: {
    label: "Bronze",
    color: "#CD7F32",
    xpMultiplier: 1.0,
    order: 1,
  },
  silver: {
    label: "Silver",
    color: "#C0C0C0",
    xpMultiplier: 1.5,
    order: 2,
  },
  gold: {
    label: "Gold",
    color: "#FFD700",
    xpMultiplier: 2.5,
    order: 3,
  },
  platinum: {
    label: "Platinum",
    color: "#E5E4E2",
    xpMultiplier: 4.0,
    order: 4,
  },
};

export const CATEGORY_CONFIG: Record<
  AchievementCategory,
  { label: string; description: string; icon: string }
> = {
  financial: {
    label: "Financial",
    description: "Achievements for financial milestones like saving, debt payoff, and investing",
    icon: "dollar-sign",
  },
  usage: {
    label: "Usage",
    description: "Achievements for app engagement, streaks, and feature exploration",
    icon: "activity",
  },
  learning: {
    label: "Learning",
    description: "Achievements for completing lessons, quizzes, and educational content",
    icon: "book-open",
  },
};

// ============================================================================
// BUILT-IN ACHIEVEMENT DEFINITIONS
// ============================================================================

export const BUILT_IN_ACHIEVEMENTS: Omit<
  AchievementDefinition,
  "id" | "createdAt"
>[] = [
  // ---- FINANCIAL: SAVINGS ----
  {
    code: "SAVINGS_FIRST_100",
    name: "First $100 Saved",
    description: "Save your first $100",
    icon: "piggy-bank",
    category: "financial",
    tier: "bronze",
    xpReward: 50,
    conditions: [
      {
        metric: "total_savings",
        operator: "gte",
        targetValue: 100,
        description: "Total savings >= $100",
      },
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    code: "SAVINGS_1000",
    name: "Savings Milestone",
    description: "Save $1,000 across all accounts",
    icon: "trending-up",
    category: "financial",
    tier: "silver",
    xpReward: 150,
    conditions: [
      {
        metric: "total_savings",
        operator: "gte",
        targetValue: 1000,
        description: "Total savings >= $1,000",
      },
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    code: "SAVINGS_10000",
    name: "Five-Figure Saver",
    description: "Reach $10,000 in total savings",
    icon: "award",
    category: "financial",
    tier: "gold",
    xpReward: 500,
    conditions: [
      {
        metric: "total_savings",
        operator: "gte",
        targetValue: 10000,
        description: "Total savings >= $10,000",
      },
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    code: "SAVINGS_100000",
    name: "Savings Legend",
    description: "Reach $100,000 in total savings",
    icon: "star",
    category: "financial",
    tier: "platinum",
    xpReward: 2000,
    conditions: [
      {
        metric: "total_savings",
        operator: "gte",
        targetValue: 100000,
        description: "Total savings >= $100,000",
      },
    ],
    isActive: true,
    sortOrder: 4,
  },

  // ---- FINANCIAL: DEBT ----
  {
    code: "DEBT_FIRST_PAYMENT",
    name: "Debt Fighter",
    description: "Make your first extra debt payment",
    icon: "shield",
    category: "financial",
    tier: "bronze",
    xpReward: 50,
    conditions: [
      {
        metric: "debt_payments_count",
        operator: "gte",
        targetValue: 1,
        description: "At least 1 extra debt payment",
      },
    ],
    isActive: true,
    sortOrder: 5,
  },
  {
    code: "DEBT_1000_PAID",
    name: "Debt Crusher",
    description: "Pay off $1,000 in debt",
    icon: "zap",
    category: "financial",
    tier: "silver",
    xpReward: 200,
    conditions: [
      {
        metric: "total_debt_paid",
        operator: "gte",
        targetValue: 1000,
        description: "Total debt paid >= $1,000",
      },
    ],
    isActive: true,
    sortOrder: 6,
  },
  {
    code: "DEBT_FREE",
    name: "Debt Free",
    description: "Pay off all your debt completely",
    icon: "trophy",
    category: "financial",
    tier: "platinum",
    xpReward: 2000,
    conditions: [
      {
        metric: "total_remaining_debt",
        operator: "eq",
        targetValue: 0,
        description: "All debt paid off",
      },
    ],
    isActive: true,
    sortOrder: 7,
  },

  // ---- FINANCIAL: BUDGETS ----
  {
    code: "BUDGET_FIRST",
    name: "Budget Beginner",
    description: "Create your first budget",
    icon: "clipboard",
    category: "financial",
    tier: "bronze",
    xpReward: 25,
    conditions: [
      {
        metric: "budgets_created",
        operator: "gte",
        targetValue: 1,
        description: "At least 1 budget created",
      },
    ],
    isActive: true,
    sortOrder: 8,
  },
  {
    code: "BUDGET_UNDER_3_MONTHS",
    name: "Budget Master",
    description: "Stay under budget for 3 consecutive months",
    icon: "check-circle",
    category: "financial",
    tier: "gold",
    xpReward: 500,
    conditions: [
      {
        metric: "consecutive_months_under_budget",
        operator: "gte",
        targetValue: 3,
        description: "3+ months under budget",
      },
    ],
    isActive: true,
    sortOrder: 9,
  },

  // ---- FINANCIAL: INVESTING ----
  {
    code: "INVESTOR_FIRST",
    name: "First Investment",
    description: "Make your first investment",
    icon: "bar-chart-2",
    category: "financial",
    tier: "bronze",
    xpReward: 50,
    conditions: [
      {
        metric: "investments_count",
        operator: "gte",
        targetValue: 1,
        description: "At least 1 investment",
      },
    ],
    isActive: true,
    sortOrder: 10,
  },
  {
    code: "PORTFOLIO_10K",
    name: "Growing Portfolio",
    description: "Reach $10,000 in investment portfolio value",
    icon: "trending-up",
    category: "financial",
    tier: "gold",
    xpReward: 500,
    conditions: [
      {
        metric: "portfolio_value",
        operator: "gte",
        targetValue: 10000,
        description: "Portfolio value >= $10,000",
      },
    ],
    isActive: true,
    sortOrder: 11,
  },

  // ---- USAGE: STREAKS ----
  {
    code: "STREAK_7",
    name: "One Week Streak",
    description: "Log in for 7 consecutive days",
    icon: "flame",
    category: "usage",
    tier: "bronze",
    xpReward: 100,
    conditions: [
      {
        metric: "current_streak",
        operator: "gte",
        targetValue: 7,
        description: "7-day login streak",
      },
    ],
    isActive: true,
    sortOrder: 12,
  },
  {
    code: "STREAK_30",
    name: "Month-Long Streak",
    description: "Log in for 30 consecutive days",
    icon: "flame",
    category: "usage",
    tier: "silver",
    xpReward: 500,
    conditions: [
      {
        metric: "current_streak",
        operator: "gte",
        targetValue: 30,
        description: "30-day login streak",
      },
    ],
    isActive: true,
    sortOrder: 13,
  },
  {
    code: "STREAK_100",
    name: "Century Streak",
    description: "Log in for 100 consecutive days",
    icon: "flame",
    category: "usage",
    tier: "gold",
    xpReward: 1500,
    conditions: [
      {
        metric: "current_streak",
        operator: "gte",
        targetValue: 100,
        description: "100-day login streak",
      },
    ],
    isActive: true,
    sortOrder: 14,
  },
  {
    code: "STREAK_365",
    name: "Year-Round Champion",
    description: "Log in for 365 consecutive days",
    icon: "flame",
    category: "usage",
    tier: "platinum",
    xpReward: 5000,
    conditions: [
      {
        metric: "current_streak",
        operator: "gte",
        targetValue: 365,
        description: "365-day login streak",
      },
    ],
    isActive: true,
    sortOrder: 15,
  },

  // ---- USAGE: FEATURES ----
  {
    code: "FEATURES_EXPLORER",
    name: "Feature Explorer",
    description: "Use 5 different features of the app",
    icon: "compass",
    category: "usage",
    tier: "bronze",
    xpReward: 50,
    conditions: [
      {
        metric: "features_used",
        operator: "gte",
        targetValue: 5,
        description: "5+ features used",
      },
    ],
    isActive: true,
    sortOrder: 16,
  },
  {
    code: "FEATURES_POWER_USER",
    name: "Power User",
    description: "Use 15 different features of the app",
    icon: "zap",
    category: "usage",
    tier: "silver",
    xpReward: 200,
    conditions: [
      {
        metric: "features_used",
        operator: "gte",
        targetValue: 15,
        description: "15+ features used",
      },
    ],
    isActive: true,
    sortOrder: 17,
  },
  {
    code: "TRANSACTIONS_100",
    name: "Transaction Tracker",
    description: "Log 100 transactions",
    icon: "list",
    category: "usage",
    tier: "bronze",
    xpReward: 75,
    conditions: [
      {
        metric: "transactions_logged",
        operator: "gte",
        targetValue: 100,
        description: "100+ transactions logged",
      },
    ],
    isActive: true,
    sortOrder: 18,
  },
  {
    code: "TRANSACTIONS_1000",
    name: "Data Master",
    description: "Log 1,000 transactions",
    icon: "database",
    category: "usage",
    tier: "gold",
    xpReward: 500,
    conditions: [
      {
        metric: "transactions_logged",
        operator: "gte",
        targetValue: 1000,
        description: "1,000+ transactions logged",
      },
    ],
    isActive: true,
    sortOrder: 19,
  },
  {
    code: "QUESTS_10",
    name: "Quest Enthusiast",
    description: "Complete 10 daily quests",
    icon: "target",
    category: "usage",
    tier: "bronze",
    xpReward: 75,
    conditions: [
      {
        metric: "quests_completed",
        operator: "gte",
        targetValue: 10,
        description: "10+ quests completed",
      },
    ],
    isActive: true,
    sortOrder: 20,
  },
  {
    code: "QUESTS_50",
    name: "Quest Champion",
    description: "Complete 50 daily quests",
    icon: "target",
    category: "usage",
    tier: "silver",
    xpReward: 300,
    conditions: [
      {
        metric: "quests_completed",
        operator: "gte",
        targetValue: 50,
        description: "50+ quests completed",
      },
    ],
    isActive: true,
    sortOrder: 21,
  },

  // ---- LEARNING ----
  {
    code: "ARTICLE_FIRST",
    name: "Curious Learner",
    description: "Read your first educational article",
    icon: "book-open",
    category: "learning",
    tier: "bronze",
    xpReward: 15,
    conditions: [
      {
        metric: "articles_read",
        operator: "gte",
        targetValue: 1,
        description: "1+ article read",
      },
    ],
    isActive: true,
    sortOrder: 22,
  },
  {
    code: "ARTICLES_10",
    name: "Knowledge Seeker",
    description: "Read 10 educational articles",
    icon: "book",
    category: "learning",
    tier: "silver",
    xpReward: 150,
    conditions: [
      {
        metric: "articles_read",
        operator: "gte",
        targetValue: 10,
        description: "10+ articles read",
      },
    ],
    isActive: true,
    sortOrder: 23,
  },
  {
    code: "ARTICLES_50",
    name: "Finance Scholar",
    description: "Read 50 educational articles",
    icon: "award",
    category: "learning",
    tier: "gold",
    xpReward: 500,
    conditions: [
      {
        metric: "articles_read",
        operator: "gte",
        targetValue: 50,
        description: "50+ articles read",
      },
    ],
    isActive: true,
    sortOrder: 24,
  },
  {
    code: "COURSE_FIRST",
    name: "Course Graduate",
    description: "Complete your first financial course",
    icon: "graduation-cap",
    category: "learning",
    tier: "bronze",
    xpReward: 100,
    conditions: [
      {
        metric: "courses_completed",
        operator: "gte",
        targetValue: 1,
        description: "1+ course completed",
      },
    ],
    isActive: true,
    sortOrder: 25,
  },
  {
    code: "COURSES_5",
    name: "Financial Expert",
    description: "Complete 5 financial courses",
    icon: "graduation-cap",
    category: "learning",
    tier: "gold",
    xpReward: 750,
    conditions: [
      {
        metric: "courses_completed",
        operator: "gte",
        targetValue: 5,
        description: "5+ courses completed",
      },
    ],
    isActive: true,
    sortOrder: 26,
  },
  {
    code: "QUIZ_PERFECT",
    name: "Perfect Score",
    description: "Get a perfect score on any quiz",
    icon: "check-circle",
    category: "learning",
    tier: "silver",
    xpReward: 200,
    conditions: [
      {
        metric: "perfect_quiz_scores",
        operator: "gte",
        targetValue: 1,
        description: "1+ perfect quiz score",
      },
    ],
    isActive: true,
    sortOrder: 27,
  },
  {
    code: "QUIZ_MASTER",
    name: "Quiz Master",
    description: "Get perfect scores on 10 quizzes",
    icon: "star",
    category: "learning",
    tier: "platinum",
    xpReward: 1500,
    conditions: [
      {
        metric: "perfect_quiz_scores",
        operator: "gte",
        targetValue: 10,
        description: "10+ perfect quiz scores",
      },
    ],
    isActive: true,
    sortOrder: 28,
  },
  {
    code: "VIDEOS_10",
    name: "Video Learner",
    description: "Watch 10 educational videos",
    icon: "video",
    category: "learning",
    tier: "silver",
    xpReward: 150,
    conditions: [
      {
        metric: "videos_watched",
        operator: "gte",
        targetValue: 10,
        description: "10+ videos watched",
      },
    ],
    isActive: true,
    sortOrder: 29,
  },

  // ---- FINANCIAL: CREDIT ----
  {
    code: "CREDIT_CHECK_FIRST",
    name: "Credit Aware",
    description: "Check your credit score for the first time",
    icon: "search",
    category: "financial",
    tier: "bronze",
    xpReward: 25,
    conditions: [
      {
        metric: "credit_checks",
        operator: "gte",
        targetValue: 1,
        description: "1+ credit check",
      },
    ],
    isActive: true,
    sortOrder: 30,
  },
  {
    code: "CREDIT_SCORE_700",
    name: "Good Credit",
    description: "Reach a credit score of 700+",
    icon: "trending-up",
    category: "financial",
    tier: "silver",
    xpReward: 300,
    conditions: [
      {
        metric: "credit_score",
        operator: "gte",
        targetValue: 700,
        description: "Credit score >= 700",
      },
    ],
    isActive: true,
    sortOrder: 31,
  },
  {
    code: "CREDIT_SCORE_800",
    name: "Excellent Credit",
    description: "Reach a credit score of 800+",
    icon: "star",
    category: "financial",
    tier: "platinum",
    xpReward: 1000,
    conditions: [
      {
        metric: "credit_score",
        operator: "gte",
        targetValue: 800,
        description: "Credit score >= 800",
      },
    ],
    isActive: true,
    sortOrder: 32,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class AchievementService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // ACHIEVEMENT DEFINITIONS
  // ==========================================================================

  async getAchievements(
    category?: AchievementCategory,
    tier?: BadgeTier,
  ): Promise<AchievementDefinition[]> {
    let query = this.supabase
      .from("achievement_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }
    if (tier) {
      query = query.eq("tier", tier);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch achievements: ${error.message}`);

    return (data ?? []).map(this.mapToAchievementDefinition);
  }

  async getAchievementByCode(
    code: string,
  ): Promise<AchievementDefinition | null> {
    const { data, error } = await this.supabase
      .from("achievement_definitions")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    return this.mapToAchievementDefinition(data);
  }

  async getAchievementById(
    id: string,
  ): Promise<AchievementDefinition | null> {
    const { data, error } = await this.supabase
      .from("achievement_definitions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.mapToAchievementDefinition(data);
  }

  // ==========================================================================
  // USER ACHIEVEMENTS
  // ==========================================================================

  async getUserAchievements(
    userId: string,
    category?: AchievementCategory,
    status?: AchievementStatus,
  ): Promise<UserAchievementWithDefinition[]> {
    // Get all active achievement definitions
    let achievementQuery = this.supabase
      .from("achievement_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (category) {
      achievementQuery = achievementQuery.eq("category", category);
    }

    const { data: definitions, error: defError } = await achievementQuery;
    if (defError) throw new Error(`Failed to fetch definitions: ${defError.message}`);

    // Get user achievement progress
    const { data: userAchievements, error: uaError } = await this.supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId);

    if (uaError) throw new Error(`Failed to fetch user achievements: ${uaError.message}`);

    const progressMap = new Map<string, Record<string, unknown>>();
    for (const ua of userAchievements ?? []) {
      progressMap.set(ua.achievement_id as string, ua);
    }

    const results: UserAchievementWithDefinition[] = [];

    for (const def of definitions ?? []) {
      const achievementDef = this.mapToAchievementDefinition(def);
      const existing = progressMap.get(def.id as string);

      let userAchievement: UserAchievement;

      if (existing) {
        userAchievement = this.mapToUserAchievement(existing);
      } else {
        // Build a default locked entry
        userAchievement = {
          id: "",
          userId,
          achievementId: def.id as string,
          status: "locked",
          currentProgress: 0,
          targetProgress: this.getTargetFromConditions(achievementDef.conditions),
          progressPercent: 0,
          completedAt: null,
          notificationSent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      if (status && userAchievement.status !== status) continue;

      results.push({
        ...userAchievement,
        achievement: achievementDef,
      });
    }

    return results;
  }

  async getUserAchievementByCode(
    userId: string,
    achievementCode: string,
  ): Promise<UserAchievementWithDefinition | null> {
    const def = await this.getAchievementByCode(achievementCode);
    if (!def) return null;

    const { data } = await this.supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId)
      .eq("achievement_id", def.id)
      .single();

    const userAchievement: UserAchievement = data
      ? this.mapToUserAchievement(data)
      : {
          id: "",
          userId,
          achievementId: def.id,
          status: "locked",
          currentProgress: 0,
          targetProgress: this.getTargetFromConditions(def.conditions),
          progressPercent: 0,
          completedAt: null,
          notificationSent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    return { ...userAchievement, achievement: def };
  }

  // ==========================================================================
  // CONDITION CHECKING
  // ==========================================================================

  evaluateCondition(
    condition: AchievementCondition,
    currentValue: number,
  ): boolean {
    switch (condition.operator) {
      case "gte":
        return currentValue >= condition.targetValue;
      case "lte":
        return currentValue <= condition.targetValue;
      case "eq":
        return currentValue === condition.targetValue;
      case "gt":
        return currentValue > condition.targetValue;
      case "lt":
        return currentValue < condition.targetValue;
      default:
        return false;
    }
  }

  checkConditions(
    conditions: AchievementCondition[],
    metrics: Record<string, number>,
  ): AchievementCheckResult[] {
    return conditions.map((condition) => {
      const currentValue = metrics[condition.metric] ?? 0;
      const met = this.evaluateCondition(condition, currentValue);
      const progressPercent =
        condition.targetValue > 0
          ? Math.min(100, Math.floor((currentValue / condition.targetValue) * 100))
          : met
            ? 100
            : 0;

      return {
        achievementId: "",
        achievementCode: "",
        met,
        currentValue,
        targetValue: condition.targetValue,
        progressPercent,
      };
    });
  }

  async checkAchievements(
    userId: string,
    metrics: Record<string, number>,
  ): Promise<AchievementCheckResult[]> {
    const achievements = await this.getAchievements();
    const results: AchievementCheckResult[] = [];

    for (const achievement of achievements) {
      const conditionResults = this.checkConditions(
        achievement.conditions,
        metrics,
      );

      // All conditions must be met for achievement to be complete
      const allMet = conditionResults.every((r) => r.met);

      // Calculate overall progress as the minimum of all conditions
      const overallProgress = conditionResults.length > 0
        ? Math.min(...conditionResults.map((r) => r.progressPercent))
        : 0;

      // Use the first condition's target as the primary target
      const primaryCondition = achievement.conditions[0];

      results.push({
        achievementId: achievement.id,
        achievementCode: achievement.code,
        met: allMet,
        currentValue: metrics[primaryCondition?.metric ?? ""] ?? 0,
        targetValue: primaryCondition?.targetValue ?? 0,
        progressPercent: overallProgress,
      });
    }

    return results;
  }

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  async updateProgress(
    userId: string,
    achievementId: string,
    currentProgress: number,
  ): Promise<AchievementProgressUpdate> {
    const achievement = await this.getAchievementById(achievementId);
    if (!achievement) {
      throw new Error("Achievement not found");
    }

    const targetProgress = this.getTargetFromConditions(achievement.conditions);
    const progressPercent =
      targetProgress > 0
        ? Math.min(100, Math.floor((currentProgress / targetProgress) * 100))
        : 0;
    const completed = progressPercent >= 100;

    // Get existing progress
    const { data: existing } = await this.supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId)
      .eq("achievement_id", achievementId)
      .single();

    const previousProgress = existing
      ? (existing.current_progress as number)
      : 0;

    // Determine new status
    const newStatus: AchievementStatus = completed
      ? "completed"
      : currentProgress > 0
        ? "in_progress"
        : "locked";

    if (existing) {
      // Do not downgrade a completed achievement
      if (existing.status === "completed") {
        return {
          achievementId,
          previousProgress,
          newProgress: previousProgress,
          completed: true,
        };
      }

      await this.supabase
        .from("user_achievements")
        .update({
          current_progress: currentProgress,
          target_progress: targetProgress,
          progress_percent: progressPercent,
          status: newStatus,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("achievement_id", achievementId);
    } else {
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      await this.supabase.from("user_achievements").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        achievement_id: achievementId,
        status: newStatus,
        current_progress: currentProgress,
        target_progress: targetProgress,
        progress_percent: progressPercent,
        completed_at: completed ? new Date().toISOString() : null,
        notification_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return {
      achievementId,
      previousProgress,
      newProgress: currentProgress,
      completed,
    };
  }

  async updateProgressByCode(
    userId: string,
    achievementCode: string,
    currentProgress: number,
  ): Promise<AchievementProgressUpdate> {
    const achievement = await this.getAchievementByCode(achievementCode);
    if (!achievement) {
      throw new Error(`Achievement not found: ${achievementCode}`);
    }
    return this.updateProgress(userId, achievement.id, currentProgress);
  }

  async batchUpdateProgress(
    userId: string,
    metrics: Record<string, number>,
  ): Promise<AchievementProgressUpdate[]> {
    const achievements = await this.getAchievements();
    const updates: AchievementProgressUpdate[] = [];

    for (const achievement of achievements) {
      // Calculate progress based on the primary condition
      const primaryCondition = achievement.conditions[0];
      if (!primaryCondition) continue;

      const currentValue = metrics[primaryCondition.metric];
      if (currentValue === undefined) continue;

      const update = await this.updateProgress(
        userId,
        achievement.id,
        currentValue,
      );
      updates.push(update);
    }

    return updates;
  }

  // ==========================================================================
  // AWARDING
  // ==========================================================================

  async awardAchievement(
    userId: string,
    achievementCode: string,
  ): Promise<AchievementAwardResult> {
    const achievement = await this.getAchievementByCode(achievementCode);
    if (!achievement) {
      return { success: false, error: "Achievement not found" };
    }

    // Check if already completed
    const { data: existing } = await this.supabase
      .from("user_achievements")
      .select("status")
      .eq("user_id", userId)
      .eq("achievement_id", achievement.id)
      .single();

    if (existing?.status === "completed") {
      return { success: false, error: "Achievement already earned", alreadyEarned: true };
    }

    // Apply tier XP multiplier
    const tierMultiplier = TIER_CONFIG[achievement.tier].xpMultiplier;
    const xpEarned = Math.floor(achievement.xpReward * tierMultiplier);

    // Mark achievement as completed
    const now = new Date().toISOString();
    const targetProgress = this.getTargetFromConditions(achievement.conditions);

    if (existing) {
      await this.supabase
        .from("user_achievements")
        .update({
          status: "completed",
          current_progress: targetProgress,
          target_progress: targetProgress,
          progress_percent: 100,
          completed_at: now,
          updated_at: now,
        })
        .eq("user_id", userId)
        .eq("achievement_id", achievement.id);
    } else {
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      await this.supabase.from("user_achievements").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        achievement_id: achievement.id,
        status: "completed",
        current_progress: targetProgress,
        target_progress: targetProgress,
        progress_percent: 100,
        completed_at: now,
        notification_sent: false,
        created_at: now,
        updated_at: now,
      });
    }

    // Record XP award
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    await this.supabase.from("xp_transactions").insert({
      user_id: userId,
      amount: xpEarned,
      reason: `Achievement earned: ${achievement.name}`,
      event_type: "badge_earned",
      multiplier: tierMultiplier,
      metadata: {
        achievement_code: achievementCode,
        tier: achievement.tier,
      },
    });

    return {
      success: true,
      achievement,
      xpEarned,
    };
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  async createNotification(
    userId: string,
    achievement: AchievementDefinition,
    xpEarned: number,
  ): Promise<AchievementNotification> {
    const notification: AchievementNotification = {
      userId,
      achievementId: achievement.id,
      achievementName: achievement.name,
      achievementIcon: achievement.icon,
      tier: achievement.tier,
      category: achievement.category,
      xpEarned,
      message: `You earned the "${achievement.name}" achievement! +${xpEarned} XP`,
      createdAt: new Date().toISOString(),
    };

    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    await this.supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      type: "achievement_earned",
      title: `Achievement Unlocked: ${achievement.name}`,
      message: notification.message,
      data: {
        achievement_id: achievement.id,
        achievement_code: achievement.code,
        tier: achievement.tier,
        category: achievement.category,
        xp_earned: xpEarned,
        icon: achievement.icon,
      },
      is_read: false,
      created_at: notification.createdAt,
    });

    // Mark notification as sent
    await this.supabase
      .from("user_achievements")
      .update({ notification_sent: true })
      .eq("user_id", userId)
      .eq("achievement_id", achievement.id);

    return notification;
  }

  async getPendingNotifications(
    userId: string,
  ): Promise<UserAchievementWithDefinition[]> {
    const { data, error } = await this.supabase
      .from("user_achievements")
      .select("*, achievement_definitions(*)")
      .eq("user_id", userId)
      .eq("status", "completed")
      .eq("notification_sent", false);

    if (error) throw new Error(`Failed to fetch pending notifications: ${error.message}`);

    return (data ?? []).map((row) => {
      const achievementData = row.achievement_definitions as Record<string, unknown>;
      return {
        ...this.mapToUserAchievement(row),
        achievement: this.mapToAchievementDefinition(achievementData),
      };
    });
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  async getStats(userId: string): Promise<AchievementStats> {
    const allAchievements = await this.getUserAchievements(userId);

    const completed = allAchievements.filter((a) => a.status === "completed");
    const inProgress = allAchievements.filter((a) => a.status === "in_progress");
    const locked = allAchievements.filter((a) => a.status === "locked");

    const totalXpEarned = completed.reduce((sum, a) => {
      const tierMultiplier = TIER_CONFIG[a.achievement.tier].xpMultiplier;
      return sum + Math.floor(a.achievement.xpReward * tierMultiplier);
    }, 0);

    const byCategory: Record<AchievementCategory, CategoryStats> = {
      financial: { total: 0, completed: 0, inProgress: 0, completionPercent: 0 },
      usage: { total: 0, completed: 0, inProgress: 0, completionPercent: 0 },
      learning: { total: 0, completed: 0, inProgress: 0, completionPercent: 0 },
    };

    const byTier: Record<BadgeTier, TierStats> = {
      bronze: { total: 0, completed: 0, completionPercent: 0 },
      silver: { total: 0, completed: 0, completionPercent: 0 },
      gold: { total: 0, completed: 0, completionPercent: 0 },
      platinum: { total: 0, completed: 0, completionPercent: 0 },
    };

    for (const a of allAchievements) {
      const cat = a.achievement.category;
      const tier = a.achievement.tier;

      byCategory[cat].total++;
      byTier[tier].total++;

      if (a.status === "completed") {
        byCategory[cat].completed++;
        byTier[tier].completed++;
      } else if (a.status === "in_progress") {
        byCategory[cat].inProgress++;
      }
    }

    // Calculate percentages
    for (const cat of Object.keys(byCategory) as AchievementCategory[]) {
      byCategory[cat].completionPercent =
        byCategory[cat].total > 0
          ? Math.floor(
              (byCategory[cat].completed / byCategory[cat].total) * 100,
            )
          : 0;
    }

    for (const tier of Object.keys(byTier) as BadgeTier[]) {
      byTier[tier].completionPercent =
        byTier[tier].total > 0
          ? Math.floor((byTier[tier].completed / byTier[tier].total) * 100)
          : 0;
    }

    // Get recent completions (last 10)
    const recentCompletions = completed
      .filter((a) => a.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime(),
      )
      .slice(0, 10);

    return {
      totalAchievements: allAchievements.length,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      lockedCount: locked.length,
      completionPercent:
        allAchievements.length > 0
          ? Math.floor((completed.length / allAchievements.length) * 100)
          : 0,
      totalXpEarned,
      byCategory,
      byTier,
      recentCompletions,
    };
  }

  // ==========================================================================
  // SEED / INITIALIZATION
  // ==========================================================================

  async seedAchievements(): Promise<number> {
    let seeded = 0;

    for (const achDef of BUILT_IN_ACHIEVEMENTS) {
      const { data: existing } = await this.supabase
        .from("achievement_definitions")
        .select("id")
        .eq("code", achDef.code)
        .single();

      if (!existing) {
        const { error } = await this.supabase
          .from("achievement_definitions")
          .insert({
            id: crypto.randomUUID(),
            code: achDef.code,
            name: achDef.name,
            description: achDef.description,
            icon: achDef.icon,
            category: achDef.category,
            tier: achDef.tier,
            xp_reward: achDef.xpReward,
            conditions: achDef.conditions,
            is_active: achDef.isActive,
            sort_order: achDef.sortOrder,
            created_at: new Date().toISOString(),
          });

        if (!error) seeded++;
      }
    }

    return seeded;
  }

  // ==========================================================================
  // STATIC HELPERS
  // ==========================================================================

  getBuiltInAchievements(): typeof BUILT_IN_ACHIEVEMENTS {
    return BUILT_IN_ACHIEVEMENTS;
  }

  getTierConfig(): typeof TIER_CONFIG {
    return TIER_CONFIG;
  }

  getCategoryConfig(): typeof CATEGORY_CONFIG {
    return CATEGORY_CONFIG;
  }

  getTierXpMultiplier(tier: BadgeTier): number {
    return TIER_CONFIG[tier].xpMultiplier;
  }

  getCategoryLabel(category: AchievementCategory): string {
    return CATEGORY_CONFIG[category].label;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getTargetFromConditions(
    conditions: AchievementCondition[],
  ): number {
    if (conditions.length === 0) return 0;
    return conditions[0].targetValue;
  }

  private mapToAchievementDefinition(
    data: Record<string, unknown>,
  ): AchievementDefinition {
    return {
      id: data.id as string,
      code: data.code as string,
      name: data.name as string,
      description: data.description as string,
      icon: data.icon as string,
      category: data.category as AchievementCategory,
      tier: data.tier as BadgeTier,
      xpReward: data.xp_reward as number,
      conditions: data.conditions as AchievementCondition[],
      isActive: data.is_active as boolean,
      sortOrder: data.sort_order as number,
      createdAt: data.created_at as string,
    };
  }

  private mapToUserAchievement(
    data: Record<string, unknown>,
  ): UserAchievement {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      achievementId: data.achievement_id as string,
      status: data.status as AchievementStatus,
      currentProgress: data.current_progress as number,
      targetProgress: data.target_progress as number,
      progressPercent: data.progress_percent as number,
      completedAt: data.completed_at as string | null,
      notificationSent: data.notification_sent as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let achievementServiceInstance: AchievementService | null = null;

export function getAchievementService(): AchievementService {
  if (!achievementServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    achievementServiceInstance = new AchievementService(supabaseUrl, supabaseKey);
  }

  return achievementServiceInstance;
}
