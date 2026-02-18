/**
 * Spending Forecast Service
 *
 * ML-based spending prediction using historical data analysis,
 * trend detection, and seasonal pattern recognition.
 */

import { spendingAnalysisService } from "./spending-analysis-service";
import {
  CATEGORY_DISPLAY_NAMES,
  BudgetCategoryValue,
} from "./types/budget.types";
import type {
  SpendingForecast,
  ForecastPeriod,
  MonthlyPrediction,
  CategoryForecast,
  ForecastAccuracy,
  ForecastInsight,
  ForecastOptions,
  HistoricalSpendingData,
  ConfidenceInterval,
  SeasonalPattern,
  ForecastComparison,
  ForecastValidation,
} from "./types/forecast.types";

// ============================================================================
// CONSTANTS
// ============================================================================

const HOLIDAY_MONTHS = [11, 12]; // November, December
const DEFAULT_CONFIDENCE_LEVEL = 0.95;
const MIN_HISTORICAL_MONTHS = 3;

// ============================================================================
// SPENDING FORECAST SERVICE CLASS
// ============================================================================

class SpendingForecastService {
  /**
   * Generate spending forecast for a user
   */
  async generateForecast(
    userId: string,
    options: ForecastOptions = {},
  ): Promise<SpendingForecast> {
    const {
      months = 3,
      includeSeasonality = true,
      includeCategories = true,
      confidenceLevel = DEFAULT_CONFIDENCE_LEVEL,
      historicalMonths = 12,
    } = options;

    // Get historical data
    const historicalData = await this.getHistoricalData(
      userId,
      historicalMonths,
    );

    // Calculate forecast accuracy based on data quality
    const accuracy = this.calculateAccuracy(historicalData);

    // Generate monthly predictions
    const predictions = this.generateMonthlyPredictions(
      historicalData,
      months,
      includeSeasonality,
      confidenceLevel,
    );

    // Generate category forecasts if requested
    const categoryForecasts = includeCategories
      ? this.generateCategoryForecasts(historicalData, months, confidenceLevel)
      : [];

    // Generate insights
    const insights = this.generateInsights(
      predictions,
      categoryForecasts,
      historicalData,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      predictions,
      categoryForecasts,
    );

    const now = new Date();
    const forecastStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const forecastEnd = new Date(
      now.getFullYear(),
      now.getMonth() + months + 1,
      0,
    );

    return {
      forecastId: `forecast_${userId}_${Date.now()}`,
      userId,
      generatedAt: now,
      forecastPeriod: {
        startDate: forecastStart,
        endDate: forecastEnd,
        months,
      },
      predictions,
      categoryForecasts,
      accuracy,
      insights,
      recommendations,
    };
  }

  /**
   * Get historical spending data for ML analysis
   */
  private async getHistoricalData(
    userId: string,
    months: number,
  ): Promise<HistoricalSpendingData[]> {
    const data: HistoricalSpendingData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      try {
        const analysis = await spendingAnalysisService.analyzeSpending(userId, {
          startDate: monthStart,
          endDate: monthEnd,
        });

        const byCategory: Record<string, number> = {};
        analysis.byCategory.forEach((cat) => {
          byCategory[cat.category] = cat.amount;
        });

        data.push({
          month: monthStart.toISOString().slice(0, 7),
          totalSpending: analysis.totalSpending,
          totalIncome: analysis.totalIncome,
          netFlow: analysis.netCashFlow,
          byCategory,
          transactionCount: analysis.byCategory.reduce(
            (sum, c) => sum + c.transactionCount,
            0,
          ),
          dayOfWeekPattern: this.calculateDayOfWeekPattern(analysis.byCategory),
          weekOfMonthPattern: this.calculateWeekOfMonthPattern(
            analysis.byCategory,
          ),
        });
      } catch {
        // If no data for a month, add empty entry
        data.push({
          month: monthStart.toISOString().slice(0, 7),
          totalSpending: 0,
          totalIncome: 0,
          netFlow: 0,
          byCategory: {},
          transactionCount: 0,
          dayOfWeekPattern: [0, 0, 0, 0, 0, 0, 0],
          weekOfMonthPattern: [0, 0, 0, 0, 0],
        });
      }
    }

    return data;
  }

  /**
   * Calculate day of week spending pattern (placeholder)
   */
  private calculateDayOfWeekPattern(_categories: unknown[]): number[] {
    // In a real implementation, this would analyze transaction dates
    return [0.12, 0.14, 0.15, 0.15, 0.16, 0.18, 0.1]; // Sun-Sat
  }

  /**
   * Calculate week of month spending pattern (placeholder)
   */
  private calculateWeekOfMonthPattern(_categories: unknown[]): number[] {
    // In a real implementation, this would analyze transaction dates
    return [0.25, 0.2, 0.2, 0.2, 0.15]; // Week 1-5
  }

  /**
   * Calculate forecast accuracy based on data quality
   */
  private calculateAccuracy(
    historicalData: HistoricalSpendingData[],
  ): ForecastAccuracy {
    const validMonths = historicalData.filter(
      (d) => d.totalSpending > 0,
    ).length;
    const totalMonths = historicalData.length;

    let dataQuality: "excellent" | "good" | "fair" | "poor";
    if (validMonths >= 12) dataQuality = "excellent";
    else if (validMonths >= 6) dataQuality = "good";
    else if (validMonths >= 3) dataQuality = "fair";
    else dataQuality = "poor";

    const { mape, rmse } = this.calculateErrorMetrics(historicalData);
    const dataQualityScore = (validMonths / Math.max(totalMonths, 12)) * 50;
    const errorScore = Math.max(0, 50 - mape);
    const overallScore = Math.round(dataQualityScore + errorScore);

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      mape,
      rmse,
      dataQuality,
      historicalMonths: validMonths,
      lastValidation: new Date(),
    };
  }

  private calculateErrorMetrics(data: HistoricalSpendingData[]): {
    mape: number;
    rmse: number;
  } {
    const validData = data.filter((d) => d.totalSpending > 0);
    if (validData.length < MIN_HISTORICAL_MONTHS) {
      return { mape: 50, rmse: 1000 };
    }

    const errors: number[] = [];
    const squaredErrors: number[] = [];

    for (let i = 2; i < validData.length; i++) {
      const trainingData = validData.slice(0, i);
      const actual = validData[i].totalSpending;
      const predicted = this.simpleMovingAverage(
        trainingData.map((d) => d.totalSpending),
      );

      if (actual > 0) {
        const error = Math.abs(actual - predicted) / actual;
        errors.push(error * 100);
        squaredErrors.push(Math.pow(actual - predicted, 2));
      }
    }

    const mape =
      errors.length > 0
        ? errors.reduce((a, b) => a + b, 0) / errors.length
        : 50;
    const rmse =
      squaredErrors.length > 0
        ? Math.sqrt(
            squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length,
          )
        : 1000;

    return {
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
    };
  }

  private simpleMovingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private linearRegression(values: number[]): {
    slope: number;
    intercept: number;
  } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0 };

    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculateSeasonalIndex(
    monthOfYear: number,
    historicalData: HistoricalSpendingData[],
  ): number {
    const monthData = historicalData.filter((d) => {
      const month = new Date(d.month + "-01").getMonth() + 1;
      return month === monthOfYear;
    });

    if (monthData.length === 0) return 1.0;

    const avgMonthSpending = this.simpleMovingAverage(
      monthData.map((d) => d.totalSpending),
    );
    const avgOverallSpending = this.simpleMovingAverage(
      historicalData
        .filter((d) => d.totalSpending > 0)
        .map((d) => d.totalSpending),
    );

    if (avgOverallSpending === 0) return 1.0;
    return avgMonthSpending / avgOverallSpending;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.simpleMovingAverage(values);
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  private getZScore(confidenceLevel: number): number {
    if (confidenceLevel >= 0.99) return 2.576;
    if (confidenceLevel >= 0.95) return 1.96;
    if (confidenceLevel >= 0.9) return 1.645;
    return 1.28;
  }

  /**
   * Generate monthly predictions
   */
  private generateMonthlyPredictions(
    historicalData: HistoricalSpendingData[],
    months: number,
    includeSeasonality: boolean,
    confidenceLevel: number,
  ): MonthlyPrediction[] {
    const predictions: MonthlyPrediction[] = [];
    const validData = historicalData.filter((d) => d.totalSpending > 0);

    if (validData.length < MIN_HISTORICAL_MONTHS) {
      const avgSpending = this.simpleMovingAverage(
        validData.map((d) => d.totalSpending),
      );
      const avgIncome = this.simpleMovingAverage(
        validData.map((d) => d.totalIncome),
      );

      const now = new Date();
      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        predictions.push({
          month: forecastDate.toISOString().slice(0, 7),
          monthLabel: forecastDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          predictedSpending: Math.round(avgSpending * 100) / 100,
          predictedIncome: Math.round(avgIncome * 100) / 100,
          predictedNetFlow: Math.round((avgIncome - avgSpending) * 100) / 100,
          confidenceInterval: {
            low: avgSpending * 0.7,
            high: avgSpending * 1.3,
            confidence: 0.5,
          },
          trend: "stable",
          seasonalFactor: 1.0,
        });
      }
      return predictions;
    }

    const spendingValues = validData.map((d) => d.totalSpending);
    const incomeValues = validData.map((d) => d.totalIncome);
    const { slope: spendingSlope, intercept: spendingIntercept } =
      this.linearRegression(spendingValues);
    const { slope: incomeSlope, intercept: incomeIntercept } =
      this.linearRegression(incomeValues);
    const spendingStdDev = this.calculateStdDev(spendingValues);
    const zScore = this.getZScore(confidenceLevel);

    const now = new Date();
    const baseIndex = validData.length;

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthOfYear = forecastDate.getMonth() + 1;
      const forecastIndex = baseIndex + i - 1;

      let predictedSpending = spendingIntercept + spendingSlope * forecastIndex;
      let predictedIncome = incomeIntercept + incomeSlope * forecastIndex;

      let seasonalFactor = 1.0;
      if (includeSeasonality) {
        seasonalFactor = this.calculateSeasonalIndex(
          monthOfYear,
          historicalData,
        );
        if (HOLIDAY_MONTHS.includes(monthOfYear)) {
          seasonalFactor *= 1.15;
        }
        predictedSpending *= seasonalFactor;
      }

      predictedSpending = Math.max(0, predictedSpending);
      predictedIncome = Math.max(0, predictedIncome);

      const margin =
        zScore * spendingStdDev * Math.sqrt(1 + 1 / validData.length + i * 0.1);
      const confidenceInterval: ConfidenceInterval = {
        low: Math.max(0, Math.round((predictedSpending - margin) * 100) / 100),
        high: Math.round((predictedSpending + margin) * 100) / 100,
        confidence: confidenceLevel,
      };

      const trend =
        spendingSlope > spendingStdDev * 0.1
          ? "increasing"
          : spendingSlope < -spendingStdDev * 0.1
            ? "decreasing"
            : "stable";

      predictions.push({
        month: forecastDate.toISOString().slice(0, 7),
        monthLabel: forecastDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        predictedSpending: Math.round(predictedSpending * 100) / 100,
        predictedIncome: Math.round(predictedIncome * 100) / 100,
        predictedNetFlow:
          Math.round((predictedIncome - predictedSpending) * 100) / 100,
        confidenceInterval,
        trend,
        seasonalFactor: Math.round(seasonalFactor * 100) / 100,
      });
    }

    return predictions;
  }

  /**
   * Generate category-level forecasts
   */
  private generateCategoryForecasts(
    historicalData: HistoricalSpendingData[],
    months: number,
    confidenceLevel: number,
  ): CategoryForecast[] {
    const categoryForecasts: CategoryForecast[] = [];
    const validData = historicalData.filter((d) => d.totalSpending > 0);

    if (validData.length < MIN_HISTORICAL_MONTHS) return [];

    const allCategories = new Set<string>();
    validData.forEach((d) => {
      Object.keys(d.byCategory).forEach((cat) => allCategories.add(cat));
    });

    for (const category of Array.from(allCategories)) {
      const categoryValues = validData.map((d) => d.byCategory[category] || 0);
      const currentMonthlyAvg = this.simpleMovingAverage(categoryValues);

      if (currentMonthlyAvg === 0) continue;

      const { slope } = this.linearRegression(categoryValues);
      const stdDev = this.calculateStdDev(categoryValues);

      const predictedMonthlyAvg = currentMonthlyAvg + slope * (months / 2);
      const percentChange =
        currentMonthlyAvg > 0
          ? ((predictedMonthlyAvg - currentMonthlyAvg) / currentMonthlyAvg) *
            100
          : 0;

      const trend =
        slope > stdDev * 0.1
          ? "increasing"
          : slope < -stdDev * 0.1
            ? "decreasing"
            : "stable";

      const zScore = this.getZScore(confidenceLevel);
      const margin = zScore * stdDev;
      const confidenceInterval: ConfidenceInterval = {
        low: Math.max(
          0,
          Math.round((predictedMonthlyAvg - margin) * 100) / 100,
        ),
        high: Math.round((predictedMonthlyAvg + margin) * 100) / 100,
        confidence: confidenceLevel,
      };

      categoryForecasts.push({
        category,
        displayName:
          CATEGORY_DISPLAY_NAMES[category as BudgetCategoryValue] || category,
        currentMonthlyAvg: Math.round(currentMonthlyAvg * 100) / 100,
        predictedMonthlyAvg:
          Math.round(Math.max(0, predictedMonthlyAvg) * 100) / 100,
        trend,
        percentChange: Math.round(percentChange * 100) / 100,
        confidenceInterval,
      });
    }

    return categoryForecasts.sort(
      (a, b) => b.predictedMonthlyAvg - a.predictedMonthlyAvg,
    );
  }

  /**
   * Generate forecast insights
   */
  private generateInsights(
    predictions: MonthlyPrediction[],
    categoryForecasts: CategoryForecast[],
    historicalData: HistoricalSpendingData[],
  ): ForecastInsight[] {
    const insights: ForecastInsight[] = [];
    let insightId = 0;

    const avgHistorical = this.simpleMovingAverage(
      historicalData
        .filter((d) => d.totalSpending > 0)
        .map((d) => d.totalSpending),
    );

    predictions.forEach((pred) => {
      if (pred.predictedSpending > avgHistorical * 1.2) {
        insights.push({
          id: `insight_${++insightId}`,
          type: "spending_spike_predicted",
          title: `Higher spending expected in ${pred.monthLabel}`,
          description: `Predicted spending of $${pred.predictedSpending.toFixed(0)} is ${Math.round(((pred.predictedSpending - avgHistorical) / avgHistorical) * 100)}% above your average.`,
          impact: "negative",
          confidence: pred.confidenceInterval.confidence,
        });
      }
    });

    categoryForecasts.forEach((cat) => {
      if (cat.trend === "increasing" && cat.percentChange > 15) {
        insights.push({
          id: `insight_${++insightId}`,
          type: "trend_change",
          title: `${cat.displayName} spending is trending up`,
          description: `Expected to increase by ${cat.percentChange.toFixed(0)}% based on recent patterns.`,
          impact: "negative",
          confidence: cat.confidenceInterval.confidence,
          relatedCategory: cat.category,
        });
      } else if (cat.trend === "decreasing" && cat.percentChange < -15) {
        insights.push({
          id: `insight_${++insightId}`,
          type: "savings_opportunity",
          title: `${cat.displayName} spending is decreasing`,
          description: `You're on track to save ${Math.abs(cat.percentChange).toFixed(0)}% in this category.`,
          impact: "positive",
          confidence: cat.confidenceInterval.confidence,
          relatedCategory: cat.category,
          potentialSavings: Math.abs(
            cat.currentMonthlyAvg - cat.predictedMonthlyAvg,
          ),
        });
      }
    });

    const negativeFlowMonths = predictions.filter(
      (p) => p.predictedNetFlow < 0,
    );
    if (negativeFlowMonths.length > 0) {
      insights.push({
        id: `insight_${++insightId}`,
        type: "budget_risk",
        title: "Negative cash flow predicted",
        description: `${negativeFlowMonths.length} month(s) may have expenses exceeding income.`,
        impact: "negative",
        confidence: 0.85,
      });
    }

    return insights.slice(0, 6);
  }

  /**
   * Generate recommendations based on forecast
   */
  private generateRecommendations(
    predictions: MonthlyPrediction[],
    categoryForecasts: CategoryForecast[],
  ): string[] {
    const recommendations: string[] = [];

    const avgPredictedSpending = this.simpleMovingAverage(
      predictions.map((p) => p.predictedSpending),
    );
    const firstPrediction = predictions[0];
    const lastPrediction = predictions[predictions.length - 1];

    if (lastPrediction && firstPrediction) {
      const spendingTrend =
        lastPrediction.predictedSpending - firstPrediction.predictedSpending;
      if (spendingTrend > avgPredictedSpending * 0.1) {
        recommendations.push(
          "Your spending is trending upward. Review discretionary expenses to maintain your budget.",
        );
      }
    }

    const highGrowthCategories = categoryForecasts.filter(
      (c) => c.trend === "increasing" && c.percentChange > 20,
    );
    if (highGrowthCategories.length > 0) {
      const categoryNames = highGrowthCategories
        .slice(0, 2)
        .map((c) => c.displayName)
        .join(" and ");
      recommendations.push(
        `Consider setting stricter budgets for ${categoryNames} to control spending growth.`,
      );
    }

    const holidayPredictions = predictions.filter((p) => {
      const month = new Date(p.month + "-01").getMonth() + 1;
      return HOLIDAY_MONTHS.includes(month);
    });
    if (holidayPredictions.length > 0) {
      recommendations.push(
        "Holiday season spending is typically higher. Start saving now to prepare for increased expenses.",
      );
    }

    const negativeFlowMonths = predictions.filter(
      (p) => p.predictedNetFlow < 0,
    );
    if (negativeFlowMonths.length > 0) {
      recommendations.push(
        "Some months show predicted negative cash flow. Build an emergency fund or reduce planned expenses.",
      );
    }

    const avgNetFlow = this.simpleMovingAverage(
      predictions.map((p) => p.predictedNetFlow),
    );
    if (avgNetFlow > 0) {
      recommendations.push(
        `You're projected to save $${avgNetFlow.toFixed(0)}/month on average. Consider automating transfers to savings.`,
      );
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Get forecast summary for dashboard widget
   */
  async getForecastSummary(userId: string): Promise<{
    nextMonthPredicted: number;
    trend: "increasing" | "decreasing" | "stable";
    confidence: number;
    topGrowingCategory: string | null;
    potentialSavings: number;
  }> {
    const forecast = await this.generateForecast(userId, {
      months: 1,
      includeCategories: true,
    });

    const nextMonth = forecast.predictions[0];
    const topGrowing = forecast.categoryForecasts.find(
      (c) => c.trend === "increasing",
    );
    const savingsOpportunities = forecast.categoryForecasts.filter(
      (c) => c.trend === "decreasing",
    );
    const potentialSavings = savingsOpportunities.reduce(
      (sum, c) => sum + Math.abs(c.currentMonthlyAvg - c.predictedMonthlyAvg),
      0,
    );

    return {
      nextMonthPredicted: nextMonth?.predictedSpending || 0,
      trend: nextMonth?.trend || "stable",
      confidence: forecast.accuracy.overallScore / 100,
      topGrowingCategory: topGrowing?.displayName || null,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const spendingForecastService = new SpendingForecastService();
export default spendingForecastService;
