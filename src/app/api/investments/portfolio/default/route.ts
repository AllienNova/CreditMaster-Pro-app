/**
 * GET /api/investments/portfolio/default — the caller's default portfolio id.
 *
 * WHY THIS EXISTS. /investments/analytics asks for it on mount and, when the
 * request fails, falls back to the all-zeroes UUID (analytics/page.tsx:104).
 * The endpoint did not exist, so that fallback fired every time and the page
 * then asked four more endpoints — risk, diversification, rebalance,
 * correlation — about a portfolio that cannot exist. One absent route produced
 * five failed requests in the production dogfood sweep.
 *
 * WHAT "DEFAULT" MEANS. investment_portfolios has no is_default column, so the
 * user's FIRST-CREATED portfolio is treated as their default. Chosen over
 * most-recently-updated because it is stable: a default that moves as the user
 * touches portfolios would silently repoint every analytics screen.
 *
 * A user with no portfolio is not an error. It answers 200 with
 * `portfolioId: null` and `hasPortfolio: false`, so the page can say so instead
 * of asking four analytics endpoints about a UUID of zeroes — which is what the
 * old 404-and-fall-back behaviour did.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    // idor-audit: user-scoped — filtered by the caller's own id from withAuth,
    // never from the request.
    const { data, error } = await supabase
      .from("investment_portfolios")
      .select("id, name, portfolio_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        success: true,
        hasPortfolio: false,
        portfolioId: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasPortfolio: true,
      portfolioId: data.id,
      name: data.name,
      portfolioType: data.portfolio_type,
    });
  } catch (error) {
    console.error("Default portfolio lookup error:", error);
    return NextResponse.json(
      { error: "Failed to load default portfolio" },
      { status: 500 },
    );
  }
});
