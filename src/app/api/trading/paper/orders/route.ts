/**
 * Paper Trading Orders API Route
 *
 * GET    - List paper orders with filters
 * POST   - Place a new paper order
 * DELETE - Cancel a paper order
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { getPaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";

// ============================================================================
// GET - List Orders
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const engine = getPaperTradingEngine();
    const account = await engine.getAccount(user.id);

    if (!account) {
      return NextResponse.json(
        { error: "No paper trading account found" },
        { status: 404 },
      );
    }

    // Return order blotter summary
    if (action === "blotter") {
      const blotter = await engine.getOrderBlotter(account.id);
      return NextResponse.json({ success: true, data: blotter });
    }

    // Build filter from query params
    const status = searchParams.get("status");
    const side = searchParams.get("side");
    const symbol = searchParams.get("symbol");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (side) filter.side = side;
    if (symbol) filter.symbol = symbol;

    const orders = await engine.getOrders(
      account.id,
      Object.keys(filter).length > 0 ? filter : undefined,
    );

    return NextResponse.json({ success: true, data: orders });
  } catch (_error) {
    void _error;
    return NextResponse.json(
      { error: "Failed to fetch paper orders" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Place Order
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();

    if (!body.symbol || !body.side || !body.quantity) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, side, quantity" },
        { status: 400 },
      );
    }

    const engine = getPaperTradingEngine();
    const account = await engine.getAccount(user.id);

    if (!account) {
      return NextResponse.json(
        { error: "No paper trading account found. Create one first." },
        { status: 404 },
      );
    }

    const order = await engine.placeOrder(account.id, {
      symbol: body.symbol,
      side: body.side,
      type: body.type || "market",
      quantity: body.quantity,
      timeInForce: body.timeInForce || "day",
      limitPrice: body.limitPrice,
      stopPrice: body.stopPrice,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to place paper order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

// ============================================================================
// DELETE - Cancel Order
// ============================================================================

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 },
      );
    }

    const engine = getPaperTradingEngine();

    // Authorization: the order must belong to the caller's own paper account.
    // engine.cancelOrder() takes only an orderId, so ownership is verified
    // here against the account's order list before the cancel is issued.
    const account = await engine.getAccount(user.id);
    if (!account) {
      return NextResponse.json(
        { error: "No paper trading account found" },
        { status: 404 },
      );
    }

    const accountOrders = await engine.getOrders(account.id);
    const owned = accountOrders.some((o) => o.id === orderId);
    if (!owned) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    const cancelled = await engine.cancelOrder(orderId);

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel paper order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  },
);
