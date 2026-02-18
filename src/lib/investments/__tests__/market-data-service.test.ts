/**
 * Unified Market Data Service Tests
 *
 * Comprehensive test suite for the unified market data service
 * Tests provider fallback, caching, health checks, and error handling
 */

// Use global jest instead of @jest/globals to avoid type issues with mocked functions
import { UnifiedMarketDataService } from "../market-data-service";
import {
  AssetType,
  TimeInterval,
  MarketDataAPIError,
} from "../types/market-data.types";

// Mock the integrations
jest.mock("../../integrations/alpha-vantage");
jest.mock("../../integrations/polygon");
jest.mock("../../integrations/coingecko");
jest.mock("../../cache/redis-cache-service");

import { AlphaVantageClient } from "../../integrations/alpha-vantage";
import { PolygonClient } from "../../integrations/polygon";
import { CoinGeckoClient } from "../../integrations/coingecko";

describe("UnifiedMarketDataService", () => {
  let service: UnifiedMarketDataService;
  let mockAlphaVantage: any;
  let mockPolygon: any;
  let mockCoinGecko: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new UnifiedMarketDataService({
      alphaVantageKey: "test-key",
      polygonKey: "test-key",
      polygonTier: "free",
      enableRedis: false,
    });

    // Get mock instances
    mockAlphaVantage = (AlphaVantageClient as any).mock.instances[0];
    mockPolygon = (PolygonClient as any).mock.instances[0];
    mockCoinGecko = (CoinGeckoClient as any).mock.instances[0];
  });

  afterEach(() => {
    service.cleanup();
  });

  // ============================================================================
  // STOCK QUOTE TESTS
  // ============================================================================

  describe("getQuote - Stock", () => {
    it("should get stock quote from Polygon (primary provider)", async () => {
      const mockQuote = {
        symbol: "AAPL",
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        high: 151.0,
        low: 148.5,
        open: 149.0,
        previousClose: 147.75,
        timestamp: new Date(),
      };

      mockPolygon.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote("AAPL", AssetType.STOCK);

      expect(result).toEqual(mockQuote);
      expect(mockPolygon.getQuote).toHaveBeenCalledWith("AAPL");
      expect(mockAlphaVantage.getQuote).not.toHaveBeenCalled();
    });

    it("should fallback to Alpha Vantage when Polygon fails", async () => {
      const mockQuote = {
        symbol: "AAPL",
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 50000000,
        high: 151.0,
        low: 148.5,
        open: 149.0,
        previousClose: 147.75,
        timestamp: new Date(),
      };

      mockPolygon.getQuote = jest
        .fn()
        .mockRejectedValue(
          new MarketDataAPIError(
            "Rate limit exceeded",
            "RATE_LIMIT",
            "Polygon",
            true,
          ),
        );
      mockAlphaVantage.getQuote = jest.fn().mockResolvedValue(mockQuote);

      const result = await service.getQuote("AAPL", AssetType.STOCK);

      expect(result).toEqual(mockQuote);
      expect(mockPolygon.getQuote).toHaveBeenCalledWith("AAPL");
      expect(mockAlphaVantage.getQuote).toHaveBeenCalledWith("AAPL");
    });

    it("should throw error when all providers fail", async () => {
      mockPolygon.getQuote = jest
        .fn()
        .mockRejectedValue(
          new MarketDataAPIError(
            "Rate limit exceeded",
            "RATE_LIMIT",
            "Polygon",
            true,
          ),
        );
      mockAlphaVantage.getQuote = jest
        .fn()
        .mockRejectedValue(
          new MarketDataAPIError(
            "API error",
            "API_ERROR",
            "AlphaVantage",
            false,
          ),
        );

      await expect(service.getQuote("AAPL", AssetType.STOCK)).rejects.toThrow(
        MarketDataAPIError,
      );
      await expect(service.getQuote("AAPL", AssetType.STOCK)).rejects.toThrow(
        "All providers failed",
      );
    });
  });

  // ============================================================================
  // CRYPTO QUOTE TESTS
  // ============================================================================

  describe("getQuote - Crypto", () => {
    it("should get crypto quote from CoinGecko", async () => {
      const mockQuote = {
        symbol: "BTC",
        name: "bitcoin",
        price: 45000,
        change24h: 1500,
        changePercent24h: 3.45,
        marketCap: 850000000000,
        volume24h: 25000000000,
        circulatingSupply: 19000000,
        high24h: 46000,
        low24h: 43500,
        timestamp: new Date(),
      };

      mockCoinGecko.getCoinPrice = jest.fn().mockResolvedValue({
        btc: mockQuote,
      });

      const result = await service.getQuote("BTC", AssetType.CRYPTO);

      expect(result).toEqual(mockQuote);
      expect(mockCoinGecko.getCoinPrice).toHaveBeenCalledWith(["btc"], ["usd"]);
    });

    it("should throw error when crypto not found", async () => {
      mockCoinGecko.getCoinPrice = jest.fn().mockResolvedValue({});

      await expect(
        service.getQuote("INVALID", AssetType.CRYPTO),
      ).rejects.toThrow("No data found for cryptocurrency");
    });
  });

  // ============================================================================
  // HISTORICAL DATA TESTS
  // ============================================================================

  describe("getHistory", () => {
    it("should get stock history from Polygon", async () => {
      const mockHistory = {
        symbol: "AAPL",
        interval: TimeInterval.ONE_DAY,
        data: [
          {
            timestamp: new Date("2024-01-01"),
            open: 150,
            high: 152,
            low: 149,
            close: 151,
            volume: 50000000,
          },
        ],
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      };

      mockPolygon.getAggregates = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        "AAPL",
        AssetType.STOCK,
        TimeInterval.ONE_DAY,
        30,
      );

      expect(result).toEqual(mockHistory);
      expect(mockPolygon.getAggregates).toHaveBeenCalled();
    });

    it("should get crypto history from CoinGecko", async () => {
      const mockHistory = [
        { timestamp: new Date("2024-01-01"), price: 45000 },
        { timestamp: new Date("2024-01-02"), price: 46000 },
      ];

      mockCoinGecko.getCoinHistory = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        "BTC",
        AssetType.CRYPTO,
        TimeInterval.ONE_DAY,
        30,
      );

      expect(result.symbol).toBe("BTC");
      expect(result.data.length).toBe(2);
      expect(mockCoinGecko.getCoinHistory).toHaveBeenCalledWith("btc", 30);
    });
  });

  // ============================================================================
  // NEWS TESTS
  // ============================================================================

  describe("getNews", () => {
    it("should get news from Polygon", async () => {
      const mockNews = [
        {
          title: "Apple announces new product",
          description: "Apple unveils latest innovation",
          url: "https://example.com/news/1",
          source: "TechNews",
          publishedAt: new Date(),
          sentiment: "positive" as const,
          symbols: ["AAPL"],
        },
      ];

      mockPolygon.getNews = jest.fn().mockResolvedValue(mockNews);

      const result = await service.getNews("AAPL", 10);

      expect(result).toEqual(mockNews);
      expect(mockPolygon.getNews).toHaveBeenCalledWith("AAPL", 10);
    });

    it("should return empty array when Polygon fails", async () => {
      mockPolygon.getNews = jest.fn().mockRejectedValue(new Error("API error"));

      const result = await service.getNews("AAPL", 10);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // COMPANY PROFILE TESTS
  // ============================================================================

  describe("getCompanyProfile", () => {
    it("should get company profile from Alpha Vantage", async () => {
      const mockProfile = {
        symbol: "AAPL",
        name: "Apple Inc.",
        description: "Technology company",
        sector: "Technology",
        industry: "Consumer Electronics",
        marketCap: 3000000000000,
        employees: 150000,
        headquarters: "Cupertino, CA",
        founded: "1976",
        ceo: "Tim Cook",
        website: "https://apple.com",
      };

      mockAlphaVantage.getCompanyOverview = jest
        .fn()
        .mockResolvedValue(mockProfile);

      const result = await service.getCompanyProfile("AAPL");

      expect(result).toEqual(mockProfile);
      expect(mockAlphaVantage.getCompanyOverview).toHaveBeenCalledWith("AAPL");
    });
  });

  // ============================================================================
  // SEARCH TESTS
  // ============================================================================

  describe("search", () => {
    it("should search stocks and crypto", async () => {
      const mockStockResults = [
        { symbol: "AAPL", name: "Apple Inc.", type: "Equity", region: "US" },
      ];
      const mockCryptoResults = [
        {
          id: "bitcoin",
          symbol: "btc",
          name: "Bitcoin",
          thumb: "",
          large: "",
          market_cap_rank: 1,
        },
      ];

      mockAlphaVantage.searchSymbol = jest
        .fn()
        .mockResolvedValue(mockStockResults);
      mockCoinGecko.searchCoins = jest
        .fn()
        .mockResolvedValue(mockCryptoResults);

      const result = await service.search("app");

      expect(result.length).toBeGreaterThan(0);
      expect(mockAlphaVantage.searchSymbol).toHaveBeenCalledWith("app");
      expect(mockCoinGecko.searchCoins).toHaveBeenCalledWith("app");
    });

    it("should search only stocks when assetType is STOCK", async () => {
      const mockStockResults = [
        { symbol: "AAPL", name: "Apple Inc.", type: "Equity", region: "US" },
      ];

      mockAlphaVantage.searchSymbol = jest
        .fn()
        .mockResolvedValue(mockStockResults);

      const result = await service.search("app", AssetType.STOCK);

      expect(mockAlphaVantage.searchSymbol).toHaveBeenCalledWith("app");
      expect(mockCoinGecko.searchCoins).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // HEALTH CHECK TESTS
  // ============================================================================

  describe("Provider Health", () => {
    it("should return health status for all providers", () => {
      const health = service.getProviderHealth();

      expect(health.length).toBe(3);
      expect(health.map((h) => h.provider)).toContain("AlphaVantage");
      expect(health.map((h) => h.provider)).toContain("Polygon");
      expect(health.map((h) => h.provider)).toContain("CoinGecko");
    });

    it("should check if provider is healthy", () => {
      expect(service.isProviderHealthy("AlphaVantage")).toBe(true);
      expect(service.isProviderHealthy("Polygon")).toBe(true);
      expect(service.isProviderHealthy("CoinGecko")).toBe(true);
    });
  });

  // ============================================================================
  // REAL-TIME DATA TESTS
  // ============================================================================

  describe("Real-time Data", () => {
    it("should subscribe to real-time quotes", () => {
      const mockUnsubscribe = jest.fn();
      mockPolygon.subscribeToQuotes = jest
        .fn()
        .mockReturnValue(mockUnsubscribe);

      const callback = jest.fn();
      const unsubscribe = service.subscribeToRealTime(
        ["AAPL", "GOOGL"],
        callback,
      );

      expect(mockPolygon.subscribeToQuotes).toHaveBeenCalledWith(
        ["AAPL", "GOOGL"],
        callback,
      );
      expect(typeof unsubscribe).toBe("function");
    });

    it("should disconnect from real-time data", () => {
      mockPolygon.disconnect = jest.fn();

      service.disconnectRealTime();

      expect(mockPolygon.disconnect).toHaveBeenCalled();
    });
  });
});
