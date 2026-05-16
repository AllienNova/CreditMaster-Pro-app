/**
 * Push Notification Send API Route
 *
 * Sends a push notification to the authenticated user's own devices:
 * - POST: Send push notification to the authenticated user
 *
 * SECURITY (FND-041..044): the target is always the authenticated user
 * (`user.id`). The request no longer accepts `userId`/`userIds` — a caller
 * cannot push to another user. Multi-user broadcast is an admin capability and
 * is intentionally not exposed here; it belongs behind a dedicated admin route.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  webPushService,
  type PushSubscription,
  type PushNotificationPayload,
} from "@/lib/notifications/web-push-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration missing");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface SendPushRequest {
  notification: PushNotificationPayload;
}

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body: SendPushRequest = await request.json();
      const { notification } = body;

      if (!notification || !notification.title || !notification.body) {
        return NextResponse.json(
          { error: "Missing required notification fields: title and body" },
          { status: 400 },
        );
      }

      if (!webPushService.isEnabled()) {
        return NextResponse.json(
          { error: "Web Push is not configured. Check VAPID keys." },
          { status: 503 },
        );
      }

      const supabase = getSupabaseAdmin();

      // Only the authenticated user's own active subscriptions are targeted.
      const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No active subscriptions found",
          sent: 0,
          failed: 0,
        });
      }

      // Convert DB subscriptions to PushSubscription format
      const pushSubscriptions: PushSubscription[] = subscriptions.map(
        (sub) => ({
          id: sub.id,
          userId: sub.user_id,
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
          userAgent: sub.user_agent,
          createdAt: new Date(sub.created_at),
          lastUsed: sub.last_used ? new Date(sub.last_used) : undefined,
          isActive: sub.is_active,
        }),
      );

      // Send notifications
      const results = await webPushService.sendToMultiple(
        pushSubscriptions,
        notification,
      );

      // Track results
      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const expiredIds = results
        .filter((r) => r.error === "subscription_expired")
        .map((r) => r.subscriptionId);

      // Deactivate expired subscriptions
      if (expiredIds.length > 0) {
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .in("id", expiredIds);
      }

      // Update last_used for successful sends
      const successIds = results
        .filter((r) => r.success)
        .map((r) => r.subscriptionId);
      if (successIds.length > 0) {
        await supabase
          .from("push_subscriptions")
          .update({ last_used: new Date().toISOString() })
          .in("id", successIds);
      }

      return NextResponse.json({
        success: true,
        sent,
        failed,
        expiredSubscriptions: expiredIds.length,
        totalSubscriptions: subscriptions.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // Log structured error for server-side observability
      const logEntry = {
        event: "push_notification_send_error",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
      void logEntry; // available for future structured logging integration

      return NextResponse.json(
        { error: "Failed to send push notifications" },
        { status: 500 },
      );
    }
  },
);
