/**
 * Asset Allocation Service Tests
 */

import { AssetAllocationService, getAssetAllocationService } from '../AssetAllocationService';
import { RiskTolerance, AssetClass } from '../../types/asset-allocation.types';
import { Portfolio, PortfolioHolding } from '../../types/investment.types';

describe('AssetAllocationService', () => {
  let service: AssetAllocationService;
  let mockPortfolio: Portfolio;
  let mockHoldings: PortfolioHolding[];

  beforeEach(() => {
    service = new AssetAllocationService();

    // Create mock holdings
    mockHoldings = [
      {
        id: '1',
        userId: 'user1',
        symbol: 'AAPL',
        assetClass: 'stock' as any,
        quantity: 100,
        avgCostBasis: 150,
        currentPrice: 180,
        marketValue: 18000,
        unrealizedGain: 3000,
        unrealizedGainPercent: 20,
        realizedGain: 0,
        weight: 0.6,
        sector: 'Technology',
        purchaseDate: new Date('2023-01-01'),
        lastUpdated: new Date(),
      },
      {
        id: '2',
        userId: 'user1',
        symbol: 'AGG',
        assetClass: 'bond' as any,
        quantity: 50,
        avgCostBasis: 100,
        currentPrice: 105,
        marketValue: 5250,
        unrealizedGain: 250,
        unrealizedGainPercent: 5,
        realizedGain: 0,
        weight: 0.175,
        purchaseDate: new Date('2023-01-01'),
        lastUpdated: new Date(),
      },
      {
        id: '3',
        userId: 'user1',
        symbol: 'VNQ',
        assetClass: 'reit' as any,
        quantity: 75,
        avgCostBasis: 80,
        currentPrice: 90,
        marketValue: 6750,
        unrealizedGain: 750,
        unrealizedGainPercent: 12.5,
        realizedGain: 0,
        weight: 0.225,
        purchaseDate: new Date('2023-01-01'),
        lastUpdated: new Date(),
      },
    ];

    // Create mock portfolio
    mockPortfolio = {
      id: 'portfolio1',
      userId: 'user1',
      name: 'Test Portfolio',
      holdings: mockHoldings,
      totalValue: 30000,
      totalCost: 26500,
      totalGain: 3500,
      totalGainPercent: 13.2,
      dayChange: 150,
      dayChangePercent: 0.5,
      cashBalance: 0,
      assetAllocation: [],
      sectorAllocation: [],
      performanceHistory: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };
  });

  describe('getAllocationModel', () => {
    it('should return conservative model for conservative risk tolerance', () => {
      const model = service.getAllocationModel(RiskTolerance.CONSERVATIVE);

      expect(model.name).toBe('Conservative');
      expect(model.riskTolerance).toBe(RiskTolerance.CONSERVATIVE);
      expect(model.allocations.length).toBeGreaterThan(0);
      expect(model.expectedReturn).toBeLessThan(0.1);
    });

    it('should return aggressive model for aggressive risk tolerance', () => {
      const model = service.getAllocationModel(RiskTolerance.AGGRESSIVE);

      expect(model.name).toBe('Aggressive');
      expect(model.riskTolerance).toBe(RiskTolerance.AGGRESSIVE);
      expect(model.expectedReturn).toBeGreaterThan(0.05);
    });

    it('should return moderate model for moderate risk tolerance', () => {
      const model = service.getAllocationModel(RiskTolerance.MODERATE);

      expect(model.name).toBe('Moderate');
      expect(model.riskTolerance).toBe(RiskTolerance.MODERATE);
      expect(model.allocations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeAllocation', () => {
    it('should analyze portfolio allocation successfully', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.portfolioId).toBe('portfolio1');
      expect(analysis.currentAllocations).toBeDefined();
      expect(analysis.currentAllocations.length).toBeGreaterThan(0);
      expect(analysis.recommendedModel).toBeDefined();
      expect(analysis.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(analysis.diversificationScore).toBeLessThanOrEqual(100);
    });

    it('should calculate current allocations correctly', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      const stockAllocation = analysis.currentAllocations.find(
        (a) => a.assetClass === AssetClass.STOCKS
      );
      expect(stockAllocation).toBeDefined();
      expect(stockAllocation!.value).toBe(18000);
      expect(stockAllocation!.percentage).toBeCloseTo(60, 0);
    });

    it('should identify when rebalancing is needed', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.CONSERVATIVE // Very different from current allocation
      );

      expect(analysis.needsRebalancing).toBe(true);
      expect(analysis.deviationFromTarget).toBeGreaterThan(5);
    });

    it('should generate rebalancing recommendations', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.CONSERVATIVE
      );

      expect(analysis.rebalancingRecommendations).toBeDefined();
      expect(analysis.rebalancingRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('risk metrics', () => {
    it('should calculate portfolio volatility', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.riskMetrics.portfolioVolatility).toBeGreaterThan(0);
      expect(analysis.riskMetrics.portfolioVolatility).toBeLessThan(1);
    });

    it('should calculate Value at Risk (VaR)', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.riskMetrics.valueAtRisk).toBeGreaterThan(0);
      expect(analysis.riskMetrics.conditionalVaR).toBeGreaterThan(analysis.riskMetrics.valueAtRisk);
    });

    it('should calculate max drawdown', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.riskMetrics.maxDrawdown).toBeGreaterThan(0);
    });
  });

  describe('performance metrics', () => {
    it('should calculate expected return', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.performanceMetrics.expectedReturn).toBeDefined();
    });

    it('should calculate Sharpe ratio', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.performanceMetrics.sharpeRatio).toBeDefined();
    });

    it('should calculate Sortino ratio', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.performanceMetrics.sortinoRatio).toBeDefined();
    });
  });

  describe('diversification score', () => {
    it('should calculate diversification score between 0-100', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(analysis.diversificationScore).toBeLessThanOrEqual(100);
    });

    it('should give lower score for concentrated portfolio', async () => {
      // Create concentrated portfolio (all in one asset)
      const concentratedPortfolio: Portfolio = {
        ...mockPortfolio,
        holdings: [mockHoldings[0]],
        totalValue: 18000,
      };

      const analysis = await service.analyzeAllocation(
        concentratedPortfolio,
        RiskTolerance.MODERATE
      );

      expect(analysis.diversificationScore).toBeLessThan(50);
    });
  });

  describe('rebalancing recommendations', () => {
    it('should prioritize high deviation positions', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.CONSERVATIVE
      );

      const highPriority = analysis.rebalancingRecommendations.filter(
        (r) => r.priority === 'high'
      );
      const lowPriority = analysis.rebalancingRecommendations.filter(
        (r) => r.priority === 'low'
      );

      if (highPriority.length > 0 && lowPriority.length > 0) {
        expect(Math.abs(highPriority[0].currentPercentage - highPriority[0].targetPercentage))
          .toBeGreaterThan(Math.abs(lowPriority[0].currentPercentage - lowPriority[0].targetPercentage));
      }
    });

    it('should include transaction costs in recommendations', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE,
        { transactionCostPerTrade: 10 }
      );

      analysis.rebalancingRecommendations.forEach((rec) => {
        expect(rec.transactionCost).toBe(10);
      });
    });

    it('should respect minimum trade size constraint', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.MODERATE,
        { minPositionSize: 0.05 } // 5% minimum
      );

      // All recommendations should have deviation > 5%
      analysis.rebalancingRecommendations.forEach((rec) => {
        const deviation = Math.abs(rec.currentPercentage - rec.targetPercentage);
        expect(deviation).toBeGreaterThan(5);
      });
    });

    it('should recommend buy/sell actions correctly', async () => {
      const analysis = await service.analyzeAllocation(
        mockPortfolio,
        RiskTolerance.CONSERVATIVE
      );

      analysis.rebalancingRecommendations.forEach((rec) => {
        if (rec.currentPercentage > rec.targetPercentage) {
          expect(rec.action).toBe('sell');
        } else if (rec.currentPercentage < rec.targetPercentage) {
          expect(rec.action).toBe('buy');
        } else {
          expect(rec.action).toBe('hold');
        }
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getAssetAllocationService', () => {
      const instance1 = getAssetAllocationService();
      const instance2 = getAssetAllocationService();

      expect(instance1).toBe(instance2);
    });
  });

  describe('asset class detection', () => {
    it('should detect crypto assets', async () => {
      const cryptoHolding: PortfolioHolding = {
        ...mockHoldings[0],
        symbol: 'BTC-USD',
      };

      const cryptoPortfolio: Portfolio = {
        ...mockPortfolio,
        holdings: [cryptoHolding],
        totalValue: 18000,
      };

      const analysis = await service.analyzeAllocation(
        cryptoPortfolio,
        RiskTolerance.VERY_AGGRESSIVE
      );

      const cryptoAllocation = analysis.currentAllocations.find(
        (a) => a.assetClass === AssetClass.CRYPTO
      );
      expect(cryptoAllocation).toBeDefined();
    });

    it('should detect bond ETFs', async () => {
      const bondHolding: PortfolioHolding = {
        ...mockHoldings[0],
        symbol: 'AGG',
      };

      const bondPortfolio: Portfolio = {
        ...mockPortfolio,
        holdings: [bondHolding],
        totalValue: 5250,
      };

      const analysis = await service.analyzeAllocation(
        bondPortfolio,
        RiskTolerance.CONSERVATIVE
      );

      const bondAllocation = analysis.currentAllocations.find(
        (a) => a.assetClass === AssetClass.BONDS
      );
      expect(bondAllocation).toBeDefined();
    });

    it('should detect real estate (REITs)', async () => {
      const reitHolding: PortfolioHolding = {
        ...mockHoldings[0],
        symbol: 'VNQ',
      };

      const reitPortfolio: Portfolio = {
        ...mockPortfolio,
        holdings: [reitHolding],
        totalValue: 6750,
      };

      const analysis = await service.analyzeAllocation(
        reitPortfolio,
        RiskTolerance.MODERATE
      );

      const reitAllocation = analysis.currentAllocations.find(
        (a) => a.assetClass === AssetClass.REAL_ESTATE
      );
      expect(reitAllocation).toBeDefined();
    });
  });
});

