/**
 * Budget Analysis API
 *
 * GET /api/financial/budgets/analyze - Analyze budget vs actual spending
 *
 * @see Phase 2.1.4: Budget API Endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import {
  applyFinancialAPIMiddleware,
  finalizeResponse,
} from "@/lib/api/financial-api-middleware";
import { BudgetPeriod } from "@/lib/financial/types/budget.types";

/**
 * GET /api/financial/budgets/analyze
 * Analyze budget vs actual spending with variance tracking
 *
 * @openapi
 * /api/financial/budgets/analyze:
 *   get:
 *     summary: Analyze budget performance
 *     description: Compare planned vs actual spending by category with variance analysis
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly, biweekly, monthly, quarterly, yearly]
 *         description: Budget period to analyze
 *         example: monthly
 *     responses:
 *       200:
 *         description: Budget analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BudgetAnalysis'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Apply middleware
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

    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json(
        { error: "Forbidden - Premium feature required" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "monthly") as BudgetPeriod;

    // Validate period
    const validPeriods: BudgetPeriod[] = [
      "weekly",
      "biweekly",
      "monthly",
      "quarterly",
      "yearly",
    ];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          error: "Invalid period",
          validPeriods,
        },
        { status: 400 },
      );
    }

    // Analyze budget
    const smartBudgetEngine = getSmartBudgetEngine();
    const analysis = await smartBudgetEngine.analyzeBudgetVsActual(
      userId,
      period,
    );

    const response = NextResponse.json({
      success: true,
      data: analysis,
      _meta: {
        period,
        analyzedAt: new Date().toISOString(),
      },
    });

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error("Error analyzing budget:", error);

    const response = NextResponse.json(
      {
        success: false,
        error: "Failed to analyze budget",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );

    return finalizeResponse(request, response, startTime, "anonymous");
  }
}
