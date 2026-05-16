import { NextRequest, NextResponse } from "next/server";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-builder/recommendations
 *
 * Returns AI-powered personalized recommendations for credit building
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const recommendations = await creditBuilderService.getRecommendedActions(
      user.id,
    );

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
});
