/**
 * Asset Allocation Analysis API Tests
 *
 * Integration tests for the allocation analysis endpoint
 */

import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing modules that use them
const mockValidateFromHeaders = jest.fn();
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));
jest.mock("@/lib/investments/services/AssetAllocationService");

// Import after mocks are set up
import { POST, GET } from "../route";
import { getAssetAllocationService } from "@/lib/investments/services/AssetAllocationService";
import {
  RiskTolerance,
  AssetClass,
} from "@/lib/investments/types/asset-allocation.types";

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

describe("Asset Allocation Analysis API", () => {
  const mockAnalysisResult = {
    portfolioId: "portfolio-1",
    analyzedAt: new Date(),
    currentAllocations: [
      { assetClass: AssetClass.STOCKS, percentage: 60, value: 18000 },
      { assetClass: AssetClass.BONDS, percentage: 30, value: 9000 },
      { assetClass: AssetClass.CASH, percentage: 10, value: 3000 },
    ],
    recommendedModel: {
      name: "Moderate",
      riskTolerance: RiskTolerance.MODERATE,
      allocations: [],
      expectedReturn: 0.07,
      expectedVolatility: 0.12,
      sharpeRatio: 0.583,
    },
    deviationFromTarget: 5.2,
    needsRebalancing: true,
    rebalancingRecommendations: [],
    diversificationScore: 75,
    riskMetrics: {
      portfolioVolatility: 0.12,
      portfolioBeta: 1.0,
      valueAtRisk: 3000,
      conditionalVaR: 4500,
      maxDrawdown: 0.15,
    },
    performanceMetrics: {
      expectedReturn: 0.07,
      sharpeRatio: 0.583,
      sortinoRatio: 0.75,
      informationRatio: 0.5,
    },
  };

  const mockAllocationModel = {
    name: "Moderate",
    riskTolerance: RiskTolerance.MODERATE,
    allocations: [
      {
        assetClass: AssetClass.STOCKS,
        targetPercentage: 50,
        minPercentage: 40,
        maxPercentage: 60,
      },
      {
        assetClass: AssetClass.BONDS,
        targetPercentage: 35,
        minPercentage: 25,
        maxPercentage: 45,
      },
      {
        assetClass: AssetClass.CASH,
        targetPercentage: 15,
        minPercentage: 10,
        maxPercentage: 20,
      },
    ],
    expectedReturn: 0.07,
    expectedVolatility: 0.12,
    sharpeRatio: 0.583,
  };

  const mockAllocationService = {
    analyzeAllocation: jest.fn(),
    getAllocationModel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // allocation-analysis routes are wrapped in withAuth (TASK-AUTH-03e)
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-123", email: "test@example.com" },
    });
    (getAssetAllocationService as jest.Mock).mockReturnValue(
      mockAllocationService,
    );

    // Mock analyzeAllocation to return different results based on risk tolerance
    mockAllocationService.analyzeAllocation.mockImplementation(
      async (portfolio: any, riskTolerance: RiskTolerance) => {
        return {
          ...mockAnalysisResult,
          recommendedModel: {
            ...mockAnalysisResult.recommendedModel,
            riskTolerance,
            name:
              riskTolerance === RiskTolerance.VERY_AGGRESSIVE
                ? "Very Aggressive"
                : "Moderate",
          },
        };
      },
    );

    // Mock getAllocationModel to return different models based on risk tolerance
    mockAllocationService.getAllocationModel.mockImplementation(
      (riskTolerance: RiskTolerance) => {
        return {
          ...mockAllocationModel,
          riskTolerance,
          name:
            riskTolerance === RiskTolerance.VERY_AGGRESSIVE
              ? "Very Aggressive"
              : riskTolerance === RiskTolerance.AGGRESSIVE
                ? "Aggressive"
                : riskTolerance === RiskTolerance.CONSERVATIVE
                  ? "Conservative"
                  : riskTolerance === RiskTolerance.VERY_CONSERVATIVE
                    ? "Very Conservative"
                    : "Moderate",
        };
      },
    );
  });

  const mockPortfolio = {
    id: "portfolio-1",
    userId: "user-1",
    name: "Test Portfolio",
    holdings: [
      {
        id: "holding-1",
        userId: "user-1",
        symbol: "AAPL",
        assetClass: "stock",
        quantity: 100,
        avgCostBasis: 150,
        currentPrice: 180,
        marketValue: 18000,
        unrealizedGain: 3000,
        unrealizedGainPercent: 20,
        realizedGain: 0,
        weight: 0.6,
        sector: "Technology",
        purchaseDate: "2023-01-01T00:00:00.000Z",
        lastUpdated: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "holding-2",
        userId: "user-1",
        symbol: "AGG",
        assetClass: "bond",
        quantity: 100,
        avgCostBasis: 105,
        currentPrice: 108,
        marketValue: 10800,
        unrealizedGain: 300,
        unrealizedGainPercent: 2.86,
        realizedGain: 0,
        weight: 0.36,
        sector: "Fixed Income",
        purchaseDate: "2023-02-01T00:00:00.000Z",
        lastUpdated: "2024-01-01T00:00:00.000Z",
      },
    ],
    totalValue: 30000,
    totalCost: 26500,
    totalGain: 3500,
    totalGainPercent: 13.2,
    dayChange: 250,
    dayChangePercent: 0.83,
    cashBalance: 1200,
    assetAllocation: [
      { name: "Stocks", value: 18000, percentage: 60 },
      { name: "Bonds", value: 10800, percentage: 36 },
      { name: "Cash", value: 1200, percentage: 4 },
    ],
    sectorAllocation: [
      { name: "Technology", value: 18000, percentage: 60 },
      { name: "Fixed Income", value: 10800, percentage: 36 },
    ],
    performanceHistory: [
      {
        date: "2024-01-01T00:00:00.000Z",
        value: 28000,
        change: 0,
        changePercent: 0,
      },
      {
        date: "2024-06-01T00:00:00.000Z",
        value: 29500,
        change: 1500,
        changePercent: 5.36,
      },
    ],
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  describe("POST /api/investments/allocation-analysis", () => {
    it("should analyze portfolio allocation", async () => {
      const validInput = {
        portfolio: mockPortfolio,
        riskTolerance: RiskTolerance.MODERATE,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
        {
          method: "POST",
          body: validInput,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockAllocationService.analyzeAllocation).toHaveBeenCalled();
    });

    it("should return 400 for invalid request", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
        {
          method: "POST",
          body: JSON.stringify({
            // Missing required fields
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should accept optional constraints", async () => {
      const validInputWithConstraints = {
        portfolio: mockPortfolio,
        riskTolerance: RiskTolerance.AGGRESSIVE,
        constraints: {
          transactionCostPerTrade: 10,
          minPositionSize: 0.01,
          maxAssetClassConcentration: 0.5,
        },
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
        {
          method: "POST",
          body: validInputWithConstraints,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAllocationService.analyzeAllocation).toHaveBeenCalledWith(
        expect.anything(),
        RiskTolerance.AGGRESSIVE,
        expect.objectContaining({
          transactionCostPerTrade: 10,
          minPositionSize: 0.01,
          maxAssetClassConcentration: 0.5,
        }),
      );
    });
  });

  describe("GET /api/investments/allocation-analysis", () => {
    it("should return all allocation models", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data).toHaveLength(5);
      expect(mockAllocationService.getAllocationModel).toHaveBeenCalledTimes(5);
    });

    it("should return specific allocation model", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis?riskTolerance=moderate",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.riskTolerance).toBe(RiskTolerance.MODERATE);
      expect(mockAllocationService.getAllocationModel).toHaveBeenCalledWith(
        RiskTolerance.MODERATE,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty portfolio", async () => {
      const emptyPortfolio = {
        ...mockPortfolio,
        holdings: [],
        totalValue: 0,
        totalCost: 0,
        totalGain: 0,
        totalGainPercent: 0,
        cashBalance: 0,
        assetAllocation: [],
        sectorAllocation: [],
      };

      const emptyInput = {
        portfolio: emptyPortfolio,
        riskTolerance: RiskTolerance.MODERATE,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
        {
          method: "POST",
          body: emptyInput,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.currentAllocations).toHaveLength(3);
      expect(mockAllocationService.analyzeAllocation).toHaveBeenCalled();
    });

    it("should handle extreme risk tolerance values", async () => {
      const veryAggressiveInput = {
        portfolio: mockPortfolio,
        riskTolerance: RiskTolerance.VERY_AGGRESSIVE,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
        {
          method: "POST",
          body: veryAggressiveInput,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recommendedModel.riskTolerance).toBe(
        RiskTolerance.VERY_AGGRESSIVE,
      );
      expect(mockAllocationService.analyzeAllocation).toHaveBeenCalledWith(
        expect.anything(),
        RiskTolerance.VERY_AGGRESSIVE,
        undefined,
      );
    });

    it("should handle malformed constraint objects", async () => {
      const malformedInput = {
        portfolio: mockPortfolio,
        riskTolerance: RiskTolerance.MODERATE,
        constraints: {
          transactionCostPerTrade: -10, // Invalid negative value
          minPositionSize: 1.5, // Invalid > 1
          maxAssetClassConcentration: 2.0, // Invalid > 1
        },
      };

      const request = createMockRequest(
        "http://localhost:3000/api/investments/allocation-analysis",
        {
          method: "POST",
          body: malformedInput,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      // Should still process but service will handle invalid constraints
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAllocationService.analyzeAllocation).toHaveBeenCalled();
    });
  });

  describe("negative-auth – /api/investments/allocation-analysis", () => {
    beforeEach(() => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    });

    it("POST returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
      const res = await POST(
        createMockRequest(
          "http://localhost:3000/api/investments/allocation-analysis",
          { method: "POST", body: {} },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("GET returns 401 when the request is not authenticated (TASK-AUTH-03e)", async () => {
      const res = await GET(
        createMockRequest(
          "http://localhost:3000/api/investments/allocation-analysis",
        ),
      );
      expect(res.status).toBe(401);
    });
  });
});
