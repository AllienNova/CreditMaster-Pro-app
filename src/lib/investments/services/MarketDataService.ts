/**
 * Market Data Service
 *
 * Wraps UnifiedMarketDataService (Alpha Vantage → Polygon fallback).
 *
 * Honesty contract (DEFAB-1 / ADR-0005): this service returns REAL market data
 * or it fails. It previously fabricated `Math.random()` OHLC candles from a
 * hardcoded per-symbol base price whenever the provider erred or returned too
 * few bars, and served them to charts as genuine market history. That fallback
 * is DELETED — provider errors now propagate so callers render an honest error
 * state, and an empty result stays empty. Never reintroduce synthetic bars.
 */

import { CandleData } from "../types/charting.types";
import { Timeframe, Quote } from "../types/investment.types";
import {
  UnifiedMarketDataService,
  type MarketDataConfig,
} from "../market-data-service";
import { AssetType, TimeInterval } from "../types/market-data.types";

// ============================================================================
// TYPES
// ============================================================================

export interface RealtimeUpdate {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

type RealtimeCallback = (data: RealtimeUpdate) => void;

// ============================================================================
// TIMEFRAME MAPPING
// ============================================================================

function timeframeToInterval(timeframe: Timeframe): TimeInterval {
  const map: Partial<Record<Timeframe, TimeInterval>> = {
    "1m": TimeInterval.ONE_MIN,
    "5m": TimeInterval.FIVE_MIN,
    "15m": TimeInterval.FIFTEEN_MIN,
    "30m": TimeInterval.THIRTY_MIN,
    "1h": TimeInterval.ONE_HOUR,
    "1d": TimeInterval.ONE_DAY,
    "1w": TimeInterval.ONE_WEEK,
    "1M": TimeInterval.ONE_MONTH,
  };
  return map[timeframe] ?? TimeInterval.ONE_DAY;
}

// ============================================================================
// MARKET DATA SERVICE
// ============================================================================

export class MarketDataService {
  private readonly unified: UnifiedMarketDataService;
  private subscribers: Map<string, Set<RealtimeCallback>> = new Map();
  private unsubscribeFns: Map<string, () => void> = new Map();

  constructor(alphaVantageKey?: string, polygonKey?: string) {
    const config: MarketDataConfig = { alphaVantageKey, polygonKey };
    this.unified = new UnifiedMarketDataService(config);
  }

  // ============================================================================
  // QUOTE METHODS
  // ============================================================================

  async getQuote(symbol: string): Promise<Quote> {
    const liveQuote = await this.unified.getQuote(symbol, AssetType.STOCK);
    const q = liveQuote as import("../types/market-data.types").StockQuote;
    return {
      symbol: q.symbol,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      previousClose: q.previousClose,
      open: q.open,
      high: q.high,
      low: q.low,
      volume: q.volume,
      avgVolume: q.avgVolume,
      marketCap: q.marketCap,
      peRatio: q.peRatio,
      week52High: q.week52High,
      week52Low: q.week52Low,
      timestamp: q.timestamp instanceof Date ? q.timestamp : new Date(q.timestamp),
    };
  }

  async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const results = new Map<string, Quote>();
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await this.getQuote(symbol);
          results.set(symbol, quote);
        } catch {
          // Skip symbols that fail — callers handle missing entries
        }
      }),
    );
    return results;
  }

  // ============================================================================
  // HISTORICAL DATA METHODS
  // ============================================================================

  async getHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    limit: number = 500,
  ): Promise<CandleData[]> {
    // No fabricated fallback (DEFAB-1): a provider failure PROPAGATES so the
    // caller can render an honest error state, and an empty result stays empty.
    // Synthetic Math.random() candles used to be returned here as if they were
    // real market data — that fabrication is deleted, not degraded.
    const interval = timeframeToInterval(timeframe);
    const history = await this.unified.getHistory(
      symbol,
      AssetType.STOCK,
      interval,
      limit,
    );

    return history.data
      .slice(0, limit)
      .map((bar) => ({
        timestamp:
          bar.timestamp instanceof Date
            ? bar.timestamp.getTime()
            : new Date(bar.timestamp).getTime(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  subscribeToSymbol(symbol: string, callback: RealtimeCallback): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    const callbacks = this.subscribers.get(symbol)!;
    callbacks.add(callback);

    if (!this.unsubscribeFns.has(symbol)) {
      const unsubscribe = this.unified.subscribeToRealTime([symbol], (data) => {
        const subs = this.subscribers.get(data.symbol);
        if (subs) {
          subs.forEach((cb) => {
            try {
              cb(data);
            } catch {
              // Ignore callback errors
            }
          });
        }
      });
      this.unsubscribeFns.set(symbol, unsubscribe);
    }

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(symbol);
        const unsub = this.unsubscribeFns.get(symbol);
        if (unsub) {
          unsub();
          this.unsubscribeFns.delete(symbol);
        }
      }
    };
  }

  subscribeToSymbols(
    symbols: string[],
    callback: RealtimeCallback,
  ): () => void {
    const unsubscribers = symbols.map((symbol) =>
      this.subscribeToSymbol(symbol, callback),
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  disconnect(): void {
    this.unsubscribeFns.forEach((unsub) => unsub());
    this.unsubscribeFns.clear();
    this.subscribers.clear();
  }

}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let marketDataServiceInstance: MarketDataService | null = null;

export function getMarketDataService(): MarketDataService {
  if (!marketDataServiceInstance) {
    marketDataServiceInstance = new MarketDataService();
  }
  return marketDataServiceInstance;
}
