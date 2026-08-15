/**
 * Push Subscription API Route
 *
 * Handles push notification subscription management:
 * - POST: Subscribe the authenticated user to push notifications
 * - DELETE: Unsubscribe the authenticated user from push notifications
 * - GET: List the authenticated user's push subscriptions
 *
 * The owning user is always the authenticated user (`user.id`); the request
 * never supplies a `userId` — closes FND-041..044 (IDOR).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration missing");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();
      const { subscription, userAgent } = body;

      if (!subscription) {
        return NextResponse.json(
          { error: "Missing required fields: subscription" },
          { status: 400 },
        );
      }

      if (!subscription.endpoint || !subscription.keys) {
        return NextResponse.json(
          { error: "Invalid subscription object" },
          { status: 400 },
        );
      }

      const supabase = getSupabaseAdmin();

      // Check whether THIS user already has a row for this endpoint. The
      // `user_id` filter is required: without it an attacker who knows a
      // victim's (non-secret) push endpoint could hit the update branch and
      // reassign `user_id`, hijacking the victim's subscription.
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", subscription.endpoint)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update the caller's own existing subscription
        const { data, error } = await supabase
          .from("push_subscriptions")
          .update({
            keys_p256dh: subscription.keys.p256dh,
            keys_auth: subscription.keys.auth,
            user_agent: userAgent || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: "Subscription updated",
          subscriptionId: data.id,
        });
      }

      // Create new subscription
      const { data, error } = await supabase
        // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
        .from("push_subscriptions")
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          user_agent: userAgent || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // A UNIQUE index on `endpoint` rejects an insert when the endpoint is
        // already registered (to a different user). Surface a clean 409 — the
        // caller may not take over another user's subscription.
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "Subscription endpoint already registered" },
            { status: 409 },
          );
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: "Subscription created",
        subscriptionId: data.id,
      });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to create push subscription" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const endpoint = searchParams.get("endpoint");

      const supabase = getSupabaseAdmin();

      if (endpoint) {
        // Delete specific subscription by endpoint
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: "Subscription removed",
        });
      }

      // Delete all subscriptions for the authenticated user
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "All subscriptions removed",
      });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to remove push subscription" },
        { status: 500 },
      );
    }
  },
);

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, user_agent, is_active, created_at, last_used")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      return NextResponse.json({
        subscriptions: data || [],
        count: data?.length || 0,
      });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to get subscriptions" },
        { status: 500 },
      );
    }
  },
);
