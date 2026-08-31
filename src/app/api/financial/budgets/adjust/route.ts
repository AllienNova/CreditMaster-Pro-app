/**
 * Budget Adjustment Suggestions API
 *
 * GET /api/financial/budgets/adjust - Get AI-powered budget adjustment suggestions
 *
 * @see Phase 2.1.4: Budget API Endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";
import { budgetService } from "@/lib/financial/budget-service";
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

/**
 * POST /api/financial/budgets/adjust
 * Apply the suggested adjustments to the caller's budgets.
 *
 * WHY IT DID NOT EXIST. RecommendationsContent.tsx:10 has always POSTed
 * { applyAll: true } here while this module exported GET alone, so Next.js
 * answered 405 and "Apply budget recommendations" has never applied anything.
 * The GET half — reading the suggestions — worked, which is why the screen
 * looked fine.
 *
 * WHAT IT WRITES. Only the caller's own budgets, only the amount, and only for
 * categories the suggestion engine actually named. It NEVER creates a budget: a
 * recommendation for a category the user does not budget for is skipped and
 * reported as skipped, because inventing a budget line from an AI suggestion
 * would be this endpoint deciding what someone budgets for.
 *
 * WHAT IT RETURNS. Every change, with its before and after amount, plus the
 * skips and their reasons. A bulk write to somebody's budgets that answers only
 * "ok" gives them no way to see it did the wrong thing — and this one moves
 * every category at once.
 */
export const POST = withPermission(
  "financial:write",
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const engine = getSmartBudgetEngine();

      // "No active budget" is an EMPTY STATE, not a server fault — the same
      // distinction GET makes a few lines above, and the same defect /analyze
      // had before it. My first draft of this handler let the throw fall into
      // the catch below, so a user with no budget yet got "Could not apply the
      // budget adjustments" — a failure message for a situation where there was
      // simply nothing to apply. Caught by running it, not by a test: the unit
      // mocks always resolved.
      //
      // The catch below sets a FLAG rather than returning a payload. Returning
      // `success: true` from inside a catch is the exact shape audit:mocks
      // exists to stop — a handler answering as though nothing went wrong from
      // its error path — and it flagged this, correctly, on the first run. The
      // condition is handled here; the response is built on the normal path.
      let recommendations: Awaited<
        ReturnType<typeof engine.suggestCategoryAdjustments>
      > = [];
      let hasBudget = true;
      try {
        recommendations = await engine.suggestCategoryAdjustments(user.id);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !/no active budget found/i.test(error.message)
        ) {
          throw error;
        }
        hasBudget = false;
      }

      if (!hasBudget) {
        return NextResponse.json(
          {
            success: true,
            appliedCount: 0,
            applied: [],
            skipped: [],
            hasBudget: false,
            message: "No active budget yet. Create one to see suggestions.",
          },
          { status: 200 },
        );
      }

      const applied: Array<{
        budgetId: string;
        category: string;
        previousAmount: number;
        newAmount: number;
      }> = [];
      const skipped: Array<{ category: string; reason: string }> = [];

      for (const rec of recommendations) {
        if (!rec.category) {
          skipped.push({
            category: "(none)",
            reason: "recommendation names no category",
          });
          continue;
        }
        if (!(rec.suggestedAmount > 0)) {
          skipped.push({
            category: rec.category,
            reason: "suggested amount is not a positive number",
          });
          continue;
        }

        // Service-scoped to the caller; the loop never chooses a user.
        const budgets = await budgetService.getBudgetsByUser(user.id, {
          activeOnly: true,
          category: rec.category,
        });
        const budget = budgets[0];
        if (!budget) {
          skipped.push({
            category: rec.category,
            reason: "no active budget in this category — not created",
          });
          continue;
        }

        const previousAmount = budget.budgetedAmount;
        const updated = await budgetService.updateBudget(budget.id, user.id, {
          budgetedAmount: rec.suggestedAmount,
        });
        applied.push({
          budgetId: budget.id,
          category: rec.category,
          previousAmount,
          newAmount: updated.budgetedAmount,
        });
      }

      return NextResponse.json(
        {
          success: true,
          appliedCount: applied.length,
          applied,
          skipped,
        },
        { status: 200 },
      );
    } catch (error: unknown) {
      console.error("Apply budget adjustments API error:", error);

      return NextResponse.json(
        {
          error: "Internal server error",
          message: "Could not apply the budget adjustments",
        },
        { status: 500 },
      );
    }
  },
);
