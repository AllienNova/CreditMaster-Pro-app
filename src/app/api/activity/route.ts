/**
 * Activity Feed API Route (M2-3 / FR-205)
 * GET /api/activity - the authenticated user's activity feed.
 *
 * Honest source: the user's in-app `notifications`, surfaced as a unified
 * activity stream ordered newest-first. There is no fabricated activity on any
 * path - an empty feed returns `{ activities: [] }`, and an infra failure
 * returns an honest 503 (route-contract §3), never a mock fallback.
 *
 * `user.id` comes from the auth guard, never from the request body or query,
 * so the query is user-scoped and IDOR-safe (route-contract §2).
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { notificationServiceDB } from "@/lib/notifications/notification-service-db";
import type { Notification } from "@/lib/notifications/notification-service-db";

/** Pinned response shape - matches the mobile client built against this route. */
export type Activity = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

function toActivity(notification: Notification): Activity {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    // createdAt is a Date on the service model; serialize to ISO for the wire.
    createdAt: notification.createdAt.toISOString(),
    read: notification.read,
  };
}

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    // getUserNotifications is already user-scoped (.eq user_id) and ordered
    // created_at DESC. user.id is the guard-verified identity.
    const notifications = await notificationServiceDB.getUserNotifications(
      user.id,
    );
    const activities = notifications.map(toActivity);
    return NextResponse.json({ activities });
  } catch (error) {
    // Honest infra failure - surface 503, never fabricate activity
    // (route-contract §3). Structured log carries the authed user.id + route,
    // no PII (§8).
    console.error("[api/activity] failed to load activity", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Service unavailable", message: "Failed to load activity" },
      { status: 503 },
    );
  }
});
