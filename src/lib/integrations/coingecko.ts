/**
 * CoinGecko API Integration
 *
 * Free cryptocurrency market data API client
 * Features:
 * - Current cryptocurrency prices
 * - Historical price data
 * - Trending coins
 * - Cryptocurrency search
 * - Free tier rate limiting (50 calls/minute)
 * - Response caching
 */

import {
  CryptoQuote,
  MarketDataAPIError,
} from '../investments/types/market-data.types';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  large: string;
  market_cap_rank: number;
}

interface TrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  price_btc: number;
  score: number;
}

interface MarketData {
  current_price: Record<string, number>;
  market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  high_24h: Record<string, number>;
  low_24h: Record<string, number>;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: Record<string, number>;
  atl: Record<string, number>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  price: 30 * 1000, // 30 seconds
  history: 5 * 60 * 1000, // 5 minutes
  trending: 10 * 60 * 1000, // 10 minutes
  search: 60 * 60 * 1000, // 1 hour
  marketData: 60 * 1000, // 1 minute
};

const RATE_LIMIT = {
  maxRequests: 50,
  windowMs: 60 * 1000, // 1 minute
};

// ============================================================================
// COINGECKO CLIENT
// ============================================================================

export class CoinGeckoClient {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestTimestamps: number[] = [];

  constructor() {
    // CoinGecko free tier doesn't require API key
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get current cryptocurrency prices
   */
  async getCoinPrice(
    coinIds: string[],
    vsCurrencies: string[] = ['usd']
  ): Promise<Record<string, CryptoQuote>> {
    const cacheKey = `price:${coinIds.join(',')}:${vsCurrencies.join(',')}`;
    const cached = this.getFromCache<Record<string, CryptoQuote>>(cacheKey);
    if (cached) return cached;

    const endpoint = '/simple/price';
    const params = {
      ids: coinIds.join(','),
      vs_currencies: vsCurrencies.join(','),
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true',
      include_last_updated_at: 'true',
    };

    const data = await this.makeRequest(endpoint, params);

    const quotes: Record<string, CryptoQuote> = {};
    for (const [coinId, priceData] of Object.entries(data)) {
      const currency = vsCurrencies[0];
      quotes[coinId] = this.parseCryptoQuote(coinId, priceData as any, currency);
    }

    this.setCache(cacheKey, quotes, CACHE_TTL.price);
    return quotes;
  }

  /**
   * Get historical cryptocurrency prices
   */
  async getCoinHistory(
    coinId: string,
    days: number,
    interval?: 'daily'
  ): Promise<{ timestamp: Date; price: number }[]> {
    const cacheKey = `history:${coinId}:${days}:${interval || 'auto'}`;
    const cached = this.getFromCache<{ timestamp: Date; price: number }[]>(cacheKey);
    if (cached) return cached;

    const endpoint = `/coins/${coinId}/market_chart`;
    const params: Record<string, string> = {
      vs_currency: 'usd',
      days: days.toString(),
    };

    if (interval) {
      params.interval = interval;
    }

    const data = await this.makeRequest(endpoint, params);

    if (!data.prices || data.prices.length === 0) {
      throw new MarketDataAPIError(
        `No historical data found for coin: ${coinId}`,
        'NO_DATA',
        'CoinGecko',
        false
      );
    }

    const history = data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp: new Date(timestamp),
      price,
    }));

    this.setCache(cacheKey, history, CACHE_TTL.history);
    return history;
  }


  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCoins(): Promise<TrendingCoin[]> {
    const cacheKey = 'trending';
    const cached = this.getFromCache<TrendingCoin[]>(cacheKey);
    if (cached) return cached;

    const endpoint = '/search/trending';
    const data = await this.makeRequest(endpoint);

    if (!data.coins || data.coins.length === 0) {
      return [];
    }

    const trending = data.coins.map((item: any) => item.item);
    this.setCache(cacheKey, trending, CACHE_TTL.trending);
    return trending;
  }

  /**
   * Search for cryptocurrencies
   */
  async searchCoins(query: string): Promise<CoinSearchResult[]> {
    const cacheKey = `search:${query}`;
    const cached = this.getFromCache<CoinSearchResult[]>(cacheKey);
    if (cached) return cached;

    const endpoint = '/search';
    const params = { query };
    const data = await this.makeRequest(endpoint, params);

    if (!data.coins || data.coins.length === 0) {
      return [];
    }

    this.setCache(cacheKey, data.coins, CACHE_TTL.search);
    return data.coins;
  }

  /**
   * Get detailed market data for a cryptocurrency
   */
  async getMarketData(coinId: string): Promise<MarketData> {
    const cacheKey = `marketData:${coinId}`;
    const cached = this.getFromCache<MarketData>(cacheKey);
    if (cached) return cached;

    const endpoint = `/coins/${coinId}`;
    const params = {
      localization: 'false',
      tickers: 'false',
      market_data: 'true',
      community_data: 'false',
      developer_data: 'false',
      sparkline: 'false',
    };

    const data = await this.makeRequest(endpoint, params);

    if (!data.market_data) {
      throw new MarketDataAPIError(
        `No market data found for coin: ${coinId}`,
        'NO_DATA',
        'CoinGecko',
        false
      );
    }

    this.setCache(cacheKey, data.market_data, CACHE_TTL.marketData);
    return data.market_data;
  }

  // ============================================================================
  // PRIVATE METHODS - API COMMUNICATION
  // ============================================================================

  private async makeRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
    await this.checkRateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
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
            'CoinGecko',
            true
          );
        }
        throw new MarketDataAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          'CoinGecko',
          response.status >= 500
        );
      }

      const data = await response.json();
      this.recordRequest();
      return data;
    } catch (error) {
      if (error instanceof MarketDataAPIError) {
        throw error;
      }
      throw new MarketDataAPIError(
        `Request failed: ${(error as Error).message}`,
        'NETWORK_ERROR',
        'CoinGecko',
        true
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS - RATE LIMITING
  // ============================================================================

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT.windowMs
    );

    // Check if we've hit the rate limit
    if (this.requestTimestamps.length >= RATE_LIMIT.maxRequests) {
      const oldestRequest = Math.min(...this.requestTimestamps);
      const waitTime = RATE_LIMIT.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      await this.sleep(waitTime);
      return this.checkRateLimit(); // Recursive check after waiting
    }
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
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

  // ============================================================================
  // PRIVATE METHODS - DATA PARSING
  // ============================================================================

  private parseCryptoQuote(coinId: string, data: any, currency: string): CryptoQuote {
    return {
      symbol: coinId.toUpperCase(),
      name: coinId,
      price: data[currency] || 0,
      change24h: data[`${currency}_24h_change`] || 0,
      changePercent24h: data[`${currency}_24h_change`] || 0,
      marketCap: data[`${currency}_market_cap`] || 0,
      volume24h: data[`${currency}_24h_vol`] || 0,
      circulatingSupply: 0, // Not available in simple/price endpoint
      high24h: 0, // Not available in simple/price endpoint
      low24h: 0, // Not available in simple/price endpoint
      timestamp: new Date(data.last_updated_at * 1000),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

