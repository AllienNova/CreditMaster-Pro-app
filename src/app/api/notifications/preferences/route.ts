import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelPreferences {
  dispute_update: boolean;
  score_change: boolean;
  payment_reminder: boolean;
  document_processed: boolean;
  recommendation: boolean;
  system: boolean;
  promotion: boolean;
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  channels: ChannelPreferences;
  quietHours: QuietHours;
}

// ---------------------------------------------------------------------------
// Defaults (returned when no row exists in the DB)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Supabase client (service-role — bypasses RLS for server-side reads/writes)
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration missing");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ---------------------------------------------------------------------------
// Row → domain type mapper
// ---------------------------------------------------------------------------

function rowToPreferences(
  row: {
    user_id: string;
    push_enabled: boolean;
    email_enabled: boolean;
    sms_enabled: boolean;
    channels: ChannelPreferences;
    quiet_hours: QuietHours;
  },
): NotificationPreferences {
  return {
    userId: row.user_id,
    pushEnabled: row.push_enabled,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    channels: row.channels,
    quietHours: row.quiet_hours,
  };
}

// ---------------------------------------------------------------------------
// GET — read preferences from notification_preferences; fall back to defaults
// ---------------------------------------------------------------------------

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const preferences: NotificationPreferences = data
      ? rowToPreferences(data as Parameters<typeof rowToPreferences>[0])
      : { userId: user.id, ...defaultPreferences };

    return NextResponse.json({ preferences });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to get preferences" },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// PUT — upsert preferences into notification_preferences
// ---------------------------------------------------------------------------

export const PUT = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const body = await request.json();
      const supabase = getSupabaseAdmin();

      // Read current row (or fall back to defaults) to support deep-merge.
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const current: NotificationPreferences = existing
        ? rowToPreferences(existing as Parameters<typeof rowToPreferences>[0])
        : { userId: user.id, ...defaultPreferences };

      // Merge — userId is always the authenticated user, never caller-supplied.
      const merged: NotificationPreferences = {
        ...current,
        ...body,
        userId: user.id,
        channels: {
          ...current.channels,
          ...(body.channels ?? {}),
        },
        quietHours: {
          ...current.quietHours,
          ...(body.quietHours ?? {}),
        },
      };

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            push_enabled: merged.pushEnabled,
            email_enabled: merged.emailEnabled,
            sms_enabled: merged.smsEnabled,
            channels: merged.channels,
            quiet_hours: merged.quietHours,
          },
          { onConflict: "user_id" },
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true, preferences: merged });
    } catch (_error) {
      void _error;
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 },
      );
    }
  },
);

// NOTE: The POST handler (action: subscribe/unsubscribe) was a no-op stub that
// returned {success:true} without any DB write. Real push subscribe/unsubscribe
// is implemented in /api/notifications/push/subscribe (persists to the
// push_subscriptions table). The stub is deleted to avoid a lying endpoint.
