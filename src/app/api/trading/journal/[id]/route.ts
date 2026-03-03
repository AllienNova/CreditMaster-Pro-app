/**
 * Trading Journal Entry API Route
 *
 * GET    - Get a single trade entry
 * PUT    - Update a trade entry
 * DELETE - Delete a trade entry
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTradingJournalService } from "@/lib/trading/services/TradingJournalService";

// ============================================================================
// GET - Single Trade
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const journal = getTradingJournalService();
    const trade = await journal.getTrade(id);

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (trade.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: trade });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch trade" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT - Update Trade
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const journal = getTradingJournalService();
    const existing = await journal.getTrade(id);

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strip fields that shouldn't be updated directly
    const { id: _id, userId: _userId, createdAt: _createdAt, ...updates } = body;
    const updated = await journal.updateTrade(id, updates);

    return NextResponse.json({ success: true, data: updated });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to update trade" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete Trade
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const journal = getTradingJournalService();
    const existing = await journal.getTrade(id);

    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await journal.deleteTrade(id);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to delete trade" },
      { status: 500 },
    );
  }
}
