/**
 * Financial Coach Types
 *
 * Type definitions for the AI-powered Financial Coach service
 * Based on Dave Ramsey's EveryDollar philosophy and Baby Steps framework
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Focus areas for financial coaching
 */
export enum FocusArea {
  DEBT_ELIMINATION = 'debt_elimination',
  EMERGENCY_FUND = 'emergency_fund',
  BUDGETING = 'budgeting',
  SAVINGS = 'savings',
  INVESTMENT = 'investment',
  RETIREMENT = 'retirement',
  INCOME_INCREASE = 'income_increase',
  EXPENSE_REDUCTION = 'expense_reduction',
  OVERALL = 'overall',
}

/**
 * Risk tolerance levels for investment recommendations
 */
export enum RiskTolerance {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

/**
 * Timeframe for financial goals and plans
 */
export enum Timeframe {
  SHORT_TERM = 'short_term',    // 0-1 year
  MEDIUM_TERM = 'medium_term',  // 1-5 years
  LONG_TERM = 'long_term',      // 5+ years
}

/**
 * Dave Ramsey's Baby Steps (1-7)
 */
export type BabyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Priority levels for advice and recommendations
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Difficulty levels for action items
 */
export type DifficultyLevel = 'easy' | 'moderate' | 'hard';

// ============================================================================
// COACH ANALYSIS TYPES
// ============================================================================

/**
 * Comprehensive financial situation analysis
 */
export interface CoachAnalysis {
  userId: string;
  currentBabyStep: BabyStep;
  babyStepProgress: BabyStepProgress;
  financialHealth: FinancialHealthAssessment;
  debtToIncomeRatio: number;
  emergencyFundStatus: EmergencyFundStatus;
  spendingPatterns: SpendingPattern[];
  criticalIssues: CriticalIssue[];
  opportunities: Opportunity[];
  behavioralInsights: string[];
  nextSteps: string[];
  encouragement: string;
  generatedAt: Date;
}

/**
 * Progress tracking for each Baby Step
 */
export interface BabyStepProgress {
  step1: {
    complete: boolean;
    amount: number;
    target: 1000;
    percentComplete: number;
  };
  step2: {
    complete: boolean;
    debtsRemaining: number;
    totalDebt: number;
    percentComplete: number;
  };
  step3: {
    complete: boolean;
    amount: number;
    target: number;
    months: number;
    percentComplete: number;
  };
  step4: {
    complete: boolean;
    investmentRate: number;
    target: 0.15;
    percentComplete: number;
  };
  step5: {
    complete: boolean;
    collegeSavings: number;
    percentComplete: number;
  };
  step6: {
    complete: boolean;
    mortgageBalance: number;
    percentComplete: number;
  };
  step7: {
    complete: boolean;
    netWorth: number;
    percentComplete: number;
  };
}

/**
 * Financial health assessment
 */
export interface FinancialHealthAssessment {
  score: number; // 0-100
  cashFlowStatus: 'positive' | 'neutral' | 'negative';
  debtStatus: 'debt_free' | 'manageable' | 'concerning' | 'crisis';
  savingsStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  budgetStatus: 'disciplined' | 'tracking' | 'loose' | 'none';
  summary: string;
  recommendations: string[];
}

/**
 * Emergency fund status
 */
export interface EmergencyFundStatus {
  currentAmount: number;
  targetAmount: number;
  monthsCovered: number;
  status: 'none' | 'starter' | 'partial' | 'complete' | 'excellent';
  recommendation: string;
}

/**
 * Spending pattern analysis
 */
export interface SpendingPattern {
  category: string;
  monthlyAverage: number;
  percentOfIncome: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  comparison: 'above_average' | 'average' | 'below_average';
  recommendation?: string;
}

/**
 * Critical financial issues requiring immediate attention
 */
export interface CriticalIssue {
  id: string;
  severity: PriorityLevel;
  title: string;
  description: string;
  impact: string;
  immediateAction: string;
  estimatedCost?: number;
}

/**
 * Financial improvement opportunity
 */
export interface Opportunity {
  id: string;
  type: FocusArea;
  title: string;
  description: string;
  potentialBenefit: string;
  difficulty: DifficultyLevel;
  estimatedImpact: number; // dollars per month
  actionSteps: string[];
  timeline: string;
}

// ============================================================================
// PERSONALIZED ADVICE TYPES
// ============================================================================

/**
 * AI-generated personalized financial advice
 */
export interface PersonalizedAdvice {
  question: string;
  answer: string;
  confidenceScore: number; // 0-1
  priorityLevel: PriorityLevel;
  relevantBabyStep: BabyStep;
  actionableSteps: ActionableStep[];
  resources: Resource[];
  encouragement: string;
  estimatedImpact?: number;
  timeframe?: Timeframe;
  generatedAt: Date;
}

/**
 * Actionable step within advice
 */
export interface ActionableStep {
  id: string;
  order: number;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedTime: string;
  completed: boolean;
}

/**
 * Educational or reference resource
 */
export interface Resource {
  type: 'article' | 'video' | 'tool' | 'calculator' | 'book';
  title: string;
  description: string;
  url?: string;
  relevance: number; // 0-1
}

// ============================================================================
// ACTION PLAN TYPES
// ============================================================================

/**
 * Step-by-step financial action plan
 */
export interface ActionPlan {
  userId: string;
  title: string;
  description: string;
  startingBabyStep: BabyStep;
  targetBabyStep: BabyStep;
  timeframe: Timeframe;
  estimatedDuration: string;
  milestones: Milestone[];
  weeklyActions: string[];
  monthlyReviews: string[];
  celebrationPoints: CelebrationPoint[];
  successMetrics: SuccessMetric[];
  generatedAt: Date;
  lastUpdated: Date;
}

/**
 * Milestone within an action plan
 */
export interface Milestone {
  id: string;
  babyStep: BabyStep;
  order: number;
  title: string;
  description: string;
  targetAmount?: number;
  targetDate?: Date;
  actions: string[];
  dependencies: string[]; // IDs of prerequisite milestones
  completed: boolean;
  completedAt?: Date;
}

/**
 * Celebration point for motivation
 */
export interface CelebrationPoint {
  id: string;
  milestone: string;
  achievement: string;
  reward: string;
  reached: boolean;
  reachedAt?: Date;
}

/**
 * Success metric for tracking progress
 */
export interface SuccessMetric {
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  percentComplete: number;
}

// ============================================================================
// COACH SESSION TYPES
// ============================================================================

/**
 * Financial coaching conversation session
 */
export interface CoachSession {
  id: string;
  userId: string;
  title: string;
  focusArea: FocusArea;
  messages: CoachMessage[];
  context: SessionContext;
  preferences: UserPreferences;
  status: 'active' | 'paused' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
}

/**
 * Individual coach message
 */
export interface CoachMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'coach' | 'system';
  type: MessageType;
  content: string;
  metadata: MessageMetadata;
  timestamp: Date;
}

/**
 * Message type classification
 */
export type MessageType =
  | 'advice'
  | 'question'
  | 'recommendation'
  | 'analysis'
  | 'encouragement'
  | 'clarification'
  | 'action_confirmation'
  | 'milestone_celebration';

/**
 * Message metadata
 */
export interface MessageMetadata {
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
  tokensUsed?: number;
  modelUsed?: string;
  latencyMs?: number;
}

/**
 * Session context for maintaining conversation state
 */
export interface SessionContext {
  currentBabyStep: BabyStep;
  focusAreas: FocusArea[];
  recentTopics: string[];
  pendingActions: PendingAction[];
  financialSnapshot: {
    income: number;
    expenses: number;
    debt: number;
    savings: number;
    capturedAt: Date;
  };
}

/**
 * Pending action awaiting user confirmation
 */
export interface PendingAction {
  id: string;
  type: string;
  description: string;
  params: Record<string, any>;
  expiresAt: Date;
}

/**
 * User preferences for coaching style
 */
export interface UserPreferences {
  communicationStyle: 'direct' | 'encouraging' | 'balanced';
  detailLevel: 'brief' | 'moderate' | 'detailed';
  riskTolerance: RiskTolerance;
  priorityFocus: FocusArea[];
  notificationPreferences: {
    weeklyCheckIn: boolean;
    milestoneReminders: boolean;
    opportunityAlerts: boolean;
  };
}

