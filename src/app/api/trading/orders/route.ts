/**
 * Orders API Route
 *
 * Handles order management operations:
 * - GET: Retrieve orders with filters
 * - POST: Create new order
 * - PUT: Update/modify order
 * - DELETE: Cancel order
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getOrderManager,
  OrderRequest,
  OrderFilter,
  OrderStatus,
} from '@/lib/trading/orders';

// ============================================================================
// GET - Retrieve Orders
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    const orderManager = getOrderManager();

    // Handle specific actions
    if (action === 'blotter') {
      const blotter = orderManager.getBlotter();
      return NextResponse.json({ success: true, data: blotter });
    }

    if (action === 'events') {
      const orderId = searchParams.get('orderId');
      const events = orderManager.getOrderEvents(orderId || undefined);
      return NextResponse.json({ success: true, data: events });
    }

    // Build filter from query params
    const filter: OrderFilter = {};

    const status = searchParams.get('status');
    if (status) {
      filter.status = status.split(',') as OrderStatus[];
    }

    const side = searchParams.get('side');
    if (side === 'buy' || side === 'sell') {
      filter.side = side;
    }

    const symbol = searchParams.get('symbol');
    if (symbol) {
      filter.symbol = symbol;
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
      filter.startDate = new Date(startDate);
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      filter.endDate = new Date(endDate);
    }

    const strategyId = searchParams.get('strategyId');
    if (strategyId) {
      filter.strategyId = strategyId;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      filter.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get('offset');
    if (offset) {
      filter.offset = parseInt(offset, 10);
    }

    // Get single order by ID
    const orderId = searchParams.get('id');
    if (orderId) {
      const order = orderManager.getOrder(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: order });
    }

    // Get filtered orders
    const orders = await orderManager.getOrders(filter);
    const openOrders = orderManager.getOpenOrders();

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
      { error: 'Failed to retrieve orders' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create Order
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const orderManager = getOrderManager();

    // Handle different actions
    switch (action) {
      case 'create': {
        const orderRequest: OrderRequest = {
          symbol: body.symbol,
          side: body.side,
          quantity: body.quantity,
          type: body.type || 'limit',
          limitPrice: body.limitPrice,
          stopPrice: body.stopPrice,
          trailPercent: body.trailPercent,
          trailAmount: body.trailAmount,
          timeInForce: body.timeInForce || 'day',
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

        // Get account ID (in production, fetch from user's linked broker account)
        const accountId = body.accountId || 'default';

        const { order, validation } = await orderManager.createOrder(
          orderRequest,
          user.id,
          accountId
        );

        if (!order) {
          return NextResponse.json(
            {
              success: false,
              validation,
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { order, validation },
        });
      }

      case 'submit': {
        const { orderId } = body;
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId required' },
            { status: 400 }
          );
        }

        // In production, get broker client from user's configuration
        // For now, return the order in submitted state (mock)
        const order = orderManager.getOrder(orderId);
        if (!order) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            order,
            message: 'Order ready for submission. Connect broker to execute.',
          },
        });
      }

      case 'validate': {
        const orderRequest: OrderRequest = {
          symbol: body.symbol,
          side: body.side,
          quantity: body.quantity,
          type: body.type || 'limit',
          limitPrice: body.limitPrice,
          stopPrice: body.stopPrice,
          timeInForce: body.timeInForce || 'day',
          takeProfitPrice: body.takeProfitPrice,
          stopLossPrice: body.stopLossPrice,
        };

        const validation = await orderManager.validateOrder(
          orderRequest,
          user.id
        );

        return NextResponse.json({
          success: true,
          data: validation,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (_error) {
    // OrdersAPI error: Orders POST error
    void _error;
    return NextResponse.json(
      { error: 'Failed to process order request' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Cancel Order
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    const cancelAll = searchParams.get('all') === 'true';

    const orderManager = getOrderManager();

    if (cancelAll) {
      // Cancel all open orders (requires broker client in production)
      const openOrders = orderManager.getOpenOrders();
      return NextResponse.json({
        success: true,
        data: {
          message: 'Cancel all requested',
          orderCount: openOrders.length,
        },
      });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const order = orderManager.getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // In production, would call brokerClient.cancelOrder
    return NextResponse.json({
      success: true,
      data: {
        message: 'Cancel requested',
        orderId,
      },
    });
  } catch (_error) {
    // OrdersAPI error: Orders DELETE error
    void _error;
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
