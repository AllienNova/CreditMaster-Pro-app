/**
 * Budget Adjustment Suggestions API
 *
 * GET /api/financial/budgets/adjust - Get AI-powered budget adjustment suggestions
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

/**
 * GET /api/financial/budgets/adjust
 * Get AI-powered budget adjustment suggestions based on spending patterns
 *
 * @openapi
 * /api/financial/budgets/adjust:
 *   get:
 *     summary: Get budget adjustment suggestions
 *     description: AI analyzes spending patterns and suggests category adjustments
 *     tags: [Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BudgetRecommendation'
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
    // Apply middleware (rate limiting, CORS, logging). Auth is enforced by
    // the withPermission guard above.
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

    // Get adjustment suggestions
    // "No active budget" is an EMPTY STATE, not a server fault — same defect
    // this route's sibling /analyze had. The engine throws for it, the catch
    // below turned that into a 500, and every user without a budget yet (i.e.
    // every new user) got a server error instead of a prompt to create one.
    const smartBudgetEngine = getSmartBudgetEngine();
    let suggestions;
    try {
      suggestions = await smartBudgetEngine.suggestCategoryAdjustments(userId);
    } catch (error) {
      if (
        error instanceof Error &&
        /no active budget found/i.test(error.message)
      ) {
        const empty = NextResponse.json({
          success: true,
          data: [],
          hasBudget: false,
          message: "No active budget yet. Create one to see suggestions.",
        });
        return finalizeResponse(request, empty, startTime, userId);
      }
      throw error;
    }

    const response = NextResponse.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
      _meta: {
        generatedAt: new Date().toISOString(),
        aiPowered: true,
      },
    });

    return finalizeResponse(request, response, startTime, userId);
  } catch (error) {
    console.error("Error getting budget adjustment suggestions:", error);

    const response = NextResponse.json(
      {
        success: false,
        error: "Failed to get budget adjustment suggestions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );

    return finalizeResponse(request, response, startTime, "anonymous");
  }
},
);
