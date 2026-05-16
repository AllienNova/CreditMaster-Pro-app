import { NextRequest, NextResponse } from "next/server";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-builder/secured-cards
 *
 * Returns recommended secured credit cards based on user's profile
 */
export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const cards = await creditBuilderService.getSecuredCards(user.id);

    return NextResponse.json({
      success: true,
      cards,
    });
  } catch (_error) {
    // Error logged
    return NextResponse.json(
      { error: "Failed to fetch secured cards" },
      { status: 500 },
    );
  }
});
