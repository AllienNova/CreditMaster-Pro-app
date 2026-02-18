/**
 * React Hook for Market Data WebSocket
 *
 * Provides real-time market data updates via WebSocket
 */

import { useEffect, useState, useCallback } from "react";
import {
  getMarketDataWebSocketService,
  PriceUpdate,
  WebSocketStatus,
} from "@/lib/investments/services/MarketDataWebSocketService";

export interface UseMarketDataWebSocketOptions {
  symbol?: string;
  autoConnect?: boolean;
}

export interface UseMarketDataWebSocketReturn {
  priceUpdate: PriceUpdate | null;
  status: WebSocketStatus;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  connect: () => void;
  disconnect: () => void;
  subscribedSymbols: string[];
}

/**
 * Hook for subscribing to real-time market data updates
 *
 * @param options - Configuration options
 * @returns WebSocket state and control functions
 *
 * @example
 * ```tsx
 * const { priceUpdate, status, subscribe } = useMarketDataWebSocket({
 *   symbol: 'AAPL',
 *   autoConnect: true,
 * });
 *
 * useEffect(() => {
 *   if (priceUpdate) {
 *     console.log(`${priceUpdate.symbol}: $${priceUpdate.price}`);
 *   }
 * }, [priceUpdate]);
 * ```
 */
export function useMarketDataWebSocket(
  options: UseMarketDataWebSocketOptions = {},
): UseMarketDataWebSocketReturn {
  const { symbol, autoConnect = true } = options;

  const [priceUpdate, setPriceUpdate] = useState<PriceUpdate | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([]);

  const service = getMarketDataWebSocketService();

  // Connect to WebSocket
  const connect = useCallback(() => {
    service.connect();
  }, [service]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    service.disconnect();
  }, [service]);

  // Subscribe to a symbol
  const subscribe = useCallback(
    (sym: string) => {
      const unsubscribe = service.subscribe(sym, (update) => {
        setPriceUpdate(update);
      });

      setSubscribedSymbols(service.getSubscribedSymbols());

      return unsubscribe;
    },
    [service],
  );

  // Unsubscribe from a symbol
  const unsubscribe = useCallback(
    (sym: string) => {
      // The service handles unsubscription internally
      setSubscribedSymbols(service.getSubscribedSymbols());
    },
    [service],
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Subscribe to status changes
    const unsubscribeStatus = service.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Set initial status
    setStatus(service.getStatus());

    return () => {
      unsubscribeStatus();
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, service]);

  // Auto-subscribe to symbol if provided
  useEffect(() => {
    if (symbol) {
      const unsubscribeFn = subscribe(symbol);

      return () => {
        unsubscribeFn();
      };
    }
  }, [symbol, subscribe]);

  return {
    priceUpdate,
    status,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    subscribedSymbols,
  };
}

/**
 * Hook for subscribing to multiple symbols
 *
 * @param symbols - Array of symbols to subscribe to
 * @param autoConnect - Whether to auto-connect on mount
 * @returns WebSocket state and control functions
 *
 * @example
 * ```tsx
 * const { priceUpdates, status } = useMultiSymbolWebSocket(['AAPL', 'MSFT', 'GOOGL']);
 *
 * useEffect(() => {
 *   console.log('Latest prices:', priceUpdates);
 * }, [priceUpdates]);
 * ```
 */
export function useMultiSymbolWebSocket(symbols: string[], autoConnect = true) {
  const [priceUpdates, setPriceUpdates] = useState<Map<string, PriceUpdate>>(
    new Map(),
  );
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");

  const service = getMarketDataWebSocketService();

  useEffect(() => {
    if (autoConnect) {
      service.connect();
    }

    // Subscribe to status changes
    const unsubscribeStatus = service.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Set initial status
    setStatus(service.getStatus());

    return () => {
      unsubscribeStatus();
      if (autoConnect) {
        service.disconnect();
      }
    };
  }, [autoConnect, service]);

  useEffect(() => {
    const unsubscribeFns: (() => void)[] = [];

    symbols.forEach((symbol) => {
      const unsubscribe = service.subscribe(symbol, (update) => {
        setPriceUpdates((prev) => new Map(prev).set(symbol, update));
      });
      unsubscribeFns.push(unsubscribe);
    });

    return () => {
      unsubscribeFns.forEach((fn) => fn());
    };
  }, [symbols, service]);

  return {
    priceUpdates,
    status,
  };
}
