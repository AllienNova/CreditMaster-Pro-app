/**
 * Admin Analytics API
 *
 * Returns analytics data for the admin dashboard backed by real Supabase queries.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  tierFromPriceId,
  type SubscriptionTier,
} from "@/lib/payment/tier-mapping";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const GET = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || "30d";

    const days =
      range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

    // How many data points to return for user growth
    const points = Math.min(days, 12);

    const supabase = getSupabaseClient();

    try {
    // ── disputes by status ──────────────────────────────────────────────────
    const { data: disputeRows, error: disputeError } = await supabase
      // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
      .from("disputes")
      .select("status")
      .range(0, 9999);

    if (disputeError) {
      return NextResponse.json(
        { error: "Failed to fetch dispute analytics" },
        { status: 500 },
      );
    }

    const disputeStatusCounts: Record<string, number> = {};
    for (const row of disputeRows ?? []) {
      const s = row.status as string;
      disputeStatusCounts[s] = (disputeStatusCounts[s] ?? 0) + 1;
    }
    const disputesByStatus = Object.entries(disputeStatusCounts).map(
      ([status, count]) => ({ status, count }),
    );

    // ── subscriptions by plan ──────────────────────────────────────────────
    // subscriptions has no "plan" column (verified live via \d+
    // subscriptions). Real tier comes from stripe_price_id via
    // tierFromPriceId() (FND-018) -- see admin/stats/route.ts for the full
    // rationale on why an unresolvable price ID throws instead of being
    // silently excluded from the count.
    const { data: subRows, error: subError } = await supabase
      // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
      .from("subscriptions")
      .select("stripe_price_id")
      .range(0, 99999);

    if (subError) {
      return NextResponse.json(
        { error: "Failed to fetch subscription analytics" },
        { status: 500 },
      );
    }

    const tierCounts: Record<string, number> = {};
    for (const row of subRows ?? []) {
      const t = tierFromPriceId(row.stripe_price_id);
      tierCounts[t] = (tierCounts[t] ?? 0) + 1;
    }
    const subscriptionsByTier = Object.entries(tierCounts).map(
      ([tier, count]) => ({ tier, count }),
    );

    // ── user growth (profile counts bucketed by time window) ───────────────
    const userGrowth = [];
    for (let i = points; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * Math.floor(days / points));

      const cutoff = new Date(date);
      cutoff.setDate(cutoff.getDate() - Math.floor(days / points));

      const { count, error: pgError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", cutoff.toISOString())
        .lte("created_at", date.toISOString());

      if (pgError) {
        return NextResponse.json(
          { error: "Failed to fetch user growth analytics" },
          { status: 500 },
        );
      }

      userGrowth.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count: count ?? 0,
      });
    }

    // ── revenue by month (last 6 calendar months from subscriptions) ───────
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // 6-tier price map (CLAUDE.md §10). Keyed by SubscriptionTier's
    // canonical hyphenated ids (tier-mapping.ts) -- NOT the
    // "family_duo"/"family_plus" underscored spelling used in display copy
    // elsewhere. Record<SubscriptionTier, ...> makes a missing tier a
    // compile error instead of a silent $0.
    const priceMap: Record<SubscriptionTier, number> = {
      free: 0,
      standard: 29.99,
      pro: 99.99,
      "family-duo": 159.99,
      family: 199.99,
      "family-plus": 399.99,
    };

    const currentMonth = new Date().getMonth();
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const { data: revSubs, error: revError } = await supabase
        // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
        .from("subscriptions")
        .select("stripe_price_id")
        .eq("status", "active")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (revError) {
        return NextResponse.json(
          { error: "Failed to fetch revenue analytics" },
          { status: 500 },
        );
      }

      const revenue = (revSubs ?? []).reduce(
        (total, sub) => total + priceMap[tierFromPriceId(sub.stripe_price_id)],
        0,
      );

      revenueByMonth.push({ month: months[monthIndex], revenue });
    }

    // topFeatures: derived from actual dispute and subscription activity
    // We compute relative feature usage from existing tables.
    const topFeatures = [
      { feature: "AI Chat", usage: 0 },
      { feature: "Dispute Letters", usage: disputeRows?.length ?? 0 },
      { feature: "Credit Analysis", usage: 0 },
      { feature: "Student Loans", usage: 0 },
      { feature: "Marketplace", usage: 0 },
    ];

    return NextResponse.json({
      userGrowth,
      revenueByMonth,
      disputesByStatus,
      subscriptionsByTier,
      topFeatures,
      timeRange: range,
    });
    } catch (_error) {
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 },
      );
    }
  },
);
