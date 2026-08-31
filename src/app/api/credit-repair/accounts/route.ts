/**
 * Credit Accounts (Tradelines) API Route
 *
 * GET /api/credit-repair/accounts - Get the authenticated user's credit
 * tradelines (real `credit_accounts` rows, RLS-protected), with account age
 * derived from `opened_date`.
 *
 * Features:
 * - Permission-gated (`credit:read`); the user id comes from the guard, never
 *   from query/body (IDOR-safe)
 * - Account age (`ageMonths`) computed from `opened_date`; `null` when the open
 *   date is unknown — never fabricated or defaulted to 0
 * - Honest empty result when the user has no tradelines (no mock fallback)
 * - Honest 503 on a data-access failure (never a mock fallback)
 * - Audit logging (access count only — no tradeline PII in the log line)
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { db } from "@/lib/credit-repair/db";
// `computeAgeMonths` is imported from the service module (not the `db` barrel)
// because it is a pure derivation, not a data-access method on the facade.
import { computeAgeMonths } from "@/lib/credit-repair/db/accounts-db-service";
import { auditLogger } from "@/lib/security/audit-logging";

const DEFAULT_LIMIT = 50;

/**
 * GET /api/credit-repair/accounts
 * Get the authenticated user's credit tradelines with derived account age.
 *
 * The user id is taken from the authenticated session (`user.id`), never from
 * the request — accepting a client-supplied id here would be an IDOR.
 */
export const GET = withPermission(
  "credit:read",
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = Number.parseInt(
        searchParams.get("limit") || String(DEFAULT_LIMIT),
      );
      const offset = Number.parseInt(searchParams.get("offset") || "0");

      const rows = await db.accounts.getAccountsByUser(user.id, {
        limit,
        offset,
      });

      // Map to the wire contract. `ageMonths` is derived from `openedDate`
      // (null when the open date is unknown); `paymentStatus` coerces a missing
      // status to an empty string (unknown), never a fabricated status.
      const accounts = rows.map((account) => ({
        id: account.id,
        creditorName: account.creditorName,
        accountType: account.accountType,
        balance: account.balance,
        creditLimit: account.creditLimit,
        paymentStatus: account.paymentStatus ?? "",
        openedDate: account.openedDate,
        // A closed tradeline still counts toward credit age, and without
        // this a screen cannot tell open from closed.
        closedDate: account.closedDate,
        ageMonths: computeAgeMonths(account.openedDate),
      }));

      await auditLogger.logAIInteraction({
        userId: user.id,
        action: "get_credit_accounts",
        input: { limit, offset },
        output: { count: accounts.length },
        success: true,
      });

      // Honest empty array when the user has no tradelines (no mock fallback).
      return NextResponse.json({ accounts });
    } catch (error) {
      // AccountsAPI error: Error getting credit accounts
      try {
        await auditLogger.logSecurityEvent({
          type: "api_error",
          message: `Failed to get credit accounts: ${(error as Error).message}`,
          severity: "medium",
        });
      } catch {
        // Audit-log failure must not mask the original error response.
      }

      // Data-access failure is an infra fault → 503, never a mock fallback.
      return NextResponse.json(
        {
          error: "Service unavailable",
          message: "Failed to get credit accounts",
        },
        { status: 503 },
      );
    }
  },
);
