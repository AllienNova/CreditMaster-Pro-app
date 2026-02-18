/**
 * Fynvita Gamification System - Type Definitions
 * Core types for XP, levels, badges, streaks, and quests
 */

// ============================================================================
// ENUMS
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

export type ChallengeType =
  | "savings"
  | "no_spend"
  | "debt_payoff"
  | "credit_improvement"
  | "investment";

export type GameEventType =
  | "transaction_logged"
  | "budget_created"
  | "budget_under"
  | "savings_contribution"
  | "debt_payment"
  | "goal_milestone"
  | "goal_completed"
  | "credit_check"
  | "credit_score_change"
  | "streak_milestone"
  | "badge_earned"
  | "quest_completed"
  | "challenge_joined"
  | "challenge_completed"
  | "referral"
  | "daily_login";

// ============================================================================
// USER PROGRESS
// ============================================================================

export interface UserProgress {
  id: string;
  userId: string;
  currentXp: number;
  totalXpEarned: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakMultiplier: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgressWithLevel extends UserProgress {
  levelInfo: LevelDefinition;
  xpToNextLevel: number;
  levelProgress: number; // 0-100 percentage
}

// ============================================================================
// LEVELS
// ============================================================================

export interface LevelDefinition {
  level: number;
  title: string;
  xpRequired: number;
  perks?: LevelPerks;
  badgeId?: string;
}

export interface LevelPerks {
  features: string[];
  streakBonusMultiplier?: number;
  questSlots?: number;
  customBadges?: boolean;
}

export const LEVEL_TITLES: Record<number, string> = {
  1: "Financial Newbie",
  2: "Budget Beginner",
  3: "Savings Starter",
  4: "Money Manager",
  5: "Finance Fighter",
  6: "Debt Destroyer",
  7: "Credit Climber",
  8: "Wealth Builder",
  9: "Investment Initiate",
  10: "Portfolio Pro",
  15: "Wealth Warrior",
  20: "Finance Master",
  25: "Money Maven",
  30: "Financial Legend",
};

// ============================================================================
// BADGES
// ============================================================================

export interface BadgeDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xpReward: number;
  criteria: BadgeCriteria;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface BadgeCriteria {
  type: string;
  value?: number;
  count?: number;
  days?: number;
  categories?: string[];
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  progress: number;
  isPinned: boolean;
}

export interface UserBadgeWithDefinition extends UserBadge {
  badge: BadgeDefinition;
}

export interface BadgeProgress {
  id: string;
  userId: string;
  badgeId: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  lastUpdated: string;
}

export interface BadgeProgressWithDefinition extends BadgeProgress {
  badge: BadgeDefinition;
}

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: "#9CA3AF",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
};

export const RARITY_XP_MULTIPLIER: Record<BadgeRarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 3,
  legendary: 5,
};

// ============================================================================
// XP TRANSACTIONS
// ============================================================================

export interface XpTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  eventType: GameEventType;
  multiplier: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface XpAwardResult {
  xpEarned: number;
  multiplier: number;
  levelUp: boolean;
  newLevel?: number;
  newTitle?: string;
}

// ============================================================================
// XP REWARDS CONFIG
// ============================================================================

export const XP_REWARDS: Record<string, number> = {
  // Transactions
  "transaction.logged": 10,
  "transaction.categorized": 5,

  // Budget
  "budget.created": 50,
  "budget.under_daily": 25,
  "budget.under_weekly": 100,
  "budget.under_monthly": 250,

  // Savings
  "savings.contribution": 50,
  "savings.goal_set": 25,
  "savings.milestone_25": 100,
  "savings.milestone_50": 200,
  "savings.milestone_75": 300,
  "savings.goal_completed": 500,

  // Debt
  "debt.payment": 50,
  "debt.extra_payment": 100,
  "debt.account_paid_off": 500,
  "debt.free": 2000,

  // Credit
  "credit.check": 25,
  "credit.dispute_filed": 50,
  "credit.dispute_won": 200,
  "credit.score_increase": 100,

  // Tax Optimization
  "tax.profile_completed": 100,
  "tax.recommendation_completed": 150,
  "tax.401k_maxed": 500,
  "tax.ira_maxed": 300,
  "tax.hsa_maxed": 300,
  "tax.employer_match_captured": 200,
  "tax.tax_loss_harvest": 250,
  "tax.scenario_created": 50,
  "tax.savings_1k": 100,
  "tax.savings_5k": 300,
  "tax.savings_10k": 500,

  // Streaks
  "streak.7_days": 100,
  "streak.21_days": 250,
  "streak.30_days": 500,
  "streak.100_days": 1500,
  "streak.365_days": 5000,

  // Engagement
  "daily.login": 10,
  "quest.completed": 50,
  "challenge.joined": 25,
  "challenge.completed": 500,
  "referral.sent": 100,
  "referral.converted": 500,

  // Education
  "article.read": 15,
  "video.watched": 25,
  "course.completed": 200,
};

// ============================================================================
// DAILY QUESTS
// ============================================================================

export interface DailyQuest {
  id: string;
  code: string;
  name: string;
  description: string;
  xpReward: number;
  bonusReward?: QuestBonusReward;
  questType: QuestType;
  criteria: QuestCriteria;
  isActive: boolean;
  createdAt: string;
}

export interface QuestBonusReward {
  emoji?: string;
  badge?: string;
  bonus_xp?: number;
}

export interface QuestCriteria {
  type: string;
  min?: number;
  min_amount?: number;
  categories?: string | string[];
}

export interface UserQuestProgress {
  id: string;
  userId: string;
  questId: string;
  questDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  progressValue: number;
}

export interface UserQuestProgressWithQuest extends UserQuestProgress {
  quest: DailyQuest;
}

// ============================================================================
// COMMUNITY CHALLENGES
// ============================================================================

export interface CommunityChallenge {
  id: string;
  name: string;
  description: string;
  challengeType: ChallengeType;
  targetValue: number;
  startDate: string;
  endDate: string;
  badgeRewardId?: string;
  xpReward: number;
  isActive: boolean;
  createdAt: string;
}

export interface ChallengeWithStats extends CommunityChallenge {
  participantCount: number;
  totalProgress: number;
  completionRate: number;
}

export interface UserChallengeParticipation {
  id: string;
  userId: string;
  challengeId: string;
  joinedAt: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: string | null;
  rank: number | null;
}

export interface UserChallengeWithDetails extends UserChallengeParticipation {
  challenge: CommunityChallenge;
  progressPercent: number;
}

// ============================================================================
// LEADERBOARDS
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardSnapshot {
  id: string;
  leaderboardType: "weekly_xp" | "monthly_xp" | "streak" | "challenge";
  periodStart: string;
  periodEnd: string;
  rankings: LeaderboardEntry[];
  createdAt: string;
}

// ============================================================================
// STREAK SYSTEM
// ============================================================================

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  multiplier: number;
  streakBroken: boolean;
  daysUntilNextMilestone: number;
  nextMilestone: number;
}

export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

export function calculateStreakMultiplier(streakDays: number): number {
  // Max 2.0x at 30+ day streak
  return Math.min(2.0, 1.0 + streakDays * 0.033);
}

export function getNextStreakMilestone(currentStreak: number): number {
  return STREAK_MILESTONES.find((m) => m > currentStreak) ?? 365;
}

// ============================================================================
// GAMIFICATION EVENTS
// ============================================================================

export interface GameEvent {
  type: GameEventType;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface GameEventResult {
  xpEarned: number;
  newBadges: BadgeDefinition[];
  levelUp?: {
    newLevel: number;
    newTitle: string;
  };
  streakUpdate?: StreakInfo;
  questsCompleted: DailyQuest[];
  challengeProgress?: {
    challengeId: string;
    newProgress: number;
    completed: boolean;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GamificationProgressResponse {
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

export interface BadgesResponse {
  earned: UserBadgeWithDefinition[];
  inProgress: BadgeProgressWithDefinition[];
  locked: BadgeDefinition[];
  stats: {
    totalEarned: number;
    totalAvailable: number;
    byCategory: Record<BadgeCategory, number>;
  };
}

export interface QuestsResponse {
  today: UserQuestProgressWithQuest[];
  completedToday: number;
  totalToday: number;
  availableXp: number;
}

export interface LeaderboardResponse {
  type: "weekly_xp" | "monthly_xp" | "streak" | "challenge";
  periodStart: string;
  periodEnd: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  userPercentile?: number;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface ProgressRingProps {
  percentage: number;
  size: "sm" | "md" | "lg";
  label: string;
  streak?: number;
  color: "green" | "blue" | "purple" | "gold" | "red";
  animated?: boolean;
  showPercentage?: boolean;
}

export interface BadgeCardProps {
  badge: BadgeDefinition;
  isEarned: boolean;
  earnedDate?: string;
  progress?: number;
  onClick?: () => void;
}

export interface XpBarProps {
  currentXp: number;
  xpToNextLevel: number;
  currentLevel: number;
  levelTitle: string;
  animated?: boolean;
}

export interface StreakDisplayProps {
  streak: number;
  multiplier: number;
  size: "sm" | "md" | "lg";
}

export interface QuestCardProps {
  quest: DailyQuest;
  progress: UserQuestProgress;
  onComplete?: () => void;
}

export interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isHighlighted?: boolean;
}
