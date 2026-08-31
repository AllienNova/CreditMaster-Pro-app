import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Optimized query: Fetch profile with related data in single query
    // Using RPC for aggregated stats to avoid N+1 and large result sets
    const [profileResult, statsResult] = await Promise.all([
      // Get profile with latest subscription only
      supabase
        .from("profiles")
        .select(
          /*
           * Three corrections, all found by calling this route as a real
           * signed-in user (it returned 500 "Failed to fetch profile"):
           *
           * 1. `plan` does not exist on subscriptions — Postgres answered
           *    42703 "column subscriptions_1.plan does not exist", so this
           *    route failed for EVERY user, not just some. The real columns
           *    are stripe_price_id / status / current_period_end.
           * 2. `!inner` dropped the profile entirely for anyone without a
           *    subscription row, i.e. every free-tier account. A left join
           *    returns the profile with an empty subscriptions array.
           * 3. onboarding_completed was not selected, so the only
           *    server-side way to read it did not expose it and the mobile
           *    client was querying the table directly instead (task #65).
           */
          `
          id, full_name, avatar_url, phone, address, created_at, role,
          onboarding_completed,
          subscriptions(stripe_price_id, status, current_period_end)
        `,
        )
        .eq("id", user.id)
        .order("created_at", {
          referencedTable: "subscriptions",
          ascending: false,
        })
        .limit(1, { referencedTable: "subscriptions" })
        .maybeSingle(),

      // Get aggregated stats in single query
      supabase
        .rpc("get_user_profile_stats", { p_user_id: user.id })
        .maybeSingle(),
    ]);

    if (profileResult.error && profileResult.error.code !== "PGRST116") {
      throw profileResult.error;
    }

    const profile = profileResult.data;
    const stats = statsResult.data as {
      total_disputes?: number;
      resolved_disputes?: number;
      latest_score?: number;
      success_rate?: number;
    } | null;

    // Fallback stats if RPC not available
    let resolvedDisputes = 0;
    let totalDisputes = 0;
    let latestScore: number | null = null;
    let successRate = 0;

    if (stats) {
      totalDisputes = stats.total_disputes || 0;
      resolvedDisputes = stats.resolved_disputes || 0;
      latestScore = stats.latest_score || null;
      successRate = stats.success_rate || 0;
    } else {
      // Fallback: separate efficient queries
      const [disputeCount, scoreResult] = await Promise.all([
        supabase
          .from("disputes")
          .select("status", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("credit_scores")
          .select("score")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      totalDisputes = disputeCount.count || 0;
      latestScore = scoreResult.data?.score || null;
    }

    return NextResponse.json({
      profile: {
        id: profile?.id || user.id,
        email: user.email,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        phone: profile?.phone,
        address: profile?.address,
        created_at: profile?.created_at,
        role: profile?.role || "user",
        // Server-authoritative onboarding state. The mobile client used to
        // read this column straight from the table, which the `authenticated`
        // role has no grant on, so it never actually read it (task #65).
        onboarding_completed: Boolean(profile?.onboarding_completed),
        subscription: profile?.subscriptions?.[0] || null,
      },
      stats: {
        creditScore: latestScore,
        totalDisputes,
        resolvedDisputes,
        successRate,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
},
);

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const updates = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Only allow updating certain fields
    const allowedFields = ["full_name", "phone", "address", "avatar_url"];
    const sanitizedUpdates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("profiles")
      .update(sanitizedUpdates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
},
);
