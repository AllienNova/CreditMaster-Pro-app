/**
 * Savings Analysis API Endpoint
 *
 * GET /api/financial/savings/analyze
 * Comprehensive spending analysis for savings opportunities
 *
 * Phase 2.2: Savings Optimizer
 */

import { NextRequest, NextResponse } from "next/server";
import { getSavingsOptimizer } from "@/lib/financial/savings-optimizer";
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

const AnalyzeQuerySchema = z.object({
  period: z
    .enum(["monthly", "quarterly", "yearly"])
    .optional()
    .default("monthly"),
});

// ============================================================================
// GET - Analyze Spending for Savings Opportunities
// ============================================================================

/**
 * @swagger
 * /api/financial/savings/analyze:
 *   get:
 *     summary: Analyze spending for savings opportunities
 *     description: Comprehensive analysis of spending patterns to identify savings opportunities, recurring charges, and subscription recommendations
 *     tags: [Savings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly]
 *           default: monthly
 *         description: Analysis period
 *     responses:
 *       200:
 *         description: Savings analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Savings analysis with opportunities, recurring charges, and recommendations
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

  const userId = middleware.userId!;

  try {
    // Validate JWT and permissions
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json(
        { success: false, error: "Forbidden - Insufficient permissions" },
        { status: 403 },
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get("period") || "monthly",
    };

    const validationResult = AnalyzeQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { period } = validationResult.data;

    // Analyze spending for savings
    const savingsOptimizer = getSavingsOptimizer();
    const analysis = await savingsOptimizer.analyzeSpendingForSavings(
      userId,
      period,
    );

    const response = NextResponse.json(
      {
        success: true,
        data: analysis,
        _meta: {
          period,
          generatedAt: new Date().toISOString(),
          opportunitiesFound: analysis.opportunities.length,
          recurringChargesFound: analysis.recurringCharges.length,
          potentialMonthlySavings: analysis.summary.potentialMonthlySavings,
          potentialAnnualSavings: analysis.summary.potentialAnnualSavings,
        },
      },
      { status: 200 },
    );

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error("Savings analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze spending for savings",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
