/**
 * Disputable Credit Items API Route
 *
 * GET /api/credit-repair/disputable-items - The authenticated user's real
 * disputable credit items, as the union of two RLS-protected sources:
 *
 *   - `type: "account"` — NEGATIVE tradelines from `credit_accounts`: rows whose
 *     `payment_status` is a derogatory status (late / delinquent / collection /
 *     charge-off / derogatory). Accounts in good standing (current / closed /
 *     paid) are EXCLUDED — they are not disputable.
 *   - `type: "inquiry"` — UNDISPUTED inquiries from `credit_inquiries`: rows with
 *     `is_disputed = false`. Already-disputed inquiries are EXCLUDED.
 *
 * Features:
 * - Permission-gated (`credit:read`); the user id comes from the guard, never
 *   from query/body (IDOR-safe). Both underlying reads are user-scoped.
 * - Honest empty result (`{ items: [] }`) when the user has nothing disputable
 *   (no mock fallback).
 * - Honest 503 on a data-access failure (never a mock fallback).
 * - Audit logging (counts only — no creditor PII in the log line).
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { db } from "@/lib/credit-repair/db";
import { auditLogger } from "@/lib/security/audit-logging";

/**
 * A single disputable item on the wire (union of a negative tradeline and an
 * undisputed inquiry).
 */
interface DisputableItem {
  id: string;
  accountName: string;
  status: string;
  balance: number | null;
  type: "account" | "inquiry";
}

/**
 * Payment-status substrings that mark a tradeline as DEROGATORY (disputable).
 *
 * `credit_accounts.payment_status` is a free-text column (no DB CHECK
 * constraint — migration `20250107_credit_bureau_tables.sql`), and the codebase
 * carries two `PaymentStatus` spellings:
 *   - `src/types/credit-bureau.ts`:  late_30 | late_60 | late_90 | late_120 |
 *     charge_off | collection
 *   - `src/lib/credit-bureau/types.ts`:  late | charged_off | collection
 * plus the `account_summary` view's `payment_status LIKE '%late%'`.
 *
 * A case-insensitive substring match over these tokens classifies every
 * negative spelling as disputable while EXCLUDING good-standing statuses
 * (current, closed, paid) — none of which contain any of these tokens.
 * `delinquent` and `derogatory` are included as the standard synonyms named in
 * the FR-204 contract.
 */
const DEROGATORY_STATUS_TOKENS = [
  "late", // late, late_30, late_60, late_90, late_120
  "delinquent",
  "collection",
  "charge", // charge_off, charged_off, charge-off, chargeoff
  "derogatory",
] as const;

/**
 * True when `status` is a derogatory (disputable) payment status. A `null`
 * status is unknown, never assumed disputable — we do not fabricate a dispute
 * reason. Narrows to `string` so the mapped `status` field is non-null.
 */
function isDisputableAccountStatus(status: string | null): status is string {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return DEROGATORY_STATUS_TOKENS.some((token) => normalized.includes(token));
}

/**
 * GET /api/credit-repair/disputable-items
 * The authenticated user's negative tradelines + undisputed inquiries.
 *
 * The user id is taken from the authenticated session (`user.id`), never from
 * the request — accepting a client-supplied id here would be an IDOR.
 */
export const GET = withPermission(
  "credit:read",
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      // Both reads are user-scoped by `user.id` (RLS enforces too) and
      // independent, so they run in parallel.
      const [accounts, inquiries] = await Promise.all([
        db.accounts.getAccountsByUser(user.id),
        db.inquiries.getInquiriesByUser(user.id),
      ]);

      // Negative tradelines only — good-standing accounts are excluded.
      const accountItems: DisputableItem[] = accounts.flatMap((account) => {
        const status = account.paymentStatus;
        if (!isDisputableAccountStatus(status)) return [];
        return [
          {
            id: account.id,
            accountName: account.creditorName,
            status,
            balance: account.balance,
            type: "account" as const,
          },
        ];
      });

      // Undisputed inquiries only — already-disputed inquiries are excluded.
      // An inquiry has no balance, so `balance` is honestly `null`.
      const inquiryItems: DisputableItem[] = inquiries
        .filter((inquiry) => !inquiry.isDisputed)
        .map((inquiry) => ({
          id: inquiry.id,
          accountName: inquiry.creditorName,
          status: inquiry.inquiryType,
          balance: null,
          type: "inquiry" as const,
        }));

      const items = [...accountItems, ...inquiryItems];

      await auditLogger.logAIInteraction({
        userId: user.id,
        action: "get_disputable_items",
        input: {},
        output: {
          count: items.length,
          accounts: accountItems.length,
          inquiries: inquiryItems.length,
        },
        success: true,
      });

      // Honest empty array when the user has nothing disputable (no mock fallback).
      return NextResponse.json({ items });
    } catch (error) {
      // DisputableItemsAPI error: failed to build the disputable-items union.
      try {
        await auditLogger.logSecurityEvent({
          type: "api_error",
          message: `Failed to get disputable items: ${(error as Error).message}`,
          severity: "medium",
        });
      } catch {
        // Audit-log failure must not mask the original error response.
      }

      // Data-access failure is an infra fault → 503, never a mock fallback.
      return NextResponse.json(
        {
          error: "Service unavailable",
          message: "Failed to get disputable items",
        },
        { status: 503 },
      );
    }
  },
);
