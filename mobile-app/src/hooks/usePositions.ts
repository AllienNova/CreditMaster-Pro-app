/**
 * usePositions Hook
 *
 * React hook for mobile app to manage positions.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api/client";

// ============================================================================
// TYPES
// ============================================================================

export type PositionSide = "long" | "short";
export type PositionStatus = "open" | "closed" | "liquidated";

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  riskAmount?: number;
  riskPercent?: number;
  status: PositionStatus;
  openedAt: Date;
}

export interface PositionSummary {
  totalPositions: number;
  longPositions: number;
  shortPositions: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalRealizedPL: number;
  totalPL: number;
  dayPL: number;
  weekPL: number;
  monthPL: number;
  grossExposure: number;
  netExposure: number;
}

export interface PositionsState {
  positions: Position[];
  openPositions: Position[];
  summary: PositionSummary | null;
  isLoading: boolean;
  error: string | null;
}

export interface UsePositionsConfig {
  pollingIntervalMs?: number;
  autoRefresh?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePositions(config: UsePositionsConfig = {}) {
  const { pollingIntervalMs = 5000, autoRefresh = true } = config;

  const [state, setState] = useState<PositionsState>({
    positions: [],
    openPositions: [],
    summary: null,
    isLoading: true,
    error: null,
  });

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    try {
      const res = await api.get<{
        positions: Position[];
        openPositions: Position[];
        summary: PositionSummary | null;
      }>("/trading/positions");

      if (res.success) {
        setState((prev) => ({
          ...prev,
          positions: res.data?.positions || [],
          openPositions: res.data?.openPositions || [],
          summary: res.data?.summary || null,
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

  // Close position
  const closePosition = useCallback(
    async (
      positionId: string,
      closePrice?: number,
    ): Promise<{ success: boolean; realizedPL?: number; error?: string }> => {
      try {
        const res = await api.post<{ position: Position; realizedPL: number }>(
          "/trading/positions",
          {
            action: "close",
            positionId,
            closePrice,
            reason: "manual",
          },
        );

        if (res.success) {
          const { position, realizedPL } = res.data!;

          // Update local state
          setState((prev) => ({
            ...prev,
            openPositions: prev.openPositions.filter(
              (p) => p.id !== positionId,
            ),
            positions: prev.positions.map((p) =>
              p.id === positionId
                ? { ...p, ...position, status: "closed" as PositionStatus }
                : p,
            ),
          }));

          return { success: true, realizedPL };
        }

        return {
          success: false,
          error: res.message || "Failed to close position",
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

  // Close all positions
  const closeAllPositions = useCallback(async (): Promise<{
    success: boolean;
    closedCount: number;
    totalRealizedPL: number;
  }> => {
    try {
      const res = await api.post<{
        closedCount: number;
        totalRealizedPL: number;
      }>("/trading/positions", { action: "closeAll" });

      if (res.success) {
        setState((prev) => ({
          ...prev,
          openPositions: [],
          positions: prev.positions.map((p) => ({
            ...p,
            status: "closed" as PositionStatus,
          })),
        }));

        return {
          success: true,
          closedCount: res.data?.closedCount ?? 0,
          totalRealizedPL: res.data?.totalRealizedPL ?? 0,
        };
      }

      return { success: false, closedCount: 0, totalRealizedPL: 0 };
    } catch {
      return { success: false, closedCount: 0, totalRealizedPL: 0 };
    }
  }, []);

  // Update price for a position
  const updatePrice = useCallback((symbol: string, price: number) => {
    setState((prev) => ({
      ...prev,
      openPositions: prev.openPositions.map((p) => {
        if (p.symbol === symbol) {
          const priceDiff = price - p.avgEntryPrice;
          const unrealizedPL =
            p.side === "long"
              ? priceDiff * p.quantity
              : -priceDiff * p.quantity;
          const unrealizedPLPercent =
            p.costBasis > 0 ? unrealizedPL / p.costBasis : 0;

          return {
            ...p,
            currentPrice: price,
            marketValue: p.quantity * price,
            unrealizedPL,
            unrealizedPLPercent,
          };
        }
        return p;
      }),
    }));
  }, []);

  // Get position by symbol
  const getPositionBySymbol = useCallback(
    (symbol: string): Position | undefined => {
      return state.openPositions.find((p) => p.symbol === symbol);
    },
    [state.openPositions],
  );

  // Check if has position for symbol
  const hasPosition = useCallback(
    (symbol: string): boolean => {
      return state.openPositions.some((p) => p.symbol === symbol);
    },
    [state.openPositions],
  );

  // Calculate totals
  const totals = {
    unrealizedPL: state.openPositions.reduce(
      (sum, p) => sum + p.unrealizedPL,
      0,
    ),
    marketValue: state.openPositions.reduce((sum, p) => sum + p.marketValue, 0),
    positionCount: state.openPositions.length,
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchPositions();

    if (autoRefresh && pollingIntervalMs > 0) {
      const interval = setInterval(fetchPositions, pollingIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchPositions, autoRefresh, pollingIntervalMs]);

  return {
    ...state,
    ...totals,
    fetchPositions,
    closePosition,
    closeAllPositions,
    updatePrice,
    getPositionBySymbol,
    hasPosition,
  };
}

export default usePositions;
