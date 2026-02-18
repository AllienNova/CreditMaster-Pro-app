"use client";

/**
 * usePortfolio Hook
 *
 * Provides portfolio data and operations for client components
 * Features:
 * - Real-time portfolio data fetching
 * - Automatic refresh on interval
 * - Caching with SWR-like behavior
 * - Error handling and retry logic
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import type { Portfolio } from "@/lib/investments/types/portfolio.types";

export interface UsePortfolioOptions {
  period?: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";
  refreshInterval?: number; // milliseconds, 0 to disable
  enabled?: boolean;
}

export interface UsePortfolioReturn {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function usePortfolio(
  options: UsePortfolioOptions = {},
): UsePortfolioReturn {
  const {
    period = "1M",
    refreshInterval = 30000, // 30 seconds default
    enabled = true,
  } = options;

  const { user, loading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPortfolio = useCallback(
    async (isRefresh = false) => {
      if (!user || !enabled) {
        setLoading(false);
        return;
      }

      try {
        // Cancel previous request if still pending
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(
          `/api/investments/portfolio?period=${period}`,
          {
            signal: abortControllerRef.current.signal,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch portfolio");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setPortfolio(result.data);
          setError(null);
        } else {
          throw new Error(result.error || "Invalid portfolio data");
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to load portfolio";
        setError(errorMessage);
        // Portfolio fetch error - state updated
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, enabled, period],
  );

  const refresh = useCallback(async () => {
    await fetchPortfolio(true);
  }, [fetchPortfolio]);

  // Initial fetch
  useEffect(() => {
    if (!authLoading && enabled) {
      void fetchPortfolio();
    }
  }, [authLoading, enabled, fetchPortfolio]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0 || !user) {
      return;
    }

    intervalRef.current = setInterval(() => {
      void fetchPortfolio(true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, user, fetchPortfolio]);

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
    portfolio,
    loading,
    error,
    refresh,
    isRefreshing,
  };
}
