/**
 * Tests for Portfolio Analysis API Route
 *
 * Coverage:
 * - POST endpoint (comprehensive portfolio analysis)
 * - GET endpoint (API documentation)
 * - Authentication
 * - Validation
 * - Market data fetching for multiple holdings
 * - Error handling
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/investments/services/MarketDataService");
jest.mock("@/lib/investments/services/InvestmentAnalysisEngine");
jest.mock("@/lib/investments/services/AnalysisCacheService");

// Import after mocks are set up
import { GET, POST } from "../route";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { getMarketDataService } from "@/lib/investments/services/MarketDataService";
import { getInvestmentAnalysisEngine } from "@/lib/investments/services/InvestmentAnalysisEngine";
import { getAnalysisCacheService } from "@/lib/investments/services/AnalysisCacheService";

interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

// Helper function to create mock NextRequest
function createMockRequest(urlString: string, options?: MockRequestOptions) {
  const parsedUrl = new URL(urlString);
  const request = {
    url: urlString,
    method: options?.method || "GET",
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: new Headers(),
    nextUrl: parsedUrl,
  } as unknown as NextRequest;
  return request;
}

describe("/api/investments/portfolio-analysis", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockHoldings = [
    {
      symbol: "AAPL",
      shares: 10,
      averageCost: 150.0,
      assetClass: "stock" as const,
      sector: "Technology",
    },
    {
      symbol: "MSFT",
      shares: 5,
      averageCost: 250.0,
      assetClass: "stock" as const,
      sector: "Technology",
    },
  ];

  const mockQuotes = {
    AAPL: {
      symbol: "AAPL",
      price: 155.0,
      change: 5.0,
      changePercent: 3.33,
      volume: 50000000,
      timestamp: new Date(),
    },
    MSFT: {
      symbol: "MSFT",
      price: 260.0,
      change: 10.0,
      changePercent: 4.0,
      volume: 30000000,
      timestamp: new Date(),
    },
  };

  const mockHistoricalData = Array.from({ length: 50 }, (_, i) => ({
    close: 150 + Math.random() * 10,
    high: 155 + Math.random() * 10,
    low: 145 + Math.random() * 10,
    volume: 50000000 + Math.random() * 10000000,
    timestamp: new Date(Date.now() - i * 86400000),
  }));

  const createMockPortfolioAnalysis = (portfolioId: string = "default") => ({
    portfolioId,
    analyzedAt: new Date(),
    totalValue: 2800.0,
    totalCost: 2750.0,
    totalGainLoss: 50.0,
    totalGainLossPercent: 1.82,
    portfolioHealth: 75,
    portfolioRisk: "moderate" as const,
    diversificationScore: 65,
    overallSignal: "hold" as const,
    overallConfidence: 0.7,
    holdingAnalyses: new Map(),
    positionAdjustments: [],
    rebalancingRecommendations: [],
    summary: "Portfolio is well-balanced with moderate risk",
  });

  const mockMarketDataService = {
    getQuote: jest.fn(),
    getHistoricalData: jest.fn(),
  };

  const mockAnalysisEngine = {
    analyzePortfolio: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getMarketDataService as jest.Mock).mockReturnValue(mockMarketDataService);
    (getInvestmentAnalysisEngine as jest.Mock).mockReturnValue(
      mockAnalysisEngine,
    );
    (getAnalysisCacheService as jest.Mock).mockReturnValue(mockCacheService);
    mockCacheService.get.mockReturnValue(null); // No cache by default
  });

  describe("GET /api/investments/portfolio-analysis", () => {
    it("should return API documentation", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: { id: "user-123", email: "test@example.com" },
      });
      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.endpoint).toBe("/api/investments/portfolio-analysis");
      expect(data.method).toBe("POST");
      expect(data.description).toContain("portfolio");
    });
  });

  describe("POST /api/investments/portfolio-analysis", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      mockMarketDataService.getQuote.mockImplementation((symbol: string) =>
        Promise.resolve(mockQuotes[symbol as keyof typeof mockQuotes]),
      );
      mockMarketDataService.getHistoricalData.mockResolvedValue(
        mockHistoricalData,
      );
      mockAnalysisEngine.analyzePortfolio.mockImplementation(
        (portfolioId: string) =>
          Promise.resolve(createMockPortfolioAnalysis(portfolioId)),
      );
    });

    it("should perform portfolio analysis successfully", async () => {
      const validInput = {
        portfolioId: "my-portfolio",
        holdings: mockHoldings,
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.portfolioId).toBe("my-portfolio");
      expect(data.data.totalValue).toBe(2800.0);
      expect(mockMarketDataService.getQuote).toHaveBeenCalledTimes(2);
      expect(mockMarketDataService.getHistoricalData).toHaveBeenCalledTimes(2);
      expect(mockAnalysisEngine.analyzePortfolio).toHaveBeenCalled();
    });

    it("should use default portfolio ID if not provided", async () => {
      const validInput = {
        holdings: mockHoldings,
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAnalysisEngine.analyzePortfolio).toHaveBeenCalledWith(
        "default",
        expect.any(Array),
        expect.any(Map),
        expect.any(Object),
      );
    });

    it("should auto-fetch current prices if not provided", async () => {
      const holdingsWithoutPrices = mockHoldings.map((h) => ({
        ...h,
        currentPrice: undefined,
      }));
      const validInput = {
        holdings: holdingsWithoutPrices,
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockMarketDataService.getQuote).toHaveBeenCalledWith("AAPL");
      expect(mockMarketDataService.getQuote).toHaveBeenCalledWith("MSFT");
    });

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: { holdings: mockHoldings },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      // withAuth guard 401 body is { error: "Unauthorized" } (no success field)
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for empty holdings array", async () => {
      const invalidInput = {
        holdings: [],
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: invalidInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for invalid holding data", async () => {
      const invalidInput = {
        holdings: [
          {
            symbol: "AAPL",
            shares: -10, // Invalid: negative shares
            averageCost: 150.0,
          },
        ],
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: invalidInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle market data fetch errors gracefully", async () => {
      // Portfolio analysis continues even if individual holdings fail
      // It uses averageCost as fallback for currentPrice
      mockMarketDataService.getQuote.mockRejectedValue(
        new Error("Market data unavailable"),
      );
      mockMarketDataService.getHistoricalData.mockRejectedValue(
        new Error("Historical data unavailable"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: { holdings: mockHoldings, timeframe: "1d" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      // Should still succeed with fallback prices
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle analysis engine errors", async () => {
      mockAnalysisEngine.analyzePortfolio.mockRejectedValue(
        new Error("Analysis failed"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: { holdings: mockHoldings, timeframe: "1d" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should uppercase all symbols automatically", async () => {
      const lowercaseHoldings = [
        {
          symbol: "aapl",
          shares: 10,
          averageCost: 150.0,
          assetClass: "stock" as const,
        },
        {
          symbol: "msft",
          shares: 5,
          averageCost: 250.0,
          assetClass: "stock" as const,
        },
      ];

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: { holdings: lowercaseHoldings, timeframe: "1d" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockMarketDataService.getQuote).toHaveBeenCalledWith("AAPL");
      expect(mockMarketDataService.getQuote).toHaveBeenCalledWith("MSFT");
    });

    it("should handle user profile preferences", async () => {
      const validInput = {
        holdings: mockHoldings,
        timeframe: "1d",
        userProfile: {
          riskTolerance: "aggressive",
          investmentHorizon: "short_term",
        },
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/portfolio-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("negative-auth – /api/investments/portfolio-analysis", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });
    });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
      const res = await GET(
        createMockRequest(
          "http://localhost:3000/api/investments/portfolio-analysis",
        ),
      );
      expect(res.status).toBe(401);
    });

    it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
      const res = await POST(
        createMockRequest(
          "http://localhost:3000/api/investments/portfolio-analysis",
          { method: "POST", body: { holdings: [] } },
        ),
      );
      expect(res.status).toBe(401);
    });
  });
});
