/**
 * Spending Analyzer Service
 *
 * AI-powered intelligent spending analysis with pattern detection, anomaly detection,
 * trend analysis, and behavioral insights.
 *
 * Features:
 * - Pattern detection (recurring, seasonal, behavioral)
 * - Anomaly detection (z-score, IQR, AI-powered)
 * - Trend analysis with forecasting
 * - Spending velocity and acceleration tracking
 * - Behavioral trigger identification
 * - AI-generated insights and recommendations
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { getModelRouter, TaskType } from "@/lib/model-router";
import type {
  SpendingPatternAnalysis,
  DetectedPattern,
  PatternType,
  SpendingHabit,
  HabitType,
  SpendingVelocity,
  BehavioralTrigger,
  TriggerType,
  SpendingHealthScore,
  AIInsight,
  InsightType,
  ActionItem,
  AnomalyDetectionResult,
  SpendingAnomaly,
  AnomalyType,
  AnomalySummary,
  SpendingTrendAnalysis,
  CategoryTrend,
  TrendDirection,
  TrendDataPoint,
  SeasonalityAnalysis,
  SpendingForecast,
  PeriodComparison,
  CategoryChange,
  SignificantChange,
  InsightGenerationRequest,
  InsightGenerationResult,
  InsightSummary,
} from "./types/spending-intelligence.types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const AI_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Anomaly detection thresholds
const ZSCORE_THRESHOLD = 2.5; // Standard deviations
const IQR_MULTIPLIER = 1.5;
const MIN_TRANSACTIONS_FOR_PATTERN = 3;
const MIN_CONFIDENCE_THRESHOLD = 70;

// Pattern detection
const PATTERN_FREQUENCY_TOLERANCE = {
  daily: 1, // ±1 day
  weekly: 1, // ±1 day
  biweekly: 2, // ±2 days
  monthly: 3, // ±3 days
  quarterly: 7, // ±7 days
  yearly: 14, // ±14 days
};

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  date: Date;
  amount: number;
  merchant_name: string;
  category: string;
  subcategory?: string;
  is_pending: boolean;
  is_recurring: boolean;
  created_at: Date;
}

interface CategoryStats {
  category: string;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  count: number;
  total: number;
}

// ============================================================================
// SPENDING ANALYZER CLASS
// ============================================================================

export class SpendingAnalyzer {
  private aiCache: Map<string, { data: unknown; timestamp: number }> =
    new Map();

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Analyze spending patterns and habits
   */
  async analyzeSpendingPatterns(
    userId: string,
    period: "weekly" | "monthly" | "quarterly" | "yearly" = "monthly",
  ): Promise<SpendingPatternAnalysis> {
    const { startDate, endDate } = this.getPeriodDates(period);

    // Fetch transactions
    const transactions = await this.getTransactions(userId, startDate, endDate);

    // Detect patterns
    const patterns = await this.detectPatterns(transactions);

    // Identify habits
    const habits = await this.identifyHabits(transactions, patterns);

    // Calculate velocity
    const velocity = this.calculateSpendingVelocity(
      transactions,
      startDate,
      endDate,
    );

    // Identify triggers
    const triggers = await this.identifySpendingTriggers(transactions);

    // Calculate spending score
    const score = await this.calculateSpendingScore(
      userId,
      transactions,
      patterns,
      habits,
    );

    // Generate AI insights
    const aiInsights = await this.generateAIInsights(userId, {
      transactions,
      patterns,
      habits,
      velocity,
      triggers,
      score,
    });

    return {
      userId,
      period,
      periodStart: startDate,
      periodEnd: endDate,
      patterns,
      habits,
      velocity,
      triggers,
      score,
      aiInsights,
      generatedAt: new Date(),
    };
  }

  /**
   * Detect spending anomalies
   */
  async detectAnomalies(
    userId: string,
    sensitivity: "low" | "medium" | "high" = "medium",
    timeframe: number = 30,
  ): Promise<AnomalyDetectionResult> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    const transactions = await this.getTransactions(userId, startDate, endDate);
    const anomalies: SpendingAnomaly[] = [];

    // Get category statistics for z-score calculation
    const categoryStats = this.calculateCategoryStats(transactions);

    // Detect anomalies using multiple methods
    for (const transaction of transactions) {
      const stats = categoryStats.get(transaction.category);
      if (!stats || stats.count < 3) continue;

      // Z-score method
      const zScore = Math.abs((transaction.amount - stats.mean) / stats.stdDev);
      const threshold = this.getZScoreThreshold(sensitivity);

      if (zScore > threshold) {
        anomalies.push({
          id: `anomaly-${transaction.id}`,
          type: "unusual_large_transaction",
          severity: this.getSeverityFromZScore(zScore),
          title: `Unusual ${transaction.category} spending`,
          description: `Transaction of $${transaction.amount.toFixed(2)} is ${zScore.toFixed(1)} standard deviations above average`,
          transactionId: transaction.id,
          amount: transaction.amount,
          expectedAmount: stats.mean,
          deviation: ((transaction.amount - stats.mean) / stats.mean) * 100,
          category: transaction.category,
          merchant: transaction.merchant_name,
          date: transaction.date,
          confidence: Math.min(95, 50 + zScore * 10),
          detectionMethod: "zscore",
          requiresAction: zScore > threshold * 1.5,
          actionSuggestion: `Review this ${transaction.category} transaction with ${transaction.merchant_name}`,
        });
      }

      // IQR method for outlier detection
      const iqrOutlier = this.detectIQROutlier(transaction.amount, stats);
      if (iqrOutlier) {
        const existingAnomaly = anomalies.find(
          (a) => a.transactionId === transaction.id,
        );
        if (!existingAnomaly) {
          anomalies.push({
            id: `anomaly-${transaction.id}`,
            type: "unusual_large_transaction",
            severity: "medium",
            title: `Outlier ${transaction.category} spending`,
            description: `Transaction amount is outside normal range for this category`,
            transactionId: transaction.id,
            amount: transaction.amount,
            expectedAmount: stats.median,
            deviation:
              ((transaction.amount - stats.median) / stats.median) * 100,
            category: transaction.category,
            merchant: transaction.merchant_name,
            date: transaction.date,
            confidence: 75,
            detectionMethod: "iqr",
            requiresAction: false,
          });
        }
      }
    }

    // Detect duplicate charges
    const duplicates = this.detectDuplicateCharges(transactions);
    anomalies.push(...duplicates);

    // Detect unusual merchants
    const unusualMerchants = await this.detectUnusualMerchants(
      userId,
      transactions,
    );
    anomalies.push(...unusualMerchants);

    // Sort by severity and confidence
    anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff =
        severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });

    const summary = this.createAnomalySummary(anomalies);

    return {
      userId,
      timeframe,
      sensitivity,
      anomalies,
      summary,
      detectedAt: new Date(),
    };
  }

  /**
   * Get spending trends over time
   */
  async getSpendingTrends(
    userId: string,
    period: string,
    categories?: string[],
  ): Promise<SpendingTrendAnalysis> {
    const { startDate, endDate } = this.parsePeriod(period);
    const transactions = await this.getTransactions(userId, startDate, endDate);

    // Filter by categories if specified
    const filteredTransactions = categories
      ? transactions.filter((t) => categories.includes(t.category))
      : transactions;

    // Calculate trends by category
    const categoryTrends = await this.calculateCategoryTrends(
      userId,
      filteredTransactions,
      startDate,
      endDate,
    );

    // Determine overall trend
    const overallTrend = this.determineOverallTrend(categoryTrends);

    // Calculate growth rate
    const growthRate = this.calculateGrowthRate(
      filteredTransactions,
      startDate,
      endDate,
    );

    // Analyze seasonality
    const seasonality = await this.analyzeSeasonality(userId, categories);

    // Generate forecast
    const forecast = this.generateForecast(
      filteredTransactions,
      categoryTrends,
      seasonality,
    );

    // Compare with previous period
    const comparison = await this.compareWithPreviousPeriod(
      userId,
      filteredTransactions,
      startDate,
      endDate,
    );

    // Generate insights
    const insights = this.generateTrendInsights(
      categoryTrends,
      overallTrend,
      growthRate,
      seasonality,
    );

    return {
      userId,
      period,
      categories,
      categoryTrends,
      overallTrend,
      growthRate,
      seasonality,
      forecast,
      comparison,
      insights,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate AI-powered insights
   */
  async generateInsights(
    userId: string,
    analysisType: "patterns" | "trends" | "anomalies" | "all" = "all",
  ): Promise<InsightGenerationResult> {
    const startTime = Date.now();
    const insights: AIInsight[] = [];

    // Get data based on analysis type
    if (analysisType === "patterns" || analysisType === "all") {
      const patternAnalysis = await this.analyzeSpendingPatterns(
        userId,
        "monthly",
      );
      insights.push(...patternAnalysis.aiInsights);
    }

    if (analysisType === "trends" || analysisType === "all") {
      const trendAnalysis = await this.getSpendingTrends(userId, "3m");
      const trendInsights = await this.convertTrendInsightsToAI(trendAnalysis);
      insights.push(...trendInsights);
    }

    if (analysisType === "anomalies" || analysisType === "all") {
      const anomalyResult = await this.detectAnomalies(userId, "medium", 30);
      const anomalyInsights = this.convertAnomaliesToInsights(
        anomalyResult.anomalies,
      );
      insights.push(...anomalyInsights);
    }

    // Sort by priority and confidence
    insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    const summary = this.createInsightSummary(insights);
    const processingTimeMs = Date.now() - startTime;

    return {
      userId,
      insights,
      summary,
      generatedAt: new Date(),
      processingTimeMs,
      aiModelUsed: getModelRouter().getModel(TaskType.FINANCIAL_ADVICE),
    };
  }

  /**
   * Compare current period to last period
   */
  async compareToLastPeriod(
    userId: string,
    period: string,
    metric: "total" | "category" | "merchant" = "total",
  ): Promise<PeriodComparison> {
    const { startDate, endDate } = this.parsePeriod(period);
    const currentTransactions = await this.getTransactions(
      userId,
      startDate,
      endDate,
    );

    // Calculate previous period dates
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

    const previousTransactions = await this.getTransactions(
      userId,
      prevStartDate,
      prevEndDate,
    );

    const currentAmount = currentTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const previousAmount = previousTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    const change = currentAmount - previousAmount;
    const changePercent =
      previousAmount > 0 ? (change / previousAmount) * 100 : 0;

    // Calculate category changes
    const categoryChanges = this.calculateCategoryChanges(
      currentTransactions,
      previousTransactions,
    );

    // Identify significant changes
    const significantChanges = categoryChanges
      .filter((c) => Math.abs(c.changePercent) > 20 || Math.abs(c.change) > 100)
      .map((c) => ({
        category: c.category,
        type: c.change > 0 ? ("increase" as const) : ("decrease" as const),
        amount: Math.abs(c.change),
        percent: Math.abs(c.changePercent),
        impact: c.change > 0 ? ("negative" as const) : ("positive" as const),
      }));

    return {
      compareWith: "previous",
      currentPeriod: {
        start: startDate,
        end: endDate,
        amount: currentAmount,
      },
      comparisonPeriod: {
        start: prevStartDate,
        end: prevEndDate,
        amount: previousAmount,
      },
      change,
      changePercent,
      categoryChanges,
      significantChanges,
    };
  }

  /**
   * Get spending velocity
   */
  async getSpendingVelocity(userId: string): Promise<SpendingVelocity> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const transactions = await this.getTransactions(userId, startDate, endDate);

    return this.calculateSpendingVelocity(transactions, startDate, endDate);
  }

  /**
   * Calculate spending health score
   */
  async calculateSpendingScore(
    userId: string,
    transactions?: Transaction[],
    patterns?: DetectedPattern[],
    habits?: SpendingHabit[],
  ): Promise<SpendingHealthScore> {
    // Fetch data if not provided
    if (!transactions) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      transactions = await this.getTransactions(userId, startDate, endDate);
    }

    if (!patterns) {
      patterns = await this.detectPatterns(transactions);
    }

    if (!habits) {
      habits = await this.identifyHabits(transactions, patterns);
    }

    // Calculate sub-scores
    const consistency = this.calculateConsistencyScore(transactions, patterns);
    const control = this.calculateControlScore(transactions, habits);
    const planning = this.calculatePlanningScore(transactions, patterns);
    const efficiency = this.calculateEfficiencyScore(transactions);
    const sustainability = this.calculateSustainabilityScore(transactions);

    const overall = Math.round(
      consistency * 0.2 +
        control * 0.25 +
        planning * 0.2 +
        efficiency * 0.15 +
        sustainability * 0.2,
    );

    const grade = this.getGradeFromScore(overall);

    // Get previous score for trend
    const previousScore = await this.getPreviousSpendingScore(userId);
    const trend = this.determineTrend(overall, previousScore);

    return {
      overall,
      breakdown: {
        consistency,
        control,
        planning,
        efficiency,
        sustainability,
      },
      grade,
      trend,
      comparedToLastPeriod: overall - previousScore,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get transactions for a period
   */
  private async getTransactions(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: false });

    if (error) {
      // SpendingAnalyzer error: Error fetching transactions
      return [];
    }

    return (data || []).map((t) => ({
      ...t,
      date: new Date(t.date),
      created_at: new Date(t.created_at),
    }));
  }

  /**
   * Get period dates
   */
  private getPeriodDates(
    period: "weekly" | "monthly" | "quarterly" | "yearly",
  ): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "weekly":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "monthly":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarterly":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "yearly":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Parse period string (e.g., "3m", "1y", "30d")
   */
  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    const match = period.match(/^(\d+)([dwmqy])$/);
    if (!match) {
      // Default to 1 month
      startDate.setMonth(startDate.getMonth() - 1);
      return { startDate, endDate };
    }

    const [, amount, unit] = match;
    const num = parseInt(amount, 10);

    switch (unit) {
      case "d":
        startDate.setDate(startDate.getDate() - num);
        break;
      case "w":
        startDate.setDate(startDate.getDate() - num * 7);
        break;
      case "m":
        startDate.setMonth(startDate.getMonth() - num);
        break;
      case "q":
        startDate.setMonth(startDate.getMonth() - num * 3);
        break;
      case "y":
        startDate.setFullYear(startDate.getFullYear() - num);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Detect spending patterns
   */
  private async detectPatterns(
    transactions: Transaction[],
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Group transactions by merchant
    const merchantGroups = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const merchant = transaction.merchant_name.toLowerCase();
      if (!merchantGroups.has(merchant)) {
        merchantGroups.set(merchant, []);
      }
      merchantGroups.get(merchant)!.push(transaction);
    }

    // Detect recurring patterns
    for (const [merchant, txns] of Array.from(merchantGroups)) {
      if (txns.length < MIN_TRANSACTIONS_FOR_PATTERN) continue;

      const pattern = this.analyzeRecurringPattern(merchant, txns);
      if (pattern && pattern.confidence >= MIN_CONFIDENCE_THRESHOLD) {
        patterns.push(pattern);
      }
    }

    // Detect behavioral patterns
    const behavioralPatterns = this.detectBehavioralPatterns(transactions);
    patterns.push(...behavioralPatterns);

    return patterns;
  }

  /**
   * Analyze recurring pattern
   */
  private analyzeRecurringPattern(
    merchant: string,
    transactions: Transaction[],
  ): DetectedPattern | null {
    if (transactions.length < 2) return null;

    const sortedTxns = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxns.length; i++) {
      const days = Math.round(
        (sortedTxns[i].date.getTime() - sortedTxns[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      intervals.push(days);
    }

    const avgInterval =
      intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    // Determine frequency
    let frequency: DetectedPattern["frequency"] = "irregular";
    let confidence = 50;

    if (Math.abs(avgInterval - 1) <= PATTERN_FREQUENCY_TOLERANCE.daily) {
      frequency = "daily";
      confidence = 85;
    } else if (
      Math.abs(avgInterval - 7) <= PATTERN_FREQUENCY_TOLERANCE.weekly
    ) {
      frequency = "weekly";
      confidence = 90;
    } else if (
      Math.abs(avgInterval - 14) <= PATTERN_FREQUENCY_TOLERANCE.biweekly
    ) {
      frequency = "biweekly";
      confidence = 85;
    } else if (
      Math.abs(avgInterval - 30) <= PATTERN_FREQUENCY_TOLERANCE.monthly
    ) {
      frequency = "monthly";
      confidence = 95;
    } else if (
      Math.abs(avgInterval - 91) <= PATTERN_FREQUENCY_TOLERANCE.quarterly
    ) {
      frequency = "quarterly";
      confidence = 85;
    } else if (
      Math.abs(avgInterval - 365) <= PATTERN_FREQUENCY_TOLERANCE.yearly
    ) {
      frequency = "yearly";
      confidence = 80;
    }

    if (frequency === "irregular") return null;

    const amounts = sortedTxns.map((t) => t.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const totalAmount = amounts.reduce((sum, a) => sum + a, 0);

    return {
      id: `pattern-${merchant}-${frequency}`,
      type: "recurring_subscription",
      name: `${merchant} ${frequency} charge`,
      description: `Recurring ${frequency} charge from ${merchant}`,
      frequency,
      confidence,
      averageAmount: avgAmount,
      totalAmount,
      occurrences: sortedTxns.length,
      category: sortedTxns[0].category,
      merchant: sortedTxns[0].merchant_name,
      relatedTransactionIds: sortedTxns.map((t) => t.id),
      firstDetected: sortedTxns[0].date,
      lastOccurrence: sortedTxns[sortedTxns.length - 1].date,
      aiGenerated: false,
    };
  }

  /**
   * Detect behavioral patterns
   */
  private detectBehavioralPatterns(
    transactions: Transaction[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Weekend spending pattern
    const weekendTxns = transactions.filter((t) => {
      const day = t.date.getDay();
      return day === 0 || day === 6;
    });

    if (weekendTxns.length >= 5) {
      const avgAmount =
        weekendTxns.reduce((sum, t) => sum + t.amount, 0) / weekendTxns.length;
      const totalAmount = weekendTxns.reduce((sum, t) => sum + t.amount, 0);

      patterns.push({
        id: "pattern-weekend-spending",
        type: "weekend_spending",
        name: "Weekend Spending Pattern",
        description: "Increased spending on weekends",
        frequency: "weekly",
        confidence: 80,
        averageAmount: avgAmount,
        totalAmount,
        occurrences: weekendTxns.length,
        relatedTransactionIds: weekendTxns.map((t) => t.id),
        firstDetected: weekendTxns[0].date,
        lastOccurrence: weekendTxns[weekendTxns.length - 1].date,
        aiGenerated: false,
      });
    }

    return patterns;
  }

  /**
   * Identify spending habits
   */
  private async identifyHabits(
    transactions: Transaction[],
    patterns: DetectedPattern[],
  ): Promise<SpendingHabit[]> {
    const habits: SpendingHabit[] = [];

    // Daily coffee habit
    const coffeeTransactions = transactions.filter(
      (t) =>
        t.category.toLowerCase().includes("coffee") ||
        t.merchant_name.toLowerCase().includes("coffee") ||
        t.merchant_name.toLowerCase().includes("starbucks") ||
        t.merchant_name.toLowerCase().includes("dunkin"),
    );

    if (coffeeTransactions.length >= 10) {
      const avgAmount =
        coffeeTransactions.reduce((sum, t) => sum + t.amount, 0) /
        coffeeTransactions.length;
      const monthlySpend = avgAmount * 30;

      habits.push({
        id: "habit-daily-coffee",
        type: "daily_coffee",
        description: `Daily coffee purchases averaging $${avgAmount.toFixed(2)}`,
        frequency: "daily",
        averageAmount: avgAmount,
        impact: monthlySpend > 100 ? "negative" : "neutral",
        healthScore: monthlySpend > 150 ? 40 : monthlySpend > 100 ? 60 : 80,
        recommendation:
          monthlySpend > 100
            ? "Consider brewing coffee at home to save money"
            : undefined,
        potentialSavings: monthlySpend > 100 ? monthlySpend * 0.7 : undefined,
      });
    }

    // Frequent dining out
    const diningTransactions = transactions.filter(
      (t) =>
        t.category.toLowerCase().includes("dining") ||
        t.category.toLowerCase().includes("restaurant") ||
        t.category.toLowerCase().includes("food"),
    );

    if (diningTransactions.length >= 15) {
      const avgAmount =
        diningTransactions.reduce((sum, t) => sum + t.amount, 0) /
        diningTransactions.length;
      const monthlySpend = (diningTransactions.length / 30) * avgAmount * 30;

      habits.push({
        id: "habit-frequent-dining",
        type: "frequent_dining_out",
        description: `Frequent dining out (${diningTransactions.length} times)`,
        frequency: `${Math.round(diningTransactions.length / 4)} times per week`,
        averageAmount: avgAmount,
        impact: monthlySpend > 300 ? "negative" : "neutral",
        healthScore: monthlySpend > 500 ? 30 : monthlySpend > 300 ? 50 : 70,
        recommendation:
          monthlySpend > 300
            ? "Try meal prepping to reduce dining out expenses"
            : undefined,
        potentialSavings: monthlySpend > 300 ? monthlySpend * 0.5 : undefined,
      });
    }

    return habits;
  }

  /**
   * Calculate spending velocity
   */
  private calculateSpendingVelocity(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
  ): SpendingVelocity {
    const totalDays = Math.max(
      1,
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    const current = totalSpending / totalDays;

    // Calculate average from historical data (simplified)
    const average = current; // In production, fetch historical average

    const acceleration = ((current - average) / average) * 100;

    let trend: "accelerating" | "decelerating" | "stable" = "stable";
    if (acceleration > 10) trend = "accelerating";
    else if (acceleration < -10) trend = "decelerating";

    const daysInMonth = 30;
    const daysRemaining = Math.max(0, daysInMonth - new Date().getDate());
    const projectedMonthEnd = current * daysInMonth;

    // Simplified burn rate calculation
    const burnRate = totalSpending > 0 ? Math.round(10000 / current) : 999;

    return {
      current,
      average,
      acceleration,
      trend,
      projectedMonthEnd,
      daysRemaining,
      burnRate,
    };
  }

  /**
   * Generate AI insights
   */
  private async generateAIInsights(
    userId: string,
    context: {
      transactions: Transaction[];
      patterns: DetectedPattern[];
      habits: SpendingHabit[];
      velocity: SpendingVelocity;
      triggers: BehavioralTrigger[];
      score: SpendingHealthScore;
    },
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Rule-based insights (always available)
    if (context.velocity.trend === "accelerating") {
      insights.push({
        id: "insight-spending-acceleration",
        type: "trend_alert",
        priority: "high",
        title: "Spending is Accelerating",
        description: `Your spending rate has increased by ${context.velocity.acceleration.toFixed(1)}%`,
        reasoning: [
          "Daily spending rate is higher than average",
          "Projected month-end spending is elevated",
        ],
        confidence: 85,
        impact: "negative",
        actionItems: [
          {
            id: "action-review-budget",
            action: "Review your budget and identify areas to cut back",
            difficulty: "easy",
            estimatedImpact: context.velocity.projectedMonthEnd * 0.1,
            estimatedTime: "15 minutes",
            priority: 1,
          },
        ],
        aiModel: "rule-based",
        generatedAt: new Date(),
      });
    }

    // Try AI-powered insights
    try {
      const aiInsights = await this.getAIInsights(userId, context);
      insights.push(...aiInsights);
    } catch (_error) {
      // SpendingAnalyzer warning: AI insights generation failed
      void _error;
    }

    return insights;
  }

  /**
   * Identify spending triggers (time-based, location-based, event-based)
   */
  private async identifySpendingTriggers(
    transactions: Transaction[],
  ): Promise<BehavioralTrigger[]> {
    const triggers: BehavioralTrigger[] = [];

    // Time-based triggers (weekend, late night, payday)
    const weekendTxns = transactions.filter((t) => {
      const day = t.date.getDay();
      return day === 0 || day === 6;
    });

    if (weekendTxns.length > transactions.length * 0.3) {
      const totalSpending = weekendTxns.reduce((sum, t) => sum + t.amount, 0);
      triggers.push({
        id: crypto.randomUUID(),
        type: "weekend",
        pattern: "weekend_spending",
        description: "Increased spending on weekends",
        occurrences: weekendTxns.length,
        associatedSpending: totalSpending,
        confidence: 80,
        recommendation:
          "Consider setting a weekend spending budget to control discretionary expenses",
      });
    }

    // Late night spending (after 10 PM)
    const lateNightTxns = transactions.filter((t) => {
      const hour = t.date.getHours();
      return hour >= 22 || hour <= 2;
    });

    if (lateNightTxns.length > 5) {
      const totalSpending = lateNightTxns.reduce((sum, t) => sum + t.amount, 0);
      triggers.push({
        id: crypto.randomUUID(),
        type: "time_of_day",
        pattern: "late_night_spending",
        description: "Spending late at night",
        occurrences: lateNightTxns.length,
        associatedSpending: totalSpending,
        confidence: 75,
        recommendation:
          "Late night purchases are often impulsive. Try to avoid shopping after 10 PM",
      });
    }

    // Event-based triggers (social spending)
    const diningTxns = transactions.filter(
      (t) =>
        t.category.toLowerCase().includes("dining") ||
        t.category.toLowerCase().includes("restaurant"),
    );

    if (diningTxns.length > 10) {
      const totalSpending = diningTxns.reduce((sum, t) => sum + t.amount, 0);
      triggers.push({
        id: crypto.randomUUID(),
        type: "social_event",
        pattern: "social_dining",
        description: "Frequent dining out",
        occurrences: diningTxns.length,
        associatedSpending: totalSpending,
        confidence: 85,
        recommendation:
          "Consider meal prepping or setting a monthly dining out budget",
      });
    }

    return triggers;
  }

  /**
   * Calculate category statistics for anomaly detection
   */
  private calculateCategoryStats(
    transactions: Transaction[],
  ): Map<string, CategoryStats> {
    const categoryMap = new Map<string, Transaction[]>();

    // Group by category
    for (const txn of transactions) {
      if (!categoryMap.has(txn.category)) {
        categoryMap.set(txn.category, []);
      }
      categoryMap.get(txn.category)!.push(txn);
    }

    const stats = new Map<string, CategoryStats>();

    for (const [category, txns] of Array.from(categoryMap)) {
      const amounts = txns
        .map((t: Transaction) => t.amount)
        .sort((a: number, b: number) => a - b);
      const mean =
        amounts.reduce((sum: number, a: number) => sum + a, 0) / amounts.length;
      const median = amounts[Math.floor(amounts.length / 2)];

      // Calculate standard deviation
      const variance =
        amounts.reduce(
          (sum: number, a: number) => sum + Math.pow(a - mean, 2),
          0,
        ) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Calculate IQR
      const q1 = amounts[Math.floor(amounts.length * 0.25)];
      const q3 = amounts[Math.floor(amounts.length * 0.75)];
      const iqr = q3 - q1;

      stats.set(category, {
        category,
        mean,
        median,
        stdDev,
        q1,
        q3,
        iqr,
        count: txns.length,
        total: amounts.reduce((sum: number, a: number) => sum + a, 0),
      });
    }

    return stats;
  }

  /**
   * Get z-score threshold based on sensitivity
   */
  private getZScoreThreshold(sensitivity: "low" | "medium" | "high"): number {
    switch (sensitivity) {
      case "low":
        return 3.0;
      case "medium":
        return 2.5;
      case "high":
        return 2.0;
    }
  }

  /**
   * Get severity from z-score
   */
  private getSeverityFromZScore(
    zScore: number,
  ): "low" | "medium" | "high" | "critical" {
    if (zScore > 4) return "critical";
    if (zScore > 3) return "high";
    if (zScore > 2.5) return "medium";
    return "low";
  }

  /**
   * Detect IQR outliers
   */
  private detectIQROutlier(amount: number, stats: CategoryStats): boolean {
    const lowerBound = stats.q1 - IQR_MULTIPLIER * stats.iqr;
    const upperBound = stats.q3 + IQR_MULTIPLIER * stats.iqr;
    return amount < lowerBound || amount > upperBound;
  }

  /**
   * Detect duplicate charges
   */
  private detectDuplicateCharges(
    transactions: Transaction[],
  ): SpendingAnomaly[] {
    const anomalies: SpendingAnomaly[] = [];
    const seen = new Map<string, Transaction>();

    for (const txn of transactions) {
      const key = `${txn.merchant_name}-${txn.amount}-${txn.date.toDateString()}`;

      if (seen.has(key)) {
        const original = seen.get(key)!;
        anomalies.push({
          id: `anomaly-duplicate-${txn.id}`,
          type: "duplicate_charge",
          severity: "high",
          title: "Potential Duplicate Charge",
          description: `Duplicate charge of $${txn.amount.toFixed(2)} from ${txn.merchant_name}`,
          transactionId: txn.id,
          amount: txn.amount,
          deviation: 100, // 100% deviation since it's a duplicate
          category: txn.category,
          merchant: txn.merchant_name,
          date: txn.date,
          confidence: 90,
          detectionMethod: "zscore",
          requiresAction: true,
          actionSuggestion: "Contact merchant to verify this charge",
          relatedAnomalies: [original.id],
        });
      } else {
        seen.set(key, txn);
      }
    }

    return anomalies;
  }

  /**
   * Detect unusual merchants
   */
  private async detectUnusualMerchants(
    userId: string,
    transactions: Transaction[],
  ): Promise<SpendingAnomaly[]> {
    // Get historical merchants (simplified - in production, query database)
    const knownMerchants = new Set(
      transactions.map((t) => t.merchant_name.toLowerCase()),
    );

    // For now, return empty array (would need historical data)
    return [];
  }

  /**
   * Create anomaly summary
   */
  private createAnomalySummary(anomalies: SpendingAnomaly[]): AnomalySummary {
    const bySeverity = {
      critical: anomalies.filter((a) => a.severity === "critical").length,
      high: anomalies.filter((a) => a.severity === "high").length,
      medium: anomalies.filter((a) => a.severity === "medium").length,
      low: anomalies.filter((a) => a.severity === "low").length,
    };

    const byType: Record<AnomalyType, number> = {
      unusual_large_transaction: 0,
      unusual_small_transaction: 0,
      unusual_merchant: 0,
      unusual_category: 0,
      unusual_frequency: 0,
      unusual_time: 0,
      duplicate_charge: 0,
      subscription_increase: 0,
      spending_spike: 0,
      location_anomaly: 0,
    };

    for (const anomaly of anomalies) {
      byType[anomaly.type]++;
    }

    const totalImpact = anomalies.reduce(
      (sum, a) => sum + (a.amount - (a.expectedAmount || 0)),
      0,
    );
    const requiresImmediateAction = anomalies.filter(
      (a) => a.requiresAction,
    ).length;

    return {
      totalAnomalies: anomalies.length,
      bySeverity,
      byType,
      totalImpact,
      requiresImmediateAction,
    };
  }

  /**
   * Calculate category trends
   */
  private async calculateCategoryTrends(
    userId: string,
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
  ): Promise<CategoryTrend[]> {
    const categoryMap = new Map<string, Transaction[]>();

    for (const txn of transactions) {
      if (!categoryMap.has(txn.category)) {
        categoryMap.set(txn.category, []);
      }
      categoryMap.get(txn.category)!.push(txn);
    }

    const trends: CategoryTrend[] = [];

    for (const [category, txns] of Array.from(categoryMap)) {
      const currentAmount = txns.reduce((sum, t) => sum + t.amount, 0);

      // Get previous period amount (simplified)
      const previousAmount = currentAmount * 0.9; // Placeholder

      const change = currentAmount - previousAmount;
      const changePercent =
        previousAmount > 0 ? (change / previousAmount) * 100 : 0;

      let trend: TrendDirection = "stable";
      if (changePercent > 10) trend = "increasing";
      else if (changePercent < -10) trend = "decreasing";

      const dataPoints: TrendDataPoint[] = txns.map((t) => ({
        date: t.date,
        amount: t.amount,
        transactionCount: 1,
      }));

      trends.push({
        category,
        displayName: category,
        currentAmount,
        previousAmount,
        change,
        changePercent,
        trend,
        volatility: 50, // Placeholder
        dataPoints,
        forecast: currentAmount * 1.05, // Simple forecast
        confidence: 75,
      });
    }

    return trends.sort((a, b) => b.currentAmount - a.currentAmount);
  }

  /**
   * Determine overall trend
   */
  private determineOverallTrend(trends: CategoryTrend[]): TrendDirection {
    const increasing = trends.filter((t) => t.trend === "increasing").length;
    const decreasing = trends.filter((t) => t.trend === "decreasing").length;

    if (increasing > decreasing * 1.5) return "increasing";
    if (decreasing > increasing * 1.5) return "decreasing";
    return "stable";
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
  ): number {
    // Simplified growth rate calculation
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    const days = Math.max(
      1,
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dailyAverage = totalSpending / days;

    // Compare to historical average (placeholder)
    const historicalAverage = dailyAverage * 0.95;

    return ((dailyAverage - historicalAverage) / historicalAverage) * 100;
  }

  /**
   * Analyze seasonality
   */
  private async analyzeSeasonality(
    userId: string,
    categories?: string[],
  ): Promise<SeasonalityAnalysis> {
    // Simplified seasonality analysis
    return {
      hasSeasonality: false,
      seasonalityStrength: 0,
      peakPeriods: [],
      lowPeriods: [],
      seasonalPattern: "none",
      adjustedTrend: "stable",
    };
  }

  /**
   * Generate forecast
   */
  private generateForecast(
    transactions: Transaction[],
    trends: CategoryTrend[],
    seasonality: SeasonalityAnalysis,
  ): SpendingForecast {
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    const avgDaily = totalSpending / Math.max(1, transactions.length);

    const nextPeriod = avgDaily * 30;
    const nextMonth = nextPeriod;
    const nextQuarter = nextPeriod * 3;

    return {
      nextPeriod,
      nextMonth,
      nextQuarter,
      confidence: 70,
      range: {
        low: nextPeriod * 0.85,
        expected: nextPeriod,
        high: nextPeriod * 1.15,
      },
      assumptions: [
        "Based on current spending patterns",
        "Assumes no major lifestyle changes",
      ],
    };
  }

  /**
   * Compare with previous period
   */
  private async compareWithPreviousPeriod(
    userId: string,
    currentTransactions: Transaction[],
    startDate: Date,
    endDate: Date,
  ): Promise<PeriodComparison> {
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

    const previousTransactions = await this.getTransactions(
      userId,
      prevStartDate,
      prevEndDate,
    );

    const currentAmount = currentTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );
    const previousAmount = previousTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    const change = currentAmount - previousAmount;
    const changePercent =
      previousAmount > 0 ? (change / previousAmount) * 100 : 0;

    const categoryChanges = this.calculateCategoryChanges(
      currentTransactions,
      previousTransactions,
    );

    const significantChanges = categoryChanges
      .filter((c) => Math.abs(c.changePercent) > 20)
      .map((c) => ({
        category: c.category,
        type: c.change > 0 ? ("increase" as const) : ("decrease" as const),
        amount: Math.abs(c.change),
        percent: Math.abs(c.changePercent),
        impact: c.change > 0 ? ("negative" as const) : ("positive" as const),
      }));

    return {
      compareWith: "previous",
      currentPeriod: {
        start: startDate,
        end: endDate,
        amount: currentAmount,
      },
      comparisonPeriod: {
        start: prevStartDate,
        end: prevEndDate,
        amount: previousAmount,
      },
      change,
      changePercent,
      categoryChanges,
      significantChanges,
    };
  }

  /**
   * Calculate category changes
   */
  private calculateCategoryChanges(
    currentTransactions: Transaction[],
    previousTransactions: Transaction[],
  ): CategoryChange[] {
    const currentByCategory = new Map<string, number>();
    const previousByCategory = new Map<string, number>();

    for (const txn of currentTransactions) {
      currentByCategory.set(
        txn.category,
        (currentByCategory.get(txn.category) || 0) + txn.amount,
      );
    }

    for (const txn of previousTransactions) {
      previousByCategory.set(
        txn.category,
        (previousByCategory.get(txn.category) || 0) + txn.amount,
      );
    }

    const allCategories = new Set([
      ...currentByCategory.keys(),
      ...previousByCategory.keys(),
    ]);
    const changes: CategoryChange[] = [];

    for (const category of allCategories) {
      const currentAmount = currentByCategory.get(category) || 0;
      const previousAmount = previousByCategory.get(category) || 0;
      const change = currentAmount - previousAmount;
      const changePercent =
        previousAmount > 0 ? (change / previousAmount) * 100 : 0;

      changes.push({
        category,
        currentAmount,
        previousAmount,
        change,
        changePercent,
        isSignificant: Math.abs(changePercent) > 20,
      });
    }

    return changes.sort(
      (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
    );
  }

  /**
   * Generate trend insights
   */
  private generateTrendInsights(
    trends: CategoryTrend[],
    overallTrend: TrendDirection,
    growthRate: number,
    seasonality: SeasonalityAnalysis,
  ): string[] {
    const insights: string[] = [];

    if (overallTrend === "increasing") {
      insights.push(
        `Overall spending is trending upward with a ${growthRate.toFixed(1)}% growth rate`,
      );
    } else if (overallTrend === "decreasing") {
      insights.push(
        `Overall spending is trending downward with a ${Math.abs(growthRate).toFixed(1)}% reduction`,
      );
    }

    const topIncreasing = trends
      .filter((t) => t.trend === "increasing")
      .slice(0, 3);
    if (topIncreasing.length > 0) {
      insights.push(
        `Top increasing categories: ${topIncreasing.map((t) => t.category).join(", ")}`,
      );
    }

    return insights;
  }

  /**
   * Convert trend insights to AI insights
   */
  private async convertTrendInsightsToAI(
    analysis: SpendingTrendAnalysis,
  ): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    if (analysis.overallTrend === "increasing" && analysis.growthRate > 15) {
      insights.push({
        id: "insight-trend-increasing",
        type: "trend_alert",
        priority: "high",
        title: "Spending Trend Alert",
        description: `Your spending has increased by ${analysis.growthRate.toFixed(1)}% compared to the previous period`,
        reasoning: [
          "Overall spending trend is increasing",
          "Growth rate exceeds 15%",
        ],
        confidence: 85,
        impact: "negative",
        actionItems: [],
        aiModel: "rule-based",
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Convert anomalies to insights
   */
  private convertAnomaliesToInsights(
    anomalies: SpendingAnomaly[],
  ): AIInsight[] {
    return anomalies.slice(0, 5).map((anomaly) => ({
      id: `insight-${anomaly.id}`,
      type: "anomaly_detected" as InsightType,
      priority:
        anomaly.severity === "critical" || anomaly.severity === "high"
          ? "high"
          : "medium",
      title: anomaly.title,
      description: anomaly.description,
      reasoning: [
        `Detected using ${anomaly.detectionMethod} method`,
        `Confidence: ${anomaly.confidence}%`,
      ],
      confidence: anomaly.confidence,
      impact: "negative",
      actionItems: anomaly.actionSuggestion
        ? [
            {
              id: `action-${anomaly.id}`,
              action: anomaly.actionSuggestion,
              difficulty: "easy",
              estimatedImpact: 0,
              estimatedTime: "5 minutes",
              priority: 1,
            },
          ]
        : [],
      relatedCategory: anomaly.category,
      relatedMerchant: anomaly.merchant,
      aiModel: "rule-based",
      generatedAt: new Date(),
    }));
  }

  /**
   * Create insight summary
   */
  private createInsightSummary(insights: AIInsight[]): InsightSummary {
    const byPriority = {
      high: insights.filter((i) => i.priority === "high").length,
      medium: insights.filter((i) => i.priority === "medium").length,
      low: insights.filter((i) => i.priority === "low").length,
    };

    const byType: Record<InsightType, number> = {
      spending_pattern: 0,
      anomaly_detected: 0,
      trend_alert: 0,
      savings_opportunity: 0,
      budget_warning: 0,
      habit_formation: 0,
      behavioral_trigger: 0,
      optimization_suggestion: 0,
    };

    for (const insight of insights) {
      byType[insight.type]++;
    }

    const totalPotentialSavings = insights.reduce(
      (sum, i) => sum + (i.potentialSavings || 0),
      0,
    );
    const actionableInsights = insights.filter(
      (i) => i.actionItems.length > 0,
    ).length;

    return {
      totalInsights: insights.length,
      byPriority,
      byType,
      totalPotentialSavings,
      actionableInsights,
    };
  }

  // Placeholder methods for scoring
  private calculateConsistencyScore(
    transactions: Transaction[],
    patterns: DetectedPattern[],
  ): number {
    return 75; // Placeholder
  }

  private calculateControlScore(
    transactions: Transaction[],
    habits: SpendingHabit[],
  ): number {
    return 70; // Placeholder
  }

  private calculatePlanningScore(
    transactions: Transaction[],
    patterns: DetectedPattern[],
  ): number {
    return 65; // Placeholder
  }

  private calculateEfficiencyScore(transactions: Transaction[]): number {
    return 80; // Placeholder
  }

  private calculateSustainabilityScore(transactions: Transaction[]): number {
    return 75; // Placeholder
  }

  private getGradeFromScore(score: number): SpendingHealthScore["grade"] {
    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  private async getPreviousSpendingScore(userId: string): Promise<number> {
    return 70; // Placeholder
  }

  private determineTrend(
    current: number,
    previous: number,
  ): "improving" | "declining" | "stable" {
    const diff = current - previous;
    if (diff > 5) return "improving";
    if (diff < -5) return "declining";
    return "stable";
  }

  // Placeholder trigger analysis methods
  private analyzeTimeOfDayTrigger(
    transactions: Transaction[],
  ): BehavioralTrigger | null {
    return null; // Placeholder
  }

  private analyzeDayOfWeekTrigger(
    transactions: Transaction[],
  ): BehavioralTrigger | null {
    return null; // Placeholder
  }

  private analyzePaydayTrigger(
    transactions: Transaction[],
  ): BehavioralTrigger | null {
    return null; // Placeholder
  }

  private analyzeWeekendTrigger(
    transactions: Transaction[],
  ): BehavioralTrigger | null {
    return null; // Placeholder
  }

  private async getAIInsights(
    userId: string,
    context: any,
  ): Promise<AIInsight[]> {
    // Placeholder for AI-powered insights
    return [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let spendingAnalyzerInstance: SpendingAnalyzer | null = null;

export function getSpendingAnalyzer(): SpendingAnalyzer {
  if (!spendingAnalyzerInstance) {
    spendingAnalyzerInstance = new SpendingAnalyzer();
  }
  return spendingAnalyzerInstance;
}
