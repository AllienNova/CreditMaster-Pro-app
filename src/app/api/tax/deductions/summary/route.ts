/**
 * Deduction Summary API
 *
 * GET /api/tax/deductions/summary[?year=YYYY]
 * Totals the caller's itemised deductions, breaks them down by category, and
 * says whether itemising beats the standard deduction.
 *
 * THE ITEMISE-OR-STANDARD CALL IS THE POINT. A filer takes the LARGER of the
 * two, so the recommendation is a straight comparison and `savings` is the
 * difference — what taking the better option is worth over the worse one. It is
 * never negative: if itemising loses, the saving belongs to the standard
 * deduction, not to a negative number attached to itemising.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchTaxProfile } from "@/lib/tax/tax-profile-repository";
import { CONTRIBUTION_LIMITS_2024 } from "@/lib/tax/types/tax-profile.types";
import { FilingStatus } from "@/lib/tax/types/tax-profile.types";

/**
 * Standard deduction by filing status, 2024.
 *
 * Read from CONTRIBUTION_LIMITS_2024 rather than restated, so this endpoint
 * and the tax engine cannot disagree about the threshold that decides whether
 * a user should itemise at all.
 */
const STANDARD_DEDUCTION: Record<string, number> = {
  [FilingStatus.SINGLE]: CONTRIBUTION_LIMITS_2024.standardDeductionSingle,
  [FilingStatus.MARRIED_FILING_JOINTLY]:
    CONTRIBUTION_LIMITS_2024.standardDeductionMarriedJoint,
  [FilingStatus.MARRIED_FILING_SEPARATELY]:
    CONTRIBUTION_LIMITS_2024.standardDeductionMarriedSeparate,
  [FilingStatus.HEAD_OF_HOUSEHOLD]:
    CONTRIBUTION_LIMITS_2024.standardDeductionHeadOfHousehold,
  [FilingStatus.QUALIFYING_SURVIVING_SPOUSE]:
    CONTRIBUTION_LIMITS_2024.standardDeductionMarriedJoint,
};

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const raw = request.nextUrl.searchParams.get("year");
  let year = new Date().getFullYear();
  if (raw !== null) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json(
        { error: "year must be a four-digit year" },
        { status: 400 },
      );
    }
    year = parsed;
  }

  try {
    // idor-audit: pk-owner-checked — SELECT filtered by the authenticated user_id.
    const { data, error } = await getServiceRoleClient()
      .from("tax_deductions")
      .select("category, amount")
      .eq("user_id", user.id)
      .eq("tax_year", year);

    if (error) {
      // A zeroed summary would tell someone to take the standard deduction
      // when their itemised total might well beat it — a recommendation with
      // real money behind it, made from missing data.
      console.error("Failed to read deductions for summary:", error);
      return NextResponse.json(
        { error: "Failed to build deduction summary" },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as { category: string; amount: string | number }[];
    const itemizedTotal = rows.reduce((sum, r) => sum + Number(r.amount), 0);

    const byCategoryMap = new Map<string, number>();
    for (const row of rows) {
      byCategoryMap.set(
        row.category,
        (byCategoryMap.get(row.category) ?? 0) + Number(row.amount),
      );
    }
    const byCategory = [...byCategoryMap.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        // Guarded: with no deductions the denominator is zero and every
        // percentage would be NaN, which renders as "NaN%" on the screen.
        percentage: itemizedTotal > 0 ? (amount / itemizedTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // The filing status drives the threshold, so it comes from the profile.
    const supabase = await createClient();
    const profile = await fetchTaxProfile(user.id, year);
    const standardDeduction =
      STANDARD_DEDUCTION[profile?.filingStatus ?? FilingStatus.SINGLE] ??
      CONTRIBUTION_LIMITS_2024.standardDeductionSingle;

    const shouldItemize = itemizedTotal > standardDeduction;

    return NextResponse.json({
      success: true,
      data: {
        totalDeductions: itemizedTotal,
        itemizedVsStandard: {
          itemizedTotal,
          standardDeduction,
          recommendation: shouldItemize ? "itemize" : "standard",
          // What the better option is worth over the worse one. Never
          // negative — a losing itemised total does not "cost" anything,
          // because the filer simply takes the standard deduction.
          savings: Math.abs(itemizedTotal - standardDeduction),
        },
        byCategory,
        year,
        // The threshold defaults to single when there is no profile, so the
        // client can tell a real recommendation from an assumed one.
        filingStatusAssumed: !profile,
      },
    });
  } catch (error) {
    console.error("Failed to build deduction summary:", error);
    return NextResponse.json(
      { error: "Failed to build deduction summary" },
      { status: 500 },
    );
  }
});
