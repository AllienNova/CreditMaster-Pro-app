/**
 * Health Score Types
 *
 * Unified type definitions for the Financial Health Score system.
 * This file provides convenient exports for both V1 and V2 health score types.
 *
 * **Recommended:** Use V2 types for new implementations as they provide:
 * - Investment scoring
 * - Detailed sub-scores and recommendations
 * - Trend analysis and projections
 * - Benchmark comparisons
 * - Quick wins identification
 */

// ============================================================================
// V2 TYPES (RECOMMENDED)
// ============================================================================

export type {
  // Main Score Types
  FinancialHealthScoreV2,
  HealthScoreBreakdownV2,
  ComponentScoreV2,

  // Configuration
  ScoreWeightsV2,
  ScoreThresholdsV2,

  // Input/Output
  HealthScoreInputV2,
  HealthScoreOptionsV2,

  // Detailed Scoring
  SubScore,
  ComponentRecommendation,
  BenchmarkComparison,

  // Insights
  ScoreStrength,
  ScoreWeakness,
  QuickWin,

  // Historical
  ScoreHistoryPoint,

  // Metadata
  DataQualityAssessment,
  CalculationDetails,

  // Enums
  AgeGroup,
  IncomeGroup,
} from './health-score-v2.types';

// ============================================================================
// V1 TYPES (LEGACY)
// ============================================================================

export type {
  // Basic Score Types
  FinancialHealthScore,
  HealthScoreBreakdown,
  ComponentScore,
} from './financial-context.types';

// ============================================================================
// CONVENIENCE TYPE ALIASES (Phase 1.3 Requirements)
// ============================================================================

import {
  FinancialHealthScoreV2,
  ComponentScoreV2,
  ComponentRecommendation,
  BenchmarkComparison,
  ScoreHistoryPoint,
} from './health-score-v2.types';

/**
 * Overall health score (0-100) with timestamp, user_id, and breakdown
 * 
 * @alias FinancialHealthScoreV2
 */
export type HealthScore = FinancialHealthScoreV2;

/**
 * Individual category score with value (0-100), weight, factors array, and trend
 * 
 * @alias ComponentScoreV2
 */
export type CategoryScore = ComponentScoreV2;

/**
 * Individual scoring factor with name, value, weight, impact (+/-), and description
 * 
 * Note: In V2, this is represented by SubScore within each ComponentScoreV2
 */
export interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Actionable recommendation with priority, category, title, description,
 * estimated_impact, and action_steps array
 * 
 * @alias ComponentRecommendation (enhanced)
 */
export type ScoreRecommendation = ComponentRecommendation;

/**
 * Benchmarking data with national_average, peer_group_average, percentile,
 * and age_income_bracket
 * 
 * @alias BenchmarkComparison (enhanced)
 */
export type ScoreComparison = BenchmarkComparison;

/**
 * Historical tracking with scores array and trend analysis
 */
export interface HealthScoreHistory {
  userId: string;
  scores: ScoreHistoryPoint[];
  trendDirection: 'improving' | 'declining' | 'stable';
  trendPercent: number;
  periodDays: number;
}

// ============================================================================
// CATEGORY ENUMS
// ============================================================================

/**
 * Health score categories
 */
export enum HealthScoreCategory {
  SAVINGS = 'savings',
  DEBT = 'debt',
  SPENDING = 'spending',
  CREDIT = 'credit',
  INVESTMENTS = 'investments',
  INSURANCE = 'insurance',
}

/**
 * Recommendation priority levels
 */
export enum RecommendationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Score trend directions
 */
export enum ScoreTrend {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Score grade (A-F)
 */
export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Score status
 */
export type ScoreStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Comparison result
 */
export type ComparisonResult = 'above' | 'below' | 'average';

