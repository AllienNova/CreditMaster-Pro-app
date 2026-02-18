/**
 * Tests for Comprehensive Analysis API Route
 *
 * Coverage:
 * - POST endpoint (comprehensive investment analysis)
 * - GET endpoint (API documentation)
 * - Authentication
 * - Validation
 * - Market data fetching
 * - Error handling
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
jest.mock("@/lib/auth/jwt-validation");
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

describe("/api/investments/comprehensive-analysis", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockQuote = {
    symbol: "AAPL",
    price: 150.0,
    change: 2.5,
    changePercent: 1.69,
    volume: 50000000,
    timestamp: new Date(),
  };

  const mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
    close: 150 + Math.random() * 10,
    high: 155 + Math.random() * 10,
    low: 145 + Math.random() * 10,
    volume: 50000000 + Math.random() * 10000000,
    timestamp: new Date(Date.now() - i * 86400000),
  }));

  const mockAnalysis = {
    symbol: "AAPL",
    analyzedAt: new Date(),
    currentPrice: 150.0,
    overallSignal: "buy" as const,
    overallConfidence: 0.75,
    riskLevel: "moderate" as const,
    compositeScore: {
      overall: 72,
      technical: 75,
      fundamental: 80,
      sentiment: 65,
      pattern: 70,
      confidence: 0.75,
      signal: "buy",
    },
    correlationAnalysis: {
      overallAlignment: 0.68,
      alignmentLevel: "moderate" as const,
    },
    keyInsights: ["Strong technical momentum", "Positive earnings growth"],
    risks: ["Market volatility", "Sector rotation risk"],
    opportunities: ["Breakout potential", "Dividend growth"],
    summary: "Overall positive outlook with moderate risk",
  };

  const mockMarketDataService = {
    getQuote: jest.fn(),
    getHistoricalData: jest.fn(),
  };

  const mockAnalysisEngine = {
    analyzeInvestment: jest.fn(),
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

  describe("GET /api/investments/comprehensive-analysis", () => {
    it("should return API documentation", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
      );
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.endpoint).toBe("/api/investments/comprehensive-analysis");
      expect(data.method).toBe("POST");
      expect(data.services).toHaveLength(6);
      expect(data.services).toContain("Technical Analysis");
      expect(data.services).toContain("Fundamental Analysis");
    });
  });

  describe("POST /api/investments/comprehensive-analysis", () => {
    beforeEach(() => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
      });
      mockMarketDataService.getQuote.mockResolvedValue(mockQuote);
      mockMarketDataService.getHistoricalData.mockResolvedValue(
        mockHistoricalData,
      );
      mockAnalysisEngine.analyzeInvestment.mockResolvedValue(mockAnalysis);
    });

    it("should perform comprehensive analysis successfully", async () => {
      const validInput = {
        symbol: "AAPL",
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.symbol).toBe("AAPL");
      expect(data.data.overallSignal).toBe("buy");
      expect(data.meta.processingTime).toBeDefined();
      expect(mockMarketDataService.getQuote).toHaveBeenCalledWith("AAPL");
      expect(mockMarketDataService.getHistoricalData).toHaveBeenCalledWith(
        "AAPL",
        "1d",
        100,
      );
      expect(mockAnalysisEngine.analyzeInvestment).toHaveBeenCalled();
    });

    it("should handle custom weights", async () => {
      const validInput = {
        symbol: "AAPL",
        timeframe: "1d",
        customWeights: {
          technical: 0.4,
          fundamental: 0.3,
          sentiment: 0.2,
          pattern: 0.1,
        },
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Note: customWeights is accepted in the request but not currently passed to analyzeInvestment
      // This is a known limitation - the route validates customWeights but doesn't use them yet
      expect(mockAnalysisEngine.analyzeInvestment).toHaveBeenCalledWith(
        "AAPL",
        150.0,
        expect.any(Array), // Converted historical data
        expect.objectContaining({
          timeframe: "1d",
        }),
      );
    });

    it("should handle user profile preferences", async () => {
      const validInput = {
        symbol: "AAPL",
        timeframe: "1d",
        userProfile: {
          riskTolerance: "conservative",
          investmentHorizon: "long_term",
          preferredAssetClasses: ["stocks", "etfs"],
        },
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
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

    it("should return 401 if not authenticated", async () => {
      (jwtValidation.validateFromHeaders as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: { symbol: "AAPL" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid symbol", async () => {
      const invalidInput = {
        symbol: "",
        timeframe: "1d",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
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

    it("should return 400 for invalid timeframe", async () => {
      const invalidInput = {
        symbol: "AAPL",
        timeframe: "invalid",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
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

    it("should handle market data fetch errors", async () => {
      mockMarketDataService.getQuote.mockRejectedValue(
        new Error("Market data unavailable"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: { symbol: "AAPL", timeframe: "1d" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Market data unavailable");
    });

    it("should handle analysis engine errors", async () => {
      mockAnalysisEngine.analyzeInvestment.mockRejectedValue(
        new Error("Analysis failed"),
      );

      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: { symbol: "AAPL", timeframe: "1d" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should uppercase symbol automatically", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: { symbol: "aapl", timeframe: "1d" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockMarketDataService.getQuote).toHaveBeenCalledWith("AAPL");
    });

    it("should use default timeframe if not provided", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/investments/comprehensive-analysis",
        {
          method: "POST",
          body: { symbol: "AAPL" },
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockMarketDataService.getHistoricalData).toHaveBeenCalledWith(
        "AAPL",
        "1d",
        100,
      );
    });
  });
});
