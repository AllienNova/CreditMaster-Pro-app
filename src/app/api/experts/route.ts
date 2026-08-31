/**
 * Experts directory API.
 *
 * GET /api/experts — verified experts, optionally filtered.
 *
 * WHY THIS ROUTE IS NEW, and the third of its kind this session. The feature
 * was built and unreachable: `src/lib/services/expert-sessions-service.ts` has
 * 46 database calls and no randomness, including `getExperts`, which reads the
 * `experts` table filtered to `status = "verified"` and ordered by rating.
 * Nothing under src/app could reach it.
 *
 * What /experts showed instead was the worst fabrication of the three.
 * `MOCK_EXPERTS` invented CREDENTIALED PROFESSIONALS — "Dr. Sarah Mitchell,
 * Certified Financial Planner, CFP and ChFC, 15 years, $200/hour, rated 4.9" —
 * and presented them as bookable advisers. Inventing a number is one thing;
 * inventing a licensed person a user might hire for financial advice is
 * another.
 *
 * The service's own filter is the safeguard worth keeping visible: it returns
 * only `status = "verified"` experts, so an unvetted or pending application
 * cannot appear in the directory. That is the rule the mock quietly bypassed.
 *
 * IDOR: this is a directory of experts rather than of the caller's own rows,
 * so there is no per-user scoping to apply. It is still behind withAuth,
 * matching the rest of this API surface — a directory of advisers with rates
 * and contact routes is not something to expose anonymously.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getExpertSessionsService } from "@/lib/services/expert-sessions-service";

/** Guards against a filter that would widen the result set rather than narrow it. */
function positiveNumber(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const specialties = searchParams
      .getAll("specialty")
      .map((s) => s.trim())
      .filter(Boolean);

    const service = getExpertSessionsService();
    const experts = await service.getExperts({
      specialties: specialties.length > 0 ? specialties : undefined,
      minRating: positiveNumber(searchParams.get("minRating")),
      maxRate: positiveNumber(searchParams.get("maxRate")),
    });

    return NextResponse.json({
      success: true,
      data: { experts, total: experts.length },
    });
  } catch (error) {
    // Honest infra failure. An empty directory and a broken backend must never
    // look the same (route-contract §3).
    console.error("Experts GET failed", {
      userId: user.id,
      route: "/api/experts",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { success: false, error: "Failed to load experts" },
      { status: 500 },
    );
  }
});
