/**
 * Fynvita AI Behavioral Finance Coach
 * Provides personalized coaching sessions and financial personality insights
 */

import { createClient } from "@supabase/supabase-js";
import {
  UserFinancialProfile,
  AICoachingSession,
  CoachingContent,
  CoachingInsight,
  ActionItem,
  CoachingSessionType,
  BehavioralAssessment,
  RiskToleranceResult,
  PersonalityResult,
  BiasAnalysisResult,
  FinancialPersonality,
  BehavioralBias,
  GoalTracking,
  UserBiases,
} from "./types";

// ============================================================================
// COACHING CONTENT LIBRARY
// ============================================================================

const COACHING_TOPICS: Record<CoachingSessionType, string[]> = {
  onboarding: [
    "Welcome to Your Financial Journey",
    "Understanding Your Financial Personality",
    "Setting Your First Goals",
    "Building Healthy Money Habits",
  ],
  weekly_review: [
    "Your Week in Numbers",
    "Spending Highlights",
    "Progress Toward Goals",
    "Areas for Improvement",
  ],
  goal_check: [
    "Goal Progress Update",
    "Adjusting Your Timeline",
    "Celebrating Milestones",
    "Overcoming Obstacles",
  ],
  crisis: [
    "Addressing Overspending",
    "Emergency Budget Mode",
    "Getting Back on Track",
    "Financial Recovery Plan",
  ],
  celebration: [
    "You Did It!",
    "Milestone Achievement",
    "Reward Yourself",
    "What's Next?",
  ],
  education: [
    "Understanding Compound Interest",
    "The Psychology of Spending",
    "Building an Emergency Fund",
    "Investment Basics",
    "Credit Score Fundamentals",
    "Debt Payoff Strategies",
  ],
};

const PERSONALITY_DESCRIPTIONS: Record<FinancialPersonality, string> = {
  saver:
    "You prioritize security and building reserves. You're disciplined with money and prefer to save before spending.",
  spender:
    "You enjoy the present moment and believe in enjoying life's experiences. Balance is key for long-term success.",
  investor:
    "You see money as a tool for growth. You're comfortable with calculated risks for potential returns.",
  balanced:
    "You maintain equilibrium between saving, spending, and investing. You adapt well to different situations.",
  cautious:
    "You prefer stability and guaranteed outcomes. Security is your primary financial motivator.",
  aggressive:
    "You pursue high-growth opportunities and are comfortable with volatility for potential higher returns.",
};

const BIAS_INTERVENTIONS: Record<BehavioralBias, string[]> = {
  loss_aversion: [
    "Try framing decisions in terms of gains rather than losses.",
    "Remember that avoiding all risk can be risky itself (inflation, missed opportunities).",
    "Set automatic investments to remove emotional decision-making.",
  ],
  anchoring: [
    "Compare prices across multiple sources before making purchase decisions.",
    'Focus on value rather than discounts or "original" prices.',
    "Reset your reference points periodically by researching market rates.",
  ],
  mental_accounting: [
    "Consider all money as fungible - a dollar is a dollar regardless of source.",
    "Consolidate accounts where practical to see your full financial picture.",
    'Don\'t treat "found money" differently than earned money.',
  ],
  overconfidence: [
    "Track your predictions and actual outcomes to calibrate confidence.",
    "Seek diverse opinions before major financial decisions.",
    "Build in buffers for unexpected outcomes in your plans.",
  ],
  herding: [
    "Develop your own investment thesis before researching what others are doing.",
    "Remember that popular decisions aren't always the best decisions.",
    "Focus on your personal goals rather than following trends.",
  ],
  present_bias: [
    "Use commitment devices like automatic transfers to your future self.",
    "Visualize your future goals regularly to make them feel more real.",
    "Create friction for impulse purchases (waiting periods, removing saved cards).",
  ],
  confirmation_bias: [
    "Actively seek out information that challenges your current beliefs.",
    "Consider the opposite of your initial conclusion before deciding.",
    "Discuss financial decisions with people who have different perspectives.",
  ],
  sunk_cost_fallacy: [
    "Focus on future value, not past investments, when making decisions.",
    'Ask yourself: "If I were starting fresh today, would I make this choice?"',
    "Set clear exit criteria before starting any investment or commitment.",
  ],
};

// ============================================================================
// BEHAVIORAL COACH CLASS
// ============================================================================

export class BehavioralCoach {
  private readonly supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // --------------------------------------------------------------------------
  // FINANCIAL PROFILE MANAGEMENT
  // --------------------------------------------------------------------------

  async getUserProfile(userId: string): Promise<UserFinancialProfile | null> {
    const { data, error } = await this.supabase
      .from("user_financial_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUserFinancialProfile(data);
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserFinancialProfile>,
  ): Promise<UserFinancialProfile> {
    const { data, error } = await this.supabase
      .from("user_financial_profiles")
      .update({
        risk_tolerance_score: updates.riskToleranceScore,
        financial_personality: updates.financialPersonality,
        primary_goals: updates.primaryGoals,
        spending_triggers: updates.spendingTriggers,
        preferred_notification_time: updates.preferredNotificationTime,
        preferred_notification_days: updates.preferredNotificationDays,
        communication_tone: updates.communicationTone,
        biases: updates.biases,
        last_assessment_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return this.mapToUserFinancialProfile(data);
  }

  // --------------------------------------------------------------------------
  // BEHAVIORAL ASSESSMENT
  // --------------------------------------------------------------------------

  async conductAssessment(
    userId: string,
    responses: AssessmentResponses,
  ): Promise<BehavioralAssessment> {
    // Calculate risk tolerance
    const riskTolerance = this.calculateRiskTolerance(responses.riskQuestions);

    // Determine financial personality
    const financialPersonality = this.determinePersonality(
      responses.personalityQuestions,
    );

    // Analyze biases
    const biasAnalysis = this.analyzeBiases(responses.biasQuestions);

    // Generate recommendations
    const recommendations = this.generateAssessmentRecommendations(
      riskTolerance,
      financialPersonality,
      biasAnalysis,
    );

    // Update user profile with results
    await this.updateUserProfile(userId, {
      riskToleranceScore: riskTolerance.score,
      financialPersonality: financialPersonality.primary,
      biases: {
        lossAversion: biasAnalysis.biasScores.loss_aversion,
        anchoring: biasAnalysis.biasScores.anchoring,
        mentalAccounting: biasAnalysis.biasScores.mental_accounting,
        overconfidence: biasAnalysis.biasScores.overconfidence,
        herding: biasAnalysis.biasScores.herding,
        presentBias: biasAnalysis.biasScores.present_bias,
      },
    });

    return {
      userId,
      assessmentDate: new Date().toISOString(),
      riskTolerance,
      financialPersonality,
      biasAnalysis,
      recommendations,
    };
  }

  private calculateRiskTolerance(
    responses: RiskQuestionResponse[],
  ): RiskToleranceResult {
    const factors = {
      timeHorizon: 0,
      lossComfort: 0,
      volatilityTolerance: 0,
      financialKnowledge: 0,
    };

    // Calculate factor scores from responses
    for (const response of responses) {
      switch (response.questionType) {
        case "time_horizon":
          factors.timeHorizon = response.value;
          break;
        case "loss_comfort":
          factors.lossComfort = response.value;
          break;
        case "volatility":
          factors.volatilityTolerance = response.value;
          break;
        case "knowledge":
          factors.financialKnowledge = response.value;
          break;
      }
    }

    // Calculate overall score (weighted average)
    const score =
      Math.round(
        (factors.timeHorizon * 0.3 +
          factors.lossComfort * 0.3 +
          factors.volatilityTolerance * 0.25 +
          factors.financialKnowledge * 0.15) *
          10,
      ) / 10;

    // Determine category
    let category: "conservative" | "moderate" | "aggressive";
    if (score <= 3.5) category = "conservative";
    else if (score <= 6.5) category = "moderate";
    else category = "aggressive";

    return { score, category, factors };
  }

  private determinePersonality(
    responses: PersonalityQuestionResponse[],
  ): PersonalityResult {
    const scores: Record<FinancialPersonality, number> = {
      saver: 0,
      spender: 0,
      investor: 0,
      balanced: 0,
      cautious: 0,
      aggressive: 0,
    };

    // Calculate personality scores from responses
    for (const response of responses) {
      for (const [personality, weight] of Object.entries(response.weights)) {
        scores[personality as FinancialPersonality] += weight * response.value;
      }
    }

    // Find primary and secondary personalities
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const primary = sorted[0][0] as FinancialPersonality;
    const secondary =
      sorted[1][1] > sorted[0][1] * 0.7
        ? (sorted[1][0] as FinancialPersonality)
        : null;

    // Generate traits
    const traits = this.generatePersonalityTraits(primary, scores);

    return { primary, secondary, traits };
  }

  private generatePersonalityTraits(
    primary: FinancialPersonality,
    scores: Record<FinancialPersonality, number>,
  ): { trait: string; score: number; description: string }[] {
    const traitMap: Record<FinancialPersonality, string[]> = {
      saver: ["Disciplined", "Security-focused", "Patient"],
      spender: ["Experiential", "Present-focused", "Generous"],
      investor: ["Growth-oriented", "Analytical", "Risk-aware"],
      balanced: ["Adaptable", "Moderate", "Pragmatic"],
      cautious: ["Careful", "Methodical", "Risk-averse"],
      aggressive: ["Bold", "Opportunity-seeking", "Confident"],
    };

    return traitMap[primary].map((trait, index) => ({
      trait,
      score: Math.round((scores[primary] / 10) * (1 - index * 0.1) * 100) / 100,
      description: `Your ${trait.toLowerCase()} nature helps guide your financial decisions.`,
    }));
  }

  private analyzeBiases(responses: BiasQuestionResponse[]): BiasAnalysisResult {
    const biasScores: Record<BehavioralBias, number> = {
      loss_aversion: 0,
      anchoring: 0,
      mental_accounting: 0,
      overconfidence: 0,
      herding: 0,
      present_bias: 0,
      confirmation_bias: 0,
      sunk_cost_fallacy: 0,
    };

    // Calculate bias scores from responses
    for (const response of responses) {
      biasScores[response.biasType] += response.value * response.weight;
    }

    // Normalize scores to 0-100
    for (const bias of Object.keys(biasScores) as BehavioralBias[]) {
      biasScores[bias] = Math.min(100, Math.max(0, biasScores[bias]));
    }

    // Find dominant bias
    const dominantBias = Object.entries(biasScores).reduce((a, b) =>
      a[1] > b[1] ? a : b,
    )[0] as BehavioralBias;

    // Generate intervention suggestions
    const interventionSuggestions = BIAS_INTERVENTIONS[dominantBias].slice(
      0,
      3,
    );

    return { dominantBias, biasScores, interventionSuggestions };
  }

  private generateAssessmentRecommendations(
    riskTolerance: RiskToleranceResult,
    personality: PersonalityResult,
    biasAnalysis: BiasAnalysisResult,
  ): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (riskTolerance.category === "conservative") {
      recommendations.push(
        "Consider a diversified portfolio with emphasis on bonds and stable assets.",
      );
    } else if (riskTolerance.category === "aggressive") {
      recommendations.push(
        "You may benefit from growth-oriented investments, but ensure you have an emergency fund first.",
      );
    }

    // Personality-based recommendations
    recommendations.push(PERSONALITY_DESCRIPTIONS[personality.primary]);

    // Bias-based recommendations
    recommendations.push(
      `Watch out for ${biasAnalysis.dominantBias.replace("_", " ")}: ${biasAnalysis.interventionSuggestions[0]}`,
    );

    return recommendations;
  }

  // --------------------------------------------------------------------------
  // COACHING SESSIONS
  // --------------------------------------------------------------------------

  async createCoachingSession(
    userId: string,
    sessionType: CoachingSessionType,
  ): Promise<AICoachingSession> {
    // Get user profile and context
    const profile = await this.getUserProfile(userId);
    const goals = await this.getUserGoals(userId);
    const recentActivity = await this.getRecentActivity(userId);

    // Generate coaching content
    const content = await this.generateCoachingContent(
      sessionType,
      profile,
      goals,
      recentActivity,
    );

    // Create session record
    const { data, error } = await this.supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("ai_coaching_sessions")
      .insert({
        user_id: userId,
        session_type: sessionType,
        topic: content.mainMessage.substring(0, 100),
        content,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create coaching session: ${error.message}`);
    }

    return this.mapToCoachingSession(data);
  }

  private async generateCoachingContent(
    sessionType: CoachingSessionType,
    profile: UserFinancialProfile | null,
    goals: GoalTracking[],
    recentActivity: RecentActivitySummary,
  ): Promise<CoachingContent> {
    const topics = COACHING_TOPICS[sessionType];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    // Generate greeting based on profile
    const greeting = this.generateGreeting(profile);

    // Generate main message
    const mainMessage = this.generateMainMessage(
      sessionType,
      recentActivity,
      goals,
    );

    // Generate insights
    const insights = this.generateInsights(
      sessionType,
      recentActivity,
      goals,
      profile,
    );

    // Generate action items
    const actionItems = this.generateActionItems(sessionType, goals, profile);

    // Generate encouragement based on tone preference
    const encouragement = this.generateEncouragement(
      profile?.communicationTone ?? "supportive",
    );

    return {
      greeting,
      mainMessage,
      insights,
      actionItems,
      encouragement,
    };
  }

  private generateGreeting(profile: UserFinancialProfile | null): string {
    const hour = new Date().getHours();
    let timeGreeting: string;

    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 17) timeGreeting = "Good afternoon";
    else timeGreeting = "Good evening";

    if (profile?.communicationTone === "direct") {
      return `${timeGreeting}. Let's review your finances.`;
    } else if (profile?.communicationTone === "motivational") {
      return `${timeGreeting}! Ready to crush your financial goals today?`;
    }

    return `${timeGreeting}! Let's take a look at how you're doing.`;
  }

  private generateMainMessage(
    sessionType: CoachingSessionType,
    activity: RecentActivitySummary,
    goals: GoalTracking[],
  ): string {
    switch (sessionType) {
      case "weekly_review":
        return `This week, you spent $${activity.totalSpent.toFixed(2)} across ${activity.transactionCount} transactions. ${
          activity.underBudget
            ? "Great job staying under budget!"
            : "You went a bit over budget - let's see where we can improve."
        }`;

      case "goal_check":
        const activeGoals = goals.filter((g) => g.status === "active");
        if (activeGoals.length === 0) {
          return "You don't have any active goals yet. Setting goals is the first step to financial success!";
        }
        const avgProgress =
          (activeGoals.reduce(
            (sum, g) => sum + g.currentValue / g.targetValue,
            0,
          ) /
            activeGoals.length) *
          100;
        return `You're making progress on ${activeGoals.length} goals with an average completion of ${avgProgress.toFixed(0)}%.`;

      case "celebration":
        return "Congratulations on reaching this milestone! Your dedication to your financial goals is paying off.";

      case "crisis":
        return "I noticed some concerning patterns in your recent spending. Let's work together to get back on track.";

      default:
        return "Let's review your financial progress and find ways to improve.";
    }
  }

  private generateInsights(
    sessionType: CoachingSessionType,
    activity: RecentActivitySummary,
    goals: GoalTracking[],
    profile: UserFinancialProfile | null,
  ): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    // Spending insight
    if (activity.topCategory) {
      insights.push({
        type: activity.categoryOverBudget ? "warning" : "observation",
        title: `${activity.topCategory} Spending`,
        description: `Your highest spending category was ${activity.topCategory} at $${activity.topCategoryAmount?.toFixed(2)}.`,
        data: {
          category: activity.topCategory,
          amount: activity.topCategoryAmount,
        },
      });
    }

    // Goal progress insight
    const nearCompletionGoals = goals.filter(
      (g) => g.status === "active" && g.currentValue / g.targetValue >= 0.75,
    );
    if (nearCompletionGoals.length > 0) {
      insights.push({
        type: "celebration",
        title: "Goals Nearly Complete!",
        description: `You're 75%+ of the way to completing ${nearCompletionGoals.length} goal(s). Keep pushing!`,
        data: { goals: nearCompletionGoals.map((g) => g.goalName) },
      });
    }

    // Bias-based insight
    if (profile?.biases) {
      const highestBias = Object.entries(profile.biases).reduce((a, b) =>
        (a[1] ?? 0) > (b[1] ?? 0) ? a : b,
      );
      if ((highestBias[1] ?? 0) > 60) {
        const biasName = highestBias[0]
          .replace(/([A-Z])/g, " $1")
          .toLowerCase();
        insights.push({
          type: "suggestion",
          title: "Behavioral Insight",
          description: `Your ${biasName} tendency may be influencing your decisions. ${BIAS_INTERVENTIONS[highestBias[0] as BehavioralBias]?.[0] ?? ""}`,
        });
      }
    }

    return insights.slice(0, 4); // Limit to 4 insights
  }

  private generateActionItems(
    sessionType: CoachingSessionType,
    goals: GoalTracking[],
    profile: UserFinancialProfile | null,
  ): ActionItem[] {
    const items: ActionItem[] = [];

    // Always suggest reviewing transactions
    items.push({
      id: crypto.randomUUID(),
      title: "Review Recent Transactions",
      description:
        "Take a few minutes to categorize and review your recent spending.",
      priority: "medium",
      completed: false,
    });

    // Goal-based action items
    const behindScheduleGoals = goals.filter((g) => {
      if (g.status !== "active" || !g.targetDate) return false;
      const daysTotal = Math.ceil(
        (new Date(g.targetDate).getTime() - new Date(g.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const daysPassed = Math.ceil(
        (Date.now() - new Date(g.startDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      const expectedProgress = daysPassed / daysTotal;
      const actualProgress = g.currentValue / g.targetValue;
      return actualProgress < expectedProgress * 0.8;
    });

    if (behindScheduleGoals.length > 0) {
      items.push({
        id: crypto.randomUUID(),
        title: `Boost ${behindScheduleGoals[0].goalName} Progress`,
        description: `You're falling behind on this goal. Consider increasing your contribution this week.`,
        priority: "high",
        completed: false,
      });
    }

    // Personality-based action items
    if (profile?.financialPersonality === "spender") {
      items.push({
        id: crypto.randomUUID(),
        title: "Set Up Automatic Savings",
        description:
          "Automate savings transfers to build wealth without thinking about it.",
        priority: "medium",
        completed: false,
      });
    }

    return items.slice(0, 3); // Limit to 3 action items
  }

  private generateEncouragement(tone: string): string {
    const encouragements = {
      supportive: "Remember, every step forward counts. You're doing great!",
      direct: "Focus on the key actions and you'll see results.",
      motivational:
        "You have the power to transform your financial future! Let's make it happen! ",
      analytical:
        "The data shows positive trends. Consistency will compound your progress.",
    };

    return (
      encouragements[tone as keyof typeof encouragements] ??
      encouragements.supportive
    );
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private async getUserGoals(userId: string): Promise<GoalTracking[]> {
    const { data } = await this.supabase
      .from("goal_tracking")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return (data ?? []).map(this.mapToGoalTracking);
  }

  private async getRecentActivity(
    userId: string,
  ): Promise<RecentActivitySummary> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: transactions } = await this.supabase
      .from("transactions")
      .select("amount, category")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", weekAgo.toISOString());

    const totalSpent = (transactions ?? []).reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0,
    );
    const transactionCount = transactions?.length ?? 0;

    // Find top category
    const categoryTotals: Record<string, number> = {};
    for (const tx of transactions ?? []) {
      const cat = tx.category ?? "uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Math.abs(tx.amount);
    }

    const topEntry = Object.entries(categoryTotals).reduce(
      (a, b) => (a[1] > b[1] ? a : b),
      ["", 0],
    );

    return {
      totalSpent,
      transactionCount,
      topCategory: topEntry[0] || undefined,
      topCategoryAmount: topEntry[1] || undefined,
      underBudget: true, // Would check against actual budgets
      categoryOverBudget: false,
    };
  }

  // --------------------------------------------------------------------------
  // MAPPERS
  // --------------------------------------------------------------------------

  private mapToUserFinancialProfile(
    data: Record<string, unknown>,
  ): UserFinancialProfile {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      riskToleranceScore: data.risk_tolerance_score as number | null,
      financialPersonality:
        data.financial_personality as FinancialPersonality | null,
      primaryGoals: data.primary_goals as UserFinancialProfile["primaryGoals"],
      spendingTriggers:
        data.spending_triggers as UserFinancialProfile["spendingTriggers"],
      preferredNotificationTime: data.preferred_notification_time as
        | string
        | null,
      preferredNotificationDays: data.preferred_notification_days as
        | string[]
        | null,
      communicationTone:
        (data.communication_tone as UserFinancialProfile["communicationTone"]) ??
        "supportive",
      biases: data.biases as UserBiases | null,
      lastAssessmentAt: data.last_assessment_at as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapToCoachingSession(
    data: Record<string, unknown>,
  ): AICoachingSession {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      sessionType: data.session_type as CoachingSessionType,
      topic: data.topic as string,
      content: data.content as CoachingContent,
      userResponse: data.user_response as AICoachingSession["userResponse"],
      sentimentScore: data.sentiment_score as number | null,
      completedAt: data.completed_at as string | null,
      createdAt: data.created_at as string,
    };
  }

  private mapToGoalTracking(data: Record<string, unknown>): GoalTracking {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      goalType: data.goal_type as GoalTracking["goalType"],
      goalName: data.goal_name as string,
      targetValue: data.target_value as number,
      currentValue: data.current_value as number,
      targetDate: data.target_date as string | null,
      startDate: data.start_date as string,
      status: data.status as GoalTracking["status"],
      milestones: data.milestones as GoalTracking["milestones"],
      aiRecommendations:
        data.ai_recommendations as GoalTracking["aiRecommendations"],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface AssessmentResponses {
  riskQuestions: RiskQuestionResponse[];
  personalityQuestions: PersonalityQuestionResponse[];
  biasQuestions: BiasQuestionResponse[];
}

interface RiskQuestionResponse {
  questionId: string;
  questionType: "time_horizon" | "loss_comfort" | "volatility" | "knowledge";
  value: number; // 1-10
}

interface PersonalityQuestionResponse {
  questionId: string;
  value: number;
  weights: Partial<Record<FinancialPersonality, number>>;
}

interface BiasQuestionResponse {
  questionId: string;
  biasType: BehavioralBias;
  value: number;
  weight: number;
}

interface RecentActivitySummary {
  totalSpent: number;
  transactionCount: number;
  topCategory?: string;
  topCategoryAmount?: number;
  underBudget: boolean;
  categoryOverBudget: boolean;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let behavioralCoachInstance: BehavioralCoach | null = null;

export function getBehavioralCoach(): BehavioralCoach {
  if (!behavioralCoachInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    behavioralCoachInstance = new BehavioralCoach(supabaseUrl, supabaseKey);
  }

  return behavioralCoachInstance;
}

export default BehavioralCoach;
