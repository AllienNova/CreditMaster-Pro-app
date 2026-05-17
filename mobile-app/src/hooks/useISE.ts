/**
 * React Hook for Instrument Selection Engine (ISE)
 *
 * Provides access to rankings, active set, and rotation state
 * with polling-based updates for mobile.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api/client";

// ============================================================================
// TYPES
// ============================================================================

export type AssetClass = "stocks" | "crypto" | "forex" | "futures" | "options";
export type UserTier = "beginner" | "pro" | "quant";
export type RegimeType = "trend_up" | "trend_down" | "range" | "transition";

export interface RankedInstrument {
  rank: number;
  symbol: string;
  assetClass: AssetClass;
  score: number;
  scoreBreakdown: {
    liquidity: number;
    pcttFitness: number;
    opportunity: number;
    realizedEdge: number;
    userFit: number;
  };
  regime: RegimeType;
  event: string;
  isPCTTReady: boolean;
  isActive: boolean;
  inCooldown: boolean;
}

export interface RotationEvent {
  id: string;
  symbol: string;
  eventType: "enter" | "exit" | "promote" | "demote";
  reason: string;
  timestamp: Date;
}

export interface ISEState {
  rankings: RankedInstrument[];
  activeSymbols: string[];
  recentEvents: RotationEvent[];
  lastUpdate: Date | null;
  isLoading: boolean;
  error: string | null;
}

export interface ISEConfig {
  tier: UserTier;
  maxActiveSize: number;
  autoRotateEnabled: boolean;
  pollingIntervalMs: number;
}

export interface UseISEOptions {
  apiBaseUrl?: string;
  initialTier?: UserTier;
  initialMaxActiveSize?: number;
  autoRotate?: boolean;
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export interface UseISEReturn {
  state: ISEState;
  config: ISEConfig;

  // Actions
  setTier: (tier: UserTier) => void;
  setMaxActiveSize: (size: number) => void;
  setAutoRotate: (enabled: boolean) => void;
  forceAddSymbol: (symbol: string) => Promise<boolean>;
  forceRemoveSymbol: (symbol: string) => Promise<boolean>;
  canTrade: (symbol: string) => Promise<{ allowed: boolean; reason: string }>;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

const DEFAULT_OPTIONS: Required<UseISEOptions> = {
  apiBaseUrl: "/trading/ise",
  initialTier: "pro",
  initialMaxActiveSize: 5,
  autoRotate: true,
  pollingIntervalMs: 30000, // 30 seconds
  enabled: true,
};

export function useISE(options: UseISEOptions = {}): UseISEReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [state, setState] = useState<ISEState>({
    rankings: [],
    activeSymbols: [],
    recentEvents: [],
    lastUpdate: null,
    isLoading: false,
    error: null,
  });

  const [config, setConfig] = useState<ISEConfig>({
    tier: opts.initialTier,
    maxActiveSize: opts.initialMaxActiveSize,
    autoRotateEnabled: opts.autoRotate,
    pollingIntervalMs: opts.pollingIntervalMs,
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch rankings and state
  const fetchISEState = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch rankings
      const rankingsRes = await api.get<{ rankings: RankedInstrument[] }>(
        `${opts.apiBaseUrl}?action=rankings&limit=50`,
      );

      if (!rankingsRes.success) {
        throw new Error("Rankings fetch failed");
      }

      // Fetch active set
      const activeRes = await api.get<{ activeSymbols: string[] }>(
        `${opts.apiBaseUrl}?action=active`,
      );

      const activeSymbols = activeRes.success
        ? (activeRes.data?.activeSymbols ?? [])
        : [];

      // Fetch events
      const eventsRes = await api.get<{ events: RotationEvent[] }>(
        `${opts.apiBaseUrl}?action=events&limit=10`,
      );

      const events = eventsRes.success ? (eventsRes.data?.events ?? []) : [];

      // Merge active status into rankings
      const activeSet = new Set(activeSymbols);
      const rankings = (rankingsRes.data?.rankings || []).map(
        (r: RankedInstrument) => ({
          ...r,
          isActive: activeSet.has(r.symbol),
        }),
      );

      setState({
        rankings,
        activeSymbols,
        recentEvents: events,
        lastUpdate: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    }
  }, [opts.apiBaseUrl]);

  // Start/stop polling
  useEffect(() => {
    if (!opts.enabled) return;

    // Initial fetch
    fetchISEState();

    // Start polling
    if (config.pollingIntervalMs > 0) {
      pollingRef.current = setInterval(fetchISEState, config.pollingIntervalMs);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [opts.enabled, config.pollingIntervalMs, fetchISEState]);

  // Actions
  const setTier = useCallback((tier: UserTier) => {
    setConfig((prev) => ({ ...prev, tier }));
  }, []);

  const setMaxActiveSize = useCallback(
    async (size: number) => {
      setConfig((prev) => ({ ...prev, maxActiveSize: size }));

      try {
        await api.post(opts.apiBaseUrl, {
          action: "updateConfig",
          maxActiveSize: size,
        });
      } catch (error) {
        console.error("Failed to update max active size:", error);
      }
    },
    [opts.apiBaseUrl],
  );

  const setAutoRotate = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, autoRotateEnabled: enabled }));
  }, []);

  const forceAddSymbol = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        const res = await api.post<{ activeSymbols: string[] }>(
          opts.apiBaseUrl,
          { action: "forceAdd", symbol },
        );

        if (res.success) {
          setState((prev) => ({
            ...prev,
            activeSymbols: res.data?.activeSymbols ?? prev.activeSymbols,
            rankings: prev.rankings.map((r) => ({
              ...r,
              isActive: (res.data?.activeSymbols ?? []).includes(r.symbol),
            })),
          }));
        }

        return res.success;
      } catch (error) {
        console.error("Force add failed:", error);
        return false;
      }
    },
    [opts.apiBaseUrl],
  );

  const forceRemoveSymbol = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        const res = await api.post<{ activeSymbols: string[] }>(
          opts.apiBaseUrl,
          { action: "forceRemove", symbol },
        );

        if (res.success) {
          setState((prev) => ({
            ...prev,
            activeSymbols: res.data?.activeSymbols ?? prev.activeSymbols,
            rankings: prev.rankings.map((r) => ({
              ...r,
              isActive: (res.data?.activeSymbols ?? []).includes(r.symbol),
            })),
          }));
        }

        return res.success;
      } catch (error) {
        console.error("Force remove failed:", error);
        return false;
      }
    },
    [opts.apiBaseUrl],
  );

  const canTrade = useCallback(
    async (symbol: string): Promise<{ allowed: boolean; reason: string }> => {
      try {
        const res = await api.get<{ allowed: boolean; reason: string }>(
          `${opts.apiBaseUrl}?action=canTrade&symbol=${encodeURIComponent(symbol)}`,
        );
        return {
          allowed: res.data?.allowed ?? false,
          reason: res.data?.reason ?? "Failed to check trade permission",
        };
      } catch (error) {
        return { allowed: false, reason: "Failed to check trade permission" };
      }
    },
    [opts.apiBaseUrl],
  );

  const refresh = useCallback(async () => {
    await fetchISEState();
  }, [fetchISEState]);

  return {
    state,
    config,
    setTier,
    setMaxActiveSize,
    setAutoRotate,
    forceAddSymbol,
    forceRemoveSymbol,
    canTrade,
    refresh,
  };
}

export default useISE;
