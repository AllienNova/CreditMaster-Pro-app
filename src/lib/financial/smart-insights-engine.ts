/**
 * Smart Insights Engine
 *
 * AI-powered financial insights generator that analyzes user financial data
 * and generates actionable insights using natural language processing.
 *
 * Features:
 * - 6+ insight types (spending anomalies, savings opportunities, bill reminders, etc.)
 * - AI-powered natural language summaries and recommendations
 * - Priority-based insight ranking
 * - Confidence scoring
 * - Automatic expiration and cleanup
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { getModelRouter, TaskType } from "@/lib/model-router";
import {
  FinancialInsight,
  InsightType,
  InsightPriority,
  InsightCategory,
  InsightImpact,
  InsightGenerationOptions,
  InsightGenerationResult,
  InsightAction,
  SpendingAnomalyInsight,
  SavingsOpportunityInsight,
  BillReminderInsight,
  BudgetAlertInsight,
} from "./types/insight.types";
import { FinancialContext } from "./types/financial-context.types";
import { financialContextEngine } from "./financial-context-engine";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: InsightGenerationOptions = {
  types: undefined, // All types
  categories: undefined, // All categories
  minPriority: "low",
  limit: 20,
  includeAI: true,
  includeDismissed: false,
};

const PRIORITY_ORDER: Record<InsightPriority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

// ============================================================================
// SMART INSIGHTS ENGINE
// ============================================================================

class SmartInsightsEngine {
  /**
   * Generate all financial insights for a user
   */
  async generateInsights(
    userId: string,
    options: InsightGenerationOptions = {},
  ): Promise<InsightGenerationResult> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Get financial context
    const context = await financialContextEngine.getFinancialContext(userId);

    // If context is null/undefined, return empty insights
    if (!context) {
      return {
        insights: [],
        generatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        dataSourcesUsed: [],
      };
    }

    // Generate insights from different analyzers
    const insightPromises: Promise<FinancialInsight[]>[] = [
      this.generateSpendingAnomalies(userId, context),
      this.generateSavingsOpportunities(userId, context),
      this.generateBillReminders(userId, context),
      this.generateBudgetAlerts(userId, context),
      this.generateIncomePatterns(userId, context),
      this.generateAccountOptimizations(userId, context),
    ];

    const allInsightsArrays = await Promise.all(insightPromises);
    let insights = allInsightsArrays.flat();

    // Filter by options
    insights = this.filterInsights(insights, mergedOptions);

    // Sort by priority
    insights.sort(
      (a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority],
    );

    // Apply limit
    if (mergedOptions.limit) {
      insights = insights.slice(0, mergedOptions.limit);
    }

    // Generate AI summaries if enabled
    if (mergedOptions.includeAI) {
      insights = await this.enrichWithAI(insights, context);
    }

    return {
      insights,
      generatedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
      aiModelUsed: mergedOptions.includeAI ? getModelRouter().getModel(TaskType.REASONING) : undefined,
      dataSourcesUsed: [
        "accounts",
        "transactions",
        "budgets",
        "bills",
        "goals",
      ],
    };
  }

  /**
   * Get insights for a user from the database
   */
  async getStoredInsights(
    userId: string,
    options: InsightGenerationOptions = {},
  ): Promise<FinancialInsight[]> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    let query = getServiceRoleClient()
      .from("financial_insights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!mergedOptions.includeDismissed) {
      query = query.eq("dismissed", false);
    }

    if (mergedOptions.types && mergedOptions.types.length > 0) {
      query = query.in("type", mergedOptions.types);
    }

    if (mergedOptions.limit) {
      query = query.limit(mergedOptions.limit);
    }

    const { data, error } = await query;

    if (error) {
      // A failed query must not read as "this user has no insights" — that
      // silent degradation is what hid the anon-client bug, where RLS
      // returned zero rows to every caller and the empty list looked like a
      // legitimate answer. Log it so the failure is observable, but still
      // degrade to an empty list rather than throwing: insights are
      // supplementary and must not take down the page that renders them.
      console.error("getStoredInsights failed", {
        userId,
        error: error.message,
      });
      return [];
    }

    return (data || []).map(this.mapInsightFromDb);
  }

  /**
   * Save insights to database
   */
  async saveInsights(insights: FinancialInsight[]): Promise<void> {
    if (insights.length === 0) return;

    const records = insights.map((insight) => ({
      id: insight.id,
      user_id: insight.userId,
      type: insight.type,
      category: insight.category,
      priority: insight.priority,
      impact: insight.impact,
      title: insight.title,
      description: insight.description,
      details: insight.details,
      ai_summary: insight.aiSummary,
      ai_recommendation: insight.aiRecommendation,
      amount: insight.amount,
      percentage: insight.percentage,
      comparison_value: insight.comparisonValue,
      trend: insight.trend,
      related_account_ids: insight.relatedAccountIds,
      related_transaction_ids: insight.relatedTransactionIds,
      actions: insight.actions,
      dismissed: insight.dismissed,
      confidence: insight.confidence,
      data_source: insight.dataSource,
      created_at: insight.createdAt.toISOString(),
      expires_at: insight.expiresAt?.toISOString(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getServiceRoleClient() as any)
      .from("financial_insights")
      .upsert(records, { onConflict: "id" });

    if (error) {
      // A write that fails silently is worse than one that throws: the caller
      // has no way to know the insights it just generated were discarded, and
      // the next read returns an empty list that is indistinguishable from
      // "nothing to report". Throw so the failure reaches the caller.
      throw new Error(`Failed to save insights: ${error.message}`);
    }
  }

  /**
   * Dismiss an insight
   */
  async dismissInsight(insightId: string, userId: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getServiceRoleClient() as any)
      .from("financial_insights")
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq("id", insightId)
      .eq("user_id", userId);

    return !error;
  }

  /**
   * Record action taken on an insight
   */
  async recordAction(
    insightId: string,
    userId: string,
    action: string,
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getServiceRoleClient() as any)
      .from("financial_insights")
      .update({
        action_taken: action,
        action_taken_at: new Date().toISOString(),
      })
      .eq("id", insightId)
      .eq("user_id", userId);

    return !error;
  }

  // ==========================================================================
  // INSIGHT GENERATORS
  // ==========================================================================

  /**
   * Generate spending anomaly insights
   */
  private async generateSpendingAnomalies(
    userId: string,
    context: FinancialContext,
  ): Promise<SpendingAnomalyInsight[]> {
    const insights: SpendingAnomalyInsight[] = [];
    const transactions = context.transactions?.recentTransactions || [];

    // Calculate category averages
    const categoryTotals = new Map<string, { total: number; count: number }>();
    for (const txn of transactions) {
      if (txn.amount > 0) {
        const existing = categoryTotals.get(txn.category) || {
          total: 0,
          count: 0,
        };
        categoryTotals.set(txn.category, {
          total: existing.total + txn.amount,
          count: existing.count + 1,
        });
      }
    }

    // Detect unusually large transactions
    for (const txn of transactions) {
      if (txn.amount <= 0) continue;
      const categoryData = categoryTotals.get(txn.category);
      if (categoryData && categoryData.count > 3) {
        const average = categoryData.total / categoryData.count;
        if (txn.amount > average * 3 && txn.amount > 100) {
          insights.push({
            id: `anomaly_${txn.id}`,
            userId,
            type: "spending_anomaly",
            category: "spending",
            priority: txn.amount > average * 5 ? "high" : "medium",
            impact: "warning",
            title: "Unusual Transaction Detected",
            description: `A ${txn.category} transaction of $${txn.amount.toFixed(2)} at ${txn.merchantName} is ${Math.round(txn.amount / average)}x your average.`,
            amount: txn.amount,
            comparisonValue: average,
            anomalyType: "unusual_large",
            transactionId: txn.id,
            merchantName: txn.merchantName || "Unknown",
            expectedAmount: average,
            relatedTransactionIds: [txn.id],
            actions: [
              {
                id: "review",
                label: "Review Transaction",
                type: "link",
                href: `/transactions/${txn.id}`,
              },
              { id: "dismiss", label: "Dismiss", type: "dismiss" },
            ],
            dismissed: false,
            createdAt: new Date(),
            confidence: 85,
            dataSource: ["transactions"],
          });
        }
      }
    }

    return insights;
  }

  /**
   * Generate savings opportunity insights
   */
  private async generateSavingsOpportunities(
    userId: string,
    context: FinancialContext,
  ): Promise<SavingsOpportunityInsight[]> {
    const insights: SavingsOpportunityInsight[] = [];
    const transactions = context.transactions?.recentTransactions || [];

    // Detect potential subscription savings
    const merchantCounts = new Map<string, { count: number; total: number }>();
    for (const txn of transactions) {
      // Only process transactions with valid merchant names
      if (txn.amount > 0 && txn.amount < 100 && txn.merchantName) {
        const merchantName: string = txn.merchantName;
        const existing = merchantCounts.get(merchantName) || {
          count: 0,
          total: 0,
        };
        merchantCounts.set(merchantName, {
          count: existing.count + 1,
          total: existing.total + txn.amount,
        });
      }
    }

    // Find recurring small charges (potential subscriptions)
    for (const [merchant, data] of Array.from(merchantCounts.entries())) {
      if (data.count >= 2) {
        const avgAmount = data.total / data.count;
        if (avgAmount >= 5 && avgAmount <= 50) {
          insights.push({
            id: `savings_sub_${merchant.replace(/\s+/g, "_").toLowerCase()}`,
            userId,
            type: "savings_opportunity",
            category: "savings",
            priority: "medium",
            impact: "positive",
            title: "Potential Subscription Savings",
            description: `You've paid ${merchant} ${data.count} times (~$${avgAmount.toFixed(2)}/payment). Review if this subscription is still needed.`,
            amount: avgAmount,
            opportunityType: "subscription_cancel",
            potentialSavings: avgAmount * 12,
            timeframe: "yearly",
            actions: [
              {
                id: "review",
                label: "Review Subscriptions",
                type: "link",
                href: "/bills",
              },
              { id: "dismiss", label: "Keep Subscription", type: "dismiss" },
            ],
            dismissed: false,
            createdAt: new Date(),
            confidence: 70,
            dataSource: ["transactions"],
          });
        }
      }
    }

    return insights.slice(0, 5); // Limit to top 5
  }

  /**
   * Generate bill reminder insights
   */
  private async generateBillReminders(
    userId: string,
    context: FinancialContext,
  ): Promise<BillReminderInsight[]> {
    const insights: BillReminderInsight[] = [];

    // Define bill type for database response
    interface BillRow {
      id: string;
      name: string;
      amount: number;
      next_due_date: string;
      status: string;
    }

    // Get upcoming bills from database
    const { data: billsData } = await getServiceRoleClient()
      .from("recurring_bills")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("next_due_date", new Date().toISOString())
      .order("next_due_date", { ascending: true })
      .limit(10);

    const bills = (billsData || []) as BillRow[];
    const today = new Date();
    for (const bill of bills) {
      const dueDate = new Date(bill.next_due_date);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDue <= 7) {
        insights.push({
          id: `bill_reminder_${bill.id}`,
          userId,
          type: "bill_reminder",
          category: "bills",
          priority:
            daysUntilDue <= 2 ? "high" : daysUntilDue <= 5 ? "medium" : "low",
          impact: "warning",
          title: `${bill.name} Due Soon`,
          description: `Your ${bill.name} bill of $${bill.amount.toFixed(2)} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}.`,
          amount: bill.amount,
          billId: bill.id,
          billName: bill.name,
          dueDate,
          daysUntilDue,
          relatedBillIds: [bill.id],
          actions: [
            {
              id: "pay",
              label: "Pay Now",
              type: "link",
              href: `/bills/${bill.id}/pay`,
            },
            { id: "snooze", label: "Remind Later", type: "snooze" },
          ],
          dismissed: false,
          createdAt: new Date(),
          confidence: 95,
          dataSource: ["bills"],
        });
      }
    }

    return insights;
  }

  /**
   * Generate budget alert insights
   */
  private async generateBudgetAlerts(
    userId: string,
    context: FinancialContext,
  ): Promise<BudgetAlertInsight[]> {
    const insights: BudgetAlertInsight[] = [];

    for (const budget of context.budgets) {
      const percentUsed = (budget.spentAmount / budget.budgetedAmount) * 100;

      if (percentUsed >= 80) {
        const daysRemaining = this.getDaysRemainingInPeriod(budget.period);
        const priority: InsightPriority =
          percentUsed >= 100 ? "high" : percentUsed >= 90 ? "medium" : "low";

        insights.push({
          id: `budget_alert_${budget.category}`,
          userId,
          type: "budget_alert",
          category: "budget",
          priority,
          impact: percentUsed >= 100 ? "negative" : "warning",
          title:
            percentUsed >= 100
              ? `${budget.category} Budget Exceeded`
              : `${budget.category} Budget Alert`,
          description:
            percentUsed >= 100
              ? `You've spent $${budget.spentAmount.toFixed(2)} of your $${budget.budgetedAmount.toFixed(2)} ${budget.category} budget (${percentUsed.toFixed(0)}%).`
              : `You've used ${percentUsed.toFixed(0)}% of your ${budget.category} budget with ${daysRemaining} days left.`,
          amount: budget.spentAmount,
          comparisonValue: budget.budgetedAmount,
          percentage: percentUsed,
          budgetId: budget.category,
          budgetCategory: budget.category,
          budgetedAmount: budget.budgetedAmount,
          spentAmount: budget.spentAmount,
          percentUsed,
          daysRemaining,
          actions: [
            {
              id: "view",
              label: "View Budget",
              type: "link",
              href: `/budgets/${budget.category}`,
            },
            {
              id: "adjust",
              label: "Adjust Budget",
              type: "link",
              href: `/budgets/${budget.category}/edit`,
            },
          ],
          dismissed: false,
          createdAt: new Date(),
          confidence: 100,
          dataSource: ["budgets", "transactions"],
        });
      }
    }

    return insights;
  }

  /**
   * Generate income pattern insights
   */
  private async generateIncomePatterns(
    userId: string,
    context: FinancialContext,
  ): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];
    const income = context.transactions?.totalIncome || 0;
    const expenses = context.transactions?.totalExpenses || 0;

    // Check if expenses exceed income
    if (expenses > income && income > 0) {
      const deficit = expenses - income;
      insights.push({
        id: `income_deficit_${Date.now()}`,
        userId,
        type: "income_pattern",
        category: "income",
        priority: deficit > income * 0.2 ? "high" : "medium",
        impact: "negative",
        title: "Spending Exceeds Income",
        description: `Your expenses ($${expenses.toFixed(2)}) exceed your income ($${income.toFixed(2)}) by $${deficit.toFixed(2)} this month.`,
        amount: deficit,
        comparisonValue: income,
        trend: "down",
        actions: [
          {
            id: "review",
            label: "Review Spending",
            type: "link",
            href: "/spending",
          },
          {
            id: "budget",
            label: "Create Budget",
            type: "link",
            href: "/budgets/new",
          },
        ],
        dismissed: false,
        createdAt: new Date(),
        confidence: 90,
        dataSource: ["transactions"],
      });
    }

    return insights;
  }

  /**
   * Generate account optimization insights
   */
  private async generateAccountOptimizations(
    userId: string,
    context: FinancialContext,
  ): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];

    // Check for low savings account balances
    for (const account of context.accounts.savings) {
      if (account.currentBalance < 1000) {
        insights.push({
          id: `account_low_savings_${account.id}`,
          userId,
          type: "account_optimization",
          category: "accounts",
          priority: account.currentBalance < 100 ? "high" : "medium",
          impact: "warning",
          title: "Low Savings Balance",
          description: `Your ${account.accountName} account has only $${account.currentBalance.toFixed(2)}. Consider building an emergency fund.`,
          amount: account.currentBalance,
          relatedAccountIds: [account.id],
          actions: [
            {
              id: "transfer",
              label: "Transfer Funds",
              type: "link",
              href: "/transfers",
            },
            {
              id: "goals",
              label: "Set Savings Goal",
              type: "link",
              href: "/goals/new",
            },
          ],
          dismissed: false,
          createdAt: new Date(),
          confidence: 95,
          dataSource: ["accounts"],
        });
      }
    }

    return insights;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Filter insights based on options
   */
  private filterInsights(
    insights: FinancialInsight[],
    options: InsightGenerationOptions,
  ): FinancialInsight[] {
    return insights.filter((insight) => {
      if (options.types && !options.types.includes(insight.type)) {
        return false;
      }
      if (
        options.categories &&
        !options.categories.includes(insight.category)
      ) {
        return false;
      }
      if (options.minPriority) {
        const minOrder = PRIORITY_ORDER[options.minPriority];
        if (PRIORITY_ORDER[insight.priority] < minOrder) {
          return false;
        }
      }
      if (!options.includeDismissed && insight.dismissed) {
        return false;
      }
      return true;
    });
  }

  /**
   * Enrich insights with AI-generated recommendations
   */
  private async enrichWithAI(
    insights: FinancialInsight[],
    context: FinancialContext,
  ): Promise<FinancialInsight[]> {
    if (insights.length === 0) {
      return insights;
    }

    try {
      const topInsights = insights.slice(0, 5);
      const prompt = this.buildAIPrompt(topInsights, context);

      const response = await getModelRouter().complete(TaskType.REASONING, [
        {
          role: "system",
          content:
            "You are a helpful financial advisor. Generate brief, actionable recommendations for financial insights. Respond in JSON format.",
        },
        { role: "user", content: prompt },
      ]);

      const content = response.choices[0]?.message?.content || "";
      const recommendations = this.parseAIResponse(content);

      for (const insight of insights) {
        const rec = recommendations.find((r) => r.insightId === insight.id);
        if (rec) {
          insight.aiRecommendation = rec.recommendation;
        }
      }
    } catch (_error) {
      // SmartInsightsEngine warning: Failed to generate AI recommendations
      void _error;
    }

    return insights;
  }

  private buildAIPrompt(
    insights: FinancialInsight[],
    context: FinancialContext,
  ): string {
    const summaries = insights.map(
      (i) => `- ID: ${i.id}, Type: ${i.type}, Title: ${i.title}`,
    );
    return `Insights for user with net worth $${context.accounts.netWorth.toFixed(2)}:\n${summaries.join("\n")}`;
  }

  private parseAIResponse(
    content: string,
  ): Array<{ insightId: string; recommendation: string }> {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {
      /* ignore */
    }
    return [];
  }

  private getDaysRemainingInPeriod(_period: string): number {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.ceil(
      (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private mapInsightFromDb(row: Record<string, unknown>): FinancialInsight {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as InsightType,
      category: row.category as InsightCategory,
      priority: row.priority as InsightPriority,
      impact: row.impact as InsightImpact,
      title: row.title as string,
      description: row.description as string,
      details: row.details as string | undefined,
      aiSummary: row.ai_summary as string | undefined,
      aiRecommendation: row.ai_recommendation as string | undefined,
      amount: row.amount as number | undefined,
      percentage: row.percentage as number | undefined,
      comparisonValue: row.comparison_value as number | undefined,
      trend: row.trend as "up" | "down" | "stable" | undefined,
      relatedAccountIds: row.related_account_ids as string[] | undefined,
      relatedTransactionIds: row.related_transaction_ids as
        | string[]
        | undefined,
      actions: row.actions as InsightAction[] | undefined,
      dismissed: row.dismissed as boolean,
      dismissedAt: row.dismissed_at
        ? new Date(row.dismissed_at as string)
        : undefined,
      actionTaken: row.action_taken as string | undefined,
      actionTakenAt: row.action_taken_at
        ? new Date(row.action_taken_at as string)
        : undefined,
      createdAt: new Date(row.created_at as string),
      expiresAt: row.expires_at
        ? new Date(row.expires_at as string)
        : undefined,
      confidence: row.confidence as number,
      dataSource: row.data_source as string[],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const smartInsightsEngine = new SmartInsightsEngine();
export { SmartInsightsEngine };
