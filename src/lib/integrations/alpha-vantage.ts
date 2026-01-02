/**
 * Alpha Vantage API Integration
 *
 * Robust API client for Alpha Vantage stock market data
 * Features:
 * - Rate limiting (5 calls per minute for free tier)
 * - Response caching with TTL
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 */

import {
  StockQuote,
  StockHistory,
  OHLCVData,
  CompanyProfile,
  EarningsData,
  TimeInterval,
  MarketStatus,
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

interface RateLimitState {
  requests: number[];
  windowStart: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  quote: 60 * 1000, // 1 minute
  history: 60 * 60 * 1000, // 1 hour
  company: 24 * 60 * 60 * 1000, // 1 day
  earnings: 24 * 60 * 60 * 1000, // 1 day
  search: 60 * 60 * 1000, // 1 hour
};

const RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
};

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// ============================================================================
// ALPHA VANTAGE CLIENT
// ============================================================================

export class AlphaVantageClient {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private cache: Map<string, CacheEntry<any>> = new Map();
  private rateLimitState: RateLimitState = {
    requests: [],
    windowStart: Date.now(),
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not configured');
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get real-time stock quote
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote:${symbol}`;
    const cached = this.getFromCache<StockQuote>(cacheKey);
    if (cached) return cached;

    const data = await this.makeRequest({
      function: 'GLOBAL_QUOTE',
      symbol,
    });

    if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
      throw new MarketDataAPIError(
        `No quote data found for symbol: ${symbol}`,
        'NO_DATA',
        'AlphaVantage',
        false
      );
    }

    const quote = this.parseQuote(symbol, data['Global Quote']);
    this.setCache(cacheKey, quote, CACHE_TTL.quote);
    return quote;
  }

  /**
   * Get historical OHLCV data
   */
  async getHistory(
    symbol: string,
    interval: TimeInterval,
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<StockHistory> {
    const cacheKey = `history:${symbol}:${interval}:${outputSize}`;
    const cached = this.getFromCache<StockHistory>(cacheKey);
    if (cached) return cached;

    const functionName = this.getFunctionName(interval);
    const params: any = {
      function: functionName,
      symbol,
      outputsize: outputSize,
    };

    // Add interval for intraday data
    if (this.isIntradayInterval(interval)) {
      params.interval = this.getIntervalParam(interval);
    }

    const data = await this.makeRequest(params);
    const history = this.parseHistory(symbol, interval, data);
    this.setCache(cacheKey, history, CACHE_TTL.history);
    return history;
  }

  /**
   * Get company overview/fundamentals
   */
  async getCompanyOverview(symbol: string): Promise<CompanyProfile> {
    const cacheKey = `company:${symbol}`;
    const cached = this.getFromCache<CompanyProfile>(cacheKey);
    if (cached) return cached;

    const data = await this.makeRequest({
      function: 'OVERVIEW',
      symbol,
    });

    if (!data.Symbol) {
      throw new MarketDataAPIError(
        `No company data found for symbol: ${symbol}`,
        'NO_DATA',
        'AlphaVantage',
        false
      );
    }

    const profile = this.parseCompanyProfile(data);
    this.setCache(cacheKey, profile, CACHE_TTL.company);
    return profile;
  }

  /**
   * Get quarterly and annual earnings
   */
  async getEarnings(symbol: string): Promise<EarningsData[]> {
    const cacheKey = `earnings:${symbol}`;
    const cached = this.getFromCache<EarningsData[]>(cacheKey);
    if (cached) return cached;

    const data = await this.makeRequest({
      function: 'EARNINGS',
      symbol,
    });

    if (!data.quarterlyEarnings || data.quarterlyEarnings.length === 0) {
      throw new MarketDataAPIError(
        `No earnings data found for symbol: ${symbol}`,
        'NO_DATA',
        'AlphaVantage',
        false
      );
    }

    const earnings = this.parseEarnings(symbol, data.quarterlyEarnings);
    this.setCache(cacheKey, earnings, CACHE_TTL.earnings);
    return earnings;
  }

  /**
   * Search for symbols
   */
  async searchSymbol(query: string): Promise<SearchResult[]> {
    const cacheKey = `search:${query}`;
    const cached = this.getFromCache<SearchResult[]>(cacheKey);
    if (cached) return cached;

    const data = await this.makeRequest({
      function: 'SYMBOL_SEARCH',
      keywords: query,
    });

    if (!data.bestMatches || data.bestMatches.length === 0) {
      return [];
    }

    const results = data.bestMatches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency'],
      matchScore: parseFloat(match['9. matchScore']),
    }));

    this.setCache(cacheKey, results, CACHE_TTL.search);
    return results;
  }

  // ============================================================================
  // PRIVATE METHODS - API COMMUNICATION
  // ============================================================================

  private async makeRequest(params: Record<string, string>): Promise<any> {
    await this.checkRateLimit();

    const url = new URL(this.baseUrl);
    url.searchParams.append('apikey', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    let lastError: Error | null = null;
    let delay = RETRY_CONFIG.initialDelay;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString());
        const data = await response.json();

        // Check for API errors
        if (data['Error Message']) {
          throw new MarketDataAPIError(
            data['Error Message'],
            'API_ERROR',
            'AlphaVantage',
            false
          );
        }

        if (data['Note']) {
          // Rate limit exceeded
          throw new MarketDataAPIError(
            'API rate limit exceeded',
            'RATE_LIMIT',
            'AlphaVantage',
            true
          );
        }

        if (data['Information']) {
          // API limit message
          throw new MarketDataAPIError(
            data['Information'],
            'API_LIMIT',
            'AlphaVantage',
            true
          );
        }

        this.recordRequest();
        return data;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof MarketDataAPIError && !error.retryable) {
          throw error;
        }

        if (attempt < RETRY_CONFIG.maxRetries) {
          await this.sleep(delay);
          delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
        }
      }
    }

    throw new MarketDataAPIError(
      `Failed after ${RETRY_CONFIG.maxRetries} retries: ${lastError?.message}`,
      'MAX_RETRIES',
      'AlphaVantage',
      false
    );
  }


  // ============================================================================
  // PRIVATE METHODS - RATE LIMITING
  // ============================================================================

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowAge = now - this.rateLimitState.windowStart;

    // Reset window if it's been more than the window duration
    if (windowAge >= RATE_LIMIT.windowMs) {
      this.rateLimitState = {
        requests: [],
        windowStart: now,
      };
      return;
    }

    // Remove requests outside the current window
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT.windowMs
    );

    // Check if we've hit the rate limit
    if (this.rateLimitState.requests.length >= RATE_LIMIT.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimitState.requests);
      const waitTime = RATE_LIMIT.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      await this.sleep(waitTime);
      return this.checkRateLimit(); // Recursive check after waiting
    }
  }

  private recordRequest(): void {
    this.rateLimitState.requests.push(Date.now());
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

  private parseQuote(symbol: string, data: any): StockQuote {
    return {
      symbol,
      price: parseFloat(data['05. price']),
      change: parseFloat(data['09. change']),
      changePercent: parseFloat(data['10. change percent'].replace('%', '')),
      volume: parseInt(data['06. volume']),
      avgVolume: parseInt(data['06. volume']), // Alpha Vantage doesn't provide avg volume in quote
      open: parseFloat(data['02. open']),
      high: parseFloat(data['03. high']),
      low: parseFloat(data['04. low']),
      previousClose: parseFloat(data['08. previous close']),
      week52High: parseFloat(data['03. high']), // Approximation
      week52Low: parseFloat(data['04. low']), // Approximation
      timestamp: new Date(data['07. latest trading day']),
      marketStatus: this.getMarketStatus(),
    };
  }

  private parseHistory(symbol: string, interval: TimeInterval, data: any): StockHistory {
    const timeSeriesKey = Object.keys(data).find((key) => key.includes('Time Series'));
    if (!timeSeriesKey) {
      throw new MarketDataAPIError(
        'No time series data found in response',
        'PARSE_ERROR',
        'AlphaVantage',
        false
      );
    }

    const timeSeries = data[timeSeriesKey];
    const ohlcvData: OHLCVData[] = [];

    for (const [timestamp, values] of Object.entries(timeSeries)) {
      ohlcvData.push({
        timestamp: new Date(timestamp),
        open: parseFloat((values as any)['1. open']),
        high: parseFloat((values as any)['2. high']),
        low: parseFloat((values as any)['3. low']),
        close: parseFloat((values as any)['4. close']),
        volume: parseInt((values as any)['5. volume']),
      });
    }

    // Sort by timestamp (newest first)
    ohlcvData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      symbol,
      interval,
      data: ohlcvData,
      startDate: ohlcvData[ohlcvData.length - 1]?.timestamp || new Date(),
      endDate: ohlcvData[0]?.timestamp || new Date(),
    };
  }

  private parseCompanyProfile(data: any): CompanyProfile {
    return {
      symbol: data.Symbol,
      name: data.Name,
      description: data.Description || '',
      sector: data.Sector || 'Unknown',
      industry: data.Industry || 'Unknown',
      exchange: data.Exchange || 'Unknown',
      currency: data.Currency || 'USD',
      country: data.Country || 'Unknown',
      marketCap: parseInt(data.MarketCapitalization) || 0,
      employees: data.FullTimeEmployees ? parseInt(data.FullTimeEmployees) : undefined,
      website: data.OfficialSite || undefined,
      fiscalYearEnd: data.FiscalYearEnd || undefined,
    };
  }

  private parseEarnings(symbol: string, quarterlyData: any[]): EarningsData[] {
    return quarterlyData.map((quarter) => ({
      symbol,
      fiscalDateEnding: new Date(quarter.fiscalDateEnding),
      reportedDate: new Date(quarter.reportedDate),
      reportedEPS: parseFloat(quarter.reportedEPS),
      estimatedEPS: parseFloat(quarter.estimatedEPS),
      surprise: parseFloat(quarter.surprise),
      surprisePercent: parseFloat(quarter.surprisePercentage),
    }));
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITY
  // ============================================================================

  private getFunctionName(interval: TimeInterval): string {
    if (this.isIntradayInterval(interval)) {
      return 'TIME_SERIES_INTRADAY';
    }
    if (interval === TimeInterval.ONE_DAY) {
      return 'TIME_SERIES_DAILY';
    }
    if (interval === TimeInterval.ONE_WEEK) {
      return 'TIME_SERIES_WEEKLY';
    }
    if (interval === TimeInterval.ONE_MONTH) {
      return 'TIME_SERIES_MONTHLY';
    }
    return 'TIME_SERIES_DAILY';
  }

  private getIntervalParam(interval: TimeInterval): string {
    const intervalMap: Record<string, string> = {
      [TimeInterval.ONE_MIN]: '1min',
      [TimeInterval.FIVE_MIN]: '5min',
      [TimeInterval.FIFTEEN_MIN]: '15min',
      [TimeInterval.THIRTY_MIN]: '30min',
      [TimeInterval.ONE_HOUR]: '60min',
    };
    return intervalMap[interval] || '5min';
  }

  private isIntradayInterval(interval: TimeInterval): boolean {
    return [
      TimeInterval.ONE_MIN,
      TimeInterval.FIVE_MIN,
      TimeInterval.FIFTEEN_MIN,
      TimeInterval.THIRTY_MIN,
      TimeInterval.ONE_HOUR,
    ].includes(interval);
  }

  private getMarketStatus(): MarketStatus {
    const now = new Date();
    const hours = now.getUTCHours();
    const day = now.getUTCDay();

    // Weekend
    if (day === 0 || day === 6) {
      return MarketStatus.CLOSED;
    }

    // Market hours (9:30 AM - 4:00 PM ET = 14:30 - 21:00 UTC)
    if (hours >= 14 && hours < 21) {
      if (hours === 14 && now.getUTCMinutes() < 30) {
        return MarketStatus.PRE_MARKET;
      }
      return MarketStatus.OPEN;
    }

    // Pre-market (4:00 AM - 9:30 AM ET = 9:00 - 14:30 UTC)
    if (hours >= 9 && hours < 14) {
      return MarketStatus.PRE_MARKET;
    }

    // After-hours (4:00 PM - 8:00 PM ET = 21:00 - 1:00 UTC next day)
    if (hours >= 21 || hours < 1) {
      return MarketStatus.AFTER_HOURS;
    }

    return MarketStatus.CLOSED;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

