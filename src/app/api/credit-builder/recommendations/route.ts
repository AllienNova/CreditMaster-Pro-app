import { NextRequest, NextResponse } from "next/server";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-builder/recommendations
 *
 * Returns personalized credit-building recommendations, derived from the
 * caller's own credit-builder score: getRecommendedActions computes their weak
 * categories and getDefaultActions branches on them.
 *
 * NOT AI-powered, despite what this comment used to say. The service made a
 * billable AI call and discarded the response — see the note in
 * credit-builder-service.ts:getRecommendedActions. The actions carry
 * `aiGenerated: false`, which was always the honest signal.
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
