/**
 * Individual Holding API
 *
 * GET /api/investments/holdings/[id] - Get single holding
 * PATCH /api/investments/holdings/[id] - Update holding
 * DELETE /api/investments/holdings/[id] - Delete holding
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getSupabase } from "@/lib/supabase/client";

const supabase = getSupabase();
import type {
  Holding,
  HoldingUpdateInput,
} from "@/lib/investments/types/portfolio.types";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop() ?? "";
    const { data, error } = await supabase
      .from("investment_holdings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Holding not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: transformHolding(data) });
  } catch (_error) {
    // HoldingsRoute error: Failed to get holding
    void _error;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop() ?? "";
    const body: HoldingUpdateInput = await request.json();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("investment_holdings")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Holding not found" },
        { status: 404 },
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.shares !== undefined) {
      updates.shares = body.shares;
    }
    if (body.averageCostBasis !== undefined) {
      updates.average_cost_basis = body.averageCostBasis;
    }

    const { data, error } = await supabase
      .from("investment_holdings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: transformHolding(data) });
  } catch (_error) {
    // HoldingsRoute error: Failed to update holding
    void _error;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop() ?? "";

    // Verify ownership before delete
    const { data: existing, error: fetchError } = await supabase
      .from("investment_holdings")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Holding not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("investment_holdings")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Holding deleted" });
  } catch (_error) {
    // HoldingsRoute error: Failed to delete holding
    void _error;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
  },
);

function transformHolding(h: Record<string, unknown>): Holding {
  const shares = h.shares as number;
  const avgCost = h.average_cost_basis as number;
  const currentPrice = (h.current_price as number) || avgCost;
  return {
    id: h.id as string,
    userId: h.user_id as string,
    symbol: h.symbol as string,
    name: h.name as string,
    shares,
    averageCostBasis: avgCost,
    currentPrice,
    totalValue: shares * currentPrice,
    totalCost: shares * avgCost,
    gainLoss: shares * currentPrice - shares * avgCost,
    gainLossPercent: (currentPrice / avgCost - 1) * 100,
    sector: h.sector as string | undefined,
    assetType: h.asset_type as Holding["assetType"],
    lastUpdated: new Date(h.updated_at as string),
    createdAt: new Date(h.created_at as string),
  };
}
