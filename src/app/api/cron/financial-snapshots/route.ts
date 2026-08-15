/**
 * Daily financial snapshot producer — the missing writer for the trend series.
 *
 * Five history tables feed getFinancialTrends(): net_worth_history,
 * savings_history, debt_history, investment_history and monthly_summaries.
 * Every one of them existed (or was built during Wave 7) and NOTHING WROTE TO
 * ANY OF THEM. The trends charts were structurally incapable of showing a line,
 * and creating the tables alone did not change that — a table with no producer
 * is a phantom feature rather than a phantom table.
 *
 * This job is that producer.
 *
 * IDEMPOTENT BY DAY. Every write is an upsert on (user_id, date) — or
 * (user_id, month) for monthly_summaries — so re-running, retrying, or
 * double-scheduling updates the day's row instead of appending a duplicate
 * point. debt_history lacked the required unique constraint and gets one in
 * 20260731000210.
 *
 * PARTIAL FAILURE IS REPORTED, NOT SWALLOWED. A user whose snapshot fails does
 * not abort the run — the remaining users still get theirs — but the failure is
 * counted and returned, and a run with any failure responds 207 rather than
 * 200. A cron that reports success while writing nothing is the exact failure
 * mode this wave has been removing; see the four notification inserts in
 * /api/cron/send-reminders that failed silently for months.
 */

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { verifyCronRequest } from "@/lib/security/cron-auth";

/** Users processed per batch, to bound memory on a large account base. */
const USER_BATCH_SIZE = 500;

/**
 * Stop starting new users after this long and report the run as incomplete.
 *
 * vercel.json gives this route maxDuration 300s. Each user costs ~8 queries, so
 * a large enough account base WILL outgrow that. Hitting the platform timeout
 * would kill the function mid-write with no report and no record of where it
 * stopped — the run would simply vanish. Stopping ourselves at a margin below
 * the limit means an over-long run degrades into an honest partial result
 * (`complete: false` plus the count processed) instead of a silent death.
 *
 * When this starts tripping, the fix is a resumable cursor, not a bigger
 * number.
 */
const TIME_BUDGET_MS = 240_000;

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase credentials not configured");
  }

  // Service role: this job reads and writes across all users, so it runs
  // outside RLS by design. It never accepts a user id from the request.
  return createClient(url, key);
}


function sum(rows: Array<Record<string, unknown>>, field: string): number {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

interface SnapshotTotals {
  assets: number;
  liabilities: number;
  investments: number;
  savings: number;
}

/**
 * Compute a user's current position from the real source tables.
 *
 * `savings` is the balance of depository accounts specifically, not all assets —
 * conflating the two would make the savings series a duplicate of net worth.
 */
async function computeTotals(
  supabase: SupabaseClient,
  userId: string,
): Promise<SnapshotTotals> {
  const [accountsResult, debtsResult, holdingsResult] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("current_balance, account_type")
      .eq("user_id", userId),
    supabase
      .from("debt_accounts")
      .select("balance")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("investment_holdings")
      .select("current_value")
      .eq("user_id", userId),
  ]);

  // Any query error must abort THIS user's snapshot. Treating a failed read as
  // a zero would write a fabricated data point into a chart the user trusts —
  // a wrong line is worse than a missing one.
  if (accountsResult.error) throw accountsResult.error;
  if (debtsResult.error) throw debtsResult.error;
  if (holdingsResult.error) throw holdingsResult.error;

  const accounts = accountsResult.data ?? [];
  const investments = sum(holdingsResult.data ?? [], "current_value");

  return {
    assets: sum(accounts, "current_balance") + investments,
    liabilities: sum(debtsResult.data ?? [], "balance"),
    investments,
    savings: sum(
      accounts.filter((a) => a.account_type === "depository"),
      "current_balance",
    ),
  };
}

/** Income and expenses for the calendar month containing `today`. */
async function computeMonthTotals(
  supabase: SupabaseClient,
  userId: string,
  monthStart: string,
  monthEnd: string,
): Promise<{ income: number; expenses: number }> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", monthStart)
    .lte("date", monthEnd);

  if (error) throw error;

  const rows = data ?? [];
  return {
    // Plaid's sign convention: a positive amount is money leaving the account.
    income: rows.reduce(
      (t, r) => t + (Number(r.amount) < 0 ? -Number(r.amount) : 0),
      0,
    ),
    expenses: rows.reduce(
      (t, r) => t + (Number(r.amount) > 0 ? Number(r.amount) : 0),
      0,
    ),
  };
}

async function snapshotUser(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  monthStart: string,
  monthEnd: string,
): Promise<void> {
  const totals = await computeTotals(supabase, userId);
  const month = await computeMonthTotals(supabase, userId, monthStart, monthEnd);

  const writes = await Promise.all([
    // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
    supabase.from("net_worth_history").upsert(
      {
        user_id: userId,
        date: today,
        net_worth: totals.assets - totals.liabilities,
        total_assets: totals.assets,
        total_liabilities: totals.liabilities,
      },
      { onConflict: "user_id,date" },
    ),
    // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
    supabase.from("savings_history").upsert(
      { user_id: userId, date: today, total_saved: totals.savings },
      { onConflict: "user_id,date" },
    ),
    // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
    supabase.from("debt_history").upsert(
      { user_id: userId, date: today, total_debt: totals.liabilities },
      { onConflict: "user_id,date" },
    ),
    // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
    supabase.from("investment_history").upsert(
      { user_id: userId, date: today, total_value: totals.investments },
      { onConflict: "user_id,date" },
    ),
    // idor-audit: cross-user — system batch job over all users; no user session exists and the route is gated by CRON_SECRET
    supabase.from("monthly_summaries").upsert(
      {
        user_id: userId,
        month: monthStart,
        total_income: month.income,
        total_expenses: month.expenses,
      },
      { onConflict: "user_id,month" },
    ),
  ]);

  const failed = writes.find((w) => w.error);
  if (failed?.error) throw failed.error;
}

export async function GET(request: Request) {
  // Gated in EVERY environment, not just production. These jobs mutate data
  // for all users, and a staging or preview deploy running with any other
  // NODE_ENV was previously wide open. Local runs set CRON_SECRET like any
  // other credential.
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const results = { users: 0, snapshots: 0, failures: 0 };
    const errors: Array<{ userId: string; message: string }> = [];
    const startedAt = Date.now();
    let complete = true;

    let offset = 0;
    for (;;) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        complete = false;
        break;
      }
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id")
        .range(offset, offset + USER_BATCH_SIZE - 1);

      if (error) throw error;
      if (!profiles || profiles.length === 0) break;

      for (const profile of profiles) {
        if (Date.now() - startedAt > TIME_BUDGET_MS) {
          complete = false;
          break;
        }
        results.users++;
        try {
          await snapshotUser(
            supabase,
            profile.id as string,
            today,
            monthStart,
            monthEnd,
          );
          results.snapshots++;
        } catch (err) {
          // One user's failure must not cost every later user their snapshot,
          // but it is counted and surfaced rather than swallowed.
          results.failures++;
          errors.push({
            userId: profile.id as string,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (!complete || profiles.length < USER_BATCH_SIZE) break;
      offset += USER_BATCH_SIZE;
    }

    // 207 when anything failed: a run that wrote nothing must not look like a
    // clean success to whatever monitors this endpoint.
    return NextResponse.json(
      {
        success: results.failures === 0 && complete,
        complete,
        date: today,
        ...results,
        errors: errors.slice(0, 20),
      },
      { status: results.failures > 0 || !complete ? 207 : 200 },
    );
  } catch (error) {
    console.error("Financial snapshot cron failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Snapshot run failed",
      },
      { status: 500 },
    );
  }
}
