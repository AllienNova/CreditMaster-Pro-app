/**
 * Investment Holdings API
 *
 * GET /api/investments/holdings - List all holdings
 * POST /api/investments/holdings - Create a new holding
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();
import type {
  Holding,
  HoldingCreateInput,
} from "@/lib/investments/types/portfolio.types";

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get("sortBy") || "symbol";
    const sortDir = searchParams.get("sortDir") || "asc";
    const assetType = searchParams.get("assetType");

    let query = supabase
      .from("investment_holdings")
      .select("*")
      .eq("user_id", userId);

    if (assetType) {
      query = query.eq("asset_type", assetType);
    }

    const sortColumn =
      sortBy === "value"
        ? "current_price"
        : sortBy === "gainLoss"
          ? "current_price"
          : "symbol";
    query = query.order(sortColumn, { ascending: sortDir === "asc" });

    const { data, error } = await query;

    if (error) {
      // HoldingsRoute error: Failed to fetch holdings
      return NextResponse.json(
        { success: false, error: "Failed to fetch holdings" },
        { status: 500 },
      );
    }

    const holdings: Holding[] = (data || []).map((h) => ({
      id: h.id,
      userId: h.user_id,
      symbol: h.symbol,
      name: h.name,
      shares: h.shares,
      averageCostBasis: h.average_cost_basis,
      currentPrice: h.current_price || h.average_cost_basis,
      totalValue: h.shares * (h.current_price || h.average_cost_basis),
      totalCost: h.shares * h.average_cost_basis,
      gainLoss:
        h.shares * (h.current_price || h.average_cost_basis) -
        h.shares * h.average_cost_basis,
      gainLossPercent:
        ((h.current_price || h.average_cost_basis) / h.average_cost_basis - 1) *
        100,
      sector: h.sector,
      assetType: h.asset_type,
      lastUpdated: new Date(h.updated_at),
      createdAt: new Date(h.created_at),
    }));

    return NextResponse.json({
      success: true,
      data: holdings,
      total: holdings.length,
    });
  } catch (_error) {
    // HoldingsRoute error: Holdings GET failed
    void _error;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const body: HoldingCreateInput = await request.json();

    // Validate required fields
    if (!body.symbol || !body.shares || !body.averageCostBasis) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if holding already exists for this symbol
    // Real columns are `quantity` and `average_cost`; `shares` and
    // `average_cost_basis` exist nowhere on investment_holdings. Naming them
    // errored the whole SELECT, so `existing` was always undefined and this
    // route ALWAYS took the insert branch — silently creating a duplicate
    // holding row per POST instead of averaging into the existing one, and
    // never updating a position. The API's own request field names
    // (body.shares / body.averageCostBasis) are unchanged; only the column
    // names are corrected.
    const { data: existing } = await supabase
      .from("investment_holdings")
      .select("id, quantity, average_cost")
      .eq("user_id", userId)
      .eq("symbol", body.symbol.toUpperCase())
      .single();

    if (existing) {
      // Update existing holding with new average cost basis
      const newTotalShares = existing.quantity + body.shares;
      const newTotalCost =
        existing.quantity * existing.average_cost +
        body.shares * body.averageCostBasis;
      const newAvgCost = newTotalCost / newTotalShares;

      const { data, error } = await supabase
        // idor-audit: pk-owner-checked — existing.id came from the
        // select above, which filters .eq("user_id", userId).
        .from("investment_holdings")
        .update({
          quantity: newTotalShares,
          average_cost: newAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: transformHolding(data),
        message: "Holding updated with new shares",
      });
    }

    // Create new holding
    const { data, error } = await supabase
      .from("investment_holdings")
      .insert({
        user_id: userId,
        symbol: body.symbol.toUpperCase(),
        name: body.name || body.symbol.toUpperCase(),
        quantity: body.shares,
        average_cost: body.averageCostBasis,
        current_price: body.averageCostBasis,
        asset_type: body.assetType || "stock",
        sector: body.sector,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: transformHolding(data) },
      { status: 201 },
    );
  } catch (_error) {
    // HoldingsRoute error: Holdings POST failed
    void _error;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
});

function transformHolding(h: Record<string, unknown>): Holding {
  // Reads off a `select("*")`, so these never errored — they just came back
  // undefined, and every derived figure below (value, gainLoss, gainLossPercent)
  // resolved to NaN. This is the phantom-column case a query-level audit cannot
  // see: the column list is a wildcard, and the mismatch only appears where the
  // row is destructured. Real columns are `quantity` and `average_cost`.
  const shares = h.quantity as number;
  const avgCost = h.average_cost as number;
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
