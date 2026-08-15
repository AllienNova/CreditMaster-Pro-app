/**
 * Tax Calendar API
 *
 * GET /api/tax/calendar[?year=YYYY][&upcoming=true]
 * Estimated-tax deadlines for the authenticated user, derived from
 * TaxOptimizationEngine.getQuarterlyPaymentSchedule.
 *
 * WHY IT COMPUTES RATHER THAN READS. There is no tax_calendar_events table.
 * Quarterly 1040-ES deadlines are statutory and the amounts fall out of the
 * user's profile, so storing them would mean maintaining a copy that can go
 * stale against both the law and the user's own income. The mobile client's
 * createReminder/completeEvent calls need persistence and are NOT served here —
 * they stay in the audit:api baseline rather than being faked with a no-op.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createClient } from "@/lib/supabase/server";
import { taxOptimizationEngine } from "@/lib/tax";
import { fetchTaxProfile } from "@/lib/tax/tax-profile-repository";

/** Shape the mobile client declares as TaxEvent. */
interface TaxEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: "deadline" | "reminder" | "recommendation" | "payment";
  priority: "critical" | "high" | "medium" | "low";
  isCompleted: boolean;
  category: string;
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const params = request.nextUrl.searchParams;

  let year = new Date().getFullYear();
  const rawYear = params.get("year");
  if (rawYear !== null) {
    const parsed = Number(rawYear);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json(
        { error: "year must be a four-digit year" },
        { status: 400 },
      );
    }
    year = parsed;
  }

  const upcomingOnly = params.get("upcoming") === "true";

  try {
    const supabase = await createClient();
    const profile = await fetchTaxProfile(supabase, user.id, year);

    if (!profile) {
      // No profile means no income to estimate from. A schedule of dollar
      // amounts derived from a default income would look exactly like a real
      // one, and a user could pay it.
      return NextResponse.json({
        success: true,
        data: { events: [], profileMissing: true, year },
      });
    }

    const schedule = taxOptimizationEngine.getQuarterlyPaymentSchedule(profile);
    const now = Date.now();

    const events: TaxEvent[] = schedule
      .filter((entry) => !upcomingOnly || entry.dueDate.getTime() >= now)
      .map((entry) => {
        const total = entry.federalPayment + entry.statePayment;
        return {
          id: `estimated-tax-${year}-q${entry.quarter}`,
          title: `${entry.label} estimated tax due`,
          // The amount belongs in the description: a deadline with no figure
          // attached is only half the obligation.
          description:
            `Estimated payment of ${USD.format(total)} for ${entry.incomePeriod} ` +
            `(${USD.format(entry.federalPayment)} federal, ${USD.format(entry.statePayment)} state).`,
          date: entry.dueDate.toISOString(),
          type: "payment",
          // Missing a 1040-ES deadline is an automatic underpayment penalty.
          priority: "critical",
          isCompleted: false,
          category: "estimated-tax",
        };
      });

    return NextResponse.json({
      success: true,
      data: { events, profileMissing: false, year },
    });
  } catch (error) {
    // An empty calendar reads as "nothing due", the most dangerous wrong
    // answer a deadline feature can give.
    console.error("Tax calendar failed:", error);
    return NextResponse.json(
      { error: "Failed to build tax calendar" },
      { status: 500 },
    );
  }
});
