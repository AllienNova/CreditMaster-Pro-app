/**
 * Admin Authentication API
 *
 * Verifies if the current user has admin privileges.
 * Used by the admin layout to protect admin routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
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

    // Admin status comes solely from the trusted profiles.role column.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "user";
    const isAdmin = role === "admin";

    return NextResponse.json({
      isAdmin,
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    });
    } catch (_error) {
      // Error silently caught
      return NextResponse.json(
        { isAdmin: false, error: "Authentication failed" },
        { status: 500 },
      );
    }
  },
);
