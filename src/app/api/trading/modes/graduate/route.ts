/**
 * Trading Modes Graduate API Route
 *
 * POST: Graduate the authenticated user to the next operating mode.
 * Checks eligibility first, then performs the transition.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

export const POST = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const manager = createOperatingModeManager(user.id);

    // Check eligibility first
    const canGraduateResult = await manager.canGraduate();
    if (!canGraduateResult.success) {
      return NextResponse.json(
        { success: false, error: canGraduateResult.error },
        { status: 500 },
      );
    }

    if (!canGraduateResult.data) {
      // Get detailed progress to explain why
      const progressResult = await manager.getGraduationProgress();
      return NextResponse.json(
        {
          success: false,
          error: "Not eligible for graduation",
          details: progressResult.success ? progressResult.data : undefined,
        },
        { status: 400 },
      );
    }

    // Perform graduation
    const graduateResult = await manager.graduate();
    if (!graduateResult.success) {
      return NextResponse.json(
        { success: false, error: graduateResult.error },
        { status: 500 },
      );
    }

    // Get updated status
    const statusResult = await manager.getModeStatus();

    return NextResponse.json({
      success: true,
      data: {
        transition: graduateResult.data,
        newStatus: statusResult.success ? statusResult.data : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[trading/modes/graduate] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});
