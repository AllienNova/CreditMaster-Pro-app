/**
 * Real estate API.
 *
 * GET /api/financial/real-estate — the caller's own properties and portfolio
 * summary.
 *
 * WHY THIS ROUTE IS NEW, and the second of its kind this session. The feature
 * was already built and unreachable, exactly as the crypto wallets were:
 * `real_estate_tracking` has existed since migration
 * 20260731000081_real_estate_tracking, and
 * `src/lib/financial/real-estate-tracking-service.ts` queries it in earnest —
 * 27 database calls, including `getUserProperties` and `getPortfolioSummary`,
 * with no `Math.random` anywhere. Nothing imported that service except
 * `src/lib/financial/index.ts` (a barrel) and its own test. Meanwhile
 * /financial/real-estate rendered a constant list of properties to every
 * visitor.
 *
 * Two adjacent migrations, two working services, neither reachable. Worth
 * noticing as a pattern rather than a coincidence: a table and a service can
 * both land and still leave the feature dark, because nothing in CI asserts
 * that a service is reachable from a route.
 *
 * IDOR: both service methods take a userId, and this route passes `user.id`
 * from the auth guard — never a client-supplied id.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getRealEstateTrackingService } from "@/lib/financial/real-estate-tracking-service";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const service = getRealEstateTrackingService();

    // user.id comes from the auth guard, never from the request (route-contract §2).
    const [properties, summary] = await Promise.all([
      service.getUserProperties(user.id),
      service.getPortfolioSummary(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: { properties, summary },
    });
  } catch (error) {
    // Honest infra failure. A caller with no properties gets an empty array; a
    // broken backend gets a 500. The two must never look the same
    // (route-contract §3).
    console.error("Real estate GET failed", {
      userId: user.id,
      route: "/api/financial/real-estate",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { success: false, error: "Failed to load properties" },
      { status: 500 },
    );
  }
});
