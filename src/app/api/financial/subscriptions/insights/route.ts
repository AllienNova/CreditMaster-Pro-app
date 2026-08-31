/**
 * GET /api/financial/subscriptions/insights — duplicate services, unused
 * subscriptions and other savings opportunities.
 *
 * Consumed as `data.insights` by the /subscriptions page (page.tsx:304).
 *
 * The service derives these from the caller's own subscriptions; an account
 * with none yields an empty array, which the page renders as "no insights"
 * rather than inventing suggestions.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { subscriptionCancellationService } from "@/lib/financial/subscription-cancellation-service";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const insights =
      await subscriptionCancellationService.getSubscriptionInsights(user.id);

    return NextResponse.json({ success: true, insights });
  } catch (error) {
    console.error("Subscription insights error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription insights" },
      { status: 500 },
    );
  }
});
