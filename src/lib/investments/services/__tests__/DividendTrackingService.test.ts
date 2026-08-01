/**
 * @jest-environment node
 */

/**
 * DividendTrackingService - Unit Tests
 *
 * Tests cover:
 * - getDividendStocks (yield calc, sorting, edge cases)
 * - getDividendTrackingService singleton
 *
 * Wave 7 remediation (2026-07-31): recordDividendPayment, getDividendHistory,
 * getDividendSummary, getIncomeProjections, getDividendCalendar,
 * getDRIPSettings, updateDRIPSettings, getTaxReport, and their tests were
 * deleted along with the service methods — they read phantom tables
 * (dividend_payments, drip_settings) with zero callers anywhere outside this
 * file. See docs/qa/triage-trading.md.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Mock Setup - must come before imports
// ---------------------------------------------------------------------------

const mockFrom = jest.fn();

// Use a plain function (not jest.fn) so resetMocks cannot strip the impl.
const mockCreateClient = (..._args: unknown[]) => ({
  from: (...fArgs: unknown[]) => mockFrom(...fArgs),
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import {
  DividendTrackingService,
  getDividendTrackingService,
} from "../DividendTrackingService";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_URL = "https://test.supabase.co";
const TEST_KEY = "test-key";

// ---------------------------------------------------------------------------
// Helpers - DB row builders
// ---------------------------------------------------------------------------

/** Raw investment_holdings row shape (snake_case). */
function makeHoldingRow(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 100,
    average_cost: 150,
    current_price: 200,
    user_id: "user-1",
    ...overrides,
  };
}

/** Raw stock_dividends row shape (snake_case). */
function makeDividendInfoRow(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "AAPL",
    annual_dividend: 3.28,
    frequency: "quarterly",
    next_ex_date: "2026-04-01T00:00:00.000Z",
    next_pay_date: "2026-04-15T00:00:00.000Z",
    payout_ratio: 0.15,
    dividend_growth_rate: 7.5,
    years_of_growth: 12,
    ...overrides,
  };
}

/**
 * Build a chainable mock for the "investment_holdings" table.
 * Chain: .from("investment_holdings").select("*").eq("user_id",...).gt("quantity",0)
 */
function buildHoldingsChain(result: { data: unknown; error: unknown }) {
  const gtMock = jest.fn().mockResolvedValue(result);
  const eqMock = jest.fn().mockReturnValue({ gt: gtMock });
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
  return { select: selectMock };
}

/**
 * Build a chainable mock for "stock_dividends" table.
 * Chain: .from("stock_dividends").select("*").eq("symbol",...).single()
 * Can return different results for sequential calls.
 */
function buildStockDividendsChain(
  results: { data: unknown; error: unknown }[],
) {
  let callIndex = 0;
  const singleMock = jest.fn().mockImplementation(() => {
    const result = results[callIndex] || results[results.length - 1];
    callIndex++;
    return Promise.resolve(result);
  });
  const eqMock = jest.fn().mockReturnValue({ single: singleMock });
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
  return { select: selectMock };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DividendTrackingService", () => {
  let service: DividendTrackingService;

  beforeEach(() => {
    mockFrom.mockReset();
    service = new DividendTrackingService(TEST_URL, TEST_KEY);
  });

  // =========================================================================
  // getDividendStocks
  // =========================================================================
  describe("getDividendStocks", () => {
    it("should return dividend stocks sorted by yield descending", async () => {
      const holdingsData = [
        makeHoldingRow({ symbol: "AAPL", current_price: 200, quantity: 100 }),
        makeHoldingRow({
          symbol: "MSFT",
          name: "Microsoft",
          current_price: 400,
          quantity: 50,
        }),
      ];

      // Pre-build the stock_dividends chain so call counter is shared
      const stockDivChain = buildStockDividendsChain([
        {
          data: makeDividendInfoRow({
            symbol: "AAPL",
            annual_dividend: 3.28,
          }),
          error: null,
        },
        {
          data: makeDividendInfoRow({
            symbol: "MSFT",
            annual_dividend: 2.72,
          }),
          error: null,
        },
      ]);

      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({ data: holdingsData, error: null });
        }
        if (table === "stock_dividends") {
          return stockDivChain;
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");

      expect(result).toHaveLength(2);
      // AAPL yield = (3.28 / 200) * 100 = 1.64
      // MSFT yield = (2.72 / 400) * 100 = 0.68
      expect(result[0].symbol).toBe("AAPL");
      expect(result[0].dividendYield).toBeCloseTo(1.64, 2);
      expect(result[1].symbol).toBe("MSFT");
      expect(result[1].dividendYield).toBeCloseTo(0.68, 2);
    });

    it("should skip stocks with zero annual_dividend", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow({ symbol: "TSLA" })],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({
                symbol: "TSLA",
                annual_dividend: 0,
              }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result).toHaveLength(0);
    });

    it("should skip stocks with no dividend info", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow({ symbol: "TSLA" })],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            { data: null, error: { message: "not found" } },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result).toHaveLength(0);
    });

    it("should mark isDividendAristocrat for >= 25 years of growth", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow()],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({ years_of_growth: 30 }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].isDividendAristocrat).toBe(true);
    });

    it("should not mark isDividendAristocrat for < 25 years of growth", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow()],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({ years_of_growth: 10 }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].isDividendAristocrat).toBe(false);
    });

    it("should mark isDividendAristocrat for exactly 25 years", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow()],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({ years_of_growth: 25 }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].isDividendAristocrat).toBe(true);
    });

    it("should use name from holding, fallback to symbol", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow({ name: null, symbol: "XYZ" })],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({
                symbol: "XYZ",
                annual_dividend: 2.0,
              }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].companyName).toBe("XYZ");
    });

    it("should handle optional nextExDate and nextPayDate", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow()],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({
                next_ex_date: null,
                next_pay_date: null,
              }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].nextExDate).toBeUndefined();
      expect(result[0].nextPayDate).toBeUndefined();
    });

    it("should throw when holdings query fails", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: null,
            error: { message: "db error" },
          });
        }
        return {};
      });

      await expect(service.getDividendStocks("user-1")).rejects.toThrow(
        "Failed to get holdings: db error",
      );
    });

    it("should return empty array when user has no holdings", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({ data: [], error: null });
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result).toEqual([]);
    });

    it("should default frequency to quarterly when not provided", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow()],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({ frequency: null }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].frequency).toBe("quarterly");
    });

    it("should populate payoutRatio and dividendGrowthRate", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow()],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({
                payout_ratio: 0.35,
                dividend_growth_rate: 8.2,
              }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result[0].payoutRatio).toBe(0.35);
      expect(result[0].dividendGrowthRate).toBe(8.2);
    });

    it("should handle null holdings data gracefully", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "investment_holdings") {
          return buildHoldingsChain({ data: null, error: null });
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getDividendTrackingService singleton
  // =========================================================================
  describe("getDividendTrackingService", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return a DividendTrackingService instance", () => {
      const svc = getDividendTrackingService();
      expect(svc).toBeInstanceOf(DividendTrackingService);
    });

    it("should return the same instance on subsequent calls", () => {
      const svc1 = getDividendTrackingService();
      const svc2 = getDividendTrackingService();
      expect(svc1).toBe(svc2);
    });
  });
});
