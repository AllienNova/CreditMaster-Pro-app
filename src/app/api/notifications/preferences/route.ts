import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  channels: {
    dispute_update: boolean;
    score_change: boolean;
    payment_reminder: boolean;
    document_processed: boolean;
    recommendation: boolean;
    system: boolean;
    promotion: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

// Mock storage for preferences
const preferencesStore: Record<string, NotificationPreferences> = {};

const defaultPreferences: Omit<NotificationPreferences, "userId"> = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  channels: {
    dispute_update: true,
    score_change: true,
    payment_reminder: true,
    document_processed: true,
    recommendation: true,
    system: true,
    promotion: false,
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    const preferences = preferencesStore[user.id] || {
      userId: user.id,
      ...defaultPreferences,
    };

    return NextResponse.json({ preferences });
  },
);

export const PUT = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();

      const currentPreferences = preferencesStore[user.id] || {
        userId: user.id,
        ...defaultPreferences,
      };

      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...body,
        userId: user.id, // userId is the authenticated user, never client-supplied
        channels: {
          ...currentPreferences.channels,
          ...(body.channels || {}),
        },
        quietHours: {
          ...currentPreferences.quietHours,
          ...(body.quietHours || {}),
        },
      };

      preferencesStore[user.id] = updatedPreferences;

      return NextResponse.json({
        success: true,
        preferences: updatedPreferences,
      });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 },
      );
    }
  },
);

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      const body = await request.json();
      const { action, subscription } = body;

      if (action === "subscribe" && subscription) {
        return NextResponse.json({
          success: true,
          message: "Subscribed to push notifications",
        });
      }

      if (action === "unsubscribe") {
        return NextResponse.json({
          success: true,
          message: "Unsubscribed from push notifications",
        });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to process request" },
        { status: 500 },
      );
    }
  },
);
