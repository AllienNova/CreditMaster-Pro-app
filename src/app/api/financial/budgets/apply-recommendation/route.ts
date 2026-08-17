/**
 * Apply ONE budget recommendation.
 *
 * WHY THIS DID NOT EXIST. AIBudgetOptimizer.tsx:141 has always POSTed here and
 * no route was present, so the call fell through to /api/financial/budgets/[id]
 * with id="apply-recommendation" — a route exporting GET, PATCH and DELETE.
 * Next.js answered 405 and "Apply" has never done anything for any user.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It never creates a budget. If the caller has
 * no active budget in that category there is nothing to adjust, and inventing
 * one from an AI suggestion would be this endpoint deciding, on its own, that
 * the user now budgets for a category they never chose. That is a 404 with a
 * message saying so.
 *
 * It also reports the BEFORE and AFTER amounts rather than answering "ok". A
 * write to someone's budget that says only that it succeeded gives them no way
 * to notice it did the wrong thing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { budgetService } from "@/lib/financial/budget-service";
import {
  BUDGET_CATEGORIES,
  type BudgetCategoryValue,
} from "@/lib/financial/types/budget.types";

/** A budget line nobody would set deliberately; guards against a bad suggestion. */
const MAX_BUDGET_AMOUNT = 10_000_000;

const CATEGORY_VALUES = Object.values(BUDGET_CATEGORIES) as [
  string,
  ...string[],
];

const ApplyRecommendationSchema = z.object({
  // Validated against the real category set rather than accepted as free text,
  // so a typo cannot silently match nothing and read as "no budget found".
  category: z.enum(CATEGORY_VALUES),
  amount: z.number().positive().max(MAX_BUDGET_AMOUNT),
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Validation error", message: "Body must be valid JSON" },
        { status: 400 },
      );
    }

    const parsed = ApplyRecommendationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: parsed.error.issues[0]?.message ?? "Invalid request",
        },
        { status: 400 },
      );
    }

    const category = parsed.data.category as BudgetCategoryValue;
    const { amount } = parsed.data;

    // Scoped to the caller by the service itself — the category is the only
    // thing the client chooses, never whose budget is touched.
    const budgets = await budgetService.getBudgetsByUser(user.id, {
      activeOnly: true,
      category,
    });

    const budget = budgets[0];
    if (!budget) {
      return NextResponse.json(
        {
          error: "Not found",
          message: `You have no active ${category} budget to adjust. Create one first.`,
        },
        { status: 404 },
      );
    }

    const previousAmount = budget.budgetedAmount;
    const updated = await budgetService.updateBudget(budget.id, user.id, {
      budgetedAmount: amount,
    });

    return NextResponse.json(
      {
        success: true,
        applied: {
          budgetId: budget.id,
          category,
          previousAmount,
          newAmount: updated.budgetedAmount,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Apply budget recommendation API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Could not apply that recommendation",
      },
      { status: 500 },
    );
  }
});
