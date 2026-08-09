import { NextRequest, NextResponse } from "next/server";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-builder/progress
 *
 * Returns user's credit building progress and milestones
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const progress = await creditBuilderService.getProgress(user.id);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
});
