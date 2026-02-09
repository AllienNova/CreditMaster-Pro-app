/**
 * Fynvita AI Personalization System - Type Definitions
 * Core types for behavioral finance coaching, nudges, and insights
 */

// ============================================================================
// ENUMS
// ============================================================================

export type FinancialPersonality =
  | 'saver'
  | 'spender'
  | 'investor'
  | 'balanced'
  | 'cautious'
  | 'aggressive';

export type CommunicationTone =
  | 'supportive'
  | 'direct'
  | 'motivational'
  | 'analytical';

export type NudgeType =
  | 'motivational'
  | 'progress'
  | 'warning'
  | 'celebration'
  | 'reminder'
  | 'insight'
  | 'coaching';

export type NudgeChannel = 'in_app' | 'push' | 'email' | 'sms';

export type NudgeAction = 'accepted' | 'dismissed' | 'snoozed' | 'ignored';

export type SpendingPatternType =
  | 'time_of_day'
  | 'day_of_week'
  | 'category'
  | 'merchant'
  | 'emotional'
  | 'seasonal';

export type CoachingSessionType =
  | 'onboarding'
  | 'weekly_review'
  | 'goal_check'
  | 'crisis'
  | 'celebration'
  | 'education';

export type GoalType =
  | 'savings'
  | 'debt_payoff'
  | 'emergency_fund'
  | 'investment'
  | 'credit_score'
  | 'custom';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export type InterventionType =
  | 'none'
  | 'soft_nudge'
  | 'reflection_prompt'
  | 'strong_intervention';

export type SpendingAlertResponse =
  | 'planned'
  | 'will_wait'
  | 'dismissed'
  | 'no_response';

export type BehavioralBias =
  | 'loss_aversion'
  | 'anchoring'
  | 'mental_accounting'
  | 'overconfidence'
  | 'herding'
  | 'present_bias'
  | 'confirmation_bias'
  | 'sunk_cost_fallacy';

// ============================================================================
// USER FINANCIAL PROFILE
// ============================================================================

export interface UserFinancialProfile {
  id: string;
  userId: string;
  riskToleranceScore: number | null; // 0-10
  financialPersonality: FinancialPersonality | null;
  primaryGoals: PrimaryGoal[] | null;
  spendingTriggers: SpendingTrigger[] | null;
  preferredNotificationTime: string | null; // HH:MM format
  preferredNotificationDays: string[] | null;
  communicationTone: CommunicationTone;
  biases: UserBiases | null;
  lastAssessmentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrimaryGoal {
  type: GoalType;
  priority: number;
  targetAmount?: number;
  targetDate?: string;
}

export interface SpendingTrigger {
  trigger: string;
  category?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  emotionalState?: string;
  confidence: number; // 0-1
}

export interface UserBiases {
  lossAversion: number; // 0-100
  anchoring: number;
  mentalAccounting: number;
  overconfidence: number;
  herding: number;
  presentBias: number;
}

// ============================================================================
// SPENDING PATTERNS
// ============================================================================

export interface SpendingPattern {
  id: string;
  userId: string;
  patternType: SpendingPatternType;
  patternKey: string;
  averageAmount: number | null;
  transactionCount: number;
  riskScore: number | null; // 0-1
  metadata: SpendingPatternMetadata | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface SpendingPatternMetadata {
  percentOfTotal?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  anomalyScore?: number;
  relatedCategories?: string[];
}

export interface SpendingAnalysis {
  patterns: {
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
    categories: Record<string, number>;
  };
  triggers: SpendingTrigger[];
  recommendations: string[];
  riskAreas: RiskArea[];
  /** Total spending amount analyzed */
  totalSpending?: number;
  /** Number of transactions analyzed */
  transactionCount?: number;
  /** Average transaction amount */
  averageTransaction?: number;
  /** Overall risk score from 0-10 */
  overallRiskScore?: number;
}

export interface RiskArea {
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  averageOverspend: number;
  frequency: number;
  suggestion: string;
}

// ============================================================================
// NUDGES
// ============================================================================

export interface NudgeDefinition {
  id: string;
  code: string;
  nudgeType: NudgeType;
  titleTemplate: string;
  messageTemplate: string;
  triggerConditions: NudgeTriggerConditions;
  priority: number; // 1-10
  cooldownHours: number;
  channels: NudgeChannel[];
  isActive: boolean;
  createdAt: string;
}

export interface NudgeTriggerConditions {
  eventType?: string;
  threshold?: number;
  timeCondition?: string;
  userSegment?: string[];
  frequency?: string;
}

export interface NudgeHistory {
  id: string;
  userId: string;
  nudgeId: string | null;
  nudgeType: NudgeType;
  title: string;
  message: string;
  channel: NudgeChannel;
  sentAt: string;
  openedAt: string | null;
  actionTaken: NudgeAction | null;
  actionAt: string | null;
  context: NudgeContext | null;
  abVariant: string | null;
}

export interface NudgeContext {
  triggeredBy?: string;
  relatedTransaction?: string;
  goalId?: string;
  amount?: number;
  category?: string;
}

export interface NudgeRequest {
  userId: string;
  nudgeType: NudgeType;
  title: string;
  message: string;
  channel: NudgeChannel;
  context?: NudgeContext;
  abVariant?: string;
}

export interface NudgeResponse {
  nudgeId: string;
  response: NudgeAction;
  feedback?: string;
}

// ============================================================================
// AI COACHING
// ============================================================================

export interface AICoachingSession {
  id: string;
  userId: string;
  sessionType: CoachingSessionType;
  topic: string;
  content: CoachingContent;
  userResponse: UserCoachingResponse | null;
  sentimentScore: number | null; // -1 to 1
  completedAt: string | null;
  createdAt: string;
}

export interface CoachingContent {
  greeting?: string;
  mainMessage: string;
  insights: CoachingInsight[];
  actionItems: ActionItem[];
  questions?: string[];
  encouragement?: string;
}

export interface CoachingInsight {
  type: 'observation' | 'suggestion' | 'warning' | 'celebration';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  completed: boolean;
  /** Estimated impact of completing this action (e.g., "Save $50/month", "+10 credit points") */
  estimatedImpact?: string;
}

export interface UserCoachingResponse {
  feedback: 'helpful' | 'not_helpful' | 'neutral';
  completedActions: string[];
  notes?: string;
}

// ============================================================================
// GOAL TRACKING
// ============================================================================

export interface GoalTracking {
  id: string;
  userId: string;
  goalType: GoalType;
  goalName: string;
  targetValue: number;
  currentValue: number;
  targetDate: string | null;
  startDate: string;
  status: GoalStatus;
  milestones: GoalMilestone[] | null;
  aiRecommendations: AIRecommendation[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalMilestone {
  percent: number; // 25, 50, 75, 100
  targetValue: number;
  reachedAt?: string;
  celebrated: boolean;
}

export interface AIRecommendation {
  id: string;
  type:
    | 'savings_increase'
    | 'timeline_adjustment'
    | 'strategy_change'
    | 'celebration';
  title: string;
  description: string;
  impact: string;
  createdAt: string;
  dismissed: boolean;
}

export interface GoalProgress {
  goalId: string;
  progressPercent: number;
  amountRemaining: number;
  daysRemaining: number | null;
  requiredDaily: number | null;
  requiredMonthly: number | null;
  onTrack: boolean;
  projectedCompletionDate: string | null;
}

// ============================================================================
// EMOTIONAL SPENDING DETECTION
// ============================================================================

export interface EmotionalSpendingAlert {
  id: string;
  userId: string;
  transactionId: string | null;
  riskScore: number; // 0-1
  riskFactors: RiskFactor[];
  interventionType: InterventionType;
  userResponse: SpendingAlertResponse | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface SpendingRiskAnalysis {
  transactionId: string;
  amount: number;
  merchant: string;
  category: string;
  timestamp: string;
  riskScore: number;
  riskFactors: RiskFactor[];
  recommendedIntervention: InterventionType;
}

// Risk factor weights for emotional spending detection
export const RISK_FACTOR_WEIGHTS: Record<string, number> = {
  late_night: 0.25,
  repeat_merchant_same_day: 0.2,
  unusual_category: 0.15,
  exceeds_daily_average: 0.2,
  budget_category_overspent: 0.2,
  weekend_splurge: 0.1,
  payday_spending: 0.15,
  stress_indicator: 0.25,
};

export const INTERVENTION_THRESHOLDS = {
  none: 0.5,
  soft_nudge: 0.65,
  reflection_prompt: 0.8,
  strong_intervention: 0.9,
};

// ============================================================================
// BEHAVIORAL FINANCE ASSESSMENT
// ============================================================================

export interface BehavioralAssessment {
  userId: string;
  assessmentDate: string;
  riskTolerance: RiskToleranceResult;
  financialPersonality: PersonalityResult;
  biasAnalysis: BiasAnalysisResult;
  recommendations: string[];
}

export interface RiskToleranceResult {
  score: number; // 1-10
  category: 'conservative' | 'moderate' | 'aggressive';
  factors: {
    timeHorizon: number;
    lossComfort: number;
    volatilityTolerance: number;
    financialKnowledge: number;
  };
}

export interface PersonalityResult {
  primary: FinancialPersonality;
  secondary: FinancialPersonality | null;
  traits: PersonalityTrait[];
}

export interface PersonalityTrait {
  trait: string;
  score: number;
  description: string;
}

export interface BiasAnalysisResult {
  dominantBias: BehavioralBias;
  biasScores: Record<BehavioralBias, number>;
  interventionSuggestions: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface InsightsResponse {
  insights: CoachingInsight[];
  coaching: {
    currentTopic: string;
    suggestedActions: ActionItem[];
  };
  personality: {
    type: FinancialPersonality | null;
    riskScore: number | null;
    biases: UserBiases | null;
  };
}

export interface SpendingAnalysisResponse {
  patterns: SpendingAnalysis['patterns'];
  triggers: SpendingTrigger[];
  recommendations: string[];
  monthlyTrend: {
    month: string;
    total: number;
    change: number;
  }[];
}

export interface NudgePreferencesResponse {
  preferredTime: string | null;
  preferredDays: string[] | null;
  channels: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  frequency: 'low' | 'medium' | 'high';
}

// ============================================================================
// AI MODEL TYPES
// ============================================================================

export interface SpendingClassifierInput {
  amount: number;
  merchant: string;
  category: string;
  timestamp: string;
  dayOfWeek: number;
  hourOfDay: number;
  isWeekend: boolean;
  daysSincePayday: number;
  budgetUtilization: number;
  recentTransactionCount: number;
}

export interface SpendingClassifierOutput {
  riskScore: number;
  riskFactors: RiskFactor[];
  category: string;
  tags: string[];
  isImpulse: boolean;
  confidence: number;
}

export interface NudgeOptimizerInput {
  userId: string;
  nudgeType: NudgeType;
  userProfile: UserFinancialProfile;
  recentNudges: NudgeHistory[];
  currentContext: {
    timeOfDay: string;
    dayOfWeek: string;
    recentActivity: string[];
  };
}

export interface NudgeOptimizerOutput {
  shouldSend: boolean;
  optimalChannel: NudgeChannel;
  optimalTime: string;
  personalizedMessage: string;
  abVariant: string;
  confidence: number;
}

export interface BehaviorPredictorInput {
  userId: string;
  historicalPatterns: SpendingPattern[];
  currentDate: string;
  upcomingEvents: string[]; // e.g., "payday", "holiday"
}

export interface BehaviorPredictorOutput {
  predictions: {
    category: string;
    expectedAmount: number;
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
  }[];
  suggestions: string[];
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface InsightCardProps {
  insight: CoachingInsight;
  onDismiss?: () => void;
  onAction?: () => void;
}

export interface NudgeToastProps {
  nudge: NudgeHistory;
  onAccept: () => void;
  onDismiss: () => void;
  onSnooze?: () => void;
}

export interface GoalProgressCardProps {
  goal: GoalTracking;
  progress: GoalProgress;
  onUpdate?: () => void;
}

export interface SpendingAlertModalProps {
  alert: EmotionalSpendingAlert;
  transaction: {
    amount: number;
    merchant: string;
    category: string;
  };
  onResponse: (response: SpendingAlertResponse) => void;
}

export interface PersonalityBadgeProps {
  personality: FinancialPersonality;
  size: 'sm' | 'md' | 'lg';
}

export interface BiasIndicatorProps {
  bias: BehavioralBias;
  score: number;
  showDescription?: boolean;
}
