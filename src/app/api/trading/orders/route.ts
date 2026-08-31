/**
 * Orders API Route
 *
 * Handles order management operations:
 * - GET: Retrieve orders with filters
 * - POST: Create new order
 * - PUT: Update/modify order
 * - DELETE: Cancel order
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getOrderManager,
  OrderRequest,
  OrderFilter,
  OrderStatus,
  type BrokerClient,
  type BrokerOrderParams,
  type BrokerOrderResponse,
  type BrokerOrder,
} from "@/lib/trading/orders";
import { getBrokerFactory } from "@/lib/trading/brokers/broker-factory";
import type { BrokerCredentials } from "@/lib/trading/brokers/broker-interface";
import { PaperTradingEngine } from "@/lib/trading/paper/PaperTradingEngine";
import { runAllGates, type GateRunnerInput } from "@/lib/trading/compliance/gate-runner";
import { creditService, CREDIT_COSTS } from "@/lib/credits";

// ============================================================================
// GET - Retrieve Orders
// ============================================================================

export const GET = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    const orderManager = getOrderManager();

    // The in-memory order-manager singleton holds every user's orders; the
    // route is responsible for scoping every response to the caller. Orders
    // carry `userId` (set on create) — filter on it for all in-memory reads.
    const ownsOrder = (o: { userId: string }) => o.userId === user.id;

    // Handle specific actions
    if (action === "blotter") {
      const blotter = orderManager.getBlotter();
      const scoped = {
        ...blotter,
        openOrders: blotter.openOrders.filter(ownsOrder),
        filledOrders: blotter.filledOrders.filter(ownsOrder),
        cancelledOrders: blotter.cancelledOrders.filter(ownsOrder),
      };
      return NextResponse.json({ success: true, data: scoped });
    }

    if (action === "events") {
      const orderId = searchParams.get("orderId");
      // Only expose events for an order the caller owns.
      if (orderId) {
        const order = orderManager.getOrder(orderId);
        if (!order || !ownsOrder(order)) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        const events = orderManager.getOrderEvents(orderId);
        return NextResponse.json({ success: true, data: events });
      }
      // No orderId: restrict events to the caller's own orders.
      const ownedOrderIds = new Set(
        orderManager.getOpenOrders().filter(ownsOrder).map((o) => o.id),
      );
      const events = orderManager
        .getOrderEvents()
        .filter((e) => ownedOrderIds.has(e.orderId));
      return NextResponse.json({ success: true, data: events });
    }

    // Build filter from query params. User scoping is NOT in here — it is the
    // required first argument to getOrders() below, taken from the authenticated
    // caller and never from client input.
    const filter: OrderFilter = {};

    const status = searchParams.get("status");
    if (status) {
      filter.status = status.split(",") as OrderStatus[];
    }

    const side = searchParams.get("side");
    if (side === "buy" || side === "sell") {
      filter.side = side;
    }

    const symbol = searchParams.get("symbol");
    if (symbol) {
      filter.symbol = symbol;
    }

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filter.startDate = new Date(startDate);
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      filter.endDate = new Date(endDate);
    }

    const strategyId = searchParams.get("strategyId");
    if (strategyId) {
      filter.strategyId = strategyId;
    }

    const limit = searchParams.get("limit");
    if (limit) {
      filter.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get("offset");
    if (offset) {
      filter.offset = parseInt(offset, 10);
    }

    // Get single order by ID — only if it belongs to the caller.
    const orderId = searchParams.get("id");
    if (orderId) {
      const order = orderManager.getOrder(orderId);
      if (!order || !ownsOrder(order)) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: order });
    }

    // Get filtered orders — getOrders() is user-scoped via its required first
    // argument; getOpenOrders() is in-memory and is filtered to the caller here.
    const orders = await orderManager.getOrders(user.id, filter);
    const openOrders = orderManager.getOpenOrders().filter(ownsOrder);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        openOrders,
        totalOpen: openOrders.length,
      },
    });
  } catch (_error) {
    // OrdersAPI error: Orders GET error
    void _error;
    return NextResponse.json(
      { error: "Failed to retrieve orders" },
      { status: 500 },
    );
  }
});

// ============================================================================
// POST - Create Order
// ============================================================================

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const body = await request.json();
    const { action } = body;

    const orderManager = getOrderManager();

    // Handle different actions
    switch (action) {
      case "create": {
        const orderRequest: OrderRequest = {
          symbol: body.symbol,
          side: body.side,
          quantity: body.quantity,
          type: body.type || "limit",
          limitPrice: body.limitPrice,
          stopPrice: body.stopPrice,
          trailPercent: body.trailPercent,
          trailAmount: body.trailAmount,
          timeInForce: body.timeInForce || "day",
          extendedHours: body.extendedHours,
          orderClass: body.orderClass,
          takeProfitPrice: body.takeProfitPrice,
          stopLossPrice: body.stopLossPrice,
          stopLossLimitPrice: body.stopLossLimitPrice,
          clientOrderId: body.clientOrderId,
          signalId: body.signalId,
          strategyId: body.strategyId,
          notes: body.notes,
        };

        // ================================================================
        // Strativion: Compliance gate-runner (pre-trade admission)
        // ================================================================
        try {
          const gateInput: GateRunnerInput = {
            userId: user.id,
            symbol: body.symbol,
            side: body.side === "buy" ? "buy" : body.side === "sell" ? "sell" : "buy",
            quantity: body.quantity ?? 0,
            price: body.limitPrice ?? body.stopPrice ?? 0,
            accountEquity: body.accountEquity ?? 0,
            dayTradesInWindow: body.dayTradesInWindow,
            spxChangePct: body.spxChangePct,
          };

          const gateResult = runAllGates(gateInput);
          if (!gateResult.allPassed) {
            return NextResponse.json(
              {
                success: false,
                error: "Compliance gate blocked",
                blockedGates: gateResult.blockedGates.map((g) => ({
                  gate: g.gateId,
                  name: g.gateName,
                  reason: g.reason,
                })),
              },
              { status: 403 },
            );
          }
        } catch (gateErr) {
          // Compliance gates MUST fail-closed — block trade if gates error
          console.error("[ComplianceGate] Error running gates:", gateErr);
          return NextResponse.json(
            {
              success: false,
              error: "Compliance check unavailable — order blocked for safety",
            },
            { status: 503 },
          );
        }

        // Credit check before order creation
        const orderCost = CREDIT_COSTS.trade_execution;
        const hasOrderCredits = await creditService.checkSufficientCredits(user.id, orderCost);
        if (!hasOrderCredits) {
          return NextResponse.json(
            {
              success: false,
              error: "Insufficient credits",
              code: "INSUFFICIENT_CREDITS",
              required: orderCost,
              action: "trade_execution",
            },
            { status: 402 },
          );
        }

        // Get account ID (in production, fetch from user's linked broker account)
        const accountId = body.accountId || "default";

        const { order, validation } = await orderManager.createOrder(
          orderRequest,
          user.id,
          accountId,
        );

        if (!order) {
          return NextResponse.json(
            {
              success: false,
              validation,
            },
            { status: 400 },
          );
        }

        // Deduct credits after successful order creation
        try {
          await creditService.deductCredits(user.id, "trade_execution", {
            symbol: body.symbol,
            side: body.side,
            quantity: body.quantity,
            orderId: order.id,
          });
        } catch (deductErr) {
          console.error("[Credits] Failed to deduct for trade_execution:", deductErr);
        }

        return NextResponse.json({
          success: true,
          data: { order, validation },
        });
      }

      case "submit": {
        const { orderId } = body;
        if (!orderId) {
          return NextResponse.json(
            { error: "orderId required" },
            { status: 400 },
          );
        }

        const pendingOrder = orderManager.getOrder(orderId);
        if (!pendingOrder) {
          return NextResponse.json(
            { error: "Order not found" },
            { status: 404 },
          );
        }

        // Determine paper vs live from the user's broker connection row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: brokerConn } = await (supabaseAdmin as any)
          .from("broker_connections")
          .select("broker, paper_trading, account_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        const isPaper = brokerConn ? Boolean(brokerConn.paper_trading) : true;

        if (isPaper) {
          // Paper trading path
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
              { error: "Supabase configuration missing" },
              { status: 500 },
            );
          }

          const paperEngine = new PaperTradingEngine(supabaseUrl, supabaseKey);
          const accountId = brokerConn?.account_id || pendingOrder.accountId || user.id;

          try {
            const paperOrder = await paperEngine.placeOrder(accountId, {
              symbol: pendingOrder.symbol,
              side: pendingOrder.side,
              quantity: pendingOrder.quantity,
              type: pendingOrder.type,
              limitPrice: pendingOrder.limitPrice,
              stopPrice: pendingOrder.stopPrice,
              timeInForce: pendingOrder.timeInForce,
              extendedHours: pendingOrder.extendedHours,
              takeProfitPrice: pendingOrder.takeProfitPrice,
              stopLossPrice: pendingOrder.stopLossPrice,
              clientOrderId: pendingOrder.id,
            });

            return NextResponse.json({
              success: true,
              data: { order: paperOrder, mode: "paper" },
            });
          } catch (err) {
            return NextResponse.json(
              {
                success: false,
                error: err instanceof Error ? err.message : "Paper order failed",
              },
              { status: 400 },
            );
          }
        }

        // Live trading path — use Alpaca via broker factory
        const alpacaKey = process.env.ALPACA_API_KEY;
        const alpacaSecret = process.env.ALPACA_API_SECRET;

        if (!alpacaKey || !alpacaSecret) {
          return NextResponse.json(
            { error: "Connect a broker to execute trades" },
            { status: 400 },
          );
        }

        const broker = getBrokerFactory().create("alpaca");
        const credentials: BrokerCredentials = {
          apiKey: alpacaKey,
          apiSecret: alpacaSecret,
          paperTrading: false,
        };

        await broker.connect(credentials);

        // Adapt BrokerInterface.placeOrder result to BrokerClient interface
        const brokerClientAdapter: BrokerClient = {
          async submitOrder(params: BrokerOrderParams): Promise<BrokerOrderResponse> {
            const result = await broker.placeOrder({
              symbol: params.symbol,
              side: params.side as "buy" | "sell",
              quantity: params.qty,
              type: params.type as "market" | "limit" | "stop" | "stop_limit" | "trailing_stop",
              limitPrice: params.limit_price,
              stopPrice: params.stop_price,
              timeInForce: (params.time_in_force || "day") as "day" | "gtc" | "ioc" | "fok" | "opg" | "cls",
              clientOrderId: params.client_order_id,
            });

            if (!result.success || !result.order) {
              throw new Error(result.error || "Broker rejected order");
            }

            return {
              id: result.order.id,
              client_order_id: result.order.clientOrderId ?? params.client_order_id ?? "",
              status: result.order.status,
            };
          },
          async cancelOrder(cancelOrderId: string): Promise<void> {
            await broker.cancelOrder(cancelOrderId);
          },
          async getOrders(): Promise<BrokerOrder[]> {
            const orders = await broker.getOrders();
            return orders.map((o) => ({
              id: o.id,
              client_order_id: o.clientOrderId ?? "",
              status: o.status,
              filled_qty: o.filledQuantity,
              filled_avg_price: o.filledAvgPrice,
            }));
          },
          async getOrder(getOrderId: string): Promise<BrokerOrder> {
            const o = await broker.getOrder(getOrderId);
            if (!o) throw new Error(`Order ${getOrderId} not found`);
            return {
              id: o.id,
              client_order_id: o.clientOrderId ?? "",
              status: o.status,
              filled_qty: o.filledQuantity,
              filled_avg_price: o.filledAvgPrice,
            };
          },
        };

        const submitted = await orderManager.submitOrder(orderId, brokerClientAdapter);

        if (!submitted) {
          return NextResponse.json(
            { error: "Order submission failed" },
            { status: 400 },
          );
        }

        return NextResponse.json({
          success: submitted.status !== "error",
          data: { order: submitted, mode: "live" },
          ...(submitted.status === "error" && { error: submitted.errorMessage }),
        });
      }

      case "validate": {
        const orderRequest: OrderRequest = {
          symbol: body.symbol,
          side: body.side,
          quantity: body.quantity,
          type: body.type || "limit",
          limitPrice: body.limitPrice,
          stopPrice: body.stopPrice,
          timeInForce: body.timeInForce || "day",
          takeProfitPrice: body.takeProfitPrice,
          stopLossPrice: body.stopLossPrice,
        };

        const validation = await orderManager.validateOrder(
          orderRequest,
          user.id,
        );

        return NextResponse.json({
          success: true,
          data: validation,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (_error) {
    // OrdersAPI error: Orders POST error
    void _error;
    return NextResponse.json(
      { error: "Failed to process order request" },
      { status: 500 },
    );
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
    const cancelAll = searchParams.get("all") === "true";

    const orderManager = getOrderManager();
    const ownsOrder = (o: { userId: string }) => o.userId === user.id;

    if (cancelAll) {
      // "Cancel all" is scoped to the caller's own open orders only.
      const openOrders = orderManager.getOpenOrders().filter(ownsOrder);
      return NextResponse.json({
        success: true,
        data: {
          message: "Cancel all requested",
          orderCount: openOrders.length,
        },
      });
    }

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const order = orderManager.getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorization: a user may only cancel their own order.
    if (!ownsOrder(order)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // In production, would call brokerClient.cancelOrder
    return NextResponse.json({
      success: true,
      data: {
        message: "Cancel requested",
        orderId,
      },
    });
  } catch (_error) {
    // OrdersAPI error: Orders DELETE error
    void _error;
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 },
    );
  }
  },
);
