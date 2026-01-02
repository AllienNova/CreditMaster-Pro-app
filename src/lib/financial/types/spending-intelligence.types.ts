/**
 * Spending Intelligence Types
 *
 * Type definitions for AI-powered spending analysis, pattern detection,
 * anomaly detection, and behavioral insights.
 */

// ============================================================================
// CORE ANALYSIS TYPES
// ============================================================================

export interface SpendingPatternAnalysis {
  userId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  patterns: DetectedPattern[];
  habits: SpendingHabit[];
  velocity: SpendingVelocity;
  triggers: BehavioralTrigger[];
  score: SpendingHealthScore;
  aiInsights: AIInsight[];
  generatedAt: Date;
}

export interface DetectedPattern {
  id: string;
  type: PatternType;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  confidence: number; // 0-100
  averageAmount: number;
  totalAmount: number;
  occurrences: number;
  category?: string;
  merchant?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  relatedTransactionIds: string[];
  firstDetected: Date;
  lastOccurrence: Date;
  nextExpected?: Date;
  aiGenerated: boolean;
}

export type PatternType =
  | 'recurring_subscription'
  | 'weekly_routine'
  | 'payday_spending'
  | 'weekend_spending'
  | 'seasonal_spending'
  | 'impulse_buying'
  | 'stress_spending'
  | 'social_spending'
  | 'convenience_spending'
  | 'planned_purchase';

export interface SpendingHabit {
  id: string;
  type: HabitType;
  description: string;
  frequency: string;
  averageAmount: number;
  impact: 'positive' | 'negative' | 'neutral';
  healthScore: number; // 0-100
  recommendation?: string;
  potentialSavings?: number;
}

export type HabitType =
  | 'daily_coffee'
  | 'frequent_dining_out'
  | 'subscription_accumulation'
  | 'impulse_shopping'
  | 'late_night_purchases'
  | 'weekend_splurging'
  | 'emotional_spending'
  | 'convenience_purchases';

export interface SpendingVelocity {
  current: number; // $ per day
  average: number; // $ per day
  acceleration: number; // % change
  trend: 'accelerating' | 'decelerating' | 'stable';
  projectedMonthEnd: number;
  daysRemaining: number;
  burnRate: number; // Days until funds depleted (if applicable)
}

export interface BehavioralTrigger {
  id: string;
  type: TriggerType;
  description: string;
  confidence: number;
  associatedSpending: number;
  occurrences: number;
  pattern: string;
  recommendation: string;
}

export type TriggerType =
  | 'time_of_day'
  | 'day_of_week'
  | 'payday'
  | 'weekend'
  | 'holiday'
  | 'weather'
  | 'location'
  | 'social_event'
  | 'stress'
  | 'boredom';

export interface SpendingHealthScore {
  overall: number; // 0-100
  breakdown: {
    consistency: number; // How consistent spending is
    control: number; // How well spending is controlled
    planning: number; // How much spending is planned vs impulsive
    efficiency: number; // Value for money
    sustainability: number; // Long-term sustainability
  };
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  trend: 'improving' | 'declining' | 'stable';
  comparedToLastPeriod: number;
}

export interface AIInsight {
  id: string;
  type: InsightType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string[];
  confidence: number; // 0-100
  impact: 'positive' | 'negative' | 'neutral';
  potentialSavings?: number;
  actionItems: ActionItem[];
  relatedCategory?: string;
  relatedMerchant?: string;
  relatedPatternId?: string;
  aiModel: string;
  generatedAt: Date;
}

export type InsightType =
  | 'spending_pattern'
  | 'anomaly_detected'
  | 'trend_alert'
  | 'savings_opportunity'
  | 'budget_warning'
  | 'habit_formation'
  | 'behavioral_trigger'
  | 'optimization_suggestion';

// ============================================================================
// ANOMALY DETECTION TYPES
// ============================================================================

export interface AnomalyDetectionResult {
  userId: string;
  timeframe: number; // days analyzed
  sensitivity: 'low' | 'medium' | 'high';
  anomalies: SpendingAnomaly[];
  summary: AnomalySummary;
  detectedAt: Date;
}

export interface SpendingAnomaly {
  id: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  transactionId: string;
  amount: number;
  expectedAmount?: number;
  deviation: number; // % or $ deviation from expected
  category: string;
  merchant: string;
  date: Date;
  confidence: number; // 0-100
  detectionMethod: 'zscore' | 'iqr' | 'isolation_forest' | 'ai';
  requiresAction: boolean;
  actionSuggestion?: string;
  relatedAnomalies?: string[]; // IDs of related anomalies
}

export type AnomalyType =
  | 'unusual_large_transaction'
  | 'unusual_small_transaction'
  | 'unusual_merchant'
  | 'unusual_category'
  | 'unusual_frequency'
  | 'unusual_time'
  | 'duplicate_charge'
  | 'subscription_increase'
  | 'spending_spike'
  | 'location_anomaly';

export interface AnomalySummary {
  totalAnomalies: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<AnomalyType, number>;
  totalImpact: number; // $ amount
  requiresImmediateAction: number;
}

// ============================================================================
// TREND ANALYSIS TYPES
// ============================================================================

export interface SpendingTrendAnalysis {
  userId: string;
  period: string;
  categories?: string[];
  categoryTrends: CategoryTrend[];
  overallTrend: TrendDirection;
  growthRate: number; // % per period
  seasonality: SeasonalityAnalysis;
  forecast: SpendingForecast;
  comparison: PeriodComparison;
  insights: string[];
  generatedAt: Date;
}

export interface CategoryTrend {
  category: string;
  displayName: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
  volatility: number; // 0-100
  dataPoints: TrendDataPoint[];
  forecast: number;
  confidence: number;
}

export type TrendDirection =
  | 'increasing'
  | 'decreasing'
  | 'stable'
  | 'volatile'
  | 'seasonal';

export interface TrendDataPoint {
  date: Date;
  amount: number;
  transactionCount: number;
}

export interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  seasonalityStrength: number; // 0-100
  peakPeriods: string[];
  lowPeriods: string[];
  seasonalPattern: 'monthly' | 'quarterly' | 'yearly' | 'none';
  adjustedTrend: TrendDirection;
}

export interface SpendingForecast {
  nextPeriod: number;
  nextMonth: number;
  nextQuarter: number;
  confidence: number;
  range: {
    low: number;
    expected: number;
    high: number;
  };
  assumptions: string[];
}

export interface PeriodComparison {
  compareWith: 'previous' | 'year_ago' | 'average';
  currentPeriod: {
    start: Date;
    end: Date;
    amount: number;
  };
  comparisonPeriod: {
    start: Date;
    end: Date;
    amount: number;
  };
  change: number;
  changePercent: number;
  categoryChanges: CategoryChange[];
  significantChanges: SignificantChange[];
}

export interface CategoryChange {
  category: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercent: number;
  isSignificant: boolean;
}

export interface SignificantChange {
  category: string;
  type: 'increase' | 'decrease';
  amount: number;
  percent: number;
  reason?: string;
  impact: 'positive' | 'negative' | 'neutral';
}

// ============================================================================
// INSIGHT GENERATION TYPES
// ============================================================================

export interface InsightGenerationRequest {
  userId: string;
  analysisType?: 'patterns' | 'trends' | 'anomalies' | 'all';
  priority?: 'high' | 'medium' | 'low' | 'all';
  includeAI?: boolean;
  maxInsights?: number;
}

export interface InsightGenerationResult {
  userId: string;
  insights: AIInsight[];
  summary: InsightSummary;
  generatedAt: Date;
  processingTimeMs: number;
  aiModelUsed?: string;
}

export interface InsightSummary {
  totalInsights: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<InsightType, number>;
  totalPotentialSavings: number;
  actionableInsights: number;
}

export interface ActionItem {
  id: string;
  action: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImpact: number; // $ savings
  estimatedTime: string; // e.g., "5 minutes", "1 hour"
  priority: number; // 1-5
}

