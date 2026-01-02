/**
 * Unified Market Data Service
 *
 * Abstraction layer over multiple market data providers with:
 * - Intelligent provider fallback (Alpha Vantage → Polygon → cached data)
 * - Redis caching for production scalability
 * - Health checks for all providers
 * - Unified interface for all asset types
 * - Real-time data subscription support
 */

import { AlphaVantageClient } from '../integrations/alpha-vantage';
import { PolygonClient } from '../integrations/polygon';
import { CoinGeckoClient } from '../integrations/coingecko';
import { RedisCacheService } from '../cache/redis-cache-service';
import {
  StockQuote,
  StockHistory,
  CryptoQuote,
  MarketNews,
  CompanyProfile,
  EarningsData,
  AssetType,
  TimeInterval,
  MarketDataAPIError,
} from './types/market-data.types';

// ============================================================================
// TYPES
// ============================================================================

export interface MarketDataConfig {
  alphaVantageKey?: string;
  polygonKey?: string;
  polygonTier?: 'free' | 'starter' | 'developer' | 'advanced';
  enableRedis?: boolean;
  cachePrefix?: string;
}

export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  lastCheck: Date;
  lastError?: string;
  responseTime?: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
  assetType: AssetType;
}

type RealtimeCallback = (data: {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change: number;
  changePercent: number;
}) => void;

// ============================================================================
// CACHE TTL CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  quote: 60, // 1 minute
  history: 3600, // 1 hour
  company: 86400, // 24 hours
  earnings: 86400, // 24 hours
  news: 300, // 5 minutes
  crypto: 30, // 30 seconds
  search: 3600, // 1 hour
};

// ============================================================================
// UNIFIED MARKET DATA SERVICE
// ============================================================================

export class UnifiedMarketDataService {
  private alphaVantage: AlphaVantageClient;
  private polygon: PolygonClient;
  private coinGecko: CoinGeckoClient;
  private cache: RedisCacheService;
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: MarketDataConfig) {
    this.alphaVantage = new AlphaVantageClient(config?.alphaVantageKey);
    this.polygon = new PolygonClient(config?.polygonKey, config?.polygonTier);
    this.coinGecko = new CoinGeckoClient();
    this.cache = new RedisCacheService({
      ttl: CACHE_TTL.quote,
      prefix: config?.cachePrefix || 'market:',
    });

    // Initialize provider health
    this.providerHealth.set('AlphaVantage', {
      provider: 'AlphaVantage',
      healthy: true,
      lastCheck: new Date(),
    });
    this.providerHealth.set('Polygon', {
      provider: 'Polygon',
      healthy: true,
      lastCheck: new Date(),
    });
    this.providerHealth.set('CoinGecko', {
      provider: 'CoinGecko',
      healthy: true,
      lastCheck: new Date(),
    });

    // Start health check interval (every 5 minutes)
    this.startHealthChecks();
  }

  // ============================================================================
  // PUBLIC METHODS - QUOTES
  // ============================================================================

  /**
   * Get real-time quote for any asset type
   */
  async getQuote(symbol: string, assetType: AssetType): Promise<StockQuote | CryptoQuote> {
    const cacheKey = `quote:${assetType}:${symbol}`;

    // Try cache first
    const cached = await this.cache.get<StockQuote | CryptoQuote>(cacheKey);
    if (cached) return cached;

    // Route to appropriate provider based on asset type
    if (assetType === AssetType.CRYPTO) {
      return this.getCryptoQuote(symbol);
    }

    return this.getStockQuote(symbol);
  }

  /**
   * Get stock quote with provider fallback
   */
  private async getStockQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote:stock:${symbol}`;
    const errors: Error[] = [];

    // Try Polygon first (if healthy)
    if (this.isProviderHealthy('Polygon')) {
      try {
        const quote = await this.polygon.getQuote(symbol);
        await this.cache.set(cacheKey, quote, CACHE_TTL.quote);
        this.markProviderHealthy('Polygon');
        return quote;
      } catch (error) {
        errors.push(error as Error);
        this.markProviderUnhealthy('Polygon', (error as Error).message);
      }
    }

    // Fallback to Alpha Vantage
    if (this.isProviderHealthy('AlphaVantage')) {
      try {
        const quote = await this.alphaVantage.getQuote(symbol);
        await this.cache.set(cacheKey, quote, CACHE_TTL.quote);
        this.markProviderHealthy('AlphaVantage');
        return quote;
      } catch (error) {
        errors.push(error as Error);
        this.markProviderUnhealthy('AlphaVantage', (error as Error).message);
      }
    }

    throw new MarketDataAPIError(
      `All providers failed for ${symbol}: ${errors.map(e => e.message).join(', ')}`,
      'ALL_PROVIDERS_FAILED',
      'UnifiedService',
      false
    );
  }

  /**
   * Get cryptocurrency quote
   */
  private async getCryptoQuote(symbol: string): Promise<CryptoQuote> {
    const cacheKey = `quote:crypto:${symbol}`;

    try {
      const coinId = symbol.toLowerCase();
      const quotes = await this.coinGecko.getCoinPrice([coinId], ['usd']);
      const quote = quotes[coinId];

      if (!quote) {
        throw new MarketDataAPIError(
          `No data found for cryptocurrency: ${symbol}`,
          'NO_DATA',
          'CoinGecko',
          false
        );
      }

      await this.cache.set(cacheKey, quote, CACHE_TTL.crypto);
      this.markProviderHealthy('CoinGecko');
      return quote;
    } catch (error) {
      this.markProviderUnhealthy('CoinGecko', (error as Error).message);
      throw error;
    }
  }

  // ============================================================================
  // PUBLIC METHODS - HISTORICAL DATA
  // ============================================================================

  /**
   * Get historical price data
   */
  async getHistory(
    symbol: string,
    assetType: AssetType,
    interval: TimeInterval,
    days?: number
  ): Promise<StockHistory> {
    const cacheKey = `history:${assetType}:${symbol}:${interval}:${days || 'default'}`;

    // Try cache first
    const cached = await this.cache.get<StockHistory>(cacheKey);
    if (cached) return cached;

    // Route to appropriate provider
    if (assetType === AssetType.CRYPTO) {
      return this.getCryptoHistory(symbol, days || 30);
    }

    return this.getStockHistory(symbol, interval, days);
  }

  /**
   * Get stock historical data with provider fallback
   */
  private async getStockHistory(
    symbol: string,
    interval: TimeInterval,
    days?: number
  ): Promise<StockHistory> {
    const cacheKey = `history:stock:${symbol}:${interval}`;
    const errors: Error[] = [];

    // Try Polygon first
    if (this.isProviderHealthy('Polygon')) {
      try {
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        const timespan = this.convertIntervalToTimespan(interval);
        const history = await this.polygon.getAggregates(symbol, timespan, from, to);

        await this.cache.set(cacheKey, history, CACHE_TTL.history);
        this.markProviderHealthy('Polygon');
        return history;
      } catch (error) {
        errors.push(error as Error);
        this.markProviderUnhealthy('Polygon', (error as Error).message);
      }
    }

    // Fallback to Alpha Vantage
    if (this.isProviderHealthy('AlphaVantage')) {
      try {
        const history = await this.alphaVantage.getHistory(symbol, interval);
        await this.cache.set(cacheKey, history, CACHE_TTL.history);
        this.markProviderHealthy('AlphaVantage');
        return history;
      } catch (error) {
        errors.push(error as Error);
        this.markProviderUnhealthy('AlphaVantage', (error as Error).message);
      }
    }

    throw new MarketDataAPIError(
      `All providers failed for ${symbol} history: ${errors.map(e => e.message).join(', ')}`,
      'ALL_PROVIDERS_FAILED',
      'UnifiedService',
      false
    );
  }

  /**
   * Get cryptocurrency historical data
   */
  private async getCryptoHistory(symbol: string, days: number): Promise<StockHistory> {
    const cacheKey = `history:crypto:${symbol}:${days}`;

    try {
      const coinId = symbol.toLowerCase();
      const history = await this.coinGecko.getCoinHistory(coinId, days);

      const stockHistory: StockHistory = {
        symbol,
        interval: TimeInterval.ONE_DAY,
        data: history.map(item => ({
          timestamp: item.timestamp,
          open: item.price,
          high: item.price,
          low: item.price,
          close: item.price,
          volume: 0,
        })),
        startDate: history.length > 0 ? history[0].timestamp : new Date(),
        endDate: history.length > 0 ? history[history.length - 1].timestamp : new Date(),
      };

      await this.cache.set(cacheKey, stockHistory, CACHE_TTL.history);
      this.markProviderHealthy('CoinGecko');
      return stockHistory;
    } catch (error) {
      this.markProviderUnhealthy('CoinGecko', (error as Error).message);
      throw error;
    }
  }

  // ============================================================================
  // PUBLIC METHODS - NEWS & COMPANY DATA
  // ============================================================================

  /**
   * Get market news
   */
  async getNews(symbol?: string, limit: number = 10): Promise<MarketNews[]> {
    const cacheKey = `news:${symbol || 'general'}:${limit}`;

    // Try cache first
    const cached = await this.cache.get<MarketNews[]>(cacheKey);
    if (cached) return cached;

    // Try Polygon (best news source)
    if (this.isProviderHealthy('Polygon')) {
      try {
        const news = await this.polygon.getNews(symbol, limit);
        await this.cache.set(cacheKey, news, CACHE_TTL.news);
        this.markProviderHealthy('Polygon');
        return news;
      } catch (error) {
        this.markProviderUnhealthy('Polygon', (error as Error).message);
      }
    }

    // No fallback for news - return empty array
    return [];
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const cacheKey = `company:${symbol}`;

    // Try cache first
    const cached = await this.cache.get<CompanyProfile>(cacheKey);
    if (cached) return cached;

    // Alpha Vantage has the best company data
    if (this.isProviderHealthy('AlphaVantage')) {
      try {
        const profile = await this.alphaVantage.getCompanyOverview(symbol);
        await this.cache.set(cacheKey, profile, CACHE_TTL.company);
        this.markProviderHealthy('AlphaVantage');
        return profile;
      } catch (error) {
        this.markProviderUnhealthy('AlphaVantage', (error as Error).message);
        throw error;
      }
    }

    throw new MarketDataAPIError(
      `Alpha Vantage unavailable for company profile: ${symbol}`,
      'PROVIDER_UNAVAILABLE',
      'UnifiedService',
      true
    );
  }

  /**
   * Get earnings data
   */
  async getEarnings(symbol: string): Promise<EarningsData[]> {
    const cacheKey = `earnings:${symbol}`;

    // Try cache first
    const cached = await this.cache.get<EarningsData[]>(cacheKey);
    if (cached) return cached;

    // Alpha Vantage has earnings data
    if (this.isProviderHealthy('AlphaVantage')) {
      try {
        const earnings = await this.alphaVantage.getEarnings(symbol);
        await this.cache.set(cacheKey, earnings, CACHE_TTL.earnings);
        this.markProviderHealthy('AlphaVantage');
        return earnings;
      } catch (error) {
        this.markProviderUnhealthy('AlphaVantage', (error as Error).message);
        throw error;
      }
    }

    throw new MarketDataAPIError(
      `Alpha Vantage unavailable for earnings: ${symbol}`,
      'PROVIDER_UNAVAILABLE',
      'UnifiedService',
      true
    );
  }


  // ============================================================================
  // PUBLIC METHODS - SEARCH
  // ============================================================================

  /**
   * Search for symbols across all asset types
   */
  async search(query: string, assetType?: AssetType): Promise<SearchResult[]> {
    const cacheKey = `search:${query}:${assetType || 'all'}`;

    // Try cache first
    const cached = await this.cache.get<SearchResult[]>(cacheKey);
    if (cached) return cached;

    const results: SearchResult[] = [];

    // Search stocks
    if (!assetType || assetType === AssetType.STOCK || assetType === AssetType.ETF) {
      try {
        if (this.isProviderHealthy('AlphaVantage')) {
          const alphaResults = await this.alphaVantage.searchSymbol(query);
          results.push(
            ...alphaResults.map(r => ({
              symbol: r.symbol,
              name: r.name,
              type: r.type,
              exchange: r.region,
              assetType: r.type === 'ETF' ? AssetType.ETF : AssetType.STOCK,
            }))
          );
        }
      } catch (error) {
        console.error('Alpha Vantage search error:', error);
      }
    }

    // Search crypto
    if (!assetType || assetType === AssetType.CRYPTO) {
      try {
        if (this.isProviderHealthy('CoinGecko')) {
          const cryptoResults = await this.coinGecko.searchCoins(query);
          results.push(
            ...cryptoResults.map(r => ({
              symbol: r.symbol.toUpperCase(),
              name: r.name,
              type: 'Cryptocurrency',
              assetType: AssetType.CRYPTO,
            }))
          );
        }
      } catch (error) {
        console.error('CoinGecko search error:', error);
      }
    }

    await this.cache.set(cacheKey, results, CACHE_TTL.search);
    return results;
  }

  // ============================================================================
  // PUBLIC METHODS - REAL-TIME DATA
  // ============================================================================

  /**
   * Subscribe to real-time quote updates (Polygon WebSocket)
   */
  subscribeToRealTime(symbols: string[], callback: RealtimeCallback): () => void {
    if (!this.isProviderHealthy('Polygon')) {
      console.warn('Polygon unavailable for real-time data');
      return () => {};
    }

    return this.polygon.subscribeToQuotes(symbols, callback);
  }

  /**
   * Disconnect from real-time data streams
   */
  disconnectRealTime(): void {
    this.polygon.disconnect();
  }

  // ============================================================================
  // PUBLIC METHODS - HEALTH & MONITORING
  // ============================================================================

  /**
   * Get health status of all providers
   */
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  /**
   * Check if a specific provider is healthy
   */
  isProviderHealthy(provider: string): boolean {
    const health = this.providerHealth.get(provider);
    return health?.healthy ?? false;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.disconnectRealTime();
  }

  // ============================================================================
  // PRIVATE METHODS - HEALTH CHECKS
  // ============================================================================

  private startHealthChecks(): void {
    // Run health checks every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, 5 * 60 * 1000);

    // Run initial health check after 10 seconds
    setTimeout(() => this.runHealthChecks(), 10000);
  }

  private async runHealthChecks(): Promise<void> {
    // Check Alpha Vantage
    await this.checkProviderHealth('AlphaVantage', async () => {
      await this.alphaVantage.searchSymbol('AAPL');
    });

    // Check Polygon
    await this.checkProviderHealth('Polygon', async () => {
      await this.polygon.getTickers('AAPL');
    });

    // Check CoinGecko
    await this.checkProviderHealth('CoinGecko', async () => {
      await this.coinGecko.searchCoins('bitcoin');
    });
  }

  private async checkProviderHealth(
    provider: string,
    healthCheckFn: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await healthCheckFn();
      const responseTime = Date.now() - startTime;

      this.providerHealth.set(provider, {
        provider,
        healthy: true,
        lastCheck: new Date(),
        responseTime,
      });
    } catch (error) {
      this.providerHealth.set(provider, {
        provider,
        healthy: false,
        lastCheck: new Date(),
        lastError: (error as Error).message,
      });
    }
  }

  private markProviderHealthy(provider: string): void {
    const current = this.providerHealth.get(provider);
    if (current) {
      this.providerHealth.set(provider, {
        ...current,
        healthy: true,
        lastCheck: new Date(),
        lastError: undefined,
      });
    }
  }

  private markProviderUnhealthy(provider: string, error: string): void {
    const current = this.providerHealth.get(provider);
    if (current) {
      this.providerHealth.set(provider, {
        ...current,
        healthy: false,
        lastCheck: new Date(),
        lastError: error,
      });
    }
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITIES
  // ============================================================================

  private convertIntervalToTimespan(
    interval: TimeInterval
  ): 'minute' | 'hour' | 'day' | 'week' | 'month' {
    switch (interval) {
      case TimeInterval.ONE_MIN:
      case TimeInterval.FIVE_MIN:
      case TimeInterval.FIFTEEN_MIN:
      case TimeInterval.THIRTY_MIN:
        return 'minute';
      case TimeInterval.ONE_HOUR:
        return 'hour';
      case TimeInterval.ONE_DAY:
        return 'day';
      case TimeInterval.ONE_WEEK:
        return 'week';
      case TimeInterval.ONE_MONTH:
        return 'month';
      default:
        return 'day';
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const marketDataService = new UnifiedMarketDataService({
  alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY,
  polygonKey: process.env.POLYGON_API_KEY,
  polygonTier: (process.env.POLYGON_TIER as any) || 'free',
  enableRedis: process.env.NODE_ENV === 'production',
  cachePrefix: 'market:',
});
