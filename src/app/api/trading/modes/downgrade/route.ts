/**
 * Trading Modes Downgrade API Route
 *
 * POST: Downgrade the authenticated user to the previous operating mode.
 * Requires a `reason` in the request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    let body: { reason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { reason } = body;
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Reason is required for downgrade" },
        { status: 400 },
      );
    }

    const manager = createOperatingModeManager(user.id);
    const result = await manager.downgrade(reason.trim(), "user");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    // Get updated status
    const statusResult = await manager.getModeStatus();

    return NextResponse.json({
      success: true,
      data: {
        transition: result.data,
        newStatus: statusResult.success ? statusResult.data : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[trading/modes/downgrade] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});
