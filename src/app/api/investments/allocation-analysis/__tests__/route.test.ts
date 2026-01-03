/**
 * Asset Allocation Analysis API Tests
 *
 * Integration tests for the allocation analysis endpoint
 */

import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import { RiskTolerance, AssetClass } from '@/lib/investments/types/asset-allocation.types';

// Mock the AssetAllocationService
const mockAnalyzeAllocation = jest.fn();
const mockGetAllocationModel = jest.fn();

jest.mock('@/lib/investments/services/AssetAllocationService', () => ({
  getAssetAllocationService: jest.fn(() => ({
    analyzeAllocation: mockAnalyzeAllocation,
    getAllocationModel: mockGetAllocationModel,
  })),
}));

describe('Asset Allocation Analysis API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockAnalyzeAllocation.mockResolvedValue({
      portfolioId: 'portfolio-1',
      analyzedAt: new Date(),
      currentAllocations: [
        { assetClass: AssetClass.STOCKS, percentage: 60, value: 18000 },
        { assetClass: AssetClass.BONDS, percentage: 30, value: 9000 },
        { assetClass: AssetClass.CASH, percentage: 10, value: 3000 },
      ],
      recommendedModel: {
        name: 'Moderate',
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
    });

    mockGetAllocationModel.mockReturnValue({
      name: 'Moderate',
      riskTolerance: RiskTolerance.MODERATE,
      allocations: [
        { assetClass: AssetClass.STOCKS, targetPercentage: 50, minPercentage: 40, maxPercentage: 60 },
        { assetClass: AssetClass.BONDS, targetPercentage: 35, minPercentage: 25, maxPercentage: 45 },
        { assetClass: AssetClass.CASH, targetPercentage: 15, minPercentage: 10, maxPercentage: 20 },
      ],
      expectedReturn: 0.07,
      expectedVolatility: 0.12,
      sharpeRatio: 0.583,
    });
  });

  const mockPortfolio = {
    id: 'portfolio-1',
    userId: 'user-1',
    name: 'Test Portfolio',
    holdings: [
      {
        id: 'holding-1',
        userId: 'user-1',
        symbol: 'AAPL',
        assetClass: 'stock',
        quantity: 100,
        avgCostBasis: 150,
        currentPrice: 180,
        marketValue: 18000,
        unrealizedGain: 3000,
        unrealizedGainPercent: 20,
        realizedGain: 0,
        weight: 0.6,
        sector: 'Technology',
        purchaseDate: '2023-01-01',
        lastUpdated: new Date().toISOString(),
      },
    ],
    totalValue: 30000,
    totalCost: 26500,
    totalGain: 3500,
    totalGainPercent: 13.2,
    dayChange: 250,
    dayChangePercent: 0.83,
    cashBalance: 5000,
    assetAllocation: [],
    sectorAllocation: [],
    performanceHistory: [
      {
        date: '2024-01-01',
        value: 28000,
        change: 0,
        changePercent: 0,
      },
    ],
    createdAt: '2023-01-01',
    updatedAt: new Date().toISOString(),
  };

  describe('POST /api/investments/allocation-analysis', () => {
    it('should analyze portfolio allocation', async () => {
      const request = new NextRequest('http://localhost:3000/api/investments/allocation-analysis', {
        method: 'POST',
        body: JSON.stringify({
          portfolio: mockPortfolio,
          riskTolerance: RiskTolerance.MODERATE,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      const request = new NextRequest('http://localhost:3000/api/investments/allocation-analysis', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should accept optional constraints', async () => {
      const request = new NextRequest('http://localhost:3000/api/investments/allocation-analysis', {
        method: 'POST',
        body: JSON.stringify({
          portfolio: mockPortfolio,
          riskTolerance: RiskTolerance.AGGRESSIVE,
          constraints: {
            transactionCostPerTrade: 10,
            minPositionSize: 0.01,
            maxAssetClassConcentration: 0.5,
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/investments/allocation-analysis', () => {
    it('should return all allocation models', async () => {
      const request = new NextRequest('http://localhost:3000/api/investments/allocation-analysis');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data).toHaveLength(5);
    });

    it('should return specific allocation model', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/investments/allocation-analysis?riskTolerance=moderate'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.riskTolerance).toBe(RiskTolerance.MODERATE);
    });
  });
});

