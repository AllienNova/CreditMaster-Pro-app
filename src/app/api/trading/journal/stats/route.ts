/**
 * Trading Journal Stats API Route
 *
 * GET - Retrieve trade statistics, insights, and performance data
 *       ?action=stats     - Overall trade stats (default)
 *       ?action=insights  - AI-generated trading insights
 *       ?action=daily     - Daily performance breakdown
 *       ?action=symbols   - Per-symbol performance
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTradingJournalService } from "@/lib/trading/services/TradingJournalService";

// ============================================================================
// GET - Trade Stats & Analytics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "stats";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const journal = getTradingJournalService();

    switch (action) {
      case "stats": {
        const stats = await journal.getTradeStats(
          user.id,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );
        return NextResponse.json({ success: true, data: stats });
      }

      case "insights": {
        const insights = await journal.generateInsights(user.id);
        return NextResponse.json({ success: true, data: insights });
      }

      case "daily": {
        const days = parseInt(searchParams.get("days") || "30", 10);
        const daily = await journal.getDailyPerformance(user.id, days);
        return NextResponse.json({ success: true, data: daily });
      }

      case "symbols": {
        const symbolPerf = await journal.getSymbolPerformance(user.id);
        // Convert Map to plain object for JSON serialization
        const symbolPerfObj = Object.fromEntries(symbolPerf);
        return NextResponse.json({ success: true, data: symbolPerfObj });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: stats, insights, daily, symbols` },
          { status: 400 },
        );
    }
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch journal stats" },
      { status: 500 },
    );
  }
}
