/**
 * Savings Automation Types
 * Types for smart savings rules, goals, and automation
 */

// Savings Rule Types
export type SavingsRuleType =
  | "round_up"
  | "percentage"
  | "fixed"
  | "surplus"
  | "goal_based";
export type SavingsRuleFrequency =
  | "per_transaction"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";
export type SavingsRuleStatus = "active" | "paused" | "completed" | "cancelled";

// Savings Goal Categories
export type SavingsGoalCategory =
  | "emergency_fund"
  | "vacation"
  | "major_purchase"
  | "education"
  | "retirement"
  | "home_down_payment"
  | "debt_payoff"
  | "custom";

export type SavingsGoalStatus = "active" | "paused" | "completed" | "cancelled";

// Savings Rule Interface
export interface SavingsRule {
  id: string;
  userId: string;
  name: string;
  type: SavingsRuleType;
  frequency: SavingsRuleFrequency;
  status: SavingsRuleStatus;

  // Rule configuration
  config: SavingsRuleConfig;

  // Linked goal (optional)
  goalId?: string;

  // Source and destination accounts
  sourceAccountId?: string;
  destinationAccountId?: string;

  // Statistics
  totalSaved: number;
  transferCount: number;
  lastTriggeredAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Rule Configuration by Type
export interface SavingsRuleConfig {
  // Round-up config
  roundUpTo?: 1 | 5 | 10; // Round up to nearest $1, $5, or $10
  roundUpMultiplier?: number; // 1x, 2x, 3x multiplier

  // Percentage config
  percentageOfIncome?: number; // 5%, 10%, 20%, etc.
  percentageOfTransaction?: number;

  // Fixed amount config
  fixedAmount?: number;

  // Surplus config (save leftover at end of period)
  surplusThreshold?: number; // Minimum surplus to trigger
  surplusPercentage?: number; // Percentage of surplus to save

  // Goal-based config
  targetAmount?: number;
  targetDate?: Date;

  // Limits
  maxPerTransaction?: number;
  maxPerDay?: number;
  maxPerMonth?: number;
  minBalance?: number; // Don't save if balance falls below this

  // Triggers
  triggerCategories?: string[]; // Only trigger on specific spending categories
  excludeCategories?: string[]; // Exclude specific categories
  triggerMerchants?: string[];
  excludeMerchants?: string[];
}

// Savings Goal Interface
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  category: SavingsGoalCategory;
  status: SavingsGoalStatus;

  // Amounts
  targetAmount: number;
  currentAmount: number;

  // Timeline
  targetDate?: Date;
  startDate: Date;
  completedAt?: Date;

  // Automation
  autoSaveEnabled: boolean;
  linkedRuleIds: string[];

  // Priority (1 = highest)
  priority: number;

  // Progress tracking
  progressPercentage: number;
  projectedCompletionDate?: Date;
  onTrack: boolean;

  // Contributions
  contributions: SavingsContribution[];

  // Metadata
  icon?: string;
  color?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Savings Contribution
export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  source: "manual" | "auto_rule" | "round_up" | "transfer";
  ruleId?: string;
  transactionId?: string;
  note?: string;
  createdAt: Date;
}

// Savings Transfer (executed auto-save)
export interface SavingsTransfer {
  id: string;
  userId: string;
  ruleId: string;
  goalId?: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  sourceAccountId: string;
  destinationAccountId: string;
  triggerType: "transaction" | "scheduled" | "manual";
  triggerTransactionId?: string;
  errorMessage?: string;
  executedAt?: Date;
  createdAt: Date;
}

// Savings Summary
export interface SavingsSummary {
  totalSaved: number;
  totalSavedThisMonth: number;
  totalSavedThisYear: number;
  savingsRate: number;
  activeRules: number;
  activeGoals: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  projectedMonthlySavings: number;
  roundUpSavings: number;
  autoSaveSavings: number;
}

// Savings Insight
export interface SavingsInsight {
  type: "opportunity" | "achievement" | "warning" | "tip";
  title: string;
  description: string;
  impact?: number;
  actionable: boolean;
  action?: {
    label: string;
    type: "create_rule" | "adjust_rule" | "add_contribution" | "view_goal";
    data?: Record<string, unknown>;
  };
}

// Savings Recommendation
export interface SavingsRecommendation {
  id: string;
  type: "new_rule" | "increase_savings" | "new_goal" | "optimize_rule";
  title: string;
  description: string;
  potentialSavings: number;
  confidence: number;
  suggestedRule?: Partial<SavingsRule>;
  suggestedGoal?: Partial<SavingsGoal>;
}

// Create/Update DTOs
export interface CreateSavingsRuleInput {
  name: string;
  type: SavingsRuleType;
  frequency: SavingsRuleFrequency;
  config: SavingsRuleConfig;
  goalId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
}

export interface UpdateSavingsRuleInput {
  name?: string;
  status?: SavingsRuleStatus;
  config?: Partial<SavingsRuleConfig>;
  goalId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
}

export interface CreateSavingsGoalInput {
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  targetDate?: Date;
  priority?: number;
  autoSaveEnabled?: boolean;
  icon?: string;
  color?: string;
  notes?: string;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  category?: SavingsGoalCategory;
  status?: SavingsGoalStatus;
  targetAmount?: number;
  targetDate?: Date;
  priority?: number;
  autoSaveEnabled?: boolean;
  icon?: string;
  color?: string;
  notes?: string;
}

export interface AddContributionInput {
  goalId: string;
  amount: number;
  source?: "manual" | "transfer" | "auto_rule" | "round_up";
  note?: string;
}

// ============================================================================
// SAVINGS OPTIMIZER TYPES (Phase 2.2)
// ============================================================================

// Recurring Charge Detection
export interface RecurringCharge {
  id: string;
  merchantName: string;
  category: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  dayOfMonth?: number;
  dayOfWeek?: number;
  confidence: number; // 0-100
  transactionCount: number;
  firstDetectedAt: Date;
  lastChargeAt: Date;
  nextExpectedAt?: Date;
  variance: number; // Amount variance
  isSubscription: boolean;
  subscriptionType?:
    | "streaming"
    | "software"
    | "membership"
    | "utility"
    | "insurance"
    | "other";
  cancellable: boolean;
  importance?: "essential" | "useful" | "optional" | "unnecessary";
  transactions: Array<{
    id: string;
    date: Date;
    amount: number;
  }>;
}

// Subscription Recommendation
export interface SubscriptionRecommendation {
  id: string;
  recurringChargeId: string;
  merchantName: string;
  monthlyAmount: number;
  annualAmount: number;
  type: "cancel" | "downgrade" | "consolidate" | "negotiate";
  reason: string;
  confidence: number; // 0-100
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  importance: "essential" | "useful" | "optional" | "unnecessary";
  usageIndicators?: {
    lastUsed?: Date;
    usageFrequency?: "daily" | "weekly" | "monthly" | "rarely" | "never";
    duplicateOf?: string; // Merchant name of duplicate service
  };
  alternatives?: Array<{
    name: string;
    monthlyCost: number;
    savings: number;
  }>;
  aiGenerated: boolean;
}

// Savings Opportunity
export interface SavingsOpportunity {
  id: string;
  type:
    | "subscription"
    | "spending_reduction"
    | "category_optimization"
    | "recurring_charge"
    | "one_time";
  category: string;
  title: string;
  description: string;
  currentMonthlySpending: number;
  recommendedMonthlySpending: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  confidence: number; // 0-100
  difficulty: "easy" | "medium" | "hard";
  impact: "low" | "medium" | "high";
  actionable: boolean;
  actions: Array<{
    label: string;
    type: "cancel" | "reduce" | "switch" | "negotiate" | "automate";
    data?: Record<string, unknown>;
  }>;
  aiGenerated: boolean;
}

// Savings Analysis
export interface SavingsAnalysis {
  userId: string;
  period: "monthly" | "quarterly" | "yearly";
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalSpending: number;
    essentialSpending: number;
    discretionarySpending: number;
    subscriptionSpending: number;
    recurringCharges: number;
    potentialMonthlySavings: number;
    potentialAnnualSavings: number;
    savingsRate: number; // Current savings as % of income
    recommendedSavingsRate: number; // Recommended savings rate
  };
  opportunities: SavingsOpportunity[];
  recurringCharges: RecurringCharge[];
  subscriptionRecommendations: SubscriptionRecommendation[];
  categoryBreakdown: Array<{
    category: string;
    currentSpending: number;
    recommendedSpending: number;
    potentialSavings: number;
    percentOfTotal: number;
  }>;
  trends: {
    spendingTrend: "increasing" | "decreasing" | "stable";
    savingsTrend: "improving" | "declining" | "stable";
    topSpendingCategories: Array<{
      category: string;
      amount: number;
      percentChange: number;
    }>;
  };
  aiInsights: string[];
  generatedAt: Date;
}

// Savings Goal Recommendation (AI-generated)
export interface SavingsGoalRecommendation {
  id: string;
  type:
    | "emergency_fund"
    | "vacation"
    | "major_purchase"
    | "debt_payoff"
    | "retirement"
    | "custom";
  title: string;
  description: string;
  recommendedAmount: number;
  recommendedMonthlyContribution: number;
  targetDate?: Date;
  priority: number; // 1 = highest
  reasoning: string;
  confidence: number; // 0-100
  basedOn: Array<{
    factor: string;
    value: number | string;
  }>;
  suggestedRule?: Partial<SavingsRule>;
  aiGenerated: boolean;
}

// Potential Savings Summary
export interface PotentialSavingsSummary {
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  breakdown: {
    subscriptions: number;
    categoryOptimization: number;
    recurringCharges: number;
    oneTimeOpportunities: number;
  };
  topOpportunities: SavingsOpportunity[];
  implementationDifficulty: "easy" | "medium" | "hard";
  estimatedTimeToImplement: string; // e.g., "2 hours", "1 week"
}

// Round-up calculation result
export interface RoundUpCalculation {
  originalAmount: number;
  roundedAmount: number;
  roundUpAmount: number;
  multipliedAmount: number;
}
