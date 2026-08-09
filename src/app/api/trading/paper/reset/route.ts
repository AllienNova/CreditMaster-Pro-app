/**
 * Paper Trading Reset API Route
 *
 * POST - Reset paper trading account to initial state
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// ============================================================================
// POST - Reset Account
// ============================================================================

export const POST = withAuth(async (_request: NextRequest, user: AuthedUser) => {
  try {
    const engine = getPaperTradingEngine();
    const account = await engine.getAccount(user.id);

    if (!account) {
      return NextResponse.json(
        { error: "No paper trading account found" },
        { status: 404 },
      );
    }

    const reset = await engine.resetAccount(account.id);

    return NextResponse.json({ success: true, data: reset });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to reset paper trading account" },
      { status: 500 },
    );
  }
});
