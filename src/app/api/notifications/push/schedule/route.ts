/**
 * Push Notification Schedule API Route
 *
 * Handles scheduling push notifications for future delivery:
 * - POST: Schedule a notification for a user
 * - GET: List scheduled notifications for a user
 * - DELETE: Cancel a scheduled notification
 */

import { NextRequest, NextResponse } from "next/server";
import {
  notificationScheduler,
  type ScheduledNotificationStatus,
} from "@/lib/notifications/notification-scheduler";
import type { PushNotificationPayload } from "@/lib/notifications/web-push-service";

interface ScheduleRequest {
  userId: string;
  notification: PushNotificationPayload;
  scheduledAt: string; // ISO 8601 date string
}

interface ScheduleFromTemplateRequest {
  userId: string;
  templateKey: string;
  variables: Record<string, string | number>;
  scheduledAt: string;
  overrides?: Partial<PushNotificationPayload>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Determine if this is a template-based or direct notification
    if (body.templateKey) {
      return handleTemplateSchedule(body as ScheduleFromTemplateRequest);
    }

    return handleDirectSchedule(body as ScheduleRequest);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to schedule notification: ${message}` },
      { status: 500 },
    );
  }
}

function handleDirectSchedule(body: ScheduleRequest) {
  const { userId, notification, scheduledAt } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "Missing required field: userId" },
      { status: 400 },
    );
  }

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

function handleTemplateSchedule(body: ScheduleFromTemplateRequest) {
  const { userId, templateKey, variables, scheduledAt, overrides } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "Missing required field: userId" },
      { status: 400 },
    );
  }

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status") as ScheduledNotificationStatus | null;

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 },
    );
  }

  const notifications = notificationScheduler.getUserScheduledNotifications(
    userId,
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
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const notificationId = searchParams.get("notificationId");

  if (!notificationId) {
    return NextResponse.json(
      { error: "Missing notificationId parameter" },
      { status: 400 },
    );
  }

  const cancelled = notificationScheduler.cancelNotification(notificationId);

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
}
