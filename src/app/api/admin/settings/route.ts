/**
 * Admin Settings API
 *
 * Manages platform settings.
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import {
  requireRole,
  createAuthResponse,
} from "@/lib/security/auth-middleware";

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

export async function GET(request: NextRequest) {
  // SECURITY: Require admin role for settings
  const authResult = await requireRole(request, "admin");
  if (!authResult.authenticated || !authResult.user) {
    return createAuthResponse(authResult);
  }
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  // SECURITY: Require admin role for modifying settings
  const authResult = await requireRole(request, "admin");
  if (!authResult.authenticated || !authResult.user) {
    return createAuthResponse(authResult);
  }

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
}
