/**
 * Paper Trading Account API Route
 *
 * GET  - Get user's paper trading account
 * POST - Create a new paper trading account
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// ============================================================================
// GET - Get Account
// ============================================================================

export async function GET() {
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
        { success: true, data: null, message: "No paper trading account found" },
      );
    }

    return NextResponse.json({ success: true, data: account });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch paper trading account" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Create Account
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name || "Paper Trading Account";
    const initialBalance = body.initialBalance;

    const engine = getPaperTradingEngine();

    // Check if account already exists
    const existing = await engine.getAccount(user.id);
    if (existing) {
      return NextResponse.json(
        { error: "Paper trading account already exists. Use reset to start fresh." },
        { status: 409 },
      );
    }

    const account = await engine.createAccount(user.id, name, initialBalance);

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to create paper trading account" },
      { status: 500 },
    );
  }
}
