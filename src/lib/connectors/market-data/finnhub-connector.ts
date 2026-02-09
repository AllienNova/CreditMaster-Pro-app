/**
 * Finnhub Market Data Connector
 *
 * Provides comprehensive market data including:
 * - Real-time quotes
 * - Historical price data
 * - Company fundamentals
 * - Insider transactions
 * - Analyst recommendations
 * - Earnings data
 * - News and sentiment
 * - SEC filings
 *
 * @see https://finnhub.io/docs/api
 */

import {
  BaseConnector,
  FinnhubConfig,
  HealthCheckResult,
  UnifiedQuote,
  ConnectorError,
  REGIONS,
} from '../types';

// =============================================================================
// Finnhub Types
// =============================================================================

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  v: number[]; // Volume
  t: number[]; // Timestamps
  s: string; // Status
}

interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
}

interface FinnhubRecommendationTrend {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

interface FinnhubEarningsSurprise {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

interface FinnhubEarningsCalendar {
  earningsCalendar: Array<{
    date: string;
    epsActual: number | null;
    epsEstimate: number;
    hour: string;
    quarter: number;
    revenueActual: number | null;
    revenueEstimate: number;
    symbol: string;
    year: number;
  }>;
}

interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface FinnhubSentiment {
  buzz: {
    articlesInLastWeek: number;
    buzz: number;
    weeklyAverage: number;
  };
  companyNewsScore: number;
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
  sentiment: {
    bearishPercent: number;
    bullishPercent: number;
  };
  symbol: string;
}

interface FinnhubSECFiling {
  accessNumber: string;
  symbol: string;
  cik: string;
  form: string;
  filedDate: string;
  acceptedDate: string;
  reportUrl: string;
  filingUrl: string;
}

interface FinnhubBasicFinancials {
  metric: {
    '10DayAverageTradingVolume': number;
    '52WeekHigh': number;
    '52WeekHighDate': string;
    '52WeekLow': number;
    '52WeekLowDate': string;
    beta: number;
    dividendYieldIndicatedAnnual: number;
    epsAnnual: number;
    epsGrowthTTMYoy: number;
    marketCapitalization: number;
    peAnnual: number;
    peBasicExclExtraTTM: number;
    pbAnnual: number;
    pfcfShareAnnual: number;
    psAnnual: number;
    quickRatioAnnual: number;
    roaRfy: number;
    roeRfy: number;
    roiAnnual: number;
    revenuePerShareAnnual: number;
    [key: string]: number | string;
  };
  metricType: string;
  symbol: string;
}

interface FinnhubPatternRecognition {
  points: Array<{
    aprice: number;
    atime: number;
    bprice: number;
    btime: number;
    cprice: number;
    ctime: number;
    dprice: number;
    dtime: number;
    eprice?: number;
    etime?: number;
  }>;
  patternname: string;
  patterntype: string;
  sortTime: number;
  status: string;
  symbol: string;
}

// =============================================================================
// Unified Types for Export
// =============================================================================

export interface InsiderTransaction {
  name: string;
  shares: number;
  change: number;
  filingDate: Date;
  transactionDate: Date;
  transactionType: string;
  price: number;
  value: number;
}

export interface RecommendationTrend {
  period: Date;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
  consensus: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

export interface EarningsSurprise {
  period: Date;
  quarter: number;
  year: number;
  actualEPS: number;
  estimateEPS: number;
  surprise: number;
  surprisePercent: number;
  beat: boolean;
}

export interface CompanyNews {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedAt: Date;
  category: string;
  relatedSymbols: string[];
}

export interface SentimentData {
  symbol: string;
  bullishPercent: number;
  bearishPercent: number;
  newsScore: number;
  sectorAverageScore: number;
  buzz: {
    articlesLastWeek: number;
    weeklyAverage: number;
    buzzScore: number;
  };
}

export interface CompanyFinancials {
  symbol: string;
  metrics: {
    marketCap: number;
    peRatio: number;
    pbRatio: number;
    psRatio: number;
    eps: number;
    epsGrowth: number;
    beta: number;
    dividendYield: number;
    roe: number;
    roa: number;
    roi: number;
    quickRatio: number;
    week52High: number;
    week52Low: number;
    avgVolume10Day: number;
  };
}

export interface TechnicalPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  status: string;
  detectedAt: Date;
  pricePoints: {
    label: string;
    price: number;
    time: Date;
  }[];
}

// =============================================================================
// Finnhub Connector
// =============================================================================

export class FinnhubConnector extends BaseConnector<FinnhubConfig> {
  readonly name = 'finnhub';
  readonly type = 'market_data' as const;

  private baseUrl = 'https://finnhub.io/api/v1';
  private requestCount = 0;
  private requestResetTime = Date.now();

  constructor(config: FinnhubConfig) {
    super(config);
  }

  // =============================================================================
  // Lifecycle
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.config.apiKey) {
      throw new Error('Finnhub API key is required');
    }

    const health = await this.healthCheck();
    if (!health.success) {
      throw new Error(`Finnhub health check failed: ${health.error?.message}`);
    }

    this.initialized = true;
    // FinnhubConnector: Connector initialized
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Use a simple endpoint to check connectivity
      const response = await this.apiRequest('/stock/symbol?exchange=US&limit=1');

      return {
        success: Array.isArray(response),
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async disconnect(): Promise<void> {
    this.initialized = false;
    // FinnhubConnector: Connector disconnected
  }

  // =============================================================================
  // Quotes & Price Data
  // =============================================================================

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<UnifiedQuote> {
    const data = await this.apiRequest<FinnhubQuote>(`/quote?symbol=${symbol}`);

    if (data.c === 0 && data.o === 0) {
      throw this.createError('SYMBOL_NOT_FOUND', `No data found for symbol: ${symbol}`);
    }

    return {
      symbol,
      provider: 'finnhub',
      price: data.c,
      open: data.o,
      high: data.h,
      low: data.l,
      previousClose: data.pc,
      change: data.d,
      changePercent: data.dp,
      volume: 0, // Not provided in quote endpoint
      timestamp: new Date(data.t * 1000),
      marketStatus: this.getMarketStatus(),
    };
  }

  /**
   * Get historical candle data
   */
  async getCandles(
    symbol: string,
    resolution: 'D' | 'W' | 'M' | '1' | '5' | '15' | '30' | '60',
    from: Date,
    to: Date
  ): Promise<Array<{ time: Date; open: number; high: number; low: number; close: number; volume: number }>> {
    const fromUnix = Math.floor(from.getTime() / 1000);
    const toUnix = Math.floor(to.getTime() / 1000);

    const data = await this.apiRequest<FinnhubCandle>(
      `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromUnix}&to=${toUnix}`
    );

    if (data.s !== 'ok' || !data.c) {
      return [];
    }

    return data.c.map((close, i) => ({
      time: new Date(data.t[i] * 1000),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close,
      volume: data.v[i],
    }));
  }

  // =============================================================================
  // Company Data
  // =============================================================================

  /**
   * Get company profile
   */
  async getCompanyProfile(symbol: string): Promise<FinnhubCompanyProfile> {
    return this.apiRequest<FinnhubCompanyProfile>(`/stock/profile2?symbol=${symbol}`);
  }

  /**
   * Get basic financials (metrics)
   */
  async getBasicFinancials(symbol: string): Promise<CompanyFinancials> {
    const data = await this.apiRequest<FinnhubBasicFinancials>(
      `/stock/metric?symbol=${symbol}&metric=all`
    );

    const m = data.metric;

    return {
      symbol,
      metrics: {
        marketCap: m.marketCapitalization || 0,
        peRatio: m.peAnnual || 0,
        pbRatio: m.pbAnnual || 0,
        psRatio: m.psAnnual || 0,
        eps: m.epsAnnual || 0,
        epsGrowth: m.epsGrowthTTMYoy || 0,
        beta: m.beta || 0,
        dividendYield: m.dividendYieldIndicatedAnnual || 0,
        roe: m.roeRfy || 0,
        roa: m.roaRfy || 0,
        roi: m.roiAnnual || 0,
        quickRatio: m.quickRatioAnnual || 0,
        week52High: m['52WeekHigh'] as number || 0,
        week52Low: m['52WeekLow'] as number || 0,
        avgVolume10Day: m['10DayAverageTradingVolume'] || 0,
      },
    };
  }

  // =============================================================================
  // Insider Transactions
  // =============================================================================

  /**
   * Get insider transactions
   */
  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
    const data = await this.apiRequest<{ data: FinnhubInsiderTransaction[] }>(
      `/stock/insider-transactions?symbol=${symbol}`
    );

    return (data.data || []).map((tx) => ({
      name: tx.name,
      shares: Math.abs(tx.share),
      change: tx.change,
      filingDate: new Date(tx.filingDate),
      transactionDate: new Date(tx.transactionDate),
      transactionType: this.mapTransactionCode(tx.transactionCode),
      price: tx.transactionPrice,
      value: Math.abs(tx.share) * tx.transactionPrice,
    }));
  }

  /**
   * Map transaction code to readable type
   */
  private mapTransactionCode(code: string): string {
    const codes: Record<string, string> = {
      P: 'Purchase',
      S: 'Sale',
      A: 'Grant/Award',
      D: 'Sale to issuer',
      F: 'Payment of exercise price',
      I: 'Discretionary transaction',
      M: 'Exercise of derivative',
      C: 'Conversion of derivative',
      E: 'Expiration of derivative',
      G: 'Gift',
      L: 'Small acquisition',
      W: 'Acquisition/disposition by will',
      Z: 'Voting trust deposit',
    };
    return codes[code] || code;
  }

  // =============================================================================
  // Analyst Recommendations
  // =============================================================================

  /**
   * Get recommendation trends
   */
  async getRecommendationTrends(symbol: string): Promise<RecommendationTrend[]> {
    const data = await this.apiRequest<FinnhubRecommendationTrend[]>(
      `/stock/recommendation?symbol=${symbol}`
    );

    return data.map((rec) => {
      const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
      const score =
        (rec.strongBuy * 5 + rec.buy * 4 + rec.hold * 3 + rec.sell * 2 + rec.strongSell * 1) /
        (total || 1);

      let consensus: RecommendationTrend['consensus'];
      if (score >= 4.5) consensus = 'strong_buy';
      else if (score >= 3.5) consensus = 'buy';
      else if (score >= 2.5) consensus = 'hold';
      else if (score >= 1.5) consensus = 'sell';
      else consensus = 'strong_sell';

      return {
        period: new Date(rec.period),
        strongBuy: rec.strongBuy,
        buy: rec.buy,
        hold: rec.hold,
        sell: rec.sell,
        strongSell: rec.strongSell,
        total,
        consensus,
      };
    });
  }

  // =============================================================================
  // Earnings
  // =============================================================================

  /**
   * Get earnings surprises
   */
  async getEarningsSurprises(symbol: string, limit = 4): Promise<EarningsSurprise[]> {
    const data = await this.apiRequest<FinnhubEarningsSurprise[]>(
      `/stock/earnings?symbol=${symbol}`
    );

    return data.slice(0, limit).map((e) => ({
      period: new Date(e.period),
      quarter: e.quarter,
      year: e.year,
      actualEPS: e.actual,
      estimateEPS: e.estimate,
      surprise: e.surprise,
      surprisePercent: e.surprisePercent,
      beat: e.actual > e.estimate,
    }));
  }

  /**
   * Get earnings calendar
   */
  async getEarningsCalendar(from: Date, to: Date, symbol?: string): Promise<FinnhubEarningsCalendar['earningsCalendar']> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    let url = `/calendar/earnings?from=${fromStr}&to=${toStr}`;
    if (symbol) {
      url += `&symbol=${symbol}`;
    }

    const data = await this.apiRequest<FinnhubEarningsCalendar>(url);
    return data.earningsCalendar || [];
  }

  // =============================================================================
  // News & Sentiment
  // =============================================================================

  /**
   * Get company news
   */
  async getCompanyNews(symbol: string, from: Date, to: Date): Promise<CompanyNews[]> {
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const data = await this.apiRequest<FinnhubNews[]>(
      `/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}`
    );

    return data.map((news) => ({
      id: news.id,
      headline: news.headline,
      summary: news.summary,
      source: news.source,
      url: news.url,
      imageUrl: news.image,
      publishedAt: new Date(news.datetime * 1000),
      category: news.category,
      relatedSymbols: news.related.split(',').filter(Boolean),
    }));
  }

  /**
   * Get market news (general)
   */
  async getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<CompanyNews[]> {
    const data = await this.apiRequest<FinnhubNews[]>(`/news?category=${category}`);

    return data.map((news) => ({
      id: news.id,
      headline: news.headline,
      summary: news.summary,
      source: news.source,
      url: news.url,
      imageUrl: news.image,
      publishedAt: new Date(news.datetime * 1000),
      category: news.category,
      relatedSymbols: news.related.split(',').filter(Boolean),
    }));
  }

  /**
   * Get social sentiment
   */
  async getSentiment(symbol: string): Promise<SentimentData> {
    const data = await this.apiRequest<FinnhubSentiment>(
      `/stock/social-sentiment?symbol=${symbol}`
    );

    return {
      symbol: data.symbol,
      bullishPercent: data.sentiment?.bullishPercent || 0,
      bearishPercent: data.sentiment?.bearishPercent || 0,
      newsScore: data.companyNewsScore || 0,
      sectorAverageScore: data.sectorAverageNewsScore || 0,
      buzz: {
        articlesLastWeek: data.buzz?.articlesInLastWeek || 0,
        weeklyAverage: data.buzz?.weeklyAverage || 0,
        buzzScore: data.buzz?.buzz || 0,
      },
    };
  }

  // =============================================================================
  // SEC Filings
  // =============================================================================

  /**
   * Get SEC filings
   */
  async getSECFilings(symbol: string, from?: Date, to?: Date): Promise<FinnhubSECFiling[]> {
    let url = `/stock/filings?symbol=${symbol}`;

    if (from) {
      url += `&from=${from.toISOString().split('T')[0]}`;
    }
    if (to) {
      url += `&to=${to.toISOString().split('T')[0]}`;
    }

    return this.apiRequest<FinnhubSECFiling[]>(url);
  }

  // =============================================================================
  // Technical Analysis
  // =============================================================================

  /**
   * Get pattern recognition
   */
  async getPatternRecognition(symbol: string, resolution: 'D' | 'W' | 'M' = 'D'): Promise<TechnicalPattern[]> {
    const data = await this.apiRequest<{ points: FinnhubPatternRecognition[] }>(
      `/scan/pattern?symbol=${symbol}&resolution=${resolution}`
    );

    return (data.points || []).map((pattern) => {
      const pricePoints: TechnicalPattern['pricePoints'] = [];

      if (pattern.points[0]) {
        const p = pattern.points[0];
        if (p.aprice && p.atime) {
          pricePoints.push({ label: 'A', price: p.aprice, time: new Date(p.atime * 1000) });
        }
        if (p.bprice && p.btime) {
          pricePoints.push({ label: 'B', price: p.bprice, time: new Date(p.btime * 1000) });
        }
        if (p.cprice && p.ctime) {
          pricePoints.push({ label: 'C', price: p.cprice, time: new Date(p.ctime * 1000) });
        }
        if (p.dprice && p.dtime) {
          pricePoints.push({ label: 'D', price: p.dprice, time: new Date(p.dtime * 1000) });
        }
        if (p.eprice && p.etime) {
          pricePoints.push({ label: 'E', price: p.eprice, time: new Date(p.etime * 1000) });
        }
      }

      return {
        name: pattern.patternname,
        type: pattern.patterntype.toLowerCase() as 'bullish' | 'bearish' | 'neutral',
        status: pattern.status,
        detectedAt: new Date(pattern.sortTime * 1000),
        pricePoints,
      };
    });
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  /**
   * Make an API request to Finnhub
   */
  private async apiRequest<T>(path: string): Promise<T> {
    // Rate limiting (60 requests/minute for free tier)
    await this.enforceRateLimit();

    const url = `${this.baseUrl}${path}${path.includes('?') ? '&' : '?'}token=${this.config.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw this.createError('RATE_LIMITED', 'Rate limit exceeded', true);
      }
      if (response.status === 401) {
        throw this.createError('UNAUTHORIZED', 'Invalid API key');
      }

      const error = await response.text();
      throw this.createError('API_ERROR', error || 'API request failed');
    }

    this.requestCount++;
    return response.json();
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    // Reset counter if window has passed
    if (now - this.requestResetTime > windowMs) {
      this.requestCount = 0;
      this.requestResetTime = now;
    }

    // Free tier: 60 requests/minute
    const limit = this.config.tier === 'premium' ? 300 : 60;

    if (this.requestCount >= limit) {
      const waitTime = windowMs - (now - this.requestResetTime);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.requestResetTime = Date.now();
    }
  }

  /**
   * Get current market status
   */
  private getMarketStatus(): UnifiedQuote['marketStatus'] {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();
    const day = nyTime.getDay();

    // Weekend
    if (day === 0 || day === 6) return 'closed';

    // Pre-market: 4:00 AM - 9:30 AM
    if (hour >= 4 && (hour < 9 || (hour === 9 && minute < 30))) return 'pre';

    // Regular: 9:30 AM - 4:00 PM
    if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 16)) return 'open';

    // Post-market: 4:00 PM - 8:00 PM
    if (hour >= 16 && hour < 20) return 'post';

    return 'closed';
  }

  /**
   * Create a standardized connector error
   */
  private createError(code: string, message: string, retryable = false): ConnectorError {
    return {
      code,
      message,
      provider: 'finnhub',
      retryable,
    };
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a Finnhub connector with default configuration
 */
export function createFinnhubConnector(
  apiKey: string,
  tier: 'free' | 'premium' = 'free'
): FinnhubConnector {
  const config: FinnhubConfig = {
    name: 'finnhub',
    provider: 'finnhub',
    version: '1.0.0',
    priority: 20, // Secondary to Polygon
    regions: [REGIONS.ALL], // Global
    capabilities: [
      'quotes',
      'historical',
      'fundamentals',
      'news',
      'sentiment',
      'insider',
      'earnings',
      'filings',
    ],
    rateLimits: {
      requestsPerMinute: tier === 'premium' ? 300 : 60,
    },
    retry: {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialBase: 2,
    },
    cache: {
      enabled: true,
      defaultTTLSeconds: 60, // 1 minute for quotes
    },
    healthCheckInterval: 60000,
    timeout: 15000,
    enabled: true,
    apiKey,
    tier,
  };

  return new FinnhubConnector(config);
}

export default FinnhubConnector;
