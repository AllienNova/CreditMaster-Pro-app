/**
 * React Hook for Instrument Selection Engine (ISE)
 * 
 * Provides access to rankings, active set, and rotation state
 * with polling-based updates for mobile.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type AssetClass = 'stocks' | 'crypto' | 'forex' | 'futures' | 'options';
export type UserTier = 'beginner' | 'pro' | 'quant';
export type RegimeType = 'trend_up' | 'trend_down' | 'range' | 'transition';

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
  eventType: 'enter' | 'exit' | 'promote' | 'demote';
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
  apiBaseUrl: '/api/trading/ise',
  initialTier: 'pro',
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
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Fetch rankings and state
  const fetchISEState = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Fetch rankings
      const rankingsRes = await fetch(
        `${opts.apiBaseUrl}?action=rankings&limit=50`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!rankingsRes.ok) {
        throw new Error(`Rankings fetch failed: ${rankingsRes.status}`);
      }
      
      const rankingsData = await rankingsRes.json();
      
      // Fetch active set
      const activeRes = await fetch(
        `${opts.apiBaseUrl}?action=active`,
        { signal: abortControllerRef.current.signal }
      );
      
      const activeData = activeRes.ok ? await activeRes.json() : { activeSymbols: [] };
      
      // Fetch events
      const eventsRes = await fetch(
        `${opts.apiBaseUrl}?action=events&limit=10`,
        { signal: abortControllerRef.current.signal }
      );
      
      const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
      
      // Merge active status into rankings
      const activeSet = new Set(activeData.activeSymbols || []);
      const rankings = (rankingsData.rankings || []).map((r: RankedInstrument) => ({
        ...r,
        isActive: activeSet.has(r.symbol),
      }));
      
      setState({
        rankings,
        activeSymbols: activeData.activeSymbols || [],
        recentEvents: eventsData.events || [],
        lastUpdate: new Date(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      
      setState(prev => ({
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [opts.enabled, config.pollingIntervalMs, fetchISEState]);
  
  // Actions
  const setTier = useCallback((tier: UserTier) => {
    setConfig(prev => ({ ...prev, tier }));
  }, []);
  
  const setMaxActiveSize = useCallback(async (size: number) => {
    setConfig(prev => ({ ...prev, maxActiveSize: size }));
    
    try {
      await fetch(opts.apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateConfig', maxActiveSize: size }),
      });
    } catch (error) {
      console.error('Failed to update max active size:', error);
    }
  }, [opts.apiBaseUrl]);
  
  const setAutoRotate = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, autoRotateEnabled: enabled }));
  }, []);
  
  const forceAddSymbol = useCallback(async (symbol: string): Promise<boolean> => {
    try {
      const res = await fetch(opts.apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forceAdd', symbol }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          activeSymbols: data.activeSymbols,
          rankings: prev.rankings.map(r => ({
            ...r,
            isActive: data.activeSymbols.includes(r.symbol),
          })),
        }));
      }
      
      return data.success;
    } catch (error) {
      console.error('Force add failed:', error);
      return false;
    }
  }, [opts.apiBaseUrl]);
  
  const forceRemoveSymbol = useCallback(async (symbol: string): Promise<boolean> => {
    try {
      const res = await fetch(opts.apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forceRemove', symbol }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          activeSymbols: data.activeSymbols,
          rankings: prev.rankings.map(r => ({
            ...r,
            isActive: data.activeSymbols.includes(r.symbol),
          })),
        }));
      }
      
      return data.success;
    } catch (error) {
      console.error('Force remove failed:', error);
      return false;
    }
  }, [opts.apiBaseUrl]);
  
  const canTrade = useCallback(async (symbol: string): Promise<{ allowed: boolean; reason: string }> => {
    try {
      const res = await fetch(`${opts.apiBaseUrl}?action=canTrade&symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      return { allowed: data.allowed, reason: data.reason };
    } catch (error) {
      return { allowed: false, reason: 'Failed to check trade permission' };
    }
  }, [opts.apiBaseUrl]);
  
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
