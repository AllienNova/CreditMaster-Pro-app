'use client';

/**
 * useOrderExecution Hook
 *
 * React hook for order execution with live price updates.
 * Integrates with OrderExecutionEngine and OrderStatusTracker.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createOrderExecutionEngine,
  createOrderStatusTracker,
  OrderExecutionEngine,
  OrderStatusTracker,
  ExecutionResult,
  LivePriceInfo,
  TrackedOrder,
  OrderStatusChange,
  ExecutionEvent,
} from '@/lib/trading/realtime';
import { OrderRequest, Order } from '@/lib/trading/orders/order-types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseOrderExecutionOptions {
  apiKey?: string;
  apiSecret?: string;
  paperTrading?: boolean;
  autoConnect?: boolean;
  enableNotifications?: boolean;
}

export interface UseOrderExecutionReturn {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Live prices
  livePrices: Map<string, LivePriceInfo>;
  getLivePrice: (symbol: string) => LivePriceInfo | undefined;
  watchSymbol: (symbol: string) => void;
  unwatchSymbol: (symbol: string) => void;
  refreshPrice: (symbol: string) => Promise<LivePriceInfo | null>;

  // Order execution
  executeOrder: (
    request: OrderRequest,
    userId: string,
    accountId: string,
    skipConfirmation?: boolean
  ) => Promise<ExecutionResult>;
  confirmExecution: (
    executionId: string,
    userId: string,
    accountId: string
  ) => Promise<ExecutionResult>;
  cancelExecution: (executionId: string) => boolean;
  cancelOrder: (orderId: string) => Promise<boolean>;

  // Order tracking
  trackedOrders: TrackedOrder[];
  getTrackedOrder: (orderId: string) => TrackedOrder | undefined;

  // Events
  lastEvent: ExecutionEvent | null;
  lastStatusChange: OrderStatusChange | null;

  // Connection management
  connect: (credentials?: {
    apiKey: string;
    apiSecret: string;
  }) => Promise<void>;
  disconnect: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useOrderExecution(
  options: UseOrderExecutionOptions = {}
): UseOrderExecutionReturn {
  const {
    apiKey,
    apiSecret,
    paperTrading = true,
    autoConnect = false,
    enableNotifications = true,
  } = options;

  // Refs for engine instances
  const engineRef = useRef<OrderExecutionEngine | null>(null);
  const trackerRef = useRef<OrderStatusTracker | null>(null);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Data state
  const [livePrices, setLivePrices] = useState<Map<string, LivePriceInfo>>(
    new Map()
  );
  const [trackedOrders, setTrackedOrders] = useState<TrackedOrder[]>([]);
  const [lastEvent, setLastEvent] = useState<ExecutionEvent | null>(null);
  const [lastStatusChange, setLastStatusChange] =
    useState<OrderStatusChange | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = createOrderExecutionEngine({
        mode: paperTrading ? 'paper' : 'live',
        apiKey: apiKey || '',
        apiSecret: apiSecret || '',
      });
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.shutdown();
        engineRef.current = null;
      }
      if (trackerRef.current) {
        trackerRef.current.dispose();
        trackerRef.current = null;
      }
    };
  }, []);

  // Setup event subscriptions
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const subscriptions: (() => void)[] = [];

    // Live price updates
    const priceSubscription = engine.livePrices$.subscribe((price) => {
      setLivePrices((prev) => {
        const newMap = new Map(prev);
        newMap.set(price.symbol, price);
        return newMap;
      });
    });
    subscriptions.push(() => priceSubscription.unsubscribe());

    // Execution events
    const eventSubscription = engine.events$.subscribe((event) => {
      setLastEvent(event);
    });
    subscriptions.push(() => eventSubscription.unsubscribe());

    // Connection state
    const connectionSubscription = engine.connectionState$.subscribe(
      (state) => {
        setIsConnected(
          state.data === 'connected' &&
            state.trading === 'connected' &&
            state.broker
        );
      }
    );
    subscriptions.push(() => connectionSubscription.unsubscribe());

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, []);

  // Setup tracker subscriptions
  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;

    const subscriptions: (() => void)[] = [];

    // Tracked orders
    const ordersSubscription = tracker.trackedOrders$.subscribe((orders) => {
      setTrackedOrders(orders);
    });
    subscriptions.push(() => ordersSubscription.unsubscribe());

    // Status changes
    const statusSubscription = tracker.statusChanges$.subscribe((change) => {
      setLastStatusChange(change);
    });
    subscriptions.push(() => statusSubscription.unsubscribe());

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, []);

  // Auto-connect if credentials provided
  useEffect(() => {
    if (autoConnect && apiKey && apiSecret && !isConnected && !isConnecting) {
      connect({ apiKey, apiSecret });
    }
  }, [autoConnect, apiKey, apiSecret]);

  // Connect to execution engine
  const connect = useCallback(
    async (credentials?: { apiKey: string; apiSecret: string }) => {
      const engine = engineRef.current;
      if (!engine) return;

      setIsConnecting(true);
      setConnectionError(null);

      try {
        await engine.initialize(credentials);

        // Create and setup tracker after engine is initialized
        if (!trackerRef.current) {
          trackerRef.current = createOrderStatusTracker(engine, {
            enableNotifications,
          });
        }

        setIsConnected(true);
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : 'Connection failed'
        );
        setIsConnected(false);
      } finally {
        setIsConnecting(false);
      }
    },
    [enableNotifications]
  );

  // Disconnect
  const disconnect = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.shutdown();
    }
    if (trackerRef.current) {
      trackerRef.current.dispose();
      trackerRef.current = null;
    }
    setIsConnected(false);
    setLivePrices(new Map());
    setTrackedOrders([]);
  }, []);

  // Get live price for symbol
  const getLivePrice = useCallback(
    (symbol: string): LivePriceInfo | undefined => {
      return livePrices.get(symbol);
    },
    [livePrices]
  );

  // Watch symbol for price updates
  const watchSymbol = useCallback((symbol: string) => {
    if (engineRef.current) {
      engineRef.current.watchSymbols([symbol]);
    }
  }, []);

  // Unwatch symbol
  const unwatchSymbol = useCallback((symbol: string) => {
    if (engineRef.current) {
      engineRef.current.unwatchSymbols([symbol]);
    }
    setLivePrices((prev) => {
      const newMap = new Map(prev);
      newMap.delete(symbol);
      return newMap;
    });
  }, []);

  // Refresh price for symbol
  const refreshPrice = useCallback(
    async (symbol: string): Promise<LivePriceInfo | null> => {
      if (!engineRef.current) return null;
      return engineRef.current.getQuote(symbol);
    },
    []
  );

  // Execute order
  const executeOrder = useCallback(
    async (
      request: OrderRequest,
      userId: string,
      accountId: string,
      skipConfirmation = false
    ): Promise<ExecutionResult> => {
      if (!engineRef.current) {
        return { success: false, error: 'Engine not initialized' };
      }

      const result = await engineRef.current.executeOrder(
        request,
        userId,
        accountId,
        skipConfirmation
      );

      // Track the order if successful
      if (result.success && result.order && trackerRef.current) {
        trackerRef.current.trackOrder(result.order);
      }

      return result;
    },
    []
  );

  // Confirm pending execution
  const confirmExecution = useCallback(
    async (
      executionId: string,
      userId: string,
      accountId: string
    ): Promise<ExecutionResult> => {
      if (!engineRef.current) {
        return { success: false, error: 'Engine not initialized' };
      }

      const result = await engineRef.current.confirmExecution(
        executionId,
        userId,
        accountId
      );

      // Track the order if successful
      if (result.success && result.order && trackerRef.current) {
        trackerRef.current.trackOrder(result.order);
      }

      return result;
    },
    []
  );

  // Cancel pending execution
  const cancelExecution = useCallback((executionId: string): boolean => {
    if (!engineRef.current) return false;
    return engineRef.current.cancelPendingExecution(executionId);
  }, []);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!engineRef.current) return false;
    return engineRef.current.cancelOrder(orderId);
  }, []);

  // Get tracked order
  const getTrackedOrder = useCallback(
    (orderId: string): TrackedOrder | undefined => {
      return trackerRef.current?.getTrackedOrder(orderId);
    },
    []
  );

  return {
    // State
    isConnected,
    isConnecting,
    connectionError,

    // Live prices
    livePrices,
    getLivePrice,
    watchSymbol,
    unwatchSymbol,
    refreshPrice,

    // Order execution
    executeOrder,
    confirmExecution,
    cancelExecution,
    cancelOrder,

    // Order tracking
    trackedOrders,
    getTrackedOrder,

    // Events
    lastEvent,
    lastStatusChange,

    // Connection management
    connect,
    disconnect,
  };
}

export default useOrderExecution;
