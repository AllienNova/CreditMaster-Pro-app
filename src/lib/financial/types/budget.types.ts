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
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type BudgetStatus = "on_track" | "warning" | "over_budget" | "inactive";

// ============================================================================
// BUDGET CATEGORIES
// ============================================================================

export const BUDGET_CATEGORIES = {
  // Essential
  HOUSING: "housing",
  UTILITIES: "utilities",
  GROCERIES: "groceries",
  TRANSPORTATION: "transportation",
  INSURANCE: "insurance",
  HEALTHCARE: "healthcare",
  DEBT_PAYMENTS: "debt_payments",
  // Lifestyle
  DINING_OUT: "dining_out",
  ENTERTAINMENT: "entertainment",
  SHOPPING: "shopping",
  PERSONAL_CARE: "personal_care",
  FITNESS: "fitness",
  SUBSCRIPTIONS: "subscriptions",
  // Savings & Goals
  SAVINGS: "savings",
  INVESTMENTS: "investments",
  EMERGENCY_FUND: "emergency_fund",
  // Other
  EDUCATION: "education",
  TRAVEL: "travel",
  GIFTS: "gifts",
  PETS: "pets",
  CHILDCARE: "childcare",
  OTHER: "other",
} as const;

export type BudgetCategoryKey = keyof typeof BUDGET_CATEGORIES;
export type BudgetCategoryValue = (typeof BUDGET_CATEGORIES)[BudgetCategoryKey];

export const CATEGORY_DISPLAY_NAMES: Record<BudgetCategoryValue, string> = {
  housing: "Housing",
  utilities: "Utilities",
  groceries: "Groceries",
  transportation: "Transportation",
  insurance: "Insurance",
  healthcare: "Healthcare",
  debt_payments: "Debt Payments",
  dining_out: "Dining Out",
  entertainment: "Entertainment",
  shopping: "Shopping",
  personal_care: "Personal Care",
  fitness: "Fitness",
  subscriptions: "Subscriptions",
  savings: "Savings",
  investments: "Investments",
  emergency_fund: "Emergency Fund",
  education: "Education",
  travel: "Travel",
  gifts: "Gifts",
  pets: "Pets",
  childcare: "Childcare",
  other: "Other",
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
// BUDGET RULES (Enhanced for Smart Budget Engine)
// ============================================================================

export type BudgetRuleType =
  | "percentage_of_income"
  | "fixed_amount"
  | "category_limit"
  | "merchant_limit"
  | "time_based"
  | "auto_adjust" // NEW: AI-powered automatic adjustments
  | "rollover" // NEW: Rollover unused budget
  | "transfer"; // NEW: Transfer between categories

export type BudgetRuleAction =
  | "alert"
  | "block"
  | "suggest"
  | "auto_save"
  | "auto_adjust" // NEW: Automatically adjust budget
  | "transfer" // NEW: Transfer funds
  | "notify"; // NEW: Send notification

export interface BudgetRule {
  id: string;
  userId: string;
  budgetId?: string;
  name: string;
  type: BudgetRuleType;
  condition: BudgetRuleCondition;
  action: BudgetRuleAction;
  priority: number; // NEW: Rule priority (1-10, higher = more important)
  isActive: boolean;
  triggerCount: number;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt?: Date; // NEW
}

export interface BudgetRuleCondition {
  threshold?: number;
  percentage?: number;
  categories?: BudgetCategoryValue[];
  merchants?: string[];
  timeRestriction?: TimeRestriction;
  minAmount?: number; // NEW: Minimum transaction amount
  maxAmount?: number; // NEW: Maximum transaction amount
}

export interface TimeRestriction {
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

// ============================================================================
// BUDGET ALERTS (Enhanced for Smart Budget Engine)
// ============================================================================

export type BudgetAlertType =
  | "threshold_warning"
  | "over_budget"
  | "unusual_spending"
  | "goal_at_risk"
  | "savings_opportunity"
  | "period_summary"
  | "overspend" // NEW: Category overspending
  | "underspend" // NEW: Category underspending
  | "category_limit" // NEW: Category limit reached
  | "total_limit"; // NEW: Total budget limit reached

export type BudgetAlertSeverity = "info" | "warning" | "critical";

export interface BudgetAlert {
  id: string;
  userId: string;
  budgetId?: string;
  category?: BudgetCategoryValue; // NEW: Associated category
  type: BudgetAlertType;
  severity: BudgetAlertSeverity;
  threshold?: number; // NEW: Alert threshold percentage
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isActive?: boolean; // NEW: Whether alert is active
  read: boolean;
  dismissed: boolean;
  createdAt: Date;
}

export interface CreateBudgetAlertInput {
  userId: string;
  budgetId?: string;
  category?: BudgetCategoryValue; // NEW
  type: BudgetAlertType;
  severity: BudgetAlertSeverity;
  threshold?: number; // NEW
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isActive?: boolean; // NEW
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
  userId?: string;
  type: BudgetRecommendationType;
  category?: BudgetCategoryValue;
  currentAmount: number;
  suggestedAmount: number;
  reason: string;
  confidence?: number; // 0-100
  impact:
    | {
        monthlySavings?: number;
        debtReduction?: number;
        goalProgress?: number;
        riskLevel?: "low" | "medium" | "high";
      }
    | "high"
    | "medium"
    | "low"; // Support both formats for backward compatibility
  potentialSavings?: number;
  actionSteps?: string[];
  createdAt?: Date;
  appliedAt?: Date;
  dismissed?: boolean;
}

export type BudgetRecommendationType =
  | "increase_budget"
  | "decrease_budget"
  | "create_budget"
  | "consolidate_subscriptions"
  | "reduce_dining"
  | "optimize_utilities"
  | "renegotiate_bills";

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
  trend: "increasing" | "decreasing" | "stable";
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

// ============================================================================
// SMART BUDGET ENGINE TYPES (Phase 2.1)
// ============================================================================

/**
 * Category Type Classification
 * Used to classify budget categories for intelligent allocation
 */
export type CategoryType =
  | "ESSENTIAL" // Must-have expenses (housing, utilities, groceries)
  | "DISCRETIONARY" // Optional expenses (entertainment, dining out)
  | "SAVINGS" // Savings and emergency fund
  | "DEBT" // Debt payments
  | "INVESTMENT"; // Investment contributions

/**
 * Alert Type for Smart Budget
 */
export type AlertType =
  | "OVERSPEND" // Category overspending
  | "UNDERSPEND" // Category underspending
  | "CATEGORY_LIMIT" // Category limit reached
  | "TOTAL_LIMIT"; // Total budget limit reached

/**
 * Rule Type for Smart Budget Automation
 */
export type RuleType =
  | "AUTO_ADJUST" // Automatically adjust budget based on spending patterns
  | "ROLLOVER" // Roll over unused budget to next period
  | "TRANSFER" // Transfer funds between categories
  | "ALERT"; // Send alerts when conditions are met

/**
 * Smart Budget - AI-generated budget with recommendations
 */
export interface SmartBudget {
  id: string;
  userId: string;
  name: string;
  period: BudgetPeriod;
  totalAmount: number;
  categories: SmartBudgetCategory[];
  rules: BudgetRule[];
  createdAt: Date;
  updatedAt: Date;
  aiGenerated: boolean; // Whether this budget was AI-generated
  confidence: number; // AI confidence score (0-100)
  metadata?: {
    incomeSource?: string;
    monthlyIncome?: number;
    dependents?: number;
    location?: string;
    preferences?: BudgetPreferences;
    budgetType?: "standard" | "zero-based" | "50-30-20";
    priorities?: {
      essentials?: number;
      debtPayoff?: number;
      savings?: number;
      lifestyle?: number;
    };
    lastRebalanced?: string;
  };
}

/**
 * Smart Budget Category with AI-enhanced features
 */
export interface SmartBudgetCategory {
  id: string;
  budgetId: string;
  name: string;
  type: CategoryType;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  alerts: BudgetAlert[];
  rules: BudgetRule[];
  trend?: {
    direction: "up" | "down" | "stable";
    percentChange: number;
    comparedToPreviousPeriod: boolean;
  };
  aiRecommendation?: {
    suggestedAmount: number;
    reason: string;
    confidence: number;
  };
}

/**
 * Budget Preferences for AI generation
 */
export interface BudgetPreferences {
  monthlyIncome: number;
  savingsGoalPercentage?: number; // Default: 20%
  debtPaymentPriority?: "aggressive" | "moderate" | "minimum"; // Default: moderate
  lifestylePreference?: "frugal" | "balanced" | "comfortable"; // Default: balanced
  essentialCategories?: BudgetCategoryValue[]; // Categories user considers essential
  excludeCategories?: BudgetCategoryValue[]; // Categories to exclude
  customRules?: {
    category: BudgetCategoryValue;
    minAmount?: number;
    maxAmount?: number;
    percentage?: number;
  }[];
}

/**
 * Budget Analysis - Compare planned vs actual
 */
export interface BudgetAnalysis {
  userId: string;
  period: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    percentUsed: number;
    variance: number; // Difference between budgeted and spent
    variancePercent: number;
  };
  categoryAnalysis: CategoryAnalysis[];
  trends: {
    spendingTrend: "increasing" | "decreasing" | "stable";
    topOverspentCategories: CategoryAnalysis[];
    topUnderspentCategories: CategoryAnalysis[];
    anomalies: SpendingAnomaly[];
  };
  recommendations: BudgetRecommendation[];
}

/**
 * Category Analysis
 */
export interface CategoryAnalysis {
  category: BudgetCategoryValue;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  variance: number;
  variancePercent: number;
  status: "under_budget" | "on_track" | "near_limit" | "over_budget";
  transactionCount: number;
  averageTransactionAmount: number;
}

/**
 * Spending Anomaly Detection
 */
export interface SpendingAnomaly {
  category: BudgetCategoryValue;
  type: "unusual_spike" | "unusual_drop" | "new_merchant" | "large_transaction";
  description: string;
  amount: number;
  date: Date;
  severity: "low" | "medium" | "high";
  suggestion?: string;
}

/**
 * Month-End Prediction
 */
export interface MonthEndPrediction {
  userId: string;
  currentDate: Date;
  monthEndDate: Date;
  daysRemaining: number;
  predictions: {
    totalBudgeted: number;
    projectedSpending: number;
    projectedRemaining: number;
    projectedOverspend: number;
    confidence: number; // 0-100
  };
  categoryPredictions: CategoryPrediction[];
  warnings: PredictionWarning[];
  suggestions: string[];
}

/**
 * Category Prediction
 */
export interface CategoryPrediction {
  category: BudgetCategoryValue;
  budgeted: number;
  currentSpent: number;
  projectedSpent: number;
  projectedRemaining: number;
  likelihood: "very_likely" | "likely" | "possible" | "unlikely";
  basedOn: "historical_average" | "current_trajectory" | "seasonal_pattern";
}

/**
 * Prediction Warning
 */
export interface PredictionWarning {
  category: BudgetCategoryValue;
  type: "overspend_risk" | "underspend_opportunity" | "unusual_pattern";
  severity: "low" | "medium" | "high";
  message: string;
  suggestedAction: string;
  potentialImpact: number; // Dollar amount
}

/**
 * Category Correction for ML Training
 */
export interface CategoryCorrection {
  transactionId: string;
  userId: string;
  originalCategory: string;
  correctedCategory: BudgetCategoryValue;
  merchantName: string;
  amount: number;
  date: Date;
  confidence?: number;
}

/**
 * Category Suggestion from AI
 */
export interface CategorySuggestion {
  category: BudgetCategoryValue;
  confidence: number; // 0-100
  alternativeCategories?: {
    category: BudgetCategoryValue;
    confidence: number;
  }[];
  reason?: string;
}

/**
 * Categorized Transaction
 */
export interface CategorizedTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  merchantName: string;
  description?: string;
  date: Date;
  category: BudgetCategoryValue;
  categoryConfidence: number; // 0-100
  aiCategorized: boolean;
  userCorrected?: boolean;
  originalCategory?: string;
}
