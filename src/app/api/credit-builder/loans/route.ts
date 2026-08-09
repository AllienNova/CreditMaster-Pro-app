import { NextRequest, NextResponse } from "next/server";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-builder/loans
 *
 * Returns recommended credit builder loans based on user's profile
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const loans = await creditBuilderService.getCreditBuilderLoans(user.id);

    return NextResponse.json({
      success: true,
      loans,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 },
    );
  }
});
