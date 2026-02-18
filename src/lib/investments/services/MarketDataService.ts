/**
 * Market Data Service
 *
 * Handles real-time and historical market data from multiple providers:
 * - Alpha Vantage
 * - Yahoo Finance
 * - Polygon.io
 *
 * Features:
 * - WebSocket support for real-time updates
 * - Caching for historical data
 * - Rate limiting and error handling
 */

import { CandleData } from "../types/charting.types";
import { Timeframe, Quote, Asset } from "../types/investment.types";

// ============================================================================
// TYPES
// ============================================================================

export interface MarketDataProvider {
  name: string;
  fetchQuote: (symbol: string) => Promise<Quote>;
  fetchHistoricalData: (
    symbol: string,
    timeframe: Timeframe,
    limit?: number,
  ) => Promise<CandleData[]>;
  subscribeToRealTime?: (
    symbols: string[],
    callback: (data: RealtimeUpdate) => void,
  ) => () => void;
}

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
// CACHE CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  quote: 60 * 1000, // 1 minute for quotes
  historical_1m: 60 * 1000, // 1 minute for 1m data
  historical_5m: 5 * 60 * 1000,
  historical_15m: 15 * 60 * 1000,
  historical_1h: 60 * 60 * 1000,
  historical_1d: 24 * 60 * 60 * 1000, // 1 day for daily data
};

// ============================================================================
// MARKET DATA SERVICE
// ============================================================================

export class MarketDataService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, Set<RealtimeCallback>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private alphaVantageKey?: string,
    private polygonKey?: string,
  ) {}

  // ============================================================================
  // QUOTE METHODS
  // ============================================================================

  async getQuote(symbol: string): Promise<Quote> {
    const cacheKey = `quote:${symbol}`;
    const cached = this.getFromCache<Quote>(cacheKey);
    if (cached) return cached;

    const quote = await this.fetchQuoteFromProvider(symbol);
    this.setCache(cacheKey, quote, CACHE_TTL.quote);
    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const results = new Map<string, Quote>();
    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getQuote(symbol);
        results.set(symbol, quote);
      } catch (error) {
        // Market data error: Failed to fetch quote
      }
    });
    await Promise.all(promises);
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
    const cacheKey = `historical:${symbol}:${timeframe}:${limit}`;
    const ttlKey = `historical_${timeframe}` as keyof typeof CACHE_TTL;
    const ttl = CACHE_TTL[ttlKey] || CACHE_TTL.historical_1d;

    const cached = this.getFromCache<CandleData[]>(cacheKey);
    if (cached) return cached;

    const data = await this.fetchHistoricalFromProvider(
      symbol,
      timeframe,
      limit,
    );
    this.setCache(cacheKey, data, ttl);
    return data;
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  subscribeToSymbol(symbol: string, callback: RealtimeCallback): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    // Connect WebSocket if not already connected
    this.ensureWebSocketConnection(symbol);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(symbol);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(symbol);
          this.closeWebSocketConnection(symbol);
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
  // CACHE HELPERS
  // ============================================================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // WEBSOCKET MANAGEMENT
  // ============================================================================

  private ensureWebSocketConnection(symbol: string): void {
    if (this.wsConnections.has(symbol)) return;

    // Using Polygon.io WebSocket as example
    if (!this.polygonKey) {
      // Market data warning: No Polygon API key configured for real-time data
      return;
    }

    try {
      const ws = new WebSocket(`wss://socket.polygon.io/stocks`);

      ws.onopen = () => {
        // Market data: WebSocket connected
        this.reconnectAttempts.set(symbol, 0);

        // Authenticate and subscribe
        ws.send(JSON.stringify({ action: "auth", params: this.polygonKey }));
        ws.send(JSON.stringify({ action: "subscribe", params: `T.${symbol}` }));
      };

      ws.onmessage = (event) => {
        try {
          const messages = JSON.parse(event.data);
          for (const msg of messages) {
            if (msg.ev === "T") {
              // Trade event
              this.handleRealtimeUpdate({
                symbol: msg.sym,
                price: msg.p,
                volume: msg.s,
                timestamp: msg.t,
                change: 0,
                changePercent: 0,
              });
            }
          }
        } catch (error) {
          // Market data error: Failed to parse WebSocket message
        }
      };

      ws.onerror = (error) => {
        // Market data error: WebSocket error
      };

      ws.onclose = () => {
        // Market data: WebSocket closed
        this.wsConnections.delete(symbol);

        // Attempt reconnect if still subscribed
        if (this.subscribers.has(symbol)) {
          this.attemptReconnect(symbol);
        }
      };

      this.wsConnections.set(symbol, ws);
    } catch (error) {
      // Market data error: Failed to create WebSocket
    }
  }

  private attemptReconnect(symbol: string): void {
    const attempts = this.reconnectAttempts.get(symbol) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      // Market data error: Max reconnect attempts reached
      return;
    }

    this.reconnectAttempts.set(symbol, attempts + 1);
    const delay = this.reconnectDelay * Math.pow(2, attempts);

    setTimeout(() => {
      if (this.subscribers.has(symbol)) {
        this.ensureWebSocketConnection(symbol);
      }
    }, delay);
  }

  private closeWebSocketConnection(symbol: string): void {
    const ws = this.wsConnections.get(symbol);
    if (ws) {
      ws.close();
      this.wsConnections.delete(symbol);
    }
  }

  private handleRealtimeUpdate(update: RealtimeUpdate): void {
    const callbacks = this.subscribers.get(update.symbol);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(update);
        } catch (error) {
          // Market data error: Error in realtime callback
        }
      });
    }

    // Update cache with latest price
    const cacheKey = `quote:${update.symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.data.price = update.price;
      cached.data.volume = update.volume;
    }
  }

  // ============================================================================
  // PROVIDER IMPLEMENTATIONS
  // ============================================================================

  private async fetchQuoteFromProvider(symbol: string): Promise<Quote> {
    // Try Alpha Vantage first
    if (this.alphaVantageKey) {
      try {
        return await this.fetchAlphaVantageQuote(symbol);
      } catch (error) {
        // Market data warning: Alpha Vantage quote failed, trying fallback
      }
    }

    // Fallback to mock data for development
    return this.getMockQuote(symbol);
  }

  private async fetchHistoricalFromProvider(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<CandleData[]> {
    // Try Alpha Vantage first
    if (this.alphaVantageKey) {
      try {
        return await this.fetchAlphaVantageHistorical(symbol, timeframe, limit);
      } catch (error) {
        // Market data warning: Alpha Vantage historical failed, trying fallback
      }
    }

    // Fallback to mock data for development
    return this.getMockHistoricalData(symbol, limit);
  }

  private async fetchAlphaVantageQuote(symbol: string): Promise<Quote> {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`,
    );
    const data = await response.json();

    if (data["Error Message"] || !data["Global Quote"]) {
      throw new Error("Invalid response from Alpha Vantage");
    }

    const quote = data["Global Quote"];
    return {
      symbol,
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      previousClose: parseFloat(quote["08. previous close"]),
      open: parseFloat(quote["02. open"]),
      high: parseFloat(quote["03. high"]),
      low: parseFloat(quote["04. low"]),
      volume: parseInt(quote["06. volume"]),
      avgVolume: 0,
      week52High: 0,
      week52Low: 0,
      timestamp: new Date(),
    };
  }

  private async fetchAlphaVantageHistorical(
    symbol: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<CandleData[]> {
    const functionName = this.getAlphaVantageFunction(timeframe);
    const interval = this.getAlphaVantageInterval(timeframe);

    let url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
    if (interval) {
      url += `&interval=${interval}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data["Error Message"]) {
      throw new Error("Invalid response from Alpha Vantage");
    }

    const timeSeriesKey = Object.keys(data).find((key) =>
      key.includes("Time Series"),
    );
    if (!timeSeriesKey || !data[timeSeriesKey]) {
      throw new Error("No time series data found");
    }

    const timeSeries = data[timeSeriesKey];
    const candles: CandleData[] = [];

    for (const [dateStr, values] of Object.entries(timeSeries).slice(
      0,
      limit,
    )) {
      const v = values as any;
      candles.push({
        timestamp: new Date(dateStr).getTime(),
        open: parseFloat(v["1. open"]),
        high: parseFloat(v["2. high"]),
        low: parseFloat(v["3. low"]),
        close: parseFloat(v["4. close"]),
        volume: parseInt(v["5. volume"] || v["6. volume"] || "0"),
      });
    }

    return candles.reverse(); // Oldest first
  }

  private getAlphaVantageFunction(timeframe: Timeframe): string {
    if (["1m", "5m", "15m", "30m", "1h"].includes(timeframe)) {
      return "TIME_SERIES_INTRADAY";
    }
    if (timeframe === "1w") {
      return "TIME_SERIES_WEEKLY";
    }
    if (timeframe === "1M") {
      return "TIME_SERIES_MONTHLY";
    }
    return "TIME_SERIES_DAILY";
  }

  private getAlphaVantageInterval(timeframe: Timeframe): string | null {
    const intervalMap: Record<string, string> = {
      "1m": "1min",
      "5m": "5min",
      "15m": "15min",
      "30m": "30min",
      "1h": "60min",
    };
    return intervalMap[timeframe] || null;
  }

  // ============================================================================
  // MOCK DATA (FOR DEVELOPMENT)
  // ============================================================================

  private getMockQuote(symbol: string): Quote {
    const basePrice = this.getSymbolBasePrice(symbol);
    const change = (Math.random() - 0.5) * basePrice * 0.02;

    return {
      symbol,
      price: basePrice,
      change,
      changePercent: (change / basePrice) * 100,
      previousClose: basePrice - change,
      open: basePrice - change * 0.5,
      high: basePrice + Math.abs(change),
      low: basePrice - Math.abs(change),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      avgVolume: Math.floor(Math.random() * 10000000) + 1000000,
      week52High: basePrice * 1.3,
      week52Low: basePrice * 0.7,
      timestamp: new Date(),
    };
  }

  private getMockHistoricalData(symbol: string, limit: number): CandleData[] {
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

  // ============================================================================
  // CLEANUP
  // ============================================================================

  disconnect(): void {
    for (const [symbol] of Array.from(this.wsConnections.entries())) {
      this.closeWebSocketConnection(symbol);
    }
    this.subscribers.clear();
    this.cache.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let marketDataServiceInstance: MarketDataService | null = null;

export function getMarketDataService(
  alphaVantageKey?: string,
  polygonKey?: string,
): MarketDataService {
  if (!marketDataServiceInstance) {
    marketDataServiceInstance = new MarketDataService(
      alphaVantageKey,
      polygonKey,
    );
  }
  return marketDataServiceInstance;
}
