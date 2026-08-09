/**
 * Paper Trading Performance API Route
 *
 * GET - Retrieve performance analytics and graduation status
 *       ?action=performance  - Trading performance metrics (default)
 *       ?action=graduation   - Mode graduation status
 *       ?action=trades       - Trade history
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// ============================================================================
// GET - Performance & Graduation
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "performance";

    const engine = getPaperTradingEngine();
    const account = await engine.getAccount(user.id);

    if (!account && action !== "graduation") {
      return NextResponse.json(
        { error: "No paper trading account found" },
        { status: 404 },
      );
    }

    switch (action) {
      case "performance": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const performance = await engine.getPerformance(
          account!.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );
        return NextResponse.json({ success: true, data: performance });
      }

      case "graduation": {
        const graduation = await engine.getGraduationStatus(user.id);
        return NextResponse.json({ success: true, data: graduation });
      }

      case "trades": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const limit = parseInt(searchParams.get("limit") || "100", 10);

        const trades = await engine.getTrades(
          account!.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          limit,
        );
        return NextResponse.json({ success: true, data: trades });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: performance, graduation, trades` },
          { status: 400 },
        );
    }
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch paper trading performance" },
      { status: 500 },
    );
  }
});
