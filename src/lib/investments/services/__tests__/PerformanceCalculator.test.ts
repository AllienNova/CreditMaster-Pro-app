/**
 * Performance Calculator Tests
 *
 * Tests for portfolio performance metrics calculations.
 */

import { PerformanceCalculator } from "../PerformanceCalculator";
import { PortfolioService } from "../PortfolioService";

jest.mock("../PortfolioService");

describe("PerformanceCalculator", () => {
  let calculator: PerformanceCalculator;
  let mockPortfolioService: jest.Mocked<PortfolioService>;
  const userId = "test-user-123";
  const portfolioId = "portfolio-1";

  beforeEach(() => {
    calculator = new PerformanceCalculator(userId);
    mockPortfolioService = (calculator as any).portfolioService;
    jest.clearAllMocks();
  });

  describe("calculateTotalReturn", () => {
    it("should calculate positive total return", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
        total_value: 12000,
      };

      const mockHoldings = [
        { current_value: 7000, quantity: 100, average_cost: 60 }, // cost: 6000
        { current_value: 5000, quantity: 50, average_cost: 80 }, // cost: 4000
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.calculateTotalReturn(portfolioId);

      expect(result.absolute).toBe(2000); // 12000 - 10000
      expect(result.percentage).toBe(20); // (2000 / 10000) * 100
    });

    it("should return zero for empty portfolio", async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest.fn().mockResolvedValue([]);

      const result = await calculator.calculateTotalReturn(portfolioId);

      expect(result.absolute).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it("should handle negative returns", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
        total_value: 8000,
      };

      const mockHoldings = [
        { current_value: 8000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.calculateTotalReturn(portfolioId);

      expect(result.absolute).toBe(-2000);
      expect(result.percentage).toBe(-20);
    });
  });

  describe("calculateAnnualizedReturn", () => {
    it("should calculate annualized return (CAGR)", async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        { current_value: 12000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.calculateAnnualizedReturn(portfolioId, 1);

      expect(result).toBeCloseTo(20, 1); // ~20% annual return
    });

    it("should throw error for invalid years", async () => {
      await expect(
        calculator.calculateAnnualizedReturn(portfolioId, 0),
      ).rejects.toThrow("Years must be greater than 0");
    });
  });

  describe("calculateVolatility (FND-035)", () => {
    it("returns null — not dayChangePercent × sqrt(period) — when no real daily-return series is available", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        day_change_percent: 2.5,
      };
      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);

      const result = await calculator.calculateVolatility(portfolioId, 30);

      // With no real daily-return series reachable, the honest answer is null
      expect(result).toBeNull();
      // The old fabricated formula would return 2.5 * sqrt(30) ≈ 13.69 — confirm null is not that
      expect(result).not.toBe(2.5 * Math.sqrt(30));
    });

    it("returns null (not a fabricated number) when day_change_percent is non-zero", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        day_change_percent: 1.0,
      };
      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);

      const result = await calculator.calculateVolatility(portfolioId, 252);

      expect(result).toBeNull();
    });

    it("still throws when portfolio is not found", async () => {
      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(null);

      await expect(
        calculator.calculateVolatility(portfolioId, 30),
      ).rejects.toThrow(`Portfolio ${portfolioId} not found`);
    });

    it("still throws for period <= 1", async () => {
      await expect(
        calculator.calculateVolatility(portfolioId, 1),
      ).rejects.toThrow("Period must be greater than 1");
    });
  });

  describe("calculateSharpeRatio (FND-035 propagation)", () => {
    // Pre-existing test updated: with no real volatility series, calculateVolatility
    // returns null, so calculateSharpeRatio must propagate null — not return a number.
    // The old assertion (typeof result === 'number') encoded the fabricated-volatility bug.
    it("returns null when no real volatility series is available (propagates null — not NaN or 0)", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        day_change_percent: 1.5,
      };
      const mockHoldings = [
        { current_value: 12000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.calculateSharpeRatio(portfolioId, 0.04);

      // Must be null — not NaN (which would recreate FND-031) and not 0 (plausible wrong value)
      expect(result).toBeNull();
      expect(result).not.toBeNaN();
    });

    // Pre-existing test updated: the old contract returned 0 when day_change_percent === 0
    // (which made calculateVolatility return 0, triggering the `if (volatility === 0) return 0`
    // guard). With the honest fix, calculateVolatility returns null regardless of day_change_percent,
    // so calculateSharpeRatio returns null — not 0.
    it("returns null (not 0) when volatility is null — null is the honest 'unavailable' signal", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        day_change_percent: 0,
      };
      const mockHoldings = [
        { current_value: 10000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.calculateSharpeRatio(portfolioId);

      expect(result).toBeNull();
    });

    it("still throws when portfolio is not found", async () => {
      mockPortfolioService.getPortfolio = jest.fn().mockResolvedValue(null);

      await expect(
        calculator.calculateSharpeRatio(portfolioId),
      ).rejects.toThrow(`Portfolio ${portfolioId} not found`);
    });
  });

  describe("calculateMaxDrawdown", () => {
    it("should calculate max drawdown from worst holding", async () => {
      const mockPortfolio = { id: portfolioId, user_id: userId };
      const mockHoldings = [
        {
          current_value: 8000,
          quantity: 100,
          average_cost: 100,
          gain_loss_percent: -20,
          created_at: new Date("2024-01-01"),
        },
        {
          current_value: 5000,
          quantity: 50,
          average_cost: 100,
          gain_loss_percent: 0,
          created_at: new Date("2024-01-01"),
        },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.calculateMaxDrawdown(portfolioId);

      expect(result.maxDrawdownPercent).toBe(-20);
      expect(result.maxDrawdown).toBeLessThan(0);
    });
  });

  describe("benchmarkAgainstSP500", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    it("never returns fabricated constants beta=1.0 and correlation=0.85 as computed output (FND-032)", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
      };
      const mockHoldings = [
        { current_value: 11000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.benchmarkAgainstSP500(
        portfolioId,
        startDate,
        endDate,
      );

      // Must not return the fabricated constant pair
      expect(result.beta === 1.0 && result.correlation === 0.85).toBe(false);
    });

    it("returns dataAvailable=false and null benchmark fields when no S&P 500 series is available", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
      };
      const mockHoldings = [
        { current_value: 11000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.benchmarkAgainstSP500(
        portfolioId,
        startDate,
        endDate,
      );

      expect(result.dataAvailable).toBe(false);
      expect(result.beta).toBeNull();
      expect(result.correlation).toBeNull();
      expect(result.benchmark_return).toBeNull();
      expect(result.benchmark_return_percent).toBeNull();
      expect(result.alpha).toBeNull();
      expect(result.tracking_error).toBeNull();
      expect(result.information_ratio).toBeNull();
    });

    it("still populates portfolio_return and portfolio_return_percent from real holdings data", async () => {
      const mockPortfolio = {
        id: portfolioId,
        user_id: userId,
        total_cost_basis: 10000,
      };
      // cost = 100 * 100 = 10000, current = 12000 → +20%
      const mockHoldings = [
        { current_value: 12000, quantity: 100, average_cost: 100 },
      ];

      mockPortfolioService.getPortfolio = jest
        .fn()
        .mockResolvedValue(mockPortfolio);
      mockPortfolioService.getHoldings = jest
        .fn()
        .mockResolvedValue(mockHoldings);

      const result = await calculator.benchmarkAgainstSP500(
        portfolioId,
        startDate,
        endDate,
      );

      expect(result.portfolio_return).toBe(2000);
      expect(result.portfolio_return_percent).toBe(20);
    });
  });
});
