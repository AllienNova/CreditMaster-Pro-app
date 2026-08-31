/**
 * GET /api/credit-builder/debts — the caller's debt accounts.
 *
 * Fetched by two pages: /credit-builder/debt-strategy (page.tsx:93) and
 * /credit-builder/pay-for-delete (page.tsx:375). The route did not exist, so
 * both 404'd.
 *
 * That mattered more on debt-strategy, which caught the failure and rendered
 * HARDCODED debts — "Chase Credit Card $5,000 at 19.99%", "Discover Card
 * $3,000" — to a user who has neither. A payoff simulation then ran on those
 * invented numbers and told them how long their debt would take to clear. The
 * fallback is removed in the same commit as this route.
 *
 * `priority` is DERIVED, not stored: debt_accounts has no such column, and the
 * order is 1-based by interest rate descending — the avalanche default, which
 * is also the order that minimises interest paid. The page re-sorts when the
 * user picks snowball, so this is a starting order rather than a claim about
 * what the user should pay first.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    // idor-audit: user-scoped — the id comes from withAuth, never the request.
    const { data, error } = await supabase
      .from("debt_accounts")
      .select(
        "id, name, type, balance, original_balance, interest_rate, minimum_payment, due_date, creditor_name",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("interest_rate", { ascending: false });

    if (error) throw error;

    const debts = (data ?? []).map((row, index) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: row.balance,
      originalBalance: row.original_balance,
      interestRate: row.interest_rate,
      minimumPayment: row.minimum_payment,
      dueDate: row.due_date,
      creditorName: row.creditor_name,
      priority: index + 1,
    }));

    return NextResponse.json({ success: true, debts });
  } catch (error) {
    console.error("Debt accounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch debt accounts" },
      { status: 500 },
    );
  }
});
