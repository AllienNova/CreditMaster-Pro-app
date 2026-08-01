/**
 * Community Challenges Service
 *
 * Monthly challenges and community competitions:
 * - Challenge creation and management
 * - Participant tracking
 * - Progress leaderboards
 * - Rewards distribution
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type ChallengeType =
  | "savings"
  | "no_spend"
  | "budget"
  | "debt_payoff"
  | "investment"
  | "credit_improvement"
  | "streak"
  | "custom";

export type ChallengeStatus = "upcoming" | "active" | "completed" | "cancelled";
export type ParticipantStatus = "joined" | "active" | "completed" | "dropped";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;

  // Timing
  startDate: Date;
  endDate: Date;

  // Goals
  goalType: "fixed" | "percentage" | "streak";
  goalValue: number;
  goalUnit: string;

  // Participation
  maxParticipants?: number;
  currentParticipants: number;
  isPublic: boolean;

  // Rewards
  xpReward: number;
  badgeId?: string;
  prizePool?: number;

  // Metadata
  rules: string[];
  tips: string[];
  imageUrl?: string;
  sponsoredBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  status: ParticipantStatus;

  // Progress
  currentProgress: number;
  /**
   * Percentage 0-100, DERIVED from currentProgress against the challenge
   * target. Optional because it is only knowable where the target is in
   * scope — participantFromDb maps a row that does not carry it, and
   * inventing a number there (0, say) would be the fabrication this wave
   * exists to remove. There is no stored percentage column.
   */
  goalProgress?: number; // Percentage 0-100

  // Stats
  startingValue?: number;
  currentValue?: number;

  // Ranking
  rank?: number;

  // Achievements
  earnedBadge: boolean;
  earnedXp: number;

  // Timestamps
  joinedAt: Date;
  completedAt?: Date;
  lastUpdatedAt: Date;
}

export interface ChallengeProgress {
  date: Date;
  value: number;
  note?: string;
}

export interface Leaderboard {
  challengeId: string;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  progress: number;
  progressPercent: number;
  isCurrentUser: boolean;
}

export interface ChallengeTemplate {
  id: string;
  name: string;
  type: ChallengeType;
  description: string;
  defaultGoal: number;
  goalUnit: string;
  defaultDuration: number; // days
  rules: string[];
  tips: string[];
  xpReward: number;
}

// ============================================================================
// CHALLENGE TEMPLATES
// ============================================================================

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: "no-spend-week",
    name: "No-Spend Week",
    type: "no_spend",
    description: "Go 7 days without any non-essential spending",
    defaultGoal: 7,
    goalUnit: "days",
    defaultDuration: 7,
    rules: [
      "Essential spending (groceries, bills, gas) is allowed",
      "No eating out, entertainment, or shopping",
      "Pre-planned subscriptions are okay",
      "Track all spending in the app",
    ],
    tips: [
      "Meal prep before the challenge starts",
      "Find free entertainment options",
      "Avoid shopping websites and stores",
      "Have an accountability partner",
    ],
    xpReward: 500,
  },
  {
    id: "save-500",
    name: "Save $500 Challenge",
    type: "savings",
    description: "Save $500 in one month",
    defaultGoal: 500,
    goalUnit: "dollars",
    defaultDuration: 30,
    rules: [
      "Money must be moved to savings account",
      "Can use any savings method",
      "Progress tracked automatically",
    ],
    tips: [
      "Cut one subscription temporarily",
      "Try the 52-week savings challenge",
      "Sell unused items",
      "Pick up a side gig",
    ],
    xpReward: 750,
  },
  {
    id: "debt-blitz",
    name: "30-Day Debt Blitz",
    type: "debt_payoff",
    description: "Pay off as much debt as possible in 30 days",
    defaultGoal: 1000,
    goalUnit: "dollars",
    defaultDuration: 30,
    rules: [
      "Extra payments beyond minimums count",
      "Any type of debt qualifies",
      "Track payments in the app",
    ],
    tips: [
      "Use the debt snowball or avalanche method",
      "Find extra income sources",
      "Reduce expenses temporarily",
      "Negotiate lower interest rates",
    ],
    xpReward: 1000,
  },
  {
    id: "budget-streak",
    name: "21-Day Budget Streak",
    type: "streak",
    description: "Stay within budget for 21 consecutive days",
    defaultGoal: 21,
    goalUnit: "days",
    defaultDuration: 21,
    rules: [
      "Stay within your set budget each day",
      "Log all transactions",
      "Missing a day resets the streak",
    ],
    tips: [
      "Set realistic budget limits",
      "Check your budget daily",
      "Plan for unexpected expenses",
      "Use cash envelopes if needed",
    ],
    xpReward: 600,
  },
  {
    id: "invest-first",
    name: "First Investment Challenge",
    type: "investment",
    description: "Make your first investment of at least $100",
    defaultGoal: 100,
    goalUnit: "dollars",
    defaultDuration: 30,
    rules: [
      "Investment must be in stocks, ETFs, or mutual funds",
      "Retirement accounts count",
      "Must be new money invested",
    ],
    tips: [
      "Start with low-cost index funds",
      "Consider a robo-advisor for beginners",
      "Research before investing",
      "Think long-term",
    ],
    xpReward: 800,
  },
  {
    id: "credit-boost",
    name: "Credit Score Boost",
    type: "credit_improvement",
    description: "Improve your credit score by 20 points",
    defaultGoal: 20,
    goalUnit: "points",
    defaultDuration: 90,
    rules: [
      "Starting score recorded at challenge start",
      "Any positive score change counts",
      "Must check score through the app",
    ],
    tips: [
      "Pay all bills on time",
      "Lower credit utilization below 30%",
      "Dispute any errors on your report",
      "Avoid opening new accounts",
    ],
    xpReward: 1200,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

export class CommunityChallengesService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // CHALLENGE MANAGEMENT
  // ==========================================================================

  async createChallenge(
    challenge: Omit<
      Challenge,
      "id" | "currentParticipants" | "createdAt" | "updatedAt"
    >,
  ): Promise<Challenge> {
    const now = new Date();
    const newChallenge: Challenge = {
      ...challenge,
      id: crypto.randomUUID(),
      currentParticipants: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("community_challenges")
      .insert(this.challengeToDb(newChallenge))
      .select()
      .single();

    if (error) throw error;
    return this.challengeFromDb(data);
  }

  async getActiveChallenes(): Promise<Challenge[]> {
    const { data, error } = await this.supabase
      .from("community_challenges")
      .select("*")
      .eq("status", "active")
      .eq("is_public", true)
      .order("start_date", { ascending: true });

    if (error) throw error;
    return (data || []).map(this.challengeFromDb);
  }

  async getUpcomingChallenges(): Promise<Challenge[]> {
    const { data, error } = await this.supabase
      .from("community_challenges")
      .select("*")
      .eq("status", "upcoming")
      .eq("is_public", true)
      .order("start_date", { ascending: true });

    if (error) throw error;
    return (data || []).map(this.challengeFromDb);
  }

  async getChallengeById(challengeId: string): Promise<Challenge | null> {
    const { data } = await this.supabase
      .from("community_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    return data ? this.challengeFromDb(data) : null;
  }

  // ==========================================================================
  // PARTICIPATION
  // ==========================================================================

  async joinChallenge(
    challengeId: string,
    userId: string,
    startingValue?: number,
  ): Promise<ChallengeParticipant> {
    const challenge = await this.getChallengeById(challengeId);
    if (!challenge) throw new Error("Challenge not found");
    if (challenge.status !== "active" && challenge.status !== "upcoming") {
      throw new Error("Challenge is not open for joining");
    }
    if (
      challenge.maxParticipants &&
      challenge.currentParticipants >= challenge.maxParticipants
    ) {
      throw new Error("Challenge is full");
    }

    const now = new Date();
    const participant: ChallengeParticipant = {
      id: crypto.randomUUID(),
      challengeId,
      userId,
      status: "joined",
      currentProgress: 0,
      goalProgress: 0,
      startingValue,
      earnedBadge: false,
      earnedXp: 0,
      joinedAt: now,
      lastUpdatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("user_challenge_participation")
      .insert(this.participantToDb(participant))
      .select()
      .single();

    if (error) throw error;

    // Increment participant count ATOMICALLY. The previous read-modify-write
    // (currentParticipants + 1) lost an increment whenever two users joined at
    // once — and since the column did not exist, the value was undefined and
    // the expression evaluated to NaN. Uses the same atomic-RPC template as
    // commit d64e8d5.
    const { error: countError } = await this.supabase.rpc(
      "increment_challenge_participants",
      { p_challenge_id: challengeId },
    );

    if (countError) {
      // The participant row is already written; a failed counter must be
      // visible rather than leaving the displayed total silently short.
      console.error("Failed to increment challenge participant count", {
        challengeId,
        error: countError,
      });
    }

    return this.participantFromDb(data);
  }

  async updateProgress(
    participantId: string,
    userId: string,
    newProgress: number,
    currentValue?: number,
  ): Promise<ChallengeParticipant> {
    const { data: participant } = await this.supabase
      .from("user_challenge_participation")
      .select("*, community_challenges(*)")
      .eq("id", participantId)
      .eq("user_id", userId)
      .single();

    if (!participant) throw new Error("Participant not found");

    const challenge = this.challengeFromDb(participant.community_challenges);
    const goalProgress = (newProgress / challenge.goalValue) * 100;
    const isCompleted = goalProgress >= 100;

    const updates: Partial<ChallengeParticipant> = {
      currentProgress: newProgress,
      goalProgress: Math.min(100, goalProgress),
      currentValue,
      status: isCompleted ? "completed" : "active",
      completedAt: isCompleted ? new Date() : undefined,
      lastUpdatedAt: new Date(),
    };

    if (isCompleted && !participant.earned_badge) {
      updates.earnedBadge = !!challenge.badgeId;
      updates.earnedXp = challenge.xpReward;
    }

    const { data, error } = await this.supabase
      .from("user_challenge_participation")
      .update(this.participantToDb(updates))
      .eq("id", participantId)
      .select()
      .single();

    if (error) throw error;
    return this.participantFromDb(data);
  }

  async getUserParticipations(userId: string): Promise<ChallengeParticipant[]> {
    const { data, error } = await this.supabase
      .from("user_challenge_participation")
      .select("*")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(this.participantFromDb);
  }

  async getUserActiveChallenges(
    userId: string,
  ): Promise<{ challenge: Challenge; participation: ChallengeParticipant }[]> {
    const { data, error } = await this.supabase
      .from("user_challenge_participation")
      .select("*, community_challenges(*)")
      .eq("user_id", userId)
      .in("status", ["joined", "active"]);

    if (error) throw error;

    return (data || []).map((row) => ({
      challenge: this.challengeFromDb(row.community_challenges),
      participation: this.participantFromDb(row),
    }));
  }

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================

  async getLeaderboard(
    challengeId: string,
    userId?: string,
    limit: number = 50,
  ): Promise<Leaderboard> {
    // progressPercent is DERIVED from the challenge target, not stored. There
    // has never been a percentage column on user_challenge_participation, so
    // the old `row.goal_progress` was always undefined.
    const { data: challengeRow } = await this.supabase
      .from("community_challenges")
      .select("target_value")
      .eq("id", challengeId)
      .single();
    const challengeTarget = (challengeRow?.target_value as number) ?? 0;

    const { data, error } = await this.supabase
      .from("user_challenge_participation")
      .select("*, profiles(display_name, avatar_url)")
      .eq("challenge_id", challengeId)
      // `goal_progress` is not a column; the real progress value is
      // `current_progress`. Ordering by a nonexistent column errored the
      // whole query, so getLeaderboard threw on every call.
      .order("current_progress", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const entries: LeaderboardEntry[] = (data || []).map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      displayName:
        row.profiles?.display_name || `User ${row.user_id.slice(0, 6)}`,
      avatarUrl: row.profiles?.avatar_url,
      progress: row.current_progress,
      // Derived, not stored. There has never been a percentage column —
      // `goal_progress` resolved to undefined, so every leaderboard entry
      // reported an undefined percent. Computed from the challenge target so
      // the number is real rather than absent.
      progressPercent:
        challengeTarget > 0
          ? Math.min(100, (row.current_progress / challengeTarget) * 100)
          : 0,
      isCurrentUser: row.user_id === userId,
    }));

    // Get total count
    const { count } = await this.supabase
      .from("user_challenge_participation")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId);

    return {
      challengeId,
      entries,
      totalParticipants: count || 0,
      lastUpdated: new Date(),
    };
  }

  async getUserRank(
    challengeId: string,
    userId: string,
  ): Promise<{ rank: number; total: number } | null> {
    const { data } = await this.supabase
      .from("user_challenge_participation")
      // Real column is `current_progress`; `goal_progress` does not exist,
      // so this select errored and getUserRank always resolved to null.
      .select("current_progress")
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    const { count: betterCount } = await this.supabase
      .from("user_challenge_participation")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId)
      .gt("current_progress", data.current_progress);

    const { count: totalCount } = await this.supabase
      .from("user_challenge_participation")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId);

    return {
      rank: (betterCount || 0) + 1,
      total: totalCount || 0,
    };
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  getTemplates(): ChallengeTemplate[] {
    return CHALLENGE_TEMPLATES;
  }

  getTemplateById(templateId: string): ChallengeTemplate | undefined {
    return CHALLENGE_TEMPLATES.find((t) => t.id === templateId);
  }

  createFromTemplate(
    template: ChallengeTemplate,
    startDate: Date,
  ): Omit<Challenge, "id" | "currentParticipants" | "createdAt" | "updatedAt"> {
    const endDate = new Date(
      startDate.getTime() + template.defaultDuration * 24 * 60 * 60 * 1000,
    );

    return {
      name: template.name,
      description: template.description,
      type: template.type,
      status: startDate > new Date() ? "upcoming" : "active",
      startDate,
      endDate,
      goalType: template.goalUnit === "days" ? "streak" : "fixed",
      goalValue: template.defaultGoal,
      goalUnit: template.goalUnit,
      isPublic: true,
      xpReward: template.xpReward,
      rules: template.rules,
      tips: template.tips,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private challengeToDb(
    challenge: Partial<Challenge>,
  ): Record<string, unknown> {
    return {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      type: challenge.type,
      status: challenge.status,
      start_date: challenge.startDate?.toISOString(),
      end_date: challenge.endDate?.toISOString(),
      goal_type: challenge.goalType,
      goal_value: challenge.goalValue,
      goal_unit: challenge.goalUnit,
      max_participants: challenge.maxParticipants,
      current_participants: challenge.currentParticipants,
      is_public: challenge.isPublic,
      xp_reward: challenge.xpReward,
      badge_id: challenge.badgeId,
      prize_pool: challenge.prizePool,
      rules: challenge.rules,
      tips: challenge.tips,
      image_url: challenge.imageUrl,
      sponsored_by: challenge.sponsoredBy,
      created_at: challenge.createdAt?.toISOString(),
      updated_at: challenge.updatedAt?.toISOString(),
    };
  }

  private challengeFromDb(data: Record<string, unknown>): Challenge {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string,
      type: data.type as ChallengeType,
      status: data.status as ChallengeStatus,
      startDate: new Date(data.start_date as string),
      endDate: new Date(data.end_date as string),
      goalType: data.goal_type as "fixed" | "percentage" | "streak",
      goalValue: data.goal_value as number,
      goalUnit: data.goal_unit as string,
      maxParticipants: data.max_participants as number | undefined,
      currentParticipants: data.current_participants as number,
      isPublic: data.is_public as boolean,
      xpReward: data.xp_reward as number,
      badgeId: data.badge_id as string | undefined,
      prizePool: data.prize_pool as number | undefined,
      rules: data.rules as string[],
      tips: data.tips as string[],
      imageUrl: data.image_url as string | undefined,
      sponsoredBy: data.sponsored_by as string | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }

  private participantToDb(
    participant: Partial<ChallengeParticipant>,
  ): Record<string, unknown> {
    return {
      id: participant.id,
      challenge_id: participant.challengeId,
      user_id: participant.userId,
      status: participant.status,
      current_progress: participant.currentProgress,
      starting_value: participant.startingValue,
      current_value: participant.currentValue,
      rank: participant.rank,
      earned_badge: participant.earnedBadge,
      earned_xp: participant.earnedXp,
      joined_at: participant.joinedAt?.toISOString(),
      completed_at: participant.completedAt?.toISOString(),
      last_updated_at: participant.lastUpdatedAt?.toISOString(),
    };
  }

  private participantFromDb(
    data: Record<string, unknown>,
  ): ChallengeParticipant {
    return {
      id: data.id as string,
      challengeId: data.challenge_id as string,
      userId: data.user_id as string,
      status: data.status as ParticipantStatus,
      currentProgress: data.current_progress as number,
      // Derived from current_progress against the challenge target; there is
      // no stored percentage column, and adding one would invite drift.
      goalProgress: undefined,
      startingValue: data.starting_value as number | undefined,
      currentValue: data.current_value as number | undefined,
      rank: data.rank as number | undefined,
      earnedBadge: data.earned_badge as boolean,
      earnedXp: data.earned_xp as number,
      joinedAt: new Date(data.joined_at as string),
      completedAt: data.completed_at
        ? new Date(data.completed_at as string)
        : undefined,
      lastUpdatedAt: new Date(data.last_updated_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let communityChallengesServiceInstance: CommunityChallengesService | null =
  null;

export function getCommunityChallengesService(): CommunityChallengesService {
  if (!communityChallengesServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    communityChallengesServiceInstance = new CommunityChallengesService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return communityChallengesServiceInstance;
}
