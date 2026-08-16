/**
 * Tax Deductions Collection API
 *
 * GET  /api/tax/deductions[?year=YYYY][&category=x] — the caller's deductions
 * POST /api/tax/deductions                          — record a new one
 *
 * Backed by the tax_deductions table added in 20260815000000. Both handlers use
 * the service-role client, which bypasses RLS, so the `.eq("user_id", ...)` on
 * the read and the server-set user_id on the write are the controls that
 * actually run.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { DEDUCTION_CATEGORIES } from "@/lib/tax/deduction-categories";


const CATEGORY_IDS = DEDUCTION_CATEGORIES.map((c) => c.id) as string[];

/** Ceiling on a single recorded deduction, to reject a fat-fingered entry. */
const MAX_AMOUNT = 100_000_000;

interface DeductionRow {
  id: string;
  category: string;
  name: string;
  amount: string | number;
  deduction_date: string;
  document_id: string | null;
  is_verified: boolean;
  notes: string | null;
}

/**
 * Row -> the TaxDeduction shape the client declares.
 *
 * `amount` comes back from a NUMERIC column as a STRING via node-postgres,
 * because a numeric can exceed what a JS number represents exactly. Returning
 * it unconverted would give the client "1200.00" where it expects 1200, and
 * every arithmetic on it would then be string concatenation.
 */
function toDeduction(row: DeductionRow) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    amount: Number(row.amount),
    date: row.deduction_date,
    documentId: row.document_id ?? undefined,
    isVerified: row.is_verified,
    notes: row.notes ?? undefined,
  };
}

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

  const category = params.get("category");
  if (category !== null && !CATEGORY_IDS.includes(category)) {
    return NextResponse.json(
      { error: `category must be one of: ${CATEGORY_IDS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // idor-audit: pk-owner-checked — SELECT filtered by the authenticated
    // user_id; the service-role client bypasses RLS so this is the control.
    let query = getServiceRoleClient()
      .from("tax_deductions")
      .select("*")
      .eq("user_id", user.id)
      .eq("tax_year", year);

    if (category) query = query.eq("category", category);

    const { data, error } = await query.order("deduction_date", {
      ascending: false,
    });

    if (error) {
      // A read failure must not render as "no deductions recorded" — that
      // would invite a user to enter everything a second time.
      console.error("Failed to list tax deductions:", error);
      return NextResponse.json(
        { error: "Failed to load deductions" },
        { status: 500 },
      );
    }

    const deductions = ((data ?? []) as DeductionRow[]).map(toDeduction);
    const total = deductions.reduce((sum, d) => sum + d.amount, 0);

    return NextResponse.json({
      success: true,
      data: { deductions, total, year },
    });
  } catch (error) {
    console.error("Failed to list tax deductions:", error);
    return NextResponse.json(
      { error: "Failed to load deductions" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  let body: {
    category?: string;
    name?: string;
    amount?: number;
    date?: string;
    documentId?: string;
    notes?: string;
    taxYear?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.category || !CATEGORY_IDS.includes(body.category)) {
    return NextResponse.json(
      { error: `category must be one of: ${CATEGORY_IDS.join(", ")}` },
      { status: 400 },
    );
  }
  if (
    typeof body.amount !== "number" ||
    !Number.isFinite(body.amount) ||
    body.amount < 0 ||
    body.amount > MAX_AMOUNT
  ) {
    return NextResponse.json(
      { error: `amount must be a number between 0 and ${MAX_AMOUNT}` },
      { status: 400 },
    );
  }
  const date = body.date ?? "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(date) || Number.isNaN(Date.parse(date))) {
    return NextResponse.json(
      { error: "date is required and must be an ISO date" },
      { status: 400 },
    );
  }

  try {
    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the
    // AUTHENTICATED caller; a user_id in the body is never read, so a
    // deduction cannot be filed against someone else's return.
    const { data, error } = await getServiceRoleClient()
      .from("tax_deductions")
      .insert({
        user_id: user.id,
        tax_year: body.taxYear ?? new Date(date).getUTCFullYear(),
        category: body.category,
        name: body.name,
        amount: body.amount,
        deduction_date: date,
        document_id: body.documentId ?? null,
        notes: body.notes ?? null,
        // Never trusted from the client: a self-asserted "verified" would let
        // an unsubstantiated entry look reviewed.
        is_verified: false,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Failed to record tax deduction:", error);
      return NextResponse.json(
        { error: "Failed to record deduction" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, data: toDeduction(data as DeductionRow) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to record tax deduction:", error);
    return NextResponse.json(
      { error: "Failed to record deduction" },
      { status: 500 },
    );
  }
});
