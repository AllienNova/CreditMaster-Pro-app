/**
 * Goal Tracker Type Definitions
 * 
 * Comprehensive type definitions for financial goal tracking and progress monitoring.
 * Extends existing goal types with advanced analytics and monitoring capabilities.
 */

import { GoalType, GoalStatus, FinancialGoalPlan, GoalMilestone } from './ai-coach.types';

// ============================================================================
// GOAL PROGRESS TRACKING
// ============================================================================

/**
 * Comprehensive goal progress metrics
 */
export interface GoalProgress {
  goalId: string;
  userId: string;
  currentAmount: number;
  targetAmount: number;
  progressPercentage: number;
  
  // Velocity metrics
  velocity: VelocityMetrics;
  
  // Timeline metrics
  daysElapsed: number;
  daysRemaining: number;
  timeElapsedPercentage: number;
  
  // Performance
  performanceScore: PerformanceScore;
  status: GoalStatus;
  
  // Predictions
  predictions: ProgressPredictions;
  
  // Risks
  risks: RiskAssessment[];
  
  lastUpdated: Date;
}

/**
 * Velocity metrics for goal progress
 */
export interface VelocityMetrics {
  dailyVelocity: number;
  weeklyVelocity: number;
  monthlyVelocity: number;
  averageContribution: number;
  requiredVelocity: number;
  velocityRatio: number; // actual / required
  trend: 'accelerating' | 'steady' | 'decelerating';
}

/**
 * Performance scoring for goals
 */
export interface PerformanceScore {
  overall: number; // 0-100
  timePerformance: number; // 0-100
  contributionConsistency: number; // 0-100
  milestoneAchievement: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'ahead' | 'on_track' | 'behind' | 'at_risk';
}

/**
 * Progress predictions and projections
 */
export interface ProgressPredictions {
  projectedCompletionDate: Date;
  confidenceLevel: number; // 0-100
  probabilityOfSuccess: number; // 0-100
  requiredMonthlyContribution: number;
  shortfallAmount: number;
  surplusAmount: number;
}

/**
 * Risk assessment for goals
 */
export interface RiskAssessment {
  type: 'timeline' | 'financial' | 'consistency' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation: string;
  detectedAt: Date;
}

// ============================================================================
// GOAL RECOMMENDATIONS
// ============================================================================

/**
 * Actionable recommendations for goal achievement
 */
export interface GoalRecommendation {
  id: string;
  goalId: string;
  type: 'increase_contribution' | 'extend_timeline' | 'reduce_target' | 'optimize_strategy' | 'celebrate';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionSteps: string[];
  expectedImpact: string;
  estimatedEffort: 'easy' | 'moderate' | 'difficult';
  potentialSavings?: number;
  timeToImplement?: number; // days
  createdAt: Date;
}

// ============================================================================
// GOAL ANALYTICS
// ============================================================================

/**
 * Historical progress data point
 */
export interface ProgressHistoryPoint {
  date: Date;
  amount: number;
  contribution: number;
  progressPercentage: number;
  velocity: number;
  note?: string;
}

/**
 * Comparative analytics with peer benchmarks
 */
export interface GoalComparison {
  goalType: GoalType;
  userProgress: number;
  peerAverageProgress: number;
  peerMedianProgress: number;
  percentile: number; // User's percentile ranking
  comparison: 'above_average' | 'average' | 'below_average';
  insights: string[];
}

/**
 * Goal category for organization
 */
export enum GoalCategory {
  EMERGENCY_FUND = 'emergency_fund',
  DEBT_PAYOFF = 'debt_payoff',
  SAVINGS_TARGET = 'savings',
  INVESTMENT_GOAL = 'investment',
  CREDIT_IMPROVEMENT = 'credit_score',
  BUDGET_ADHERENCE = 'budget',
}

/**
 * Progress metrics summary
 */
export interface ProgressMetrics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalProgress: number; // Average across all goals
  totalSaved: number;
  totalTarget: number;
  onTrackCount: number;
  behindCount: number;
  aheadCount: number;
  averageVelocity: number;
}

