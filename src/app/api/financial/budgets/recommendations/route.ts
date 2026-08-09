/**
 * Budget Recommendations API Route
 *
 * GET /api/financial/budgets/recommendations - Get budget recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { budgetService } from "@/lib/financial/budget-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/financial/budgets/recommendations
 * Get personalized budget recommendations for the authenticated user
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
    const userId = user.id;
  try {


    const recommendations = await budgetService.getRecommendations(userId);

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error("Error fetching budget recommendations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch budget recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
},
);
