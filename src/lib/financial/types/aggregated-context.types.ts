/**
 * Aggregated Financial Context Types
 *
 * Comprehensive type definitions for unified financial data aggregation
 * combining budgets, spending, bills, savings, debt, net worth, and investments.
 */

import {
  Budget,
  BudgetSummary,
  BudgetAlert,
  BudgetTrend,
} from "./budget.types";
import { Bill, BillSummary } from "./bill.types";
import { SavingsGoal, SavingsRule, SavingsSummary } from "./savings.types";
import { Debt, DebtOverview, PayoffPlan } from "./debt-payoff.types";
import {
  UserProfile,
  AggregatedAccounts,
  CategorizedTransactions,
  FinancialGoal,
  PortfolioSummary,
  CreditSummary,
  FinancialHealthScore,
  AIInsight,
  Recommendation,
  RecurringBill,
} from "./financial-context.types";

// ============================================================================
// AGGREGATED FINANCIAL CONTEXT
// ============================================================================

/**
 * Complete aggregated financial context combining all financial data sources
 */
export interface AggregatedFinancialContext {
  // User information
  user: UserProfile;

  // Account aggregation
  accounts: AggregatedAccounts;

  // Budgeting data
  budgets: {
    items: Budget[];
    summary: BudgetSummary;
    alerts: BudgetAlert[];
    trends: BudgetTrend[];
  };

  // Spending data
  spending: {
    transactions: CategorizedTransactions;
    monthlyAverage: number;
    yearToDateTotal: number;
    topCategories: CategorySpending[];
    anomalies: SpendingAnomaly[];
  };

  // Bills and subscriptions
  bills: {
    items: Bill[];
    recurring: RecurringBill[];
    summary: BillSummary;
    totalMonthly: number;
    negotiationOpportunities: number;
  };

  // Savings data
  savings: {
    goals: SavingsGoal[];
    rules: SavingsRule[];
    summary: SavingsSummary;
    totalSaved: number;
    monthlyContributions: number;
  };

  // Debt data
  debt: {
    items: Debt[];
    overview: DebtOverview;
    payoffPlan?: PayoffPlan;
    totalDebt: number;
    monthlyPayments: number;
  };

  // Net worth
  netWorth: {
    current: number;
    previousMonth: number;
    change: number;
    changePercent: number;
    assets: AssetSummary;
    liabilities: LiabilitySummary;
    history: NetWorthHistoryPoint[];
  };

  // Investments
  investments: {
    portfolio: PortfolioSummary;
    totalValue: number;
    dayChange: number;
    totalGainLoss: number;
    diversificationScore: number;
    riskLevel: RiskLevel;
    retirementReadiness: number;
  };

  // Credit profile
  credit: CreditSummary;

  // Financial health score
  healthScore: FinancialHealthScore;

  // Goals
  goals: FinancialGoal[];

  // AI-generated insights and recommendations
  insights: AIInsight[];
  recommendations: Recommendation[];

  // Metadata
  lastUpdated: Date;
  dataCompleteness: DataCompleteness;
}

// ============================================================================
// FINANCIAL SNAPSHOT
// ============================================================================

/**
 * Point-in-time financial state snapshot
 */
export interface FinancialSnapshot {
  date: Date;

  // Key financial metrics
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalDebt: number;
  totalSavings: number;
  totalInvestments: number;

  // Cash flow
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashFlow: number;

  // Ratios and scores
  debtToIncomeRatio: number;
  savingsRate: number;
  healthScore: number;
  creditScore?: number;

  // Budget status
  budgetUtilization: number;
  budgetsOnTrack: number;
  budgetsOverBudget: number;

  // Goals progress
  goalsProgress: number;
  activeGoalsCount: number;

  // Investment performance
  investmentReturn: number;
  portfolioValue: number;
}

// ============================================================================
// FINANCIAL TRENDS
// ============================================================================

/**
 * Historical trend analysis over time
 */
export interface FinancialTrends {
  period: TrendPeriod;
  startDate: Date;
  endDate: Date;

  // Net worth trend
  netWorthTrend: TrendData;

  // Income and spending trends
  incomeTrend: TrendData;
  spendingTrend: TrendData;
  cashFlowTrend: TrendData;

  // Savings and debt trends
  savingsTrend: TrendData;
  debtTrend: TrendData;

  // Investment trends
  investmentTrend: TrendData;

  // Health score history
  healthScoreHistory: HealthScoreHistoryPoint[];

  // Key observations
  observations: TrendObservation[];
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

export interface SpendingAnomaly {
  id: string;
  type:
    | "unusual_amount"
    | "unusual_frequency"
    | "new_merchant"
    | "category_spike";
  description: string;
  amount: number;
  category?: string;
  merchant?: string;
  severity: "low" | "medium" | "high";
  date: Date;
}

export interface AssetSummary {
  cash: number;
  investments: number;
  realEstate: number;
  vehicles: number;
  other: number;
  total: number;
}

export interface LiabilitySummary {
  creditCards: number;
  mortgages: number;
  studentLoans: number;
  autoLoans: number;
  personalLoans: number;
  other: number;
  total: number;
}

export interface NetWorthHistoryPoint {
  date: Date;
  netWorth: number;
  assets: number;
  liabilities: number;
}

export type RiskLevel =
  | "conservative"
  | "moderate"
  | "aggressive"
  | "very_aggressive";

export interface DataCompleteness {
  accounts: boolean;
  budgets: boolean;
  transactions: boolean;
  bills: boolean;
  savings: boolean;
  debt: boolean;
  investments: boolean;
  credit: boolean;
  overallScore: number; // 0-100
}

export type TrendPeriod = "7d" | "30d" | "90d" | "180d" | "1y" | "2y" | "all";

export interface TrendData {
  values: TrendDataPoint[];
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "stable";
  average: number;
  min: number;
  max: number;
}

export interface TrendDataPoint {
  date: Date;
  value: number;
}

export interface HealthScoreHistoryPoint {
  date: Date;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface TrendObservation {
  type: "improvement" | "decline" | "milestone" | "anomaly" | "opportunity";
  metric: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  date?: Date;
}

// ============================================================================
// AGGREGATION OPTIONS
// ============================================================================

export interface AggregationOptions {
  includeBudgets?: boolean;
  includeSpending?: boolean;
  includeBills?: boolean;
  includeSavings?: boolean;
  includeDebt?: boolean;
  includeInvestments?: boolean;
  includeCredit?: boolean;
  includeInsights?: boolean;
  transactionDays?: number; // How many days of transactions to include
  forceRefresh?: boolean; // Bypass cache
}

export interface SnapshotOptions {
  date?: Date; // Default: now
  includeProjections?: boolean;
}

export interface TrendOptions {
  period: TrendPeriod;
  startDate?: Date;
  endDate?: Date;
  metrics?: TrendMetric[];
}

export type TrendMetric =
  | "netWorth"
  | "income"
  | "spending"
  | "cashFlow"
  | "savings"
  | "debt"
  | "investments"
  | "healthScore";

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface CachedContext<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  userId: string;
}

export interface CacheConfig {
  ttlMinutes: number;
  maxSize: number;
}
