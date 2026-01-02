/**
 * Performance Calculator Tests
 *
 * Tests for portfolio performance metrics calculations.
 */

import { PerformanceCalculator } from '../PerformanceCalculator';
import { PortfolioService } from '../PortfolioService';

jest.mock('../PortfolioService');

describe('PerformanceCalculator', () => {
  let calculator: PerformanceCalculator;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  const userId = 'test-user-123';
  const portfolioId = 'portfolio-1';

  beforeEach(() => {
    calculator = new PerformanceCalculator(userId);
    mockPortfolioService = (calculator as any).portfolioService;
    jest.clearAllMocks();
  });

  describe('calculateTotalReturn', () => {
    it('should calculate positive total return', async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
        total_value: 12000,
      };

      const mockHoldings = [
        { current_value: 7000, quantity: 100, average_cost: 50 },
        { current_value: 5000, quantity: 50, average_cost: 80 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await calculator.calculateTotalReturn(portfolioId);

      expect(result.absolute).toBe(2000); // 12000 - 10000
      expect(result.percentage).toBe(20); // (2000 / 10000) * 100
    });

    it('should return zero for empty portfolio', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue([]);

      const result = await calculator.calculateTotalReturn(portfolioId);

      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle negative returns', async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
        total_value: 8000,
      };

      const mockHoldings = [
        { current_value: 8000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await calculator.calculateTotalReturn(portfolioId);

      expect(result.absolute).toBe(-2000);
      expect(result.percentage).toBe(-20);
    });
  });

  describe('calculateAnnualizedReturn', () => {
    it('should calculate annualized return (CAGR)', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { current_value: 12000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await calculator.calculateAnnualizedReturn(portfolioId, 1);

      expect(result).toBeCloseTo(20, 1); // ~20% annual return
    });

    it('should throw error for invalid years', async () => {
      await expect(calculator.calculateAnnualizedReturn(portfolioId, 0)).rejects.toThrow(
        'Years must be greater than 0'
      );
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio', async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        day_change_percent: 1.5,
      };
      const mockHoldings = [
        { current_value: 12000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await calculator.calculateSharpeRatio(portfolioId, 0.04);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('should return 0 for zero volatility', async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        day_change_percent: 0,
      };
      const mockHoldings = [
        { current_value: 10000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await calculator.calculateSharpeRatio(portfolioId);

      expect(result).toBe(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate max drawdown from worst holding', async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        {
          current_value: 8000,
          quantity: 100,
          average_cost: 100,
          gain_loss_percent: -20,
          created_at: new Date('2024-01-01'),
        },
        {
          current_value: 5000,
          quantity: 50,
          average_cost: 100,
          gain_loss_percent: 0,
          created_at: new Date('2024-01-01'),
        },
      ];

      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue(mockHoldings);

      const result = await calculator.calculateMaxDrawdown(portfolioId);

      expect(result.maxDrawdownPercent).toBe(-20);
      expect(result.maxDrawdown).toBeLessThan(0);
    });
  });
});

