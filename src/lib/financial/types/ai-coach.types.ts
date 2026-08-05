/**
 * AI Financial Coach Types
 *
 * Comprehensive type definitions for the AI Financial Coach system including:
 * - Recommendation Engine
 * - Goal Planning System
 * - Budget Optimizer
 * - Debt Strategy Engine
 */

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

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

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  status: RecommendationStatus;

  // Content
  title: string;
  description: string;
  rationale: string;
  aiInsight?: string;

  // Impact metrics
  potentialSavings?: number;
  potentialReturn?: number;
  riskLevel: "low" | "medium" | "high";
  timeframe: "immediate" | "short_term" | "medium_term" | "long_term";
  estimatedEffort: "minimal" | "moderate" | "significant";

  // Action items
  actionSteps: RecommendationStep[];
  relatedResources?: RelatedResource[];

  // Personalization
  confidenceScore: number; // 0-100
  personalizedFactors: string[];

  // Tracking
  createdAt: Date;
  expiresAt?: Date;
  viewedAt?: Date;
  actionedAt?: Date;
  completedAt?: Date;
}

export interface RecommendationStep {
  id: string;
  order: number;
  title: string;
  description: string;
  actionType: "manual" | "automated" | "link" | "in_app";
  actionUrl?: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface RelatedResource {
  type: "article" | "tool" | "calculator" | "external_link";
  title: string;
  url: string;
  description?: string;
}

// ============================================================================
// GOAL PLANNING TYPES
// ============================================================================

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

export interface FinancialGoalPlan {
  id: string;
  userId: string;
  type: GoalType;
  name: string;
  description?: string;

  // Financial targets
  targetAmount: number;
  currentAmount: number;
  startingAmount: number;

  // Timeline
  targetDate: Date;
  startDate: Date;
  projectedCompletionDate?: Date;

  // Progress
  progress: number; // 0-100 percentage
  status: GoalStatus;
  milestones: GoalMilestone[];

  // Strategy
  monthlyContribution: number;
  suggestedContribution: number;
  contributionFrequency: "weekly" | "biweekly" | "monthly";
  linkedAccountId?: string;
  autoSaveEnabled: boolean;

  // AI coaching
  aiRecommendations: string[];
  adjustmentSuggestions: GoalAdjustment[];
  riskFactors: string[];

  // Priority
  priority: number; // 1-5, higher is more important

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalMilestone {
  id: string;
  name: string;
  targetAmount: number;
  targetPercentage: number;
  achievedDate?: Date;
  isAchieved: boolean;
  celebrationMessage?: string;
}

export interface GoalAdjustment {
  type: "increase_contribution" | "extend_timeline" | "reduce_target" | "pause";
  reason: string;
  suggestedValue?: number;
  impact: string;
}

export interface GoalSimulation {
  goalId: string;
  scenarios: GoalScenario[];
  recommendedScenario: string;
}

export interface GoalScenario {
  id: string;
  name: string;
  monthlyContribution: number;
  projectedCompletionDate: Date;
  totalContributions: number;
  probabilityOfSuccess: number;
  assumptions: string[];
}

// ============================================================================
// BUDGET OPTIMIZER TYPES
// ============================================================================

export interface BudgetOptimizationResult {
  userId: string;
  generatedAt: Date;

  // Current state
  currentBudget: BudgetCategorySummary[];
  totalBudgeted: number;
  totalSpent: number;
  totalIncome: number;

  // Optimization recommendations
  optimizations: BudgetOptimization[];
  potentialMonthlySavings: number;

  // Templates
  suggestedTemplate?: BudgetTemplate;

  // What-if scenarios
  scenarios: BudgetScenario[];

  // AI insights
  aiAnalysis: string;
  keyInsights: string[];
}

export interface BudgetCategorySummary {
  category: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  percentUsed: number;
  trend: "increasing" | "decreasing" | "stable";
  benchmarkComparison?: number; // vs average for income level
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

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  forIncomeRange: { min: number; max: number };
  categories: BudgetTemplateCategory[];
  savingsRate: number;
}

export interface BudgetTemplateCategory {
  category: string;
  categoryName: string;
  percentOfIncome: number;
  suggestedAmount: number;
  isRequired: boolean;
  tips: string[];
}

export interface BudgetScenario {
  id: string;
  name: string;
  description: string;
  changes: BudgetChange[];
  projectedSavings: number;
  impact: BudgetImpact;
}

export interface BudgetChange {
  category: string;
  currentAmount: number;
  newAmount: number;
  difference: number;
}

export interface BudgetImpact {
  monthlySavings: number;
  annualSavings: number;
  goalAccelerationDays: number;
  debtPayoffAcceleration: number;
  lifestyleImpact: "minimal" | "moderate" | "significant";
}

// ============================================================================
// DEBT STRATEGY TYPES (Enhanced for AI Coach)
// ============================================================================

export interface DebtStrategyAnalysis {
  userId: string;
  generatedAt: Date;

  // Current debt state
  totalDebt: number;
  debtCount: number;
  averageInterestRate: number;
  monthlyPayments: number;
  debtToIncomeRatio: number;

  // Strategy comparisons
  strategies: DebtStrategyPlan[];
  recommendedStrategy: string;
  recommendationReason: string;

  // Refinancing opportunities
  refinancingOpportunities: RefinancingOpportunity[];

  // AI coaching
  aiInsights: string[];
  motivationalTips: string[];
  warningFlags: string[];
}

export interface DebtStrategyPlan {
  id: string;
  strategy: "avalanche" | "snowball" | "hybrid" | "consolidation";
  name: string;
  description: string;

  // Projections
  payoffDate: Date;
  totalMonths: number;
  totalInterestPaid: number;
  totalAmountPaid: number;

  // Comparison to baseline
  interestSaved: number;
  monthsSaved: number;

  // Monthly commitment
  requiredMonthlyPayment: number;
  extraPaymentNeeded: number;

  // Milestones
  milestones: DebtMilestone[];

  // Pros and cons
  advantages: string[];
  disadvantages: string[];

  // Psychological factors
  quickWins: number; // Debts paid off in first 6 months
  motivationScore: number; // 0-100
}

export interface DebtMilestone {
  month: number;
  date: Date;
  event: string;
  debtName?: string;
  totalPaidOff: number;
  remainingDebt: number;
  celebrationMessage: string;
}

export interface RefinancingOpportunity {
  debtId: string;
  debtName: string;
  currentRate: number;
  potentialRate: number;
  currentBalance: number;
  monthlySavings: number;
  totalSavings: number;
  lenderType: "bank" | "credit_union" | "online_lender" | "balance_transfer";
  requirements: string[];
  considerations: string[];
}

// ============================================================================
// COACH SESSION & INTERACTION TYPES
// ============================================================================

export interface CoachSession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;

  // Focus area
  focusArea: RecommendationType | "general";

  // Interactions
  interactions: CoachInteraction[];

  // Outcomes
  recommendationsGenerated: number;
  actionsCompleted: number;

  // AI model used
  aiModel: string;
}

export interface CoachInteraction {
  id: string;
  timestamp: Date;
  type: "question" | "recommendation" | "action" | "feedback";
  userInput?: string;
  coachResponse: string;
  relatedRecommendationId?: string;
  sentiment?: "positive" | "neutral" | "negative";
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GenerateRecommendationsRequest {
  userId: string;
  types?: RecommendationType[];
  limit?: number;
  includeAI?: boolean;
  focusArea?: string;
}

export interface GenerateRecommendationsResponse {
  recommendations: Recommendation[];
  generatedAt: Date;
  processingTimeMs: number;
  aiModelUsed?: string;
}

export interface CreateGoalPlanRequest {
  userId: string;
  type: GoalType;
  name: string;
  description?: string;
  targetAmount: number;
  targetDate: Date;
  monthlyContribution?: number;
  linkedAccountId?: string;
  autoSaveEnabled?: boolean;
  priority?: number;
}

export interface SimulateGoalRequest {
  goalId: string;
  /**
   * Owner of the goal. Required, not optional: the lookup runs on the
   * service-role client, which bypasses RLS, so this is the only thing
   * stopping one user from simulating another user's goal.
   */
  userId: string;
  scenarios: Array<{
    monthlyContribution: number;
    targetDate?: Date;
  }>;
}

export interface OptimizeBudgetRequest {
  userId: string;
  includeTemplates?: boolean;
  includeScenarios?: boolean;
  targetSavingsRate?: number;
}

export interface AnalyzeDebtStrategyRequest {
  userId: string;
  extraMonthlyPayment?: number;
  includeRefinancing?: boolean;
  targetPayoffDate?: Date;
}

export interface CoachChatRequest {
  userId: string;
  sessionId?: string;
  message: string;
  context?: {
    currentScreen?: string;
    focusArea?: RecommendationType;
    relatedGoalId?: string;
    relatedDebtId?: string;
  };
}

export interface CoachChatResponse {
  sessionId: string;
  response: string;
  suggestedActions?: RecommendationStep[];
  relatedRecommendations?: Recommendation[];
  followUpQuestions?: string[];
}

// ============================================================================
// DASHBOARD & SUMMARY TYPES
// ============================================================================

export interface CoachDashboard {
  userId: string;
  generatedAt: Date;

  // Financial health summary
  healthScore: number;
  healthTrend: "improving" | "stable" | "declining";

  // Top recommendations
  topRecommendations: Recommendation[];
  pendingActionsCount: number;

  // Goals overview
  activeGoals: number;
  goalsOnTrack: number;
  nextMilestone?: GoalMilestone & { goalName: string };

  // Budget status
  budgetHealth: "healthy" | "warning" | "critical";
  monthlyUnallocated: number;
  potentialSavings: number;

  // Debt progress
  debtFreeDate?: Date;
  monthsToDebtFree?: number;
  currentDebtProgress: number;

  // AI message
  coachMessage: string;
  focusArea: string;
}

export interface CoachProgress {
  userId: string;
  period: "week" | "month" | "quarter" | "year";

  // Recommendation progress
  recommendationsReceived: number;
  recommendationsActioned: number;
  recommendationsCompleted: number;

  // Goals progress
  goalsCreated: number;
  goalsCompleted: number;
  totalSavedTowardsGoals: number;

  // Budget improvements
  budgetAdherenceRate: number;
  savingsRateChange: number;

  // Debt progress
  totalDebtReduced: number;
  interestSaved: number;

  // Achievements
  achievements: CoachAchievement[];
}

export interface CoachAchievement {
  id: string;
  name: string;
  description: string;
  earnedAt: Date;
  category: "savings" | "debt" | "budget" | "goals" | "engagement";
  icon: string;
}
