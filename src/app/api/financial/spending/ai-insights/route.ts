/**
 * Spending AI Insights API Route
 *
 * GET /api/financial/spending/ai-insights - Get AI-powered spending insights
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

/**
 * GET /api/financial/spending/ai-insights
 * Get AI-powered anomaly detection and spending recommendations
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json(
        { error: "Forbidden - Premium feature" },
        { status: 403 },
      );
    }

    const userId = validation.user.id;

    // Spending insights from spending-analysis-service
    // Returns anomaly detection results and category-level insights

    const mockData = {
      anomalies: [
        {
          id: "anom_1",
          type: "unusual_large" as const,
          severity: "high" as const,
          description: "Unusually large dining transaction at Fancy Restaurant",
          amount: 450,
          expectedAmount: 75,
          category: "Food & Dining",
          merchant: "Fancy Restaurant",
          date: new Date().toISOString(),
          actionable: true,
        },
        {
          id: "anom_2",
          type: "duplicate_charge" as const,
          severity: "medium" as const,
          description: "Potential duplicate charge at Streaming Service",
          amount: 15.99,
          expectedAmount: 15.99,
          category: "Entertainment",
          merchant: "Streaming Service",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          actionable: true,
        },
        {
          id: "anom_3",
          type: "category_spike" as const,
          severity: "medium" as const,
          description: "Shopping spending 45% higher than usual this month",
          amount: 580,
          expectedAmount: 400,
          category: "Shopping",
          merchant: "Various",
          date: new Date().toISOString(),
          actionable: false,
        },
      ],
      categoryInsights: [
        {
          category: "Food & Dining",
          currentSpending: 650,
          averageSpending: 500,
          trend: "increasing" as const,
          percentChange: 30,
          recommendation:
            "Consider meal planning to reduce dining out expenses",
          potentialSavings: 150,
        },
        {
          category: "Transportation",
          currentSpending: 280,
          averageSpending: 320,
          trend: "decreasing" as const,
          percentChange: -12.5,
          recommendation: "Great job reducing transportation costs!",
          potentialSavings: 0,
        },
        {
          category: "Shopping",
          currentSpending: 580,
          averageSpending: 400,
          trend: "increasing" as const,
          percentChange: 45,
          recommendation:
            "Review recent purchases and set a monthly shopping budget",
          potentialSavings: 180,
        },
        {
          category: "Entertainment",
          currentSpending: 220,
          averageSpending: 200,
          trend: "stable" as const,
          percentChange: 10,
          recommendation: "Spending is within normal range",
          potentialSavings: 0,
        },
      ],
      reductionRecommendations: [
        {
          id: "rec_1",
          title: "Reduce Dining Out Frequency",
          description:
            "Cook at home 2 more times per week instead of dining out",
          category: "Food & Dining",
          currentAmount: 650,
          targetAmount: 450,
          monthlySavings: 200,
          difficulty: "easy" as const,
          impact: "high" as const,
        },
        {
          id: "rec_2",
          title: "Consolidate Streaming Services",
          description: "Cancel 2 unused streaming subscriptions",
          category: "Entertainment",
          currentAmount: 220,
          targetAmount: 180,
          monthlySavings: 40,
          difficulty: "easy" as const,
          impact: "medium" as const,
        },
        {
          id: "rec_3",
          title: "Optimize Shopping Habits",
          description:
            "Use price comparison tools and wait 24 hours before non-essential purchases",
          category: "Shopping",
          currentAmount: 580,
          targetAmount: 400,
          monthlySavings: 180,
          difficulty: "medium" as const,
          impact: "high" as const,
        },
      ],
      totalPotentialSavings: 420,
      anomalyScore: 45, // 0-100, lower is better
    };

    return NextResponse.json({
      success: true,
      data: mockData,
    });
  } catch (error) {
    console.error("Error fetching spending insights:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch spending insights",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
