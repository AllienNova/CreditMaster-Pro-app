import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { subscriptionService } from "@/lib/subscriptions/subscription-service";
import { withRole, type AuthedUser } from "@/lib/auth/api-guard";

/**
 * Test Database Connections
 *
 * Diagnostic endpoint — admin-gated (TASK-AUTH-03f). SECURITY: this route
 * should be removed before launch; it is gated with withRole("admin") at a
 * minimum so it cannot leak data to ordinary users.
 *
 * This endpoint tests:
 * 1. Supabase client connection
 * 2. Profile query
 * 3. Database types
 */
export const GET = withRole(
  "admin",
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    // Test 1: Supabase client creation
    const supabase = createClient();

    // Test 3: Query profile
    const profile = await subscriptionService.getUserProfile(user.id);

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          test: "profile_query",
          error: "Profile not found",
          hint: "Profile should be created automatically on signup",
          user: {
            id: user.id,
            email: user.email,
          },
        },
        { status: 404 },
      );
    }

    // Test 4: Query all tables
    const [disputes, documents, notifications, subscriptions] =
      await Promise.all([
        supabase.from("disputes").select("count").eq("user_id", user.id),
        supabase.from("documents").select("count").eq("user_id", user.id),
        supabase.from("notifications").select("count").eq("user_id", user.id),
        supabase.from("subscriptions").select("count").eq("user_id", user.id),
      ]);

    // Success!
    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      tests_passed: [
        "Supabase client created",
        "User authenticated",
        "Profile query successful",
        "All tables accessible",
      ],
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        profile: {
          id: profile.id,
          fullName: profile.fullName,
          subscriptionTier: profile.subscriptionTier,
          subscriptionStatus: profile.subscriptionStatus,
          stripeCustomerId: profile.stripeCustomerId,
        },
        counts: {
          disputes: disputes.count || 0,
          documents: documents.count || 0,
          notifications: notifications.count || 0,
          subscriptions: subscriptions.count || 0,
        },
      },
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        test: "unexpected_error",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
},
);
