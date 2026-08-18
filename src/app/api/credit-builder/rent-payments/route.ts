/**
 * The caller's rent payments and the accounts reporting them.
 *
 * GET /api/credit-builder/rent-payments -> { payments, accounts }
 *
 * WHY THIS EXISTS. Rent reporting is a marketed credit-building feature with a
 * complete implementation behind it — rent_reporting_accounts and rent_payments
 * (20260731000022), plus RentReportingIntegrationService — and, until now, not
 * one route. docs/qa/triage-financial.md graded it UNREACHABLE and said:
 * "Delete, or build the tables and expose a route." The tables were built; the
 * route was not.
 *
 * Meanwhile mobile-app/app/credit-builder/payments.tsx, titled "Payment
 * History", showed every user a hardcoded Chase Freedom payment, a Capital One
 * payment, and a Discover payment five days LATE. Telling someone they have a
 * late payment they do not have is the same class of harm as hiding one — it is
 * the exact data a user would open a dispute over.
 *
 * WHAT THIS DOES NOT RETURN. RentReportingIntegrationService.getReportingStats
 * exposes `estimatedScoreImpact`, computed as
 * `min(50, monthsReporting * 2)` plus 10 for a perfect on-time run plus 10 for
 * three-bureau coverage. Nothing measures that; it is a formula somebody wrote
 * down. Returning it beside real payment rows would launder a guess into a
 * number the user reads as their score change, so it is deliberately absent.
 * The honest counts (on time, late, pending) are derivable from `payments` by
 * whoever renders them.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { getRentReportingService } from "@/lib/credit/services/RentReportingService";

export const GET = withPermission(
  "credit:read",
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const service = getRentReportingService();

      // Both are user-scoped inside the service. Fetched together because a
      // payment on its own cannot say which property it was for.
      const [payments, accounts] = await Promise.all([
        service.getAllPayments(user.id),
        service.getUserAccounts(user.id),
      ]);

      return NextResponse.json({ payments, accounts });
    } catch (error) {
      // No mock fallback. A user with no rent reporting set up must see an
      // empty list, and a user whose lookup failed must see an error — the two
      // lead to opposite actions, and collapsing them is how the screen this
      // replaces looked plausible.
      console.error("[credit-builder/rent-payments] failed to load", error);
      return NextResponse.json(
        { error: "Failed to load rent payments" },
        { status: 500 },
      );
    }
  },
);
