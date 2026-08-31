/**
 * GET /api/investments/portfolio/performance?period=1Y
 *
 * Computed from investment_history, which stores one (date, total_value) row
 * per user per day. Everything below is derived from that series; nothing is
 * assumed.
 *
 * WHY IT MATTERS THAT THIS EXISTS. /investments/performance caught the 404 and
 * called generateMockPerformanceData() — inventing the user's returns, best and
 * worst day, max drawdown, Sharpe ratio and alpha against a benchmark. The route
 * had never existed, so every user saw fabricated investment performance. That
 * fallback is removed in the same commit.
 *
 * WHAT IS DELIBERATELY NOT RETURNED. benchmarkReturn and alpha need a benchmark
 * series, and this application stores none. They are omitted rather than sent as
 * zero, because "the benchmark returned 0%" is a claim, and a wrong one. The
 * page renders them as unavailable. periodReturns is empty for the same reason —
 * every field in it is relative to a benchmark.
 *
 * sharpeRatio assumes a RISK-FREE RATE OF ZERO, stated here because a Sharpe
 * ratio quoted without its rf is not interpretable. With rf = 0 it is simply
 * mean daily return over standard deviation, annualised.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();

const TRADING_DAYS_PER_YEAR = 252;

const PERIOD_DAYS: Record<string, number | null> = {
  "1D": 1, "1W": 7, "1M": 30, "3M": 90, "6M": 180,
  YTD: null, "1Y": 365, "3Y": 1095, "5Y": 1825, ALL: null,
};

function startDateFor(period: string): Date | null {
  if (period === "ALL") return null;
  if (period === "YTD") return new Date(new Date().getFullYear(), 0, 1);
  const days = PERIOD_DAYS[period];
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const period = request.nextUrl.searchParams.get("period") ?? "1Y";
    const start = startDateFor(period);

    // idor-audit: user-scoped — id from withAuth, never the request.
    let query = supabase
      .from("investment_history")
      .select("date, total_value")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    if (start) query = query.gte("date", start.toISOString().split("T")[0]);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).filter(
      (r) => typeof r.total_value === "number" && Number.isFinite(r.total_value),
    );

    // Fewer than two points cannot express a return. Say so rather than
    // reporting 0%, which reads as "you broke even".
    if (rows.length < 2) {
      return NextResponse.json({
        success: true,
        hasHistory: false,
        data: null,
        periodReturns: [],
      });
    }

    const first = rows[0].total_value;
    const last = rows[rows.length - 1].total_value;

    const points = rows.map((r, i) => {
      const prev = i === 0 ? r.total_value : rows[i - 1].total_value;
      return {
        date: r.date,
        value: r.total_value,
        dayReturn: prev === 0 ? 0 : ((r.total_value - prev) / prev) * 100,
        cumulativeReturn: first === 0 ? 0 : ((r.total_value - first) / first) * 100,
      };
    });

    const dailyReturns = points.slice(1).map((p) => p.dayReturn);
    const best = points.slice(1).reduce((a, b) => (b.dayReturn > a.dayReturn ? b : a));
    const worst = points.slice(1).reduce((a, b) => (b.dayReturn < a.dayReturn ? b : a));

    // Peak-to-trough, walking forward.
    let peak = first;
    let maxDrawdown = 0;
    let maxDrawdownDate = points[0].date;
    for (const p of points) {
      if (p.value > peak) peak = p.value;
      const dd = peak === 0 ? 0 : ((peak - p.value) / peak) * 100;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownDate = p.date;
      }
    }

    const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
    const stdev = Math.sqrt(variance);
    const volatility = stdev * Math.sqrt(TRADING_DAYS_PER_YEAR);

    const totalReturnPercent = first === 0 ? 0 : ((last - first) / first) * 100;
    const years = (new Date(rows[rows.length - 1].date).getTime() -
      new Date(rows[0].date).getTime()) / (365 * 24 * 60 * 60 * 1000);
    const annualizedReturn =
      years > 0 && first > 0
        ? (Math.pow(last / first, 1 / years) - 1) * 100
        : totalReturnPercent;

    return NextResponse.json({
      success: true,
      hasHistory: true,
      data: {
        points,
        totalReturn: last - first,
        totalReturnPercent,
        annualizedReturn,
        bestDay: { date: best.date, return: best.dayReturn },
        worstDay: { date: worst.date, return: worst.dayReturn },
        maxDrawdown,
        maxDrawdownDate,
        // rf = 0; see the note at the top of this file.
        sharpeRatio: stdev === 0 ? 0 : (mean / stdev) * Math.sqrt(TRADING_DAYS_PER_YEAR),
        volatility,
        winRate: (dailyReturns.filter((r) => r > 0).length / dailyReturns.length) * 100,
      },
      // No benchmark series is stored, so these cannot be computed. Absent, not
      // zero.
      periodReturns: [],
    });
  } catch (error) {
    console.error("Portfolio performance error:", error);
    return NextResponse.json(
      { error: "Failed to compute portfolio performance" },
      { status: 500 },
    );
  }
});
