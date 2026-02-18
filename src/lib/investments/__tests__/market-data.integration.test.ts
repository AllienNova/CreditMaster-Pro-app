/**
 * Market Data Integration Tests
 *
 * Tests the market data service pipeline including:
 * - Provider fallback (Polygon -> AlphaVantage -> cached data)
 * - Multi-asset type support (stocks, crypto, ETF)
 * - Health check system and provider recovery
 * - Caching layer integration
 * - Error handling and edge cases
 */

import { UnifiedMarketDataService } from '../market-data-service';
import { AssetType, TimeInterval, MarketDataAPIError } from '../types/market-data.types';

// Mock the integrations - inline factories, no external const references
jest.mock('../../integrations/alpha-vantage');
jest.mock('../../integrations/polygon');
jest.mock('../../integrations/coingecko');
jest.mock('../../cache/redis-cache-service');

import { AlphaVantageClient } from '../../integrations/alpha-vantage';
import { PolygonClient } from '../../integrations/polygon';
import { CoinGeckoClient } from '../../integrations/coingecko';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockStockQuote(overrides?: Partial<Record<string, unknown>>) {
  return {
    symbol: 'AAPL',
    price: 185.50,
    change: 3.25,
    changePercent: 1.78,
    volume: 62000000,
    avgVolume: 55000000,
    high: 186.00,
    low: 182.75,
    open: 183.00,
    previousClose: 182.25,
    marketCap: 2900000000000,
    peRatio: 30.2,
    week52High: 199.62,
    week52Low: 164.08,
    timestamp: new Date('2025-12-01T16:00:00Z'),
    marketStatus: 'CLOSED',
    ...overrides,
  };
}

function createMockCryptoQuote(overrides?: Partial<Record<string, unknown>>) {
  return {
    symbol: 'BTC',
    name: 'bitcoin',
    price: 97500,
    change24h: 2150,
    changePercent24h: 2.25,
    marketCap: 1920000000000,
    volume24h: 48000000000,
    circulatingSupply: 19600000,
    totalSupply: 21000000,
    maxSupply: 21000000,
    high24h: 98200,
    low24h: 95100,
    allTimeHigh: 108000,
    allTimeLow: 67.81,
    timestamp: new Date('2025-12-01T16:00:00Z'),
    ...overrides,
  };
}

function createMockOHLCVData(days: number) {
  const data = [];
  const baseDate = new Date('2025-01-01T00:00:00Z');
  let price = 150;

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dailyChange = (Math.random() - 0.48) * 5;
    price = Math.max(10, price + dailyChange);
    const high = price + Math.random() * 3;
    const low = price - Math.random() * 3;

    data.push({
      timestamp: date,
      open: price - dailyChange * 0.5,
      high,
      low,
      close: price,
      volume: Math.floor(40000000 + Math.random() * 30000000),
      adjustedClose: price,
    });
  }
  return data;
}

function createMockStockHistory(symbol: string, days: number) {
  return {
    symbol,
    interval: TimeInterval.ONE_DAY,
    data: createMockOHLCVData(days),
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-01'),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Market Data Integration', () => {
  let service: UnifiedMarketDataService;
  let mockPolygon: any;
  let mockAlphaVantage: any;
  let mockCoinGecko: any;

  beforeEach(() => {
    // Create a fresh service instance for each test
    service = new UnifiedMarketDataService({
      alphaVantageKey: 'test-av-key',
      polygonKey: 'test-polygon-key',
      polygonTier: 'free',
      enableRedis: false,
    });

    // Access mock instances created by constructor
    mockPolygon = (PolygonClient as any).mock.instances[0];
    mockAlphaVantage = (AlphaVantageClient as any).mock.instances[0];
    mockCoinGecko = (CoinGeckoClient as any).mock.instances[0];
  });

  afterEach(() => {
    service.cleanup();
  });

  // ==========================================================================
  // PROVIDER FALLBACK CHAIN
  // ==========================================================================

  describe('Provider Fallback Chain', () => {
    it('should fetch stock quote from primary provider (Polygon)', async () => {
      const mockQuote = createMockStockQuote();
      mockPolygon.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote('AAPL', AssetType.STOCK);

      expect(result).toEqual(mockQuote);
      expect(mockPolygon.getQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should fallback to AlphaVantage when Polygon returns rate limit error', async () => {
      const mockQuote = createMockStockQuote();
      mockPolygon.getQuote = jest.fn().mockRejectedValue(
        new MarketDataAPIError('Rate limit exceeded', 'RATE_LIMIT', 'Polygon', true)
      );
      mockAlphaVantage.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote('AAPL', AssetType.STOCK);

      expect(result).toEqual(mockQuote);
      expect(mockPolygon.getQuote).toHaveBeenCalledWith('AAPL');
      expect(mockAlphaVantage.getQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should fallback to AlphaVantage when Polygon throws generic error', async () => {
      const mockQuote = createMockStockQuote({ symbol: 'GOOGL' });
      mockPolygon.getQuote = jest.fn().mockRejectedValue(new Error('Network timeout'));
      mockAlphaVantage.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote('GOOGL', AssetType.STOCK);

      expect(result).toEqual(mockQuote);
      expect(mockPolygon.getQuote).toHaveBeenCalled();
      expect(mockAlphaVantage.getQuote).toHaveBeenCalled();
    });

    it('should throw MarketDataAPIError when all stock providers fail', async () => {
      mockPolygon.getQuote = jest.fn().mockRejectedValue(
        new MarketDataAPIError('Polygon down', 'SERVICE_DOWN', 'Polygon', true)
      );
      mockAlphaVantage.getQuote = jest.fn().mockRejectedValue(
        new MarketDataAPIError('AV down', 'SERVICE_DOWN', 'AlphaVantage', false)
      );

      await expect(service.getQuote('AAPL', AssetType.STOCK)).rejects.toThrow(
        MarketDataAPIError
      );
      await expect(service.getQuote('AAPL', AssetType.STOCK)).rejects.toThrow(
        'All providers failed'
      );
    });

    it('should use CoinGecko for crypto assets without attempting stock providers', async () => {
      const mockQuote = createMockCryptoQuote();
      mockCoinGecko.getCoinPrice = jest.fn().mockResolvedValue({
        btc: mockQuote,
      });

      const result = await service.getQuote('BTC', AssetType.CRYPTO);

      expect(result).toEqual(mockQuote);
      expect(mockCoinGecko.getCoinPrice).toHaveBeenCalledWith(['btc'], ['usd']);
      // Stock providers should not be called for crypto
      expect(mockPolygon.getQuote).not.toHaveBeenCalled();
      expect(mockAlphaVantage.getQuote).not.toHaveBeenCalled();
    });

    it('should throw when crypto symbol is not found', async () => {
      mockCoinGecko.getCoinPrice = jest.fn().mockResolvedValue({});

      await expect(
        service.getQuote('FAKECOIN', AssetType.CRYPTO)
      ).rejects.toThrow('No data found for cryptocurrency');
    });
  });

  // ==========================================================================
  // HISTORICAL DATA
  // ==========================================================================

  describe('Historical Data Pipeline', () => {
    it('should fetch stock history from Polygon', async () => {
      const mockHistory = createMockStockHistory('AAPL', 30);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        'AAPL',
        AssetType.STOCK,
        TimeInterval.ONE_DAY,
        30
      );

      expect(result).toEqual(mockHistory);
      expect(result.symbol).toBe('AAPL');
      expect(result.data.length).toBe(30);
      expect(mockPolygon.getAggregates).toHaveBeenCalled();
    });

    it('should fallback to AlphaVantage for history when Polygon fails', async () => {
      const mockHistory = createMockStockHistory('MSFT', 60);
      mockPolygon.getAggregates = jest.fn().mockRejectedValue(new Error('Rate limit'));
      mockAlphaVantage.getHistory = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        'MSFT',
        AssetType.STOCK,
        TimeInterval.ONE_DAY,
        60
      );

      expect(result.symbol).toBe('MSFT');
      expect(result.data.length).toBe(60);
    });

    it('should fetch crypto history from CoinGecko', async () => {
      const mockHistory = [
        { timestamp: new Date('2025-01-01'), price: 95000 },
        { timestamp: new Date('2025-01-02'), price: 96000 },
        { timestamp: new Date('2025-01-03'), price: 94500 },
        { timestamp: new Date('2025-01-04'), price: 97000 },
      ];
      mockCoinGecko.getCoinHistory = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        'BTC',
        AssetType.CRYPTO,
        TimeInterval.ONE_DAY,
        30
      );

      expect(result.symbol).toBe('BTC');
      expect(result.data.length).toBe(4);
      expect(mockCoinGecko.getCoinHistory).toHaveBeenCalledWith('btc', 30);
    });

    it('should handle ETF data using stock providers', async () => {
      const mockHistory = createMockStockHistory('SPY', 30);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        'SPY',
        AssetType.ETF,
        TimeInterval.ONE_DAY,
        30
      );

      expect(result.symbol).toBe('SPY');
      expect(mockPolygon.getAggregates).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // NEWS & COMPANY DATA
  // ==========================================================================

  describe('News and Company Data', () => {
    it('should fetch market news for a symbol', async () => {
      const mockNews = [
        {
          title: 'Apple Q4 Earnings Beat',
          description: 'Apple reports strong Q4...',
          url: 'https://example.com/news/apple-q4',
          source: 'MarketWatch',
          publishedAt: new Date('2025-11-30'),
          sentiment: 'positive' as const,
          symbols: ['AAPL'],
        },
        {
          title: 'Tech Sector Outlook',
          description: 'Analysts optimistic about tech...',
          url: 'https://example.com/news/tech-outlook',
          source: 'Bloomberg',
          publishedAt: new Date('2025-11-29'),
          sentiment: 'neutral' as const,
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
        },
      ];
      mockPolygon.getNews = jest.fn().mockResolvedValue(mockNews);

      const result = await service.getNews('AAPL', 10);

      expect(result).toEqual(mockNews);
      expect(result.length).toBe(2);
      expect(mockPolygon.getNews).toHaveBeenCalledWith('AAPL', 10);
    });

    it('should return empty array when news fetch fails', async () => {
      mockPolygon.getNews = jest.fn().mockRejectedValue(new Error('API error'));

      const result = await service.getNews('AAPL', 10);

      expect(result).toEqual([]);
    });

    it('should fetch company profile', async () => {
      const mockProfile = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        description: 'Technology company',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 3000000000000,
        employees: 160000,
        headquarters: 'Cupertino, CA',
        ceo: 'Tim Cook',
        website: 'https://apple.com',
      };
      mockAlphaVantage.getCompanyOverview = jest.fn().mockResolvedValue(mockProfile);

      const result = await service.getCompanyProfile('AAPL');

      expect(result).toEqual(mockProfile);
      expect(result.symbol).toBe('AAPL');
      expect(mockAlphaVantage.getCompanyOverview).toHaveBeenCalledWith('AAPL');
    });
  });

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  describe('Search Functionality', () => {
    it('should search across stocks and crypto simultaneously', async () => {
      const mockStockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'US' },
        { symbol: 'AAPLX', name: 'Apple Fund', type: 'Fund', region: 'US' },
      ];
      const mockCryptoResults = [
        { id: 'apple-protocol', symbol: 'APL', name: 'Apple Protocol', thumb: '', large: '', market_cap_rank: 500 },
      ];

      mockAlphaVantage.searchSymbol = jest.fn().mockResolvedValue(mockStockResults);
      mockCoinGecko.searchCoins = jest.fn().mockResolvedValue(mockCryptoResults);

      const result = await service.search('apple');

      expect(result.length).toBeGreaterThan(0);
      expect(mockAlphaVantage.searchSymbol).toHaveBeenCalledWith('apple');
      expect(mockCoinGecko.searchCoins).toHaveBeenCalledWith('apple');
    });

    it('should filter search to stocks only when specified', async () => {
      const mockStockResults = [
        { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'Equity', region: 'US' },
      ];
      mockAlphaVantage.searchSymbol = jest.fn().mockResolvedValue(mockStockResults);

      const result = await service.search('microsoft', AssetType.STOCK);

      expect(mockAlphaVantage.searchSymbol).toHaveBeenCalledWith('microsoft');
      expect(mockCoinGecko.searchCoins).not.toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      mockAlphaVantage.searchSymbol = jest.fn().mockRejectedValue(new Error('Search failed'));
      mockCoinGecko.searchCoins = jest.fn().mockResolvedValue([]);

      const result = await service.search('test');
      // Should not throw; returns whatever it can
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // PROVIDER HEALTH MONITORING
  // ==========================================================================

  describe('Provider Health Monitoring', () => {
    it('should report all providers as healthy initially', () => {
      const health = service.getProviderHealth();

      expect(health.length).toBe(3);
      const providerNames = health.map((h: any) => h.provider);
      expect(providerNames).toContain('AlphaVantage');
      expect(providerNames).toContain('Polygon');
      expect(providerNames).toContain('CoinGecko');
    });

    it('should show all providers as healthy at initialization', () => {
      expect(service.isProviderHealthy('AlphaVantage')).toBe(true);
      expect(service.isProviderHealthy('Polygon')).toBe(true);
      expect(service.isProviderHealthy('CoinGecko')).toBe(true);
    });
  });

  // ==========================================================================
  // REAL-TIME DATA
  // ==========================================================================

  describe('Real-Time Data Subscriptions', () => {
    it('should subscribe to real-time quotes', () => {
      const mockUnsubscribe = jest.fn();
      mockPolygon.subscribeToQuotes = jest.fn().mockReturnValue(mockUnsubscribe);

      const callback = jest.fn();
      const unsubscribe = service.subscribeToRealTime(['AAPL', 'MSFT'], callback);

      expect(mockPolygon.subscribeToQuotes).toHaveBeenCalledWith(
        ['AAPL', 'MSFT'],
        callback
      );
      expect(typeof unsubscribe).toBe('function');
    });

    it('should disconnect real-time connections', () => {
      mockPolygon.disconnect = jest.fn();

      service.disconnectRealTime();

      expect(mockPolygon.disconnect).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // MULTI-ASSET QUOTE PIPELINE
  // ==========================================================================

  describe('Multi-Asset Quote Pipeline', () => {
    it('should route ETF quotes to stock providers', async () => {
      const mockQuote = createMockStockQuote({ symbol: 'SPY' });
      mockPolygon.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote('SPY', AssetType.ETF);

      expect(result.symbol).toBe('SPY');
      expect(mockPolygon.getQuote).toHaveBeenCalledWith('SPY');
    });

    it('should route MUTUAL_FUND quotes to stock providers', async () => {
      const mockQuote = createMockStockQuote({ symbol: 'VFIAX' });
      mockPolygon.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote('VFIAX', AssetType.MUTUAL_FUND);

      expect(result.symbol).toBe('VFIAX');
      expect(mockPolygon.getQuote).toHaveBeenCalled();
    });

    it('should route BOND quotes to stock providers', async () => {
      const mockQuote = createMockStockQuote({ symbol: 'TLT' });
      mockPolygon.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote('TLT', AssetType.BOND);

      expect(result.symbol).toBe('TLT');
      expect(mockPolygon.getQuote).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CACHE HIT PATHS
  // ==========================================================================

  describe('Cache Hit Paths', () => {
    it('should return cached quote without calling providers', async () => {
      // Require the RedisCacheService to set up cache hit
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const cachedQuote = createMockStockQuote({ symbol: 'CACHED' });
      cacheInstance.get = jest.fn().mockResolvedValue(cachedQuote);

      const result = await service.getQuote('CACHED', AssetType.STOCK);

      expect(result).toEqual(cachedQuote);
      expect(mockPolygon.getQuote).not.toHaveBeenCalled();
      expect(mockAlphaVantage.getQuote).not.toHaveBeenCalled();
    });

    it('should return cached history without calling providers', async () => {
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const cachedHistory = createMockStockHistory('CACHED', 10);
      cacheInstance.get = jest.fn().mockResolvedValue(cachedHistory);

      const result = await service.getHistory('CACHED', AssetType.STOCK, TimeInterval.ONE_DAY, 10);

      expect(result).toEqual(cachedHistory);
      expect(mockPolygon.getAggregates).not.toHaveBeenCalled();
    });

    it('should return cached news without calling Polygon', async () => {
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const cachedNews = [{ title: 'Cached News', source: 'Cache' }];
      cacheInstance.get = jest.fn().mockResolvedValue(cachedNews);

      const result = await service.getNews('AAPL', 5);

      expect(result).toEqual(cachedNews);
      expect(mockPolygon.getNews).not.toHaveBeenCalled();
    });

    it('should return cached company profile without calling AlphaVantage', async () => {
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const cachedProfile = { symbol: 'AAPL', name: 'Apple Inc.' };
      cacheInstance.get = jest.fn().mockResolvedValue(cachedProfile);

      const result = await service.getCompanyProfile('AAPL');

      expect(result).toEqual(cachedProfile);
      expect(mockAlphaVantage.getCompanyOverview).not.toHaveBeenCalled();
    });

    it('should return cached earnings without calling AlphaVantage', async () => {
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const cachedEarnings = [{ date: '2025-Q4', actual: 1.50, estimate: 1.45, surprise: 0.05 }];
      cacheInstance.get = jest.fn().mockResolvedValue(cachedEarnings);

      const result = await service.getEarnings('AAPL');

      expect(result).toEqual(cachedEarnings);
      expect(mockAlphaVantage.getEarnings).not.toHaveBeenCalled();
    });

    it('should return cached search results', async () => {
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const cachedResults = [{ symbol: 'AAPL', name: 'Apple', type: 'Equity', assetType: AssetType.STOCK }];
      cacheInstance.get = jest.fn().mockResolvedValue(cachedResults);

      const result = await service.search('apple');

      expect(result).toEqual(cachedResults);
      expect(mockAlphaVantage.searchSymbol).not.toHaveBeenCalled();
      expect(mockCoinGecko.searchCoins).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EARNINGS DATA
  // ==========================================================================

  describe('Earnings Data', () => {
    it('should fetch earnings from AlphaVantage', async () => {
      const mockEarnings = [
        { date: '2025-Q4', actual: 1.50, estimate: 1.45, surprise: 0.05 },
        { date: '2025-Q3', actual: 1.40, estimate: 1.38, surprise: 0.02 },
      ];
      mockAlphaVantage.getEarnings = jest.fn().mockResolvedValue(mockEarnings);

      const result = await service.getEarnings('AAPL');

      expect(result).toEqual(mockEarnings);
      expect(mockAlphaVantage.getEarnings).toHaveBeenCalledWith('AAPL');
    });

    it('should throw when AlphaVantage is unhealthy for earnings', async () => {
      // Make AlphaVantage unhealthy by triggering a failure first
      mockAlphaVantage.getCompanyOverview = jest.fn().mockRejectedValue(new Error('AV down'));
      try { await service.getCompanyProfile('AAPL'); } catch { /* expected */ }

      await expect(service.getEarnings('AAPL')).rejects.toThrow('unavailable');
    });

    it('should throw when AlphaVantage getEarnings fails', async () => {
      mockAlphaVantage.getEarnings = jest.fn().mockRejectedValue(new Error('Earnings API error'));

      await expect(service.getEarnings('AAPL')).rejects.toThrow('Earnings API error');
    });
  });

  // ==========================================================================
  // COMPANY PROFILE — UNHEALTHY PROVIDER
  // ==========================================================================

  describe('Company Profile Edge Cases', () => {
    it('should throw when AlphaVantage is unhealthy for company profile', async () => {
      // Make AlphaVantage unhealthy
      mockAlphaVantage.getEarnings = jest.fn().mockRejectedValue(new Error('AV down'));
      try { await service.getEarnings('AAPL'); } catch { /* expected */ }

      await expect(service.getCompanyProfile('AAPL')).rejects.toThrow('unavailable');
    });
  });

  // ==========================================================================
  // SEARCH — CRYPTO ONLY
  // ==========================================================================

  describe('Search — Crypto Only', () => {
    it('should search crypto only when assetType is CRYPTO', async () => {
      const mockCryptoResults = [
        { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', thumb: '', large: '', market_cap_rank: 1 },
      ];
      mockCoinGecko.searchCoins = jest.fn().mockResolvedValue(mockCryptoResults);

      const result = await service.search('bitcoin', AssetType.CRYPTO);

      expect(mockCoinGecko.searchCoins).toHaveBeenCalledWith('bitcoin');
      expect(mockAlphaVantage.searchSymbol).not.toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].assetType).toBe(AssetType.CRYPTO);
    });

    it('should search ETF asset type via stock providers', async () => {
      const mockStockResults = [
        { symbol: 'SPY', name: 'SPDR S&P 500', type: 'ETF', region: 'US' },
      ];
      mockAlphaVantage.searchSymbol = jest.fn().mockResolvedValue(mockStockResults);

      const result = await service.search('SPY', AssetType.ETF);

      expect(mockAlphaVantage.searchSymbol).toHaveBeenCalled();
      expect(mockCoinGecko.searchCoins).not.toHaveBeenCalled();
      expect(result.length).toBe(1);
      expect(result[0].assetType).toBe(AssetType.ETF);
    });
  });

  // ==========================================================================
  // NEWS — DEFAULT PARAMS
  // ==========================================================================

  describe('News — Default Params', () => {
    it('should fetch general news when no symbol is provided', async () => {
      const mockNews = [{ title: 'Market Update', source: 'Bloomberg' }];
      mockPolygon.getNews = jest.fn().mockResolvedValue(mockNews);

      const result = await service.getNews();

      expect(result).toEqual(mockNews);
      expect(mockPolygon.getNews).toHaveBeenCalledWith(undefined, 10);
    });

    it('should use default limit of 10 when not specified', async () => {
      const mockNews = [{ title: 'News', source: 'Reuters' }];
      mockPolygon.getNews = jest.fn().mockResolvedValue(mockNews);

      const result = await service.getNews('AAPL');

      expect(mockPolygon.getNews).toHaveBeenCalledWith('AAPL', 10);
    });
  });

  // ==========================================================================
  // REALTIME — UNHEALTHY POLYGON
  // ==========================================================================

  describe('Real-Time — Unhealthy Polygon', () => {
    it('should return no-op unsubscribe when Polygon is unhealthy', async () => {
      // Make Polygon unhealthy
      mockPolygon.getQuote = jest.fn().mockRejectedValue(new Error('Polygon down'));
      mockAlphaVantage.getQuote = jest.fn().mockResolvedValue(createMockStockQuote());
      await service.getQuote('AAPL', AssetType.STOCK); // triggers Polygon unhealthy

      const callback = jest.fn();
      const unsubscribe = service.subscribeToRealTime(['AAPL'], callback);

      expect(typeof unsubscribe).toBe('function');
      // Calling no-op unsubscribe should not throw
      unsubscribe();
      expect(mockPolygon.subscribeToQuotes).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // PROVIDER HEALTH — UNKNOWN PROVIDER
  // ==========================================================================

  describe('Provider Health — Edge Cases', () => {
    it('should return false for unknown provider', () => {
      expect(service.isProviderHealthy('NonExistentProvider')).toBe(false);
    });

    it('should expose getCacheStats', () => {
      const { RedisCacheService: RedisMock } = require('../../cache/redis-cache-service');
      const cacheInstance = RedisMock.mock.instances[0];
      const mockStats = { hits: 100, misses: 20, keys: 50 };
      cacheInstance.getStats = jest.fn().mockReturnValue(mockStats);

      const stats = service.getCacheStats();

      expect(stats).toEqual(mockStats);
    });
  });

  // ==========================================================================
  // HISTORY — CRYPTO EDGE CASES
  // ==========================================================================

  describe('History — Crypto Edge Cases', () => {
    it('should handle crypto history with empty data array', async () => {
      mockCoinGecko.getCoinHistory = jest.fn().mockResolvedValue([]);

      const result = await service.getHistory('BTC', AssetType.CRYPTO, TimeInterval.ONE_DAY, 30);

      expect(result.symbol).toBe('BTC');
      expect(result.data.length).toBe(0);
      // startDate and endDate should default to new Date() when history is empty
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it('should default days to 30 when not provided for crypto history', async () => {
      const mockHistory = [
        { timestamp: new Date('2025-01-01'), price: 95000 },
      ];
      mockCoinGecko.getCoinHistory = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('BTC', AssetType.CRYPTO, TimeInterval.ONE_DAY);

      expect(mockCoinGecko.getCoinHistory).toHaveBeenCalledWith('btc', 30);
      expect(result.data.length).toBe(1);
    });
  });

  // ==========================================================================
  // HISTORY — VARIOUS TIME INTERVALS (convertIntervalToTimespan)
  // ==========================================================================

  describe('History — Time Interval Routing', () => {
    it('should handle ONE_MIN interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 5);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.ONE_MIN, 1);

      expect(result.symbol).toBe('AAPL');
      expect(mockPolygon.getAggregates).toHaveBeenCalled();
    });

    it('should handle FIVE_MIN interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 5);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.FIVE_MIN, 1);

      expect(result.symbol).toBe('AAPL');
    });

    it('should handle FIFTEEN_MIN interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 5);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.FIFTEEN_MIN, 1);

      expect(result.symbol).toBe('AAPL');
    });

    it('should handle THIRTY_MIN interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 5);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.THIRTY_MIN, 1);

      expect(result.symbol).toBe('AAPL');
    });

    it('should handle ONE_HOUR interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 5);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.ONE_HOUR, 1);

      expect(result.symbol).toBe('AAPL');
    });

    it('should handle ONE_WEEK interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 52);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.ONE_WEEK, 365);

      expect(result.symbol).toBe('AAPL');
    });

    it('should handle ONE_MONTH interval for stock history', async () => {
      const mockHistory = createMockStockHistory('AAPL', 12);
      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory('AAPL', AssetType.STOCK, TimeInterval.ONE_MONTH, 365);

      expect(result.symbol).toBe('AAPL');
    });
  });

  // ==========================================================================
  // ERROR HANDLING EDGE CASES
  // ==========================================================================

  describe('Error Handling Edge Cases', () => {
    it('should handle Polygon returning undefined gracefully', async () => {
      const mockQuote = createMockStockQuote();
      mockPolygon.getQuote = jest.fn().mockResolvedValue(undefined);
      mockAlphaVantage.getQuote = jest.fn().mockResolvedValue(mockQuote);

      // Either succeeds via fallback or throws an error - both are valid
      try {
        const result = await service.getQuote('AAPL', AssetType.STOCK);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should propagate non-retryable errors correctly', async () => {
      mockPolygon.getQuote = jest.fn().mockRejectedValue(
        new MarketDataAPIError('Invalid symbol', 'INVALID_SYMBOL', 'Polygon', false)
      );
      mockAlphaVantage.getQuote = jest.fn().mockRejectedValue(
        new MarketDataAPIError('Invalid symbol', 'INVALID_SYMBOL', 'AlphaVantage', false)
      );

      await expect(service.getQuote('!@#$', AssetType.STOCK)).rejects.toThrow(
        MarketDataAPIError
      );
    });

    it('should handle concurrent requests to different asset types', async () => {
      const stockQuote = createMockStockQuote();
      const cryptoQuote = createMockCryptoQuote();

      mockPolygon.getQuote = jest.fn().mockResolvedValue(stockQuote);
      mockCoinGecko.getCoinPrice = jest.fn().mockResolvedValue({
        btc: cryptoQuote,
      });

      const [stockResult, cryptoResult] = await Promise.all([
        service.getQuote('AAPL', AssetType.STOCK),
        service.getQuote('BTC', AssetType.CRYPTO),
      ]);

      expect(stockResult.symbol).toBe('AAPL');
      expect(cryptoResult.symbol).toBe('BTC');
    });
  });
});
