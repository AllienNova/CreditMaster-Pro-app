/**
 * Spending Trends API Endpoint
 *
 * GET /api/financial/spending/trends
 * Spending trend analysis with forecasting and seasonality
 *
 * Phase 2.3: Spending Intelligence
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpendingAnalyzer } from "@/lib/financial/spending-analyzer";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const TrendsQuerySchema = z.object({
  period: z.string().optional().default("3m"), // e.g., "3m", "6m", "1y"
  categories: z.string().optional(), // Comma-separated list
  compareWith: z
    .enum(["previous", "average", "budget"])
    .optional()
    .default("previous"),
});

// ============================================================================
// GET - Get Spending Trends
// ============================================================================

/**
 * @swagger
 * /api/financial/spending/trends:
 *   get:
 *     summary: Get spending trends
 *     description: Analyze spending trends over time with category breakdowns, forecasting, and period comparisons
 *     tags: [Spending Intelligence]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: 3m
 *         description: Analysis period (e.g., "3m", "6m", "1y", "30d")
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Comma-separated list of categories to analyze
 *       - in: query
 *         name: compareWith
 *         schema:
 *           type: string
 *           enum: [previous, average, budget]
 *           default: previous
 *         description: Comparison baseline
 *     responses:
 *       200:
 *         description: Spending trends retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Spending trend analysis with category trends, forecasts, and comparisons
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Apply middleware (auth, rate limiting, CORS, logging)
  const middleware = await applyFinancialAPIMiddleware(request, {
    requireAuth: true,
    rateLimit: true,
    cors: true,
    logging: true,
  });

  if (middleware.error) {
    return middleware.error;
  }

  const { userId, startTime: middlewareStartTime } = middleware;

  try {
    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get("period") || "3m",
      categories: searchParams.get("categories") || undefined,
      compareWith: searchParams.get("compareWith") || "previous",
    };

    const validatedParams = TrendsQuerySchema.parse(queryParams);

    // Parse categories
    const categories = validatedParams.categories
      ? validatedParams.categories.split(",").map((c) => c.trim())
      : undefined;

    // Get spending analyzer
    const analyzer = getSpendingAnalyzer();

    // Get spending trends
    const trends = await analyzer.getSpendingTrends(
      userId!,
      validatedParams.period,
      categories,
    );

    return finalizeResponse(
      request,
      NextResponse.json({
        success: true,
        data: trends,
        meta: {
          userId,
          period: validatedParams.period,
          categoriesAnalyzed: categories?.length || "all",
          compareWith: validatedParams.compareWith,
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - middlewareStartTime,
        },
      }),
      middlewareStartTime,
      userId,
    );
  } catch (error) {
    console.error("Error analyzing spending trends:", error);

    return finalizeResponse(
      request,
      NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to analyze spending trends",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        },
        { status: 500 },
      ),
      middlewareStartTime,
      userId,
    );
  }
}
