/**
 * Smart Budget Engine
 *
 * AI-powered budget generation and management system that learns from user spending patterns.
 *
 * Features:
 * - AI-powered budget generation using 50/30/20 rule as baseline
 * - Intelligent category allocation based on historical spending
 * - Budget vs actual analysis with variance tracking
 * - Month-end spending predictions
 * - Anomaly detection and spending insights
 * - Automatic budget adjustments based on patterns
 *
 * @see Phase 2.1: Smart Budget Engine
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { getModelRouter, TaskType } from "@/lib/model-router";
import {
  SmartBudget,
  SmartBudgetCategory,
  BudgetPreferences,
  BudgetAnalysis,
  CategoryAnalysis,
  BudgetRecommendation,
  MonthEndPrediction,
  CategoryPrediction,
  PredictionWarning,
  SpendingAnomaly,
  BudgetPeriod,
  BudgetCategoryValue,
  CategoryType,
  BUDGET_CATEGORIES,
} from "./types/budget.types";

// Cache configuration
const AI_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const aiResponseCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Category Type Mapping
 * Maps budget categories to their classification type
 */
const CATEGORY_TYPE_MAP: Record<BudgetCategoryValue, CategoryType> = {
  housing: "ESSENTIAL",
  utilities: "ESSENTIAL",
  groceries: "ESSENTIAL",
  transportation: "ESSENTIAL",
  insurance: "ESSENTIAL",
  healthcare: "ESSENTIAL",
  debt_payments: "DEBT",
  dining_out: "DISCRETIONARY",
  entertainment: "DISCRETIONARY",
  shopping: "DISCRETIONARY",
  personal_care: "DISCRETIONARY",
  fitness: "DISCRETIONARY",
  subscriptions: "DISCRETIONARY",
  savings: "SAVINGS",
  investments: "INVESTMENT",
  emergency_fund: "SAVINGS",
  education: "DISCRETIONARY",
  travel: "DISCRETIONARY",
  gifts: "DISCRETIONARY",
  pets: "DISCRETIONARY",
  childcare: "ESSENTIAL",
  other: "DISCRETIONARY",
};

/**
 * Default 50/30/20 Rule Allocation
 * 50% Essentials, 30% Discretionary, 20% Savings/Debt
 */
const DEFAULT_ALLOCATION = {
  ESSENTIAL: 0.5,
  DISCRETIONARY: 0.3,
  SAVINGS: 0.15,
  DEBT: 0.05,
  INVESTMENT: 0.0,
};

/**
 * Smart Budget Engine Class
 */
export class SmartBudgetEngine {

  /**
   * Generate AI-powered budget based on user preferences and spending history
   *
   * @param userId - User ID
   * @param preferences - Budget preferences
   * @returns Smart budget with AI-generated recommendations
   */
  async generateBudget(
    userId: string,
    preferences: BudgetPreferences,
  ): Promise<SmartBudget> {
    // 1. Fetch user's transaction history (last 6 months)
    const transactions = await this.fetchTransactionHistory(userId, 6);

    // 2. Analyze spending patterns
    const spendingPatterns = await this.analyzeSpendingPatterns(transactions);

    // 3. Generate category allocations
    const categories = await this.generateCategoryAllocations(
      preferences,
      spendingPatterns,
    );

    // 4. Get AI recommendations if available
    let aiGenerated = false;
    let confidence = 75; // Default confidence

    if (transactions.length >= 10) {
      try {
        const aiRecommendations = await this.getAIRecommendations(
          preferences,
          spendingPatterns,
          categories,
        );

        // Apply AI recommendations to categories
        this.applyAIRecommendations(categories, aiRecommendations);
        aiGenerated = true;
        confidence = aiRecommendations.confidence || 85;
      } catch (_error) {
        // SmartBudgetEngine: AI recommendations failed, using rule-based approach
      }
    }

    // 5. Create smart budget
    const budget: SmartBudget = {
      id: crypto.randomUUID(),
      userId,
      name: `Smart Budget - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      period: "monthly",
      totalAmount: preferences.monthlyIncome,
      categories,
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      aiGenerated,
      confidence,
      metadata: {
        monthlyIncome: preferences.monthlyIncome,
        preferences,
      },
    };

    return budget;
  }

  /**
   * Analyze budget vs actual spending
   *
   * @param userId - User ID
   * @param period - Budget period
   * @returns Budget analysis with variance and trends
   */
  async analyzeBudgetVsActual(
    userId: string,
    period: BudgetPeriod = "monthly",
  ): Promise<BudgetAnalysis> {
    // 1. Get current budget
    const { data: budgetData } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!budgetData) {
      throw new Error("No active budget found");
    }

    // 2. Calculate period dates
    const { periodStart, periodEnd } = this.calculatePeriodDates(period);

    // 3. Fetch transactions for the period
    const transactions = await this.fetchTransactionsForPeriod(
      userId,
      periodStart,
      periodEnd,
    );

    // 4. Analyze spending by category
    const categoryAnalysis = await this.analyzeCategorySpending(
      budgetData,
      transactions,
    );

    // 5. Detect anomalies
    const anomalies = await this.detectSpendingAnomalies(
      userId,
      transactions,
      categoryAnalysis,
    );

    // 6. Generate recommendations
    const recommendations = await this.generateBudgetRecommendations(
      userId,
      categoryAnalysis,
      anomalies,
    );

    // 7. Calculate summary
    const summary = {
      totalBudgeted: categoryAnalysis.reduce(
        (sum, cat) => sum + cat.budgeted,
        0,
      ),
      totalSpent: categoryAnalysis.reduce((sum, cat) => sum + cat.spent, 0),
      totalRemaining: categoryAnalysis.reduce(
        (sum, cat) => sum + cat.remaining,
        0,
      ),
      percentUsed: 0,
      variance: 0,
      variancePercent: 0,
    };

    summary.percentUsed = (summary.totalSpent / summary.totalBudgeted) * 100;
    summary.variance = summary.totalBudgeted - summary.totalSpent;
    summary.variancePercent = (summary.variance / summary.totalBudgeted) * 100;

    // 8. Determine spending trend
    const spendingTrend = await this.determineSpendingTrend(
      userId,
      transactions,
    );

    return {
      userId,
      period,
      periodStart,
      periodEnd,
      summary,
      categoryAnalysis,
      trends: {
        spendingTrend,
        topOverspentCategories: categoryAnalysis
          .filter((cat) => cat.variance < 0)
          .sort((a, b) => a.variance - b.variance)
          .slice(0, 5),
        topUnderspentCategories: categoryAnalysis
          .filter((cat) => cat.variance > 0)
          .sort((a, b) => b.variance - a.variance)
          .slice(0, 5),
        anomalies,
      },
      recommendations,
    };
  }

  /**
   * Suggest category adjustments based on spending patterns
   *
   * @param userId - User ID
   * @returns Array of budget recommendations
   */
  async suggestCategoryAdjustments(
    userId: string,
  ): Promise<BudgetRecommendation[]> {
    // 1. Get budget analysis
    const analysis = await this.analyzeBudgetVsActual(userId);

    // 2. Identify categories that need adjustment
    const recommendations: BudgetRecommendation[] = [];

    for (const category of analysis.categoryAnalysis) {
      // Overspending categories
      if (category.percentUsed > 100) {
        const suggestedIncrease = Math.ceil(category.spent * 1.1); // 10% buffer

        recommendations.push({
          id: crypto.randomUUID(),
          userId,
          type: "increase_budget",
          category: category.category,
          currentAmount: category.budgeted,
          suggestedAmount: suggestedIncrease,
          reason: `You've consistently overspent in ${category.category} by ${category.variancePercent.toFixed(1)}%. Consider increasing the budget.`,
          confidence: Math.min(95, 70 + Math.abs(category.variancePercent)),
          impact: {
            monthlySavings: -(suggestedIncrease - category.budgeted),
            riskLevel: category.percentUsed > 150 ? "high" : "medium",
          },
          createdAt: new Date(),
        });
      }

      // Underspending categories (>30% unused)
      if (category.percentUsed < 70 && category.budgeted > 100) {
        const suggestedDecrease = Math.floor(category.spent * 1.15); // 15% buffer

        recommendations.push({
          id: crypto.randomUUID(),
          userId,
          type: "decrease_budget",
          category: category.category,
          currentAmount: category.budgeted,
          suggestedAmount: suggestedDecrease,
          reason: `You're only using ${category.percentUsed.toFixed(1)}% of your ${category.category} budget. Consider reallocating these funds.`,
          confidence: Math.min(90, 60 + (100 - category.percentUsed)),
          impact: {
            monthlySavings: category.budgeted - suggestedDecrease,
            riskLevel: "low",
          },
          createdAt: new Date(),
        });
      }
    }

    // 3. Get AI-powered recommendations if available
    if (recommendations.length > 0) {
      try {
        const aiRecommendations = await this.getAIAdjustmentRecommendations(
          userId,
          analysis,
          recommendations,
        );

        // Merge AI recommendations
        recommendations.push(...aiRecommendations);
      } catch (_error) {
        // SmartBudgetEngine: AI adjustment recommendations failed
      }
    }

    return recommendations.sort(
      (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
    );
  }

  /**
   * Predict month-end spending based on current trajectory
   *
   * @param userId - User ID
   * @returns Month-end prediction with warnings and suggestions
   */
  async predictMonthEnd(userId: string): Promise<MonthEndPrediction> {
    const now = new Date();
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil(
      (monthEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysElapsed = now.getDate();
    const totalDaysInMonth = monthEndDate.getDate();

    // 1. Get current budget and spending
    const analysis = await this.analyzeBudgetVsActual(userId);

    // 2. Calculate projections for each category
    const categoryPredictions: CategoryPrediction[] = [];
    const warnings: PredictionWarning[] = [];

    for (const category of analysis.categoryAnalysis) {
      // Calculate daily spending rate
      const dailySpendingRate = category.spent / daysElapsed;

      // Project to month end
      const projectedSpent = dailySpendingRate * totalDaysInMonth;
      const projectedRemaining = category.budgeted - projectedSpent;

      // Determine likelihood
      let likelihood: "very_likely" | "likely" | "possible" | "unlikely" =
        "likely";
      if (category.percentUsed > 80) likelihood = "very_likely";
      else if (category.percentUsed < 50) likelihood = "possible";

      categoryPredictions.push({
        category: category.category,
        budgeted: category.budgeted,
        currentSpent: category.spent,
        projectedSpent,
        projectedRemaining,
        likelihood,
        basedOn: "current_trajectory",
      });

      // Generate warnings
      if (projectedSpent > category.budgeted) {
        const overspendAmount = projectedSpent - category.budgeted;
        warnings.push({
          category: category.category,
          type: "overspend_risk",
          severity:
            overspendAmount > category.budgeted * 0.2 ? "high" : "medium",
          message: `You're on track to overspend ${category.category} by $${overspendAmount.toFixed(2)} this month`,
          suggestedAction: `Reduce ${category.category} spending by $${(overspendAmount / daysRemaining).toFixed(2)}/day`,
          potentialImpact: overspendAmount,
        });
      }
    }

    // 3. Calculate overall predictions
    const totalBudgeted = categoryPredictions.reduce(
      (sum, cat) => sum + cat.budgeted,
      0,
    );
    const projectedSpending = categoryPredictions.reduce(
      (sum, cat) => sum + cat.projectedSpent,
      0,
    );
    const projectedRemaining = totalBudgeted - projectedSpending;
    const projectedOverspend = Math.max(0, projectedSpending - totalBudgeted);

    // 4. Calculate confidence based on data quality
    const confidence = Math.min(95, 60 + (daysElapsed / totalDaysInMonth) * 35);

    // 5. Generate suggestions
    const suggestions = this.generateMonthEndSuggestions(
      categoryPredictions,
      warnings,
      projectedOverspend,
    );

    return {
      userId,
      currentDate: now,
      monthEndDate,
      daysRemaining,
      predictions: {
        totalBudgeted,
        projectedSpending,
        projectedRemaining,
        projectedOverspend,
        confidence,
      },
      categoryPredictions,
      warnings,
      suggestions,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetch transaction history for a user
   */
  private async fetchTransactionHistory(
    userId: string,
    months: number,
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .order("date", { ascending: false });

    return transactions || [];
  }

  /**
   * Fetch transactions for a specific period
   */
  private async fetchTransactionsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: false });

    return transactions || [];
  }

  /**
   * Analyze spending patterns from transaction history
   */
  private async analyzeSpendingPatterns(
    transactions: any[],
  ): Promise<Record<string, any>> {
    const patterns: Record<string, any> = {};

    // Group transactions by category
    const categorySpending: Record<string, number[]> = {};

    for (const transaction of transactions) {
      const category = transaction.category || "other";
      if (!categorySpending[category]) {
        categorySpending[category] = [];
      }
      categorySpending[category].push(Math.abs(transaction.amount));
    }

    // Calculate statistics for each category
    for (const [category, amounts] of Object.entries(categorySpending)) {
      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      const average = total / amounts.length;
      const max = Math.max(...amounts);
      const min = Math.min(...amounts);

      patterns[category] = {
        total,
        average,
        max,
        min,
        count: amounts.length,
        monthlyAverage: total / 6, // Assuming 6 months of data
      };
    }

    return patterns;
  }

  /**
   * Generate category allocations based on preferences and patterns
   */
  private async generateCategoryAllocations(
    preferences: BudgetPreferences,
    spendingPatterns: Record<string, any>,
  ): Promise<SmartBudgetCategory[]> {
    const categories: SmartBudgetCategory[] = [];
    const monthlyIncome = preferences.monthlyIncome;

    // Calculate type allocations
    const typeAllocations = this.calculateTypeAllocations(preferences);

    // Count categories per type (excluding excluded categories)
    const categoriesPerType: Record<CategoryType, number> = {
      ESSENTIAL: 0,
      DISCRETIONARY: 0,
      SAVINGS: 0,
      DEBT: 0,
      INVESTMENT: 0,
    };

    for (const [categoryKey, categoryValue] of Object.entries(
      BUDGET_CATEGORIES,
    )) {
      const category = categoryValue as BudgetCategoryValue;
      if (!preferences.excludeCategories?.includes(category)) {
        const categoryType = CATEGORY_TYPE_MAP[category];
        categoriesPerType[categoryType]++;
      }
    }

    // Distribute budget across categories
    for (const [categoryKey, categoryValue] of Object.entries(
      BUDGET_CATEGORIES,
    )) {
      const category = categoryValue as BudgetCategoryValue;

      // Skip excluded categories
      if (preferences.excludeCategories?.includes(category)) {
        continue;
      }

      const categoryType = CATEGORY_TYPE_MAP[category];
      const typeAllocation = typeAllocations[categoryType] || 0;
      const categoryCount = categoriesPerType[categoryType] || 1;

      // Calculate allocated amount based on spending patterns or defaults
      let allocatedAmount = 0;

      if (spendingPatterns[category]) {
        // Use historical average with 10% buffer
        allocatedAmount = Math.ceil(
          spendingPatterns[category].monthlyAverage * 1.1,
        );
      } else {
        // Use default allocation - divide type allocation by number of categories in that type
        allocatedAmount = Math.ceil(
          (monthlyIncome * typeAllocation) / categoryCount,
        );
      }

      // Apply custom rules
      const customRule = preferences.customRules?.find(
        (r) => r.category === category,
      );
      if (customRule) {
        if (customRule.percentage) {
          allocatedAmount = Math.ceil(
            monthlyIncome * (customRule.percentage / 100),
          );
        } else if (
          customRule.minAmount &&
          allocatedAmount < customRule.minAmount
        ) {
          allocatedAmount = customRule.minAmount;
        } else if (
          customRule.maxAmount &&
          allocatedAmount > customRule.maxAmount
        ) {
          allocatedAmount = customRule.maxAmount;
        }
      }

      categories.push({
        id: crypto.randomUUID(),
        budgetId: "", // Will be set when budget is created
        name: category,
        type: categoryType,
        allocatedAmount,
        spentAmount: 0,
        remainingAmount: allocatedAmount,
        percentUsed: 0,
        alerts: [],
        rules: [],
      });
    }

    // Normalize to match total income
    const totalAllocated = categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );
    if (totalAllocated !== monthlyIncome) {
      const ratio = monthlyIncome / totalAllocated;

      // Use Math.round() for better distribution
      categories.forEach((cat) => {
        cat.allocatedAmount = Math.round(cat.allocatedAmount * ratio);
        cat.remainingAmount = cat.allocatedAmount;
      });

      // Adjust the largest category to make the total exact
      const newTotal = categories.reduce(
        (sum, cat) => sum + cat.allocatedAmount,
        0,
      );
      const difference = monthlyIncome - newTotal;

      if (difference !== 0) {
        // Find the largest category and adjust it
        const largestCategory = categories.reduce((max, cat) =>
          cat.allocatedAmount > max.allocatedAmount ? cat : max,
        );
        largestCategory.allocatedAmount += difference;
        largestCategory.remainingAmount = largestCategory.allocatedAmount;
      }
    }

    return categories;
  }

  /**
   * Calculate type allocations based on preferences
   */
  private calculateTypeAllocations(
    preferences: BudgetPreferences,
  ): Record<CategoryType, number> {
    const allocations = { ...DEFAULT_ALLOCATION };

    // Adjust based on lifestyle preference
    if (preferences.lifestylePreference === "frugal") {
      allocations.ESSENTIAL = 0.45;
      allocations.DISCRETIONARY = 0.2;
      allocations.SAVINGS = 0.25;
      allocations.DEBT = 0.1;
    } else if (preferences.lifestylePreference === "comfortable") {
      allocations.ESSENTIAL = 0.55;
      allocations.DISCRETIONARY = 0.35;
      allocations.SAVINGS = 0.1;
    }

    // Adjust based on debt payment priority
    if (preferences.debtPaymentPriority === "aggressive") {
      allocations.DEBT = 0.2;
      allocations.DISCRETIONARY -= 0.1;
      allocations.SAVINGS -= 0.05;
    } else if (preferences.debtPaymentPriority === "minimum") {
      allocations.DEBT = 0.05;
    }

    // Adjust based on savings goal
    if (preferences.savingsGoalPercentage) {
      const savingsGoal = preferences.savingsGoalPercentage / 100;
      allocations.SAVINGS = savingsGoal;

      // Rebalance other categories
      const remaining = 1 - savingsGoal - allocations.DEBT;
      allocations.ESSENTIAL = remaining * 0.6;
      allocations.DISCRETIONARY = remaining * 0.4;
    }

    return allocations;
  }

  /**
   * Get AI recommendations for budget generation
   */
  private async getAIRecommendations(
    preferences: BudgetPreferences,
    spendingPatterns: Record<string, any>,
    categories: SmartBudgetCategory[],
  ): Promise<{ confidence: number; recommendations: any[] }> {

    // Check cache
    const cacheKey = `budget-ai-${JSON.stringify({ preferences, spendingPatterns })}`;
    const cached = aiResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
      return cached.data;
    }

    // Build AI prompt
    const prompt = this.buildBudgetGenerationPrompt(
      preferences,
      spendingPatterns,
      categories,
    );

    try {
      const response = await getModelRouter().complete(
        TaskType.REASONING,
        [
          {
            role: "system",
            content:
              "You are an expert financial advisor specializing in budget planning. Analyze spending patterns and provide actionable budget recommendations in JSON format.",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.3,
          max_tokens: 1500,
        },
      );

      const content = response.choices[0]?.message?.content || "{}";
      const result = this.parseAIBudgetResponse(content);

      // Cache the response
      aiResponseCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      // SmartBudgetEngine error: AI budget generation failed
      throw error;
    }
  }

  /**
   * Build AI prompt for budget generation
   */
  private buildBudgetGenerationPrompt(
    preferences: BudgetPreferences,
    spendingPatterns: Record<string, any>,
    categories: SmartBudgetCategory[],
  ): string {
    const patternSummary = Object.entries(spendingPatterns)
      .map(
        ([cat, data]) =>
          `${cat}: $${data.monthlyAverage.toFixed(2)}/mo (${data.count} transactions)`,
      )
      .join(", ");

    return `
Generate a smart budget recommendation for a user with the following profile:

**Income:** $${preferences.monthlyIncome}/month
**Lifestyle:** ${preferences.lifestylePreference || "balanced"}
**Debt Priority:** ${preferences.debtPaymentPriority || "moderate"}
**Savings Goal:** ${preferences.savingsGoalPercentage || 20}%

**Historical Spending (6-month average):**
${patternSummary}

**Current Budget Allocation:**
${categories.map((cat) => `${cat.name}: $${cat.allocatedAmount}`).join(", ")}

Provide recommendations in JSON format:
{
  "confidence": 85,
  "recommendations": [
    {
      "category": "category_name",
      "suggestedAmount": 500,
      "reason": "explanation",
      "priority": "high|medium|low"
    }
  ],
  "overallAdvice": "brief summary"
}
`.trim();
  }

  /**
   * Parse AI budget response
   */
  private parseAIBudgetResponse(content: string): {
    confidence: number;
    recommendations: any[];
  } {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);
      return {
        confidence: parsed.confidence || 75,
        recommendations: parsed.recommendations || [],
      };
    } catch (_error) {
      // SmartBudgetEngine: Failed to parse AI response
      return { confidence: 75, recommendations: [] };
    }
  }

  /**
   * Apply AI recommendations to categories
   */
  private applyAIRecommendations(
    categories: SmartBudgetCategory[],
    aiRecommendations: { confidence: number; recommendations: any[] },
  ): void {
    for (const rec of aiRecommendations.recommendations) {
      const category = categories.find((cat) => cat.name === rec.category);
      if (category && rec.priority === "high") {
        category.aiRecommendation = {
          suggestedAmount: rec.suggestedAmount,
          reason: rec.reason,
          confidence: aiRecommendations.confidence,
        };

        // Optionally apply the recommendation
        if (aiRecommendations.confidence > 80) {
          category.allocatedAmount = rec.suggestedAmount;
          category.remainingAmount = rec.suggestedAmount;
        }
      }
    }
  }

  /**
   * Calculate period dates
   */
  private calculatePeriodDates(period: BudgetPeriod): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case "weekly":
        periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay(),
        );
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        break;
      case "biweekly":
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 15);
        if (now.getDate() > 15) {
          periodStart.setDate(16);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        break;
      case "quarterly":
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case "yearly":
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear(), 11, 31);
        break;
      case "monthly":
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }

    return { periodStart, periodEnd };
  }

  /**
   * Analyze category spending
   */
  private async analyzeCategorySpending(
    budgetData: any,
    transactions: any[],
  ): Promise<CategoryAnalysis[]> {
    const categoryAnalysis: CategoryAnalysis[] = [];

    // Group transactions by category
    const categorySpending: Record<string, number[]> = {};
    for (const transaction of transactions) {
      const category = transaction.category || "other";
      if (!categorySpending[category]) {
        categorySpending[category] = [];
      }
      categorySpending[category].push(Math.abs(transaction.amount));
    }

    // Analyze each category
    for (const [category, amounts] of Object.entries(categorySpending)) {
      const spent = amounts.reduce((sum, amt) => sum + amt, 0);
      const budgeted = budgetData.amount || 0; // Simplified - should fetch from budget categories
      const remaining = budgeted - spent;
      const percentUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;
      const variance = budgeted - spent;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      let status: "under_budget" | "on_track" | "near_limit" | "over_budget";
      if (percentUsed > 100) status = "over_budget";
      else if (percentUsed > 90) status = "near_limit";
      else if (percentUsed > 50) status = "on_track";
      else status = "under_budget";

      categoryAnalysis.push({
        category: category as BudgetCategoryValue,
        budgeted,
        spent,
        remaining,
        percentUsed,
        variance,
        variancePercent,
        status,
        transactionCount: amounts.length,
        averageTransactionAmount: spent / amounts.length,
      });
    }

    return categoryAnalysis;
  }

  /**
   * Detect spending anomalies
   */
  private async detectSpendingAnomalies(
    userId: string,
    transactions: any[],
    categoryAnalysis: CategoryAnalysis[],
  ): Promise<SpendingAnomaly[]> {
    const anomalies: SpendingAnomaly[] = [];

    // Detect unusual spikes
    for (const category of categoryAnalysis) {
      if (category.percentUsed > 150) {
        anomalies.push({
          category: category.category,
          type: "unusual_spike",
          description: `Unusual spending spike in ${category.category}`,
          amount: category.spent,
          date: new Date(),
          severity: "high",
          suggestion: `Review ${category.category} transactions and adjust budget if needed`,
        });
      }
    }

    // Detect large transactions
    for (const transaction of transactions) {
      if (Math.abs(transaction.amount) > 500) {
        anomalies.push({
          category: transaction.category || "other",
          type: "large_transaction",
          description: `Large transaction: ${transaction.merchant_name || "Unknown"}`,
          amount: Math.abs(transaction.amount),
          date: new Date(transaction.date),
          severity: Math.abs(transaction.amount) > 1000 ? "high" : "medium",
        });
      }
    }

    return anomalies.slice(0, 10); // Limit to top 10 anomalies
  }

  /**
   * Generate budget recommendations
   */
  private async generateBudgetRecommendations(
    userId: string,
    categoryAnalysis: CategoryAnalysis[],
    anomalies: SpendingAnomaly[],
  ): Promise<BudgetRecommendation[]> {
    const recommendations: BudgetRecommendation[] = [];

    // Generate recommendations based on category analysis
    for (const category of categoryAnalysis) {
      if (category.status === "over_budget") {
        recommendations.push({
          id: crypto.randomUUID(),
          userId,
          type: "increase_budget",
          category: category.category,
          currentAmount: category.budgeted,
          suggestedAmount: Math.ceil(category.spent * 1.1),
          reason: `Consistently overspending in ${category.category}`,
          confidence: 85,
          impact: {
            riskLevel: "medium",
          },
          createdAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Determine spending trend
   */
  private async determineSpendingTrend(
    userId: string,
    transactions: any[],
  ): Promise<"increasing" | "decreasing" | "stable"> {
    if (transactions.length < 10) return "stable";

    // Simple trend analysis based on recent vs older transactions
    const midpoint = Math.floor(transactions.length / 2);
    const recentSpending = transactions
      .slice(0, midpoint)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const olderSpending = transactions
      .slice(midpoint)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const change = ((recentSpending - olderSpending) / olderSpending) * 100;

    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }

  /**
   * Get AI adjustment recommendations
   */
  private async getAIAdjustmentRecommendations(
    userId: string,
    analysis: BudgetAnalysis,
    existingRecommendations: BudgetRecommendation[],
  ): Promise<BudgetRecommendation[]> {

    try {
      const prompt = `
Analyze this budget and suggest optimizations:

**Summary:**
- Total Budgeted: $${analysis.summary.totalBudgeted}
- Total Spent: $${analysis.summary.totalSpent}
- Variance: $${analysis.summary.variance} (${analysis.summary.variancePercent.toFixed(1)}%)

**Category Analysis:**
${analysis.categoryAnalysis
  .map(
    (cat) =>
      `${cat.category}: Budgeted $${cat.budgeted}, Spent $${cat.spent} (${cat.percentUsed.toFixed(1)}%)`,
  )
  .join("\n")}

Provide 2-3 high-impact recommendations in JSON format:
{
  "recommendations": [
    {
      "category": "category_name",
      "type": "increase|decrease|reallocate",
      "currentAmount": 500,
      "suggestedAmount": 600,
      "reason": "explanation",
      "confidence": 85
    }
  ]
}
`.trim();

      const response = await getModelRouter().complete(
        TaskType.FINANCIAL_ADVICE,
        [
          {
            role: "system",
            content:
              "You are a financial advisor. Provide budget optimization recommendations in JSON format.",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.3,
          max_tokens: 1000,
        },
      );

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = this.parseAIBudgetResponse(content);

      return parsed.recommendations.map((rec) => ({
        id: crypto.randomUUID(),
        userId,
        type: rec.type || "reallocate",
        category: rec.category,
        currentAmount: rec.currentAmount,
        suggestedAmount: rec.suggestedAmount,
        reason: rec.reason,
        confidence: rec.confidence || 75,
        impact: {},
        createdAt: new Date(),
      }));
    } catch (_error) {
      // SmartBudgetEngine: AI adjustment recommendations failed
      return [];
    }
  }

  /**
   * Generate month-end suggestions
   */
  private generateMonthEndSuggestions(
    categoryPredictions: CategoryPrediction[],
    warnings: PredictionWarning[],
    projectedOverspend: number,
  ): string[] {
    const suggestions: string[] = [];

    if (projectedOverspend > 0) {
      suggestions.push(
        `You're projected to overspend by $${projectedOverspend.toFixed(2)} this month. Consider reducing discretionary spending.`,
      );
    }

    // Add category-specific suggestions
    for (const warning of warnings.slice(0, 3)) {
      suggestions.push(warning.suggestedAction);
    }

    // Add positive suggestions
    const underBudgetCategories = categoryPredictions.filter(
      (cat) => cat.projectedRemaining > 50,
    );
    if (underBudgetCategories.length > 0) {
      suggestions.push(
        `You have extra budget in ${underBudgetCategories[0].category}. Consider reallocating to savings or debt payment.`,
      );
    }

    return suggestions;
  }

  // ============================================================================
  // ZERO-BASED BUDGETING
  // ============================================================================

  /**
   * Generate a zero-based budget where every dollar is assigned a job
   * Following the YNAB methodology: Income - Expenses = $0
   */
  async generateZeroBasedBudget(
    userId: string,
    monthlyIncome: number,
    priorities: {
      essentials: number; // % for needs (housing, food, utilities)
      debtPayoff: number; // % for debt payments
      savings: number; // % for savings/investments
      lifestyle: number; // % for wants
    },
  ): Promise<{
    budget: SmartBudget;
    unallocated: number;
    allocationBreakdown: {
      category: string;
      amount: number;
      percentOfIncome: number;
      priority: "essential" | "debt" | "savings" | "lifestyle";
    }[];
  }> {
    // Validate priorities sum to 100%
    const totalPercent =
      priorities.essentials +
      priorities.debtPayoff +
      priorities.savings +
      priorities.lifestyle;
    if (Math.abs(totalPercent - 100) > 0.1) {
      throw new Error(
        `Budget priorities must sum to 100%, got ${totalPercent}%`,
      );
    }

    // Calculate allocation pools
    const pools = {
      essentials: monthlyIncome * (priorities.essentials / 100),
      debtPayoff: monthlyIncome * (priorities.debtPayoff / 100),
      savings: monthlyIncome * (priorities.savings / 100),
      lifestyle: monthlyIncome * (priorities.lifestyle / 100),
    };

    // Fetch historical spending to inform allocations
    const transactions = await this.fetchTransactionHistory(userId, 3);
    const patterns = await this.analyzeSpendingPatterns(transactions);

    // Allocate within each pool
    const categories: SmartBudgetCategory[] = [];
    const allocationBreakdown: {
      category: string;
      amount: number;
      percentOfIncome: number;
      priority: "essential" | "debt" | "savings" | "lifestyle";
    }[] = [];

    // Essential categories
    const essentialCategories: BudgetCategoryValue[] = [
      "housing",
      "utilities",
      "groceries",
      "transportation",
      "insurance",
      "healthcare",
      "childcare",
    ];
    const essentialAllocations = this.allocatePoolToCategories(
      pools.essentials,
      essentialCategories,
      patterns,
    );

    for (const [cat, amount] of Object.entries(essentialAllocations)) {
      categories.push(
        this.createZeroBudgetCategory(
          cat as BudgetCategoryValue,
          amount,
          "ESSENTIAL",
        ),
      );
      allocationBreakdown.push({
        category: cat,
        amount,
        percentOfIncome: (amount / monthlyIncome) * 100,
        priority: "essential",
      });
    }

    // Debt categories
    if (pools.debtPayoff > 0) {
      categories.push(
        this.createZeroBudgetCategory(
          "debt_payments",
          pools.debtPayoff,
          "DEBT",
        ),
      );
      allocationBreakdown.push({
        category: "debt_payments",
        amount: pools.debtPayoff,
        percentOfIncome: (pools.debtPayoff / monthlyIncome) * 100,
        priority: "debt",
      });
    }

    // Savings categories
    const savingsCategories: BudgetCategoryValue[] = [
      "savings",
      "emergency_fund",
      "investments",
    ];
    const savingsAllocations = this.allocatePoolToCategories(
      pools.savings,
      savingsCategories,
      patterns,
      {
        emergency_fund: 0.4, // 40% of savings to emergency fund
        savings: 0.35, // 35% to general savings
        investments: 0.25, // 25% to investments
      },
    );

    for (const [cat, amount] of Object.entries(savingsAllocations)) {
      if (amount > 0) {
        categories.push(
          this.createZeroBudgetCategory(
            cat as BudgetCategoryValue,
            amount,
            "SAVINGS",
          ),
        );
        allocationBreakdown.push({
          category: cat,
          amount,
          percentOfIncome: (amount / monthlyIncome) * 100,
          priority: "savings",
        });
      }
    }

    // Lifestyle categories
    const lifestyleCategories: BudgetCategoryValue[] = [
      "dining_out",
      "entertainment",
      "shopping",
      "personal_care",
      "fitness",
      "subscriptions",
      "travel",
      "gifts",
      "education",
    ];
    const lifestyleAllocations = this.allocatePoolToCategories(
      pools.lifestyle,
      lifestyleCategories,
      patterns,
    );

    for (const [cat, amount] of Object.entries(lifestyleAllocations)) {
      if (amount > 0) {
        categories.push(
          this.createZeroBudgetCategory(
            cat as BudgetCategoryValue,
            amount,
            "DISCRETIONARY",
          ),
        );
        allocationBreakdown.push({
          category: cat,
          amount,
          percentOfIncome: (amount / monthlyIncome) * 100,
          priority: "lifestyle",
        });
      }
    }

    // Calculate unallocated (should be close to 0 for true zero-based)
    const totalAllocated = categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );
    const unallocated =
      Math.round((monthlyIncome - totalAllocated) * 100) / 100;

    // If there's unallocated money, add to savings
    if (unallocated > 0) {
      const savingsCat = categories.find((c) => c.name === "savings");
      if (savingsCat) {
        savingsCat.allocatedAmount += unallocated;
        savingsCat.remainingAmount = savingsCat.allocatedAmount;
      }
    }

    const budget: SmartBudget = {
      id: crypto.randomUUID(),
      userId,
      name: `Zero-Based Budget - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      period: "monthly",
      totalAmount: monthlyIncome,
      categories,
      rules: [
        {
          id: crypto.randomUUID(),
          userId,
          name: "Zero-Based Rule",
          type: "auto_adjust" as const,
          condition: {
            threshold: 100,
          },
          action: "auto_adjust" as const,
          priority: 10,
          isActive: true,
          triggerCount: 0,
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      aiGenerated: false,
      confidence: 90,
      metadata: {
        monthlyIncome,
        budgetType: "zero-based",
        priorities,
      },
    };

    return { budget, unallocated, allocationBreakdown };
  }

  /**
   * Allocate a pool amount to categories based on historical patterns
   */
  private allocatePoolToCategories(
    poolAmount: number,
    categories: BudgetCategoryValue[],
    patterns: Record<string, any>,
    defaultWeights?: Record<string, number>,
  ): Record<string, number> {
    const allocations: Record<string, number> = {};
    let totalWeight = 0;
    const weights: Record<string, number> = {};

    // Calculate weights based on historical spending or defaults
    for (const cat of categories) {
      if (defaultWeights && defaultWeights[cat]) {
        weights[cat] = defaultWeights[cat];
      } else if (patterns[cat]?.monthlyAverage) {
        weights[cat] = patterns[cat].monthlyAverage;
      } else {
        weights[cat] = 1; // Equal weight if no data
      }
      totalWeight += weights[cat];
    }

    // Allocate based on weights
    let allocated = 0;
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const weight = weights[cat] / totalWeight;

      if (i === categories.length - 1) {
        // Last category gets remainder to avoid rounding issues
        allocations[cat] = Math.round((poolAmount - allocated) * 100) / 100;
      } else {
        const amount = Math.round(poolAmount * weight * 100) / 100;
        allocations[cat] = amount;
        allocated += amount;
      }
    }

    return allocations;
  }

  /**
   * Create a zero-based budget category
   */
  private createZeroBudgetCategory(
    name: BudgetCategoryValue,
    amount: number,
    type: CategoryType,
  ): SmartBudgetCategory {
    return {
      id: crypto.randomUUID(),
      budgetId: "",
      name,
      type,
      allocatedAmount: amount,
      spentAmount: 0,
      remainingAmount: amount,
      percentUsed: 0,
      alerts: [],
      rules: [],
    };
  }

  /**
   * Rebalance zero-based budget when income changes
   */
  async rebalanceZeroBasedBudget(
    userId: string,
    currentBudget: SmartBudget,
    newIncome: number,
  ): Promise<SmartBudget> {
    const oldIncome = currentBudget.totalAmount;
    const ratio = newIncome / oldIncome;

    // Scale all categories proportionally
    const newCategories = currentBudget.categories.map((cat) => ({
      ...cat,
      allocatedAmount: Math.round(cat.allocatedAmount * ratio * 100) / 100,
      remainingAmount:
        Math.round((cat.allocatedAmount * ratio - cat.spentAmount) * 100) / 100,
    }));

    // Ensure total equals new income
    const totalAllocated = newCategories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );
    const difference = newIncome - totalAllocated;

    if (Math.abs(difference) > 0.01) {
      // Add/subtract difference to savings
      const savingsCat = newCategories.find((c) => c.name === "savings");
      if (savingsCat) {
        savingsCat.allocatedAmount += difference;
        savingsCat.remainingAmount += difference;
      }
    }

    return {
      ...currentBudget,
      totalAmount: newIncome,
      categories: newCategories,
      updatedAt: new Date(),
      metadata: {
        ...currentBudget.metadata,
        monthlyIncome: newIncome,
        lastRebalanced: new Date().toISOString(),
      },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let smartBudgetEngineInstance: SmartBudgetEngine | null = null;

/**
 * Get singleton instance of Smart Budget Engine
 */
export function getSmartBudgetEngine(): SmartBudgetEngine {
  if (!smartBudgetEngineInstance) {
    smartBudgetEngineInstance = new SmartBudgetEngine();
  }
  return smartBudgetEngineInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetSmartBudgetEngine(): void {
  smartBudgetEngineInstance = null;
  aiResponseCache.clear();
}
