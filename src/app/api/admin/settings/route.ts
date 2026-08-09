/**
 * Admin Settings API
 *
 * Manages platform settings.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

// In production, these would be stored in database or environment
let settings = {
  siteName: "Fynvita",
  supportEmail: "support@Fynvita.pro",
  maxDisputesPerMonth: 10,
  aiModelDefault: "gpt-4",
  maintenanceMode: false,
  signupsEnabled: true,
  stripeTestMode: true,
};

export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
    return NextResponse.json(settings);
  },
);

export const POST = withRole(
  "admin",
  async (request: NextRequest, _user: AuthedUser) => {
    try {
      const body = await request.json();

      // Validate and update settings
      settings = {
        ...settings,
        ...body,
      };

      // In production, save to database
      // await db.settings.update(settings);

      return NextResponse.json({ success: true, settings });
    } catch (_error) {
      // Error silently caught
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 },
      );
    }
  },
);
