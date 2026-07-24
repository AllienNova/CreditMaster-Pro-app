/**
 * Admin Subscriptions API
 *
 * Manages subscription data for admin dashboard.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

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
    // Fetch subscriptions with user data
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select(
        `
        *,
        profiles:user_id (
          id,
          full_name
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      // AdminSubscriptionsRoute error: Failed to fetch subscriptions
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    // Get auth users to merge email data
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    // Enrich with email data
    const enrichedSubscriptions = subscriptions?.map((sub) => {
      const authUser = authUsers?.users?.find((u) => u.id === sub.user_id);
      return {
        ...sub,
        user_email: authUser?.email || "Unknown",
      };
    });

    return NextResponse.json({
      subscriptions: enrichedSubscriptions || [],
      total: subscriptions?.length || 0,
    });
    } catch (_error) {
      // AdminSubscriptionsRoute error: Admin subscriptions operation failed
      void _error;
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscriptionId" },
        { status: 400 },
      );
    }

    // In production, this would call Stripe API to cancel subscription
    // stripe.subscriptions.cancel(subscriptionId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true })
      .eq("stripe_subscription_id", subscriptionId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to cancel subscription" },
        { status: 500 },
      );
    }

      return NextResponse.json({ success: true });
    } catch (_error) {
      // AdminSubscriptionsRoute error: Subscription cancel failed
      void _error;
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
