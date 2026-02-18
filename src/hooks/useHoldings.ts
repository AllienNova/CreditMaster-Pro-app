"use client";

/**
 * useHoldings Hook
 *
 * Provides holdings management operations for client components
 * Features:
 * - Fetch user holdings
 * - Add, update, delete holdings
 * - Real-time updates
 * - Optimistic updates with rollback
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import type { Holding } from "@/lib/investments/types/portfolio.types";

export interface UseHoldingsOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseHoldingsReturn {
  holdings: Holding[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addHolding: (
    holding: Omit<Holding, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => Promise<boolean>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<boolean>;
  deleteHolding: (id: string) => Promise<boolean>;
  isUpdating: boolean;
}

export function useHoldings(
  options: UseHoldingsOptions = {},
): UseHoldingsReturn {
  const { enabled = true, refreshInterval = 0 } = options;

  const { user, loading: authLoading } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHoldings = useCallback(async () => {
    if (!user || !enabled) {
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

      const response = await fetch("/api/investments/holdings", {
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch holdings");
      }

      const result = await response.json();

      if (result.success && result.data) {
        setHoldings(result.data);
        setError(null);
      } else {
        throw new Error(result.error || "Invalid holdings data");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to load holdings";
      setError(errorMessage);
      // Holdings fetch error - state updated
    } finally {
      setLoading(false);
    }
  }, [user, enabled]);

  const refresh = useCallback(async () => {
    await fetchHoldings();
  }, [fetchHoldings]);

  const addHolding = useCallback(
    async (
      holding: Omit<Holding, "id" | "userId" | "createdAt" | "updatedAt">,
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        setIsUpdating(true);
        setError(null);

        const response = await fetch("/api/investments/holdings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(holding),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add holding");
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Optimistic update
          setHoldings((prev) => [...prev, result.data]);
          return true;
        }

        throw new Error(result.error || "Failed to add holding");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add holding";
        setError(errorMessage);
        // Add holding error - state updated
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [user],
  );

  const updateHolding = useCallback(
    async (id: string, updates: Partial<Holding>): Promise<boolean> => {
      if (!user) return false;

      // Store previous state for rollback
      const previousHoldings = [...holdings];

      try {
        setIsUpdating(true);
        setError(null);

        // Optimistic update
        setHoldings((prev) =>
          prev.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        );

        const response = await fetch(`/api/investments/holdings/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update holding");
        }

        const result = await response.json();

        if (result.success) {
          return true;
        }

        throw new Error(result.error || "Failed to update holding");
      } catch (err) {
        // Rollback on error
        setHoldings(previousHoldings);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update holding";
        setError(errorMessage);
        // Update holding error - rolled back
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, holdings],
  );

  const deleteHolding = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      // Store previous state for rollback
      const previousHoldings = [...holdings];

      try {
        setIsUpdating(true);
        setError(null);

        // Optimistic update
        setHoldings((prev) => prev.filter((h) => h.id !== id));

        const response = await fetch(`/api/investments/holdings/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete holding");
        }

        const result = await response.json();

        if (result.success) {
          return true;
        }

        throw new Error(result.error || "Failed to delete holding");
      } catch (err) {
        // Rollback on error
        setHoldings(previousHoldings);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete holding";
        setError(errorMessage);
        // Delete holding error - rolled back
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, holdings],
  );

  // Initial fetch
  useEffect(() => {
    if (!authLoading && enabled) {
      void fetchHoldings();
    }
  }, [authLoading, enabled, fetchHoldings]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0 || !user) {
      return;
    }

    intervalRef.current = setInterval(() => {
      void fetchHoldings();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, user, fetchHoldings]);

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
    holdings,
    loading,
    error,
    refresh,
    addHolding,
    updateHolding,
    deleteHolding,
    isUpdating,
  };
}
