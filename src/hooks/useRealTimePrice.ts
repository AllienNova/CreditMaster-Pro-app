"use client";

/**
 * useRealTimePrice Hook
 *
 * Provides real-time price updates via WebSocket or polling
 * Features:
 * - WebSocket connection for real-time updates
 * - Automatic fallback to polling if WebSocket unavailable
 * - Connection state management
 * - Automatic reconnection
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume?: number;
}

export interface UseRealTimePriceOptions {
  symbols: string[];
  enabled?: boolean;
  useWebSocket?: boolean;
  pollingInterval?: number; // milliseconds, used when WebSocket unavailable
}

export interface UseRealTimePriceReturn {
  prices: Map<string, PriceUpdate>;
  isConnected: boolean;
  error: string | null;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
}

export function useRealTimePrice(
  options: UseRealTimePriceOptions,
): UseRealTimePriceReturn {
  const {
    symbols: initialSymbols = [],
    enabled = true,
    useWebSocket = true,
    pollingInterval = 5000,
  } = options;

  const { user, loading: authLoading } = useAuth();
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<Set<string>>(new Set(initialSymbols));

  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const subscribe = useCallback((symbol: string) => {
    setSymbols((prev) => new Set([...prev, symbol.toUpperCase()]));
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    setSymbols((prev) => {
      const next = new Set(prev);
      next.delete(symbol.toUpperCase());
      return next;
    });
  }, []);

  const fetchPrices = useCallback(async () => {
    if (!user || symbols.size === 0) return;

    try {
      const symbolList = Array.from(symbols).join(",");
      const response = await fetch(
        `/api/investments/quotes?symbols=${symbolList}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      const result = await response.json();

      if (result.success && result.data) {
        const newPrices = new Map<string, PriceUpdate>();
        result.data.forEach((quote: any) => {
          newPrices.set(quote.symbol, {
            symbol: quote.symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            timestamp: Date.now(),
            volume: quote.volume,
          });
        });
        setPrices(newPrices);
        setError(null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch prices";
      setError(errorMessage);
      // Error already captured in state
    }
  }, [user, symbols]);

  const connectWebSocket = useCallback(() => {
    if (!user || !enabled || !useWebSocket || symbols.size === 0) return;

    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/investments/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // WebSocket connected
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to symbols
        ws.send(
          JSON.stringify({
            type: "subscribe",
            symbols: Array.from(symbols),
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "price_update") {
            setPrices((prev) => {
              const next = new Map(prev);
              next.set(data.symbol, {
                symbol: data.symbol,
                price: data.price,
                change: data.change,
                changePercent: data.changePercent,
                timestamp: data.timestamp,
                volume: data.volume,
              });
              return next;
            });
          }
        } catch (err) {
          // Silently ignore malformed messages
        }
      };

      ws.onerror = (error) => {
        // WebSocket error - state updated below
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        // WebSocket disconnected
        setIsConnected(false);

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000,
          );
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            // Attempting reconnect
            connectWebSocket();
          }, delay);
        } else {
          // Fallback to polling
          // Fallback to polling mode
          startPolling();
        }
      };
    } catch (err) {
      // WebSocket connection failed
      setError("Failed to connect WebSocket");
      startPolling();
    }
  }, [user, enabled, useWebSocket, symbols]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (!enabled || symbols.size === 0) return;

    // Initial fetch
    void fetchPrices();

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      void fetchPrices();
    }, pollingInterval);
  }, [enabled, symbols, pollingInterval, fetchPrices]);

  // Initialize connection
  useEffect(() => {
    if (authLoading || !enabled || symbols.size === 0) return;

    if (useWebSocket) {
      connectWebSocket();
    } else {
      startPolling();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [
    authLoading,
    enabled,
    symbols,
    useWebSocket,
    connectWebSocket,
    startPolling,
  ]);

  // Update subscriptions when symbols change
  useEffect(() => {
    if (!isConnected || !wsRef.current || symbols.size === 0) return;

    wsRef.current.send(
      JSON.stringify({
        type: "subscribe",
        symbols: Array.from(symbols),
      }),
    );
  }, [symbols, isConnected]);

  return {
    prices,
    isConnected,
    error,
    subscribe,
    unsubscribe,
  };
}
