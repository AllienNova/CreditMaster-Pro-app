import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id") || "demo-user";

  const preferences = preferencesStore[userId] || {
    userId,
    ...defaultPreferences,
  };

  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const body = await request.json();

    const currentPreferences = preferencesStore[userId] || {
      userId,
      ...defaultPreferences,
    };

    const updatedPreferences: NotificationPreferences = {
      ...currentPreferences,
      ...body,
      userId, // Ensure userId cannot be changed
      channels: {
        ...currentPreferences.channels,
        ...(body.channels || {}),
      },
      quietHours: {
        ...currentPreferences.quietHours,
        ...(body.quietHours || {}),
      },
    };

    preferencesStore[userId] = updatedPreferences;

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (_error) {
    // NotificationPreferencesAPI error: Error updating notification preferences
    void _error;
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") || "demo-user";
    const body = await request.json();
    const { action, subscription } = body;

    if (action === "subscribe" && subscription) {
      // NotificationPreferencesAPI: Push subscription registered for user
      return NextResponse.json({
        success: true,
        message: "Subscribed to push notifications",
      });
    }

    if (action === "unsubscribe") {
      // NotificationPreferencesAPI: Push subscription removed for user
      return NextResponse.json({
        success: true,
        message: "Unsubscribed from push notifications",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (_error) {
    // NotificationPreferencesAPI error: Error processing notification action
    void _error;
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
