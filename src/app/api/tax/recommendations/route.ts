/**
 * Tax Recommendations API
 *
 * GET /api/tax/recommendations[?taxYear=YYYY]
 * Returns TaxOptimizationEngine's recommendations for the authenticated user's
 * stored tax profile.
 *
 * WHY A SEPARATE ROUTE FROM /api/tax/analyze. analyze is a POST that accepts a
 * profile (or profile updates) and returns the full optimization result. The
 * mobile recommendations screen has no profile to send and wants only the
 * recommendation list, so it has always issued a plain GET here — against a
 * route that did not exist.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { taxOptimizationEngine } from "@/lib/tax";
import { fetchTaxProfile } from "@/lib/tax/tax-profile-repository";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const raw = request.nextUrl.searchParams.get("taxYear");

  // Coercing "last-year" to NaN and quietly falling back to the current year
  // would answer a question the caller did not ask.
  let taxYear = new Date().getFullYear();
  if (raw !== null) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json(
        { error: "taxYear must be a four-digit year" },
        { status: 400 },
      );
    }
    taxYear = parsed;
  }

  try {
    const supabase = await createClient();
    // Scoped to the authenticated caller. A userId in the query string is
    // ignored entirely — it is not read anywhere in this handler.
    const profile = await fetchTaxProfile(user.id, taxYear);

    if (!profile) {
      // An explicit empty state, NOT recommendations derived from a default
      // profile. Advice computed from invented numbers is specific, confident
      // and wrong, and the user cannot tell it apart from advice based on
      // their own figures. `profileMissing` lets the screen prompt for a
      // profile instead of rendering "you have no opportunities".
      return NextResponse.json({
        success: true,
        data: { recommendations: [], profileMissing: true, taxYear },
      });
    }

    const result = await taxOptimizationEngine.analyzeAndRecommend(
      user.id,
      profile,
    );

    return NextResponse.json({
      success: true,
      data: {
        // The engine's field is `topRecommendations` (tax/types/index.ts:101).
        // Reading `result.recommendations` compiled only because the test
        // mocked the engine with that name — the mock agreed with the route and
        // both disagreed with the type. tsc caught it; the green suite did not.
        recommendations: result.topRecommendations ?? [],
        profileMissing: false,
        taxYear,
      },
    });
  } catch (error) {
    // A failure must NOT degrade into an empty list: "no recommendations" and
    // "we could not compute recommendations" lead a user to opposite actions.
    console.error("Tax recommendations failed:", error);
    return NextResponse.json(
      { error: "Failed to generate tax recommendations" },
      { status: 500 },
    );
  }
});
