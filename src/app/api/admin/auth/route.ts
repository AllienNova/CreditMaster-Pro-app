/**
 * Admin Authentication API
 *
 * Verifies if the current user has admin privileges.
 * Used by the admin layout to protect admin routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  requireRole,
  createAuthResponse,
} from "@/lib/security/auth-middleware";

// Admin email whitelist (in production, use database roles)
const ADMIN_EMAILS = [
  "admin@fynvita.com",
  "khonour@yahoo.com",
  "kimhons@gmail.com",
];

export async function GET(request: NextRequest) {
  // SECURITY: Require admin role to check admin status
  const authResult = await requireRole(request, "admin");
  if (!authResult.authenticated || !authResult.user) {
    return createAuthResponse(authResult);
  }
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { isAdmin: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    // Get access token from cookies
    const accessToken = cookieStore.get("sb-access-token")?.value;
    const refreshToken = cookieStore.get("sb-refresh-token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { isAdmin: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Get current user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return NextResponse.json(
        { isAdmin: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // Check if user is admin
    const isAdmin = ADMIN_EMAILS.includes(user.email || "");

    // Also check profile for admin role (future enhancement)
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    // Enterprise tier users also get admin access
    const hasAdminTier = profile?.subscription_tier === "enterprise";

    return NextResponse.json({
      isAdmin: isAdmin || hasAdminTier,
      user: {
        id: user.id,
        email: user.email,
        role: isAdmin ? "admin" : hasAdminTier ? "enterprise" : "user",
      },
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { isAdmin: false, error: "Authentication failed" },
      { status: 500 },
    );
  }
}
