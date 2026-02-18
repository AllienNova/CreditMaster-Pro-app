/**
 * Financial Context Engine
 *
 * Provides a unified, real-time view of a user's complete financial picture.
 * This is the core service that aggregates data from all financial sources
 * and provides the foundation for AI-powered insights and recommendations.
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { plaidService } from "./plaid-service";
import { CreditBureauService } from "@/lib/credit-bureau";
import {
  FinancialContext,
  UserProfile,
  AggregatedAccounts,
  AccountSummary,
  CategorizedTransactions,
  Transaction,
  CategoryBreakdown,
  BudgetStatus,
  FinancialGoal,
  DebtAnalysis,
  DebtItem,
  PortfolioSummary,
  CreditSummary,
  AIInsight,
  Recommendation,
  RecurringBill,
  FinancialContextOptions,
  DEFAULT_CONTEXT_OPTIONS,
  EnhancedFinancialContext,
  DataQuality,
  MonthlySummary,
  FinancialAlert,
  ContextMetadata,
  FinancialSummary,
} from "./types/financial-context.types";
import { healthScoreCalculator } from "./health-score-calculator";

// Cache for financial context (5 minute TTL)
const contextCache = new Map<
  string,
  { context: FinancialContext; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Financial Context Engine Class
 */
export class FinancialContextEngine {
  /**
   * Get complete financial context for a user
   */
  async getFinancialContext(
    userId: string,
    forceRefresh = false,
  ): Promise<FinancialContext> {
    // Check cache first
    if (!forceRefresh) {
      const cached = contextCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.context;
      }
    }

    // Fetch all data in parallel for performance
    const [
      user,
      accounts,
      transactions,
      budgets,
      goals,
      debts,
      investments,
      creditProfile,
      insights,
      recommendations,
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getAggregatedAccounts(userId),
      this.getCategorizedTransactions(userId),
      this.getBudgetStatuses(userId),
      this.getFinancialGoals(userId),
      this.getDebtAnalysis(userId),
      this.getPortfolioSummary(userId),
      this.getCreditSummary(userId),
      this.getInsights(userId),
      this.getRecommendations(userId),
    ]);

    // Calculate health score based on aggregated data
    const healthScore = await healthScoreCalculator.calculateScore({
      accounts,
      transactions,
      budgets,
      goals,
      debts,
      creditProfile,
    });

    const context: FinancialContext = {
      user,
      accounts,
      transactions,
      budgets,
      goals,
      debts,
      investments,
      creditProfile,
      healthScore,
      insights,
      recommendations,
      lastUpdated: new Date(),
    };

    // Cache the result
    contextCache.set(userId, { context, timestamp: Date.now() });

    return context;
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new Error("Failed to fetch user profile");
    }

    return {
      id: data.id,
      email: data.email || "",
      fullName: data.full_name || "",
      subscriptionTier: data.subscription_tier || "free",
      createdAt: new Date(data.created_at),
      onboardingCompleted: data.onboarding_completed || false,
      preferences: {
        currency: data.preferences?.currency || "USD",
        timezone: data.preferences?.timezone || "America/New_York",
        budgetAlertThreshold: data.preferences?.budget_alert_threshold || 80,
        goalRemindersEnabled: data.preferences?.goal_reminders_enabled ?? true,
        insightNotificationsEnabled:
          data.preferences?.insight_notifications_enabled ?? true,
      },
    };
  }

  /**
   * Get aggregated accounts from all linked sources
   */
  private async getAggregatedAccounts(
    userId: string,
  ): Promise<AggregatedAccounts> {
    try {
      const plaidAccounts = await plaidService.getAccounts(userId);

      const categorized: AggregatedAccounts = {
        checking: [],
        savings: [],
        credit: [],
        investment: [],
        loan: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalSavings: 0,
        netWorth: 0,
        lastSyncedAt: new Date(),
      };

      for (const account of plaidAccounts) {
        const summary: AccountSummary = {
          id: account.accountId,
          institutionName: account.institutionName || "Unknown",
          accountName: account.accountName,
          accountType: this.mapAccountType(account.accountType),
          currentBalance: account.currentBalance,
          availableBalance: account.availableBalance,
          isLinked: true,
          lastUpdatedAt: new Date(),
        };
        // Categorize and calculate totals
        switch (summary.accountType) {
          case "checking":
            categorized.checking.push(summary);
            categorized.totalAssets += summary.currentBalance;
            break;
          case "savings":
            categorized.savings.push(summary);
            categorized.totalAssets += summary.currentBalance;
            categorized.totalSavings += summary.currentBalance;
            break;
          case "credit":
            categorized.credit.push(summary);
            categorized.totalLiabilities += Math.abs(summary.currentBalance);
            break;
          case "investment":
            categorized.investment.push(summary);
            categorized.totalAssets += summary.currentBalance;
            break;
          case "loan":
            categorized.loan.push(summary);
            categorized.totalLiabilities += Math.abs(summary.currentBalance);
            break;
        }
      }
      categorized.netWorth =
        categorized.totalAssets - categorized.totalLiabilities;
      return categorized;
    } catch {
      // Return empty accounts if Plaid not connected
      return {
        checking: [],
        savings: [],
        credit: [],
        investment: [],
        loan: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalSavings: 0,
        netWorth: 0,
        lastSyncedAt: new Date(),
      };
    }
  }

  /**
   * Get categorized transactions
   */
  private async getCategorizedTransactions(
    userId: string,
  ): Promise<CategorizedTransactions> {
    try {
      const accounts = await plaidService.getAccounts(userId);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allTransactions: Transaction[] = [];

      for (const account of accounts) {
        const txns = await plaidService.getTransactions(
          account.accountId,
          thirtyDaysAgo,
          new Date(),
        );
        allTransactions.push(
          ...txns.map((t) => ({
            id: t.transactionId,
            accountId: account.accountId,
            date: t.date,
            amount: t.amount,
            merchantName: t.merchantName,
            description: t.name,
            category: t.category[0] || "Uncategorized",
            subcategory: t.category[1],
            isPending: t.pending,
            isRecurring: false,
          })),
        );
      }

      // Calculate totals
      const totalIncome = allTransactions
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalExpenses = allTransactions
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);

      // Group by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      for (const txn of allTransactions.filter((t) => t.amount > 0)) {
        const existing = categoryMap.get(txn.category) || {
          amount: 0,
          count: 0,
        };
        categoryMap.set(txn.category, {
          amount: existing.amount + txn.amount,
          count: existing.count + 1,
        });
      }

      const byCategory: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          percentage:
            totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
          transactionCount: data.count,
          trend: "stable" as const,
          changeFromLastPeriod: 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        recentTransactions: allTransactions
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 50),
        byCategory,
        byMerchant: [],
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        period: {
          startDate: thirtyDaysAgo,
          endDate: new Date(),
          daysIncluded: 30,
        },
      };
    } catch {
      return {
        recentTransactions: [],
        byCategory: [],
        byMerchant: [],
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        period: { startDate: new Date(), endDate: new Date(), daysIncluded: 0 },
      };
    }
  }

  /**
   * Get budget statuses
   */
  private async getBudgetStatuses(userId: string): Promise<BudgetStatus[]> {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error || !data) return [];

    return data.map((b) => {
      const percentUsed = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (new Date(b.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      );

      return {
        id: b.id,
        category: b.category,
        budgetedAmount: b.amount,
        spentAmount: b.spent,
        remainingAmount: b.amount - b.spent,
        percentUsed,
        period: b.period,
        status:
          percentUsed >= 100
            ? "over_budget"
            : percentUsed >= 80
              ? "warning"
              : "on_track",
        daysRemaining,
        projectedOverage: 0,
        rolloverEnabled: b.rollover_enabled || false,
        rolloverAmount: b.rollover_amount || 0,
      };
    });
  }

  /**
   * Get financial goals
   */
  private async getFinancialGoals(userId: string): Promise<FinancialGoal[]> {
    const { data, error } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    if (error || !data) return [];

    return data.map((g) => ({
      id: g.id,
      type: g.type,
      name: g.name,
      description: g.description,
      targetAmount: parseFloat(g.target_amount),
      currentAmount: parseFloat(g.current_amount),
      progress:
        g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      targetDate: g.target_date ? new Date(g.target_date) : undefined,
      autoSaveEnabled: g.auto_save_enabled || false,
      autoSaveAmount: g.auto_save_amount
        ? parseFloat(g.auto_save_amount)
        : undefined,
      autoSaveFrequency: g.auto_save_frequency,
      linkedAccountId: g.linked_account_id,
      priority: g.priority || 1,
      status: g.status,
      milestones: [25, 50, 75, 100].map((pct) => ({
        percentage: pct,
        reached: (g.current_amount / g.target_amount) * 100 >= pct,
      })),
      createdAt: new Date(g.created_at),
    }));
  }

  /**
   * Get debt analysis
   */
  private async getDebtAnalysis(userId: string): Promise<DebtAnalysis> {
    const accounts = await this.getAggregatedAccounts(userId);
    const debts: DebtItem[] = [];
    let totalDebt = 0;
    let monthlyPayments = 0;

    // Get credit cards and loans as debts
    for (const credit of accounts.credit) {
      const balance = Math.abs(credit.currentBalance);
      debts.push({
        id: credit.id,
        name: credit.accountName,
        type: "credit_card",
        balance,
        interestRate: credit.interestRate || 18.99,
        minimumPayment: Math.max(25, balance * 0.02),
        linkedAccountId: credit.id,
      });
      totalDebt += balance;
      monthlyPayments += Math.max(25, balance * 0.02);
    }

    for (const loan of accounts.loan) {
      const balance = Math.abs(loan.currentBalance);
      debts.push({
        id: loan.id,
        name: loan.accountName,
        type: "personal_loan",
        balance,
        interestRate: loan.interestRate || 7.5,
        minimumPayment: balance * 0.03,
        linkedAccountId: loan.id,
      });
      totalDebt += balance;
      monthlyPayments += balance * 0.03;
    }

    // Calculate average interest rate
    const averageInterestRate =
      debts.length > 0
        ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
        : 0;

    return {
      totalDebt,
      debtToIncomeRatio: 0, // Would need income data
      averageInterestRate,
      monthlyPayments,
      debts,
      payoffStrategies: [],
      projectedPayoffDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3),
      totalInterestSaved: 0,
    };
  }

  /**
   * Get portfolio summary
   */
  private async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const { data } = await supabase
      .from("investment_portfolios")
      .select("*, investment_holdings(*)")
      .eq("user_id", userId);

    if (!data || data.length === 0) {
      return {
        totalValue: 0,
        totalCostBasis: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        portfolios: [],
        allocation: [],
        topHoldings: [],
      };
    }

    let totalValue = 0,
      totalCostBasis = 0;
    const portfolios = data.map((p) => {
      totalValue += parseFloat(p.total_value || 0);
      totalCostBasis += parseFloat(p.total_cost_basis || 0);
      return {
        id: p.id,
        name: p.name,
        value: parseFloat(p.total_value || 0),
        gainLoss: parseFloat(p.total_gain_loss || 0),
        gainLossPercent: parseFloat(p.total_gain_loss_percent || 0),
        holdingsCount: p.investment_holdings?.length || 0,
      };
    });

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss: totalValue - totalCostBasis,
      totalGainLossPercent:
        totalCostBasis > 0
          ? ((totalValue - totalCostBasis) / totalCostBasis) * 100
          : 0,
      dayChange: 0,
      dayChangePercent: 0,
      portfolios,
      allocation: [],
      topHoldings: [],
    };
  }

  /**
   * Get credit summary
   */
  private async getCreditSummary(userId: string): Promise<CreditSummary> {
    try {
      const creditResponse = await CreditBureauService.getCreditReport(
        userId,
        "experian",
      );
      const creditScore = creditResponse?.data?.credit_score || 0;
      return {
        currentScore: creditScore,
        scoreChange: 0,
        scoreChangeDirection: "stable",
        lastUpdated: new Date(),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      };
    } catch {
      return {
        currentScore: 0,
        scoreChange: 0,
        scoreChangeDirection: "stable",
        lastUpdated: new Date(),
        scoreHistory: [],
        factors: [],
        activeDisputes: 0,
        resolvedDisputes: 0,
        bureauScores: [],
      };
    }
  }

  /**
   * Get AI insights
   */
  private async getInsights(userId: string): Promise<AIInsight[]> {
    const { data } = await supabase
      .from("financial_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(10);

    return (data || []).map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      message: i.message,
      severity: i.severity,
      actionType: i.action_type,
      actionData: i.action_data,
      read: i.read,
      dismissed: i.dismissed,
      expiresAt: i.expires_at ? new Date(i.expires_at) : undefined,
      createdAt: new Date(i.created_at),
    }));
  }

  /**
   * Get recommendations
   */
  private async getRecommendations(_userId: string): Promise<Recommendation[]> {
    // Generate recommendations based on financial data
    // This would typically call an AI service
    return [];
  }

  /**
   * Map Plaid account type to our account type
   */
  private mapAccountType(plaidType: string): AccountSummary["accountType"] {
    switch (plaidType) {
      case "depository":
        return "checking";
      case "credit":
        return "credit";
      case "investment":
        return "investment";
      case "loan":
        return "loan";
      default:
        return "other";
    }
  }

  /**
   * Get recurring bills
   */
  async getRecurringBills(userId: string): Promise<RecurringBill[]> {
    const { data } = await supabase
      .from("recurring_bills")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("next_due_at", { ascending: true });

    return (data || []).map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      amount: parseFloat(b.amount),
      frequency: b.frequency,
      dueDay: b.due_day,
      linkedAccountId: b.linked_account_id,
      autoDetected: b.auto_detected,
      negotiationStatus: b.negotiation_status,
      negotiationSavings: b.negotiation_savings
        ? parseFloat(b.negotiation_savings)
        : undefined,
      lastPaidAt: b.last_paid_at ? new Date(b.last_paid_at) : undefined,
      nextDueAt: b.next_due_at ? new Date(b.next_due_at) : undefined,
      status: b.status,
    }));
  }

  /**
   * Get enhanced financial context with additional metadata and quality metrics
   */
  async getEnhancedFinancialContext(
    userId: string,
    options: FinancialContextOptions = {},
  ): Promise<EnhancedFinancialContext> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_CONTEXT_OPTIONS, ...options };

    // Check if we have a valid cache before fetching
    const cachedBefore = contextCache.get(userId);
    const wasInCache =
      cachedBefore !== undefined &&
      Date.now() - cachedBefore.timestamp < CACHE_TTL &&
      !mergedOptions.forceRefresh;

    // Get base context
    const baseContext = await this.getFinancialContext(
      userId,
      mergedOptions.forceRefresh,
    );

    // Get additional data in parallel
    const [recurringBills, alerts, dataQuality] = await Promise.all([
      mergedOptions.includeBills ? this.getRecurringBills(userId) : [],
      this.getFinancialAlerts(userId),
      this.calculateDataQuality(userId, baseContext),
    ]);

    // Calculate monthly summary
    const monthlySummary = this.calculateMonthlySummary(baseContext);

    const generationTimeMs = Date.now() - startTime;
    const cached = contextCache.get(userId);

    const metadata: ContextMetadata = {
      generatedAt: new Date(),
      generationTimeMs,
      fromCache: wasInCache,
      cacheExpiresAt: cached
        ? new Date(cached.timestamp + CACHE_TTL)
        : undefined,
      apiVersion: "2.0.0",
    };

    return {
      ...baseContext,
      dataQuality,
      monthlySummary,
      recurringBills,
      alerts,
      metadata,
    };
  }

  /**
   * Get a quick financial summary without full context
   */
  async getFinancialSummary(userId: string): Promise<FinancialSummary> {
    const context = await this.getFinancialContext(userId);

    const activeGoals = context.goals.filter((g) => g.status === "active");
    const totalGoalProgress =
      activeGoals.length > 0
        ? activeGoals.reduce((sum, g) => sum + g.progress, 0) /
          activeGoals.length
        : 0;

    return {
      netWorth: context.accounts.netWorth,
      totalAssets: context.accounts.totalAssets,
      totalLiabilities: context.accounts.totalLiabilities,
      monthlyIncome: context.transactions.totalIncome,
      monthlyExpenses: context.transactions.totalExpenses,
      monthlySavings: context.transactions.netCashFlow,
      savingsRate:
        context.transactions.totalIncome > 0
          ? (context.transactions.netCashFlow /
              context.transactions.totalIncome) *
            100
          : 0,
      totalDebt: context.debts.totalDebt,
      debtToIncomeRatio: context.debts.debtToIncomeRatio,
      creditScore: context.creditProfile.currentScore,
      healthScore: context.healthScore.overallScore,
      healthGrade: context.healthScore.grade,
      activeGoals: activeGoals.length,
      goalProgress: totalGoalProgress,
    };
  }

  /**
   * Calculate data quality metrics
   */
  private async calculateDataQuality(
    userId: string,
    context: FinancialContext,
  ): Promise<DataQuality> {
    const missingData: string[] = [];
    let score = 100;

    // Check for connected accounts
    const totalAccounts =
      context.accounts.checking.length +
      context.accounts.savings.length +
      context.accounts.credit.length +
      context.accounts.investment.length +
      context.accounts.loan.length;

    if (totalAccounts === 0) {
      missingData.push("No bank accounts connected");
      score -= 30;
    }

    // Check for transactions
    if (context.transactions.recentTransactions.length === 0) {
      missingData.push("No recent transactions");
      score -= 20;
    }

    // Check for credit score
    if (context.creditProfile.currentScore === 0) {
      missingData.push("Credit score not available");
      score -= 15;
    }

    // Check for budgets
    if (context.budgets.length === 0) {
      missingData.push("No budgets configured");
      score -= 10;
    }

    // Check for goals
    if (context.goals.length === 0) {
      missingData.push("No financial goals set");
      score -= 10;
    }

    // Determine freshness
    const lastSync = context.accounts.lastSyncedAt;
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    let freshness: DataQuality["freshness"] = "fresh";
    if (hoursSinceSync > 24) {
      freshness = "outdated";
      score -= 15;
    } else if (hoursSinceSync > 6) {
      freshness = "stale";
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      accountsConnected: totalAccounts > 0,
      connectedAccountCount: totalAccounts,
      lastSuccessfulSync: lastSync,
      freshness,
      missingData,
      dataSources: [
        {
          name: "Plaid",
          type: "plaid",
          lastUpdated: lastSync,
          status: totalAccounts > 0 ? "connected" : "disconnected",
        },
        {
          name: "Credit Bureau",
          type: "credit_bureau",
          lastUpdated: context.creditProfile.lastUpdated,
          status:
            context.creditProfile.currentScore > 0
              ? "connected"
              : "disconnected",
        },
      ],
    };
  }

  /**
   * Calculate monthly summary from context
   */
  private calculateMonthlySummary(context: FinancialContext): MonthlySummary {
    const { transactions } = context;
    const savings = transactions.totalIncome - transactions.totalExpenses;
    const savingsRate =
      transactions.totalIncome > 0
        ? (savings / transactions.totalIncome) * 100
        : 0;

    // Get top categories
    const topCategories = transactions.byCategory.slice(0, 5).map((cat) => ({
      category: cat.category,
      amount: cat.amount,
      percentage: cat.percentage,
    }));

    return {
      income: transactions.totalIncome,
      expenses: transactions.totalExpenses,
      netCashFlow: transactions.netCashFlow,
      savings,
      savingsRate,
      vsLastMonth: {
        incomeChange: 0, // Would need historical data
        expenseChange: 0,
        savingsChange: 0,
      },
      topCategories,
    };
  }

  /**
   * Get financial alerts for a user
   */
  private async getFinancialAlerts(userId: string): Promise<FinancialAlert[]> {
    const { data } = await supabase
      .from("financial_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("severity", { ascending: false })
      .limit(20);

    return (data || []).map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      actionRequired: a.action_required || false,
      actionType: a.action_type,
      actionData: a.action_data,
      createdAt: new Date(a.created_at),
      expiresAt: a.expires_at ? new Date(a.expires_at) : undefined,
    }));
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    contextCache.delete(userId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    contextCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: contextCache.size,
      entries: Array.from(contextCache.keys()),
    };
  }
}

// Export singleton instance
export const financialContextEngine = new FinancialContextEngine();
export default financialContextEngine;
