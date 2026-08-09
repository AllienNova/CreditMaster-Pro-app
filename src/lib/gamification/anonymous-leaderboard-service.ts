/**
 * Anonymous Leaderboard Service
 *
 * Privacy-first leaderboards showing progress without revealing personal details:
 * - Percentile rankings
 * - Category-specific leaderboards
 * - Opt-in participation
 * - Anonymous usernames
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type LeaderboardCategory =
  | "savings_rate"
  | "debt_payoff"
  | "credit_score"
  | "net_worth_growth"
  | "budget_streak"
  | "investment_returns"
  | "vitality_score";

export type TimeFrame =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "all_time";

export interface LeaderboardEntry {
  rank: number;
  anonymousId: string;
  displayName: string;
  score: number;
  percentile: number;
  change: number; // Position change from last period
  isCurrentUser: boolean;
  badge?: string;
  streak?: number;
}

export interface Leaderboard {
  id: string;
  category: LeaderboardCategory;
  timeFrame: TimeFrame;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: Date;

  // User's position
  userRank?: number;
  userPercentile?: number;
  userScore?: number;
}

export interface LeaderboardParticipation {
  id: string;
  userId: string;
  anonymousId: string;
  displayName: string;

  // Opt-in settings
  optedIn: boolean;
  categories: LeaderboardCategory[];

  // Privacy settings
  showStreak: boolean;
  showBadge: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserScore {
  userId: string;
  category: LeaderboardCategory;
  score: number;
  previousScore?: number;
  previousRank?: number;
  calculatedAt: Date;
}

export interface LeaderboardStats {
  category: LeaderboardCategory;
  average: number;
  median: number;
  top10Percent: number;
  top25Percent: number;
  participantCount: number;
}

// ============================================================================
// ANONYMOUS NAME GENERATOR
// ============================================================================

const ADJECTIVES = [
  "Swift",
  "Bold",
  "Clever",
  "Bright",
  "Keen",
  "Noble",
  "Wise",
  "Lucky",
  "Steady",
  "Golden",
  "Silver",
  "Crystal",
  "Emerald",
  "Ruby",
  "Diamond",
  "Cosmic",
  "Stellar",
  "Solar",
  "Lunar",
  "Thunder",
  "Storm",
  "Frost",
  "Blazing",
  "Silent",
  "Mighty",
  "Gentle",
  "Fierce",
  "Calm",
  "Brave",
];

const NOUNS = [
  "Saver",
  "Builder",
  "Climber",
  "Runner",
  "Warrior",
  "Knight",
  "Wizard",
  "Phoenix",
  "Dragon",
  "Eagle",
  "Tiger",
  "Lion",
  "Wolf",
  "Bear",
  "Hawk",
  "Pioneer",
  "Champion",
  "Master",
  "Expert",
  "Guru",
  "Sage",
  "Scholar",
  "Trader",
  "Investor",
  "Planner",
  "Achiever",
  "Winner",
  "Crusher",
  "Slayer",
];

function generateAnonymousName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

// ============================================================================
// CATEGORY CONFIGS
// ============================================================================

const CATEGORY_CONFIG: Record<
  LeaderboardCategory,
  {
    name: string;
    description: string;
    unit: string;
    higherIsBetter: boolean;
    scoreCalculation: string;
  }
> = {
  savings_rate: {
    name: "Savings Rate Champions",
    description: "Ranked by percentage of income saved",
    unit: "%",
    higherIsBetter: true,
    scoreCalculation: "(savings / income) * 100",
  },
  debt_payoff: {
    name: "Debt Crushers",
    description: "Ranked by debt paid off this period",
    unit: "$",
    higherIsBetter: true,
    scoreCalculation: "total debt paid off",
  },
  credit_score: {
    name: "Credit Climbers",
    description: "Ranked by credit score improvement",
    unit: "pts",
    higherIsBetter: true,
    scoreCalculation: "score change this period",
  },
  net_worth_growth: {
    name: "Wealth Builders",
    description: "Ranked by net worth growth percentage",
    unit: "%",
    higherIsBetter: true,
    scoreCalculation: "((current - previous) / previous) * 100",
  },
  budget_streak: {
    name: "Budget Bosses",
    description: "Ranked by consecutive days within budget",
    unit: "days",
    higherIsBetter: true,
    scoreCalculation: "consecutive budget days",
  },
  investment_returns: {
    name: "Investment Aces",
    description: "Ranked by investment return percentage",
    unit: "%",
    higherIsBetter: true,
    scoreCalculation: "portfolio return %",
  },
  vitality_score: {
    name: "Financial Wellness",
    description: "Ranked by overall financial health score",
    unit: "pts",
    higherIsBetter: true,
    scoreCalculation: "vitality score",
  },
};

// ============================================================================
// SERVICE
// ============================================================================

export class AnonymousLeaderboardService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // PARTICIPATION
  // ==========================================================================

  async optIn(
    userId: string,
    categories: LeaderboardCategory[],
  ): Promise<LeaderboardParticipation> {
    const existing = await this.getParticipation(userId);

    if (existing) {
      return this.updateParticipation(userId, { optedIn: true, categories });
    }

    const now = new Date();
    const participation: LeaderboardParticipation = {
      id: crypto.randomUUID(),
      userId,
      anonymousId: crypto.randomUUID(),
      displayName: generateAnonymousName(),
      optedIn: true,
      categories,
      showStreak: true,
      showBadge: true,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await this.supabase
      .from("leaderboard_participation")
      .insert(this.participationToDb(participation))
      .select()
      .single();

    if (error) throw error;
    return this.participationFromDb(data);
  }

  async optOut(userId: string): Promise<void> {
    await this.supabase
      .from("leaderboard_participation")
      .update({ opted_in: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  async getParticipation(
    userId: string,
  ): Promise<LeaderboardParticipation | null> {
    const { data } = await this.supabase
      .from("leaderboard_participation")
      .select("*")
      .eq("user_id", userId)
      .single();

    return data ? this.participationFromDb(data) : null;
  }

  async updateParticipation(
    userId: string,
    updates: Partial<LeaderboardParticipation>,
  ): Promise<LeaderboardParticipation> {
    const { data, error } = await this.supabase
      .from("leaderboard_participation")
      .update({
        ...this.participationToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return this.participationFromDb(data);
  }

  async regenerateAnonymousName(userId: string): Promise<string> {
    const newName = generateAnonymousName();
    await this.updateParticipation(userId, { displayName: newName });
    return newName;
  }

  // ==========================================================================
  // LEADERBOARDS
  // ==========================================================================

  async getLeaderboard(
    category: LeaderboardCategory,
    timeFrame: TimeFrame,
    userId?: string,
    limit: number = 100,
  ): Promise<Leaderboard> {
    // Get all scores for this category and time frame
    const { data: scores, error } = await this.supabase
      .from("leaderboard_scores")
      .select("*, leaderboard_participation(*)")
      .eq("category", category)
      .eq("time_frame", timeFrame)
      .order("score", { ascending: !CATEGORY_CONFIG[category].higherIsBetter })
      .limit(limit);

    if (error) throw error;

    const entries: LeaderboardEntry[] = (scores || []).map((row, index) => {
      const participation = row.leaderboard_participation;
      return {
        rank: index + 1,
        anonymousId: participation?.anonymous_id || "unknown",
        displayName: participation?.display_name || "Anonymous",
        score: row.score,
        percentile: 0, // Calculate below
        change: row.previous_rank ? row.previous_rank - (index + 1) : 0,
        isCurrentUser: userId ? row.user_id === userId : false,
        badge: participation?.show_badge ? row.badge : undefined,
        streak: participation?.show_streak ? row.streak : undefined,
      };
    });

    // Calculate percentiles
    const totalParticipants = entries.length;
    entries.forEach((entry, index) => {
      entry.percentile =
        ((totalParticipants - index) / totalParticipants) * 100;
    });

    // Find user's position
    const userEntry = entries.find((e) => e.isCurrentUser);

    return {
      id: `${category}-${timeFrame}`,
      category,
      timeFrame,
      entries,
      totalParticipants,
      lastUpdated: new Date(),
      userRank: userEntry?.rank,
      userPercentile: userEntry?.percentile,
      userScore: userEntry?.score,
    };
  }

  async getUserRankings(userId: string): Promise<
    {
      category: LeaderboardCategory;
      rank: number;
      percentile: number;
      score: number;
    }[]
  > {
    const participation = await this.getParticipation(userId);
    if (!participation || !participation.optedIn) return [];

    const rankings: {
      category: LeaderboardCategory;
      rank: number;
      percentile: number;
      score: number;
    }[] = [];

    for (const category of participation.categories) {
      const leaderboard = await this.getLeaderboard(
        category,
        "monthly",
        userId,
      );
      if (leaderboard.userRank) {
        rankings.push({
          category,
          rank: leaderboard.userRank,
          percentile: leaderboard.userPercentile || 0,
          score: leaderboard.userScore || 0,
        });
      }
    }

    return rankings;
  }

  // ==========================================================================
  // SCORE SUBMISSION
  // ==========================================================================

  async submitScore(
    userId: string,
    category: LeaderboardCategory,
    score: number,
    timeFrame: TimeFrame = "monthly",
  ): Promise<void> {
    const participation = await this.getParticipation(userId);
    if (
      !participation?.optedIn ||
      !participation.categories.includes(category)
    ) {
      return; // User not opted in for this category
    }

    // Get previous score
    const { data: existing } = await this.supabase
      .from("leaderboard_scores")
      .select("score, rank")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("time_frame", timeFrame)
      .single();

    const now = new Date();

    if (existing) {
      await this.supabase
        .from("leaderboard_scores")
        .update({
          score,
          previous_score: existing.score,
          previous_rank: existing.rank,
          calculated_at: now.toISOString(),
        })
        .eq("user_id", userId)
        .eq("category", category)
        .eq("time_frame", timeFrame);
    } else {
      await this.supabase.from("leaderboard_scores").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        category,
        time_frame: timeFrame,
        score,
        calculated_at: now.toISOString(),
      });
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  async getLeaderboardStats(
    category: LeaderboardCategory,
    timeFrame: TimeFrame = "monthly",
  ): Promise<LeaderboardStats> {
    const { data: scores } = await this.supabase
      .from("leaderboard_scores")
      .select("score")
      .eq("category", category)
      .eq("time_frame", timeFrame)
      .order("score", { ascending: !CATEGORY_CONFIG[category].higherIsBetter });

    if (!scores || scores.length === 0) {
      return {
        category,
        average: 0,
        median: 0,
        top10Percent: 0,
        top25Percent: 0,
        participantCount: 0,
      };
    }

    const sortedScores = scores.map((s) => s.score).sort((a, b) => b - a);
    const sum = sortedScores.reduce((a, b) => a + b, 0);
    const average = sum / sortedScores.length;
    const median = sortedScores[Math.floor(sortedScores.length / 2)];
    const top10Index = Math.floor(sortedScores.length * 0.1);
    const top25Index = Math.floor(sortedScores.length * 0.25);

    return {
      category,
      average,
      median,
      top10Percent: sortedScores[top10Index] || sortedScores[0],
      top25Percent: sortedScores[top25Index] || sortedScores[0],
      participantCount: sortedScores.length,
    };
  }

  // ==========================================================================
  // CATEGORY INFO
  // ==========================================================================

  getCategoryInfo(category: LeaderboardCategory) {
    return CATEGORY_CONFIG[category];
  }

  getAllCategories(): {
    category: LeaderboardCategory;
    info: (typeof CATEGORY_CONFIG)[LeaderboardCategory];
  }[] {
    return Object.entries(CATEGORY_CONFIG).map(([category, info]) => ({
      category: category as LeaderboardCategory,
      info,
    }));
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private participationToDb(
    participation: Partial<LeaderboardParticipation>,
  ): Record<string, unknown> {
    return {
      id: participation.id,
      user_id: participation.userId,
      anonymous_id: participation.anonymousId,
      display_name: participation.displayName,
      opted_in: participation.optedIn,
      categories: participation.categories,
      show_streak: participation.showStreak,
      show_badge: participation.showBadge,
      created_at: participation.createdAt?.toISOString(),
      updated_at: participation.updatedAt?.toISOString(),
    };
  }

  private participationFromDb(
    data: Record<string, unknown>,
  ): LeaderboardParticipation {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      anonymousId: data.anonymous_id as string,
      displayName: data.display_name as string,
      optedIn: data.opted_in as boolean,
      categories: data.categories as LeaderboardCategory[],
      showStreak: data.show_streak as boolean,
      showBadge: data.show_badge as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let anonymousLeaderboardServiceInstance: AnonymousLeaderboardService | null =
  null;

export function getAnonymousLeaderboardService(): AnonymousLeaderboardService {
  if (!anonymousLeaderboardServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    anonymousLeaderboardServiceInstance = new AnonymousLeaderboardService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return anonymousLeaderboardServiceInstance;
}
