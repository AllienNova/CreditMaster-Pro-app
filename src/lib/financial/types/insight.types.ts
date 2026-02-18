/**
 * Financial Insight Types
 *
 * Type definitions for the Smart Insights Engine
 */

// ============================================================================
// INSIGHT TYPES
// ============================================================================

export type InsightType =
  | "spending_anomaly"
  | "savings_opportunity"
  | "bill_reminder"
  | "budget_alert"
  | "income_pattern"
  | "account_optimization"
  | "credit_improvement"
  | "investment_opportunity"
  | "debt_strategy"
  | "goal_progress";

export type InsightPriority = "critical" | "high" | "medium" | "low" | "info";

export type InsightCategory =
  | "spending"
  | "savings"
  | "bills"
  | "budget"
  | "income"
  | "accounts"
  | "credit"
  | "investments"
  | "debt"
  | "goals";

export type InsightImpact = "positive" | "negative" | "neutral" | "warning";

// ============================================================================
// CORE INSIGHT INTERFACE
// ============================================================================

export interface FinancialInsight {
  id: string;
  userId: string;
  type: InsightType;
  category: InsightCategory;
  priority: InsightPriority;
  impact: InsightImpact;

  // Content
  title: string;
  description: string;
  details?: string;

  // AI-generated content
  aiSummary?: string;
  aiRecommendation?: string;

  // Metrics
  amount?: number;
  percentage?: number;
  comparisonValue?: number;
  trend?: "up" | "down" | "stable";

  // Related entities
  relatedAccountIds?: string[];
  relatedTransactionIds?: string[];
  relatedBillIds?: string[];
  relatedGoalIds?: string[];

  // Actions
  actions?: InsightAction[];
  dismissed: boolean;
  dismissedAt?: Date;
  actionTaken?: string;
  actionTakenAt?: Date;

  // Metadata
  createdAt: Date;
  expiresAt?: Date;
  confidence: number; // 0-100
  dataSource: string[];
}

export interface InsightAction {
  id: string;
  label: string;
  type: "link" | "button" | "dismiss" | "snooze";
  href?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

export interface InsightGenerationOptions {
  types?: InsightType[];
  categories?: InsightCategory[];
  minPriority?: InsightPriority;
  limit?: number;
  includeAI?: boolean;
  includeDismissed?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface InsightGenerationResult {
  insights: FinancialInsight[];
  generatedAt: Date;
  processingTimeMs: number;
  aiModelUsed?: string;
  dataSourcesUsed: string[];
}

// ============================================================================
// SPECIFIC INSIGHT TYPES
// ============================================================================

export interface SpendingAnomalyInsight extends FinancialInsight {
  type: "spending_anomaly";
  anomalyType:
    | "unusual_large"
    | "unusual_merchant"
    | "unusual_category"
    | "duplicate";
  transactionId: string;
  merchantName: string;
  expectedAmount?: number;
}

export interface SavingsOpportunityInsight extends FinancialInsight {
  type: "savings_opportunity";
  opportunityType:
    | "subscription_cancel"
    | "negotiate_bill"
    | "switch_provider"
    | "reduce_spending";
  potentialSavings: number;
  timeframe: "monthly" | "yearly";
}

export interface BillReminderInsight extends FinancialInsight {
  type: "bill_reminder";
  billId: string;
  billName: string;
  dueDate: Date;
  amount: number;
  daysUntilDue: number;
}

export interface BudgetAlertInsight extends FinancialInsight {
  type: "budget_alert";
  budgetId: string;
  budgetCategory: string;
  budgetedAmount: number;
  spentAmount: number;
  percentUsed: number;
  daysRemaining: number;
}

export interface IncomePatternInsight extends FinancialInsight {
  type: "income_pattern";
  patternType: "irregular" | "declining" | "increasing" | "new_source";
  averageIncome: number;
  currentIncome: number;
}

export interface AccountOptimizationInsight extends FinancialInsight {
  type: "account_optimization";
  optimizationType:
    | "high_fees"
    | "low_interest"
    | "better_rewards"
    | "consolidation";
  accountId: string;
  potentialBenefit: number;
}
