/**
 * A single tracked student loan.
 *
 * GET    /api/student-loans/[id] — read one
 * PATCH  /api/student-loans/[id] — edit balance, rate, status or servicer
 * DELETE /api/student-loans/[id] — stop tracking it
 *
 * The collection at /api/student-loans existed; this did not, so the detail
 * screen (app/student-loans/[id].tsx) read, edited and deleted into a 404.
 *
 * WHAT IS DELIBERATELY NOT RETURNED. The same explicit column list the
 * collection uses, for the same reasons it documents:
 *
 *  - `account_number` is stored in the clear and is NOT NULL. Returning it
 *    from a new endpoint would add an exposure nobody asked for; the screen
 *    renders a loan, not an account number. Masking it here would still be a
 *    decision about how much to reveal, so it is simply not selected.
 *  - `fresh_start_eligible`, `rehabilitation_eligible`, `discharge_eligible`
 *    and `borrower_defense_eligible` are populated by FederalIntegrationService,
 *    which has never contacted NSLDS. Telling someone they are eligible for
 *    borrower defence on the strength of a mock is the exact failure the
 *    collection route was rewritten to remove.
 *
 * Service-role bypasses RLS, so `.eq("user_id", user.id)` on every query is the
 * entire ownership boundary.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The columns this route is willing to disclose. See the note above. */
const SAFE_COLUMNS =
  "id, loan_id, loan_type, servicer_name, current_balance, original_amount, interest_rate, loan_status, disbursement_date, updated_at";

/**
 * Fields a caller may edit, mapped to their columns.
 *
 * UpdateLoanInput on the client also carries `monthlyPayment` and
 * `repaymentPlan`. student_loans has no column for either, so they are
 * REJECTED rather than accepted and dropped — silently ignoring a field tells
 * someone their edit saved when nothing changed.
 */
const EDITABLE: Record<string, string> = {
  currentBalance: "current_balance",
  interestRate: "interest_rate",
  status: "loan_status",
  servicer: "servicer_name",
};

/** Rates are stored as a percentage; a negative or absurd one is a typo. */
const MAX_INTEREST_RATE = 100;
/** A balance larger than any real student loan is a units mistake. */
const MAX_BALANCE = 10_000_000;

/**
 * A narrowed handle on `student_loans`.
 *
 * The table is not in the generated `Database` type — it covers roughly 20 of
 * the 40+ tables this codebase uses (see lib/supabase/client.ts) — so writes
 * type-check as `never`. Elsewhere the codebase reaches for
 * `(supabaseAdmin as any)`; this narrows the client once to the exact surface
 * this route uses instead, so the calls below stay type-checked.
 */
interface LoanQuery {
  select: (columns: string) => LoanQuery;
  update: (values: Record<string, unknown>) => LoanQuery;
  delete: () => LoanQuery;
  eq: (column: string, value: string) => LoanQuery;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  }>;
}

const loanTable = (): LoanQuery =>
  (supabaseAdmin as unknown as { from: (table: string) => LoanQuery }).from(
    "student_loans",
  );

function loanIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

/** Postgres numeric arrives as a string; Number() it once, at the boundary. */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

interface LoanRow {
  id: string;
  loan_id: string;
  loan_type: string;
  servicer_name: string;
  current_balance: number | string | null;
  original_amount: number | string | null;
  interest_rate: number | string | null;
  loan_status: string;
  disbursement_date: string | null;
  updated_at: string | null;
}

/**
 * The shape the detail screen renders.
 *
 * monthlyPayment, repaymentPlan, remainingPayments, pslf_eligible and
 * idr_eligible are absent because nothing stores them. A monthly payment
 * cannot even be derived — the term length is not recorded — and a computed
 * guess would read as a fact about someone's debt.
 */
function toLoan(row: LoanRow) {
  return {
    id: row.id,
    loanId: row.loan_id,
    loanType: row.loan_type,
    servicer: row.servicer_name,
    currentBalance: num(row.current_balance) ?? 0,
    originalPrincipal: num(row.original_amount) ?? 0,
    interestRate: num(row.interest_rate) ?? 0,
    status: row.loan_status,
    originationDate: row.disbursement_date,
    updatedAt: row.updated_at,
  };
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  const id = loanIdFrom(request);
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid loan id" }, { status: 400 });
  }

  const { data, error } = await loanTable()
    .select(SAFE_COLUMNS)
    // idor-audit: pk-owner-checked — filtered to the JWT-verified caller.
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[student-loans/:id] read failed", error);
    return NextResponse.json(
      { error: "Could not load that loan" },
      { status: 500 },
    );
  }

  if (!data) {
    // 404 for "no such loan" and "not yours" alike.
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  return NextResponse.json({ loan: toLoan(data as unknown as LoanRow) });
});

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = loanIdFrom(request);
    if (!UUID.test(id)) {
      return NextResponse.json({ error: "Invalid loan id" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(body ?? {})) {
      const column = EDITABLE[field];
      if (!column) {
        return NextResponse.json(
          { error: `${field} cannot be edited here` },
          { status: 400 },
        );
      }

      if (field === "currentBalance" || field === "interestRate") {
        const n = num(value);
        const ceiling =
          field === "interestRate" ? MAX_INTEREST_RATE : MAX_BALANCE;
        if (n === null || n < 0 || n > ceiling) {
          return NextResponse.json(
            { error: `${field} must be a number between 0 and ${ceiling}` },
            { status: 400 },
          );
        }
        patch[column] = n;
        continue;
      }

      if (typeof value !== "string" || !value.trim()) {
        return NextResponse.json(
          { error: `${field} must be a non-empty string` },
          { status: 400 },
        );
      }
      patch[column] = value.trim();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await loanTable()
      .update(patch)
      // idor-audit: pk-owner-checked — user_id is the whole ownership boundary
      // once service-role has bypassed RLS.
      .eq("id", id)
      .eq("user_id", user.id)
      .select(SAFE_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error("[student-loans/:id] update failed", error);
      return NextResponse.json(
        { error: "Could not update that loan" },
        { status: 500 },
      );
    }

    if (!data) {
      // Updating zero rows is not a Postgres error, so this is the only signal
      // that the loan was not the caller's. Answering 200 would show the edit
      // as saved.
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    return NextResponse.json({ loan: toLoan(data as unknown as LoanRow) });
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const id = loanIdFrom(request);
    if (!UUID.test(id)) {
      return NextResponse.json({ error: "Invalid loan id" }, { status: 400 });
    }

    const { data, error } = await loanTable()
      .delete()
      // idor-audit: pk-owner-checked — without user_id this deletes anyone's loan.
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[student-loans/:id] delete failed", error);
      return NextResponse.json(
        { error: "Could not delete that loan" },
        { status: 500 },
      );
    }

    if (!data) {
      // Deleting zero rows resolves cleanly. Reporting success here would tell
      // someone their loan was removed while it is still on their list.
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: String(data.id) });
  },
);
