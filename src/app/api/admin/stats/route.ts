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
import {
  tierFromPriceId,
  type SubscriptionTier,
} from "@/lib/payment/tier-mapping";

// 6-tier price map (CLAUDE.md §10 — Free/Standard/Pro/Family Duo/Family/Family
// Plus). Keyed by SubscriptionTier's canonical hyphenated ids (tier-mapping.ts)
// — NOT the "family_duo"/"family_plus" underscored spelling used in display
// copy elsewhere. Record<SubscriptionTier, ...> makes a missing tier a
// compile error instead of a silent $0.
const PRICE_MAP: Record<SubscriptionTier, number> = {
  free: 0,
  standard: 29.99,
  pro: 99.99,
  "family-duo": 159.99,
  family: 199.99,
  "family-plus": 399.99,
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

      // subscriptions has no "plan" column (verified live via \d+
      // subscriptions -- it's an overloaded table also used by the
      // detected-recurring-bill tracking feature). The canonical tier lives
      // in stripe_price_id, resolved via tierFromPriceId() (FND-018's fix).
      // tierFromPriceId THROWS on an unresolvable price ID rather than
      // silently defaulting to a tier -- an active row with a stale/unknown
      // price is a provisioning bug, and understating MRR by silently
      // excluding it would be exactly the kind of wrong-but-plausible number
      // this route's header promises never to produce.
      const { data: subscriptions, error: revenueError } = await supabase
        .from("subscriptions")
        .select("stripe_price_id")
        .eq("status", "active");

      if (revenueError) throw revenueError;

      const monthlyRevenue =
        subscriptions?.reduce((total, sub) => {
          return total + PRICE_MAP[tierFromPriceId(sub.stripe_price_id)];
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
