/**
 * Trading Modes Progress API Route
 *
 * GET: Retrieve graduation progress for the authenticated user.
 * Shows criteria status and how close the user is to the next mode.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

export async function GET() {
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
    const result = await manager.getGraduationProgress();

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
    console.error("[trading/modes/progress] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
