/**
 * AI Financial Coach Types for Mobile App
 */

// Recommendation Types
export type RecommendationType =
  | "savings_strategy"
  | "debt_payoff"
  | "investment_suggestion"
  | "budget_adjustment"
  | "account_optimization"
  | "credit_improvement"
  | "insurance_needs"
  | "tax_optimization";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type RecommendationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "dismissed"
  | "expired";

export interface RecommendationStep {
  id: string;
  order: number;
  title: string;
  description: string;
  actionType: "manual" | "automated" | "link" | "in_app";
  actionUrl?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  title: string;
  description: string;
  rationale: string;
  aiInsight?: string;
  potentialSavings?: number;
  potentialReturn?: number;
  riskLevel: "low" | "medium" | "high";
  timeframe: "immediate" | "short_term" | "medium_term" | "long_term";
  estimatedEffort: "minimal" | "moderate" | "significant";
  actionSteps: RecommendationStep[];
  confidenceScore: number;
  personalizedFactors: string[];
  createdAt: string;
  expiresAt?: string;
}

// Goal Types
export type GoalType =
  | "emergency_fund"
  | "debt_payoff"
  | "savings"
  | "investment"
  | "major_purchase"
  | "retirement"
  | "education"
  | "vacation"
  | "home_down_payment"
  | "custom";

export type GoalStatus =
  | "not_started"
  | "in_progress"
  | "on_track"
  | "behind"
  | "ahead"
  | "completed"
  | "paused";

export interface GoalMilestone {
  id: string;
  name: string;
  targetAmount: number;
  targetPercentage: number;
  achievedDate?: string;
  isAchieved: boolean;
  celebrationMessage?: string;
}

export interface GoalAdjustment {
  type: "increase_contribution" | "extend_timeline" | "reduce_target" | "pause";
  reason: string;
  suggestedValue?: number;
  impact: string;
}

export interface FinancialGoalPlan {
  id: string;
  userId: string;
  type: GoalType;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  startingAmount: number;
  targetDate: string;
  startDate: string;
  projectedCompletionDate?: string;
  progress: number;
  status: GoalStatus;
  milestones: GoalMilestone[];
  monthlyContribution: number;
  suggestedContribution: number;
  contributionFrequency: "weekly" | "biweekly" | "monthly";
  linkedAccountId?: string;
  autoSaveEnabled: boolean;
  aiRecommendations: string[];
  adjustmentSuggestions: GoalAdjustment[];
  riskFactors: string[];
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalScenario {
  id: string;
  name: string;
  monthlyContribution: number;
  projectedCompletionDate: string;
  totalContributions: number;
  probabilityOfSuccess: number;
  assumptions: string[];
}

export interface GoalSimulation {
  goalId: string;
  scenarios: GoalScenario[];
  recommendedScenario: string;
}

// Budget Types
export interface BudgetCategorySummary {
  category: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  percentUsed: number;
  trend: "increasing" | "decreasing" | "stable";
  benchmarkComparison?: number;
}

export interface BudgetOptimization {
  id: string;
  category: string;
  type: "reduce" | "increase" | "reallocate" | "eliminate";
  currentAmount: number;
  suggestedAmount: number;
  potentialSavings: number;
  reason: string;
  difficulty: "easy" | "moderate" | "hard";
  priorityScore: number;
  actionSteps: string[];
}

export interface BudgetOptimizationResult {
  userId: string;
  generatedAt: string;
  currentBudget: BudgetCategorySummary[];
  totalBudgeted: number;
  totalSpent: number;
  totalIncome: number;
  optimizations: BudgetOptimization[];
  potentialMonthlySavings: number;
  aiAnalysis: string;
  keyInsights: string[];
}

// Debt Types
export interface DebtStrategyPlan {
  id: string;
  strategy: "avalanche" | "snowball" | "hybrid" | "consolidation";
  name: string;
  description: string;
  payoffDate: string;
  totalMonths: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
  interestSaved: number;
  monthsSaved: number;
  requiredMonthlyPayment: number;
  extraPaymentNeeded: number;
  advantages: string[];
  disadvantages: string[];
  quickWins: number;
  motivationScore: number;
}

export interface RefinancingOpportunity {
  debtId: string;
  debtName: string;
  currentRate: number;
  potentialRate: number;
  currentBalance: number;
  monthlySavings: number;
  totalSavings: number;
  lenderType: string;
  requirements: string[];
  considerations: string[];
}

export interface DebtStrategyAnalysis {
  userId: string;
  generatedAt: string;
  totalDebt: number;
  debtCount: number;
  averageInterestRate: number;
  monthlyPayments: number;
  debtToIncomeRatio: number;
  strategies: DebtStrategyPlan[];
  recommendedStrategy: string;
  recommendationReason: string;
  refinancingOpportunities: RefinancingOpportunity[];
  aiInsights: string[];
  motivationalTips: string[];
  warningFlags: string[];
}

// Dashboard Types
export interface CoachDashboard {
  userId: string;
  generatedAt: string;
  healthScore: number;
  healthTrend: "improving" | "stable" | "declining";
  topRecommendations: Recommendation[];
  pendingActionsCount: number;
  activeGoals: number;
  goalsOnTrack: number;
  nextMilestone?: GoalMilestone & { goalName: string };
  budgetHealth: "healthy" | "warning" | "critical";
  monthlyUnallocated: number;
  potentialSavings: number;
  debtFreeDate?: string;
  monthsToDebtFree?: number;
  currentDebtProgress: number;
  coachMessage: string;
  focusArea: string;
}
