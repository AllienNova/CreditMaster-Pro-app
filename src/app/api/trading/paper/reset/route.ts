/**
 * Paper Trading Reset API Route
 *
 * POST - Reset paper trading account to initial state
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// ============================================================================
// POST - Reset Account
// ============================================================================

export async function POST() {
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

    const reset = await engine.resetAccount(account.id);

    return NextResponse.json({ success: true, data: reset });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to reset paper trading account" },
      { status: 500 },
    );
  }
}
