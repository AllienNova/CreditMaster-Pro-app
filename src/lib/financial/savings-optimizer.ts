/**
 * Savings Optimizer Service
 *
 * AI-powered intelligent savings recommendations and subscription management.
 * Analyzes user spending patterns to identify savings opportunities, detect
 * recurring charges, audit subscriptions, and provide personalized savings
 * recommendations.
 *
 * Phase 2.2: Smart Banking Suite
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { getModelRouter, TaskType } from "@/lib/model-router";
import type {
  SavingsAnalysis,
  RecurringCharge,
  SubscriptionRecommendation,
  SavingsOpportunity,
  SavingsGoalRecommendation,
  PotentialSavingsSummary,
  SavingsGoal,
  SavingsRule,
} from "./types/savings.types";
import type { BudgetCategoryValue } from "./types/budget.types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const AI_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Recurring charge detection thresholds
const RECURRING_CHARGE_MIN_OCCURRENCES = 2;
const RECURRING_CHARGE_CONFIDENCE_THRESHOLD = 70;
const SUBSCRIPTION_AMOUNT_VARIANCE_THRESHOLD = 0.15; // 15% variance allowed

// Subscription categories (common subscription merchants)
const SUBSCRIPTION_PATTERNS: Record<
  string,
  { type: string; category: string }
> = {
  netflix: { type: "streaming", category: "entertainment" },
  spotify: { type: "streaming", category: "entertainment" },
  hulu: { type: "streaming", category: "entertainment" },
  disney: { type: "streaming", category: "entertainment" },
  "amazon prime": { type: "streaming", category: "entertainment" },
  "apple music": { type: "streaming", category: "entertainment" },
  "youtube premium": { type: "streaming", category: "entertainment" },
  adobe: { type: "software", category: "software" },
  "microsoft 365": { type: "software", category: "software" },
  dropbox: { type: "software", category: "software" },
  "google one": { type: "software", category: "software" },
  icloud: { type: "software", category: "software" },
  github: { type: "software", category: "software" },
  "linkedin premium": { type: "membership", category: "professional" },
  gym: { type: "membership", category: "health" },
  "planet fitness": { type: "membership", category: "health" },
  "la fitness": { type: "membership", category: "health" },
  "anytime fitness": { type: "membership", category: "health" },
  audible: { type: "membership", category: "entertainment" },
  "kindle unlimited": { type: "membership", category: "entertainment" },
  insurance: { type: "insurance", category: "insurance" },
  geico: { type: "insurance", category: "insurance" },
  "state farm": { type: "insurance", category: "insurance" },
  progressive: { type: "insurance", category: "insurance" },
};

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  merchantName: string;
  description?: string;
  category?: BudgetCategoryValue;
  date: Date;
}

interface RecurringPattern {
  merchantName: string;
  transactions: Transaction[];
  averageAmount: number;
  variance: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  dayOfMonth?: number;
  dayOfWeek?: number;
  confidence: number;
}

// ============================================================================
// SAVINGS OPTIMIZER CLASS
// ============================================================================

export class SavingsOptimizer {
  private aiCache: Map<string, { data: unknown; timestamp: number }> =
    new Map();

  constructor() {}

  /**
   * Analyze spending patterns to identify savings opportunities
   */
  async analyzeSpendingForSavings(
    userId: string,
    period: "monthly" | "quarterly" | "yearly" = "monthly",
  ): Promise<SavingsAnalysis> {
    // Calculate period dates
    const { periodStart, periodEnd } = this.calculatePeriodDates(period);

    // Fetch transactions for the period
    const transactions = await this.fetchTransactionsForPeriod(
      userId,
      periodStart,
      periodEnd,
    );

    // Fetch user's income (from financial context or profile)
    const monthlyIncome = await this.getUserMonthlyIncome(userId);

    // Calculate spending summary
    const summary = this.calculateSpendingSummary(transactions, monthlyIncome);

    // Find recurring charges
    const recurringCharges = await this.findRecurringCharges(userId);

    // Generate subscription recommendations
    const subscriptionRecommendations =
      await this.suggestCancelableSubscriptions(userId);

    // Identify savings opportunities
    const opportunities = await this.identifySavingsOpportunities(
      userId,
      transactions,
      recurringCharges,
      monthlyIncome,
    );

    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(
      transactions,
      opportunities,
    );

    // Analyze trends
    const trends = await this.analyzeSpendingTrends(userId, transactions);

    // Get AI insights
    const aiInsights = await this.generateAIInsights(
      userId,
      summary,
      opportunities,
      recurringCharges,
    );

    return {
      userId,
      period,
      periodStart,
      periodEnd,
      summary,
      opportunities,
      recurringCharges,
      subscriptionRecommendations,
      categoryBreakdown,
      trends,
      aiInsights,
      generatedAt: new Date(),
    };
  }

  /**
   * Find recurring charges and subscriptions using transaction patterns
   */
  async findRecurringCharges(
    userId: string,
    minAmount: number = 0,
  ): Promise<RecurringCharge[]> {
    // Fetch transactions from last 12 months for pattern detection
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", twelveMonthsAgo.toISOString())
      .order("date", { ascending: false });

    if (error || !transactions) {
      // Savings optimizer error: fetching transactions
      return [];
    }

    // Group transactions by merchant
    const merchantGroups = this.groupTransactionsByMerchant(
      transactions.map((t) => ({
        id: t.id,
        userId: t.user_id,
        accountId: t.account_id,
        amount: Math.abs(t.amount),
        merchantName: t.merchant_name || t.description || "Unknown",
        description: t.description,
        category: t.category,
        date: new Date(t.date),
      })),
    );

    // Detect recurring patterns
    const recurringPatterns: RecurringPattern[] = [];
    for (const [merchantName, merchantTransactions] of Object.entries(
      merchantGroups,
    )) {
      if (merchantTransactions.length < RECURRING_CHARGE_MIN_OCCURRENCES) {
        continue;
      }

      const pattern = this.detectRecurringPattern(
        merchantName,
        merchantTransactions,
      );
      if (
        pattern &&
        pattern.confidence >= RECURRING_CHARGE_CONFIDENCE_THRESHOLD
      ) {
        recurringPatterns.push(pattern);
      }
    }

    // Convert patterns to RecurringCharge objects
    const recurringCharges: RecurringCharge[] = recurringPatterns
      .filter((pattern) => pattern.averageAmount >= minAmount)
      .map((pattern) => {
        const isSubscription = this.isSubscriptionMerchant(
          pattern.merchantName,
        );
        const subscriptionInfo = this.getSubscriptionInfo(pattern.merchantName);

        return {
          id: crypto.randomUUID(),
          merchantName: pattern.merchantName,
          category: subscriptionInfo?.category || "other",
          amount: pattern.averageAmount,
          frequency: pattern.frequency,
          dayOfMonth: pattern.dayOfMonth,
          dayOfWeek: pattern.dayOfWeek,
          confidence: pattern.confidence,
          transactionCount: pattern.transactions.length,
          firstDetectedAt:
            pattern.transactions[pattern.transactions.length - 1].date,
          lastChargeAt: pattern.transactions[0].date,
          nextExpectedAt: this.calculateNextExpectedDate(pattern),
          variance: pattern.variance,
          isSubscription,
          subscriptionType:
            subscriptionInfo?.type as RecurringCharge["subscriptionType"],
          cancellable: isSubscription,
          transactions: pattern.transactions.map((t) => ({
            id: t.id,
            date: t.date,
            amount: t.amount,
          })),
        };
      });

    if (recurringCharges.length > 0) {
      try {
        await this.classifyRecurringChargeImportance(userId, recurringCharges);
      } catch (error) {
        // Savings optimizer warning: AI classification failed, using fallback
      }
    }

    return recurringCharges.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Suggest potentially cancelable or optimizable subscriptions
   */
  async suggestCancelableSubscriptions(
    userId: string,
  ): Promise<SubscriptionRecommendation[]> {
    const recurringCharges = await this.findRecurringCharges(userId);
    const subscriptions = recurringCharges.filter(
      (charge) => charge.isSubscription,
    );

    if (subscriptions.length === 0) {
      return [];
    }

    const recommendations: SubscriptionRecommendation[] = [];

    // Analyze each subscription
    for (const subscription of subscriptions) {
      const recommendation = await this.analyzeSubscription(
        userId,
        subscription,
      );
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    if (recommendations.length > 0) {
      try {
        await this.enhanceSubscriptionRecommendationsWithAI(
          userId,
          recommendations,
          subscriptions,
        );
      } catch (error) {
        // Savings optimizer warning: AI enhancement failed, using rule-based recommendations
      }
    }

    return recommendations.sort(
      (a, b) => b.potentialAnnualSavings - a.potentialAnnualSavings,
    );
  }

  /**
   * Calculate total potential savings across all recommendations
   */
  async calculatePotentialSavings(
    userId: string,
  ): Promise<PotentialSavingsSummary> {
    const analysis = await this.analyzeSpendingForSavings(userId, "monthly");

    const subscriptionSavings = analysis.subscriptionRecommendations.reduce(
      (sum, rec) => sum + rec.potentialMonthlySavings,
      0,
    );

    const categoryOptimizationSavings = analysis.opportunities
      .filter((opp) => opp.type === "category_optimization")
      .reduce((sum, opp) => sum + opp.potentialMonthlySavings, 0);

    const recurringChargeSavings = analysis.opportunities
      .filter((opp) => opp.type === "recurring_charge")
      .reduce((sum, opp) => sum + opp.potentialMonthlySavings, 0);

    const oneTimeSavings = analysis.opportunities
      .filter((opp) => opp.type === "one_time")
      .reduce((sum, opp) => sum + opp.potentialMonthlySavings, 0);

    const totalMonthlySavings =
      subscriptionSavings +
      categoryOptimizationSavings +
      recurringChargeSavings +
      oneTimeSavings;

    const topOpportunities = analysis.opportunities
      .sort((a, b) => b.potentialMonthlySavings - a.potentialMonthlySavings)
      .slice(0, 5);

    return {
      totalMonthlySavings,
      totalAnnualSavings: totalMonthlySavings * 12,
      breakdown: {
        subscriptions: subscriptionSavings,
        categoryOptimization: categoryOptimizationSavings,
        recurringCharges: recurringChargeSavings,
        oneTimeOpportunities: oneTimeSavings,
      },
      topOpportunities,
      implementationDifficulty:
        this.calculateImplementationDifficulty(topOpportunities),
      estimatedTimeToImplement:
        this.estimateImplementationTime(topOpportunities),
    };
  }

  /**
   * Generate personalized savings goal recommendations based on income and spending
   */
  async generateSavingsGoalRecommendations(
    userId: string,
    targetAmount?: number,
  ): Promise<SavingsGoalRecommendation[]> {
    // Fetch user's financial context
    const monthlyIncome = await this.getUserMonthlyIncome(userId);
    const potentialSavings = await this.calculatePotentialSavings(userId);
    const existingGoals = await this.getExistingGoals(userId);

    // Calculate available savings capacity
    const availableMonthlySavings = potentialSavings.totalMonthlySavings;

    const recommendations: SavingsGoalRecommendation[] = [];

    // 1. Emergency Fund (if not exists or insufficient)
    const emergencyFundGoal = existingGoals.find(
      (g) => g.category === "emergency_fund",
    );
    const recommendedEmergencyFund = monthlyIncome * 6; // 6 months of expenses

    if (
      !emergencyFundGoal ||
      emergencyFundGoal.targetAmount < recommendedEmergencyFund
    ) {
      const currentAmount = emergencyFundGoal?.currentAmount || 0;
      const remainingAmount = recommendedEmergencyFund - currentAmount;

      recommendations.push({
        id: crypto.randomUUID(),
        type: "emergency_fund",
        title: "Build Emergency Fund",
        description: `Save ${this.formatCurrency(recommendedEmergencyFund)} (6 months of expenses) for financial security`,
        recommendedAmount: remainingAmount,
        recommendedMonthlyContribution: Math.min(
          availableMonthlySavings * 0.5,
          remainingAmount / 12,
        ),
        targetDate: this.calculateTargetDate(
          remainingAmount,
          availableMonthlySavings * 0.5,
        ),
        priority: 1,
        reasoning:
          "Emergency fund is the foundation of financial security. Aim for 6 months of expenses.",
        confidence: 95,
        basedOn: [
          {
            factor: "Monthly Income",
            value: this.formatCurrency(monthlyIncome),
          },
          {
            factor: "Recommended Amount",
            value: this.formatCurrency(recommendedEmergencyFund),
          },
        ],
        aiGenerated: false,
      });
    }

    // 2. Debt Payoff (if user has high-interest debt)
    const hasHighInterestDebt = await this.hasHighInterestDebt(userId);
    if (hasHighInterestDebt) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: "debt_payoff",
        title: "Pay Off High-Interest Debt",
        description: "Eliminate high-interest debt to save on interest charges",
        recommendedAmount: targetAmount || 5000,
        recommendedMonthlyContribution: Math.min(
          availableMonthlySavings * 0.3,
          500,
        ),
        priority: 2,
        reasoning:
          "Paying off high-interest debt saves money on interest and improves credit score.",
        confidence: 90,
        basedOn: [
          {
            factor: "Available Monthly Savings",
            value: this.formatCurrency(availableMonthlySavings),
          },
        ],
        aiGenerated: false,
      });
    }

    // 3. Retirement Savings
    const retirementGoal = existingGoals.find(
      (g) => g.category === "retirement",
    );
    if (!retirementGoal) {
      recommendations.push({
        id: crypto.randomUUID(),
        type: "retirement",
        title: "Start Retirement Savings",
        description:
          "Begin saving for retirement with consistent monthly contributions",
        recommendedAmount: monthlyIncome * 12 * 10, // 10 years of income
        recommendedMonthlyContribution: Math.min(
          availableMonthlySavings * 0.15,
          monthlyIncome * 0.15,
        ),
        priority: 3,
        reasoning:
          "Starting early with retirement savings leverages compound interest for long-term growth.",
        confidence: 85,
        basedOn: [
          {
            factor: "Monthly Income",
            value: this.formatCurrency(monthlyIncome),
          },
          { factor: "Recommended Contribution", value: "15% of income" },
        ],
        aiGenerated: false,
      });
    }

    try {
      const aiRecommendations =
        await this.generateAISavingsGoalRecommendations(
          userId,
          monthlyIncome,
          availableMonthlySavings,
          existingGoals,
        );
      recommendations.push(...aiRecommendations);
    } catch (error) {
      // Savings optimizer warning: AI goal recommendations failed
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate period start and end dates
   */
  private calculatePeriodDates(period: "monthly" | "quarterly" | "yearly"): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    const periodEnd = new Date(now);
    const periodStart = new Date(now);

    switch (period) {
      case "monthly":
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      case "quarterly":
        periodStart.setMonth(periodStart.getMonth() - 3);
        break;
      case "yearly":
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
    }

    return { periodStart, periodEnd };
  }

  /**
   * Fetch transactions for a specific period
   */
  private async fetchTransactionsForPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Transaction[]> {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", periodStart.toISOString())
      .lte("date", periodEnd.toISOString())
      .order("date", { ascending: false });

    if (error || !transactions) {
      // Savings optimizer error: fetching transactions
      return [];
    }

    return transactions.map((t) => ({
      id: t.id,
      userId: t.user_id,
      accountId: t.account_id,
      amount: Math.abs(t.amount),
      merchantName: t.merchant_name || t.description || "Unknown",
      description: t.description,
      category: t.category,
      date: new Date(t.date),
    }));
  }

  /**
   * Get user's monthly income
   */
  private async getUserMonthlyIncome(userId: string): Promise<number> {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("monthly_income")
      .eq("id", userId)
      .single();

    if (error || !profile || !profile.monthly_income) {
      // Fallback: estimate from transaction history
      return this.estimateMonthlyIncome(userId);
    }

    return profile.monthly_income;
  }

  /**
   * Estimate monthly income from transaction history
   */
  private async estimateMonthlyIncome(userId: string): Promise<number> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("amount, date")
      .eq("user_id", userId)
      .gte("date", threeMonthsAgo.toISOString())
      .gt("amount", 0); // Positive amounts (income)

    if (error || !transactions || transactions.length === 0) {
      return 5000; // Default fallback
    }

    const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthsCount = 3;
    return totalIncome / monthsCount;
  }

  /**
   * Calculate spending summary
   */
  private calculateSpendingSummary(
    transactions: Transaction[],
    monthlyIncome: number,
  ): SavingsAnalysis["summary"] {
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);

    const essentialCategories = [
      "housing",
      "utilities",
      "groceries",
      "transportation",
      "healthcare",
      "insurance",
    ];
    const subscriptionCategories = ["streaming", "software", "membership"];

    const essentialSpending = transactions
      .filter((t) => essentialCategories.includes(t.category || ""))
      .reduce((sum, t) => sum + t.amount, 0);

    const discretionarySpending = totalSpending - essentialSpending;

    const subscriptionSpending = transactions
      .filter((t) => subscriptionCategories.includes(t.category || ""))
      .reduce((sum, t) => sum + t.amount, 0);

    const recurringCharges = 0; // Will be calculated separately

    const currentSavings = monthlyIncome - totalSpending;
    const savingsRate =
      monthlyIncome > 0 ? (currentSavings / monthlyIncome) * 100 : 0;
    const recommendedSavingsRate = 20; // 20% recommended

    return {
      totalSpending,
      essentialSpending,
      discretionarySpending,
      subscriptionSpending,
      recurringCharges,
      potentialMonthlySavings: 0, // Will be calculated from opportunities
      potentialAnnualSavings: 0,
      savingsRate,
      recommendedSavingsRate,
    };
  }

  /**
   * Group transactions by merchant
   */
  private groupTransactionsByMerchant(
    transactions: Transaction[],
  ): Record<string, Transaction[]> {
    const groups: Record<string, Transaction[]> = {};

    for (const transaction of transactions) {
      const merchantKey = transaction.merchantName.toLowerCase().trim();
      if (!groups[merchantKey]) {
        groups[merchantKey] = [];
      }
      groups[merchantKey].push(transaction);
    }

    return groups;
  }

  /**
   * Detect recurring pattern in merchant transactions
   */
  private detectRecurringPattern(
    merchantName: string,
    transactions: Transaction[],
  ): RecurringPattern | null {
    if (transactions.length < RECURRING_CHARGE_MIN_OCCURRENCES) {
      return null;
    }

    // Sort by date (oldest first)
    const sortedTransactions = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Calculate average amount and variance
    const amounts = sortedTransactions.map((t) => t.amount);
    const averageAmount =
      amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance = this.calculateVariance(amounts, averageAmount);

    // Check if amounts are consistent (low variance)
    if (variance > SUBSCRIPTION_AMOUNT_VARIANCE_THRESHOLD) {
      // High variance, might not be a subscription
      // But could still be a recurring charge with variable amounts
    }

    // Calculate time intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < sortedTransactions.length; i++) {
      const daysDiff = Math.round(
        (sortedTransactions[i].date.getTime() -
          sortedTransactions[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      intervals.push(daysDiff);
    }

    if (intervals.length === 0) {
      return null;
    }

    const averageInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Determine frequency based on average interval
    let frequency: RecurringPattern["frequency"];
    let confidence = 0;

    if (averageInterval >= 6 && averageInterval <= 8) {
      frequency = "weekly";
      confidence = 85;
    } else if (averageInterval >= 13 && averageInterval <= 15) {
      frequency = "biweekly";
      confidence = 85;
    } else if (averageInterval >= 28 && averageInterval <= 32) {
      frequency = "monthly";
      confidence = 90;
    } else if (averageInterval >= 88 && averageInterval <= 95) {
      frequency = "quarterly";
      confidence = 80;
    } else if (averageInterval >= 360 && averageInterval <= 370) {
      frequency = "annually";
      confidence = 75;
    } else {
      // Irregular pattern
      return null;
    }

    // Adjust confidence based on variance
    if (variance < 0.05) {
      confidence += 10;
    } else if (variance > 0.2) {
      confidence -= 15;
    }

    confidence = Math.max(0, Math.min(100, confidence));

    return {
      merchantName,
      transactions: sortedTransactions,
      averageAmount,
      variance,
      frequency,
      confidence,
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(amounts: number[], average: number): number {
    if (amounts.length === 0 || average === 0) return 0;
    const squaredDiffs = amounts.map((amt) => Math.pow(amt - average, 2));
    const variance =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / amounts.length;
    return Math.sqrt(variance) / average; // Coefficient of variation
  }

  /**
   * Check if merchant is a known subscription service
   */
  private isSubscriptionMerchant(merchantName: string): boolean {
    const merchantLower = merchantName.toLowerCase();
    return Object.keys(SUBSCRIPTION_PATTERNS).some((pattern) =>
      merchantLower.includes(pattern),
    );
  }

  /**
   * Get subscription info for a merchant
   */
  private getSubscriptionInfo(
    merchantName: string,
  ): { type: string; category: string } | null {
    const merchantLower = merchantName.toLowerCase();
    for (const [pattern, info] of Object.entries(SUBSCRIPTION_PATTERNS)) {
      if (merchantLower.includes(pattern)) {
        return info;
      }
    }
    return null;
  }

  /**
   * Calculate next expected date for recurring charge
   */
  private calculateNextExpectedDate(pattern: RecurringPattern): Date {
    const lastDate = pattern.transactions[0].date;
    const nextDate = new Date(lastDate);

    switch (pattern.frequency) {
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "biweekly":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "annually":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * Classify recurring charge importance using AI
   */
  private async classifyRecurringChargeImportance(
    userId: string,
    recurringCharges: RecurringCharge[],
  ): Promise<void> {
    const cacheKey = `recurring-importance-${userId}`;
    const cached = this.aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
      const cachedData = cached.data as Record<
        string,
        RecurringCharge["importance"]
      >;
      for (const charge of recurringCharges) {
        if (cachedData[charge.merchantName]) {
          charge.importance = cachedData[charge.merchantName];
        }
      }
      return;
    }

    const prompt = `Analyze these recurring charges and classify each as 'essential', 'useful', 'optional', or 'unnecessary':

${recurringCharges.map((c, i) => `${i + 1}. ${c.merchantName} - $${c.amount.toFixed(2)}/${c.frequency} (${c.category})`).join("\n")}

Return JSON array with format: [{"merchant": "name", "importance": "essential|useful|optional|unnecessary", "reason": "brief explanation"}]`;

    try {
      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [{ role: "user", content: prompt }],
        { temperature: 0.3 },
      );

      const content = response.choices[0]?.message?.content || "[]";
      const classifications = JSON.parse(
        content.replace(/```json\n?|\n?```/g, ""),
      );

      const importanceMap: Record<string, RecurringCharge["importance"]> = {};
      for (const classification of classifications) {
        const charge = recurringCharges.find(
          (c) => c.merchantName === classification.merchant,
        );
        if (charge) {
          charge.importance = classification.importance;
          importanceMap[charge.merchantName] = classification.importance;
        }
      }

      this.aiCache.set(cacheKey, {
        data: importanceMap,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Savings optimizer warning: AI classification failed
    }
  }

  /**
   * Analyze subscription for cancellation recommendation
   */
  private async analyzeSubscription(
    userId: string,
    subscription: RecurringCharge,
  ): Promise<SubscriptionRecommendation | null> {
    // Calculate monthly and annual amounts
    let monthlyAmount = subscription.amount;
    switch (subscription.frequency) {
      case "weekly":
        monthlyAmount = subscription.amount * 4.33;
        break;
      case "biweekly":
        monthlyAmount = subscription.amount * 2.17;
        break;
      case "quarterly":
        monthlyAmount = subscription.amount / 3;
        break;
      case "annually":
        monthlyAmount = subscription.amount / 12;
        break;
    }

    const annualAmount = monthlyAmount * 12;

    // Determine recommendation type based on importance
    let type: SubscriptionRecommendation["type"] = "cancel";
    let potentialSavings = monthlyAmount;
    let reason = "";

    if (subscription.importance === "unnecessary") {
      type = "cancel";
      potentialSavings = monthlyAmount;
      reason =
        "This subscription appears to be unnecessary and can be cancelled to save money.";
    } else if (subscription.importance === "optional") {
      type = "cancel";
      potentialSavings = monthlyAmount;
      reason =
        "This subscription is optional and could be cancelled if you want to reduce expenses.";
    } else if (subscription.importance === "useful") {
      type = "downgrade";
      potentialSavings = monthlyAmount * 0.3; // Assume 30% savings from downgrade
      reason =
        "Consider downgrading to a lower-tier plan to save money while keeping the service.";
    } else {
      // Essential - no recommendation
      return null;
    }

    return {
      id: crypto.randomUUID(),
      recurringChargeId: subscription.id,
      merchantName: subscription.merchantName,
      monthlyAmount,
      annualAmount,
      type,
      reason,
      confidence: subscription.confidence,
      potentialMonthlySavings: potentialSavings,
      potentialAnnualSavings: potentialSavings * 12,
      importance: subscription.importance || "optional",
      aiGenerated: false,
    };
  }

  /**
   * Enhance subscription recommendations with AI
   */
  private async enhanceSubscriptionRecommendationsWithAI(
    userId: string,
    recommendations: SubscriptionRecommendation[],
    subscriptions: RecurringCharge[],
  ): Promise<void> {
    const prompt = `Analyze these subscriptions and provide enhanced recommendations:

${subscriptions.map((s, i) => `${i + 1}. ${s.merchantName} - $${s.amount.toFixed(2)}/${s.frequency}`).join("\n")}

For each subscription, suggest:
1. Whether to cancel, downgrade, consolidate, or negotiate
2. Potential alternatives with lower costs
3. Usage indicators (if applicable)

Return JSON array with format: [{"merchant": "name", "action": "cancel|downgrade|consolidate|negotiate", "alternatives": [{"name": "alt", "monthlyCost": 0, "savings": 0}], "reason": "explanation"}]`;

    try {
      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [{ role: "user", content: prompt }],
        { temperature: 0.4 },
      );

      const content = response.choices[0]?.message?.content || "[]";
      const enhancements = JSON.parse(
        content.replace(/```json\n?|\n?```/g, ""),
      );

      for (const enhancement of enhancements) {
        const recommendation = recommendations.find(
          (r) => r.merchantName === enhancement.merchant,
        );
        if (recommendation) {
          recommendation.type = enhancement.action;
          recommendation.alternatives = enhancement.alternatives;
          recommendation.reason = enhancement.reason;
          recommendation.aiGenerated = true;
        }
      }
    } catch (error) {
      // Savings optimizer warning: AI enhancement failed
    }
  }

  /**
   * Identify savings opportunities from transactions
   */
  private async identifySavingsOpportunities(
    userId: string,
    transactions: Transaction[],
    recurringCharges: RecurringCharge[],
    monthlyIncome: number,
  ): Promise<SavingsOpportunity[]> {
    const opportunities: SavingsOpportunity[] = [];

    // 1. Subscription opportunities (from recurring charges)
    for (const charge of recurringCharges.filter((c) => c.isSubscription)) {
      if (
        charge.importance === "unnecessary" ||
        charge.importance === "optional"
      ) {
        opportunities.push({
          id: crypto.randomUUID(),
          type: "subscription",
          category: charge.category,
          title: `Cancel ${charge.merchantName}`,
          description: `Save money by cancelling this ${charge.importance} subscription`,
          currentMonthlySpending: charge.amount,
          recommendedMonthlySpending: 0,
          potentialMonthlySavings: charge.amount,
          potentialAnnualSavings: charge.amount * 12,
          confidence: charge.confidence,
          difficulty: "easy",
          impact: charge.amount > 20 ? "high" : "medium",
          actionable: true,
          actions: [
            {
              label: "Cancel Subscription",
              type: "cancel",
              data: { chargeId: charge.id },
            },
          ],
          aiGenerated: false,
        });
      }
    }

    // 2. Category optimization opportunities
    const categorySpending = this.calculateCategorySpending(transactions);
    for (const [category, amount] of Object.entries(categorySpending)) {
      const benchmark = this.getCategoryBenchmark(category, monthlyIncome);
      if (amount > benchmark * 1.2) {
        // Spending 20% more than benchmark
        const potentialSavings = amount - benchmark;
        opportunities.push({
          id: crypto.randomUUID(),
          type: "category_optimization",
          category,
          title: `Reduce ${category} spending`,
          description: `You're spending ${((amount / benchmark - 1) * 100).toFixed(0)}% more than recommended on ${category}`,
          currentMonthlySpending: amount,
          recommendedMonthlySpending: benchmark,
          potentialMonthlySavings: potentialSavings,
          potentialAnnualSavings: potentialSavings * 12,
          confidence: 75,
          difficulty: "medium",
          impact: potentialSavings > 100 ? "high" : "medium",
          actionable: true,
          actions: [
            {
              label: "Set Budget Limit",
              type: "reduce",
              data: { category, limit: benchmark },
            },
          ],
          aiGenerated: false,
        });
      }
    }

    return opportunities;
  }

  /**
   * Calculate category spending
   */
  private calculateCategorySpending(
    transactions: Transaction[],
  ): Record<string, number> {
    const categorySpending: Record<string, number> = {};
    for (const transaction of transactions) {
      const category = transaction.category || "other";
      categorySpending[category] =
        (categorySpending[category] || 0) + transaction.amount;
    }
    return categorySpending;
  }

  /**
   * Get category benchmark (recommended spending)
   */
  private getCategoryBenchmark(
    category: string,
    monthlyIncome: number,
  ): number {
    const benchmarks: Record<string, number> = {
      housing: monthlyIncome * 0.3,
      transportation: monthlyIncome * 0.15,
      groceries: monthlyIncome * 0.1,
      dining_out: monthlyIncome * 0.05,
      entertainment: monthlyIncome * 0.05,
      shopping: monthlyIncome * 0.05,
      utilities: monthlyIncome * 0.05,
      healthcare: monthlyIncome * 0.05,
      insurance: monthlyIncome * 0.1,
      other: monthlyIncome * 0.05,
    };
    return benchmarks[category] || monthlyIncome * 0.05;
  }

  /**
   * Calculate category breakdown
   */
  private calculateCategoryBreakdown(
    transactions: Transaction[],
    opportunities: SavingsOpportunity[],
  ): SavingsAnalysis["categoryBreakdown"] {
    const categorySpending = this.calculateCategorySpending(transactions);
    const totalSpending = Object.values(categorySpending).reduce(
      (sum, amt) => sum + amt,
      0,
    );

    const breakdown: SavingsAnalysis["categoryBreakdown"] = [];
    for (const [category, currentSpending] of Object.entries(
      categorySpending,
    )) {
      const categoryOpportunities = opportunities.filter(
        (opp) => opp.category === category,
      );
      const potentialSavings = categoryOpportunities.reduce(
        (sum, opp) => sum + opp.potentialMonthlySavings,
        0,
      );
      const recommendedSpending = currentSpending - potentialSavings;

      breakdown.push({
        category,
        currentSpending,
        recommendedSpending,
        potentialSavings,
        percentOfTotal: (currentSpending / totalSpending) * 100,
      });
    }

    return breakdown.sort((a, b) => b.currentSpending - a.currentSpending);
  }

  /**
   * Analyze spending trends
   */
  private async analyzeSpendingTrends(
    userId: string,
    transactions: Transaction[],
  ): Promise<SavingsAnalysis["trends"]> {
    // Get previous period transactions for comparison
    const previousPeriodStart = new Date();
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 2);
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

    const previousTransactions = await this.fetchTransactionsForPeriod(
      userId,
      previousPeriodStart,
      previousPeriodEnd,
    );

    const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
    const previousTotal = previousTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    let spendingTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (currentTotal > previousTotal * 1.1) {
      spendingTrend = "increasing";
    } else if (currentTotal < previousTotal * 0.9) {
      spendingTrend = "decreasing";
    }

    // Calculate category changes
    const currentCategorySpending =
      this.calculateCategorySpending(transactions);
    const previousCategorySpending =
      this.calculateCategorySpending(previousTransactions);

    const topSpendingCategories = Object.entries(currentCategorySpending)
      .map(([category, amount]) => {
        const previousAmount = previousCategorySpending[category] || 0;
        const percentChange =
          previousAmount > 0
            ? ((amount - previousAmount) / previousAmount) * 100
            : 0;
        return { category, amount, percentChange };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      spendingTrend,
      savingsTrend:
        spendingTrend === "decreasing"
          ? "improving"
          : spendingTrend === "increasing"
            ? "declining"
            : "stable",
      topSpendingCategories,
    };
  }

  /**
   * Generate AI insights
   */
  private async generateAIInsights(
    userId: string,
    summary: SavingsAnalysis["summary"],
    opportunities: SavingsOpportunity[],
    recurringCharges: RecurringCharge[],
  ): Promise<string[]> {
    const cacheKey = `savings-insights-${userId}`;
    const cached = this.aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
      return cached.data as string[];
    }

    const prompt = `Analyze this financial data and provide 3-5 actionable savings insights:

Summary:
- Total Spending: $${summary.totalSpending.toFixed(2)}
- Savings Rate: ${summary.savingsRate.toFixed(1)}%
- Potential Monthly Savings: $${summary.potentialMonthlySavings.toFixed(2)}

Top Opportunities:
${opportunities
  .slice(0, 5)
  .map(
    (opp, i) =>
      `${i + 1}. ${opp.title} - Save $${opp.potentialMonthlySavings.toFixed(2)}/month`,
  )
  .join("\n")}

Recurring Charges: ${recurringCharges.length} found

Provide brief, actionable insights (1-2 sentences each).`;

    try {
      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [{ role: "user", content: prompt }],
        { temperature: 0.5 },
      );

      const content = response.choices[0]?.message?.content || "";
      const insights = content
        .split("\n")
        .filter((line) => line.trim().length > 0 && !line.startsWith("#"))
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 20)
        .slice(0, 5);

      this.aiCache.set(cacheKey, { data: insights, timestamp: Date.now() });
      return insights;
    } catch (error) {
      // Savings optimizer warning: AI insights failed
      return this.generateFallbackInsights(summary, opportunities);
    }
  }

  /**
   * Generate fallback insights (rule-based)
   */
  private generateFallbackInsights(
    summary: SavingsAnalysis["summary"],
    opportunities: SavingsOpportunity[],
  ): string[] {
    const insights: string[] = [];

    if (summary.savingsRate < 10) {
      insights.push(
        "Your savings rate is below the recommended 20%. Consider implementing the top savings opportunities to improve your financial health.",
      );
    }

    if (opportunities.length > 0) {
      const topOpp = opportunities[0];
      insights.push(
        `Your biggest savings opportunity is ${topOpp.title}, which could save you $${topOpp.potentialAnnualSavings.toFixed(0)} per year.`,
      );
    }

    if (summary.subscriptionSpending > summary.totalSpending * 0.1) {
      insights.push(
        "Subscriptions account for more than 10% of your spending. Review and cancel unused subscriptions to free up cash.",
      );
    }

    return insights;
  }

  /**
   * Get existing savings goals for user
   */
  private async getExistingGoals(userId: string): Promise<SavingsGoal[]> {
    const { data: goals, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "paused"]);

    if (error || !goals) {
      // Savings optimizer error: fetching savings goals
      return [];
    }

    return goals.map((g) => ({
      id: g.id,
      userId: g.user_id,
      name: g.name,
      category: g.category,
      status: g.status,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      targetDate: g.target_date ? new Date(g.target_date) : undefined,
      startDate: new Date(g.start_date),
      completedAt: g.completed_at ? new Date(g.completed_at) : undefined,
      autoSaveEnabled: g.auto_save_enabled,
      linkedRuleIds: g.linked_rule_ids || [],
      priority: g.priority,
      progressPercentage: g.progress_percentage,
      projectedCompletionDate: g.projected_completion_date
        ? new Date(g.projected_completion_date)
        : undefined,
      onTrack: g.on_track,
      contributions: [],
      icon: g.icon,
      color: g.color,
      notes: g.notes,
      createdAt: new Date(g.created_at),
      updatedAt: new Date(g.updated_at),
    }));
  }

  /**
   * Check if user has high-interest debt
   */
  private async hasHighInterestDebt(userId: string): Promise<boolean> {
    const { data: debts, error } = await supabase
      .from("debts")
      .select("interest_rate")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error || !debts) {
      return false;
    }

    return debts.some((d) => d.interest_rate > 10); // >10% APR considered high-interest
  }

  /**
   * Generate AI savings goal recommendations
   */
  private async generateAISavingsGoalRecommendations(
    userId: string,
    monthlyIncome: number,
    availableMonthlySavings: number,
    existingGoals: SavingsGoal[],
  ): Promise<SavingsGoalRecommendation[]> {
    const prompt = `Based on this financial profile, suggest 2-3 personalized savings goals:

Monthly Income: $${monthlyIncome.toFixed(2)}
Available Monthly Savings: $${availableMonthlySavings.toFixed(2)}
Existing Goals: ${existingGoals.map((g) => `${g.name} ($${g.targetAmount})`).join(", ") || "None"}

Suggest goals that are:
1. Realistic and achievable
2. Aligned with financial priorities
3. Not duplicates of existing goals

Return JSON array with format: [{"type": "vacation|major_purchase|education|custom", "title": "Goal Name", "description": "Brief description", "recommendedAmount": 0, "recommendedMonthlyContribution": 0, "priority": 1-5, "reasoning": "Why this goal"}]`;

    try {
      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [{ role: "user", content: prompt }],
        { temperature: 0.5 },
      );

      const content = response.choices[0]?.message?.content || "[]";
      const aiGoals = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));

      return aiGoals.map((goal: any) => ({
        id: crypto.randomUUID(),
        type: goal.type,
        title: goal.title,
        description: goal.description,
        recommendedAmount: goal.recommendedAmount,
        recommendedMonthlyContribution: goal.recommendedMonthlyContribution,
        targetDate: this.calculateTargetDate(
          goal.recommendedAmount,
          goal.recommendedMonthlyContribution,
        ),
        priority: goal.priority,
        reasoning: goal.reasoning,
        confidence: 80,
        basedOn: [
          {
            factor: "Monthly Income",
            value: this.formatCurrency(monthlyIncome),
          },
          {
            factor: "Available Savings",
            value: this.formatCurrency(availableMonthlySavings),
          },
        ],
        aiGenerated: true,
      }));
    } catch (error) {
      // Savings optimizer warning: AI goal recommendations failed
      return [];
    }
  }

  /**
   * Calculate target date for savings goal
   */
  private calculateTargetDate(
    targetAmount: number,
    monthlyContribution: number,
  ): Date | undefined {
    if (monthlyContribution <= 0) return undefined;
    const monthsToGoal = Math.ceil(targetAmount / monthlyContribution);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsToGoal);
    return targetDate;
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Calculate implementation difficulty
   */
  private calculateImplementationDifficulty(
    opportunities: SavingsOpportunity[],
  ): "easy" | "medium" | "hard" {
    if (opportunities.length === 0) return "easy";
    const avgDifficulty =
      opportunities.reduce((sum, opp) => {
        const difficultyScore =
          opp.difficulty === "easy" ? 1 : opp.difficulty === "medium" ? 2 : 3;
        return sum + difficultyScore;
      }, 0) / opportunities.length;

    if (avgDifficulty < 1.5) return "easy";
    if (avgDifficulty < 2.5) return "medium";
    return "hard";
  }

  /**
   * Estimate implementation time
   */
  private estimateImplementationTime(
    opportunities: SavingsOpportunity[],
  ): string {
    if (opportunities.length === 0) return "0 hours";
    const totalMinutes = opportunities.reduce((sum, opp) => {
      const minutes =
        opp.difficulty === "easy" ? 15 : opp.difficulty === "medium" ? 30 : 60;
      return sum + minutes;
    }, 0);

    if (totalMinutes < 60) return `${totalMinutes} minutes`;
    const hours = Math.ceil(totalMinutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let savingsOptimizerInstance: SavingsOptimizer | null = null;

export function getSavingsOptimizer(): SavingsOptimizer {
  if (!savingsOptimizerInstance) {
    savingsOptimizerInstance = new SavingsOptimizer();
  }
  return savingsOptimizerInstance;
}
