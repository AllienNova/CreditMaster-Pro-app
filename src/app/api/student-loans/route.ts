import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * The caller's tracked student loans, plus portfolio stats computed from them.
 *
 * WHAT THIS DELIBERATELY IS NOT. It used to return
 * FederalIntegrationService.retrieveNSLDSData(user.id), which is a mock: it
 * answers `loans: []` for everybody and has never contacted NSLDS. Reporting
 * that as the user's loan position would state, to someone whose loans are in
 * default, that we looked at the federal database and found nothing.
 *
 * So this reads OUR OWN table instead, and the distinction is the whole point:
 * an empty result here means "no student loans are tracked in Fynvita", which
 * is true, rather than "you have no federal student loans", which we cannot
 * know. `source: "tracked"` says so in the payload so a client cannot blur the
 * two, and `federalSync` states plainly that no bureau sync has happened.
 *
 * public.student_loans already carries every field the UI renders — loan_id,
 * servicer_name, current_balance, interest_rate, loan_status, disbursement_date
 * — so nothing here is invented.
 */

/** Rows a user could plausibly accumulate; a cap keeps one request bounded. */
const MAX_LOANS = 500;

interface LoanRow {
  loan_id: string;
  loan_type: string;
  servicer_name: string;
  current_balance: number | string | null;
  interest_rate: number | string | null;
  loan_status: string;
  disbursement_date: string | null;
}

/** Postgres numeric arrives as a string; Number() it once, at the boundary. */
const num = (v: number | string | null): number => {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function tally(loans: LoanRow[], key: "loan_status" | "servicer_name") {
  return loans.reduce<Record<string, number>>((acc, loan) => {
    const bucket = loan[key] || "unknown";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Balance-weighted interest rate — the only rate that means anything across
 * loans of different sizes. A plain mean would tell someone with a $2k loan at
 * 9% and a $60k loan at 3% that they are paying 6%.
 *
 * Returns null, never 0, when there is no balance to weight by: 0% is a claim
 * about someone's debt, and "we cannot compute this" is not that claim.
 */
function weightedRate(loans: LoanRow[]): number | null {
  const totalDebt = loans.reduce((sum, l) => sum + num(l.current_balance), 0);
  if (totalDebt <= 0) return null;
  const weighted = loans.reduce(
    (sum, l) => sum + num(l.current_balance) * num(l.interest_rate),
    0,
  );
  return Math.round((weighted / totalDebt) * 100) / 100;
}

export const GET = withAuth(async (_req: NextRequest, user: AuthedUser) => {
  const { data, error } = await supabaseAdmin
    .from("student_loans")
    .select(
      "loan_id, loan_type, servicer_name, current_balance, interest_rate, loan_status, disbursement_date",
    )
    .eq("user_id", user.id)
    .order("current_balance", { ascending: false })
    .limit(MAX_LOANS);

  if (error) {
    // No fallback payload. A read failure that answers with an empty list is
    // indistinguishable from "you have no loans", which is the lie this route
    // was rewritten to remove.
    console.error("[student-loans] read failed", error);
    return NextResponse.json(
      { error: "Could not load your student loans" },
      { status: 500 },
    );
  }

  const loans = (data ?? []) as LoanRow[];

  return NextResponse.json({
    loans,
    source: "tracked",
    federalSync: {
      connected: false,
      reason:
        "Fynvita has no federal (NSLDS) integration yet, so this list is what you have added here — not a lookup of your federal loans.",
    },
    analysis: {
      total_loans: loans.length,
      total_debt:
        Math.round(
          loans.reduce((sum, l) => sum + num(l.current_balance), 0) * 100,
        ) / 100,
      weighted_interest_rate: weightedRate(loans),
      loans_by_status: tally(loans, "loan_status"),
      loans_by_servicer: tally(loans, "servicer_name"),
    },
  });
});
