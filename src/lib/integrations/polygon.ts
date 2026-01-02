/**
 * Polygon.io API Integration
 *
 * Premium market data API client with REST and WebSocket support
 * Features:
 * - Real-time quotes via WebSocket
 * - Historical aggregates (OHLCV data)
 * - Market news
 * - Ticker search
 * - Rate limiting based on subscription tier
 * - Automatic WebSocket reconnection
 */

import {
  StockQuote,
  StockHistory,
  OHLCVData,
  MarketNews,
  TimeInterval,
  MarketStatus,
  MarketDataAPIError,
  SentimentScore,
} from '../investments/types/market-data.types';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface WebSocketMessage {
  ev: string; // Event type
  sym: string; // Symbol
  p?: number; // Price
  s?: number; // Size
  t?: number; // Timestamp
  v?: number; // Volume
}

interface TickerSearchResult {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
}

type RealtimeCallback = (data: {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}) => void;

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  quote: 30 * 1000, // 30 seconds
  aggregates: 60 * 60 * 1000, // 1 hour
  news: 5 * 60 * 1000, // 5 minutes
  tickers: 60 * 60 * 1000, // 1 hour
};

const RATE_LIMIT = {
  free: { maxRequests: 5, windowMs: 60 * 1000 },
  starter: { maxRequests: 100, windowMs: 60 * 1000 },
  developer: { maxRequests: 1000, windowMs: 60 * 1000 },
  advanced: { maxRequests: 10000, windowMs: 60 * 1000 },
};

const WEBSOCKET_CONFIG = {
  url: 'wss://socket.polygon.io',
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoff: 1.5,
  maxReconnectAttempts: 10,
};

// ============================================================================
// POLYGON CLIENT
// ============================================================================

export class PolygonClient {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ws: WebSocket | null = null;
  private wsSubscriptions: Map<string, Set<RealtimeCallback>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private tier: 'free' | 'starter' | 'developer' | 'advanced' = 'free';

  constructor(apiKey?: string, tier?: 'free' | 'starter' | 'developer' | 'advanced') {
    this.apiKey = apiKey || process.env.POLYGON_API_KEY || '';
    this.tier = tier || 'free';
    if (!this.apiKey) {
      console.warn('Polygon.io API key not configured');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - REST API
  // ============================================================================

  /**
   * Get real-time stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote:${symbol}`;
    const cached = this.getFromCache<StockQuote>(cacheKey);
    if (cached) return cached;

    const endpoint = `/v2/aggs/ticker/${symbol}/prev`;
    const data = await this.makeRequest(endpoint);

    if (!data.results || data.results.length === 0) {
      throw new MarketDataAPIError(
        `No quote data found for symbol: ${symbol}`,
        'NO_DATA',
        'Polygon',
        false
      );
    }

    const quote = this.parseQuote(symbol, data.results[0]);
    this.setCache(cacheKey, quote, CACHE_TTL.quote);
    return quote;
  }

  /**
   * Get historical aggregates (OHLCV data)
   */
  async getAggregates(
    symbol: string,
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month',
    from: string,
    to: string,
    limit: number = 5000
  ): Promise<StockHistory> {
    const cacheKey = `aggregates:${symbol}:${timespan}:${from}:${to}`;
    const cached = this.getFromCache<StockHistory>(cacheKey);
    if (cached) return cached;

    const endpoint = `/v2/aggs/ticker/${symbol}/range/1/${timespan}/${from}/${to}`;
    const data = await this.makeRequest(endpoint, { limit: limit.toString() });

    if (!data.results || data.results.length === 0) {
      throw new MarketDataAPIError(
        `No aggregate data found for symbol: ${symbol}`,
        'NO_DATA',
        'Polygon',
        false
      );
    }

    const history = this.parseAggregates(symbol, timespan, data.results);
    this.setCache(cacheKey, history, CACHE_TTL.aggregates);
    return history;
  }

  /**
   * Get market news
   */
  async getNews(symbol?: string, limit: number = 10): Promise<MarketNews[]> {
    const cacheKey = `news:${symbol || 'all'}:${limit}`;
    const cached = this.getFromCache<MarketNews[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string> = {
      limit: limit.toString(),
      order: 'desc',
    };

    if (symbol) {
      params.ticker = symbol;
    }

    const endpoint = '/v2/reference/news';
    const data = await this.makeRequest(endpoint, params);

    if (!data.results || data.results.length === 0) {
      return [];
    }

    const news = data.results.map((item: any) => this.parseNews(item));
    this.setCache(cacheKey, news, CACHE_TTL.news);
    return news;
  }

  /**
   * Search for tickers
   */
  async getTickers(query: string, type?: string): Promise<TickerSearchResult[]> {
    const cacheKey = `tickers:${query}:${type || 'all'}`;
    const cached = this.getFromCache<TickerSearchResult[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string> = {
      search: query,
      active: 'true',
      limit: '10',
    };

    if (type) {
      params.type = type;
    }

    const endpoint = '/v3/reference/tickers';
    const data = await this.makeRequest(endpoint, params);

    if (!data.results || data.results.length === 0) {
      return [];
    }

    this.setCache(cacheKey, data.results, CACHE_TTL.tickers);
    return data.results;
  }

  // ============================================================================
  // PUBLIC METHODS - WEBSOCKET
  // ============================================================================

  /**
   * Subscribe to real-time quotes via WebSocket
   */
  subscribeToQuotes(symbols: string[], callback: RealtimeCallback): () => void {
    // Ensure WebSocket is connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
    }

    // Add subscriptions
    symbols.forEach((symbol) => {
      if (!this.wsSubscriptions.has(symbol)) {
        this.wsSubscriptions.set(symbol, new Set());
      }
      this.wsSubscriptions.get(symbol)!.add(callback);

      // Send subscription message
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'subscribe', params: `T.${symbol}` }));
      }
    });

    // Return unsubscribe function
    return () => {
      symbols.forEach((symbol) => {
        const callbacks = this.wsSubscriptions.get(symbol);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            this.wsSubscriptions.delete(symbol);
            // Send unsubscribe message
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ action: 'unsubscribe', params: `T.${symbol}` }));
            }
          }
        }
      });
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.wsSubscriptions.clear();
    this.reconnectAttempts = 0;
  }

  // ============================================================================
  // PRIVATE METHODS - REST API
  // ============================================================================

  private async makeRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('apiKey', this.apiKey);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 429) {
          throw new MarketDataAPIError(
            'API rate limit exceeded',
            'RATE_LIMIT',
            'Polygon',
            true
          );
        }
        throw new MarketDataAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          'Polygon',
          response.status >= 500
        );
      }

      const data = await response.json();

      if (data.status === 'ERROR') {
        throw new MarketDataAPIError(
          data.error || 'Unknown API error',
          'API_ERROR',
          'Polygon',
          false
        );
      }

      return data;
    } catch (error) {
      if (error instanceof MarketDataAPIError) {
        throw error;
      }
      throw new MarketDataAPIError(
        `Request failed: ${(error as Error).message}`,
        'NETWORK_ERROR',
        'Polygon',
        true
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS - WEBSOCKET
  // ============================================================================

  private connectWebSocket(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(`${WEBSOCKET_CONFIG.url}/stocks`);

      this.ws.onopen = () => {
        console.log('Polygon WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Authenticate
        this.ws!.send(JSON.stringify({ action: 'auth', params: this.apiKey }));

        // Resubscribe to all symbols
        this.wsSubscriptions.forEach((_, symbol) => {
          this.ws!.send(JSON.stringify({ action: 'subscribe', params: `T.${symbol}` }));
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const messages = JSON.parse(event.data);
          if (Array.isArray(messages)) {
            messages.forEach((msg) => this.handleWebSocketMessage(msg));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Polygon WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Polygon WebSocket closed');
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleWebSocketMessage(msg: WebSocketMessage): void {
    if (msg.ev === 'T' && msg.sym && msg.p) {
      // Trade message
      const callbacks = this.wsSubscriptions.get(msg.sym);
      if (callbacks) {
        const update = {
          symbol: msg.sym,
          price: msg.p,
          volume: msg.s || 0,
          timestamp: msg.t || Date.now(),
        };
        callbacks.forEach((callback) => callback(update));
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      WEBSOCKET_CONFIG.reconnectDelay * Math.pow(WEBSOCKET_CONFIG.reconnectBackoff, this.reconnectAttempts),
      WEBSOCKET_CONFIG.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(`Reconnecting WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  // ============================================================================
  // PRIVATE METHODS - DATA PARSING
  // ============================================================================

  private parseQuote(symbol: string, data: any): StockQuote {
    return {
      symbol,
      price: data.c,
      change: data.c - data.o,
      changePercent: ((data.c - data.o) / data.o) * 100,
      volume: data.v,
      avgVolume: data.v, // Polygon doesn't provide avg volume in this endpoint
      open: data.o,
      high: data.h,
      low: data.l,
      previousClose: data.c,
      week52High: data.h,
      week52Low: data.l,
      timestamp: new Date(data.t),
      marketStatus: this.getMarketStatus(),
    };
  }

  private parseAggregates(symbol: string, timespan: string, results: any[]): StockHistory {
    const ohlcvData: OHLCVData[] = results.map((item) => ({
      timestamp: new Date(item.t),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
      vwap: item.vw,
    }));

    // Sort by timestamp (newest first)
    ohlcvData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const interval = this.timespanToInterval(timespan);

    return {
      symbol,
      interval,
      data: ohlcvData,
      startDate: ohlcvData[ohlcvData.length - 1]?.timestamp || new Date(),
      endDate: ohlcvData[0]?.timestamp || new Date(),
    };
  }

  private parseNews(item: any): MarketNews {
    return {
      id: item.id || item.article_url,
      headline: item.title,
      summary: item.description || '',
      source: item.publisher?.name || 'Unknown',
      url: item.article_url,
      imageUrl: item.image_url,
      publishedAt: new Date(item.published_utc),
      symbols: item.tickers || [],
      sentiment: this.parseSentiment(item.insights),
    };
  }

  private parseSentiment(insights?: any[]): SentimentScore | undefined {
    if (!insights || insights.length === 0) return undefined;

    const sentiment = insights.find((i) => i.sentiment);
    if (!sentiment) return undefined;

    const score = sentiment.sentiment_reasoning?.toLowerCase() || '';
    if (score.includes('bullish')) return SentimentScore.BULLISH;
    if (score.includes('bearish')) return SentimentScore.BEARISH;
    return SentimentScore.NEUTRAL;
  }

  private timespanToInterval(timespan: string): TimeInterval {
    const map: Record<string, TimeInterval> = {
      minute: TimeInterval.ONE_MIN,
      hour: TimeInterval.ONE_HOUR,
      day: TimeInterval.ONE_DAY,
      week: TimeInterval.ONE_WEEK,
      month: TimeInterval.ONE_MONTH,
    };
    return map[timespan] || TimeInterval.ONE_DAY;
  }

  private getMarketStatus(): MarketStatus {
    const now = new Date();
    const hours = now.getUTCHours();
    const day = now.getUTCDay();

    if (day === 0 || day === 6) return MarketStatus.CLOSED;
    if (hours >= 14 && hours < 21) return MarketStatus.OPEN;
    if (hours >= 9 && hours < 14) return MarketStatus.PRE_MARKET;
    if (hours >= 21 || hours < 1) return MarketStatus.AFTER_HOURS;
    return MarketStatus.CLOSED;
  }

  // ============================================================================
  // PRIVATE METHODS - CACHING
  // ============================================================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }
}

