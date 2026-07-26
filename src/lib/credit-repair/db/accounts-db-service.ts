/**
 * Credit Accounts Database Service
 *
 * Read operations for a user's credit tradelines — the real, RLS-protected
 * `credit_accounts` table (migration `20250107_credit_bureau_tables.sql`).
 * These are the normalized per-account rows imported from a credit report:
 * account type, creditor, balances, payment status, and open/close dates.
 *
 * FCRA-sensitive data. Scoping is enforced here with an explicit
 * `.eq("user_id", userId)` filter (defense-in-depth on top of the table's RLS);
 * a row that is not the requesting user's must never be returned.
 *
 * Features:
 * - User-scoped tradeline reads (newest-opened first, unknown open dates last)
 * - Pure `computeAgeMonths` derivation of account age from `opened_date`
 * - Honest null mapping — a missing balance / limit / status / date is reported
 *   as `null`, never a fabricated value
 */

import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();

// ============================================================================
// TYPES
// ============================================================================

/**
 * Credit account / tradeline (application shape, camelCase).
 *
 * Money fields (`balance`, `creditLimit`), `paymentStatus`, and `openedDate`
 * are nullable because the source columns are nullable — a missing value is
 * surfaced as `null` rather than guessed. `openedDate` is the raw ISO date
 * string (`YYYY-MM-DD`) from the `DATE` column; account age is derived
 * separately (`computeAgeMonths`) so the read has no dependency on the current
 * time.
 */
export interface CreditAccount {
  id: string;
  creditorName: string;
  accountType: string;
  balance: number | null;
  creditLimit: number | null;
  paymentStatus: string | null;
  openedDate: string | null;
}

/** Raw `credit_accounts` row (snake_case, as returned by PostgREST). */
interface CreditAccountRow {
  id: string;
  creditor_name: string;
  account_type: string;
  balance: number | null;
  credit_limit: number | null;
  payment_status: string | null;
  opened_date: string | null;
}

const ACCOUNT_SELECT =
  "id, creditor_name, account_type, balance, credit_limit, payment_status, opened_date";

const DEFAULT_LIMIT = 50;
const MONTHS_PER_YEAR = 12;

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all credit accounts (tradelines) for a user.
 *
 * User scoping is enforced with an explicit `.eq("user_id", userId)` filter
 * (defense-in-depth alongside the table's RLS). Accounts are ordered by
 * `opened_date` descending (newest first) with unknown open dates last.
 */
export async function getAccountsByUser(
  userId: string,
  filters?: { limit?: number; offset?: number },
): Promise<CreditAccount[]> {
  try {
    let query = supabase
      .from("credit_accounts")
      .select(ACCOUNT_SELECT)
      .eq("user_id", userId)
      .order("opened_date", { ascending: false, nullsFirst: false });

    if (filters?.offset !== undefined) {
      const limitValue = filters.limit ?? DEFAULT_LIMIT;
      query = query.range(filters.offset, filters.offset + limitValue - 1);
    } else if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as unknown as CreditAccountRow[];
    return rows.map(mapAccountFromDb);
  } catch (error) {
    // AccountsDB error: Error getting accounts by user
    throw new Error(`Failed to get accounts: ${(error as Error).message}`);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Complete calendar months between `openedDate` and `now`.
 *
 * Returns `null` when `openedDate` is missing or unparseable — a tradeline with
 * no recorded open date has an unknown age, reported honestly rather than
 * defaulted to 0. Computed in UTC on both sides so the result is independent of
 * the runtime's timezone. A *present-but-future* `opened_date` (anomalous data)
 * floors to 0 — an account cannot have been open for negative time; this 0 is
 * distinct from a *missing* date, which returns `null` (we never coerce a
 * missing date to 0).
 */
export function computeAgeMonths(
  openedDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!openedDate) return null;

  const opened = new Date(openedDate);
  if (Number.isNaN(opened.getTime())) return null;

  let months =
    (now.getUTCFullYear() - opened.getUTCFullYear()) * MONTHS_PER_YEAR +
    (now.getUTCMonth() - opened.getUTCMonth());

  // Count only complete months: if this month's day-of-month has not yet
  // reached the open day, the final month is not complete.
  if (now.getUTCDate() < opened.getUTCDate()) {
    months -= 1;
  }

  return months < 0 ? 0 : months;
}

function mapAccountFromDb(row: CreditAccountRow): CreditAccount {
  return {
    id: row.id,
    creditorName: row.creditor_name,
    accountType: row.account_type,
    balance: row.balance ?? null,
    creditLimit: row.credit_limit ?? null,
    paymentStatus: row.payment_status ?? null,
    openedDate: row.opened_date ?? null,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const accountsDbService = {
  getAccountsByUser,
  computeAgeMonths,
};

export default accountsDbService;
