/**
 * Weekly Financial Health Summary Service
 *
 * Generates comprehensive weekly financial summaries including:
 * - Spending analysis and trends
 * - Budget performance
 * - Credit score changes
 * - Bill reminders
 * - Investment performance
 * - Personalized insights and recommendations
 * - Goal progress
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export type SummaryPeriod = "weekly" | "monthly" | "quarterly";

export type TrendDirection = "up" | "down" | "stable";

export interface SpendingSummary {
  totalSpent: number;
  comparedToLastWeek: number;
  comparedToAverage: number;
  trend: TrendDirection;
  topCategories: {
    category: string;
    amount: number;
    percentOfTotal: number;
    trend: TrendDirection;
  }[];
  unusualTransactions: {
    merchant: string;
    amount: number;
    category: string;
    reason: string;
  }[];
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  percentUsed: number;
  daysRemaining: number;
  projectedOverage: number;
  categories: {
    name: string;
    budget: number;
    spent: number;
    percentUsed: number;
    status: "on_track" | "warning" | "over_budget";
  }[];
}

export interface CreditSummary {
  currentScore: number;
  scoreChange: number;
  scoreChangeDirection: TrendDirection;
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }[];
  upcomingImpacts: string[];
}

export interface BillsSummary {
  upcomingBills: {
    name: string;
    amount: number;
    dueDate: Date;
    daysUntilDue: number;
    autopay: boolean;
  }[];
  totalDueThisWeek: number;
  paidLastWeek: number;
  overdueBills: number;
}

export interface InvestmentSummary {
  portfolioValue: number;
  weeklyChange: number;
  weeklyChangePercent: number;
  trend: TrendDirection;
  topGainers: { symbol: string; change: number; changePercent: number }[];
  topLosers: { symbol: string; change: number; changePercent: number }[];
  dividendsReceived: number;
  rebalanceNeeded: boolean;
}

export interface GoalsSummary {
  activeGoals: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  highlights: {
    goalName: string;
    progress: number;
    milestone?: string;
    daysToTarget: number;
  }[];
}

export interface Insight {
  id: string;
  type: "tip" | "alert" | "achievement" | "opportunity";
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  priority: number;
}

export interface WeeklySummary {
  id: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  spending: SpendingSummary;
  budget: BudgetSummary;
  credit: CreditSummary;
  bills: BillsSummary;
  investments: InvestmentSummary;
  goals: GoalsSummary;
  insights: Insight[];
  healthScore: number;
  healthScoreChange: number;
}

export interface SummaryPreferences {
  userId: string;
  enabled: boolean;
  dayOfWeek: number; // 0-6, Sunday = 0
  timeOfDay: string; // HH:mm format
  emailEnabled: boolean;
  pushEnabled: boolean;
  includeSections: {
    spending: boolean;
    budget: boolean;
    credit: boolean;
    bills: boolean;
    investments: boolean;
    goals: boolean;
  };
}

// ============================================================================
// WEEKLY SUMMARY SERVICE
// ============================================================================

export class WeeklySummaryService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================

  async generateWeeklySummary(userId: string): Promise<WeeklySummary> {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const weekEnd = this.getWeekEnd(now);

    // Generate all sections in parallel
    const [spending, budget, credit, bills, investments, goals] =
      await Promise.all([
        this.generateSpendingSummary(userId, weekStart, weekEnd),
        this.generateBudgetSummary(userId),
        this.generateCreditSummary(userId),
        this.generateBillsSummary(userId),
        this.generateInvestmentSummary(userId, weekStart, weekEnd),
        this.generateGoalsSummary(userId),
      ]);

    // Generate insights based on all data
    const insights = this.generateInsights(
      spending,
      budget,
      credit,
      bills,
      investments,
      goals,
    );

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(
      spending,
      budget,
      credit,
      goals,
    );
    const previousScore = await this.getPreviousHealthScore(userId);
    const healthScoreChange = healthScore - (previousScore || healthScore);

    const summary: WeeklySummary = {
      id: `summary-${userId}-${weekStart.toISOString().split("T")[0]}`,
      userId,
      periodStart: weekStart,
      periodEnd: weekEnd,
      generatedAt: now,
      spending,
      budget,
      credit,
      bills,
      investments,
      goals,
      insights,
      healthScore,
      healthScoreChange,
    };

    // Store the summary
    await this.storeSummary(summary);

    return summary;
  }

  // ==========================================================================
  // SPENDING SUMMARY
  // ==========================================================================

  private async generateSpendingSummary(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<SpendingSummary> {
    // Get transactions for this week
    const { data: transactions } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", weekStart.toISOString())
      .lte("date", weekEnd.toISOString())
      .lt("amount", 0); // Expenses only

    const thisWeekTotal = (transactions || []).reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0,
    );

    // Get last week's spending
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const { data: lastWeekTx } = await this.supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .gte("date", lastWeekStart.toISOString())
      .lte("date", lastWeekEnd.toISOString())
      .lt("amount", 0);

    const lastWeekTotal = (lastWeekTx || []).reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0,
    );

    // Calculate by category
    const byCategory = new Map<string, number>();
    (transactions || []).forEach((t) => {
      const current = byCategory.get(t.category) || 0;
      byCategory.set(t.category, current + Math.abs(t.amount));
    });

    const topCategories = Array.from(byCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentOfTotal: thisWeekTotal > 0 ? (amount / thisWeekTotal) * 100 : 0,
        trend: "stable" as TrendDirection,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Find unusual transactions
    const unusualTransactions = (transactions || [])
      .filter((t) => Math.abs(t.amount) > 200)
      .slice(0, 3)
      .map((t) => ({
        merchant: t.merchant_name || "Unknown",
        amount: Math.abs(t.amount),
        category: t.category,
        reason: "Large transaction",
      }));

    const comparedToLastWeek =
      lastWeekTotal > 0
        ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
        : 0;

    return {
      totalSpent: thisWeekTotal,
      comparedToLastWeek,
      comparedToAverage: 0, // Would need historical data
      trend:
        comparedToLastWeek > 5
          ? "up"
          : comparedToLastWeek < -5
            ? "down"
            : "stable",
      topCategories,
      unusualTransactions,
    };
  }

  // ==========================================================================
  // BUDGET SUMMARY
  // ==========================================================================

  private async generateBudgetSummary(userId: string): Promise<BudgetSummary> {
    const { data: budgets } = await this.supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    const totalBudget = (budgets || []).reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = (budgets || []).reduce(
      (sum, b) => sum + (b.spent || 0),
      0,
    );
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Calculate days remaining in period
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil(
      (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Project overage
    const daysElapsed = now.getDate();
    const dailyRate = totalSpent / daysElapsed;
    const projectedTotal = dailyRate * endOfMonth.getDate();
    const projectedOverage = Math.max(0, projectedTotal - totalBudget);

    const categories = (budgets || []).map((b) => {
      const pctUsed = b.amount > 0 ? ((b.spent || 0) / b.amount) * 100 : 0;
      return {
        name: b.category,
        budget: b.amount,
        spent: b.spent || 0,
        percentUsed: pctUsed,
        status:
          pctUsed >= 100
            ? ("over_budget" as const)
            : pctUsed >= 80
              ? ("warning" as const)
              : ("on_track" as const),
      };
    });

    return {
      totalBudget,
      totalSpent,
      percentUsed,
      daysRemaining,
      projectedOverage,
      categories: categories.sort((a, b) => b.percentUsed - a.percentUsed),
    };
  }

  // ==========================================================================
  // CREDIT SUMMARY
  // ==========================================================================

  private async generateCreditSummary(userId: string): Promise<CreditSummary> {
    const { data: scores } = await this.supabase
      .from("credit_scores")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(2);

    const currentScore = scores?.[0]?.score || 0;
    const previousScore = scores?.[1]?.score || currentScore;
    const scoreChange = currentScore - previousScore;

    // Get credit factors
    const { data: factors } = await this.supabase
      .from("credit_factors")
      .select("*")
      .eq("user_id", userId)
      .order("impact_score", { ascending: false })
      .limit(5);

    const creditFactors = (factors || []).map((f) => ({
      factor: f.factor_name,
      impact: f.impact_type as "positive" | "negative" | "neutral",
      description: f.description,
    }));

    return {
      currentScore,
      scoreChange,
      scoreChangeDirection:
        scoreChange > 0 ? "up" : scoreChange < 0 ? "down" : "stable",
      factors: creditFactors,
      upcomingImpacts: [],
    };
  }

  // ==========================================================================
  // BILLS SUMMARY
  // ==========================================================================

  private async generateBillsSummary(userId: string): Promise<BillsSummary> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get upcoming bills
    const { data: upcomingBills } = await this.supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("next_due_date", now.toISOString())
      .lte("next_due_date", weekFromNow.toISOString())
      .order("next_due_date", { ascending: true });

    // Get paid bills from last week
    const { data: paidBills } = await this.supabase
      .from("bill_payments")
      .select("amount")
      .eq("user_id", userId)
      .gte("paid_date", weekAgo.toISOString())
      .lte("paid_date", now.toISOString());

    // Get overdue bills
    const { data: overdueBills } = await this.supabase
      .from("bills")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .lt("next_due_date", now.toISOString());

    const upcoming = (upcomingBills || []).map((b) => ({
      name: b.name,
      amount: b.amount,
      dueDate: new Date(b.next_due_date),
      daysUntilDue: Math.ceil(
        (new Date(b.next_due_date).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
      autopay: b.autopay_enabled,
    }));

    return {
      upcomingBills: upcoming,
      totalDueThisWeek: upcoming.reduce((sum, b) => sum + b.amount, 0),
      paidLastWeek: (paidBills || []).reduce((sum, p) => sum + p.amount, 0),
      overdueBills: (overdueBills || []).length,
    };
  }

  // ==========================================================================
  // INVESTMENT SUMMARY
  // ==========================================================================

  private async generateInvestmentSummary(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<InvestmentSummary> {
    // Get current portfolio value
    const { data: holdings } = await this.supabase
      .from("holdings")
      .select("*")
      .eq("user_id", userId)
      .gt("shares", 0);

    const portfolioValue = (holdings || []).reduce(
      (sum, h) => sum + h.current_price * h.shares,
      0,
    );

    // Get portfolio value from week ago
    const { data: snapshot } = await this.supabase
      .from("portfolio_snapshots")
      .select("total_value")
      .eq("user_id", userId)
      .lte("snapshot_date", weekStart.toISOString())
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    const previousValue = snapshot?.total_value || portfolioValue;
    const weeklyChange = portfolioValue - previousValue;
    const weeklyChangePercent =
      previousValue > 0 ? (weeklyChange / previousValue) * 100 : 0;

    // Calculate gainers/losers
    const withChanges = (holdings || []).map((h) => ({
      symbol: h.symbol,
      change: (h.current_price - h.avg_cost_basis) * h.shares,
      changePercent:
        h.avg_cost_basis > 0
          ? ((h.current_price - h.avg_cost_basis) / h.avg_cost_basis) * 100
          : 0,
    }));

    const topGainers = withChanges
      .filter((h) => h.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3);

    const topLosers = withChanges
      .filter((h) => h.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 3);

    // Get dividends received
    const { data: dividends } = await this.supabase
      .from("dividend_payments")
      .select("total_amount")
      .eq("user_id", userId)
      .gte("pay_date", weekStart.toISOString())
      .lte("pay_date", weekEnd.toISOString());

    const dividendsReceived = (dividends || []).reduce(
      (sum, d) => sum + d.total_amount,
      0,
    );

    return {
      portfolioValue,
      weeklyChange,
      weeklyChangePercent,
      trend: weeklyChange > 0 ? "up" : weeklyChange < 0 ? "down" : "stable",
      topGainers,
      topLosers,
      dividendsReceived,
      rebalanceNeeded: false, // Would check drift threshold
    };
  }

  // ==========================================================================
  // GOALS SUMMARY
  // ==========================================================================

  private async generateGoalsSummary(userId: string): Promise<GoalsSummary> {
    const { data: goals } = await this.supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    const activeGoals = (goals || []).length;
    const goalsOnTrack = (goals || []).filter((g) => {
      const progress =
        g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
      const daysTotal = Math.ceil(
        (new Date(g.target_date).getTime() - new Date(g.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const daysElapsed = Math.ceil(
        (Date.now() - new Date(g.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const expectedProgress =
        daysTotal > 0 ? (daysElapsed / daysTotal) * 100 : 0;
      return progress >= expectedProgress * 0.9;
    }).length;

    const goalsAtRisk = activeGoals - goalsOnTrack;

    const highlights = (goals || []).slice(0, 3).map((g) => ({
      goalName: g.name,
      progress:
        g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      daysToTarget: Math.ceil(
        (new Date(g.target_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      ),
    }));

    return {
      activeGoals,
      goalsOnTrack,
      goalsAtRisk,
      highlights,
    };
  }

  // ==========================================================================
  // INSIGHTS GENERATION
  // ==========================================================================

  private generateInsights(
    spending: SpendingSummary,
    budget: BudgetSummary,
    credit: CreditSummary,
    bills: BillsSummary,
    investments: InvestmentSummary,
    goals: GoalsSummary,
  ): Insight[] {
    const insights: Insight[] = [];

    // Spending insights
    if (spending.comparedToLastWeek > 20) {
      insights.push({
        id: "spending-increase",
        type: "alert",
        title: "Spending Up This Week",
        description: `Your spending is ${Math.round(spending.comparedToLastWeek)}% higher than last week. Consider reviewing your recent purchases.`,
        actionLabel: "View Transactions",
        actionUrl: "/financial/transactions",
        priority: 2,
      });
    }

    // Budget insights
    const overBudgetCategories = budget.categories.filter(
      (c) => c.status === "over_budget",
    );
    if (overBudgetCategories.length > 0) {
      insights.push({
        id: "over-budget",
        type: "alert",
        title: "Budget Categories Exceeded",
        description: `${overBudgetCategories.length} budget categor${overBudgetCategories.length === 1 ? "y has" : "ies have"} exceeded their limits.`,
        actionLabel: "Adjust Budget",
        actionUrl: "/budgeting",
        priority: 1,
      });
    }

    // Credit insights
    if (credit.scoreChange > 0) {
      insights.push({
        id: "credit-increase",
        type: "achievement",
        title: "Credit Score Improved!",
        description: `Your credit score increased by ${credit.scoreChange} points. Keep up the good work!`,
        actionLabel: "View Details",
        actionUrl: "/credit",
        priority: 3,
      });
    } else if (credit.scoreChange < -10) {
      insights.push({
        id: "credit-decrease",
        type: "alert",
        title: "Credit Score Dropped",
        description: `Your credit score decreased by ${Math.abs(credit.scoreChange)} points. Review the factors affecting your score.`,
        actionLabel: "See Factors",
        actionUrl: "/credit",
        priority: 1,
      });
    }

    // Bills insights
    if (bills.overdueBills > 0) {
      insights.push({
        id: "overdue-bills",
        type: "alert",
        title: "Overdue Bills",
        description: `You have ${bills.overdueBills} overdue bill${bills.overdueBills === 1 ? "" : "s"}. Pay them to avoid late fees and credit impact.`,
        actionLabel: "Pay Now",
        actionUrl: "/budgeting/bills",
        priority: 1,
      });
    }

    // Investment insights
    if (investments.dividendsReceived > 0) {
      insights.push({
        id: "dividends-received",
        type: "achievement",
        title: "Dividend Income Received",
        description: `You earned $${investments.dividendsReceived.toFixed(2)} in dividends this week.`,
        actionLabel: "View Dividends",
        actionUrl: "/investments/dividends",
        priority: 4,
      });
    }

    // Goals insights
    if (goals.goalsAtRisk > 0) {
      insights.push({
        id: "goals-at-risk",
        type: "tip",
        title: "Goals Need Attention",
        description: `${goals.goalsAtRisk} of your goals are behind schedule. Consider increasing contributions.`,
        actionLabel: "View Goals",
        actionUrl: "/financial/goals",
        priority: 2,
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }

  // ==========================================================================
  // HEALTH SCORE
  // ==========================================================================

  private calculateHealthScore(
    spending: SpendingSummary,
    budget: BudgetSummary,
    credit: CreditSummary,
    goals: GoalsSummary,
  ): number {
    let score = 100;

    // Budget adherence (30 points)
    const budgetScore = Math.min(30, 30 * (1 - budget.percentUsed / 100));
    score -= 30 - budgetScore;

    // Credit score component (25 points)
    const creditScore = Math.min(25, (credit.currentScore / 850) * 25);
    score -= 25 - creditScore;

    // Spending trend (20 points)
    if (spending.trend === "up" && spending.comparedToLastWeek > 20) {
      score -= 15;
    } else if (spending.trend === "down") {
      score += 5; // Bonus for reducing spending
    }

    // Goals progress (25 points)
    const goalsScore =
      goals.activeGoals > 0
        ? (goals.goalsOnTrack / goals.activeGoals) * 25
        : 25;
    score -= 25 - goalsScore;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async getPreviousHealthScore(userId: string): Promise<number | null> {
    const { data } = await this.supabase
      .from("weekly_summaries")
      .select("health_score")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    return data?.health_score || null;
  }

  // ==========================================================================
  // STORAGE & RETRIEVAL
  // ==========================================================================

  private async storeSummary(summary: WeeklySummary): Promise<void> {
    await this.supabase.from("weekly_summaries").upsert({
      id: summary.id,
      user_id: summary.userId,
      period_start: summary.periodStart.toISOString(),
      period_end: summary.periodEnd.toISOString(),
      generated_at: summary.generatedAt.toISOString(),
      spending: summary.spending,
      budget: summary.budget,
      credit: summary.credit,
      bills: summary.bills,
      investments: summary.investments,
      goals: summary.goals,
      insights: summary.insights,
      health_score: summary.healthScore,
      health_score_change: summary.healthScoreChange,
    });
  }

  async getSummaryHistory(
    userId: string,
    limit: number = 12,
  ): Promise<WeeklySummary[]> {
    const { data, error } = await this.supabase
      .from("weekly_summaries")
      .select("*")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(limit);

    if (error)
      throw new Error(`Failed to get summary history: ${error.message}`);

    return (data || []).map((row) => this.mapRowToSummary(row));
  }

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================

  async getPreferences(userId: string): Promise<SummaryPreferences> {
    const { data } = await this.supabase
      .from("summary_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      return {
        userId: data.user_id,
        enabled: data.enabled,
        dayOfWeek: data.day_of_week,
        timeOfDay: data.time_of_day,
        emailEnabled: data.email_enabled,
        pushEnabled: data.push_enabled,
        includeSections: data.include_sections,
      };
    }

    // Default preferences
    return {
      userId,
      enabled: true,
      dayOfWeek: 1, // Monday
      timeOfDay: "08:00",
      emailEnabled: true,
      pushEnabled: true,
      includeSections: {
        spending: true,
        budget: true,
        credit: true,
        bills: true,
        investments: true,
        goals: true,
      },
    };
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<SummaryPreferences>,
  ): Promise<void> {
    await this.supabase.from("summary_preferences").upsert({
      user_id: userId,
      enabled: preferences.enabled,
      day_of_week: preferences.dayOfWeek,
      time_of_day: preferences.timeOfDay,
      email_enabled: preferences.emailEnabled,
      push_enabled: preferences.pushEnabled,
      include_sections: preferences.includeSections,
      updated_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getWeekEnd(date: Date): Date {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private mapRowToSummary(row: Record<string, unknown>): WeeklySummary {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      periodStart: new Date(row.period_start as string),
      periodEnd: new Date(row.period_end as string),
      generatedAt: new Date(row.generated_at as string),
      spending: row.spending as SpendingSummary,
      budget: row.budget as BudgetSummary,
      credit: row.credit as CreditSummary,
      bills: row.bills as BillsSummary,
      investments: row.investments as InvestmentSummary,
      goals: row.goals as GoalsSummary,
      insights: row.insights as Insight[],
      healthScore: row.health_score as number,
      healthScoreChange: row.health_score_change as number,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let weeklySummaryServiceInstance: WeeklySummaryService | null = null;

export function getWeeklySummaryService(): WeeklySummaryService {
  if (!weeklySummaryServiceInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    weeklySummaryServiceInstance = new WeeklySummaryService(
      supabaseUrl,
      supabaseKey,
    );
  }
  return weeklySummaryServiceInstance;
}
