/**
 * Social Proof Nudges Service
 *
 * Anonymized, aggregated social proof messaging:
 * - "Users like you saved an average of $X this month"
 * - Peer comparison insights
 * - Behavioral nudges based on cohort data
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type NudgeCategory =
  | "savings"
  | "spending"
  | "debt"
  | "credit"
  | "investment"
  | "budget"
  | "goals";

export type CohortType =
  | "age_group"
  | "income_bracket"
  | "location"
  | "credit_score_range"
  | "financial_goal";

export interface SocialProofNudge {
  id: string;
  category: NudgeCategory;
  message: string;
  cohortDescription: string;
  statistic: string;
  percentile?: number;
  actionSuggestion?: string;
  relevanceScore: number;
  createdAt: Date;
}

export interface CohortStats {
  cohortType: CohortType;
  cohortValue: string;
  memberCount: number;
  stats: {
    averageSavingsRate: number;
    averageDebtPayoff: number;
    averageCreditScore: number;
    averageInvestmentReturn: number;
    budgetAdherenceRate: number;
    goalCompletionRate: number;
  };
  lastUpdated: Date;
}

export interface UserCohortComparison {
  category: NudgeCategory;
  userValue: number;
  cohortAverage: number;
  cohortMedian: number;
  cohortTop25: number;
  percentile: number;
  trend: "above" | "at" | "below";
  improvement: number;
}

export interface NudgePreferences {
  userId: string;
  enabled: boolean;
  categories: NudgeCategory[];
  frequency: "daily" | "weekly" | "monthly";
  preferredTime?: string;
  lastNudgeAt?: Date;
}

// ============================================================================
// NUDGE TEMPLATES
// ============================================================================

const NUDGE_TEMPLATES: Record<
  NudgeCategory,
  { above: string[]; at: string[]; below: string[] }
> = {
  savings: {
    above: [
      "You're saving {percent}% more than similar users! Keep up the great work! ",
      "Top saver alert! You're in the top {percentile}% of savers in your group.",
      "Your savings rate beats {percent}% of users like you. Impressive! ",
    ],
    at: [
      "You're right on track! Users like you save about ${amount}/month on average.",
      "Nice work! Your savings match the average for people with similar goals.",
    ],
    below: [
      "Users like you save an average of ${amount}/month. You could save ${gap} more!",
      "Small boost opportunity: Adding just ${suggestion}/week would put you above average.",
      "{percent}% of similar users are saving more. Here's how you can catch up →",
    ],
  },
  spending: {
    above: [
      "Your spending is {percent}% lower than average. Financial discipline! ",
      "Budget champion! You spend less than {percentile}% of similar users.",
    ],
    at: ["Your spending is typical for your income level. Stay mindful!"],
    below: [
      "Heads up: You're spending {percent}% more than similar users this month.",
      "Users with your income typically spend ${amount} less on {category}.",
    ],
  },
  debt: {
    above: [
      "Debt crusher! You're paying off {percent}% faster than average. ",
      "Your debt payoff rate is in the top {percentile}%!",
    ],
    at: [
      "You're making steady progress on debt, similar to others in your situation.",
    ],
    below: [
      "Users like you pay an extra ${amount}/month toward debt. Consider increasing yours!",
      "Boosting your payment by ${suggestion} would move you ahead of {percent}% of users.",
    ],
  },
  credit: {
    above: [
      "Your credit score improved {points} points! That's {percent}% faster than average.",
      "Credit star! Your score growth beats {percentile}% of similar users.",
    ],
    at: [
      "Your credit is improving at a healthy pace, similar to others rebuilding.",
    ],
    below: [
      "Users with similar profiles improved {points} points last month. You can too!",
      "Try these actions that helped {percent}% of similar users boost their score →",
    ],
  },
  investment: {
    above: [
      "Your portfolio is outperforming {percent}% of similar investors! ",
      "Investment ace! Your returns beat the cohort average by {percent}%.",
    ],
    at: ["Your investment strategy is performing in line with similar users."],
    below: [
      "Consider: {percent}% of similar investors are seeing better returns with diversification.",
      "Users like you who invested ${amount}/month saw {percent}% better returns.",
    ],
  },
  budget: {
    above: [
      "Budget boss! You've stayed on budget {days} more days than average this month.",
      "Top {percentile}% of budgeters! Your discipline is paying off.",
    ],
    at: ["You're budgeting like a pro! Right in line with successful users."],
    below: [
      "{percent}% of similar users stayed within budget this week. You've got this!",
      "Tip: Users who track daily stay on budget {percent}% more often.",
    ],
  },
  goals: {
    above: [
      "Goal getter! You're {percent}% ahead of schedule compared to similar users.",
      "You're completing goals {percent}% faster than average!",
    ],
    at: ["You're progressing toward goals at a steady pace. Keep it up!"],
    below: [
      "Users with similar goals are {percent}% further along. Let's catch up!",
      "Breaking your goal into smaller milestones helped {percent}% of users succeed.",
    ],
  },
};

// ============================================================================
// SERVICE
// ============================================================================

export class SocialProofNudgesService {
  private readonly supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // NUDGE GENERATION
  // ==========================================================================

  async generateNudgesForUser(userId: string): Promise<SocialProofNudge[]> {
    const preferences = await this.getPreferences(userId);
    if (!preferences?.enabled) return [];

    const comparisons = await this.getUserComparisons(userId);
    const nudges: SocialProofNudge[] = [];

    for (const comparison of comparisons) {
      if (!preferences.categories.includes(comparison.category)) continue;

      const nudge = this.createNudgeFromComparison(comparison);
      if (nudge) nudges.push(nudge);
    }

    // Sort by relevance and limit
    return nudges
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  }

  private createNudgeFromComparison(
    comparison: UserCohortComparison,
  ): SocialProofNudge | null {
    const templates = NUDGE_TEMPLATES[comparison.category];
    const trendTemplates = templates[comparison.trend];

    if (!trendTemplates || trendTemplates.length === 0) return null;

    const template =
      trendTemplates[Math.floor(Math.random() * trendTemplates.length)];
    const message = this.fillTemplate(template, comparison);

    return {
      id: crypto.randomUUID(),
      category: comparison.category,
      message,
      cohortDescription: "users with similar financial profiles",
      statistic: `${comparison.percentile}th percentile`,
      percentile: comparison.percentile,
      relevanceScore: this.calculateRelevance(comparison),
      createdAt: new Date(),
    };
  }

  private fillTemplate(
    template: string,
    comparison: UserCohortComparison,
  ): string {
    return template
      .replace("{percent}", Math.abs(comparison.improvement).toFixed(0))
      .replace("{percentile}", comparison.percentile.toFixed(0))
      .replace("{amount}", comparison.cohortAverage.toFixed(0))
      .replace(
        "{gap}",
        Math.abs(comparison.cohortAverage - comparison.userValue).toFixed(0),
      )
      .replace(
        "{suggestion}",
        (Math.abs(comparison.cohortAverage - comparison.userValue) / 4).toFixed(
          0,
        ),
      )
      .replace("{points}", Math.abs(comparison.improvement).toFixed(0))
      .replace("{days}", Math.abs(comparison.improvement).toFixed(0))
      .replace("{category}", comparison.category);
  }

  private calculateRelevance(comparison: UserCohortComparison): number {
    // Higher relevance for bigger gaps and actionable improvements
    const gapScore = Math.min(Math.abs(comparison.improvement) / 50, 1);
    const actionabilityScore = comparison.trend === "below" ? 0.8 : 0.5;
    return gapScore * actionabilityScore * 100;
  }

  // ==========================================================================
  // COHORT COMPARISONS
  // ==========================================================================

  async getUserComparisons(userId: string): Promise<UserCohortComparison[]> {
    // In production, this would fetch real user data and compare to cohort stats
    // For now, return mock comparisons
    return [
      {
        category: "savings",
        userValue: 450,
        cohortAverage: 520,
        cohortMedian: 480,
        cohortTop25: 750,
        percentile: 42,
        trend: "below",
        improvement: -13.5,
      },
      {
        category: "spending",
        userValue: 2800,
        cohortAverage: 3100,
        cohortMedian: 2950,
        cohortTop25: 2400,
        percentile: 65,
        trend: "above",
        improvement: 9.7,
      },
      {
        category: "debt",
        userValue: 380,
        cohortAverage: 350,
        cohortMedian: 320,
        cohortTop25: 500,
        percentile: 58,
        trend: "above",
        improvement: 8.6,
      },
      {
        category: "credit",
        userValue: 12,
        cohortAverage: 15,
        cohortMedian: 12,
        cohortTop25: 25,
        percentile: 50,
        trend: "at",
        improvement: 0,
      },
      {
        category: "budget",
        userValue: 18,
        cohortAverage: 21,
        cohortMedian: 20,
        cohortTop25: 28,
        percentile: 38,
        trend: "below",
        improvement: -14.3,
      },
    ];
  }

  async getCohortStats(
    cohortType: CohortType,
    cohortValue: string,
  ): Promise<CohortStats | null> {
    const { data } = await this.supabase
      .from("cohort_stats")
      .select("*")
      .eq("cohort_type", cohortType)
      .eq("cohort_value", cohortValue)
      .single();

    return data ? this.statsFromDb(data) : null;
  }

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  async getPreferences(userId: string): Promise<NudgePreferences | null> {
    const { data } = await this.supabase
      .from("nudge_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!data) {
      // Return default preferences
      return {
        userId,
        enabled: true,
        categories: [
          "savings",
          "spending",
          "debt",
          "credit",
          "budget",
          "goals",
        ],
        frequency: "weekly",
      };
    }

    return this.preferencesFromDb(data);
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NudgePreferences>,
  ): Promise<NudgePreferences> {
    const existing = await this.getPreferences(userId);
    const newPrefs: NudgePreferences = {
      userId,
      enabled: updates.enabled ?? existing?.enabled ?? true,
      categories: updates.categories ??
        existing?.categories ?? [
          "savings",
          "spending",
          "debt",
          "credit",
          "budget",
          "goals",
        ],
      frequency: updates.frequency ?? existing?.frequency ?? "weekly",
      preferredTime: updates.preferredTime ?? existing?.preferredTime,
      lastNudgeAt: updates.lastNudgeAt ?? existing?.lastNudgeAt,
    };

    const { data, error } = await this.supabase
      .from("nudge_preferences")
      .upsert(this.preferencesToDb(newPrefs))
      .select()
      .single();

    if (error) throw error;
    return this.preferencesFromDb(data);
  }

  async disableNudges(userId: string): Promise<void> {
    await this.updatePreferences(userId, { enabled: false });
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async recordNudgeImpression(nudgeId: string, userId: string): Promise<void> {
    await this.supabase.from("nudge_impressions").insert({
      id: crypto.randomUUID(),
      nudge_id: nudgeId,
      user_id: userId,
      action: "viewed",
      created_at: new Date().toISOString(),
    });
  }

  async recordNudgeAction(
    nudgeId: string,
    userId: string,
    action: "clicked" | "dismissed" | "acted",
  ): Promise<void> {
    await this.supabase.from("nudge_impressions").insert({
      id: crypto.randomUUID(),
      nudge_id: nudgeId,
      user_id: userId,
      action,
      created_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private statsFromDb(data: Record<string, unknown>): CohortStats {
    return {
      cohortType: data.cohort_type as CohortType,
      cohortValue: data.cohort_value as string,
      memberCount: data.member_count as number,
      stats: data.stats as CohortStats["stats"],
      lastUpdated: new Date(data.last_updated as string),
    };
  }

  private preferencesToDb(prefs: NudgePreferences): Record<string, unknown> {
    return {
      user_id: prefs.userId,
      enabled: prefs.enabled,
      categories: prefs.categories,
      frequency: prefs.frequency,
      preferred_time: prefs.preferredTime,
      last_nudge_at: prefs.lastNudgeAt?.toISOString(),
    };
  }

  private preferencesFromDb(data: Record<string, unknown>): NudgePreferences {
    return {
      userId: data.user_id as string,
      enabled: data.enabled as boolean,
      categories: data.categories as NudgeCategory[],
      frequency: data.frequency as NudgePreferences["frequency"],
      preferredTime: data.preferred_time as string | undefined,
      lastNudgeAt: data.last_nudge_at
        ? new Date(data.last_nudge_at as string)
        : undefined,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let socialProofNudgesServiceInstance: SocialProofNudgesService | null = null;

export function getSocialProofNudgesService(): SocialProofNudgesService {
  if (!socialProofNudgesServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    socialProofNudgesServiceInstance = new SocialProofNudgesService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return socialProofNudgesServiceInstance;
}
