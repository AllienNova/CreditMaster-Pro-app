/**
 * Push Notification Schedule API Route
 *
 * Handles scheduling push notifications for future delivery:
 * - POST: Schedule a notification for the authenticated user
 * - GET: List scheduled notifications for the authenticated user
 * - DELETE: Cancel a scheduled notification owned by the authenticated user
 *
 * The target user is always the authenticated user (`user.id`); the request
 * never supplies a `userId` — closes FND-041..044 (IDOR).
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  notificationScheduler,
  type ScheduledNotificationStatus,
} from "@/lib/notifications/notification-scheduler";
import type { PushNotificationPayload } from "@/lib/notifications/web-push-service";

interface ScheduleRequest {
  notification: PushNotificationPayload;
  scheduledAt: string; // ISO 8601 date string
}

interface ScheduleFromTemplateRequest {
  templateKey: string;
  variables: Record<string, string | number>;
  scheduledAt: string;
  overrides?: Partial<PushNotificationPayload>;
}

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();

      // Determine if this is a template-based or direct notification
      if (body.templateKey) {
        return handleTemplateSchedule(
          body as ScheduleFromTemplateRequest,
          user.id,
        );
      }

      return handleDirectSchedule(body as ScheduleRequest, user.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";

      return NextResponse.json(
        { error: `Failed to schedule notification: ${message}` },
        { status: 500 },
      );
    }
  },
);

function handleDirectSchedule(body: ScheduleRequest, userId: string) {
  const { notification, scheduledAt } = body;

  if (!notification || !notification.title || !notification.body) {
    return NextResponse.json(
      { error: "Missing required notification fields: title and body" },
      { status: 400 },
    );
  }

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "Missing required field: scheduledAt" },
      { status: 400 },
    );
  }

  const parsedDate = new Date(scheduledAt);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid scheduledAt date format. Use ISO 8601." },
      { status: 400 },
    );
  }

  const result = notificationScheduler.scheduleNotification(
    userId,
    notification,
    parsedDate,
  );

  if (!result.scheduled) {
    return NextResponse.json(
      { error: result.error, notificationId: result.notificationId },
      { status: 422 },
    );
  }

  return NextResponse.json({
    success: true,
    notificationId: result.notificationId,
    scheduledAt: result.scheduledAt.toISOString(),
  });
}

function handleTemplateSchedule(
  body: ScheduleFromTemplateRequest,
  userId: string,
) {
  const { templateKey, variables, scheduledAt, overrides } = body;

  if (!templateKey) {
    return NextResponse.json(
      { error: "Missing required field: templateKey" },
      { status: 400 },
    );
  }

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "Missing required field: scheduledAt" },
      { status: 400 },
    );
  }

  const parsedDate = new Date(scheduledAt);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid scheduledAt date format. Use ISO 8601." },
      { status: 400 },
    );
  }

  const payload = notificationScheduler.createFromTemplate(
    templateKey,
    variables || {},
    overrides,
  );

  if (!payload) {
    return NextResponse.json(
      { error: `Unknown template: "${templateKey}"` },
      { status: 400 },
    );
  }

  const result = notificationScheduler.scheduleNotification(
    userId,
    payload,
    parsedDate,
  );

  if (!result.scheduled) {
    return NextResponse.json(
      { error: result.error, notificationId: result.notificationId },
      { status: 422 },
    );
  }

  return NextResponse.json({
    success: true,
    notificationId: result.notificationId,
    scheduledAt: result.scheduledAt.toISOString(),
    template: templateKey,
  });
}

export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get(
      "status",
    ) as ScheduledNotificationStatus | null;

    const notifications = notificationScheduler.getUserScheduledNotifications(
      user.id,
      status ?? undefined,
    );

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        payload: n.payload,
        scheduledAt: n.scheduledAt.toISOString(),
        status: n.status,
        createdAt: n.createdAt.toISOString(),
        deliveredAt: n.deliveredAt?.toISOString() ?? null,
        cancelledAt: n.cancelledAt?.toISOString() ?? null,
        error: n.error ?? null,
      })),
      count: notifications.length,
    });
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notificationId");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Missing notificationId parameter" },
        { status: 400 },
      );
    }

    // Ownership check: a caller may only cancel their own scheduled
    // notifications. A 404 (not a 403) is returned for non-owned IDs so the
    // endpoint does not leak the existence of another user's notification.
    const scheduled =
      notificationScheduler.getScheduledNotification(notificationId);
    if (!scheduled || scheduled.userId !== user.id) {
      return NextResponse.json(
        { error: "Notification not found or already processed" },
        { status: 404 },
      );
    }

    const cancelled =
      notificationScheduler.cancelNotification(notificationId);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Notification not found or already processed" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification cancelled",
      notificationId,
    });
  },
);
