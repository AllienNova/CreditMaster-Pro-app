/**
 * Budget Summary API Route
 *
 * GET /api/financial/budgets/summary - Get budget summary for user
 */

import { NextRequest, NextResponse } from "next/server";
import { budgetService } from "@/lib/financial/budget-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/budgets/summary
 * Get comprehensive budget summary for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const summary = await budgetService.getBudgetSummary(userId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch budget summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
