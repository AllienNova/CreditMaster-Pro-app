/**
 * Health Score V2 API Endpoint
 *
 * Enhanced health score calculation with investment data integration,
 * detailed breakdowns, trend analysis, and personalized recommendations.
 *
 * GET /api/financial/health-score/v2
 *   Query params:
 *   - userId: string (required)
 *   - includeProjections: boolean (optional, default: true)
 *   - includeBenchmarks: boolean (optional, default: true)
 *   - includeHistory: boolean (optional, default: true)
 *   - ageGroup: string (optional)
 *   - incomeGroup: string (optional)
 *
 * POST /api/financial/health-score/v2
 *   Body:
 *   - userId: string (required)
 *   - options: HealthScoreOptionsV2 (optional)
 *   - saveScore: boolean (optional, default: false)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { healthScoreCalculatorV2 } from "@/lib/financial/health-score-calculator-v2";
import { financialAggregationService } from "@/lib/financial/financial-aggregation-service";
import {
  HealthScoreOptionsV2,
  AgeGroup,
  IncomeGroup,
} from "@/lib/financial/types/health-score-v2.types";

/**
 * GET - Calculate health score V2 with query parameters
 */
export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || user.id;

    // Verify user can access this data (ownership check preserved)
    if (userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "Cannot access other user data" },
        { status: 403 },
      );
    }

    // Parse options from query params
    const options: HealthScoreOptionsV2 = {
      includeProjections: searchParams.get("includeProjections") !== "false",
      includeBenchmarks: searchParams.get("includeBenchmarks") !== "false",
      includeHistory: searchParams.get("includeHistory") !== "false",
    };

    const ageGroup = searchParams.get("ageGroup") as AgeGroup | null;
    if (ageGroup) options.ageGroup = ageGroup;

    const incomeGroup = searchParams.get("incomeGroup") as IncomeGroup | null;
    if (incomeGroup) options.incomeGroup = incomeGroup;

    // Get aggregated financial context
    const context =
      await financialAggregationService.getAggregatedContext(userId);

    // Calculate V2 health score
    const healthScore = await healthScoreCalculatorV2.calculateScore({
      context,
      options,
    });

    return NextResponse.json({
      success: true,
      data: healthScore,
      meta: {
        version: 2,
        calculatedAt: healthScore.calculatedAt,
        dataQuality: healthScore.dataQuality,
      },
    });
  } catch (_error) {
    // HealthScoreV2Route error: GET failed
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          _error instanceof Error
            ? _error.message
            : "Failed to calculate health score",
      },
      { status: 500 },
    );
  }
});

/**
 * POST - Calculate health score V2 with body options and optional save
 */
export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { userId, options = {}, saveScore = false } = body;

    // Use authenticated user's ID if not provided
    const targetUserId = userId || user.id;

    // Verify user can access this data (ownership check preserved)
    if (targetUserId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "Cannot access other user data" },
        { status: 403 },
      );
    }

    // Get aggregated financial context
    const context =
      await financialAggregationService.getAggregatedContext(targetUserId);

    // Calculate V2 health score
    const healthScore = await healthScoreCalculatorV2.calculateScore({
      context,
      options,
    });

    // Optionally save the score
    if (saveScore) {
      await healthScoreCalculatorV2.saveScore(targetUserId, healthScore);
    }

    return NextResponse.json({
      success: true,
      data: healthScore,
      meta: {
        version: 2,
        calculatedAt: healthScore.calculatedAt,
        dataQuality: healthScore.dataQuality,
        saved: saveScore,
      },
    });
  } catch (_error) {
    // HealthScoreV2Route error: POST failed
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          _error instanceof Error
            ? _error.message
            : "Failed to calculate health score",
      },
      { status: 500 },
    );
  }
});
