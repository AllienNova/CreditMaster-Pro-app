/**
 * The credit-score factors this app can actually compute for the caller.
 *
 * GET /api/credit/factors -> { success, data: CreditFactorResponse[], unavailable }
 *
 * WHAT THIS REPLACED (SF-16). 127 lines with ZERO data access, returning five
 * hardcoded factors that told every caller — identically — that they had
 * "98% on-time payments", "32% utilization" and "2 inquiries (6 months)".
 * `_user` was declared and never read, so the route did not know who was
 * asking. Its own comment claimed it "fetches from database when user is
 * authenticated"; it never touched a database.
 *
 * It is reachable from four places: the web /credit/factors page, both primary
 * navs, and two buttons on the mobile score-detail screen. Each showed a
 * stranger's flattering credit summary as the reader's own.
 *
 * WHY ONLY TWO OF FICO'S FIVE FACTORS ARE RETURNED. Three have no source in
 * this system:
 *
 *   payment history   The credit report is the source, and that path falls
 *                     back to a mock generator on any failed bureau call
 *                     (SF-11). Bill payment history has no HTTP route.
 *   utilization       Needs balance / limit, and financial_accounts
 *                     .credit_limit is never written — plaid-service
 *                     .storeAccount does not set it, and 20260731000006
 *                     records it as "not yet written by any caller".
 *   new credit        No source anywhere.
 *
 * They are returned in `unavailable`, each naming what would populate it,
 * rather than omitted or filled with a plausible value. Omitting them would
 * read as "not applicable"; listing them reads as "we do not know", which is
 * the truth and a materially different statement when the subject is
 * someone's credit.
 *
 * The two that ARE computed come from the caller's real financial_accounts
 * rows through creditBuilderService: opened_date for age, account_type for mix.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { creditBuilderService } from "@/lib/credit-builder/credit-builder-service";

export interface CreditFactorResponse {
  id: string;
  name: string;
  impact: "high_positive" | "positive" | "neutral" | "negative" | "high_negative";
  category: "credit_age" | "credit_mix";
  status: "excellent" | "good" | "fair" | "poor" | "very_poor";
  /** What the analysis actually found about THIS caller. */
  value: string;
  description: string;
  recommendation?: string;
  /** FICO's published weighting — product content, not a measurement. */
  percentImpact: number;
}

export interface UnavailableFactor {
  id: string;
  name: string;
  percentImpact: number;
  /** What would have to exist for this factor to be computed. */
  blockedBy: string;
}

const UNAVAILABLE: UnavailableFactor[] = [
  {
    id: "payment_history",
    name: "Payment History",
    percentImpact: 35,
    blockedBy:
      "Needs a linked credit report. Rent payments reported through Fynvita appear under Payment History in Credit Builder.",
  },
  {
    id: "credit_utilization",
    name: "Credit Utilization",
    percentImpact: 30,
    blockedBy:
      "Needs credit limits from your linked cards, which are not captured yet.",
  },
  {
    id: "new_credit",
    name: "New Credit",
    percentImpact: 10,
    blockedBy: "Needs a linked credit report.",
  },
];

/**
 * Average-age bands.
 *
 * These are the widely published FICO guidelines, and they are PRODUCT
 * KNOWLEDGE about scoring — not a measurement of this user, and not a bureau
 * calculation. The measured number is always shown alongside in `value`, so a
 * reader can see what the band was derived from.
 */
const AGE_BANDS: { minYears: number; status: CreditFactorResponse["status"] }[] = [
  { minYears: 9, status: "excellent" },
  { minYears: 7, status: "good" },
  { minYears: 4, status: "fair" },
  { minYears: 2, status: "poor" },
];

function ageStatus(years: number): CreditFactorResponse["status"] {
  return AGE_BANDS.find((b) => years >= b.minYears)?.status ?? "very_poor";
}

const ONE_DECIMAL = 10;

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const [age, mix] = await Promise.all([
      creditBuilderService.analyzeCreditAge(user.id),
      creditBuilderService.analyzeCreditMix(user.id),
    ]);

    const factors: CreditFactorResponse[] = [];

    // Stated only when there is an account to measure. An average age of 0
    // across zero accounts is not "0 years of history", it is no answer —
    // reporting it as 0 would be the old defect in a new place.
    if (age.averageAge > 0) {
      const years = Math.round(age.averageAge * ONE_DECIMAL) / ONE_DECIMAL;
      const status = ageStatus(years);
      factors.push({
        id: "credit_age",
        name: "Credit Age",
        impact:
          status === "excellent" || status === "good" ? "positive" : "neutral",
        category: "credit_age",
        status,
        value: `${years} year average across your linked accounts`,
        description: `Your linked accounts average ${years} years old; the oldest is ${Math.round(age.oldestAccount * ONE_DECIMAL) / ONE_DECIMAL} years.`,
        recommendation:
          "Keeping older accounts open preserves this average.",
        percentImpact: 15,
      });
    }

    const counts = mix.current;
    const accountCount =
      counts.installment + counts.revolving + counts.mortgage + counts.other;

    if (accountCount > 0) {
      const kinds = [
        counts.revolving > 0 ? "revolving" : "",
        counts.installment > 0 ? "installment" : "",
        counts.mortgage > 0 ? "mortgage" : "",
      ].filter(Boolean);

      // Scored variety, not account count: one of each of three kinds is a
      // better mix than six revolving cards.
      const status: CreditFactorResponse["status"] =
        kinds.length >= 3 ? "excellent" : kinds.length === 2 ? "good" : kinds.length === 1 ? "fair" : "poor";

      factors.push({
        id: "credit_mix",
        name: "Credit Mix",
        impact: kinds.length >= 2 ? "positive" : "neutral",
        category: "credit_mix",
        status,
        value: kinds.length
          ? `${kinds.join(", ")} across ${accountCount} linked ${accountCount === 1 ? "account" : "accounts"}`
          : `${accountCount} linked ${accountCount === 1 ? "account" : "accounts"}, none of a scored type`,
        description: kinds.length
          ? `You have ${kinds.length} of the three account types scoring models look for.`
          : "None of your linked accounts is a type scoring models weigh for credit mix.",
        percentImpact: 10,
      });
    }

    // Both under `data`, NOT as siblings. A sibling key does not survive the
    // envelope: the mobile client unwraps { success, data } and returns only
    // the inner value (mobile-app/src/services/api/client.ts:361-387), so
    // `unavailable` was dropped on every mobile call and the screen rendered
    // an empty list where the honest "we cannot compute this, and here is
    // why" belongs.
    return NextResponse.json({
      success: true,
      data: { factors, unavailable: UNAVAILABLE },
    });
  } catch (error) {
    // No fabricated fallback. Failing to read the caller's accounts is not
    // the same as their having none.
    console.error("[credit/factors] failed to analyse", error);
    return NextResponse.json(
      { error: "Could not analyse your credit factors" },
      { status: 500 },
    );
  }
});
