/**
 * Deduction Categories API
 *
 * GET /api/tax/deductions/categories[?year=YYYY]
 * The recognised categories, each with the caller's running total and the
 * entries behind it.
 *
 * The categories themselves are a fixed vocabulary — they mirror IRS Schedule A
 * lines and do not vary per user — but `currentTotal` and `items` are the
 * caller's own, so the whole response is authenticated and user-scoped.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { DEDUCTION_CATEGORIES } from "../route";

/** SALT is capped by statute; surfacing it lets the UI show a ceiling. */
const CATEGORY_CAPS: Record<string, number> = {
  state_local_tax: 10_000,
  student_loan_interest: 2_500,
};

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

function toDeduction(row: DeductionRow) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    // NUMERIC arrives as a string; the client declares `amount: number`.
    amount: Number(row.amount),
    date: row.deduction_date,
    documentId: row.document_id ?? undefined,
    isVerified: row.is_verified,
    notes: row.notes ?? undefined,
  };
}

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
    // idor-audit: pk-owner-checked — SELECT filtered by the authenticated
    // user_id; totals shown against a category must be this caller's own.
    const { data, error } = await getServiceRoleClient()
      .from("tax_deductions")
      .select("*")
      .eq("user_id", user.id)
      .eq("tax_year", year);

    if (error) {
      // Zeroed totals would read as "you have claimed nothing in any
      // category", which is a specific and wrong statement about someone's
      // return rather than an absence of data.
      console.error("Failed to read deductions for categories:", error);
      return NextResponse.json(
        { error: "Failed to load deduction categories" },
        { status: 500 },
      );
    }

    const rows = ((data ?? []) as DeductionRow[]).map(toDeduction);

    const categories = DEDUCTION_CATEGORIES.map((category) => {
      const items = rows.filter((r) => r.category === category.id);
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        maxDeductible: CATEGORY_CAPS[category.id],
        currentTotal: items.reduce((sum, i) => sum + i.amount, 0),
        items,
      };
    });

    return NextResponse.json({ success: true, data: { categories, year } });
  } catch (error) {
    console.error("Failed to load deduction categories:", error);
    return NextResponse.json(
      { error: "Failed to load deduction categories" },
      { status: 500 },
    );
  }
});
