/**
 * GET /api/financial/subscriptions — the caller's recurring subscriptions.
 *
 * The /subscriptions page fetches this, /stats and /insights together on mount
 * (subscriptions/page.tsx:282-284). None of the three existed, so the page
 * rendered its empty state to every user — indistinguishable from "you have no
 * subscriptions", which is exactly the failure mode the dogfood sweep flags as
 * a WARN rather than a FAIL.
 *
 * Thin by design: subscriptionCancellationService already owns the query and
 * the row-to-Subscription mapping. Duplicating either here is how the two
 * diverge.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { subscriptionCancellationService } from "@/lib/financial/subscription-cancellation-service";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    // The user id comes from withAuth, never the request — a caller must not be
    // able to read somebody else's subscriptions.
    const subscriptions =
      await subscriptionCancellationService.getSubscriptions(user.id);

    return NextResponse.json({ success: true, subscriptions });
  } catch (error) {
    console.error("Subscriptions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 },
    );
  }
});
