/**
 * Push Subscription API Route
 *
 * Handles push notification subscription management:
 * - POST: Subscribe to push notifications
 * - DELETE: Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration missing");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription, userAgent } = body;

    if (!userId || !subscription) {
      return NextResponse.json(
        { error: "Missing required fields: userId and subscription" },
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

    // Check if subscription already exists for this endpoint
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", subscription.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { data, error } = await supabase
        .from("push_subscriptions")
        .update({
          user_id: userId,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          user_agent: userAgent || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
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
      .from("push_subscriptions")
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys.p256dh,
        keys_auth: subscription.keys.auth,
        user_agent: userAgent || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Subscription created",
      subscriptionId: data.id,
    });
  } catch (_error) {
    // PushSubscribeRoute error: Failed to create push subscription
    void _error;
    return NextResponse.json(
      { error: "Failed to create push subscription" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const endpoint = searchParams.get("endpoint");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    if (endpoint) {
      // Delete specific subscription by endpoint
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Subscription removed",
      });
    }

    // Delete all subscriptions for user
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "All subscriptions removed",
    });
  } catch (_error) {
    // PushSubscribeRoute error: Failed to remove push subscription
    void _error;
    return NextResponse.json(
      { error: "Failed to remove push subscription" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, user_agent, is_active, created_at, last_used")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw error;

    return NextResponse.json({
      subscriptions: data || [],
      count: data?.length || 0,
    });
  } catch (_error) {
    // PushSubscribeRoute error: Failed to get subscriptions
    void _error;
    return NextResponse.json(
      { error: "Failed to get subscriptions" },
      { status: 500 },
    );
  }
}
