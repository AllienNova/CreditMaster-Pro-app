/**
 * Budget Recommendations API Route
 *
 * GET /api/financial/budgets/recommendations - Get budget recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { budgetService } from "@/lib/financial/budget-service";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

/**
 * GET /api/financial/budgets/recommendations
 * Get personalized budget recommendations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "financial:read")) {
      return NextResponse.json(
        { error: "Forbidden - Premium feature" },
        { status: 403 },
      );
    }

    const userId = validation.user.id;

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
}
