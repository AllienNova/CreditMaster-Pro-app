/**
 * Trading Journal API Route
 *
 * GET  - List trade journal entries with filters
 * POST - Create a new trade journal entry
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getTradingJournalService } from "@/lib/trading/services/TradingJournalService";
import type {
  TradeDirection,
  TradeOutcome,
  TradeStatus,
} from "@/lib/trading/services/TradingJournalService";

// ============================================================================
// GET - List Trades
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const symbols = searchParams.get("symbols");
    const strategies = searchParams.get("strategies");
    const outcomes = searchParams.get("outcomes");
    const direction = searchParams.get("direction") as TradeDirection | null;
    const status = searchParams.get("status") as TradeStatus | null;
    const tags = searchParams.get("tags");
    const minPL = searchParams.get("minPL");
    const maxPL = searchParams.get("maxPL");

    const journal = getTradingJournalService();
    const trades = await journal.getTrades({
      userId: user.id,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      symbols: symbols ? symbols.split(",") : undefined,
      strategies: strategies ? strategies.split(",") : undefined,
      outcomes: outcomes
        ? (outcomes.split(",") as TradeOutcome[])
        : undefined,
      direction: direction || undefined,
      status: status || undefined,
      tags: tags ? tags.split(",") : undefined,
      minPL: minPL ? parseFloat(minPL) : undefined,
      maxPL: maxPL ? parseFloat(maxPL) : undefined,
    });

    return NextResponse.json({ success: true, data: trades });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch journal trades" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Create Trade Entry
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    if (!body.symbol || !body.direction || !body.entryPrice || !body.entryQuantity) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, direction, entryPrice, entryQuantity" },
        { status: 400 },
      );
    }

    const journal = getTradingJournalService();
    const trade = await journal.createTrade({
      ...body,
      userId: user.id,
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
    });

    return NextResponse.json({ success: true, data: trade }, { status: 201 });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to create journal trade" },
      { status: 500 },
    );
  }
});
