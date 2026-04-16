import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

// Validation schemas
const notificationSettingsSchema = z
  .object({
    email_disputes: z.boolean().optional(),
    email_scores: z.boolean().optional(),
    email_marketing: z.boolean().optional(),
    push_enabled: z.boolean().optional(),
    push_disputes: z.boolean().optional(),
    push_scores: z.boolean().optional(),
  })
  .optional();

const privacySettingsSchema = z
  .object({
    share_data: z.boolean().optional(),
    analytics: z.boolean().optional(),
    two_factor: z.boolean().optional(),
  })
  .optional();

const displaySettingsSchema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z.string().min(2).max(5).optional(),
    timezone: z.string().optional(),
  })
  .optional();

const settingsUpdateSchema = z
  .object({
    notifications: notificationSettingsSchema,
    privacy: privacySettingsSchema,
    display: displaySettingsSchema,
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return data.notifications || data.privacy || data.display;
    },
    { message: "At least one settings category must be provided" },
  );

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // Return default settings if none exist
    const defaultSettings = {
      notifications: {
        email_disputes: true,
        email_scores: true,
        email_marketing: false,
        push_enabled: true,
        push_disputes: true,
        push_scores: true,
      },
      privacy: {
        share_data: false,
        analytics: true,
        two_factor: false,
      },
      display: {
        theme: "light",
        language: "en",
        timezone: "America/New_York",
      },
    };

    return NextResponse.json({
      settings: settings || defaultSettings,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = settingsUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid settings data",
          details: validationResult.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const updates = validationResult.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
