/**
 * User Analytics API
 *
 * Returns personalized analytics for the credit dashboard, sourced from real
 * per-user data (credit_score_history, disputes) scoped to the authenticated
 * user's id. No fabricated or random values: when a data source is empty or
 * unconfigured, the corresponding field returns an honest empty/zeroed value
 * rather than placeholder numbers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

interface CreditHistoryPoint {
  date: string;
  score: number;
}

interface DisputeStats {
  total: number;
  resolved: number;
  pending: number;
  successRate: number;
}

const EMPTY_DISPUTE_STATS: DisputeStats = {
  total: 0,
  resolved: 0,
  pending: 0,
  successRate: 0,
};

function monthsForRange(range: string): number {
  if (range === "3m") return 3;
  if (range === "6m") return 6;
  return 12;
}

/**
 * Collapse raw score-history rows into one blended point per calendar month
 * (averaging across bureaus recorded that month), oldest-first. Months with no
 * recorded score are omitted — no gap-filling, no fabrication.
 */
function aggregateMonthly(
  rows: { score: number; recorded_at: string }[],
): CreditHistoryPoint[] {
  const byMonth = new Map<
    string,
    { sum: number; count: number; order: number; month: number }
  >();

  for (const row of rows) {
    const recordedAt = new Date(row.recorded_at);
    if (Number.isNaN(recordedAt.getTime())) continue;

    // Bucket by UTC month so aggregation is deterministic regardless of the
    // server's local timezone (recorded_at is a timestamptz).
    const year = recordedAt.getUTCFullYear();
    const month = recordedAt.getUTCMonth();
    const key = `${year}-${month}`;
    const existing = byMonth.get(key);

    if (existing) {
      existing.sum += row.score;
      existing.count += 1;
    } else {
      byMonth.set(key, {
        sum: row.score,
        count: 1,
        order: year * 12 + month,
        month,
      });
    }
  }

  return [...byMonth.values()]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      date: MONTH_NAMES[entry.month],
      score: Math.round(entry.sum / entry.count),
    }));
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const range = request.nextUrl.searchParams.get("range") || "6m";
    const months = monthsForRange(range);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let creditHistory: CreditHistoryPoint[] = [];
    let disputeStats: DisputeStats = EMPTY_DISPUTE_STATS;

    // Real data only. Both queries are scoped to the authenticated user's id
    // from the guard — never a client-supplied identifier.
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Window start: first day of the month (months - 1) back.
      const now = new Date();
      const windowStart = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1),
        1,
      );

      const { data: scoreRows } = await supabase
        .from("credit_score_history")
        .select("score, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", windowStart.toISOString())
        .order("recorded_at", { ascending: true });

      if (scoreRows && scoreRows.length > 0) {
        creditHistory = aggregateMonthly(scoreRows);
      }

      const { data: disputes } = await supabase
        .from("disputes")
        .select("status")
        .eq("user_id", user.id);

      if (disputes && disputes.length > 0) {
        const resolved = disputes.filter(
          (d) => d.status === "resolved",
        ).length;
        disputeStats = {
          total: disputes.length,
          resolved,
          pending: disputes.filter(
            (d) => d.status !== "resolved" && d.status !== "rejected",
          ).length,
          successRate: Math.round((resolved / disputes.length) * 100),
        };
      }
    }

    // Standard FICO scoring-category weights — public reference data, not
    // per-user analysis. Status stays "neutral" until a pulled credit report
    // drives per-factor analysis; we do not fabricate a positive/negative
    // judgement we have not computed.
    const scoreFactors = [
      { factor: "Payment History", impact: 35, status: "neutral" as const },
      { factor: "Credit Utilization", impact: 30, status: "neutral" as const },
      { factor: "Credit Age", impact: 15, status: "neutral" as const },
      { factor: "Credit Mix", impact: 10, status: "neutral" as const },
      { factor: "New Credit", impact: 10, status: "neutral" as const },
    ];

    // General credit-building guidance — static best-practice tips, not
    // per-user AI output.
    const recommendations = [
      "Pay down credit card balances to reduce utilization below 30%",
      "Continue making on-time payments to build positive history",
      "Consider a secured credit card to improve credit mix",
      "Avoid opening new credit accounts for the next 6 months",
    ];

    return NextResponse.json({
      creditHistory,
      disputeStats,
      scoreFactors,
      recommendations,
      timeRange: range,
    });
  } catch (error) {
    console.error("User analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
