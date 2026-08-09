import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import {
  notificationServiceDB,
  type NotificationType,
} from "@/lib/notifications/notification-service-db";

// Canonical set mirrors the DB CHECK constraint (migration 002).
// Validated here so unknown types are rejected before hitting Supabase.
const CANONICAL_TYPES = new Set<NotificationType>([
  "dispute_update",
  "payment_success",
  "document_uploaded",
  "tip",
  "dispute_overdue",
  "dispute_reminder",
  "draft_reminder",
  "score_reminder",
  "subscription_expiring",
  "welcome",
  "system",
]);

export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "50");

      const [notifications, unreadCount] = await Promise.all([
        notificationServiceDB.getUserNotifications(user.id, limit),
        notificationServiceDB.getUnreadCount(user.id),
      ]);

      return NextResponse.json({ notifications, unreadCount });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to get notifications" },
        { status: 500 },
      );
    }
  },
);

export const POST = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();
      const { type, title, message } = body;

      if (!type || !title || !message) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      if (!CANONICAL_TYPES.has(type as NotificationType)) {
        return NextResponse.json(
          { error: "Invalid notification type" },
          { status: 400 },
        );
      }

      const notification = await notificationServiceDB.createNotification(
        user.id,
        type as NotificationType,
        title,
        message,
      );

      return NextResponse.json({ notification });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();
      const { notificationId, action } = body;

      if (!action) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      if (action === "mark_read" && notificationId) {
        const success = await notificationServiceDB.markAsRead(
          notificationId,
          user.id,
        );
        return NextResponse.json({ success });
      } else if (action === "mark_all_read") {
        const count = await notificationServiceDB.markAllAsRead(user.id);
        return NextResponse.json({ count });
      } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const notificationId = searchParams.get("notificationId");

      if (!notificationId) {
        return NextResponse.json(
          { error: "Missing required parameters" },
          { status: 400 },
        );
      }

      const success = await notificationServiceDB.deleteNotification(
        notificationId,
        user.id,
      );
      return NextResponse.json({ success });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 },
      );
    }
  },
);
