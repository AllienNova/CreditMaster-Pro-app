/**
 * Health Score V2 Types
 *
 * Enhanced type definitions for the V2 health score calculator
 * with investment data integration and detailed breakdowns.
 */

import { FinancialHealthScore, HealthScoreBreakdown, ComponentScore } from './financial-context.types';
import { AggregatedFinancialContext } from './aggregated-context.types';

// ============================================================================
// SCORE CONFIGURATION
// ============================================================================

/**
 * Score weights for V2 algorithm (must sum to 1.0)
 * V2 adds investments and rebalances weights
 */
export interface ScoreWeightsV2 {
  savings: number;      // Emergency fund, savings rate, goals
  debt: number;         // Debt-to-income, high-interest debt
  spending: number;     // Budget adherence, spending ratio
  credit: number;       // Credit score, utilization
  investments: number;  // Portfolio performance, diversification, retirement
  insurance: number;    // Coverage adequacy
}

/**
 * Configurable thresholds for scoring
 */
export interface ScoreThresholdsV2 {
  emergencyFundMonths: { excellent: number; good: number; fair: number };
  savingsRate: { excellent: number; good: number; fair: number };
  debtToIncome: { excellent: number; good: number; fair: number };
  creditUtilization: { excellent: number; good: number; fair: number };
  budgetAdherence: { excellent: number; good: number; fair: number };
  investmentReturn: { excellent: number; good: number; fair: number };
  diversificationScore: { excellent: number; good: number; fair: number };
  retirementReadiness: { excellent: number; good: number; fair: number };
}

// ============================================================================
// ENHANCED COMPONENT SCORES
// ============================================================================

/**
 * Enhanced component score with more detail
 */
export interface ComponentScoreV2 extends ComponentScore {
  subScores: SubScore[];
  recommendations: ComponentRecommendation[];
  trend: 'improving' | 'declining' | 'stable';
  trendPercent: number;
  benchmarkComparison: BenchmarkComparison;
}

export interface SubScore {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ComponentRecommendation {
  action: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImprovement: number; // Points improvement
  timeframe: string;
}

export interface BenchmarkComparison {
  percentile: number;
  ageGroupAverage: number;
  incomeGroupAverage: number;
  comparison: 'above' | 'below' | 'average';
}

// ============================================================================
// ENHANCED HEALTH SCORE
// ============================================================================

/**
 * Enhanced health score breakdown with investments
 */
export interface HealthScoreBreakdownV2 extends HealthScoreBreakdown {
  investments: ComponentScoreV2;
  savings: ComponentScoreV2;
  debt: ComponentScoreV2;
  spending: ComponentScoreV2;
  credit: ComponentScoreV2;
  insurance: ComponentScoreV2;
}

/**
 * Enhanced financial health score with V2 features
 */
export interface FinancialHealthScoreV2 extends FinancialHealthScore {
  version: 2;
  breakdown: HealthScoreBreakdownV2;
  
  // Enhanced metrics
  percentileRank: number;
  ageGroupRank: number;
  incomeGroupRank: number;
  
  // Trend analysis
  trendDirection: 'improving' | 'declining' | 'stable';
  trendPercent: number;
  projectedScore30Days: number;
  projectedScore90Days: number;
  
  // Actionable insights
  topStrengths: ScoreStrength[];
  topWeaknesses: ScoreWeakness[];
  quickWins: QuickWin[];
  
  // Historical context
  previousScore?: number;
  previousGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreHistory: ScoreHistoryPoint[];
  
  // Metadata
  dataQuality: DataQualityAssessment;
  calculationDetails: CalculationDetails;
}

export interface ScoreStrength {
  component: keyof HealthScoreBreakdownV2;
  description: string;
  score: number;
  contribution: number;
}

export interface ScoreWeakness {
  component: keyof HealthScoreBreakdownV2;
  description: string;
  score: number;
  potentialImprovement: number;
  recommendation: string;
}

export interface QuickWin {
  title: string;
  description: string;
  action: string;
  component: keyof HealthScoreBreakdownV2;
  estimatedImprovement: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  category?: string;
}

export interface ScoreHistoryPoint {
  date: Date;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface DataQualityAssessment {
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  missingData: string[];
  staleData: string[];
  confidenceLevel: number; // 0-100
}

export interface CalculationDetails {
  algorithm: 'v2';
  weightsUsed: ScoreWeightsV2;
  thresholdsUsed: ScoreThresholdsV2;
  dataSourcesUsed: string[];
  calculationTime: number; // ms
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input for V2 health score calculation
 */
export interface HealthScoreInputV2 {
  context: AggregatedFinancialContext;
  options?: HealthScoreOptionsV2;
}

export interface HealthScoreOptionsV2 {
  includeProjections?: boolean;
  includeBenchmarks?: boolean;
  includeHistory?: boolean;
  customWeights?: Partial<ScoreWeightsV2>;
  ageGroup?: AgeGroup;
  incomeGroup?: IncomeGroup;
}

export type AgeGroup = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type IncomeGroup = 'low' | 'lower-middle' | 'middle' | 'upper-middle' | 'high';

