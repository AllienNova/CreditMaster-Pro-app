/**
 * Trading Modes Circuit Breakers API Route
 *
 * GET: Retrieve circuit breaker event history for the authenticated user.
 * Accepts optional `limit` query parameter (default 50).
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { success: false, error: "Invalid limit parameter. Must be between 1 and 500." },
        { status: 400 },
      );
    }

    const manager = createOperatingModeManager(user.id);
    const result = await manager.getCircuitBreakerHistory(limit);

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
    console.error("[trading/modes/circuit-breakers] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});
