/**
 * Points & Rewards Engine Service
 *
 * Comprehensive points system for the Fynvita gamification module:
 * - Points ledger: earn/spend/transfer points with transaction history
 * - Earning rules: configurable actions that award points
 * - Redemption rules: spend points on premium features, badges, customization
 * - Tier system: Bronze, Silver, Gold, Platinum based on lifetime points
 * - Streak bonuses: multipliers for consecutive daily/weekly activity
 * - Points expiration: configurable TTL for earned points
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type PointsTransactionType =
  | "earn"
  | "spend"
  | "transfer_out"
  | "transfer_in"
  | "expire"
  | "bonus"
  | "refund";

export type RewardTier = "bronze" | "silver" | "gold" | "platinum";

export type EarningCategory =
  | "engagement"
  | "financial_action"
  | "social"
  | "milestone"
  | "referral"
  | "bonus";

export type RedemptionCategory =
  | "premium_feature"
  | "badge"
  | "customization"
  | "boost"
  | "donation";

export interface PointsBalance {
  id: string;
  userId: string;
  availablePoints: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimeExpired: number;
  currentTier: RewardTier;
  tierProgressPercent: number;
  pointsToNextTier: number;
  currentStreakDays: number;
  streakMultiplier: number;
  lastActivityDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  category: EarningCategory | RedemptionCategory;
  referenceId?: string;
  referenceType?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface EarningRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: EarningCategory;
  basePoints: number;
  maxDaily?: number;
  maxWeekly?: number;
  isActive: boolean;
  cooldownMinutes?: number;
  conditions?: Record<string, unknown>;
}

export interface RedemptionOption {
  id: string;
  code: string;
  name: string;
  description: string;
  category: RedemptionCategory;
  pointsCost: number;
  isActive: boolean;
  stock?: number;
  maxPerUser?: number;
  requiredTier?: RewardTier;
  metadata?: Record<string, unknown>;
}

export interface RedemptionRecord {
  id: string;
  userId: string;
  optionId: string;
  optionCode: string;
  pointsSpent: number;
  status: "pending" | "fulfilled" | "cancelled" | "refunded";
  fulfilledAt?: string;
  createdAt: string;
}

export interface StreakBonus {
  days: number;
  multiplier: number;
  bonusPoints: number;
  label: string;
}

export interface TierConfig {
  tier: RewardTier;
  minLifetimePoints: number;
  maxLifetimePoints: number;
  label: string;
  perks: string[];
  earningMultiplier: number;
  color: string;
}

export interface PointsStats {
  balance: PointsBalance;
  recentTransactions: PointsTransaction[];
  earningRate: { daily: number; weekly: number; monthly: number };
  topEarningSources: { category: string; total: number }[];
  streakHistory: { date: string; active: boolean }[];
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const TIER_CONFIGS: TierConfig[] = [
  {
    tier: "bronze",
    minLifetimePoints: 0,
    maxLifetimePoints: 999,
    label: "Bronze",
    perks: ["Basic rewards access", "Standard earning rates"],
    earningMultiplier: 1.0,
    color: "#CD7F32",
  },
  {
    tier: "silver",
    minLifetimePoints: 1000,
    maxLifetimePoints: 4999,
    label: "Silver",
    perks: [
      "10% bonus on all earnings",
      "Exclusive silver badges",
      "Priority support",
    ],
    earningMultiplier: 1.1,
    color: "#C0C0C0",
  },
  {
    tier: "gold",
    minLifetimePoints: 5000,
    maxLifetimePoints: 19999,
    label: "Gold",
    perks: [
      "25% bonus on all earnings",
      "Exclusive gold badges",
      "Premium features access",
      "Monthly bonus points",
    ],
    earningMultiplier: 1.25,
    color: "#FFD700",
  },
  {
    tier: "platinum",
    minLifetimePoints: 20000,
    maxLifetimePoints: Infinity,
    label: "Platinum",
    perks: [
      "50% bonus on all earnings",
      "All exclusive badges",
      "Full premium access",
      "Weekly bonus points",
      "Custom profile themes",
    ],
    earningMultiplier: 1.5,
    color: "#E5E4E2",
  },
];

// ============================================================================
// EARNING RULES
// ============================================================================

export const DEFAULT_EARNING_RULES: EarningRule[] = [
  {
    id: "rule-daily-login",
    code: "daily_login",
    name: "Daily Login",
    description: "Log in to the app each day",
    category: "engagement",
    basePoints: 10,
    maxDaily: 10,
    isActive: true,
  },
  {
    id: "rule-link-account",
    code: "link_account",
    name: "Link Bank Account",
    description: "Connect a bank account via Plaid",
    category: "financial_action",
    basePoints: 100,
    isActive: true,
  },
  {
    id: "rule-create-budget",
    code: "create_budget",
    name: "Create Budget",
    description: "Create a new budget category",
    category: "financial_action",
    basePoints: 50,
    maxWeekly: 150,
    isActive: true,
  },
  {
    id: "rule-log-transaction",
    code: "log_transaction",
    name: "Log Transaction",
    description: "Manually log a financial transaction",
    category: "financial_action",
    basePoints: 5,
    maxDaily: 50,
    isActive: true,
  },
  {
    id: "rule-debt-payment",
    code: "debt_payment",
    name: "Debt Payment",
    description: "Make an extra debt payment",
    category: "financial_action",
    basePoints: 75,
    isActive: true,
  },
  {
    id: "rule-savings-deposit",
    code: "savings_deposit",
    name: "Savings Deposit",
    description: "Make a savings contribution",
    category: "financial_action",
    basePoints: 50,
    isActive: true,
  },
  {
    id: "rule-invite-friend",
    code: "invite_friend",
    name: "Invite a Friend",
    description: "Send a referral invitation",
    category: "referral",
    basePoints: 200,
    maxWeekly: 600,
    isActive: true,
  },
  {
    id: "rule-referral-conversion",
    code: "referral_conversion",
    name: "Referral Conversion",
    description: "Invited friend signs up and links an account",
    category: "referral",
    basePoints: 500,
    isActive: true,
  },
  {
    id: "rule-complete-challenge",
    code: "complete_challenge",
    name: "Complete Challenge",
    description: "Complete a community challenge",
    category: "milestone",
    basePoints: 300,
    isActive: true,
  },
  {
    id: "rule-credit-check",
    code: "credit_check",
    name: "Credit Score Check",
    description: "Check your credit score",
    category: "financial_action",
    basePoints: 25,
    maxWeekly: 25,
    isActive: true,
    cooldownMinutes: 1440,
  },
  {
    id: "rule-shared-goal-contribution",
    code: "shared_goal_contribution",
    name: "Shared Goal Contribution",
    description: "Contribute to a shared family/friend goal",
    category: "social",
    basePoints: 40,
    maxDaily: 120,
    isActive: true,
  },
  {
    id: "rule-accountability-nudge",
    code: "accountability_nudge",
    name: "Send Accountability Nudge",
    description: "Send encouragement to your accountability partner",
    category: "social",
    basePoints: 15,
    maxDaily: 45,
    isActive: true,
  },
];

// ============================================================================
// REDEMPTION OPTIONS
// ============================================================================

export const DEFAULT_REDEMPTION_OPTIONS: RedemptionOption[] = [
  {
    id: "redeem-premium-week",
    code: "premium_week",
    name: "1 Week Premium",
    description: "Unlock premium features for one week",
    category: "premium_feature",
    pointsCost: 500,
    isActive: true,
  },
  {
    id: "redeem-premium-month",
    code: "premium_month",
    name: "1 Month Premium",
    description: "Unlock premium features for one month",
    category: "premium_feature",
    pointsCost: 1500,
    isActive: true,
  },
  {
    id: "redeem-custom-badge",
    code: "custom_badge",
    name: "Custom Badge",
    description: "Design and earn a custom profile badge",
    category: "badge",
    pointsCost: 750,
    isActive: true,
    requiredTier: "silver",
  },
  {
    id: "redeem-profile-theme",
    code: "profile_theme",
    name: "Profile Theme",
    description: "Unlock a premium profile theme",
    category: "customization",
    pointsCost: 300,
    isActive: true,
  },
  {
    id: "redeem-xp-boost",
    code: "xp_boost_24h",
    name: "24h XP Boost",
    description: "Double XP earnings for 24 hours",
    category: "boost",
    pointsCost: 400,
    isActive: true,
    maxPerUser: 4,
    requiredTier: "bronze",
  },
  {
    id: "redeem-charity-donation",
    code: "charity_donation",
    name: "Charity Donation ($5)",
    description: "Donate $5 to a partner charity",
    category: "donation",
    pointsCost: 1000,
    isActive: true,
    requiredTier: "gold",
  },
];

// ============================================================================
// STREAK BONUSES
// ============================================================================

export const STREAK_BONUSES: StreakBonus[] = [
  { days: 3, multiplier: 1.1, bonusPoints: 0, label: "3-Day Streak" },
  { days: 7, multiplier: 1.25, bonusPoints: 50, label: "Weekly Streak" },
  { days: 14, multiplier: 1.4, bonusPoints: 150, label: "Two-Week Streak" },
  { days: 21, multiplier: 1.5, bonusPoints: 300, label: "Three-Week Streak" },
  { days: 30, multiplier: 1.75, bonusPoints: 500, label: "Monthly Streak" },
  {
    days: 60,
    multiplier: 2.0,
    bonusPoints: 1200,
    label: "Two-Month Streak",
  },
  { days: 90, multiplier: 2.25, bonusPoints: 2000, label: "Quarterly Streak" },
  {
    days: 365,
    multiplier: 3.0,
    bonusPoints: 10000,
    label: "Annual Streak",
  },
];

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default point TTL in days (0 = never expires) */
export const DEFAULT_POINTS_TTL_DAYS = 365;

// ============================================================================
// SERVICE
// ============================================================================

export class PointsRewardsService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // BALANCE MANAGEMENT
  // ==========================================================================

  async getBalance(userId: string): Promise<PointsBalance | null> {
    const { data, error } = await this.supabase
      .from("points_balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;
    return this.balanceFromDb(data);
  }

  async initializeBalance(userId: string): Promise<PointsBalance> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("points_balances")
      .upsert({
        user_id: userId,
        available_points: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
        lifetime_expired: 0,
        current_tier: "bronze",
        tier_progress_percent: 0,
        points_to_next_tier: 1000,
        current_streak_days: 0,
        streak_multiplier: 1.0,
        last_activity_date: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to initialize points balance: ${error.message}`);
    return this.balanceFromDb(data);
  }

  // ==========================================================================
  // EARNING POINTS
  // ==========================================================================

  async earnPoints(
    userId: string,
    ruleCode: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ transaction: PointsTransaction; balance: PointsBalance }> {
    const rule = this.getEarningRuleByCode(ruleCode);
    if (!rule) throw new Error(`Earning rule not found: ${ruleCode}`);
    if (!rule.isActive) throw new Error(`Earning rule is not active: ${ruleCode}`);

    // Get or initialize balance
    let balance = await this.getBalance(userId);
    if (!balance) {
      balance = await this.initializeBalance(userId);
    }

    // Check daily/weekly limits
    if (rule.maxDaily) {
      const dailyTotal = await this.getDailyEarnings(userId, ruleCode);
      if (dailyTotal >= rule.maxDaily) {
        throw new Error(`Daily limit reached for ${ruleCode}`);
      }
    }

    if (rule.maxWeekly) {
      const weeklyTotal = await this.getWeeklyEarnings(userId, ruleCode);
      if (weeklyTotal >= rule.maxWeekly) {
        throw new Error(`Weekly limit reached for ${ruleCode}`);
      }
    }

    // Apply tier multiplier
    const tierConfig = this.getTierConfig(balance.currentTier);
    const tierMultiplier = tierConfig?.earningMultiplier ?? 1.0;

    // Apply streak multiplier
    const streakMultiplier = balance.streakMultiplier;

    // Calculate final points
    const earnedPoints = Math.floor(
      rule.basePoints * tierMultiplier * streakMultiplier,
    );

    // Calculate expiration
    const expiresAt =
      DEFAULT_POINTS_TTL_DAYS > 0
        ? new Date(
            Date.now() + DEFAULT_POINTS_TTL_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
        : undefined;

    // Create transaction
    const newAvailable = balance.availablePoints + earnedPoints;
    const newLifetimeEarned = balance.lifetimeEarned + earnedPoints;

    const transaction = await this.recordTransaction({
      userId,
      type: "earn",
      amount: earnedPoints,
      balanceAfter: newAvailable,
      description: `Earned from: ${rule.name}`,
      category: rule.category,
      referenceId: ruleCode,
      referenceType: "earning_rule",
      expiresAt,
      metadata,
    });

    // Update balance and tier
    const newTier = this.calculateTier(newLifetimeEarned);
    const tierProgress = this.calculateTierProgress(newLifetimeEarned);

    const { data: updatedBalance, error } = await this.supabase
      .from("points_balances")
      .update({
        available_points: newAvailable,
        lifetime_earned: newLifetimeEarned,
        current_tier: newTier,
        tier_progress_percent: tierProgress.progressPercent,
        points_to_next_tier: tierProgress.pointsToNext,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update balance: ${error.message}`);

    return {
      transaction,
      balance: this.balanceFromDb(updatedBalance),
    };
  }

  // ==========================================================================
  // SPENDING POINTS
  // ==========================================================================

  async redeemPoints(
    userId: string,
    optionCode: string,
  ): Promise<{ redemption: RedemptionRecord; balance: PointsBalance }> {
    const option = this.getRedemptionOptionByCode(optionCode);
    if (!option) throw new Error(`Redemption option not found: ${optionCode}`);
    if (!option.isActive)
      throw new Error(`Redemption option is not active: ${optionCode}`);

    // Get balance
    const balance = await this.getBalance(userId);
    if (!balance) throw new Error("User has no points balance");

    // Check tier requirement
    if (option.requiredTier) {
      const tierOrder: RewardTier[] = ["bronze", "silver", "gold", "platinum"];
      const userTierIndex = tierOrder.indexOf(balance.currentTier);
      const requiredTierIndex = tierOrder.indexOf(option.requiredTier);
      if (userTierIndex < requiredTierIndex) {
        throw new Error(
          `Requires ${option.requiredTier} tier. Current tier: ${balance.currentTier}`,
        );
      }
    }

    // Check sufficient points
    if (balance.availablePoints < option.pointsCost) {
      throw new Error(
        `Insufficient points. Need ${option.pointsCost}, have ${balance.availablePoints}`,
      );
    }

    // Check user redemption limit
    if (option.maxPerUser) {
      const userRedemptions = await this.getUserRedemptionCount(
        userId,
        option.id,
      );
      if (userRedemptions >= option.maxPerUser) {
        throw new Error(`Max redemptions reached for ${optionCode}`);
      }
    }

    // Create transaction
    const newAvailable = balance.availablePoints - option.pointsCost;
    const newLifetimeSpent = balance.lifetimeSpent + option.pointsCost;

    const transaction = await this.recordTransaction({
      userId,
      type: "spend",
      amount: -option.pointsCost,
      balanceAfter: newAvailable,
      description: `Redeemed: ${option.name}`,
      category: option.category,
      referenceId: option.id,
      referenceType: "redemption",
    });

    // Record redemption
    const redemption: RedemptionRecord = {
      id: crypto.randomUUID(),
      userId,
      optionId: option.id,
      optionCode: option.code,
      pointsSpent: option.pointsCost,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const { error: redemptionError } = await this.supabase
      .from("points_redemptions")
      .insert({
        id: redemption.id,
        user_id: redemption.userId,
        option_id: redemption.optionId,
        option_code: redemption.optionCode,
        points_spent: redemption.pointsSpent,
        transaction_id: transaction.id,
        status: redemption.status,
        created_at: redemption.createdAt,
      });

    if (redemptionError)
      throw new Error(`Failed to record redemption: ${redemptionError.message}`);

    // Update balance
    const { data: updatedBalance, error: balanceError } = await this.supabase
      .from("points_balances")
      .update({
        available_points: newAvailable,
        lifetime_spent: newLifetimeSpent,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (balanceError)
      throw new Error(`Failed to update balance: ${balanceError.message}`);

    return {
      redemption,
      balance: this.balanceFromDb(updatedBalance),
    };
  }

  // ==========================================================================
  // TRANSFER POINTS
  // ==========================================================================

  async transferPoints(
    fromUserId: string,
    toUserId: string,
    amount: number,
    note?: string,
  ): Promise<{
    fromBalance: PointsBalance;
    toBalance: PointsBalance;
  }> {
    if (amount <= 0) throw new Error("Transfer amount must be positive");

    const fromBalance = await this.getBalance(fromUserId);
    if (!fromBalance) throw new Error("Sender has no points balance");
    if (fromBalance.availablePoints < amount) {
      throw new Error(
        `Insufficient points. Need ${amount}, have ${fromBalance.availablePoints}`,
      );
    }

    let toBalance = await this.getBalance(toUserId);
    if (!toBalance) {
      toBalance = await this.initializeBalance(toUserId);
    }

    // Debit sender
    const newFromAvailable = fromBalance.availablePoints - amount;
    await this.recordTransaction({
      userId: fromUserId,
      type: "transfer_out",
      amount: -amount,
      balanceAfter: newFromAvailable,
      description: note || `Transfer to user`,
      category: "social",
      referenceId: toUserId,
      referenceType: "transfer",
    });

    const { data: updatedFrom, error: fromError } = await this.supabase
      .from("points_balances")
      .update({
        available_points: newFromAvailable,
        lifetime_spent: fromBalance.lifetimeSpent + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", fromUserId)
      .select()
      .single();

    if (fromError) throw new Error(`Failed to update sender balance: ${fromError.message}`);

    // Credit receiver
    const newToAvailable = toBalance.availablePoints + amount;
    await this.recordTransaction({
      userId: toUserId,
      type: "transfer_in",
      amount,
      balanceAfter: newToAvailable,
      description: note || `Transfer from user`,
      category: "social",
      referenceId: fromUserId,
      referenceType: "transfer",
    });

    const { data: updatedTo, error: toError } = await this.supabase
      .from("points_balances")
      .update({
        available_points: newToAvailable,
        lifetime_earned: toBalance.lifetimeEarned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", toUserId)
      .select()
      .single();

    if (toError) throw new Error(`Failed to update receiver balance: ${toError.message}`);

    return {
      fromBalance: this.balanceFromDb(updatedFrom),
      toBalance: this.balanceFromDb(updatedTo),
    };
  }

  // ==========================================================================
  // STREAK MANAGEMENT
  // ==========================================================================

  async updateStreak(userId: string): Promise<{
    streakDays: number;
    multiplier: number;
    bonusAwarded: number;
    streakBroken: boolean;
  }> {
    let balance = await this.getBalance(userId);
    if (!balance) {
      balance = await this.initializeBalance(userId);
    }

    const today = new Date().toISOString().split("T")[0];
    const lastActivity = balance.lastActivityDate;

    let newStreakDays = balance.currentStreakDays;
    let streakBroken = false;
    let bonusAwarded = 0;

    if (!lastActivity) {
      newStreakDays = 1;
    } else {
      const lastDate = new Date(lastActivity);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        // Already active today
        return {
          streakDays: balance.currentStreakDays,
          multiplier: balance.streakMultiplier,
          bonusAwarded: 0,
          streakBroken: false,
        };
      } else if (diffDays === 1) {
        newStreakDays = balance.currentStreakDays + 1;
      } else {
        newStreakDays = 1;
        streakBroken = true;
      }
    }

    // Calculate multiplier from streak bonuses
    const newMultiplier = this.calculateStreakMultiplier(newStreakDays);

    // Check for streak milestone bonus
    const milestoneBonus = STREAK_BONUSES.find(
      (b) => b.days === newStreakDays,
    );
    if (milestoneBonus && milestoneBonus.bonusPoints > 0) {
      bonusAwarded = milestoneBonus.bonusPoints;
      const newAvailable = balance.availablePoints + bonusAwarded;
      const newLifetimeEarned = balance.lifetimeEarned + bonusAwarded;

      await this.recordTransaction({
        userId,
        type: "bonus",
        amount: bonusAwarded,
        balanceAfter: newAvailable,
        description: `Streak bonus: ${milestoneBonus.label}`,
        category: "milestone",
        referenceId: `streak-${newStreakDays}`,
        referenceType: "streak_bonus",
      });

      // Update balance with bonus
      await this.supabase
        .from("points_balances")
        .update({
          available_points: newAvailable,
          lifetime_earned: newLifetimeEarned,
          current_streak_days: newStreakDays,
          streak_multiplier: newMultiplier,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      // Update streak without bonus
      await this.supabase
        .from("points_balances")
        .update({
          current_streak_days: newStreakDays,
          streak_multiplier: newMultiplier,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    return {
      streakDays: newStreakDays,
      multiplier: newMultiplier,
      bonusAwarded,
      streakBroken,
    };
  }

  calculateStreakMultiplier(streakDays: number): number {
    let multiplier = 1.0;
    for (const bonus of STREAK_BONUSES) {
      if (streakDays >= bonus.days) {
        multiplier = bonus.multiplier;
      } else {
        break;
      }
    }
    return multiplier;
  }

  // ==========================================================================
  // POINTS EXPIRATION
  // ==========================================================================

  async expirePoints(userId: string): Promise<number> {
    const now = new Date().toISOString();

    // Find expired, unprocessed transactions
    const { data: expiredTransactions, error } = await this.supabase
      .from("points_transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "earn")
      .lt("expires_at", now)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to find expired points: ${error.message}`);
    if (!expiredTransactions || expiredTransactions.length === 0) return 0;

    let totalExpired = 0;
    for (const txn of expiredTransactions) {
      totalExpired += txn.amount as number;
    }

    if (totalExpired <= 0) return 0;

    // Get current balance
    const balance = await this.getBalance(userId);
    if (!balance) return 0;

    // Only expire up to available points
    const actualExpired = Math.min(totalExpired, balance.availablePoints);
    if (actualExpired <= 0) return 0;

    const newAvailable = balance.availablePoints - actualExpired;

    await this.recordTransaction({
      userId,
      type: "expire",
      amount: -actualExpired,
      balanceAfter: newAvailable,
      description: `Points expired (${expiredTransactions.length} transactions)`,
      category: "engagement",
    });

    await this.supabase
      .from("points_balances")
      .update({
        available_points: newAvailable,
        lifetime_expired: balance.lifetimeExpired + actualExpired,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return actualExpired;
  }

  // ==========================================================================
  // TRANSACTION HISTORY
  // ==========================================================================

  async getTransactionHistory(
    userId: string,
    limit = 50,
    type?: PointsTransactionType,
  ): Promise<PointsTransaction[]> {
    let query = this.supabase
      .from("points_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get transaction history: ${error.message}`);
    return (data || []).map(this.transactionFromDb);
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  async getStats(userId: string): Promise<PointsStats | null> {
    const balance = await this.getBalance(userId);
    if (!balance) return null;

    const recentTransactions = await this.getTransactionHistory(userId, 10);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate earning rates
    const { data: dailyData } = await this.supabase
      .from("points_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "earn")
      .gte("created_at", oneDayAgo.toISOString());

    const { data: weeklyData } = await this.supabase
      .from("points_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "earn")
      .gte("created_at", oneWeekAgo.toISOString());

    const { data: monthlyData } = await this.supabase
      .from("points_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "earn")
      .gte("created_at", oneMonthAgo.toISOString());

    const dailyTotal = (dailyData || []).reduce(
      (sum, t) => sum + (t.amount as number),
      0,
    );
    const weeklyTotal = (weeklyData || []).reduce(
      (sum, t) => sum + (t.amount as number),
      0,
    );
    const monthlyTotal = (monthlyData || []).reduce(
      (sum, t) => sum + (t.amount as number),
      0,
    );

    return {
      balance,
      recentTransactions,
      earningRate: {
        daily: dailyTotal,
        weekly: weeklyTotal,
        monthly: monthlyTotal,
      },
      topEarningSources: [],
      streakHistory: [],
    };
  }

  // ==========================================================================
  // EARNING RULES
  // ==========================================================================

  getEarningRules(): EarningRule[] {
    return DEFAULT_EARNING_RULES;
  }

  getEarningRuleByCode(code: string): EarningRule | undefined {
    return DEFAULT_EARNING_RULES.find((r) => r.code === code);
  }

  // ==========================================================================
  // REDEMPTION OPTIONS
  // ==========================================================================

  getRedemptionOptions(tier?: RewardTier): RedemptionOption[] {
    if (!tier) return DEFAULT_REDEMPTION_OPTIONS.filter((o) => o.isActive);

    const tierOrder: RewardTier[] = ["bronze", "silver", "gold", "platinum"];
    const tierIndex = tierOrder.indexOf(tier);

    return DEFAULT_REDEMPTION_OPTIONS.filter((o) => {
      if (!o.isActive) return false;
      if (!o.requiredTier) return true;
      return tierOrder.indexOf(o.requiredTier) <= tierIndex;
    });
  }

  getRedemptionOptionByCode(code: string): RedemptionOption | undefined {
    return DEFAULT_REDEMPTION_OPTIONS.find((o) => o.code === code);
  }

  // ==========================================================================
  // TIER MANAGEMENT
  // ==========================================================================

  calculateTier(lifetimePoints: number): RewardTier {
    for (let i = TIER_CONFIGS.length - 1; i >= 0; i--) {
      if (lifetimePoints >= TIER_CONFIGS[i].minLifetimePoints) {
        return TIER_CONFIGS[i].tier;
      }
    }
    return "bronze";
  }

  calculateTierProgress(lifetimePoints: number): {
    progressPercent: number;
    pointsToNext: number;
  } {
    const currentTier = this.calculateTier(lifetimePoints);
    const currentConfig = TIER_CONFIGS.find((t) => t.tier === currentTier);
    const currentIndex = TIER_CONFIGS.findIndex((t) => t.tier === currentTier);
    const nextConfig = TIER_CONFIGS[currentIndex + 1];

    if (!nextConfig || !currentConfig) {
      return { progressPercent: 100, pointsToNext: 0 };
    }

    const tierRange = nextConfig.minLifetimePoints - currentConfig.minLifetimePoints;
    const progress = lifetimePoints - currentConfig.minLifetimePoints;
    const progressPercent = Math.min(100, Math.floor((progress / tierRange) * 100));
    const pointsToNext = nextConfig.minLifetimePoints - lifetimePoints;

    return { progressPercent, pointsToNext: Math.max(0, pointsToNext) };
  }

  getTierConfig(tier: RewardTier): TierConfig | undefined {
    return TIER_CONFIGS.find((t) => t.tier === tier);
  }

  getAllTiers(): TierConfig[] {
    return TIER_CONFIGS;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async recordTransaction(
    txn: Omit<PointsTransaction, "id" | "createdAt">,
  ): Promise<PointsTransaction> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const { data, error } = await this.supabase
      .from("points_transactions")
      .insert({
        id,
        user_id: txn.userId,
        type: txn.type,
        amount: txn.amount,
        balance_after: txn.balanceAfter,
        description: txn.description,
        category: txn.category,
        reference_id: txn.referenceId,
        reference_type: txn.referenceType,
        expires_at: txn.expiresAt,
        metadata: txn.metadata,
        created_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record transaction: ${error.message}`);
    return this.transactionFromDb(data);
  }

  private async getDailyEarnings(
    userId: string,
    ruleCode: string,
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .from("points_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "earn")
      .eq("reference_id", ruleCode)
      .gte("created_at", today.toISOString());

    return (data || []).reduce((sum, t) => sum + (t.amount as number), 0);
  }

  private async getWeeklyEarnings(
    userId: string,
    ruleCode: string,
  ): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await this.supabase
      .from("points_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "earn")
      .eq("reference_id", ruleCode)
      .gte("created_at", weekAgo.toISOString());

    return (data || []).reduce((sum, t) => sum + (t.amount as number), 0);
  }

  private async getUserRedemptionCount(
    userId: string,
    optionId: string,
  ): Promise<number> {
    const { count } = await this.supabase
      .from("points_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("option_id", optionId)
      .neq("status", "cancelled");

    return count || 0;
  }

  private balanceFromDb(data: Record<string, unknown>): PointsBalance {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      availablePoints: data.available_points as number,
      lifetimeEarned: data.lifetime_earned as number,
      lifetimeSpent: data.lifetime_spent as number,
      lifetimeExpired: data.lifetime_expired as number,
      currentTier: data.current_tier as RewardTier,
      tierProgressPercent: data.tier_progress_percent as number,
      pointsToNextTier: data.points_to_next_tier as number,
      currentStreakDays: data.current_streak_days as number,
      streakMultiplier: data.streak_multiplier as number,
      lastActivityDate: data.last_activity_date as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private transactionFromDb(data: Record<string, unknown>): PointsTransaction {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      type: data.type as PointsTransactionType,
      amount: data.amount as number,
      balanceAfter: data.balance_after as number,
      description: data.description as string,
      category: data.category as EarningCategory | RedemptionCategory,
      referenceId: data.reference_id as string | undefined,
      referenceType: data.reference_type as string | undefined,
      expiresAt: data.expires_at as string | undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
      createdAt: data.created_at as string,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let pointsRewardsServiceInstance: PointsRewardsService | null = null;

export function getPointsRewardsService(): PointsRewardsService {
  if (!pointsRewardsServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    pointsRewardsServiceInstance = new PointsRewardsService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return pointsRewardsServiceInstance;
}
