/**
 * useOrders Hook
 *
 * React hook for mobile app to manage orders.
 */

import { useState, useEffect, useCallback } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type OrderStatus =
  | "pending"
  | "submitted"
  | "accepted"
  | "partial"
  | "filled"
  | "cancelled"
  | "rejected"
  | "expired"
  | "error";

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQty: number;
  filledAvgPrice?: number;
  createdAt: Date;
  updatedAt: Date;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  timeInForce?: "day" | "gtc";
}

export interface OrdersState {
  orders: Order[];
  openOrders: Order[];
  isLoading: boolean;
  error: string | null;
  todayOrderCount: number;
  todayFillCount: number;
}

export interface UseOrdersConfig {
  pollingIntervalMs?: number;
  autoRefresh?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useOrders(config: UseOrdersConfig = {}) {
  const { pollingIntervalMs = 5000, autoRefresh = true } = config;

  const [state, setState] = useState<OrdersState>({
    orders: [],
    openOrders: [],
    isLoading: true,
    error: null,
    todayOrderCount: 0,
    todayFillCount: 0,
  });

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/trading/orders");

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          orders: data.data.orders || [],
          openOrders: data.data.openOrders || [],
          todayOrderCount: data.data.todayOrderCount || 0,
          todayFillCount: data.data.todayFillCount || 0,
          isLoading: false,
          error: null,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  // Create order
  const createOrder = useCallback(
    async (
      request: OrderRequest,
    ): Promise<{ success: boolean; order?: Order; error?: string }> => {
      try {
        const response = await fetch("/api/trading/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            ...request,
            timeInForce: request.timeInForce || "day",
          }),
        });

        const data = await response.json();

        if (data.success && data.data.order) {
          // Add to local state immediately
          setState((prev) => ({
            ...prev,
            orders: [data.data.order, ...prev.orders],
            openOrders: [data.data.order, ...prev.openOrders],
          }));
          return { success: true, order: data.data.order };
        }

        return {
          success: false,
          error:
            data.validation?.errors?.[0]?.message || "Failed to create order",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [],
  );

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/trading/orders?id=${orderId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setState((prev) => ({
          ...prev,
          openOrders: prev.openOrders.filter((o) => o.id !== orderId),
          orders: prev.orders.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" as OrderStatus } : o,
          ),
        }));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  // Cancel all orders
  const cancelAllOrders = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch("/api/trading/orders?all=true", {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        const openOrderIds = new Set(state.openOrders.map((o) => o.id));
        const cancelledCount = openOrderIds.size;
        setState((prev) => ({
          ...prev,
          openOrders: [],
          orders: prev.orders.map((o) =>
            openOrderIds.has(o.id)
              ? { ...o, status: "cancelled" as OrderStatus }
              : o,
          ),
        }));
        return cancelledCount;
      }

      return 0;
    } catch {
      return 0;
    }
  }, [state.openOrders]);

  // Get order by ID
  const getOrder = useCallback(
    (orderId: string): Order | undefined => {
      return state.orders.find((o) => o.id === orderId);
    },
    [state.orders],
  );

  // Initial fetch and polling
  useEffect(() => {
    fetchOrders();

    if (autoRefresh && pollingIntervalMs > 0) {
      const interval = setInterval(fetchOrders, pollingIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchOrders, autoRefresh, pollingIntervalMs]);

  return {
    ...state,
    fetchOrders,
    createOrder,
    cancelOrder,
    cancelAllOrders,
    getOrder,
  };
}

export default useOrders;
