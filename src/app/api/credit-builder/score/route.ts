import { NextRequest, NextResponse } from "next/server";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-builder/score
 *
 * Returns user's credit builder score and category breakdown
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const score = await creditBuilderService.calculateCreditBuilderScore(
      user.id,
    );

    return NextResponse.json({
      success: true,
      score,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch score" },
      { status: 500 },
    );
  }
});
