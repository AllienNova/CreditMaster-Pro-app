/**
 * Financial Service
 *
 * Core business logic for financial management features
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import { plaidService, PlaidAccount, PlaidTransaction } from "./plaid-service";

// Types
export interface FinancialDashboard {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashFlow: number;
  savingsRate: number;
  accounts: PlaidAccount[];
  recentTransactions: PlaidTransaction[];
  spendingByCategory: CategorySpending[];
  monthlyTrend: MonthlyTrend[];
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  period: "monthly" | "weekly" | "yearly";
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  type: "emergency_fund" | "debt_payoff" | "savings" | "investment" | "custom";
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  targetDate: Date;
  status: "active" | "completed" | "paused";
  createdAt: Date;
}

export interface SpendingAnalysis {
  totalSpending: number;
  averageDaily: number;
  topCategories: CategorySpending[];
  topMerchants: MerchantSpending[];
  comparisonToPreviousMonth: number;
  insights: string[];
}

export interface MerchantSpending {
  merchant: string;
  amount: number;
  transactionCount: number;
}

interface BudgetRow {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  spent: number;
  period: "monthly" | "weekly" | "yearly";
  start_date: string;
  end_date: string;
  created_at: string;
}

interface FinancialGoalRow {
  id: string;
  user_id: string;
  type: FinancialGoal["type"];
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  status: FinancialGoal["status"];
  created_at: string;
}

export interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

/**
 * Financial Service Class
 */
class FinancialService {
  /**
   * Get financial dashboard data
   */
  async getFinancialDashboard(userId: string): Promise<FinancialDashboard> {
    try {
      // Get all accounts
      const accounts = await plaidService.getAccounts(userId);

      // Calculate totals
      const totalAssets = accounts
        .filter(
          (a) =>
            a.accountType === "depository" || a.accountType === "investment",
        )
        .reduce((sum, a) => sum + a.currentBalance, 0);

      const totalLiabilities = accounts
        .filter((a) => a.accountType === "credit" || a.accountType === "loan")
        .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

      const netWorth = totalAssets - totalLiabilities;

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allTransactions: PlaidTransaction[] = [];
      for (const account of accounts) {
        const transactions = await plaidService.getTransactions(
          account.accountId,
          thirtyDaysAgo,
          new Date(),
        );
        allTransactions.push(...transactions);
      }

      // Calculate income and expenses
      const monthlyIncome = allTransactions
        .filter((t) => t.amount < 0) // Negative amounts are income in Plaid
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const monthlyExpenses = allTransactions
        .filter((t) => t.amount > 0) // Positive amounts are expenses
        .reduce((sum, t) => sum + t.amount, 0);

      const cashFlow = monthlyIncome - monthlyExpenses;
      const savingsRate =
        monthlyIncome > 0 ? (cashFlow / monthlyIncome) * 100 : 0;

      // Get spending by category
      const spendingByCategory = this.calculateSpendingByCategory(
        allTransactions.filter((t) => t.amount > 0),
      );

      // Get monthly trend (last 6 months)
      const monthlyTrend = await this.getMonthlyTrend(userId, 6);

      // Get recent transactions (last 10)
      const recentTransactions = allTransactions
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

      return {
        netWorth,
        totalAssets,
        totalLiabilities,
        monthlyIncome,
        monthlyExpenses,
        cashFlow,
        savingsRate,
        accounts,
        recentTransactions,
        spendingByCategory,
        monthlyTrend,
      };
    } catch (error) {
      // FinancialService error: Error getting financial dashboard
      throw error;
    }
  }

  /**
   * Calculate spending by category
   */
  private calculateSpendingByCategory(
    transactions: PlaidTransaction[],
  ): CategorySpending[] {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const txn of transactions) {
      const category = txn.category[0] || "Uncategorized";
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + txn.amount,
        count: existing.count + 1,
      });
    }

    const total = Array.from(categoryMap.values()).reduce(
      (sum, c) => sum + c.amount,
      0,
    );

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get monthly trend data
   */
  private async getMonthlyTrend(
    userId: string,
    months: number,
  ): Promise<MonthlyTrend[]> {
    const trends: MonthlyTrend[] = [];
    const accounts = await plaidService.getAccounts(userId);

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      let income = 0;
      let expenses = 0;

      for (const account of accounts) {
        const transactions = await plaidService.getTransactions(
          account.accountId,
          startDate,
          endDate,
        );

        income += transactions
          .filter((t) => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        expenses += transactions
          .filter((t) => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
      }

      trends.push({
        month: startDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        income,
        expenses,
        savings: income - expenses,
      });
    }

    return trends;
  }

  /**
   * Get spending analysis
   */
  async getSpendingAnalysis(
    userId: string,
    days: number = 30,
  ): Promise<SpendingAnalysis> {
    try {
      const accounts = await plaidService.getAccounts(userId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const allTransactions: PlaidTransaction[] = [];
      for (const account of accounts) {
        const transactions = await plaidService.getTransactions(
          account.accountId,
          startDate,
          new Date(),
        );
        allTransactions.push(...transactions.filter((t) => t.amount > 0));
      }

      const totalSpending = allTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );
      const averageDaily = totalSpending / days;

      const topCategories = this.calculateSpendingByCategory(
        allTransactions,
      ).slice(0, 5);

      const merchantMap = new Map<string, { amount: number; count: number }>();
      for (const txn of allTransactions) {
        const merchant = txn.merchantName || txn.name;
        const existing = merchantMap.get(merchant) || { amount: 0, count: 0 };
        merchantMap.set(merchant, {
          amount: existing.amount + txn.amount,
          count: existing.count + 1,
        });
      }

      const topMerchants = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
          merchant,
          amount: data.amount,
          transactionCount: data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Compare to previous month
      const previousMonthStart = new Date(startDate);
      previousMonthStart.setDate(previousMonthStart.getDate() - days);

      let previousMonthSpending = 0;
      for (const account of accounts) {
        const transactions = await plaidService.getTransactions(
          account.accountId,
          previousMonthStart,
          startDate,
        );
        previousMonthSpending += transactions
          .filter((t) => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
      }

      const comparisonToPreviousMonth =
        previousMonthSpending > 0
          ? ((totalSpending - previousMonthSpending) / previousMonthSpending) *
            100
          : 0;

      // Generate insights
      const insights: string[] = [];
      if (comparisonToPreviousMonth > 10) {
        insights.push(
          `Your spending increased by ${comparisonToPreviousMonth.toFixed(1)}% compared to last month`,
        );
      } else if (comparisonToPreviousMonth < -10) {
        insights.push(
          `Great job! Your spending decreased by ${Math.abs(comparisonToPreviousMonth).toFixed(1)}% compared to last month`,
        );
      }

      if (topCategories.length > 0) {
        insights.push(
          `Your top spending category is ${topCategories[0].category} at $${topCategories[0].amount.toFixed(2)}`,
        );
      }

      return {
        totalSpending,
        averageDaily,
        topCategories,
        topMerchants,
        comparisonToPreviousMonth,
        insights,
      };
    } catch (error) {
      // FinancialService error: Error getting spending analysis
      throw error;
    }
  }

  /**
   * Get budgets
   */
  async getBudgets(userId: string): Promise<Budget[]> {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch budgets");
    }

    const rows = (data ?? []) as BudgetRow[];
    return rows.map((row) => this.mapDatabaseToBudget(row));
  }

  /**
   * Create budget
   */
  async createBudget(
    userId: string,
    category: string,
    amount: number,
    period: "monthly" | "weekly" | "yearly",
  ): Promise<Budget> {
    const startDate = new Date();
    const endDate = new Date();

    if (period === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (period === "weekly") {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        user_id: userId,
        category,
        amount,
        spent: 0,
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error("Failed to create budget");
    }

    return this.mapDatabaseToBudget(data as BudgetRow);
  }

  /**
   * Get financial goals
   */
  async getFinancialGoals(userId: string): Promise<FinancialGoal[]> {
    const { data, error } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch financial goals");
    }

    const rows = (data ?? []) as FinancialGoalRow[];
    return rows.map((row) => this.mapDatabaseToGoal(row));
  }

  /**
   * Create financial goal
   */
  async createFinancialGoal(
    userId: string,
    type: string,
    name: string,
    targetAmount: number,
    targetDate: Date,
  ): Promise<FinancialGoal> {
    const { data, error } = await supabase
      .from("financial_goals")
      .insert({
        user_id: userId,
        type,
        name,
        target_amount: targetAmount,
        current_amount: 0,
        target_date: targetDate.toISOString(),
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error("Failed to create financial goal");
    }

    return this.mapDatabaseToGoal(data as FinancialGoalRow);
  }

  /**
   * Map database record to Budget
   */
  private mapDatabaseToBudget(data: BudgetRow): Budget {
    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      amount: data.amount,
      spent: data.spent,
      remaining: data.amount - data.spent,
      period: data.period,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Map database record to FinancialGoal
   */
  private mapDatabaseToGoal(data: FinancialGoalRow): FinancialGoal {
    const progress =
      data.target_amount > 0
        ? (data.current_amount / data.target_amount) * 100
        : 0;

    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      progress,
      targetDate: new Date(data.target_date),
      status: data.status,
      createdAt: new Date(data.created_at),
    };
  }
}

// Export singleton instance
export const financialService = new FinancialService();
export default financialService;
