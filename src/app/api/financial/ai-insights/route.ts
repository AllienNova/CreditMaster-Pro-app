/**
 * AI Insights Panel API
 * Combines insights, predictions, and health score for dashboard display
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { smartInsightsEngine } from "@/lib/financial/smart-insights-engine";
import { vitalityScoreService } from "@/lib/financial/vitality-score-service";
import { spendingForecastService } from "@/lib/financial/spending-forecast-service";

export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    // Fetch insights
    const insightsResult = await smartInsightsEngine.generateInsights(userId, {
      limit: 4,
      includeAI: true,
      minPriority: "medium",
    });

    // Transform insights to match panel format
    const insights = insightsResult.insights.map((insight: any) => ({
      id: insight.id,
      type: mapInsightType(insight.type),
      title: insight.title,
      description: insight.description,
      impact:
        insight.priority === "critical"
          ? "high"
          : insight.priority === "high"
            ? "high"
            : insight.priority === "medium"
              ? "medium"
              : "low",
      actionable: !!insight.actionUrl,
      actionUrl: insight.actionUrl,
      actionLabel: insight.actionLabel,
    }));

    // Real predictive metrics + health score, sourced from the vitality-score
    // and spending-forecast services (both were previously hardcoded).
    const [vitality, forecast] = await Promise.all([
      vitalityScoreService.calculateVitalityScore(userId),
      spendingForecastService.generateForecast(userId, {
        months: 1,
        includeCategories: true,
      }),
    ]);

    // Build the one prediction we can source honestly from the forecast model:
    // current = sum of per-category current monthly averages, predicted = the
    // next month's forecast. Empty when the model has no prediction (no fake row).
    const nextMonth = forecast.predictions[0];
    const predictions = nextMonth
      ? [
          {
            metric: "Monthly Spending",
            currentValue: Math.round(
              forecast.categoryForecasts.reduce(
                (sum, category) => sum + category.currentMonthlyAvg,
                0,
              ),
            ),
            predictedValue: Math.round(nextMonth.predictedSpending),
            timeframe: nextMonth.monthLabel || "Next Month",
            confidence: Math.round(
              nextMonth.confidenceInterval.confidence * 100,
            ),
            trend:
              nextMonth.trend === "increasing"
                ? "up"
                : nextMonth.trend === "decreasing"
                  ? "down"
                  : "stable",
          },
        ]
      : [];

    // vitality.trend is already "improving" | "stable" | "declining" — the exact
    // union the panel renders, so no remapping is needed.
    const healthScore = vitality.overall;
    const healthTrend = vitality.trend;

    // Get top recommendation
    const topRecommendation =
      insights.length > 0
        ? insights[0].title
        : "Keep up the great work! Your finances are on track.";

    return NextResponse.json({
      success: true,
      data: {
        insights,
        predictions,
        healthScore,
        healthTrend,
        topRecommendation,
      },
      _meta: {
        generatedAt: new Date().toISOString(),
        dataSourcesUsed: ["insights", "vitality-score", "spending-forecast"],
      },
    });
  } catch (error) {
    console.error("Error fetching AI insights panel data:", error);

    // Return fallback data instead of error for better UX
    return NextResponse.json({
      // Degraded, and SAYS SO. This used to answer a failed upstream call with
      // `success: false`, which is indistinguishable from a real empty result —
      // the caller could not tell a genuine "no insights yet" from an outage.
      degraded: true,
      success: true,
      data: {
        insights: [],
        predictions: [],
        healthScore: 0,
        healthTrend: "stable",
        topRecommendation:
          "Connect your accounts to get personalized AI insights",
      },
      _meta: {
        generatedAt: new Date().toISOString(),
        fallback: true,
      },
    });
  }
},
);

// Helper function to map insight types
function mapInsightType(
  type: string,
): "opportunity" | "warning" | "tip" | "prediction" {
  switch (type) {
    case "opportunity":
    case "savings_opportunity":
      return "opportunity";
    case "warning":
    case "overspending":
    case "budget_alert":
      return "warning";
    case "tip":
    case "recommendation":
      return "tip";
    case "prediction":
    case "forecast":
      return "prediction";
    default:
      return "tip";
  }
}
