/**
 * GET /api/financial/subscriptions/stats — spend and savings totals.
 *
 * Consumed as `data.stats` by the /subscriptions page (page.tsx:300). See the
 * sibling route for why all three were missing at once.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { subscriptionCancellationService } from "@/lib/financial/subscription-cancellation-service";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const stats = await subscriptionCancellationService.getSubscriptionStats(
      user.id,
    );

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Subscription stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription stats" },
      { status: 500 },
    );
  }
});
