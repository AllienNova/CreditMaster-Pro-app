/**
 * Fynvita AI Spending Analyzer
 * Analyzes transaction patterns and detects emotional spending
 */

import { createClient } from "@supabase/supabase-js";
import {
  SpendingPattern,
  SpendingAnalysis,
  RiskArea,
  SpendingTrigger,
  EmotionalSpendingAlert,
  SpendingRiskAnalysis,
  RiskFactor,
  InterventionType,
  RISK_FACTOR_WEIGHTS,
  INTERVENTION_THRESHOLDS,
  SpendingPatternType,
} from "./types";

// ============================================================================
// SPENDING ANALYZER CLASS
// ============================================================================

export class SpendingAnalyzer {
  private readonly supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // --------------------------------------------------------------------------
  // PATTERN ANALYSIS
  // --------------------------------------------------------------------------

  async analyzeSpendingPatterns(
    userId: string,
    periodDays = 30,
  ): Promise<SpendingAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get transactions for the period
    const { data: transactions } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .eq("type", "expense");

    if (!transactions || transactions.length === 0) {
      return {
        patterns: { timeOfDay: {}, dayOfWeek: {}, categories: {} },
        triggers: [],
        recommendations: [
          "Start tracking your spending to get personalized insights!",
        ],
        riskAreas: [],
      };
    }

    // Analyze patterns
    const timeOfDayPattern = this.analyzeTimeOfDay(transactions);
    const dayOfWeekPattern = this.analyzeDayOfWeek(transactions);
    const categoryPattern = this.analyzeCategories(transactions);

    // Detect triggers
    const triggers = this.detectTriggers(
      transactions,
      timeOfDayPattern,
      dayOfWeekPattern,
    );

    // Identify risk areas
    const riskAreas = await this.identifyRiskAreas(userId, categoryPattern);

    // Generate recommendations
    const recommendations = this.generateRecommendations(triggers, riskAreas);

    // Store patterns in database
    await this.storePatterns(
      userId,
      {
        timeOfDay: timeOfDayPattern,
        dayOfWeek: dayOfWeekPattern,
        categories: categoryPattern,
      },
      startDate,
      endDate,
    );

    return {
      patterns: {
        timeOfDay: timeOfDayPattern,
        dayOfWeek: dayOfWeekPattern,
        categories: categoryPattern,
      },
      triggers,
      recommendations,
      riskAreas,
    };
  }

  private analyzeTimeOfDay(
    transactions: Transaction[],
  ): Record<string, number> {
    const timeSlots: Record<string, number> = {
      morning: 0, // 6-12
      afternoon: 0, // 12-17
      evening: 0, // 17-21
      night: 0, // 21-6
    };

    for (const tx of transactions) {
      const hour = new Date(tx.date).getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning += Math.abs(tx.amount);
      else if (hour >= 12 && hour < 17)
        timeSlots.afternoon += Math.abs(tx.amount);
      else if (hour >= 17 && hour < 21)
        timeSlots.evening += Math.abs(tx.amount);
      else timeSlots.night += Math.abs(tx.amount);
    }

    return timeSlots;
  }

  private analyzeDayOfWeek(
    transactions: Transaction[],
  ): Record<string, number> {
    const days: Record<string, number> = {
      sunday: 0,
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
    };

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    for (const tx of transactions) {
      const dayIndex = new Date(tx.date).getDay();
      days[dayNames[dayIndex]] += Math.abs(tx.amount);
    }

    return days;
  }

  private analyzeCategories(
    transactions: Transaction[],
  ): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const tx of transactions) {
      const category = tx.category || "uncategorized";
      categories[category] = (categories[category] || 0) + Math.abs(tx.amount);
    }

    return categories;
  }

  private detectTriggers(
    transactions: Transaction[],
    timeOfDay: Record<string, number>,
    dayOfWeek: Record<string, number>,
  ): SpendingTrigger[] {
    const triggers: SpendingTrigger[] = [];
    const totalSpending = Object.values(timeOfDay).reduce((a, b) => a + b, 0);

    // Detect late night spending trigger
    if (timeOfDay.night > totalSpending * 0.2) {
      triggers.push({
        trigger: "Late Night Shopping",
        timeOfDay: "night",
        confidence: Math.min(1, timeOfDay.night / (totalSpending * 0.15)),
      });
    }

    // Detect weekend spending trigger
    const weekendSpending = dayOfWeek.saturday + dayOfWeek.sunday;
    const weekdayAvg = (totalSpending - weekendSpending) / 5;
    if (weekendSpending / 2 > weekdayAvg * 1.5) {
      triggers.push({
        trigger: "Weekend Splurge",
        dayOfWeek: "weekend",
        confidence: Math.min(1, weekendSpending / 2 / (weekdayAvg * 1.5)),
      });
    }

    // Detect category-specific triggers
    const categoryTotals = this.analyzeCategories(transactions);
    for (const [category, amount] of Object.entries(categoryTotals)) {
      if (
        amount > totalSpending * 0.3 &&
        category !== "housing" &&
        category !== "utilities"
      ) {
        triggers.push({
          trigger: `High ${category} spending`,
          category,
          confidence: Math.min(1, amount / (totalSpending * 0.25)),
        });
      }
    }

    return triggers;
  }

  private async identifyRiskAreas(
    userId: string,
    categoryPattern: Record<string, number>,
  ): Promise<RiskArea[]> {
    const riskAreas: RiskArea[] = [];

    // Get budget limits
    const { data: budgets } = await this.supabase
      .from("budgets")
      .select("category, amount")
      .eq("user_id", userId);

    const budgetMap = new Map(
      budgets?.map((b) => [b.category, b.amount]) ?? [],
    );

    for (const [category, spent] of Object.entries(categoryPattern)) {
      const budget = budgetMap.get(category);
      if (budget && spent > budget) {
        const overspendPercent = ((spent - budget) / budget) * 100;
        riskAreas.push({
          category,
          riskLevel:
            overspendPercent > 50
              ? "high"
              : overspendPercent > 25
                ? "medium"
                : "low",
          averageOverspend: spent - budget,
          frequency: 1, // Would calculate from historical data
          suggestion: `Consider reducing ${category} spending by $${Math.round(spent - budget)} to stay within budget.`,
        });
      }
    }

    return riskAreas;
  }

  private generateRecommendations(
    triggers: SpendingTrigger[],
    riskAreas: RiskArea[],
  ): string[] {
    const recommendations: string[] = [];

    for (const trigger of triggers) {
      if (trigger.timeOfDay === "night") {
        recommendations.push(
          'Try setting a "shopping curfew" after 9 PM to reduce impulse purchases.',
        );
      }
      if (trigger.dayOfWeek === "weekend") {
        recommendations.push(
          "Plan your weekend activities in advance to avoid overspending.",
        );
      }
      if (trigger.category) {
        recommendations.push(
          `Review your ${trigger.category} spending and identify areas to cut back.`,
        );
      }
    }

    for (const risk of riskAreas.filter((r) => r.riskLevel === "high")) {
      recommendations.push(
        `Your ${risk.category} spending is significantly over budget. ${risk.suggestion}`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Great job! Your spending patterns look healthy.");
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private async storePatterns(
    userId: string,
    patterns: {
      timeOfDay: Record<string, number>;
      dayOfWeek: Record<string, number>;
      categories: Record<string, number>;
    },
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const patternRecords: Partial<SpendingPattern>[] = [];

    // Time of day patterns
    for (const [key, value] of Object.entries(patterns.timeOfDay)) {
      patternRecords.push({
        userId,
        patternType: "time_of_day" as SpendingPatternType,
        patternKey: key,
        averageAmount: value,
        transactionCount: 0,
        periodStart: startDate.toISOString().split("T")[0],
        periodEnd: endDate.toISOString().split("T")[0],
      });
    }

    // Day of week patterns
    for (const [key, value] of Object.entries(patterns.dayOfWeek)) {
      patternRecords.push({
        userId,
        patternType: "day_of_week" as SpendingPatternType,
        patternKey: key,
        averageAmount: value,
        transactionCount: 0,
        periodStart: startDate.toISOString().split("T")[0],
        periodEnd: endDate.toISOString().split("T")[0],
      });
    }

    // Category patterns
    for (const [key, value] of Object.entries(patterns.categories)) {
      patternRecords.push({
        userId,
        patternType: "category" as SpendingPatternType,
        patternKey: key,
        averageAmount: value,
        transactionCount: 0,
        periodStart: startDate.toISOString().split("T")[0],
        periodEnd: endDate.toISOString().split("T")[0],
      });
    }

    // Upsert patterns
    for (const pattern of patternRecords) {
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      await this.supabase.from("spending_patterns").upsert(
        {
          user_id: pattern.userId,
          pattern_type: pattern.patternType,
          pattern_key: pattern.patternKey,
          average_amount: pattern.averageAmount,
          transaction_count: pattern.transactionCount,
          period_start: pattern.periodStart,
          period_end: pattern.periodEnd,
        },
        {
          onConflict: "user_id,pattern_type,pattern_key,period_start",
        },
      );
    }
  }

  // --------------------------------------------------------------------------
  // EMOTIONAL SPENDING DETECTION
  // --------------------------------------------------------------------------

  async analyzeTransactionRisk(
    userId: string,
    transaction: TransactionInput,
  ): Promise<SpendingRiskAnalysis> {
    const riskFactors: RiskFactor[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Factor 1: Late night (after 10 PM)
    const hour = new Date(transaction.timestamp).getHours();
    if (hour >= 22 || hour < 6) {
      const score = 0.8;
      const weight = RISK_FACTOR_WEIGHTS.late_night;
      riskFactors.push({
        factor: "late_night",
        weight,
        score,
        description: "Transaction made during late night hours",
      });
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Factor 2: Repeat merchant same day
    const today = new Date(transaction.timestamp).toISOString().split("T")[0];
    const { count: samemerchantCount } = await this.supabase
      .from("transactions")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("merchant_name", transaction.merchant)
      .gte("date", today)
      .lt("date", new Date(new Date(today).getTime() + 86400000).toISOString());

    if ((samemerchantCount ?? 0) > 1) {
      const score = Math.min(1, (samemerchantCount ?? 0) * 0.3);
      const weight = RISK_FACTOR_WEIGHTS.repeat_merchant_same_day;
      riskFactors.push({
        factor: "repeat_merchant_same_day",
        weight,
        score,
        description: `${samemerchantCount} transactions at this merchant today`,
      });
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Factor 3: Exceeds daily average
    const { data: avgData } = await this.supabase.rpc(
      "get_daily_average_spending",
      { p_user_id: userId, p_days: 30 },
    );

    const dailyAvg = avgData ?? 100;
    if (transaction.amount > dailyAvg * 0.5) {
      const score = Math.min(1, transaction.amount / dailyAvg);
      const weight = RISK_FACTOR_WEIGHTS.exceeds_daily_average;
      riskFactors.push({
        factor: "exceeds_daily_average",
        weight,
        score,
        description: `Amount is ${Math.round((transaction.amount / dailyAvg) * 100)}% of daily average`,
      });
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Factor 4: Budget category overspent
    const { data: budgetData } = await this.supabase
      .from("budgets")
      .select("amount, spent")
      .eq("user_id", userId)
      .eq("category", transaction.category)
      .single();

    if (
      budgetData &&
      (budgetData.spent ?? 0) + transaction.amount > budgetData.amount
    ) {
      const overspendPercent =
        ((budgetData.spent ?? 0) + transaction.amount - budgetData.amount) /
        budgetData.amount;
      const score = Math.min(1, overspendPercent);
      const weight = RISK_FACTOR_WEIGHTS.budget_category_overspent;
      riskFactors.push({
        factor: "budget_category_overspent",
        weight,
        score,
        description: `This would put you ${Math.round(overspendPercent * 100)}% over budget for ${transaction.category}`,
      });
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Factor 5: Weekend spending
    const dayOfWeek = new Date(transaction.timestamp).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const score = 0.5;
      const weight = RISK_FACTOR_WEIGHTS.weekend_splurge;
      riskFactors.push({
        factor: "weekend_splurge",
        weight,
        score,
        description: "Weekend purchase (historically higher spending)",
      });
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Calculate overall risk score
    const riskScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Determine intervention type
    let recommendedIntervention: InterventionType = "none";
    if (riskScore >= INTERVENTION_THRESHOLDS.strong_intervention) {
      recommendedIntervention = "strong_intervention";
    } else if (riskScore >= INTERVENTION_THRESHOLDS.reflection_prompt) {
      recommendedIntervention = "reflection_prompt";
    } else if (riskScore >= INTERVENTION_THRESHOLDS.soft_nudge) {
      recommendedIntervention = "soft_nudge";
    }

    return {
      transactionId: transaction.id ?? "",
      amount: transaction.amount,
      merchant: transaction.merchant,
      category: transaction.category,
      timestamp: transaction.timestamp,
      riskScore,
      riskFactors,
      recommendedIntervention,
    };
  }

  async createSpendingAlert(
    userId: string,
    analysis: SpendingRiskAnalysis,
  ): Promise<EmotionalSpendingAlert> {
    const { data, error } = await this.supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("emotional_spending_alerts")
      .insert({
        user_id: userId,
        transaction_id: analysis.transactionId || null,
        risk_score: analysis.riskScore,
        risk_factors: analysis.riskFactors,
        intervention_type: analysis.recommendedIntervention,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create spending alert: ${error.message}`);
    }

    return this.mapToEmotionalSpendingAlert(data);
  }

  async recordAlertResponse(
    alertId: string,
    response: "planned" | "will_wait" | "dismissed",
  ): Promise<void> {
    await this.supabase
      .from("emotional_spending_alerts")
      .update({
        user_response: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", alertId);
  }

  // --------------------------------------------------------------------------
  // STORED PATTERNS
  // --------------------------------------------------------------------------

  async getStoredPatterns(userId: string): Promise<SpendingPattern[]> {
    const { data, error } = await this.supabase
      .from("spending_patterns")
      .select("*")
      .eq("user_id", userId)
      .order("period_end", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Failed to get spending patterns: ${error.message}`);
    }

    return data.map(this.mapToSpendingPattern);
  }

  // --------------------------------------------------------------------------
  // MAPPERS
  // --------------------------------------------------------------------------

  private mapToSpendingPattern(data: Record<string, unknown>): SpendingPattern {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      patternType: data.pattern_type as SpendingPatternType,
      patternKey: data.pattern_key as string,
      averageAmount: data.average_amount as number | null,
      transactionCount: data.transaction_count as number,
      riskScore: data.risk_score as number | null,
      metadata: data.metadata as SpendingPattern["metadata"],
      periodStart: data.period_start as string,
      periodEnd: data.period_end as string,
      createdAt: data.created_at as string,
    };
  }

  private mapToEmotionalSpendingAlert(
    data: Record<string, unknown>,
  ): EmotionalSpendingAlert {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      transactionId: data.transaction_id as string | null,
      riskScore: data.risk_score as number,
      riskFactors: data.risk_factors as RiskFactor[],
      interventionType: data.intervention_type as InterventionType,
      userResponse:
        data.user_response as EmotionalSpendingAlert["userResponse"],
      respondedAt: data.responded_at as string | null,
      createdAt: data.created_at as string,
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  category?: string;
  merchant_name?: string;
  type: "income" | "expense";
}

interface TransactionInput {
  id?: string;
  amount: number;
  merchant: string;
  category: string;
  timestamp: string;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let spendingAnalyzerInstance: SpendingAnalyzer | null = null;

export function getSpendingAnalyzer(): SpendingAnalyzer {
  if (!spendingAnalyzerInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    spendingAnalyzerInstance = new SpendingAnalyzer(supabaseUrl, supabaseKey);
  }

  return spendingAnalyzerInstance;
}

export default SpendingAnalyzer;
