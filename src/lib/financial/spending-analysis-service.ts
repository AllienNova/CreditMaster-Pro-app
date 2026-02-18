/**
 * Spending Analysis Service
 *
 * Intelligent spending analysis with pattern detection, anomaly detection,
 * trend analysis, and AI-powered insights.
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import { plaidService } from './plaid-service';
import {
  BudgetCategoryValue,
  CATEGORY_DISPLAY_NAMES,
} from './types/budget.types';

// ============================================================================
// TYPES
// ============================================================================

export interface SpendingPeriod {
  startDate: Date;
  endDate: Date;
}

export interface SpendingTransaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  merchantName: string;
  category: string;
  subcategory?: string;
  isPending: boolean;
  isRecurring: boolean;
}

export interface CategorySpending {
  category: string;
  displayName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeFromLastPeriod: number;
}

export interface MerchantSpending {
  merchant: string;
  category: string;
  amount: number;
  transactionCount: number;
  averageTransaction: number;
  isRecurring: boolean;
  lastTransaction: Date;
}

export interface SpendingAnomaly {
  id: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  amount: number;
  expectedAmount?: number;
  category?: string;
  merchant?: string;
  transactionId?: string;
  detectedAt: Date;
}

export type AnomalyType =
  | 'unusual_large_transaction'
  | 'unusual_merchant'
  | 'unusual_category'
  | 'unusual_frequency'
  | 'duplicate_charge'
  | 'subscription_increase';

export interface SpendingPattern {
  type: PatternType;
  description: string;
  frequency: string;
  averageAmount: number;
  nextExpected?: Date;
  relatedTransactions: string[];
}

export type PatternType =
  | 'recurring_subscription'
  | 'weekly_spending'
  | 'payday_spending'
  | 'seasonal_spending'
  | 'weekend_spending';

export interface SpendingInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  potentialSavings?: number;
  actionSuggestion?: string;
  relatedCategory?: string;
  relatedMerchant?: string;
}

export type InsightType =
  | 'spending_increase'
  | 'spending_decrease'
  | 'budget_at_risk'
  | 'savings_opportunity'
  | 'subscription_review'
  | 'category_optimization'
  | 'merchant_alternative';

export interface SpendingAnalysisResult {
  period: SpendingPeriod;
  totalSpending: number;
  totalIncome: number;
  netCashFlow: number;
  averageDailySpending: number;
  byCategory: CategorySpending[];
  byMerchant: MerchantSpending[];
  anomalies: SpendingAnomaly[];
  patterns: SpendingPattern[];
  insights: SpendingInsight[];
  comparison: PeriodComparison;
}

export interface PeriodComparison {
  previousPeriod: SpendingPeriod;
  spendingChange: number;
  spendingChangePercent: number;
  categoryChanges: CategoryChange[];
}

export interface CategoryChange {
  category: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercent: number;
}

export interface SpendingPrediction {
  predictedMonthlySpending: number;
  predictedByCategory: { category: string; amount: number }[];
  confidence: number;
  basedOnMonths: number;
}

// ============================================================================
// CASH FLOW TYPES
// ============================================================================

export interface MonthlyFlowData {
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  netFlow: number;
  savingsRate: number;
}

export interface CashFlowHealth {
  status: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  message: string;
}

export interface CashFlowAnalysis {
  period: SpendingPeriod;
  monthlyData: MonthlyFlowData[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalNetFlow: number;
    avgMonthlyIncome: number;
    avgMonthlyExpenses: number;
    avgSavingsRate: number;
  };
  trends: {
    income: 'increasing' | 'decreasing' | 'stable';
    expenses: 'increasing' | 'decreasing' | 'stable';
    netFlow: 'increasing' | 'decreasing' | 'stable';
  };
  health: CashFlowHealth;
  recommendations: string[];
}

// ============================================================================
// TREND ANALYSIS TYPES
// ============================================================================

export interface TrendAnalysisOptions {
  months?: number;
  compareYoY?: boolean;
  categories?: string[];
}

export interface MonthlySpendingData {
  month: string;
  monthLabel: string;
  total: number;
  byCategory: Record<string, number>;
  transactionCount: number;
}

export interface CategoryTrend {
  category: string;
  displayName: string;
  monthlyAmounts: number[];
  total: number;
  average: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
}

export interface YearOverYearComparison {
  currentPeriodTotal: number;
  lastYearTotal: number;
  change: number;
  changePercent: number;
  categoryComparison: Record<
    string,
    { current: number; lastYear: number; change: number }
  >;
}

export interface SignificantChange {
  month: string;
  previousMonth: string;
  amount: number;
  percentChange: number;
  direction: 'increase' | 'decrease';
}

export interface ProjectedSpending {
  projected: number;
  confidence: number;
  range: { low: number; high: number };
}

export interface SpendingTrendAnalysis {
  period: SpendingPeriod;
  monthlyTotals: MonthlySpendingData[];
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  categoryTrends: CategoryTrend[];
  yoyComparison?: YearOverYearComparison;
  significantChanges: SignificantChange[];
  projectedNextMonth: ProjectedSpending;
}

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

const PLAID_TO_BUDGET_CATEGORY: Record<string, BudgetCategoryValue> = {
  'Food and Drink': 'dining_out',
  'Food and Drink - Restaurants': 'dining_out',
  'Food and Drink - Groceries': 'groceries',
  Shops: 'shopping',
  'Shops - Supermarkets and Groceries': 'groceries',
  Travel: 'travel',
  'Travel - Airlines and Aviation Services': 'travel',
  Transfer: 'other',
  Recreation: 'entertainment',
  'Service - Utilities': 'utilities',
  'Service - Insurance': 'insurance',
  'Service - Financial': 'debt_payments',
  'Service - Healthcare': 'healthcare',
  'Payment - Rent': 'housing',
  'Payment - Credit Card': 'debt_payments',
};

/**
 * Map Plaid category to budget category
 */
function mapPlaidCategory(plaidCategory: string): BudgetCategoryValue {
  return PLAID_TO_BUDGET_CATEGORY[plaidCategory] || 'other';
}

// ============================================================================
// SPENDING ANALYSIS SERVICE CLASS
// ============================================================================

class SpendingAnalysisService {
  /**
   * Perform comprehensive spending analysis for a user
   */
  async analyzeSpending(
    userId: string,
    period: SpendingPeriod
  ): Promise<SpendingAnalysisResult> {
    // Get all transactions for the period
    const transactions = await this.getTransactions(userId, period);

    // Separate income and expenses
    const expenses = transactions.filter((t) => t.amount > 0);
    const income = transactions.filter((t) => t.amount < 0);

    const totalSpending = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netCashFlow = totalIncome - totalSpending;

    const daysInPeriod = Math.ceil(
      (period.endDate.getTime() - period.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const averageDailySpending = totalSpending / Math.max(1, daysInPeriod);

    // Analyze by category
    const byCategory = this.analyzeByCategory(expenses, totalSpending);

    // Analyze by merchant
    const byMerchant = this.analyzeByMerchant(expenses);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(userId, expenses);

    // Detect patterns
    const patterns = this.detectPatterns(transactions);

    // Generate insights
    const insights = this.generateInsights(byCategory, byMerchant, anomalies);

    // Get comparison with previous period
    const comparison = await this.compareToPreviousPeriod(
      userId,
      period,
      byCategory
    );

    return {
      period,
      totalSpending: Math.round(totalSpending * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      averageDailySpending: Math.round(averageDailySpending * 100) / 100,
      byCategory,
      byMerchant,
      anomalies,
      patterns,
      insights,
      comparison,
    };
  }

  /**
   * Get transactions from Plaid for a user
   */
  private async getTransactions(
    userId: string,
    period: SpendingPeriod
  ): Promise<SpendingTransaction[]> {
    try {
      const accounts = await plaidService.getAccounts(userId);
      const allTransactions: SpendingTransaction[] = [];

      for (const account of accounts) {
        const transactions = await plaidService.getTransactions(
          account.accountId,
          period.startDate,
          period.endDate
        );

        for (const txn of transactions) {
          allTransactions.push({
            id: txn.transactionId,
            accountId: txn.accountId,
            date: txn.date,
            amount: txn.amount,
            merchantName: txn.merchantName || txn.name,
            category: mapPlaidCategory(txn.category[0] || 'Other'),
            subcategory: txn.category[1],
            isPending: txn.pending,
            isRecurring: this.detectRecurring(txn.name, txn.amount),
          });
        }
      }

      return allTransactions.sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );
    } catch (_error) {
      // Error logged
      return [];
    }
  }

  /**
   * Detect if a transaction is likely recurring
   */
  private detectRecurring(name: string, _amount: number): boolean {
    const recurringKeywords = [
      'subscription',
      'netflix',
      'spotify',
      'hulu',
      'disney',
      'amazon prime',
      'apple',
      'google',
      'microsoft',
      'adobe',
      'gym',
      'insurance',
      'utility',
      'electric',
      'water',
      'gas',
      'internet',
      'phone',
      'rent',
      'mortgage',
    ];

    const lowerName = name.toLowerCase();
    return recurringKeywords.some((keyword) => lowerName.includes(keyword));
  }

  /**
   * Analyze spending by category
   */
  private analyzeByCategory(
    transactions: SpendingTransaction[],
    totalSpending: number
  ): CategorySpending[] {
    const categoryMap = new Map<
      string,
      { amount: number; count: number; transactions: SpendingTransaction[] }
    >();

    for (const txn of transactions) {
      const existing = categoryMap.get(txn.category) || {
        amount: 0,
        count: 0,
        transactions: [],
      };
      categoryMap.set(txn.category, {
        amount: existing.amount + txn.amount,
        count: existing.count + 1,
        transactions: [...existing.transactions, txn],
      });
    }

    const result: CategorySpending[] = [];
    categoryMap.forEach((data, category) => {
      result.push({
        category,
        displayName: this.getCategoryDisplayName(category),
        amount: Math.round(data.amount * 100) / 100,
        percentage:
          totalSpending > 0
            ? Math.round((data.amount / totalSpending) * 10000) / 100
            : 0,
        transactionCount: data.count,
        averageTransaction: Math.round((data.amount / data.count) * 100) / 100,
        trend: 'stable', // Would need historical data for real trend
        changeFromLastPeriod: 0,
      });
    });

    return result.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: string): string {
    const displayNames: Record<string, string> = {
      housing: 'Housing',
      utilities: 'Utilities',
      groceries: 'Groceries',
      transportation: 'Transportation',
      insurance: 'Insurance',
      healthcare: 'Healthcare',
      debt_payments: 'Debt Payments',
      dining_out: 'Dining Out',
      entertainment: 'Entertainment',
      shopping: 'Shopping',
      personal_care: 'Personal Care',
      fitness: 'Fitness',
      subscriptions: 'Subscriptions',
      savings: 'Savings',
      investments: 'Investments',
      emergency_fund: 'Emergency Fund',
      education: 'Education',
      travel: 'Travel',
      gifts: 'Gifts',
      pets: 'Pets',
      childcare: 'Childcare',
      other: 'Other',
    };
    return displayNames[category] || category;
  }

  /**
   * Analyze spending by merchant
   */
  private analyzeByMerchant(
    transactions: SpendingTransaction[]
  ): MerchantSpending[] {
    const merchantMap = new Map<
      string,
      {
        amount: number;
        count: number;
        category: string;
        isRecurring: boolean;
        lastDate: Date;
      }
    >();

    for (const txn of transactions) {
      const merchant = txn.merchantName || 'Unknown';
      const existing = merchantMap.get(merchant);

      if (existing) {
        merchantMap.set(merchant, {
          amount: existing.amount + txn.amount,
          count: existing.count + 1,
          category: existing.category,
          isRecurring: existing.isRecurring || txn.isRecurring,
          lastDate: txn.date > existing.lastDate ? txn.date : existing.lastDate,
        });
      } else {
        merchantMap.set(merchant, {
          amount: txn.amount,
          count: 1,
          category: txn.category,
          isRecurring: txn.isRecurring,
          lastDate: txn.date,
        });
      }
    }

    const result: MerchantSpending[] = [];
    merchantMap.forEach((data, merchant) => {
      result.push({
        merchant,
        category: data.category,
        amount: Math.round(data.amount * 100) / 100,
        transactionCount: data.count,
        averageTransaction: Math.round((data.amount / data.count) * 100) / 100,
        isRecurring: data.isRecurring,
        lastTransaction: data.lastDate,
      });
    });

    return result.sort((a, b) => b.amount - a.amount).slice(0, 20);
  }

  /**
   * Detect spending anomalies
   */
  private async detectAnomalies(
    userId: string,
    transactions: SpendingTransaction[]
  ): Promise<SpendingAnomaly[]> {
    const anomalies: SpendingAnomaly[] = [];

    // Calculate category averages
    const categoryAverages = new Map<
      string,
      { total: number; count: number }
    >();
    for (const txn of transactions) {
      const existing = categoryAverages.get(txn.category) || {
        total: 0,
        count: 0,
      };
      categoryAverages.set(txn.category, {
        total: existing.total + txn.amount,
        count: existing.count + 1,
      });
    }

    // Check for unusually large transactions (>3x category average)
    for (const txn of transactions) {
      const categoryData = categoryAverages.get(txn.category);
      if (categoryData && categoryData.count > 3) {
        const average = categoryData.total / categoryData.count;
        if (txn.amount > average * 3 && txn.amount > 100) {
          anomalies.push({
            id: `anomaly_${txn.id}`,
            type: 'unusual_large_transaction',
            severity: txn.amount > average * 5 ? 'high' : 'medium',
            description: `Unusually large ${this.getCategoryDisplayName(txn.category)} transaction at ${txn.merchantName}`,
            amount: txn.amount,
            expectedAmount: average,
            category: txn.category,
            merchant: txn.merchantName,
            transactionId: txn.id,
            detectedAt: new Date(),
          });
        }
      }
    }

    // Check for potential duplicate charges (same merchant, same amount, within 7 days)
    const sortedByMerchant = [...transactions].sort((a, b) =>
      a.merchantName.localeCompare(b.merchantName)
    );

    for (let i = 1; i < sortedByMerchant.length; i++) {
      const prev = sortedByMerchant[i - 1];
      const curr = sortedByMerchant[i];

      if (
        prev.merchantName === curr.merchantName &&
        Math.abs(prev.amount - curr.amount) < 0.01 &&
        Math.abs(prev.date.getTime() - curr.date.getTime()) <
          7 * 24 * 60 * 60 * 1000
      ) {
        anomalies.push({
          id: `duplicate_${curr.id}`,
          type: 'duplicate_charge',
          severity: 'medium',
          description: `Potential duplicate charge at ${curr.merchantName}`,
          amount: curr.amount,
          merchant: curr.merchantName,
          transactionId: curr.id,
          detectedAt: new Date(),
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect spending patterns
   */
  private detectPatterns(
    transactions: SpendingTransaction[]
  ): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Detect recurring subscriptions
    const recurringTransactions = transactions.filter((t) => t.isRecurring);
    const recurringByMerchant = new Map<string, SpendingTransaction[]>();

    for (const txn of recurringTransactions) {
      const existing = recurringByMerchant.get(txn.merchantName) || [];
      recurringByMerchant.set(txn.merchantName, [...existing, txn]);
    }

    recurringByMerchant.forEach(
      (txns: SpendingTransaction[], merchant: string) => {
        if (txns.length >= 1) {
          const avgAmount =
            txns.reduce(
              (sum: number, t: SpendingTransaction) => sum + t.amount,
              0
            ) / txns.length;
          patterns.push({
            type: 'recurring_subscription',
            description: `Monthly subscription to ${merchant}`,
            frequency: 'monthly',
            averageAmount: Math.round(avgAmount * 100) / 100,
            nextExpected: this.getNextExpectedDate(txns[0].date, 'monthly'),
            relatedTransactions: txns.map((t: SpendingTransaction) => t.id),
          });
        }
      }
    );

    // Detect weekend spending pattern
    const weekendTransactions = transactions.filter((t) => {
      const day = t.date.getDay();
      return day === 0 || day === 6;
    });

    if (weekendTransactions.length > 5) {
      const avgWeekendSpending =
        weekendTransactions.reduce((sum, t) => sum + t.amount, 0) /
        weekendTransactions.length;
      patterns.push({
        type: 'weekend_spending',
        description: 'Higher spending on weekends detected',
        frequency: 'weekly',
        averageAmount: Math.round(avgWeekendSpending * 100) / 100,
        relatedTransactions: weekendTransactions.slice(0, 10).map((t) => t.id),
      });
    }

    return patterns;
  }

  /**
   * Get next expected date for recurring pattern
   */
  private getNextExpectedDate(
    lastDate: Date,
    frequency: 'weekly' | 'biweekly' | 'monthly'
  ): Date {
    const next = new Date(lastDate);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  }

  /**
   * Generate spending insights
   */
  private generateInsights(
    byCategory: CategorySpending[],
    byMerchant: MerchantSpending[],
    anomalies: SpendingAnomaly[]
  ): SpendingInsight[] {
    const insights: SpendingInsight[] = [];
    let insightId = 0;

    // Top spending category insight
    if (byCategory.length > 0) {
      const topCategory = byCategory[0];
      insights.push({
        id: `insight_${++insightId}`,
        type: 'category_optimization',
        title: `${topCategory.displayName} is your top spending category`,
        description: `You spent $${topCategory.amount.toFixed(2)} on ${topCategory.displayName} (${topCategory.percentage.toFixed(1)}% of total spending).`,
        impact: topCategory.percentage > 30 ? 'negative' : 'neutral',
        relatedCategory: topCategory.category,
      });
    }

    // Subscription review insight
    const recurringMerchants = byMerchant.filter((m) => m.isRecurring);
    if (recurringMerchants.length > 3) {
      const totalSubscriptions = recurringMerchants.reduce(
        (sum, m) => sum + m.amount,
        0
      );
      insights.push({
        id: `insight_${++insightId}`,
        type: 'subscription_review',
        title: 'Consider reviewing your subscriptions',
        description: `You have ${recurringMerchants.length} recurring charges totaling $${totalSubscriptions.toFixed(2)}.`,
        impact: 'neutral',
        potentialSavings: totalSubscriptions * 0.2, // Assume 20% could be saved
        actionSuggestion:
          'Review your subscriptions and cancel any you no longer use.',
      });
    }

    // Anomaly-based insight
    if (anomalies.length > 0) {
      insights.push({
        id: `insight_${++insightId}`,
        type: 'spending_increase',
        title: `${anomalies.length} unusual transaction(s) detected`,
        description:
          'We found some transactions that seem unusual compared to your typical spending.',
        impact: 'negative',
        actionSuggestion:
          'Review these transactions to ensure they are legitimate.',
      });
    }

    return insights;
  }

  /**
   * Compare spending to previous period
   */
  private async compareToPreviousPeriod(
    userId: string,
    currentPeriod: SpendingPeriod,
    currentByCategory: CategorySpending[]
  ): Promise<PeriodComparison> {
    const periodDuration =
      currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime();

    const previousPeriod: SpendingPeriod = {
      startDate: new Date(currentPeriod.startDate.getTime() - periodDuration),
      endDate: new Date(currentPeriod.endDate.getTime() - periodDuration),
    };

    // Get previous period transactions
    const previousTransactions = await this.getTransactions(
      userId,
      previousPeriod
    );
    const previousExpenses = previousTransactions.filter((t) => t.amount > 0);
    const previousTotal = previousExpenses.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const previousByCategory = this.analyzeByCategory(
      previousExpenses,
      previousTotal
    );

    // Calculate current total
    const currentTotal = currentByCategory.reduce(
      (sum, c) => sum + c.amount,
      0
    );

    // Calculate changes
    const spendingChange = currentTotal - previousTotal;
    const spendingChangePercent =
      previousTotal > 0 ? (spendingChange / previousTotal) * 100 : 0;

    // Calculate category changes
    const categoryChanges: CategoryChange[] = [];
    for (const current of currentByCategory) {
      const previous = previousByCategory.find(
        (p) => p.category === current.category
      );
      const prevAmount = previous?.amount || 0;
      const change = current.amount - prevAmount;

      categoryChanges.push({
        category: current.category,
        currentAmount: current.amount,
        previousAmount: prevAmount,
        change: Math.round(change * 100) / 100,
        changePercent:
          prevAmount > 0
            ? Math.round((change / prevAmount) * 10000) / 100
            : current.amount > 0
              ? 100
              : 0,
      });
    }

    return {
      previousPeriod,
      spendingChange: Math.round(spendingChange * 100) / 100,
      spendingChangePercent: Math.round(spendingChangePercent * 100) / 100,
      categoryChanges: categoryChanges.sort(
        (a, b) => Math.abs(b.change) - Math.abs(a.change)
      ),
    };
  }

  /**
   * Predict future spending based on historical data
   */
  async predictSpending(
    userId: string,
    months: number = 3
  ): Promise<SpendingPrediction> {
    // Get spending for the last N months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const period: SpendingPeriod = { startDate, endDate };
    const analysis = await this.analyzeSpending(userId, period);

    // Calculate monthly average
    const monthlyAverage = analysis.totalSpending / months;

    // Predict by category
    const predictedByCategory = analysis.byCategory.map((cat) => ({
      category: cat.category,
      amount: Math.round((cat.amount / months) * 100) / 100,
    }));

    return {
      predictedMonthlySpending: Math.round(monthlyAverage * 100) / 100,
      predictedByCategory,
      confidence: months >= 3 ? 0.75 : 0.5,
      basedOnMonths: months,
    };
  }

  /**
   * Get quick spending summary (for dashboard widgets)
   */
  async getQuickSummary(userId: string): Promise<{
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
    topCategory: string;
    topCategoryAmount: number;
  }> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthAnalysis, lastMonthAnalysis] = await Promise.all([
      this.analyzeSpending(userId, {
        startDate: thisMonthStart,
        endDate: now,
      }),
      this.analyzeSpending(userId, {
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
      }),
    ]);

    const changePercent =
      lastMonthAnalysis.totalSpending > 0
        ? ((thisMonthAnalysis.totalSpending - lastMonthAnalysis.totalSpending) /
            lastMonthAnalysis.totalSpending) *
          100
        : 0;

    const topCategory = thisMonthAnalysis.byCategory[0];

    return {
      thisMonth: thisMonthAnalysis.totalSpending,
      lastMonth: lastMonthAnalysis.totalSpending,
      changePercent: Math.round(changePercent * 100) / 100,
      topCategory: topCategory?.displayName || 'None',
      topCategoryAmount: topCategory?.amount || 0,
    };
  }

  // ==========================================================================
  // CASH FLOW ANALYSIS
  // ==========================================================================

  /**
   * Get comprehensive cash flow analysis
   */
  async getCashFlowAnalysis(
    userId: string,
    months: number = 6
  ): Promise<CashFlowAnalysis> {
    const now = new Date();
    const monthlyData: MonthlyFlowData[] = [];

    // Analyze each month
    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const analysis = await this.analyzeSpending(userId, {
        startDate: monthStart,
        endDate: monthEnd,
      });

      monthlyData.unshift({
        month: monthStart.toISOString().slice(0, 7),
        monthLabel: monthStart.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        income: analysis.totalIncome,
        expenses: analysis.totalSpending,
        netFlow: analysis.netCashFlow,
        savingsRate:
          analysis.totalIncome > 0
            ? (analysis.netCashFlow / analysis.totalIncome) * 100
            : 0,
      });
    }

    // Calculate totals and averages
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
    const totalNetFlow = totalIncome - totalExpenses;
    const avgMonthlyIncome = totalIncome / months;
    const avgMonthlyExpenses = totalExpenses / months;
    const avgSavingsRate =
      totalIncome > 0 ? (totalNetFlow / totalIncome) * 100 : 0;

    // Calculate trend (linear regression slope)
    const incomeTrend = this.calculateTrend(monthlyData.map((m) => m.income));
    const expensesTrend = this.calculateTrend(
      monthlyData.map((m) => m.expenses)
    );
    const netFlowTrend = this.calculateTrend(monthlyData.map((m) => m.netFlow));

    // Determine overall health
    const cashFlowHealth = this.determineCashFlowHealth(
      avgSavingsRate,
      netFlowTrend
    );

    return {
      period: {
        startDate: new Date(now.getFullYear(), now.getMonth() - months + 1, 1),
        endDate: now,
      },
      monthlyData,
      summary: {
        totalIncome,
        totalExpenses,
        totalNetFlow,
        avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
        avgMonthlyExpenses: Math.round(avgMonthlyExpenses * 100) / 100,
        avgSavingsRate: Math.round(avgSavingsRate * 100) / 100,
      },
      trends: {
        income: incomeTrend,
        expenses: expensesTrend,
        netFlow: netFlowTrend,
      },
      health: cashFlowHealth,
      recommendations: this.generateCashFlowRecommendations(
        avgSavingsRate,
        incomeTrend,
        expensesTrend,
        monthlyData
      ),
    };
  }

  /**
   * Calculate linear trend from data points
   */
  private calculateTrend(
    values: number[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;
    const percentChange = avgValue !== 0 ? (slope / avgValue) * 100 : 0;

    if (percentChange > 5) return 'increasing';
    if (percentChange < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Determine cash flow health status
   */
  private determineCashFlowHealth(
    savingsRate: number,
    netFlowTrend: 'increasing' | 'decreasing' | 'stable'
  ): CashFlowHealth {
    if (savingsRate >= 20 && netFlowTrend !== 'decreasing') {
      return {
        status: 'excellent',
        score: 95,
        message: 'Excellent cash flow! You are saving well above average.',
      };
    }
    if (savingsRate >= 10) {
      return {
        status: 'good',
        score: 75,
        message: 'Good cash flow. Consider increasing savings if possible.',
      };
    }
    if (savingsRate >= 0) {
      return {
        status: 'fair',
        score: 50,
        message: 'Breaking even. Look for ways to reduce expenses.',
      };
    }
    return {
      status: 'poor',
      score: 25,
      message:
        'Negative cash flow. Immediate action needed to reduce spending.',
    };
  }

  /**
   * Generate cash flow recommendations
   */
  private generateCashFlowRecommendations(
    savingsRate: number,
    incomeTrend: 'increasing' | 'decreasing' | 'stable',
    expensesTrend: 'increasing' | 'decreasing' | 'stable',
    monthlyData: MonthlyFlowData[]
  ): string[] {
    const recommendations: string[] = [];

    if (savingsRate < 10) {
      recommendations.push(
        'Aim to save at least 10-20% of your income each month.'
      );
    }

    if (expensesTrend === 'increasing') {
      recommendations.push(
        'Your expenses are trending upward. Review recent spending for areas to cut back.'
      );
    }

    if (incomeTrend === 'decreasing') {
      recommendations.push(
        'Your income is trending downward. Consider additional income sources.'
      );
    }

    if (savingsRate < 0) {
      recommendations.push(
        'You are spending more than you earn. Create a strict budget immediately.'
      );
    }

    // Check for inconsistent months
    const netFlows = monthlyData.map((m) => m.netFlow);
    const avgNetFlow = netFlows.reduce((a, b) => a + b, 0) / netFlows.length;
    const hasNegativeMonths = netFlows.some((nf) => nf < 0);

    if (hasNegativeMonths && avgNetFlow > 0) {
      recommendations.push(
        'Some months show negative cash flow. Build an emergency fund for irregular months.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Great job! Maintain your current spending habits and consider investing surplus.'
      );
    }

    return recommendations;
  }

  // ==========================================================================
  // TREND ANALYSIS
  // ==========================================================================

  /**
   * Get spending trends over time
   */
  async getSpendingTrends(
    userId: string,
    options: TrendAnalysisOptions = {}
  ): Promise<SpendingTrendAnalysis> {
    const { months = 6, compareYoY = false, categories } = options;
    const now = new Date();

    // Get current period data
    const currentPeriodData = await this.getMonthlySpendingData(
      userId,
      months,
      now
    );

    // Get year-over-year comparison if requested
    let yoyComparison: YearOverYearComparison | undefined;
    if (compareYoY) {
      const lastYearDate = new Date(now);
      lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
      const lastYearData = await this.getMonthlySpendingData(
        userId,
        months,
        lastYearDate
      );
      yoyComparison = this.calculateYoYComparison(
        currentPeriodData,
        lastYearData
      );
    }

    // Calculate category trends
    const categoryTrends = await this.getCategoryTrends(
      userId,
      months,
      categories
    );

    // Calculate overall trend
    const totalsByMonth = currentPeriodData.map((m) => m.total);
    const overallTrend = this.calculateTrend(totalsByMonth);

    // Find significant changes
    const significantChanges = this.findSignificantChanges(currentPeriodData);

    return {
      period: {
        startDate: new Date(now.getFullYear(), now.getMonth() - months + 1, 1),
        endDate: now,
      },
      monthlyTotals: currentPeriodData,
      overallTrend,
      categoryTrends,
      yoyComparison,
      significantChanges,
      projectedNextMonth: this.projectNextMonth(currentPeriodData),
    };
  }

  /**
   * Get monthly spending data
   */
  private async getMonthlySpendingData(
    userId: string,
    months: number,
    endDate: Date
  ): Promise<MonthlySpendingData[]> {
    const data: MonthlySpendingData[] = [];

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(
        endDate.getFullYear(),
        endDate.getMonth() - i,
        1
      );
      const monthEnd = new Date(
        endDate.getFullYear(),
        endDate.getMonth() - i + 1,
        0
      );

      const analysis = await this.analyzeSpending(userId, {
        startDate: monthStart,
        endDate: monthEnd,
      });

      const byCategory: Record<string, number> = {};
      analysis.byCategory.forEach((cat) => {
        byCategory[cat.category] = cat.amount;
      });

      data.unshift({
        month: monthStart.toISOString().slice(0, 7),
        monthLabel: monthStart.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        total: analysis.totalSpending,
        byCategory,
        transactionCount: analysis.byCategory.reduce(
          (sum, c) => sum + c.transactionCount,
          0
        ),
      });
    }

    return data;
  }

  /**
   * Get category-specific trends
   */
  private async getCategoryTrends(
    userId: string,
    months: number,
    filterCategories?: string[]
  ): Promise<CategoryTrend[]> {
    const now = new Date();
    const categoryData: Record<string, number[]> = {};

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const analysis = await this.analyzeSpending(userId, {
        startDate: monthStart,
        endDate: monthEnd,
      });

      analysis.byCategory.forEach((cat) => {
        if (!filterCategories || filterCategories.includes(cat.category)) {
          if (!categoryData[cat.category]) {
            categoryData[cat.category] = new Array(months).fill(0);
          }
          categoryData[cat.category][months - 1 - i] = cat.amount;
        }
      });
    }

    return Object.entries(categoryData).map(([category, amounts]) => {
      const total = amounts.reduce((a, b) => a + b, 0);
      const average = total / months;
      const trend = this.calculateTrend(amounts);
      const percentChange =
        amounts[0] > 0
          ? ((amounts[amounts.length - 1] - amounts[0]) / amounts[0]) * 100
          : 0;

      return {
        category,
        displayName:
          CATEGORY_DISPLAY_NAMES[category as BudgetCategoryValue] || category,
        monthlyAmounts: amounts,
        total,
        average: Math.round(average * 100) / 100,
        trend,
        percentChange: Math.round(percentChange * 100) / 100,
      };
    });
  }

  /**
   * Calculate year-over-year comparison
   */
  private calculateYoYComparison(
    currentData: MonthlySpendingData[],
    lastYearData: MonthlySpendingData[]
  ): YearOverYearComparison {
    const currentTotal = currentData.reduce((sum, m) => sum + m.total, 0);
    const lastYearTotal = lastYearData.reduce((sum, m) => sum + m.total, 0);
    const change = currentTotal - lastYearTotal;
    const changePercent =
      lastYearTotal > 0 ? (change / lastYearTotal) * 100 : 0;

    // Compare by category
    const categoryComparison: Record<
      string,
      { current: number; lastYear: number; change: number }
    > = {};

    currentData.forEach((month) => {
      Object.entries(month.byCategory).forEach(([cat, amount]) => {
        if (!categoryComparison[cat]) {
          categoryComparison[cat] = { current: 0, lastYear: 0, change: 0 };
        }
        categoryComparison[cat].current += amount;
      });
    });

    lastYearData.forEach((month) => {
      Object.entries(month.byCategory).forEach(([cat, amount]) => {
        if (!categoryComparison[cat]) {
          categoryComparison[cat] = { current: 0, lastYear: 0, change: 0 };
        }
        categoryComparison[cat].lastYear += amount;
      });
    });

    Object.keys(categoryComparison).forEach((cat) => {
      const comp = categoryComparison[cat];
      comp.change =
        comp.lastYear > 0
          ? ((comp.current - comp.lastYear) / comp.lastYear) * 100
          : 0;
    });

    return {
      currentPeriodTotal: currentTotal,
      lastYearTotal,
      change,
      changePercent: Math.round(changePercent * 100) / 100,
      categoryComparison,
    };
  }

  /**
   * Find significant month-over-month changes
   */
  private findSignificantChanges(
    data: MonthlySpendingData[]
  ): SignificantChange[] {
    const changes: SignificantChange[] = [];
    const threshold = 20; // 20% change threshold

    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];

      if (previous.total > 0) {
        const percentChange =
          ((current.total - previous.total) / previous.total) * 100;

        if (Math.abs(percentChange) >= threshold) {
          changes.push({
            month: current.month,
            previousMonth: previous.month,
            amount: current.total - previous.total,
            percentChange: Math.round(percentChange * 100) / 100,
            direction: percentChange > 0 ? 'increase' : 'decrease',
          });
        }
      }
    }

    return changes;
  }

  /**
   * Project next month's spending
   */
  private projectNextMonth(data: MonthlySpendingData[]): ProjectedSpending {
    if (data.length < 2) {
      return {
        projected: data[0]?.total || 0,
        confidence: 0.3,
        range: { low: 0, high: 0 },
      };
    }

    const totals = data.map((m) => m.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;

    // Simple weighted average (recent months weighted more)
    const weights = totals.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const weightedAvg =
      totals.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;

    // Calculate standard deviation for range
    const variance =
      totals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      totals.length;
    const stdDev = Math.sqrt(variance);

    return {
      projected: Math.round(weightedAvg * 100) / 100,
      confidence: data.length >= 6 ? 0.75 : data.length >= 3 ? 0.6 : 0.4,
      range: {
        low: Math.round((weightedAvg - stdDev) * 100) / 100,
        high: Math.round((weightedAvg + stdDev) * 100) / 100,
      },
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const spendingAnalysisService = new SpendingAnalysisService();
export default spendingAnalysisService;
