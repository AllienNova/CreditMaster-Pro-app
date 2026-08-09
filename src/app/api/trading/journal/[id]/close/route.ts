/**
 * Close Trade API Route
 *
 * POST - Close an open trade with exit details
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getTradingJournalService } from "@/lib/trading/services/TradingJournalService";

// ============================================================================
// POST - Close Trade
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    // Path is .../journal/[id]/close — the trade id is the segment before "close".
    const segments = request.nextUrl.pathname.split("/");
    const id = segments[segments.length - 2] ?? "";
    const body = await request.json();

    if (!body.exitPrice || !body.exitQuantity || !body.exitReason) {
      return NextResponse.json(
        { error: "Missing required fields: exitPrice, exitQuantity, exitReason" },
        { status: 400 },
      );
    }

    // Verify ownership
    const journal = getTradingJournalService();
    const existing = await journal.getTrade(id);

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.status === "closed") {
      return NextResponse.json(
        { error: "Trade is already closed" },
        { status: 400 },
      );
    }

    const closed = await journal.closeTrade(
      id,
      body.exitPrice,
      body.exitQuantity,
      body.exitReason,
      body.emotionalStateAfter,
      body.lessonsLearned,
    );

    return NextResponse.json({ success: true, data: closed });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to close trade" },
      { status: 500 },
    );
  }
});
