/**
 * Transaction Categorization Service
 *
 * Provides enhanced transaction categorization with AI/ML improvements,
 * recurring transaction detection, and category spending analysis.
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { PlaidTransaction } from "./plaid-service";
import { getModelRouter, TaskType } from "@/lib/model-router";
import {
  CategorizedTransaction as SmartCategorizedTransaction,
  CategoryCorrection,
  CategorySuggestion,
  BudgetCategoryValue,
  BUDGET_CATEGORIES,
} from "./types/budget.types";

// ============================================================================
// TYPES
// ============================================================================

export interface CategorizedTransaction extends PlaidTransaction {
  enhancedCategory: string;
  enhancedSubcategory?: string;
  confidenceScore: number;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  tags: string[];
}

export interface RecurringPattern {
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  nextExpectedDate: Date;
  averageAmount: number;
  variance: number;
  occurrences: number;
}

export interface CategorySpending {
  category: string;
  subcategory?: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  averageTransaction: number;
  trend: "up" | "down" | "stable";
  changeFromPrevious: number;
  topMerchants: MerchantSpending[];
}

export interface MerchantSpending {
  merchantName: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface RecurringTransaction {
  merchantName: string;
  category: string;
  pattern: RecurringPattern;
  lastAmount: number;
  lastDate: Date;
  confidence: number;
}

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

const CATEGORY_ENHANCEMENTS: Record<
  string,
  { category: string; subcategory?: string }
> = {
  // Food & Dining
  restaurants: { category: "Food & Dining", subcategory: "Restaurants" },
  "fast food": { category: "Food & Dining", subcategory: "Fast Food" },
  "coffee shops": { category: "Food & Dining", subcategory: "Coffee Shops" },
  groceries: { category: "Food & Dining", subcategory: "Groceries" },

  // Transportation
  "gas stations": { category: "Transportation", subcategory: "Gas" },
  parking: { category: "Transportation", subcategory: "Parking" },
  "public transportation": {
    category: "Transportation",
    subcategory: "Public Transit",
  },
  "ride share": { category: "Transportation", subcategory: "Ride Share" },

  // Shopping
  "general merchandise": { category: "Shopping", subcategory: "General" },
  clothing: { category: "Shopping", subcategory: "Clothing" },
  electronics: { category: "Shopping", subcategory: "Electronics" },
  "online shopping": { category: "Shopping", subcategory: "Online" },

  // Bills & Utilities
  utilities: { category: "Bills & Utilities", subcategory: "Utilities" },
  internet: { category: "Bills & Utilities", subcategory: "Internet" },
  phone: { category: "Bills & Utilities", subcategory: "Phone" },
  cable: { category: "Bills & Utilities", subcategory: "Cable/Streaming" },

  // Entertainment
  entertainment: { category: "Entertainment", subcategory: "General" },
  movies: { category: "Entertainment", subcategory: "Movies" },
  music: { category: "Entertainment", subcategory: "Music" },
  streaming: { category: "Entertainment", subcategory: "Streaming Services" },

  // Healthcare
  healthcare: { category: "Healthcare", subcategory: "General" },
  pharmacy: { category: "Healthcare", subcategory: "Pharmacy" },
  doctor: { category: "Healthcare", subcategory: "Doctor" },

  // Income
  payroll: { category: "Income", subcategory: "Salary" },
  deposit: { category: "Income", subcategory: "Deposit" },
  transfer: { category: "Transfer", subcategory: "Transfer" },
};

// ============================================================================
// AI CONFIGURATION
// ============================================================================

const AI_CATEGORIZATION_THRESHOLD = 80; // Use AI if confidence < 80%

// Merchant category database (in-memory cache)
const merchantCategoryCache = new Map<
  string,
  { category: BudgetCategoryValue; confidence: number }
>();

// User correction history (for ML training)
const userCorrections = new Map<string, CategoryCorrection[]>();

// ============================================================================
// MERCHANT PATTERNS
// ============================================================================

const MERCHANT_PATTERNS: Record<string, BudgetCategoryValue> = {
  // Housing
  rent: "housing",
  mortgage: "housing",
  property: "housing",
  apartment: "housing",

  // Utilities
  electric: "utilities",
  "gas company": "utilities",
  water: "utilities",
  power: "utilities",

  // Groceries
  walmart: "groceries",
  target: "groceries",
  kroger: "groceries",
  safeway: "groceries",
  "whole foods": "groceries",
  "trader joe": "groceries",

  // Transportation
  shell: "transportation",
  chevron: "transportation",
  exxon: "transportation",
  bp: "transportation",
  uber: "transportation",
  lyft: "transportation",

  // Dining
  mcdonald: "dining_out",
  starbucks: "dining_out",
  chipotle: "dining_out",
  subway: "dining_out",
  restaurant: "dining_out",

  // Entertainment
  netflix: "entertainment",
  spotify: "entertainment",
  hulu: "entertainment",
  disney: "entertainment",
  movie: "entertainment",

  // Shopping
  amazon: "shopping",
  ebay: "shopping",
  "best buy": "shopping",

  // Healthcare
  cvs: "healthcare",
  walgreens: "healthcare",
  pharmacy: "healthcare",
  hospital: "healthcare",
  doctor: "healthcare",
};

// ============================================================================
// TRANSACTION CATEGORIZER CLASS
// ============================================================================

export class TransactionCategorizer {
  /**
   * Categorize a single transaction with enhanced categorization
   */
  async categorizeTransaction(
    transaction: PlaidTransaction,
  ): Promise<CategorizedTransaction> {
    const plaidCategory =
      transaction.category[0]?.toLowerCase() || "uncategorized";
    const enhancement = CATEGORY_ENHANCEMENTS[plaidCategory] || {
      category: transaction.category[0] || "Uncategorized",
      subcategory: transaction.category[1],
    };

    // Calculate confidence score based on category match
    const confidenceScore = CATEGORY_ENHANCEMENTS[plaidCategory] ? 95 : 70;

    // Check if transaction is recurring
    const isRecurring = await this.isRecurringTransaction(transaction);

    return {
      ...transaction,
      enhancedCategory: enhancement.category,
      enhancedSubcategory: enhancement.subcategory,
      confidenceScore,
      isRecurring,
      tags: this.generateTags(transaction),
    };
  }

  /**
   * Get category spending analysis for a user
   */
  async getCategorySpending(
    userId: string,
    period: "week" | "month" | "quarter" | "year" = "month",
  ): Promise<CategorySpending[]> {
    const days = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch transactions from database
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .gt("amount", 0); // Only expenses

    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Group by category
    const categoryMap = new Map<
      string,
      {
        amount: number;
        count: number;
        merchants: Map<string, { amount: number; count: number }>;
      }
    >();

    for (const txn of transactions) {
      const category = txn.category?.[0] || "Uncategorized";
      const merchant = txn.merchant_name || "Unknown";

      const existing = categoryMap.get(category) || {
        amount: 0,
        count: 0,
        merchants: new Map(),
      };

      const merchantData = existing.merchants.get(merchant) || {
        amount: 0,
        count: 0,
      };
      merchantData.amount += txn.amount;
      merchantData.count += 1;
      existing.merchants.set(merchant, merchantData);

      existing.amount += txn.amount;
      existing.count += 1;
      categoryMap.set(category, existing);
    }

    const totalSpending = Array.from(categoryMap.values()).reduce(
      (sum, cat) => sum + cat.amount,
      0,
    );

    // Convert to CategorySpending array
    return Array.from(categoryMap.entries())
      .map(([category, data]) => {
        const topMerchants = Array.from(data.merchants.entries())
          .map(([name, mData]) => ({
            merchantName: name,
            amount: mData.amount,
            transactionCount: mData.count,
            percentage: (mData.amount / data.amount) * 100,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        return {
          category,
          totalAmount: data.amount,
          transactionCount: data.count,
          percentage: (data.amount / totalSpending) * 100,
          averageTransaction: data.amount / data.count,
          trend: "stable" as const,
          changeFromPrevious: 0, // Would need historical comparison
          topMerchants,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Detect recurring transactions
   */
  async detectRecurringTransactions(
    userId: string,
  ): Promise<RecurringTransaction[]> {
    // Fetch last 90 days of transactions
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString())
      .order("date", { ascending: false });

    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Group by merchant name
    const merchantGroups = new Map<string, typeof transactions>();
    for (const txn of transactions) {
      const merchant = txn.merchant_name || txn.name;
      const existing = merchantGroups.get(merchant) || [];
      existing.push(txn);
      merchantGroups.set(merchant, existing);
    }

    const recurring: RecurringTransaction[] = [];

    // Analyze each merchant group for recurring patterns
    for (const [merchant, txns] of merchantGroups.entries()) {
      if (txns.length < 2) continue; // Need at least 2 transactions

      // Calculate average interval between transactions
      const sortedTxns = txns.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      const intervals: number[] = [];
      for (let i = 1; i < sortedTxns.length; i++) {
        const days = Math.floor(
          (new Date(sortedTxns[i].date).getTime() -
            new Date(sortedTxns[i - 1].date).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        intervals.push(days);
      }

      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = this.calculateVariance(intervals);

      // Determine if it's recurring (low variance)
      if (variance < 5 && txns.length >= 2) {
        const frequency = this.determineFrequency(avgInterval);
        const amounts = txns.map((t) => t.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const amountVariance = this.calculateVariance(amounts);

        const lastTxn = sortedTxns[sortedTxns.length - 1];
        const nextDate = new Date(lastTxn.date);
        nextDate.setDate(nextDate.getDate() + avgInterval);

        recurring.push({
          merchantName: merchant,
          category: lastTxn.category?.[0] || "Uncategorized",
          pattern: {
            frequency,
            nextExpectedDate: nextDate,
            averageAmount: avgAmount,
            variance: amountVariance,
            occurrences: txns.length,
          },
          lastAmount: lastTxn.amount,
          lastDate: new Date(lastTxn.date),
          confidence: this.calculateConfidence(
            variance,
            amountVariance,
            txns.length,
          ),
        });
      }
    }

    return recurring.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================================
  // SMART BUDGET CATEGORIZATION METHODS (Phase 2.1.3)
  // ============================================================================

  /**
   * Auto-categorize a batch of transactions efficiently
   *
   * @param transactions - Array of transactions to categorize
   * @returns Array of categorized transactions with confidence scores
   */
  async autoCategorizeBatch(
    transactions: Array<{
      id: string;
      userId: string;
      accountId: string;
      amount: number;
      merchantName: string;
      description?: string;
      date: Date;
    }>,
  ): Promise<SmartCategorizedTransaction[]> {
    const categorized: SmartCategorizedTransaction[] = [];
    const ambiguousTransactions: typeof transactions = [];

    // First pass: Use rule-based categorization
    for (const transaction of transactions) {
      const merchantLower = transaction.merchantName.toLowerCase();

      // 1. Check user correction history
      const userCategory = this.getUserCorrectedCategory(
        transaction.userId,
        merchantLower,
      );
      if (userCategory) {
        categorized.push({
          ...transaction,
          category: userCategory.category,
          categoryConfidence: userCategory.confidence,
          aiCategorized: false,
          userCorrected: true,
        });
        continue;
      }

      // 2. Check merchant cache
      const cachedCategory = merchantCategoryCache.get(merchantLower);
      if (
        cachedCategory &&
        cachedCategory.confidence >= AI_CATEGORIZATION_THRESHOLD
      ) {
        categorized.push({
          ...transaction,
          category: cachedCategory.category,
          categoryConfidence: cachedCategory.confidence,
          aiCategorized: false,
        });
        continue;
      }

      // 3. Check merchant patterns
      const patternCategory = this.matchMerchantPattern(merchantLower);
      if (patternCategory) {
        categorized.push({
          ...transaction,
          category: patternCategory,
          categoryConfidence: 90,
          aiCategorized: false,
        });

        // Cache the result
        merchantCategoryCache.set(merchantLower, {
          category: patternCategory,
          confidence: 90,
        });
        continue;
      }

      // 4. Use description-based categorization
      const descriptionCategory = this.categorizeByDescription(
        transaction.description || transaction.merchantName,
      );
      if (descriptionCategory.confidence >= AI_CATEGORIZATION_THRESHOLD) {
        categorized.push({
          ...transaction,
          category: descriptionCategory.category,
          categoryConfidence: descriptionCategory.confidence,
          aiCategorized: false,
        });
        continue;
      }

      // 5. Mark as ambiguous for AI processing
      ambiguousTransactions.push(transaction);
    }

    // Second pass: Use AI for ambiguous transactions
    if (ambiguousTransactions.length > 0) {
      try {
        const aiCategorized = await this.categorizeWithAI(
          ambiguousTransactions,
        );
        categorized.push(...aiCategorized);
      } catch (error) {
        // Transaction categorizer warning: AI categorization failed, using fallback

        // Fallback: Use 'other' category with low confidence
        for (const transaction of ambiguousTransactions) {
          categorized.push({
            ...transaction,
            category: "other",
            categoryConfidence: 50,
            aiCategorized: false,
          });
        }
      }
    }

    return categorized;
  }

  /**
   * Train categorization model on user corrections
   *
   * @param corrections - Array of user category corrections
   */
  async trainOnUserCorrections(
    corrections: CategoryCorrection[],
  ): Promise<void> {
    for (const correction of corrections) {
      const merchantLower = correction.merchantName.toLowerCase();

      // Store correction in user history
      const userId = correction.userId;
      const userHistory = userCorrections.get(userId) || [];
      userHistory.push(correction);
      userCorrections.set(userId, userHistory);

      // Update merchant cache with higher confidence
      const existingCache = merchantCategoryCache.get(merchantLower);
      const newConfidence = correction.confidence || 95;

      if (!existingCache || newConfidence > existingCache.confidence) {
        merchantCategoryCache.set(merchantLower, {
          category: correction.correctedCategory,
          confidence: newConfidence,
        });
      }

      // Persistence is in-memory only (merchantCategoryCache, process
      // lifetime) — there is no "merchant_categories" table backing this,
      // and this class has no production caller today (see
      // docs/qa/phantom-table-inventory.md), so there is nothing wired to a
      // real store to persist to.
    }

    // Transaction categorizer: Trained on user corrections
  }

  /**
   * Get merchant category suggestion
   *
   * @param merchant - Merchant name
   * @returns Category suggestion with confidence and alternatives
   */
  async getMerchantCategory(merchant: string): Promise<CategorySuggestion> {
    const merchantLower = merchant.toLowerCase();

    // 1. Check cache
    const cached = merchantCategoryCache.get(merchantLower);
    if (cached) {
      return {
        category: cached.category,
        confidence: cached.confidence,
      };
    }

    // 2. Check patterns
    const patternCategory = this.matchMerchantPattern(merchantLower);
    if (patternCategory) {
      return {
        category: patternCategory,
        confidence: 90,
      };
    }

    // 3. Use AI (no "merchant_categories" table backs this class — see
    // trainOnUserCorrections() above)
    try {
      const aiSuggestion = await this.getAICategorySuggestion(merchant);
      return aiSuggestion;
    } catch (error) {
      // Transaction categorizer warning: AI category suggestion failed
    }

    // 4. Fallback
    return {
      category: "other",
      confidence: 50,
      reason: "No matching pattern found",
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get user-corrected category for a merchant
   */
  private getUserCorrectedCategory(
    userId: string,
    merchantName: string,
  ): { category: BudgetCategoryValue; confidence: number } | null {
    const corrections = userCorrections.get(userId) || [];
    const merchantCorrections = corrections.filter(
      (c) => c.merchantName.toLowerCase() === merchantName,
    );

    if (merchantCorrections.length === 0) return null;

    // Use most recent correction
    const latest = merchantCorrections[merchantCorrections.length - 1];
    return {
      category: latest.correctedCategory,
      confidence: 95, // High confidence for user corrections
    };
  }

  /**
   * Match merchant name against patterns
   */
  private matchMerchantPattern(
    merchantName: string,
  ): BudgetCategoryValue | null {
    for (const [pattern, category] of Object.entries(MERCHANT_PATTERNS)) {
      if (merchantName.includes(pattern)) {
        return category;
      }
    }
    return null;
  }

  /**
   * Categorize by description keywords
   */
  private categorizeByDescription(description: string): CategorySuggestion {
    const descLower = description.toLowerCase();

    // Groceries
    if (descLower.match(/grocery|food|market|supermarket/)) {
      return { category: "groceries", confidence: 85 };
    }

    // Dining
    if (descLower.match(/restaurant|cafe|coffee|dining|food delivery/)) {
      return { category: "dining_out", confidence: 85 };
    }

    // Transportation
    if (descLower.match(/gas|fuel|parking|toll|transit|uber|lyft/)) {
      return { category: "transportation", confidence: 85 };
    }

    // Utilities
    if (descLower.match(/electric|water|gas company|utility|internet|phone/)) {
      return { category: "utilities", confidence: 85 };
    }

    // Entertainment
    if (descLower.match(/movie|theater|concert|streaming|netflix|spotify/)) {
      return { category: "entertainment", confidence: 85 };
    }

    // Healthcare
    if (descLower.match(/pharmacy|doctor|hospital|medical|health/)) {
      return { category: "healthcare", confidence: 85 };
    }

    // Shopping
    if (descLower.match(/amazon|ebay|shopping|retail|store/)) {
      return { category: "shopping", confidence: 80 };
    }

    return { category: "other", confidence: 50 };
  }

  /**
   * Categorize transactions using AI
   */
  private async categorizeWithAI(
    transactions: Array<{
      id: string;
      userId: string;
      accountId: string;
      amount: number;
      merchantName: string;
      description?: string;
      date: Date;
    }>,
  ): Promise<SmartCategorizedTransaction[]> {
    // Build prompt for batch categorization
    const transactionList = transactions
      .map(
        (t, i) =>
          `${i + 1}. ${t.merchantName} - $${t.amount} - ${t.description || "N/A"}`,
      )
      .join("\n");

    const categories = Object.values(BUDGET_CATEGORIES).join(", ");

    const prompt = `
Categorize these transactions into one of the following categories: ${categories}

Transactions:
${transactionList}

Respond in JSON format:
{
  "categorizations": [
    {
      "index": 1,
      "category": "category_name",
      "confidence": 85,
      "reason": "brief explanation"
    }
  ]
}
`.trim();

    try {
      const response = await getModelRouter().complete(
        TaskType.QUICK_RESPONSE,
        [
          {
            role: "system",
            content:
              "You are a financial transaction categorization expert. Categorize transactions accurately based on merchant names and descriptions.",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.2,
          max_tokens: 2000,
        },
      );

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = this.parseAICategorization(content);

      // Map AI results back to transactions
      const categorized: SmartCategorizedTransaction[] = [];
      for (let i = 0; i < transactions.length; i++) {
        const aiResult = parsed.categorizations.find((c) => c.index === i + 1);
        const transaction = transactions[i];

        if (aiResult) {
          categorized.push({
            ...transaction,
            category: aiResult.category as BudgetCategoryValue,
            categoryConfidence: aiResult.confidence,
            aiCategorized: true,
          });

          // Cache the result
          merchantCategoryCache.set(transaction.merchantName.toLowerCase(), {
            category: aiResult.category as BudgetCategoryValue,
            confidence: aiResult.confidence,
          });
        } else {
          // Fallback if AI didn't categorize this transaction
          categorized.push({
            ...transaction,
            category: "other",
            categoryConfidence: 50,
            aiCategorized: false,
          });
        }
      }

      return categorized;
    } catch (error) {
      // Transaction categorizer error: AI categorization error
      throw error;
    }
  }

  /**
   * Get AI category suggestion for a single merchant
   */
  private async getAICategorySuggestion(
    merchant: string,
  ): Promise<CategorySuggestion> {
    const categories = Object.values(BUDGET_CATEGORIES).join(", ");

    const prompt = `
Categorize this merchant: "${merchant}"

Available categories: ${categories}

Respond in JSON format:
{
  "category": "category_name",
  "confidence": 85,
  "reason": "brief explanation",
  "alternatives": [
    { "category": "alternative_category", "confidence": 70 }
  ]
}
`.trim();

    try {
      const response = await getModelRouter().complete(
        TaskType.QUICK_RESPONSE,
        [
          {
            role: "system",
            content:
              "You are a financial categorization expert. Provide accurate category suggestions.",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.2,
          max_tokens: 500,
        },
      );

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = this.parseAICategorySuggestion(content);

      return {
        category: parsed.category as BudgetCategoryValue,
        confidence: parsed.confidence,
        reason: parsed.reason,
        alternativeCategories: parsed.alternatives?.map((alt) => ({
          category: alt.category as BudgetCategoryValue,
          confidence: alt.confidence,
        })),
      };
    } catch (error) {
      // Transaction categorizer error: AI category suggestion error
      throw error;
    }
  }

  /**
   * Parse AI categorization response
   */
  private parseAICategorization(content: string): {
    categorizations: Array<{
      index: number;
      category: string;
      confidence: number;
      reason?: string;
    }>;
  } {
    try {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        categorizations: parsed.categorizations || [],
      };
    } catch (error) {
      // Transaction categorizer warning: Failed to parse AI categorization
      return { categorizations: [] };
    }
  }

  /**
   * Parse AI category suggestion response
   */
  private parseAICategorySuggestion(content: string): {
    category: string;
    confidence: number;
    reason?: string;
    alternatives?: Array<{ category: string; confidence: number }>;
  } {
    try {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        category: parsed.category || "other",
        confidence: parsed.confidence || 50,
        reason: parsed.reason,
        alternatives: parsed.alternatives,
      };
    } catch (error) {
      // Transaction categorizer warning: Failed to parse AI category suggestion
      return { category: "other", confidence: 50 };
    }
  }

  private async isRecurringTransaction(
    transaction: PlaidTransaction,
  ): Promise<boolean> {
    // Check if merchant has recurring pattern
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", transaction.userId)
      .eq("merchant_name", transaction.merchantName)
      .gte(
        "date",
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      );

    return (data?.length || 0) >= 2;
  }

  private generateTags(transaction: PlaidTransaction): string[] {
    const tags: string[] = [];

    if (transaction.pending) tags.push("pending");
    if (transaction.amount > 100) tags.push("large-purchase");
    if (transaction.amount < 5) tags.push("small-purchase");

    return tags;
  }

  private getPeriodDays(period: "week" | "month" | "quarter" | "year"): number {
    switch (period) {
      case "week":
        return 7;
      case "month":
        return 30;
      case "quarter":
        return 90;
      case "year":
        return 365;
    }
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length);
  }

  private determineFrequency(avgDays: number): RecurringPattern["frequency"] {
    if (avgDays <= 8) return "weekly";
    if (avgDays <= 16) return "biweekly";
    if (avgDays <= 35) return "monthly";
    if (avgDays <= 100) return "quarterly";
    return "annually";
  }

  private calculateConfidence(
    intervalVariance: number,
    amountVariance: number,
    occurrences: number,
  ): number {
    let confidence = 100;

    // Reduce confidence based on variance
    confidence -= Math.min(intervalVariance * 5, 30);
    confidence -= Math.min(amountVariance / 10, 20);

    // Increase confidence with more occurrences
    confidence += Math.min(occurrences * 5, 20);

    return Math.max(0, Math.min(100, confidence));
  }
}

// Export singleton instance
export const transactionCategorizer = new TransactionCategorizer();
export default transactionCategorizer;
