/**
 * Budget Types
 *
 * Comprehensive type definitions for the Smart Budgeting Engine
 * including budget categories, rules, alerts, and analytics.
 */

// ============================================================================
// BUDGET PERIODS
// ============================================================================

export type BudgetPeriod =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type BudgetStatus = 'on_track' | 'warning' | 'over_budget' | 'inactive';

// ============================================================================
// BUDGET CATEGORIES
// ============================================================================

export const BUDGET_CATEGORIES = {
  // Essential
  HOUSING: 'housing',
  UTILITIES: 'utilities',
  GROCERIES: 'groceries',
  TRANSPORTATION: 'transportation',
  INSURANCE: 'insurance',
  HEALTHCARE: 'healthcare',
  DEBT_PAYMENTS: 'debt_payments',
  // Lifestyle
  DINING_OUT: 'dining_out',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  PERSONAL_CARE: 'personal_care',
  FITNESS: 'fitness',
  SUBSCRIPTIONS: 'subscriptions',
  // Savings & Goals
  SAVINGS: 'savings',
  INVESTMENTS: 'investments',
  EMERGENCY_FUND: 'emergency_fund',
  // Other
  EDUCATION: 'education',
  TRAVEL: 'travel',
  GIFTS: 'gifts',
  PETS: 'pets',
  CHILDCARE: 'childcare',
  OTHER: 'other',
} as const;

export type BudgetCategoryKey = keyof typeof BUDGET_CATEGORIES;
export type BudgetCategoryValue = (typeof BUDGET_CATEGORIES)[BudgetCategoryKey];

export const CATEGORY_DISPLAY_NAMES: Record<BudgetCategoryValue, string> = {
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

export interface BudgetCategory {
  key: BudgetCategoryKey;
  value: BudgetCategoryValue;
  displayName: string;
  icon: string;
  color: string;
  isEssential: boolean;
  defaultAllocation?: number; // Percentage of income
}

// ============================================================================
// BUDGET CORE
// ============================================================================

export interface Budget {
  id: string;
  userId: string;
  name: string;
  category: BudgetCategoryValue;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  period: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;
  status: BudgetStatus;
  percentUsed: number;
  rolloverEnabled: boolean;
  rolloverAmount: number;
  isActive: boolean;
  alertThreshold: number; // Percentage (e.g., 80 = alert at 80% spent)
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetInput {
  userId: string;
  name: string;
  category: BudgetCategoryValue;
  budgetedAmount: number;
  period: BudgetPeriod;
  rolloverEnabled?: boolean;
  alertThreshold?: number;
}

export interface UpdateBudgetInput {
  name?: string;
  budgetedAmount?: number;
  period?: BudgetPeriod;
  rolloverEnabled?: boolean;
  alertThreshold?: number;
  isActive?: boolean;
}

// ============================================================================
// BUDGET RULES
// ============================================================================

export type BudgetRuleType =
  | 'percentage_of_income'
  | 'fixed_amount'
  | 'category_limit'
  | 'merchant_limit'
  | 'time_based';

export type BudgetRuleAction = 'alert' | 'block' | 'suggest' | 'auto_save';

export interface BudgetRule {
  id: string;
  userId: string;
  budgetId?: string;
  name: string;
  type: BudgetRuleType;
  condition: BudgetRuleCondition;
  action: BudgetRuleAction;
  isActive: boolean;
  triggerCount: number;
  lastTriggered?: Date;
  createdAt: Date;
}

export interface BudgetRuleCondition {
  threshold?: number;
  percentage?: number;
  categories?: BudgetCategoryValue[];
  merchants?: string[];
  timeRestriction?: TimeRestriction;
}

export interface TimeRestriction {
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

// ============================================================================
// BUDGET ALERTS
// ============================================================================

export type BudgetAlertType =
  | 'threshold_warning'
  | 'over_budget'
  | 'unusual_spending'
  | 'goal_at_risk'
  | 'savings_opportunity'
  | 'period_summary';

export type BudgetAlertSeverity = 'info' | 'warning' | 'critical';

export interface BudgetAlert {
  id: string;
  userId: string;
  budgetId?: string;
  type: BudgetAlertType;
  severity: BudgetAlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  dismissed: boolean;
  createdAt: Date;
}

export interface CreateBudgetAlertInput {
  userId: string;
  budgetId?: string;
  type: BudgetAlertType;
  severity: BudgetAlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// BUDGET SUMMARY & ANALYTICS
// ============================================================================

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentUsed: number;
  budgetsByStatus: BudgetStatusCount;
  topOverspentCategories: CategorySpendingSummary[];
  topUnderBudgetCategories: CategorySpendingSummary[];
  periodSummary: PeriodSummary;
  projectedEndOfPeriod: ProjectedSpending;
}

export interface BudgetStatusCount {
  onTrack: number;
  warning: number;
  overBudget: number;
  inactive: number;
}

export interface CategorySpendingSummary {
  category: BudgetCategoryValue;
  categoryDisplayName: string;
  budgetedAmount: number;
  spentAmount: number;
  percentUsed: number;
  variance: number;
}

export interface PeriodSummary {
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  daysElapsed: number;
  daysRemaining: number;
  percentOfPeriodElapsed: number;
}

export interface ProjectedSpending {
  projectedTotal: number;
  projectedOverage: number;
  projectedSavings: number;
  confidence: number;
}

// ============================================================================
// BUDGET RECOMMENDATIONS
// ============================================================================

export interface BudgetRecommendation {
  id: string;
  type: BudgetRecommendationType;
  category?: BudgetCategoryValue;
  currentAmount: number;
  suggestedAmount: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  potentialSavings?: number;
  actionSteps: string[];
}

export type BudgetRecommendationType =
  | 'increase_budget'
  | 'decrease_budget'
  | 'create_budget'
  | 'consolidate_subscriptions'
  | 'reduce_dining'
  | 'optimize_utilities'
  | 'renegotiate_bills';

// ============================================================================
// BUDGET HISTORY & TRENDS
// ============================================================================

export interface BudgetHistoryEntry {
  periodStart: Date;
  periodEnd: Date;
  budgetedAmount: number;
  spentAmount: number;
  percentUsed: number;
  status: BudgetStatus;
}

export interface BudgetTrend {
  category: BudgetCategoryValue;
  history: BudgetHistoryEntry[];
  averageSpent: number;
  averageBudgeted: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
}

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface BudgetRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  period: string;
  period_start: string;
  period_end: string;
  rollover_enabled: boolean;
  rollover_amount: number;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetRuleRow {
  id: string;
  user_id: string;
  budget_id: string | null;
  name: string;
  type: string;
  condition: Record<string, unknown>;
  action: string;
  is_active: boolean;
  trigger_count: number;
  last_triggered: string | null;
  created_at: string;
}

export interface BudgetAlertRow {
  id: string;
  user_id: string;
  budget_id: string | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}
