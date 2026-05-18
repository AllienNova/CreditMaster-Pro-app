/**
 * Admin Stats API
 *
 * Returns platform-wide statistics for the admin dashboard backed by real
 * Supabase queries. On any DB error returns an explicit 500 — never fabricated
 * data.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

// 6-tier price map (CLAUDE.md §10 — Free/Standard/Pro/Family Duo/Family/Family Plus)
const PRICE_MAP: Record<string, number> = {
  free: 0,
  standard: 29.99,
  pro: 99.99,
  family_duo: 159.99,
  family: 199.99,
  family_plus: 399.99,
};

export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Fetch core counts in parallel
      const [
        usersResult,
        subscriptionsResult,
        disputesResult,
        resolvedDisputesResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("disputes").select("id", { count: "exact", head: true }),
        supabase
          .from("disputes")
          .select("id", { count: "exact", head: true })
          .eq("status", "resolved"),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (disputesResult.error) throw disputesResult.error;
      if (resolvedDisputesResult.error) throw resolvedDisputesResult.error;

      // Monthly revenue from active subscriptions using the real 6-tier priceMap
      const { data: subscriptions, error: revenueError } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("status", "active");

      if (revenueError) throw revenueError;

      const monthlyRevenue =
        subscriptions?.reduce((total, sub) => {
          return total + (PRICE_MAP[sub.plan] ?? 0);
        }, 0) ?? 0;

      // User growth: last 30 days vs previous 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { count: recentUsers, error: recentError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (recentError) throw recentError;

      const { count: previousUsers, error: previousError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      if (previousError) throw previousError;

      const userGrowth =
        previousUsers && previousUsers > 0
          ? (((recentUsers ?? 0) - previousUsers) / previousUsers) * 100
          : 0;

      return NextResponse.json({
        totalUsers: usersResult.count ?? 0,
        activeSubscriptions: subscriptionsResult.count ?? 0,
        totalDisputes: disputesResult.count ?? 0,
        resolvedDisputes: resolvedDisputesResult.count ?? 0,
        monthlyRevenue,
        userGrowth: Math.round(userGrowth * 10) / 10,
      });
    } catch (_error) {
      return NextResponse.json(
        { error: "Failed to fetch admin stats" },
        { status: 500 },
      );
    }
  },
);
