/**
 * Paper Trading Positions API Route
 *
 * GET - List all positions or get a single position by symbol
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// ============================================================================
// GET - List Positions
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

    const engine = getPaperTradingEngine();
    const account = await engine.getAccount(user.id);

    if (!account) {
      return NextResponse.json(
        { error: "No paper trading account found" },
        { status: 404 },
      );
    }

    const symbol = request.nextUrl.searchParams.get("symbol");

    if (symbol) {
      const position = await engine.getPosition(account.id, symbol);
      if (!position) {
        return NextResponse.json(
          { error: `No position found for ${symbol}` },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: position });
    }

    const positions = await engine.getPositions(account.id);
    return NextResponse.json({ success: true, data: positions });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch paper positions" },
      { status: 500 },
    );
  }
}
