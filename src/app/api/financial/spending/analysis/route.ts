/**
 * Spending Analysis API Endpoint
 *
 * GET /api/financial/spending/analysis
 * AI-powered spending pattern analysis with behavioral insights
 *
 * Phase 2.3: Spending Intelligence
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpendingAnalyzer } from "@/lib/financial/spending-analyzer";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const AnalysisQuerySchema = z.object({
  period: z
    .enum(["weekly", "monthly", "quarterly", "yearly"])
    .optional()
    .default("monthly"),
  category: z.string().optional(),
  includeAI: z.enum(["true", "false"]).optional().default("true"),
});

// ============================================================================
// GET - Analyze Spending Patterns
// ============================================================================

/**
 * @swagger
 * /api/financial/spending/analysis:
 *   get:
 *     summary: Analyze spending patterns
 *     description: AI-powered analysis of spending patterns, habits, velocity, triggers, and health score
 *     tags: [Spending Intelligence]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, quarterly, yearly]
 *           default: monthly
 *         description: Analysis period
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by specific category
 *       - in: query
 *         name: includeAI
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Include AI-powered insights
 *     responses:
 *       200:
 *         description: Spending analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Spending pattern analysis with patterns, habits, velocity, triggers, and score
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
  // Apply middleware (rate limiting, CORS, logging). Auth is enforced by withAuth.
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
      period: searchParams.get("period") || "monthly",
      category: searchParams.get("category") || undefined,
      includeAI: searchParams.get("includeAI") || "true",
    };

    const validatedParams = AnalysisQuerySchema.parse(queryParams);

    // Get spending analyzer
    const analyzer = getSpendingAnalyzer();

    // Analyze spending patterns
    const analysis = await analyzer.analyzeSpendingPatterns(
      userId!,
      validatedParams.period as "weekly" | "monthly" | "quarterly" | "yearly",
    );

    return finalizeResponse(
      request,
      NextResponse.json({
        success: true,
        data: analysis,
        meta: {
          userId,
          period: validatedParams.period,
          generatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - middlewareStartTime,
        },
      }),
      middlewareStartTime,
      userId,
    );
  } catch (error) {
    console.error("Error analyzing spending patterns:", error);

    return finalizeResponse(
      request,
      NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to analyze spending patterns",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        },
        { status: 500 },
      ),
      middlewareStartTime,
      userId,
    );
  }
},
);
