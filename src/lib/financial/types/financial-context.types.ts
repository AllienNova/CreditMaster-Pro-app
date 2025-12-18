/**
 * Financial Context Types
 *
 * Core type definitions for the Financial Context Engine
 * that provides a unified view of user's complete financial picture.
 */

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  currency: string;
  timezone: string;
  budgetAlertThreshold: number;
  goalRemindersEnabled: boolean;
  insightNotificationsEnabled: boolean;
}

// ============================================================================
// AGGREGATED ACCOUNTS
// ============================================================================

export interface AggregatedAccounts {
  checking: AccountSummary[];
  savings: AccountSummary[];
  credit: AccountSummary[];
  investment: AccountSummary[];
  loan: AccountSummary[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  lastSyncedAt: Date;
}

export interface AccountSummary {
  id: string;
  institutionName: string;
  accountName: string;
  accountType:
    | 'checking'
    | 'savings'
    | 'credit'
    | 'investment'
    | 'loan'
    | 'other';
  currentBalance: number;
  availableBalance?: number;
  creditLimit?: number;
  interestRate?: number;
  lastFourDigits?: string;
  isLinked: boolean;
  lastUpdatedAt: Date;
}

// ============================================================================
// CATEGORIZED TRANSACTIONS
// ============================================================================

export interface CategorizedTransactions {
  recentTransactions: Transaction[];
  byCategory: CategoryBreakdown[];
  byMerchant: MerchantBreakdown[];
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  period: TransactionPeriod;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  merchantName?: string;
  description: string;
  category: string;
  subcategory?: string;
  isPending: boolean;
  isRecurring: boolean;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  trend: 'up' | 'down' | 'stable';
  changeFromLastPeriod: number;
}

export interface MerchantBreakdown {
  merchant: string;
  amount: number;
  transactionCount: number;
  category: string;
}

export interface TransactionPeriod {
  startDate: Date;
  endDate: Date;
  daysIncluded: number;
}

// ============================================================================
// BUDGET STATUS
// ============================================================================

export interface BudgetStatus {
  id: string;
  category: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  period: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  status: 'on_track' | 'warning' | 'over_budget';
  daysRemaining: number;
  projectedOverage: number;
  rolloverEnabled: boolean;
  rolloverAmount: number;
}

// ============================================================================
// FINANCIAL GOALS
// ============================================================================

export interface FinancialGoal {
  id: string;
  type: GoalType;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  targetDate?: Date;
  autoSaveEnabled: boolean;
  autoSaveAmount?: number;
  autoSaveFrequency?: 'weekly' | 'biweekly' | 'monthly';
  linkedAccountId?: string;
  priority: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  milestones: GoalMilestone[];
  createdAt: Date;
}

export type GoalType =
  | 'emergency_fund'
  | 'debt_payoff'
  | 'savings'
  | 'investment'
  | 'retirement'
  | 'home_purchase'
  | 'education'
  | 'custom';

export interface GoalMilestone {
  percentage: number;
  reached: boolean;
  reachedAt?: Date;
}

// ============================================================================
// DEBT ANALYSIS
// ============================================================================

export interface DebtAnalysis {
  totalDebt: number;
  debtToIncomeRatio: number;
  monthlyPayments: number;
  debts: DebtItem[];
  payoffStrategies: PayoffStrategy[];
  projectedPayoffDate: Date;
  totalInterestSaved: number;
}

export interface DebtItem {
  id: string;
  name: string;
  type:
    | 'credit_card'
    | 'student_loan'
    | 'mortgage'
    | 'auto_loan'
    | 'personal_loan'
    | 'other';
  balance: number;
  interestRate: number;
  minimumPayment: number;
  linkedAccountId?: string;
}

export interface PayoffStrategy {
  name: 'avalanche' | 'snowball' | 'custom';
  description: string;
  monthsToPayoff: number;
  totalInterest: number;
  monthlyPayment: number;
  schedule: PayoffScheduleItem[];
}

export interface PayoffScheduleItem {
  month: Date;
  debtId: string;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

// ============================================================================
// PORTFOLIO SUMMARY
// ============================================================================

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  portfolios: PortfolioOverview[];
  allocation: AssetAllocation[];
  topHoldings: HoldingSummary[];
}

export interface PortfolioOverview {
  id: string;
  name: string;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  holdingsCount: number;
}

export interface AssetAllocation {
  assetType:
    | 'stock'
    | 'etf'
    | 'mutual_fund'
    | 'bond'
    | 'crypto'
    | 'cash'
    | 'other';
  value: number;
  percentage: number;
  targetPercentage?: number;
}

export interface HoldingSummary {
  symbol: string;
  name: string;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  allocation: number;
}

// ============================================================================
// CREDIT SUMMARY
// ============================================================================

export interface CreditSummary {
  currentScore: number;
  scoreChange: number;
  scoreChangeDirection: 'up' | 'down' | 'stable';
  lastUpdated: Date;
  scoreHistory: ScoreHistoryPoint[];
  factors: CreditFactor[];
  activeDisputes: number;
  resolvedDisputes: number;
  bureauScores: BureauScore[];
}

export interface ScoreHistoryPoint {
  date: Date;
  score: number;
}

export interface CreditFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  status: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface BureauScore {
  bureau: 'experian' | 'equifax' | 'transunion';
  score: number;
  lastUpdated: Date;
}

// ============================================================================
// FINANCIAL HEALTH SCORE
// ============================================================================

export interface FinancialHealthScore {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: HealthScoreBreakdown;
  trend: 'improving' | 'declining' | 'stable';
  calculatedAt: Date;
}

export interface HealthScoreBreakdown {
  savings: ComponentScore;
  debt: ComponentScore;
  spending: ComponentScore;
  credit: ComponentScore;
  insurance: ComponentScore;
}

export interface ComponentScore {
  score: number;
  weight: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: string[];
}

// ============================================================================
// AI INSIGHTS & RECOMMENDATIONS
// ============================================================================

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  actionType?: string;
  actionData?: Record<string, unknown>;
  read: boolean;
  dismissed: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export type InsightType =
  | 'spending_alert'
  | 'savings_opportunity'
  | 'bill_reduction'
  | 'debt_advice'
  | 'investment_tip'
  | 'budget_warning'
  | 'goal_milestone'
  | 'general';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'difficult';
  potentialSavings?: number;
  priority: number;
  actionSteps: string[];
  relatedGoalId?: string;
}

export type RecommendationCategory =
  | 'reduce_spending'
  | 'increase_savings'
  | 'pay_off_debt'
  | 'improve_credit'
  | 'optimize_investments'
  | 'reduce_bills'
  | 'emergency_fund';

// ============================================================================
// UNIFIED FINANCIAL CONTEXT
// ============================================================================

export interface FinancialContext {
  user: UserProfile;
  accounts: AggregatedAccounts;
  transactions: CategorizedTransactions;
  budgets: BudgetStatus[];
  goals: FinancialGoal[];
  debts: DebtAnalysis;
  investments: PortfolioSummary;
  creditProfile: CreditSummary;
  healthScore: FinancialHealthScore;
  insights: AIInsight[];
  recommendations: Recommendation[];
  lastUpdated: Date;
}

// ============================================================================
// RECURRING BILLS
// ============================================================================

export interface RecurringBill {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  dueDay?: number;
  linkedAccountId?: string;
  autoDetected: boolean;
  negotiationStatus: 'not_started' | 'in_progress' | 'completed' | 'declined';
  negotiationSavings?: number;
  lastPaidAt?: Date;
  nextDueAt?: Date;
  status: 'active' | 'paused' | 'cancelled';
}

// ============================================================================
// FINANCIAL CONTEXT OPTIONS
// ============================================================================

export interface FinancialContextOptions {
  /** Include transaction history (default: true) */
  includeTransactions?: boolean;
  /** Include investment portfolio data (default: true) */
  includeInvestments?: boolean;
  /** Include credit profile data (default: true) */
  includeCreditProfile?: boolean;
  /** Include AI insights (default: true) */
  includeInsights?: boolean;
  /** Include recommendations (default: true) */
  includeRecommendations?: boolean;
  /** Include recurring bills (default: true) */
  includeBills?: boolean;
  /** Transaction history days (default: 30) */
  transactionDays?: number;
  /** Force refresh bypassing cache (default: false) */
  forceRefresh?: boolean;
}

export const DEFAULT_CONTEXT_OPTIONS: Required<FinancialContextOptions> = {
  includeTransactions: true,
  includeInvestments: true,
  includeCreditProfile: true,
  includeInsights: true,
  includeRecommendations: true,
  includeBills: true,
  transactionDays: 30,
  forceRefresh: false,
};

// ============================================================================
// DATA QUALITY & METADATA
// ============================================================================

export interface DataQuality {
  /** Overall data quality score 0-100 */
  score: number;
  /** Whether all bank accounts are connected */
  accountsConnected: boolean;
  /** Number of connected accounts */
  connectedAccountCount: number;
  /** Last successful sync timestamp */
  lastSuccessfulSync?: Date;
  /** Data freshness status */
  freshness: 'fresh' | 'stale' | 'outdated';
  /** Missing data indicators */
  missingData: string[];
  /** Data sources contributing to context */
  dataSources: DataSource[];
}

export interface DataSource {
  name: string;
  type: 'plaid' | 'manual' | 'credit_bureau' | 'database';
  lastUpdated: Date;
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

// ============================================================================
// ENHANCED FINANCIAL CONTEXT
// ============================================================================

export interface EnhancedFinancialContext extends FinancialContext {
  /** Data quality metrics */
  dataQuality: DataQuality;
  /** Monthly summary */
  monthlySummary: MonthlySummary;
  /** Recurring bills */
  recurringBills: RecurringBill[];
  /** Financial alerts */
  alerts: FinancialAlert[];
  /** Context generation metadata */
  metadata: ContextMetadata;
}

export interface MonthlySummary {
  /** Current month's income */
  income: number;
  /** Current month's expenses */
  expenses: number;
  /** Net cash flow */
  netCashFlow: number;
  /** Savings this month */
  savings: number;
  /** Savings rate percentage */
  savingsRate: number;
  /** Comparison to previous month */
  vsLastMonth: {
    incomeChange: number;
    expenseChange: number;
    savingsChange: number;
  };
  /** Top spending categories */
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface FinancialAlert {
  id: string;
  type: 'budget_warning' | 'bill_due' | 'low_balance' | 'unusual_spending' | 'goal_milestone' | 'account_error';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  actionType?: string;
  actionData?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ContextMetadata {
  /** When the context was generated */
  generatedAt: Date;
  /** Time taken to generate in milliseconds */
  generationTimeMs: number;
  /** Whether this came from cache */
  fromCache: boolean;
  /** Cache expiration time */
  cacheExpiresAt?: Date;
  /** API version */
  apiVersion: string;
}

// ============================================================================
// FINANCIAL SUMMARY FOR QUICK ACCESS
// ============================================================================

export interface FinancialSummary {
  /** Net worth (assets - liabilities) */
  netWorth: number;
  /** Total assets */
  totalAssets: number;
  /** Total liabilities */
  totalLiabilities: number;
  /** Monthly income */
  monthlyIncome: number;
  /** Monthly expenses */
  monthlyExpenses: number;
  /** Monthly savings */
  monthlySavings: number;
  /** Savings rate percentage */
  savingsRate: number;
  /** Total debt */
  totalDebt: number;
  /** Debt-to-income ratio */
  debtToIncomeRatio: number;
  /** Credit score */
  creditScore: number;
  /** Financial health score */
  healthScore: number;
  /** Health grade */
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Number of active goals */
  activeGoals: number;
  /** Overall goal progress */
  goalProgress: number;
}
