/**
 * Financial Health Score API - Phase 1.5
 *
 * GET /api/financial/health-score - Get current health score
 * POST /api/financial/health-score - Calculate and save new score
 *
 * @swagger
 * /api/financial/health-score:
 *   get:
 *     summary: Get current financial health score
 *     description: Returns the most recent health score with optional historical data
 *     tags: [Health Score]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: history
 *         schema:
 *           type: boolean
 *         description: Include historical scores
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days of history to include
 *     responses:
 *       200:
 *         description: Health score retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Calculate and save new health score
 *     description: Forces recalculation of health score and optionally saves to database
 *     tags: [Health Score]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forceRecalculate:
 *                 type: boolean
 *                 description: Force recalculation even if recent score exists
 *     responses:
 *       200:
 *         description: Health score calculated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { healthScoreCalculatorV2 } from "@/lib/financial/health-score-calculator-v2";
import { financialAggregationService } from "@/lib/financial/financial-aggregation-service";
import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

/**
 * GET /api/financial/health-score
 * Returns the current financial health score with optional caching
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {

    const searchParams = request.nextUrl.searchParams;

    // Check if requesting history
    const includeHistory = searchParams.get("history") === "true";
    if (includeHistory) {
      const days = parseInt(searchParams.get("days") || "30", 10);
      const historicalScores = await healthScoreCalculatorV2.getScoreHistory(
        userId,
        days,
      );

      return NextResponse.json({
        success: true,
        data: {
          history: historicalScores,
          count: historicalScores.length,
        },
        _meta: {
          days,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Check for cached score (within last hour)
    const { data: cachedScore } = await supabase
      .from("financial_health_scores")
      .select("*")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isCacheValid =
      cachedScore && new Date(cachedScore.calculated_at) > oneHourAgo;

    if (isCacheValid) {
      // Return cached score
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set("Cache-Control", "private, max-age=3600");

      return NextResponse.json(
        {
          success: true,
          data: {
            overall: cachedScore.overall_score,
            grade: healthScoreCalculatorV2.getGrade(cachedScore.overall_score),
            categories: {
              savings: cachedScore.savings_score,
              debt: cachedScore.debt_score,
              spending: cachedScore.spending_score,
              credit: cachedScore.credit_score_component,
              investments: cachedScore.investment_score,
              insurance: cachedScore.insurance_score,
            },
            recommendations: cachedScore.recommendations || [],
            lastCalculated: cachedScore.calculated_at,
          },
          _meta: {
            cached: true,
            calculatedAt: cachedScore.calculated_at,
          },
        },
        { headers },
      );
    }

    // No valid cache, calculate new score
    const context =
      await financialAggregationService.getAggregatedContext(userId);
    const healthScore = await healthScoreCalculatorV2.calculateScore({
      context,
      options: {
        includeProjections: true,
        includeBenchmarks: true,
        includeHistory: false,
      },
    });

    // Save to database
    await healthScoreCalculatorV2.saveScore(userId, healthScore);

    return NextResponse.json({
      success: true,
      data: {
        overall: healthScore.overallScore,
        grade: healthScore.grade,
        categories: {
          savings: healthScore.breakdown.savings.score,
          debt: healthScore.breakdown.debt.score,
          spending: healthScore.breakdown.spending.score,
          credit: healthScore.breakdown.credit.score,
          investments: healthScore.breakdown.investments.score,
          insurance: healthScore.breakdown.insurance.score,
        },
        recommendations: healthScore.quickWins.map((qw) => ({
          title: qw.action,
          description: qw.timeframe,
          priority:
            qw.estimatedImprovement > 15
              ? "high"
              : qw.estimatedImprovement > 8
                ? "medium"
                : "low",
          expectedImpact: qw.estimatedImprovement,
          effort: qw.effort,
        })),
        comparisons: {
          percentile: healthScore.percentileRank,
          ageGroupPercentile: healthScore.ageGroupRank,
          incomeGroupPercentile: healthScore.incomeGroupRank,
        },
        lastCalculated: healthScore.calculatedAt.toISOString(),
      },
      _meta: {
        cached: false,
        calculatedAt: healthScore.calculatedAt.toISOString(),
      },
    });
  } catch (_error) {
    // HealthScoreRoute error: Failed to fetch score

    const errorMessage =
      _error instanceof Error ? _error.message : "Failed to fetch health score";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/financial/health-score
 * Calculate and save a new health score
 * Supports forceRecalculate parameter to bypass cache
 */
export const POST = withPermission(
  "financial:write",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { forceRecalculate = true } = body;

    // Check for recent calculation if not forcing recalculation
    if (!forceRecalculate) {
      const { data: recentScore } = await supabase
        .from("financial_health_scores")
        .select("*")
        .eq("user_id", userId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const hasRecentScore =
        recentScore && new Date(recentScore.calculated_at) > oneHourAgo;

      if (hasRecentScore) {
        // Return cached score
        return NextResponse.json({
          success: true,
          data: {
            overall: recentScore.overall_score,
            grade: healthScoreCalculatorV2.getGrade(recentScore.overall_score),
            categories: {
              savings: recentScore.savings_score,
              debt: recentScore.debt_score,
              spending: recentScore.spending_score,
              credit: recentScore.credit_score_component,
              investments: recentScore.investment_score,
              insurance: recentScore.insurance_score,
            },
            recommendations: recentScore.recommendations || [],
            lastCalculated: recentScore.calculated_at,
          },
          message:
            "Returning cached health score (calculated within last hour)",
          _meta: {
            cached: true,
            calculatedAt: recentScore.calculated_at,
            forceRecalculate: false,
          },
        });
      }
    }

    // Calculate new score
    const context =
      await financialAggregationService.getAggregatedContext(userId);
    const healthScore = await healthScoreCalculatorV2.calculateScore({
      context,
      options: {
        includeProjections: true,
        includeBenchmarks: true,
        includeHistory: true,
      },
    });

    // Save to database
    await healthScoreCalculatorV2.saveScore(userId, healthScore);

    return NextResponse.json({
      success: true,
      data: {
        overall: healthScore.overallScore,
        grade: healthScore.grade,
        categories: {
          savings: healthScore.breakdown.savings.score,
          debt: healthScore.breakdown.debt.score,
          spending: healthScore.breakdown.spending.score,
          credit: healthScore.breakdown.credit.score,
          investments: healthScore.breakdown.investments.score,
          insurance: healthScore.breakdown.insurance.score,
        },
        recommendations: healthScore.quickWins.map((qw) => ({
          title: qw.action,
          description: qw.timeframe,
          priority:
            qw.estimatedImprovement > 15
              ? "high"
              : qw.estimatedImprovement > 8
                ? "medium"
                : "low",
          expectedImpact: qw.estimatedImprovement,
          effort: qw.effort,
          category: qw.component,
        })),
        comparisons: {
          percentile: healthScore.percentileRank,
          ageGroupPercentile: healthScore.ageGroupRank,
          incomeGroupPercentile: healthScore.incomeGroupRank,
        },
        trend: {
          direction: healthScore.trendDirection,
          percent: healthScore.trendPercent,
          projected30Days: healthScore.projectedScore30Days,
          projected90Days: healthScore.projectedScore90Days,
        },
        lastCalculated: healthScore.calculatedAt.toISOString(),
      },
      message: "Health score calculated and saved successfully",
      _meta: {
        cached: false,
        calculatedAt: healthScore.calculatedAt.toISOString(),
        forceRecalculate,
      },
    });
  } catch (_error) {
    // HealthScoreRoute error: Failed to calculate score

    const errorMessage =
      _error instanceof Error
        ? _error.message
        : "Failed to calculate health score";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        _meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
},
);
