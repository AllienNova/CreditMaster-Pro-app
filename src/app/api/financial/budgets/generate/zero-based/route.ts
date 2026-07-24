/**
 * Zero-Based Budget Generation API
 *
 * POST /api/financial/budgets/generate/zero-based
 *
 * Exposes the Smart Budget Engine's zero-based generator: it allocates the
 * user's real monthly income across category pools driven by their priority
 * percentages (essentials / debt payoff / savings / lifestyle) and weighted by
 * their real transaction history. Returns the composed budget, the residual
 * `unallocated` amount, and a per-category `allocationBreakdown`.
 *
 * Zero-based budgeting invariant: income − allocations = 0.
 *
 * Guard matches the sibling POST /api/financial/budgets/generate
 * (withPermission("financial:create_budgets")). This path is NOT in
 * PUBLIC_ROUTES, so it is denied by default and requires a valid session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSmartBudgetEngine } from "@/lib/financial/smart-budget-engine";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { z } from "zod";

const ZeroBasedBudgetSchema = z.object({
  monthlyIncome: z.number().positive("Monthly income must be positive"),
  priorities: z
    .object({
      essentials: z.number().min(0).max(100),
      debtPayoff: z.number().min(0).max(100),
      savings: z.number().min(0).max(100),
      lifestyle: z.number().min(0).max(100),
    })
    .refine(
      (p) =>
        Math.abs(p.essentials + p.debtPayoff + p.savings + p.lifestyle - 100) <
        0.1,
      { message: "Priorities must sum to 100%" },
    ),
});

/**
 * POST /api/financial/budgets/generate/zero-based
 * Generate a zero-based budget from the user's income + priority percentages.
 * Requires: financial:create_budgets permission.
 */
export const POST = withPermission(
  "financial:create_budgets",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();
      const parsed = ZeroBasedBudgetSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid request data",
            details: parsed.error.issues,
          },
          { status: 400 },
        );
      }

      const { monthlyIncome, priorities } = parsed.data;

      const result = await getSmartBudgetEngine().generateZeroBasedBudget(
        user.id,
        monthlyIncome,
        priorities,
      );

      return NextResponse.json(
        { success: true, data: result },
        { status: 201 },
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to generate zero-based budget",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  },
);
