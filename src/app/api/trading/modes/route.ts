/**
 * Trading Modes API Route
 *
 * GET: Retrieve the current operating mode status for the authenticated user.
 * Returns mode, graduation progress, and active status.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

export const GET = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const manager = createOperatingModeManager(user.id);
    const result = await manager.getModeStatus();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[trading/modes] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});
