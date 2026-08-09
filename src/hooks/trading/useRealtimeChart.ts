"use client";

/**
 * useRealtimeChart
 *
 * Streams simulated price ticks into a lightweight-charts candlestick series.
 * Ticks are throttled to 4 per second (250 ms) via requestAnimationFrame.
 * Each tick is aggregated into the currently-forming OHLCV candle; when the
 * interval boundary passes the candle is closed and a new one begins.
 *
 * Real WebSocket feeds require broker API keys and are skipped here; the
 * simulation mode exercises the same code paths used in production.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { ISeriesApi } from "lightweight-charts";

// ============================================================================
// TYPES
// ============================================================================

export interface UseRealtimeChartOptions {
  symbol: string;
  series: ISeriesApi<"Candlestick"> | null;
  /** Interval string — e.g. "1m", "5m", "1h". Controls candle duration. */
  interval: string;
  enabled?: boolean;
}

export interface UseRealtimeChartReturn {
  isStreaming: boolean;
  lastPrice: number | null;
  error: string | null;
}

interface FormingCandle {
  time: number;   // unix seconds, start of interval
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Returns interval duration in seconds from a string like "1m", "5m", "1h". */
function intervalToSeconds(interval: string): number {
  const match = /^(\d+)([mhdw])$/.exec(interval);
  if (!match) return 60;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case "m": return n * 60;
    case "h": return n * 3600;
    case "d": return n * 86400;
    case "w": return n * 604800;
    default:  return 60;
  }
}

/** Generates a simulated next tick price using a random walk. */
function nextTick(lastPrice: number): number {
  const bps = (Math.random() - 0.49) * 0.002;   // slight upward drift
  return Math.max(0.01, lastPrice * (1 + bps));
}

/** Simulated starting prices by symbol prefix. */
function seedPrice(symbol: string): number {
  if (symbol.startsWith("BTC")) return 65_000;
  if (symbol.startsWith("ETH")) return 3_500;
  if (symbol.startsWith("SPY")) return 530;
  return 100 + Math.random() * 200;
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimeChart({
  symbol,
  series,
  interval,
  enabled = true,
}: UseRealtimeChartOptions): UseRealtimeChartReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candleRef = useRef<FormingCandle | null>(null);
  const priceRef = useRef<number>(seedPrice(symbol));
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<FormingCandle | null>(null);
  const intervalSeconds = intervalToSeconds(interval);

  const flushToSeries = useCallback(() => {
    rafRef.current = null;
    const candle = pendingUpdateRef.current;
    if (!candle || !series) return;

    series.update({
      time: candle.time as unknown as Parameters<typeof series.update>[0]["time"],
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }, [series]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushToSeries);
  }, [flushToSeries]);

  const processTick = useCallback(
    (price: number) => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const candleStart = nowSeconds - (nowSeconds % intervalSeconds);

      const current = candleRef.current;

      if (!current || current.time !== candleStart) {
        // Start a new candle
        candleRef.current = {
          time: candleStart,
          open: current ? current.close : price,
          high: price,
          low: price,
          close: price,
          volume: 1,
        };
      } else {
        // Update existing forming candle
        current.close = price;
        if (price > current.high) current.high = price;
        if (price < current.low) current.low = price;
        current.volume += 1;
      }

      pendingUpdateRef.current = candleRef.current;
      scheduleFlush();
      setLastPrice(price);
    },
    [intervalSeconds, scheduleFlush],
  );

  useEffect(() => {
    if (!enabled || !series) {
      setIsStreaming(false);
      return;
    }

    // Reset state for the new symbol/interval
    priceRef.current = seedPrice(symbol);
    candleRef.current = null;
    setError(null);
    setIsStreaming(true);

    // Simulate ticks at 250 ms (4/sec) — throttled through rAF in scheduleFlush
    intervalIdRef.current = setInterval(() => {
      priceRef.current = nextTick(priceRef.current);
      processTick(priceRef.current);
    }, 250);

    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsStreaming(false);
    };
  }, [symbol, series, interval, enabled, processTick]);

  return { isStreaming, lastPrice, error };
}

export default useRealtimeChart;
