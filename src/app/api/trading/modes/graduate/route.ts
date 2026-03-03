/**
 * Trading Modes Graduate API Route
 *
 * POST: Graduate the authenticated user to the next operating mode.
 * Checks eligibility first, then performs the transition.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

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
}
