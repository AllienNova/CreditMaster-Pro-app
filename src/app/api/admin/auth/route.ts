/**
 * Admin Authentication API
 *
 * Verifies if the current user has admin privileges.
 * Used by the admin layout to protect admin routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withRole(
  "admin",
  async (_request: NextRequest, user: AuthedUser) => {
    // The withRole("admin") guard has already verified identity and resolved
    // the role from the trusted profiles table. Reaching here means the role
    // is admin or higher; no second auth pass is needed.
    return NextResponse.json({
      isAdmin: user.role === "admin" || user.role === "super_admin",
      user,
    });
  },
);
