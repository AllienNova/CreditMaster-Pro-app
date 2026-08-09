/**
 * Portfolio Service Tests
 *
 * Comprehensive tests for portfolio CRUD operations, holdings management,
 * and transaction processing.
 */

import { PortfolioService } from "../PortfolioService";
import {
  PortfolioType,
  RiskLevel,
  AssetType,
  TransactionType,
} from "../../types/portfolio-db.types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

// Mock Supabase client
jest.mock("@/lib/supabase/service-role");

const mockSupabase = {
  from: jest.fn(),
};

describe("PortfolioService", () => {
  let service: PortfolioService;
  const userId = "test-user-123";
  const portfolioId = "550e8400-e29b-41d4-a716-446655440000";
  const holdingId = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    (getServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase);
    service = new PortfolioService(userId);
    jest.clearAllMocks();
  });

  describe("Portfolio CRUD Operations", () => {
    it("should create a new portfolio", async () => {
      const mockPortfolio = {
        id: "portfolio-1",
        user_id: userId,
        name: "Test Portfolio",
        description: "Test description",
        portfolio_type: "manual",
        total_value: 0,
        total_cost_basis: 0,
        total_gain_loss: 0,
        total_gain_loss_percent: 0,
        risk_level: "moderate",
        rebalance_threshold: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockPortfolio, error: null }),
          }),
        }),
      });

      const result = await service.createPortfolio({
        name: "Test Portfolio",
        description: "Test description",
        portfolio_type: PortfolioType.MANUAL,
        risk_level: RiskLevel.MODERATE,
      });

      expect(result.name).toBe("Test Portfolio");
      expect(result.portfolio_type).toBe(PortfolioType.MANUAL);
      expect(mockSupabase.from).toHaveBeenCalledWith("investment_portfolios");
    });

    it("should get all portfolios for a user", async () => {
      const mockPortfolios = [
        {
          id: "portfolio-1",
          user_id: userId,
          name: "Portfolio 1",
          portfolio_type: "manual",
          total_value: 10000,
          total_cost_basis: 8000,
          total_gain_loss: 2000,
          total_gain_loss_percent: 25,
          rebalance_threshold: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "portfolio-2",
          user_id: userId,
          name: "Portfolio 2",
          portfolio_type: "simulated",
          total_value: 5000,
          total_cost_basis: 5000,
          total_gain_loss: 0,
          total_gain_loss_percent: 0,
          rebalance_threshold: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest
              .fn()
              .mockResolvedValue({ data: mockPortfolios, error: null }),
          }),
        }),
      });

      const result = await service.getPortfolios();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Portfolio 1");
      expect(result[1].name).toBe("Portfolio 2");
    });

    it("should update a portfolio", async () => {
      const mockUpdatedPortfolio = {
        id: "portfolio-1",
        user_id: userId,
        name: "Updated Portfolio",
        portfolio_type: "manual",
        total_value: 0,
        total_cost_basis: 0,
        total_gain_loss: 0,
        total_gain_loss_percent: 0,
        rebalance_threshold: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({
                    data: mockUpdatedPortfolio,
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      });

      const result = await service.updatePortfolio("portfolio-1", {
        name: "Updated Portfolio",
      });

      expect(result.name).toBe("Updated Portfolio");
    });

    it("should delete a portfolio", async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      await expect(
        service.deletePortfolio("portfolio-1"),
      ).resolves.not.toThrow();
    });
  });

  describe("Holdings Management", () => {
    it("should create a new holding", async () => {
      const mockHolding = {
        id: holdingId,
        portfolio_id: portfolioId,
        symbol: "AAPL",
        name: "Apple Inc.",
        asset_type: "stock",
        quantity: 100,
        average_cost: 150,
        current_price: 175,
        current_value: 17500,
        gain_loss: 2500,
        gain_loss_percent: 16.67,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockHolding, error: null }),
          }),
        }),
      });

      const result = await service.createHolding({
        portfolio_id: portfolioId,
        symbol: "AAPL",
        name: "Apple Inc.",
        asset_type: AssetType.STOCK,
        quantity: 100,
        average_cost: 150,
      });

      expect(result.symbol).toBe("AAPL");
      expect(result.quantity).toBe(100);
      expect(result.average_cost).toBe(150);
    });

    it("should get all holdings for a portfolio", async () => {
      const mockHoldings = [
        {
          id: holdingId,
          portfolio_id: portfolioId,
          symbol: "AAPL",
          name: "Apple Inc.",
          asset_type: "stock",
          quantity: 100,
          average_cost: 150,
          current_price: 175,
          current_value: 17500,
          gain_loss: 2500,
          gain_loss_percent: 16.67,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          portfolio_id: portfolioId,
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          asset_type: "stock",
          quantity: 50,
          average_cost: 2800,
          current_price: 2900,
          current_value: 145000,
          gain_loss: 5000,
          gain_loss_percent: 3.57,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockHoldings, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getHoldings(portfolioId);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[1].symbol).toBe("GOOGL");
    });

    it("should update a holding", async () => {
      const mockUpdatedHolding = {
        id: holdingId,
        portfolio_id: portfolioId,
        symbol: "AAPL",
        name: "Apple Inc.",
        asset_type: "stock",
        quantity: 150,
        average_cost: 160,
        current_price: 175,
        current_value: 26250,
        gain_loss: 2250,
        gain_loss_percent: 9.38,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: mockUpdatedHolding, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.updateHolding(holdingId, {
        quantity: 150,
        average_cost: 160,
      });

      expect(result.quantity).toBe(150);
      expect(result.average_cost).toBe(160);
    });
  });

  describe("Transaction Processing", () => {
    it("should create a buy transaction", async () => {
      const mockTransaction = {
        id: "550e8400-e29b-41d4-a716-446655440003",
        portfolio_id: portfolioId,
        holding_id: holdingId,
        transaction_type: "buy",
        symbol: "AAPL",
        quantity: 50,
        price: 175,
        total_amount: 8750,
        fees: 4.95,
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Mock the holding fetch for update
      mockSupabase.from.mockImplementation((table) => {
        if (table === "investment_transactions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: mockTransaction, error: null }),
              }),
            }),
          };
        } else if (table === "investment_holdings") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: holdingId,
                      quantity: 100,
                      average_cost: 150,
                      created_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest
                      .fn()
                      .mockResolvedValue({ data: {}, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
      });

      const result = await service.createTransaction({
        portfolio_id: portfolioId,
        holding_id: holdingId,
        transaction_type: TransactionType.BUY,
        symbol: "AAPL",
        quantity: 50,
        price: 175,
        fees: 4.95,
        transaction_date: new Date(),
      });

      expect(result.transaction_type).toBe(TransactionType.BUY);
      expect(result.quantity).toBe(50);
      expect(result.price).toBe(175);
    });
  });
});
