/**
 * Spending Forecast Types
 *
 * Types for ML-based spending prediction and forecasting
 */

// ============================================================================
// FORECAST TYPES
// ============================================================================

export interface SpendingForecast {
  forecastId: string;
  userId: string;
  generatedAt: Date;
  forecastPeriod: ForecastPeriod;
  predictions: MonthlyPrediction[];
  categoryForecasts: CategoryForecast[];
  accuracy: ForecastAccuracy;
  insights: ForecastInsight[];
  recommendations: string[];
}

export interface ForecastPeriod {
  startDate: Date;
  endDate: Date;
  months: number;
}

export interface MonthlyPrediction {
  month: string;
  monthLabel: string;
  predictedSpending: number;
  predictedIncome: number;
  predictedNetFlow: number;
  confidenceInterval: ConfidenceInterval;
  trend: "increasing" | "decreasing" | "stable";
  seasonalFactor: number;
}

export interface ConfidenceInterval {
  low: number;
  high: number;
  confidence: number; // 0-1, typically 0.95 for 95% CI
}

export interface CategoryForecast {
  category: string;
  displayName: string;
  currentMonthlyAvg: number;
  predictedMonthlyAvg: number;
  trend: "increasing" | "decreasing" | "stable";
  percentChange: number;
  confidenceInterval: ConfidenceInterval;
  seasonalPattern?: SeasonalPattern;
}

export interface SeasonalPattern {
  type: "monthly" | "quarterly" | "annual";
  peakMonths: number[];
  lowMonths: number[];
  variancePercent: number;
}

export interface ForecastAccuracy {
  overallScore: number; // 0-100
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  dataQuality: "excellent" | "good" | "fair" | "poor";
  historicalMonths: number;
  lastValidation?: Date;
}

export interface ForecastInsight {
  id: string;
  type: ForecastInsightType;
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  relatedCategory?: string;
  potentialSavings?: number;
}

export type ForecastInsightType =
  | "spending_spike_predicted"
  | "savings_opportunity"
  | "budget_risk"
  | "seasonal_pattern"
  | "trend_change"
  | "anomaly_expected"
  | "goal_impact";

// ============================================================================
// FORECAST OPTIONS
// ============================================================================

export interface ForecastOptions {
  months?: number; // Number of months to forecast (default: 3)
  includeSeasonality?: boolean; // Include seasonal adjustments
  includeCategories?: boolean; // Include category-level forecasts
  confidenceLevel?: number; // Confidence level for intervals (default: 0.95)
  historicalMonths?: number; // Months of history to use (default: 12)
}

// ============================================================================
// HISTORICAL DATA FOR ML
// ============================================================================

export interface HistoricalSpendingData {
  month: string;
  totalSpending: number;
  totalIncome: number;
  netFlow: number;
  byCategory: Record<string, number>;
  transactionCount: number;
  dayOfWeekPattern: number[];
  weekOfMonthPattern: number[];
}

export interface MLFeatures {
  monthIndex: number;
  monthOfYear: number;
  quarterOfYear: number;
  isHolidaySeason: boolean;
  daysSinceStart: number;
  rollingAvg3: number;
  rollingAvg6: number;
  trend: number;
  seasonalIndex: number;
}

// ============================================================================
// FORECAST VS ACTUAL COMPARISON
// ============================================================================

export interface ForecastComparison {
  month: string;
  predicted: number;
  actual: number;
  difference: number;
  percentError: number;
  withinConfidenceInterval: boolean;
}

export interface ForecastValidation {
  comparisons: ForecastComparison[];
  overallAccuracy: number;
  categoryAccuracy: Record<string, number>;
  improvementSuggestions: string[];
}
