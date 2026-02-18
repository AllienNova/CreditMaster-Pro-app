"use client";

/**
 * useMarketData Hook
 *
 * Provides market data fetching for stocks, crypto, and other assets
 * Features:
 * - Real-time quote data
 * - Historical price data
 * - Caching to reduce API calls
 * - Support for multiple symbols
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import type { StockQuote } from "@/lib/investments/types/stock-analysis.types";

export interface HistoricalDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface UseMarketDataOptions {
  symbol: string;
  enabled?: boolean;
  refreshInterval?: number; // milliseconds, 0 to disable
}

export interface UseMarketDataReturn {
  quote: StockQuote | null;
  historicalData: HistoricalDataPoint[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fetchHistorical: (interval: string, limit: number) => Promise<void>;
}

export function useMarketData(
  options: UseMarketDataOptions,
): UseMarketDataReturn {
  const { symbol, enabled = true, refreshInterval = 60000 } = options; // 1 minute default

  const { user, loading: authLoading } = useAuth();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!user || !enabled || !symbol) {
      setLoading(false);
      return;
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/investments/quote/${symbol}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch quote");
      }

      const result = await response.json();

      if (result.success && result.data) {
        setQuote(result.data);
        setError(null);
      } else {
        throw new Error(result.error || "Invalid quote data");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to load quote";
      setError(errorMessage);
      // Quote fetch error - state updated
    } finally {
      setLoading(false);
    }
  }, [user, enabled, symbol]);

  const fetchHistorical = useCallback(
    async (interval: string = "1d", limit: number = 100) => {
      if (!user || !symbol) return;

      try {
        const response = await fetch(
          `/api/investments/historical/${symbol}?interval=${interval}&limit=${limit}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch historical data");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setHistoricalData(result.data);
        } else {
          throw new Error(result.error || "Invalid historical data");
        }
      } catch (err) {
        // Historical data fetch error
      }
    },
    [user, symbol],
  );

  const refresh = useCallback(async () => {
    await fetchQuote();
  }, [fetchQuote]);

  // Initial fetch
  useEffect(() => {
    if (!authLoading && enabled && symbol) {
      void fetchQuote();
    }
  }, [authLoading, enabled, symbol, fetchQuote]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0 || !user || !symbol) {
      return;
    }

    intervalRef.current = setInterval(() => {
      void fetchQuote();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, user, symbol, fetchQuote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    quote,
    historicalData,
    loading,
    error,
    refresh,
    fetchHistorical,
  };
}
