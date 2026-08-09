/**
 * Positions API Route
 *
 * Handles position management operations:
 * - GET: Retrieve positions and summary
 * - POST: Close/modify positions
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import {
  getPositionManager,
  PositionFilter,
  PositionStatus,
  PositionSide,
} from "@/lib/trading/positions";

// ============================================================================
// GET - Retrieve Positions
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const positionManager = getPositionManager();

    // Load user's positions
    await positionManager.loadPositions(user.id);

    // Handle specific actions
    if (action === "summary") {
      const summary = positionManager.getSummary();
      return NextResponse.json({ success: true, data: summary });
    }

    if (action === "trades") {
      const positionId = searchParams.get("positionId");
      const symbol = searchParams.get("symbol");
      const limit = searchParams.get("limit");

      const trades = positionManager.getTrades({
        positionId: positionId || undefined,
        symbol: symbol || undefined,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return NextResponse.json({ success: true, data: trades });
    }

    // Get single position by ID
    const positionId = searchParams.get("id");
    if (positionId) {
      const position = positionManager.getPosition(positionId);
      if (!position) {
        return NextResponse.json(
          { error: "Position not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: position });
    }

    // Get position by symbol
    const symbol = searchParams.get("symbol");
    if (symbol) {
      const position = positionManager.getPositionBySymbol(symbol);
      return NextResponse.json({
        success: true,
        data: position || null,
        hasPosition: !!position,
      });
    }

    // Build filter from query params
    const filter: PositionFilter = {};

    const status = searchParams.get("status");
    if (status) {
      filter.status = status.split(",") as PositionStatus[];
    }

    const side = searchParams.get("side");
    if (side === "long" || side === "short") {
      filter.side = side as PositionSide;
    }

    const strategyId = searchParams.get("strategyId");
    if (strategyId) {
      filter.strategyId = strategyId;
    }

    const minValue = searchParams.get("minValue");
    if (minValue) {
      filter.minValue = parseFloat(minValue);
    }

    const maxValue = searchParams.get("maxValue");
    if (maxValue) {
      filter.maxValue = parseFloat(maxValue);
    }

    const limit = searchParams.get("limit");
    if (limit) {
      filter.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get("offset");
    if (offset) {
      filter.offset = parseInt(offset, 10);
    }

    // Get filtered positions
    const positions = await positionManager.getPositions(filter);
    const openPositions = positionManager.getOpenPositions();
    const summary = positionManager.getSummary();

    return NextResponse.json({
      success: true,
      data: {
        positions,
        openPositions,
        summary,
      },
    });
  } catch (_error) {
    // PositionsAPI error: Positions GET error
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve positions" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Modify Positions
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { action } = body;

    const positionManager = getPositionManager();
    await positionManager.loadPositions(user.id);

    switch (action) {
      case "close": {
        const { positionId, closePrice, closeQuantity, reason } = body;

        if (!positionId) {
          return NextResponse.json(
            { error: "positionId required" },
            { status: 400 },
          );
        }

        const position = positionManager.getPosition(positionId);
        if (!position) {
          return NextResponse.json(
            { error: "Position not found" },
            { status: 404 },
          );
        }

        const price = closePrice || position.currentPrice;

        const result = await positionManager.closePosition({
          positionId,
          closePrice: price,
          closeQuantity,
          timestamp: new Date(),
          reason: reason || "manual",
        });

        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case "updatePrice": {
        const { symbol, price } = body;

        if (!symbol || !price) {
          return NextResponse.json(
            { error: "symbol and price required" },
            { status: 400 },
          );
        }

        positionManager.updatePrice(symbol, price);

        const position = positionManager.getPositionBySymbol(symbol);

        return NextResponse.json({
          success: true,
          data: position,
        });
      }

      case "updatePrices": {
        const { prices } = body;

        if (!prices || typeof prices !== "object") {
          return NextResponse.json(
            { error: "prices object required" },
            { status: 400 },
          );
        }

        positionManager.updatePrices(prices);

        const summary = positionManager.getSummary();

        return NextResponse.json({
          success: true,
          data: { summary },
        });
      }

      case "setEquity": {
        const { equity } = body;

        if (typeof equity !== "number") {
          return NextResponse.json(
            { error: "equity number required" },
            { status: 400 },
          );
        }

        positionManager.setAccountEquity(equity);

        return NextResponse.json({
          success: true,
          data: { equity },
        });
      }

      case "closeAll": {
        const openPositions = positionManager.getOpenPositions();
        const results = [];

        for (const position of openPositions) {
          const result = await positionManager.closePosition({
            positionId: position.id,
            closePrice: position.currentPrice,
            timestamp: new Date(),
            reason: "manual",
          });
          results.push(result);
        }

        return NextResponse.json({
          success: true,
          data: {
            closedCount: results.length,
            totalRealizedPL: results.reduce((sum, r) => sum + r.realizedPL, 0),
          },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    // PositionsAPI error: Positions POST error
    void _error;
    return NextResponse.json(
      { error: "Failed to process position request" },
      { status: 500 },
    );
  }
});
