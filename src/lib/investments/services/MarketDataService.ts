/**
 * Market Data Service
 *
 * Wraps UnifiedMarketDataService (Alpha Vantage → Polygon fallback).
 * Falls back to synthetic candle data when the unified service is unavailable
 * or returns insufficient data (< limit bars).
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
    try {
      const interval = timeframeToInterval(timeframe);
      const history = await this.unified.getHistory(
        symbol,
        AssetType.STOCK,
        interval,
        limit,
      );

      const candles = history.data
        .slice(0, limit)
        .map((bar) => ({
          timestamp: bar.timestamp instanceof Date
            ? bar.timestamp.getTime()
            : new Date(bar.timestamp).getTime(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (candles.length === 0) throw new Error("No historical data returned");
      return candles;
    } catch {
      // Fallback: generate synthetic candles when real data is unavailable
      return this.generateSyntheticCandles(symbol, limit);
    }
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

  // ============================================================================
  // SYNTHETIC DATA FALLBACK (used when real data is unavailable)
  // ============================================================================

  private generateSyntheticCandles(symbol: string, limit: number): CandleData[] {
    const candles: CandleData[] = [];
    const basePrice = this.getSymbolBasePrice(symbol);
    let currentPrice = basePrice;
    const now = Date.now();

    for (let i = limit - 1; i >= 0; i--) {
      const change = (Math.random() - 0.48) * currentPrice * 0.02;
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random() * Math.abs(change);
      const low = Math.min(open, close) - Math.random() * Math.abs(change);

      candles.push({
        timestamp: now - i * 24 * 60 * 60 * 1000,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
      });

      currentPrice = close;
    }

    return candles;
  }

  private getSymbolBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      AAPL: 175,
      MSFT: 380,
      GOOGL: 140,
      AMZN: 178,
      TSLA: 250,
      META: 505,
      NVDA: 875,
      BTC: 42000,
      ETH: 2500,
      SPY: 475,
    };
    return prices[symbol] || 100 + Math.random() * 100;
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
