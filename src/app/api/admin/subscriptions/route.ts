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
import { SUBSCRIPTION_PLANS } from "@/lib/payment/stripe-service";

/**
 * priceId -> the plan it names, for labelling rows in the admin list.
 *
 * Built from SUBSCRIPTION_PLANS — the same catalogue `tierFromPriceId`
 * (tier-mapping.ts) resolves webhook tiers from — so the admin screen and the
 * webhook cannot disagree about which plan a row is on. The client-side
 * catalogue in `src/lib/pricing.ts` reads NEXT_PUBLIC_STRIPE_* while this one
 * reads STRIPE_*; resolving in the browser could therefore label a row with a
 * different plan than the one billing assigned it.
 *
 * Unlike tierFromPriceId this does NOT throw on a miss. A single legacy price
 * ID must not 500 the whole subscription list; it surfaces as an unmapped row
 * the operator can see, which is the honest handling of "we do not recognise
 * this price".
 */
const PLAN_BY_PRICE_ID = new Map(
  SUBSCRIPTION_PLANS.map((plan) => [
    plan.priceId,
    {
      tier: plan.id,
      name: plan.name,
      // price is dollars (29.99), not cents. A yearly plan is divided so the
      // monthly figures stay addable.
      monthlyListPrice:
        plan.interval === "year"
          ? Number((plan.price / 12).toFixed(2))
          : plan.price,
    },
  ]),
);

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
      // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
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

    // Enrich with email and the plan the price ID names
    const enrichedSubscriptions = subscriptions?.map((sub) => {
      const authUser = authUsers?.users?.find((u) => u.id === sub.user_id);
      const plan = PLAN_BY_PRICE_ID.get(sub.stripe_price_id);
      return {
        ...sub,
        user_email: authUser?.email || "Unknown",
        // null, not "free": an unrecognised price ID is a provisioning gap to
        // show, never a silent downgrade (the bug FND-018 recorded).
        tier: plan?.tier ?? null,
        plan_name: plan?.name ?? null,
        monthly_list_price: plan?.monthlyListPrice ?? null,
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
      // idor-audit: cross-user — platform-wide admin report; spans users by definition and the route is gated by withRole("admin")
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
