/**
 * Allocation Analyzer Tests
 *
 * Tests for asset allocation, diversification, and rebalancing calculations.
 */

import { AllocationAnalyzer } from '../AllocationAnalyzer';
import { PortfolioService } from '../PortfolioService';
import { AssetType } from '../../types/portfolio-db.types';

jest.mock('../PortfolioService');

describe('AllocationAnalyzer', () => {
  let analyzer: AllocationAnalyzer;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  const userId = 'test-user-123';
  const portfolioId = 'portfolio-1';

  beforeEach(() => {
    analyzer = new AllocationAnalyzer(userId);
    mockPortfolioService = (analyzer as any).portfolioService;
    jest.clearAllMocks();
  });

  describe('calculateAssetAllocation', () => {
    it('should calculate asset allocation breakdown', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { asset_type: AssetType.STOCK, current_value: 6000 },
        { asset_type: AssetType.BOND, current_value: 3000 },
        { asset_type: AssetType.CASH, current_value: 1000 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.calculateAssetAllocation(portfolioId);

      expect(result.stocks).toBe(60); // 6000 / 10000 * 100
      expect(result.bonds).toBe(30);
      expect(result.cash).toBe(10);
      expect(result.crypto).toBe(0);
      expect(result.other).toBe(0);
    });

    it('should return zeros for empty portfolio', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue([]);

      const result = await analyzer.calculateAssetAllocation(portfolioId);

      expect(result.stocks).toBe(0);
      expect(result.bonds).toBe(0);
      expect(result.cash).toBe(0);
    });

    it('should handle crypto and other asset types', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { asset_type: AssetType.CRYPTO, current_value: 5000 },
        { asset_type: AssetType.OPTION, current_value: 3000 },
        { asset_type: AssetType.MUTUAL_FUND, current_value: 2000 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.calculateAssetAllocation(portfolioId);

      expect(result.crypto).toBe(50);
      expect(result.other).toBe(50); // options + mutual funds
    });
  });

  describe('calculateSectorAllocation', () => {
    it('should calculate sector allocation', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { sector: 'Technology', current_value: 6000 },
        { sector: 'Healthcare', current_value: 3000 },
        { sector: 'Technology', current_value: 1000 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.calculateSectorAllocation(portfolioId);

      expect(result).toHaveLength(2);
      expect(result[0].sector).toBe('Technology');
      expect(result[0].percentage).toBe(70); // 7000 / 10000 * 100
      expect(result[0].holdings_count).toBe(2);
      expect(result[1].sector).toBe('Healthcare');
      expect(result[1].percentage).toBe(30);
    });
  });

  describe('calculateDiversificationScore', () => {
    it('should calculate diversification metrics', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { current_value: 2500 }, // 25%
        { current_value: 2500 }, // 25%
        { current_value: 2500 }, // 25%
        { current_value: 2500 }, // 25%
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.calculateDiversificationScore(portfolioId);

      expect(result.herfindahl_index).toBe(2500); // 25^2 * 4
      expect(result.effective_holdings).toBe(4); // 10000 / 2500
      expect(result.diversification_score).toBeGreaterThan(0);
    });

    it('should show high concentration for single holding', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [{ current_value: 10000 }];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.calculateDiversificationScore(portfolioId);

      expect(result.herfindahl_index).toBe(10000); // 100^2
      expect(result.effective_holdings).toBe(1);
      expect(result.concentration_score).toBe(100);
      expect(result.diversification_score).toBe(0);
    });
  });

  describe('assessConcentrationRisk', () => {
    it('should identify high concentration risks', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { symbol: 'AAPL', name: 'Apple Inc.', current_value: 7000 }, // 70%
        { symbol: 'GOOGL', name: 'Alphabet Inc.', current_value: 2000 }, // 20%
        { symbol: 'MSFT', name: 'Microsoft Corp.', current_value: 1000 }, // 10%
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.assessConcentrationRisk(portfolioId);

      expect(result).toHaveLength(2); // Only AAPL and GOOGL (>5%)
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].risk_level).toBe('critical'); // >20%
      expect(result[1].symbol).toBe('GOOGL');
      expect(result[1].risk_level).toBe('high'); // 10-20%
    });
  });

  describe('generateRebalancingRecommendations', () => {
    it('should generate rebalancing recommendations', async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        target_allocation: { stocks: 60, bonds: 30, cash: 10 },
        rebalance_threshold: 5,
      };
      const mockHoldings = [
        { asset_type: AssetType.STOCK, current_value: 8000 }, // 80%
        { asset_type: AssetType.BOND, current_value: 1000 }, // 10%
        { asset_type: AssetType.CASH, current_value: 1000 }, // 10%
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.generateRebalancingRecommendations(portfolioId);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].action).toBe('sell'); // stocks are over-allocated
      expect(result[0].deviation).toBeGreaterThan(5);
    });

    it('should return empty for no target allocation', async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        target_allocation: {},
      };
      const mockHoldings = [{ asset_type: AssetType.STOCK, current_value: 10000 }];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await analyzer.generateRebalancingRecommendations(portfolioId);

      expect(result).toEqual([]);
    });
  });
});

