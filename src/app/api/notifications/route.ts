import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { notificationService } from "@/lib/notifications/notification-service";

export const GET = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "50");

      const notifications = notificationService.getUserNotifications(
        user.id,
        limit,
      );
      const unreadCount = notificationService.getUnreadCount(user.id);

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
      const { type, title, message, data } = body;

      if (!type || !title || !message) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      const notification = notificationService.createNotification(
        user.id,
        type,
        title,
        message,
        data,
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
        const success = notificationService.markAsRead(
          user.id,
          notificationId,
        );
        return NextResponse.json({ success });
      } else if (action === "mark_all_read") {
        const count = notificationService.markAllAsRead(user.id);
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

      const success = notificationService.deleteNotification(
        user.id,
        notificationId,
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
