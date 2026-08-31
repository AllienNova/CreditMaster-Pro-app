/**
 * Budget Analysis API
 *
 * GET /api/financial/budgets/analyze - Analyze budget vs actual spending
 *
 * @see Phase 2.1.4: Budget API Endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
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
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, _user: AuthedUser) => {
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

    // Analyze budget.
    //
    // "No active budget found" is an EMPTY STATE, not a server fault. The engine
    // throws for it (smart-budget-engine.ts:174), which the catch below turned
    // into a 500 — so every user who had not yet created a budget, i.e. every
    // new user, got a server error and /financial/smart-budget rendered 57
    // characters of nothing. Found by the route sweep.
    //
    // Answered as a successful response carrying `hasBudget: false` so the UI
    // can show "create your first budget" instead of an error. Genuine faults
    // still fall through to the catch.
    const smartBudgetEngine = getSmartBudgetEngine();
    let analysis;
    try {
      analysis = await smartBudgetEngine.analyzeBudgetVsActual(userId, period);
    } catch (error) {
      if (
        error instanceof Error &&
        /no active budget found/i.test(error.message)
      ) {
        const empty = NextResponse.json({
          success: true,
          data: null,
          hasBudget: false,
          message: "No active budget yet. Create one to see analysis.",
          _meta: { period, analyzedAt: new Date().toISOString() },
        });
        return finalizeResponse(request, empty, startTime, userId);
      }
      throw error;
    }

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
},
);
