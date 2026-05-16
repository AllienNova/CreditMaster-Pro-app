import { NextRequest, NextResponse } from "next/server";
import { creditMonitoringService } from "@/lib/credit-monitoring/credit-monitoring-service";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

/**
 * GET /api/credit-monitoring/settings
 * Get monitoring settings
 */
export const GET = withPermission(
  "credit:read",
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const settings =
      await creditMonitoringService.getMonitoringSettings(userId);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to fetch monitoring settings" },
      { status: 500 },
    );
  }
  },
);

/**
 * PUT /api/credit-monitoring/settings
 * Update monitoring settings
 */
export const PUT = withPermission(
  "credit:update_settings",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;

    const body = await request.json();
    const { ...settings } = body;

    const success = await creditMonitoringService.updateMonitoringSettings(
      userId,
      settings,
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update monitoring settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (_error) {
    // Error silently caught
    return NextResponse.json(
      { error: "Failed to update monitoring settings" },
      { status: 500 },
    );
  }
  },
);
