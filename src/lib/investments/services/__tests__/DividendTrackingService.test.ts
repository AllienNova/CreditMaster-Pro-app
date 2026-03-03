/**
 * @jest-environment node
 */

/**
 * DividendTrackingService - Comprehensive Unit Tests
 *
 * Tests cover:
 * - recordDividendPayment (success + error)
 * - getDividendHistory (no options, all filter combos)
 * - getDividendStocks (yield calc, sorting, edge cases)
 * - getDividendSummary (YTD, projections, qualified/ordinary)
 * - getIncomeProjections (different periods)
 * - getDividendCalendar (ex-date / pay-date filtering)
 * - getDRIPSettings / updateDRIPSettings (CRUD + error)
 * - getTaxReport (aggregation by type, account, symbol)
 * - getFrequencyMultiplier (all frequencies + default)
 * - mapRowToPayment field mapping
 * - getDividendTrackingService singleton
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

function makePaymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "div-001",
    user_id: "user-1",
    account_id: "acct-1",
    symbol: "AAPL",
    company_name: "Apple Inc.",
    ex_date: "2026-01-10T00:00:00.000Z",
    pay_date: "2026-01-15T00:00:00.000Z",
    record_date: "2026-01-12T00:00:00.000Z",
    amount: 0.82,
    shares_held: 100,
    total_amount: 82,
    dividend_type: "qualified",
    reinvested: false,
    reinvested_shares: null,
    reinvested_price: null,
    created_at: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

function makeHoldingRow(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "AAPL",
    company_name: "Apple Inc.",
    shares: 100,
    avg_cost_basis: 150,
    current_price: 200,
    user_id: "user-1",
    ...overrides,
  };
}

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

function makeDripRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "user-1",
    account_id: "acct-1",
    enabled: true,
    symbols: ["AAPL", "MSFT"],
    min_reinvest_amount: 10,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Chain mock builder for dividend_payments table
// ---------------------------------------------------------------------------

/**
 * Build a chainable mock for the "dividend_payments" table.
 * The DividendTrackingService chains:
 *   insert: .from().insert({}).select().single()
 *   select: .from().select("*").eq().order() [+ optional .eq/.gte/.lte/.limit]
 */
function buildPaymentsChain(opts: {
  insertResult?: { data: unknown; error: unknown };
  selectResult?: { data: unknown; error: unknown };
}) {
  const chain: Record<string, any> = {};

  if (opts.insertResult) {
    chain.insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(opts.insertResult),
      }),
    });
  }

  if (opts.selectResult) {
    // Build a deep chain that supports all filter combos:
    // .select("*").eq("user_id", ...).order(...) [.eq() .gte() .lte() .limit()]
    // Each filter method returns itself so they can chain in any order.
    const terminal = opts.selectResult;

    const filterChain: Record<string, any> = {};
    const makeFilterable = (): Record<string, any> => {
      const obj: Record<string, any> = {};
      obj.eq = jest.fn().mockImplementation(() => makeFilterable());
      obj.gte = jest.fn().mockImplementation(() => makeFilterable());
      obj.lte = jest.fn().mockImplementation(() => makeFilterable());
      obj.limit = jest.fn().mockResolvedValue(terminal);
      // If no more chaining, resolve as a thenable so `await` works
      obj.then = (resolve: any, reject: any) =>
        Promise.resolve(terminal).then(resolve, reject);
      return obj;
    };

    const orderMock = jest.fn().mockImplementation(() => makeFilterable());

    const eqMock: any = jest.fn().mockImplementation(() => ({
      order: orderMock,
      eq: eqMock,
      gte: jest.fn().mockImplementation(() => makeFilterable()),
      lte: jest.fn().mockImplementation(() => makeFilterable()),
      limit: jest.fn().mockResolvedValue(terminal),
      then: (resolve: any, reject: any) =>
        Promise.resolve(terminal).then(resolve, reject),
    }));

    chain.select = jest.fn().mockReturnValue({
      eq: eqMock,
    });
  }

  return chain;
}

/**
 * Build a chainable mock for the "holdings" table.
 * Chain: .from("holdings").select("*").eq("user_id",...).gt("shares",0)
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

/**
 * Build a chainable mock for the "drip_settings" table.
 * GET chain:  .from().select("*").eq().eq().single()
 * PUT chain:  .from().upsert({}).select().single()
 */
function buildDripChain(opts: {
  getResult?: { data: unknown; error: unknown };
  upsertResult?: { data: unknown; error: unknown };
}) {
  const chain: Record<string, any> = {};

  if (opts.getResult) {
    const singleMock = jest.fn().mockResolvedValue(opts.getResult);
    const eqMock2 = jest.fn().mockReturnValue({ single: singleMock });
    const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
    chain.select = jest.fn().mockReturnValue({ eq: eqMock1 });
  }

  if (opts.upsertResult) {
    chain.upsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(opts.upsertResult),
      }),
    });
  }

  return chain;
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
  // recordDividendPayment
  // =========================================================================
  describe("recordDividendPayment", () => {
    const paymentInput = {
      userId: "user-1",
      accountId: "acct-1",
      symbol: "AAPL",
      companyName: "Apple Inc.",
      exDate: new Date("2026-01-10"),
      payDate: new Date("2026-01-15"),
      recordDate: new Date("2026-01-12"),
      amount: 0.82,
      sharesHeld: 100,
      totalAmount: 82,
      dividendType: "qualified" as const,
      reinvested: false,
    };

    it("should insert a payment and return mapped result", async () => {
      const row = makePaymentRow();
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          insertResult: { data: row, error: null },
        }),
      );

      const result = await service.recordDividendPayment(paymentInput);

      expect(mockFrom).toHaveBeenCalledWith("dividend_payments");
      expect(result.id).toBe("div-001");
      expect(result.symbol).toBe("AAPL");
      expect(result.totalAmount).toBe(82);
      expect(result.dividendType).toBe("qualified");
      expect(result.reinvested).toBe(false);
    });

    it("should include reinvested fields when provided", async () => {
      const row = makePaymentRow({
        reinvested: true,
        reinvested_shares: 0.41,
        reinvested_price: 200,
      });
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          insertResult: { data: row, error: null },
        }),
      );

      const result = await service.recordDividendPayment({
        ...paymentInput,
        reinvested: true,
        reinvestedShares: 0.41,
        reinvestedPrice: 200,
      });

      expect(result.reinvested).toBe(true);
      expect(result.reinvestedShares).toBe(0.41);
      expect(result.reinvestedPrice).toBe(200);
    });

    it("should throw when insert fails", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          insertResult: { data: null, error: { message: "insert failed" } },
        }),
      );

      await expect(
        service.recordDividendPayment(paymentInput),
      ).rejects.toThrow("Failed to record dividend: insert failed");
    });

    it("should map dates to ISO strings in the insert payload", async () => {
      const row = makePaymentRow();
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: row, error: null }),
        }),
      });
      mockFrom.mockReturnValue({ insert: insertMock });

      await service.recordDividendPayment(paymentInput);

      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData.ex_date).toBe(paymentInput.exDate.toISOString());
      expect(insertedData.pay_date).toBe(paymentInput.payDate.toISOString());
      expect(insertedData.record_date).toBe(
        paymentInput.recordDate.toISOString(),
      );
      expect(insertedData.user_id).toBe("user-1");
      expect(insertedData.account_id).toBe("acct-1");
      expect(insertedData.symbol).toBe("AAPL");
      expect(insertedData.amount).toBe(0.82);
      expect(insertedData.shares_held).toBe(100);
      expect(insertedData.total_amount).toBe(82);
      expect(insertedData.dividend_type).toBe("qualified");
    });
  });

  // =========================================================================
  // getDividendHistory
  // =========================================================================
  describe("getDividendHistory", () => {
    it("should fetch history for a user with no options", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [makePaymentRow()], error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1");

      expect(mockFrom).toHaveBeenCalledWith("dividend_payments");
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe("AAPL");
      expect(result[0].totalAmount).toBe(82);
    });

    it("should apply symbol filter when provided", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [makePaymentRow()], error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1", {
        symbol: "AAPL",
      });

      expect(result).toHaveLength(1);
    });

    it("should apply date range filters", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [], error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1", {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
      });

      expect(result).toHaveLength(0);
    });

    it("should apply limit", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [makePaymentRow()], error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1", { limit: 5 });

      expect(result).toHaveLength(1);
    });

    it("should apply all options together", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [makePaymentRow()], error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1", {
        symbol: "AAPL",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        limit: 10,
      });

      expect(result).toHaveLength(1);
    });

    it("should throw when query fails", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: null, error: { message: "query error" } },
        }),
      );

      await expect(service.getDividendHistory("user-1")).rejects.toThrow(
        "Failed to get dividend history: query error",
      );
    });

    it("should return empty array when data is null", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: null, error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1");
      expect(result).toEqual([]);
    });

    it("should return properly typed Date fields", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [makePaymentRow()], error: null },
        }),
      );

      const result = await service.getDividendHistory("user-1");

      expect(result[0].exDate).toBeInstanceOf(Date);
      expect(result[0].payDate).toBeInstanceOf(Date);
      expect(result[0].recordDate).toBeInstanceOf(Date);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // getDividendStocks
  // =========================================================================
  describe("getDividendStocks", () => {
    it("should return dividend stocks sorted by yield descending", async () => {
      const holdingsData = [
        makeHoldingRow({ symbol: "AAPL", current_price: 200, shares: 100 }),
        makeHoldingRow({
          symbol: "MSFT",
          company_name: "Microsoft",
          current_price: 400,
          shares: 50,
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
        if (table === "holdings") {
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
        if (table === "holdings") {
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
        if (table === "holdings") {
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
        if (table === "holdings") {
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
        if (table === "holdings") {
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
        if (table === "holdings") {
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

    it("should use company_name from holding, fallback to symbol", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow({ company_name: null, symbol: "XYZ" })],
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
        if (table === "holdings") {
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
        if (table === "holdings") {
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
        if (table === "holdings") {
          return buildHoldingsChain({ data: [], error: null });
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result).toEqual([]);
    });

    it("should default frequency to quarterly when not provided", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "holdings") {
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
        if (table === "holdings") {
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
        if (table === "holdings") {
          return buildHoldingsChain({ data: null, error: null });
        }
        return {};
      });

      const result = await service.getDividendStocks("user-1");
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // getDividendSummary
  // =========================================================================
  describe("getDividendSummary", () => {
    /**
     * getDividendSummary calls getDividendHistory(userId, { startDate })
     * and getDividendStocks(userId) internally.
     * We mock both table chains via mockFrom.mockImplementation.
     */

    function setupSummaryMocks(
      ytdPaymentRows: Record<string, unknown>[],
      holdingsData: Record<string, unknown>[],
      stockDividendResults: { data: unknown; error: unknown }[],
    ) {
      const stockDivChain = buildStockDividendsChain(stockDividendResults);
      mockFrom.mockImplementation((table: string) => {
        if (table === "dividend_payments") {
          return buildPaymentsChain({
            selectResult: { data: ytdPaymentRows, error: null },
          });
        }
        if (table === "holdings") {
          return buildHoldingsChain({ data: holdingsData, error: null });
        }
        if (table === "stock_dividends") {
          return stockDivChain;
        }
        return {};
      });
    }

    it("should compute summary with YTD income and portfolio yield", async () => {
      const now = new Date();
      const jan = new Date(now.getFullYear(), 0, 15);
      const feb = new Date(now.getFullYear(), 1, 15);

      setupSummaryMocks(
        [
          makePaymentRow({
            pay_date: jan.toISOString(),
            total_amount: 82,
            dividend_type: "qualified",
          }),
          makePaymentRow({
            id: "div-002",
            symbol: "MSFT",
            pay_date: feb.toISOString(),
            total_amount: 50,
            dividend_type: "ordinary",
          }),
        ],
        [
          makeHoldingRow({
            symbol: "AAPL",
            current_price: 200,
            shares: 100,
          }),
        ],
        [
          {
            data: makeDividendInfoRow({ annual_dividend: 3.28 }),
            error: null,
          },
        ],
      );

      const summary = await service.getDividendSummary("user-1");

      expect(summary.userId).toBe("user-1");
      expect(summary.ytdIncome).toBe(132); // 82 + 50
      // totalAnnualIncome = 3.28 * 100 = 328
      expect(summary.totalAnnualIncome).toBe(328);
      expect(summary.totalMonthlyIncome).toBeCloseTo(328 / 12, 2);
      // portfolioYield = (328 / (200 * 100)) * 100 = 1.64%
      expect(summary.portfolioYield).toBeCloseTo(1.64, 2);
      expect(summary.totalDividendStocks).toBe(1);
    });

    it("should separate qualified vs ordinary dividends", async () => {
      const now = new Date();

      setupSummaryMocks(
        [
          makePaymentRow({
            pay_date: new Date(now.getFullYear(), 0, 15).toISOString(),
            total_amount: 100,
            dividend_type: "qualified",
          }),
          makePaymentRow({
            id: "d2",
            pay_date: new Date(now.getFullYear(), 1, 15).toISOString(),
            total_amount: 60,
            dividend_type: "ordinary",
          }),
          makePaymentRow({
            id: "d3",
            pay_date: new Date(now.getFullYear(), 2, 15).toISOString(),
            total_amount: 40,
            dividend_type: "return_of_capital",
          }),
        ],
        [],
        [],
      );

      const summary = await service.getDividendSummary("user-1");

      // qualified = 100, ordinary = 60 + 40 (non-qualified counted as ordinary)
      expect(summary.qualifiedVsOrdinary.qualified).toBe(100);
      expect(summary.qualifiedVsOrdinary.ordinary).toBe(100);
    });

    it("should handle empty dividends and no stocks", async () => {
      setupSummaryMocks([], [], []);

      const summary = await service.getDividendSummary("user-1");

      expect(summary.ytdIncome).toBe(0);
      expect(summary.totalAnnualIncome).toBe(0);
      expect(summary.portfolioYield).toBe(0);
      expect(summary.totalDividendStocks).toBe(0);
      expect(summary.nextPaymentDate).toBeUndefined();
      expect(summary.nextPaymentAmount).toBeUndefined();
      expect(summary.incomeByMonth).toEqual([]);
      expect(summary.incomeByStock).toEqual([]);
    });

    it("should identify next upcoming payment", async () => {
      const now = new Date();
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15);

      setupSummaryMocks(
        [],
        [makeHoldingRow({ symbol: "AAPL", shares: 100, current_price: 200 })],
        [
          {
            data: makeDividendInfoRow({
              annual_dividend: 4.0,
              frequency: "quarterly",
              next_pay_date: futureDate.toISOString(),
            }),
            error: null,
          },
        ],
      );

      const summary = await service.getDividendSummary("user-1");

      expect(summary.nextPaymentDate).toEqual(futureDate);
      // nextPaymentAmount = 4.0 * 100 * (1/4) = 100
      expect(summary.nextPaymentAmount).toBe(100);
    });

    it("should compute incomeByStock sorted by amount descending", async () => {
      const now = new Date();

      setupSummaryMocks(
        [
          makePaymentRow({
            symbol: "LOW",
            total_amount: 10,
            pay_date: new Date(now.getFullYear(), 0, 15).toISOString(),
          }),
          makePaymentRow({
            id: "d2",
            symbol: "HIGH",
            total_amount: 999,
            pay_date: new Date(now.getFullYear(), 1, 15).toISOString(),
          }),
          makePaymentRow({
            id: "d3",
            symbol: "MID",
            total_amount: 50,
            pay_date: new Date(now.getFullYear(), 2, 15).toISOString(),
          }),
        ],
        [],
        [],
      );

      const summary = await service.getDividendSummary("user-1");

      expect(summary.incomeByStock[0].symbol).toBe("HIGH");
      expect(summary.incomeByStock[1].symbol).toBe("MID");
      expect(summary.incomeByStock[2].symbol).toBe("LOW");
    });
  });

  // =========================================================================
  // getIncomeProjections
  // =========================================================================
  describe("getIncomeProjections", () => {
    function setupProjectionMocks(
      holdingsData: Record<string, unknown>[],
      stockDividendResults: { data: unknown; error: unknown }[],
    ) {
      const stockDivChain = buildStockDividendsChain(stockDividendResults);
      mockFrom.mockImplementation((table: string) => {
        if (table === "holdings") {
          return buildHoldingsChain({ data: holdingsData, error: null });
        }
        if (table === "stock_dividends") {
          return stockDivChain;
        }
        return {};
      });
    }

    it("should project income for monthly frequency", async () => {
      setupProjectionMocks(
        [makeHoldingRow({ symbol: "AAPL", shares: 100, current_price: 200 })],
        [
          {
            data: makeDividendInfoRow({
              annual_dividend: 12.0,
              frequency: "monthly",
            }),
            error: null,
          },
        ],
      );

      const projections = await service.getIncomeProjections("user-1", 3);

      expect(projections).toHaveLength(3);
      // monthly: getMonthsBetween for a single month span = 1
      // paymentsExpected = 1 for monthly
      // perPaymentAmount = 12.0 * 100 * (1/12) = 100
      for (const proj of projections) {
        expect(proj.payments).toHaveLength(1);
        expect(proj.projectedAmount).toBeCloseTo(100, 1);
      }
    });

    it("should project zero for quarterly in single-month periods", async () => {
      setupProjectionMocks(
        [makeHoldingRow({ symbol: "AAPL", shares: 200, current_price: 150 })],
        [
          {
            data: makeDividendInfoRow({
              annual_dividend: 4.0,
              frequency: "quarterly",
            }),
            error: null,
          },
        ],
      );

      const projections = await service.getIncomeProjections("user-1", 6);

      expect(projections).toHaveLength(6);
      // For single-month periods, monthsInPeriod < 3 => 0 payments
      for (const proj of projections) {
        expect(proj.payments).toHaveLength(0);
        expect(proj.projectedAmount).toBe(0);
      }
    });

    it("should default to 12 months if not specified", async () => {
      setupProjectionMocks([], []);

      const projections = await service.getIncomeProjections("user-1");
      expect(projections).toHaveLength(12);
    });

    it("should return zero projections when no dividend stocks", async () => {
      setupProjectionMocks([], []);

      const projections = await service.getIncomeProjections("user-1", 3);

      expect(projections).toHaveLength(3);
      for (const proj of projections) {
        expect(proj.projectedAmount).toBe(0);
        expect(proj.payments).toHaveLength(0);
      }
    });

    it("should format month labels correctly", async () => {
      setupProjectionMocks([], []);

      const projections = await service.getIncomeProjections("user-1", 1);

      // Should have a label like "Mar 2026"
      expect(projections[0].month).toMatch(/[A-Z][a-z]+ \d{4}/);
    });
  });

  // =========================================================================
  // getDividendCalendar
  // =========================================================================
  describe("getDividendCalendar", () => {
    const startDate = new Date("2026-03-01");
    const endDate = new Date("2026-06-30");

    function setupCalendarMocks(
      holdingsData: Record<string, unknown>[],
      stockDividendResults: { data: unknown; error: unknown }[],
    ) {
      const stockDivChain = buildStockDividendsChain(stockDividendResults);
      mockFrom.mockImplementation((table: string) => {
        if (table === "holdings") {
          return buildHoldingsChain({ data: holdingsData, error: null });
        }
        if (table === "stock_dividends") {
          return stockDivChain;
        }
        return {};
      });
    }

    it("should return ex-date and pay-date entries in date range", async () => {
      const exDate = new Date("2026-04-01");
      const payDate = new Date("2026-04-15");

      setupCalendarMocks(
        [makeHoldingRow({ symbol: "AAPL", shares: 100, current_price: 200 })],
        [
          {
            data: makeDividendInfoRow({
              annual_dividend: 4.0,
              frequency: "quarterly",
              next_ex_date: exDate.toISOString(),
              next_pay_date: payDate.toISOString(),
            }),
            error: null,
          },
        ],
      );

      const entries = await service.getDividendCalendar(
        "user-1",
        startDate,
        endDate,
      );

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe("ex_date");
      expect(entries[0].symbol).toBe("AAPL");
      // amount = 4.0 * 0.25 = 1.0
      expect(entries[0].amount).toBe(1.0);
      // totalAmount = 4.0 * 100 * 0.25 = 100
      expect(entries[0].totalAmount).toBe(100);
      expect(entries[0].sharesHeld).toBe(100);
      expect(entries[0].companyName).toBe("Apple Inc.");
      expect(entries[1].type).toBe("pay_date");
    });

    it("should exclude entries outside date range", async () => {
      setupCalendarMocks(
        [makeHoldingRow()],
        [
          {
            data: makeDividendInfoRow({
              next_ex_date: "2026-01-01T00:00:00.000Z",
              next_pay_date: "2026-01-15T00:00:00.000Z",
            }),
            error: null,
          },
        ],
      );

      const entries = await service.getDividendCalendar(
        "user-1",
        startDate,
        endDate,
      );

      expect(entries).toHaveLength(0);
    });

    it("should sort entries by date ascending", async () => {
      const earlyEx = new Date("2026-03-10");
      const lateEx = new Date("2026-05-10");

      setupCalendarMocks(
        [
          makeHoldingRow({
            symbol: "MSFT",
            company_name: "Microsoft",
            current_price: 400,
            shares: 50,
          }),
          makeHoldingRow({
            symbol: "AAPL",
            current_price: 200,
            shares: 100,
          }),
        ],
        [
          {
            data: makeDividendInfoRow({
              symbol: "MSFT",
              next_ex_date: lateEx.toISOString(),
              next_pay_date: null,
            }),
            error: null,
          },
          {
            data: makeDividendInfoRow({
              symbol: "AAPL",
              next_ex_date: earlyEx.toISOString(),
              next_pay_date: null,
            }),
            error: null,
          },
        ],
      );

      const entries = await service.getDividendCalendar(
        "user-1",
        startDate,
        endDate,
      );

      expect(entries.length).toBeGreaterThanOrEqual(2);
      // Earliest date first
      expect(entries[0].date.getTime()).toBeLessThanOrEqual(
        entries[1].date.getTime(),
      );
    });

    it("should handle stocks with no upcoming dates", async () => {
      setupCalendarMocks(
        [makeHoldingRow()],
        [
          {
            data: makeDividendInfoRow({
              next_ex_date: null,
              next_pay_date: null,
            }),
            error: null,
          },
        ],
      );

      const entries = await service.getDividendCalendar(
        "user-1",
        startDate,
        endDate,
      );

      expect(entries).toHaveLength(0);
    });

    it("should return empty when no dividend stocks", async () => {
      setupCalendarMocks([], []);

      const entries = await service.getDividendCalendar(
        "user-1",
        startDate,
        endDate,
      );

      expect(entries).toEqual([]);
    });
  });

  // =========================================================================
  // getDRIPSettings
  // =========================================================================
  describe("getDRIPSettings", () => {
    it("should return DRIP settings when found", async () => {
      const row = makeDripRow();
      mockFrom.mockReturnValue(
        buildDripChain({ getResult: { data: row, error: null } }),
      );

      const result = await service.getDRIPSettings("user-1", "acct-1");

      expect(mockFrom).toHaveBeenCalledWith("drip_settings");
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-1");
      expect(result!.accountId).toBe("acct-1");
      expect(result!.enabled).toBe(true);
      expect(result!.symbols).toEqual(["AAPL", "MSFT"]);
      expect(result!.minReinvestAmount).toBe(10);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it("should return null when error occurs", async () => {
      mockFrom.mockReturnValue(
        buildDripChain({
          getResult: { data: null, error: { message: "not found" } },
        }),
      );

      const result = await service.getDRIPSettings("user-1", "acct-1");
      expect(result).toBeNull();
    });

    it("should handle null symbols by defaulting to empty array", async () => {
      const row = makeDripRow({ symbols: null });
      mockFrom.mockReturnValue(
        buildDripChain({ getResult: { data: row, error: null } }),
      );

      const result = await service.getDRIPSettings("user-1", "acct-1");
      expect(result!.symbols).toEqual([]);
    });
  });

  // =========================================================================
  // updateDRIPSettings
  // =========================================================================
  describe("updateDRIPSettings", () => {
    it("should upsert settings and return mapped result", async () => {
      const row = makeDripRow({ enabled: false });
      mockFrom.mockReturnValue(
        buildDripChain({ upsertResult: { data: row, error: null } }),
      );

      const result = await service.updateDRIPSettings("user-1", "acct-1", {
        enabled: false,
        symbols: ["AAPL"],
        minReinvestAmount: 25,
      });

      expect(mockFrom).toHaveBeenCalledWith("drip_settings");
      expect(result.enabled).toBe(false);
      expect(result.userId).toBe("user-1");
      expect(result.accountId).toBe("acct-1");
    });

    it("should throw when upsert fails", async () => {
      mockFrom.mockReturnValue(
        buildDripChain({
          upsertResult: { data: null, error: { message: "upsert failed" } },
        }),
      );

      await expect(
        service.updateDRIPSettings("user-1", "acct-1", { enabled: true }),
      ).rejects.toThrow("Failed to update DRIP settings: upsert failed");
    });

    it("should handle null symbols in response", async () => {
      const row = makeDripRow({ symbols: null });
      mockFrom.mockReturnValue(
        buildDripChain({ upsertResult: { data: row, error: null } }),
      );

      const result = await service.updateDRIPSettings("user-1", "acct-1", {
        enabled: true,
      });

      expect(result.symbols).toEqual([]);
    });

    it("should pass correct fields to upsert", async () => {
      const row = makeDripRow();
      const upsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: row, error: null }),
        }),
      });
      mockFrom.mockReturnValue({ upsert: upsertMock });

      await service.updateDRIPSettings("user-1", "acct-1", {
        enabled: true,
        symbols: ["AAPL", "MSFT"],
        minReinvestAmount: 50,
      });

      const upsertData = upsertMock.mock.calls[0][0];
      expect(upsertData.user_id).toBe("user-1");
      expect(upsertData.account_id).toBe("acct-1");
      expect(upsertData.enabled).toBe(true);
      expect(upsertData.symbols).toEqual(["AAPL", "MSFT"]);
      expect(upsertData.min_reinvest_amount).toBe(50);
      expect(upsertData.updated_at).toBeDefined();
    });
  });

  // =========================================================================
  // getTaxReport
  // =========================================================================
  describe("getTaxReport", () => {
    it("should aggregate dividends by type, account, and symbol", async () => {
      const rows = [
        makePaymentRow({
          id: "d1",
          account_id: "acct-1",
          symbol: "AAPL",
          total_amount: 100,
          dividend_type: "qualified",
          pay_date: "2026-03-15T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d2",
          account_id: "acct-1",
          symbol: "MSFT",
          total_amount: 50,
          dividend_type: "ordinary",
          pay_date: "2026-06-15T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d3",
          account_id: "acct-2",
          symbol: "AAPL",
          total_amount: 30,
          dividend_type: "return_of_capital",
          pay_date: "2026-09-15T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d4",
          account_id: "acct-2",
          symbol: "VZ",
          total_amount: 20,
          dividend_type: "capital_gain",
          pay_date: "2026-12-15T00:00:00.000Z",
        }),
      ];

      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: rows, error: null },
        }),
      );

      const report = await service.getTaxReport("user-1", 2026);

      expect(report.year).toBe(2026);
      expect(report.totalDividends).toBe(200);
      expect(report.qualifiedDividends).toBe(100);
      expect(report.ordinaryDividends).toBe(50);
      expect(report.returnOfCapital).toBe(30);
      expect(report.capitalGainDistributions).toBe(20);

      // byAccount
      expect(report.byAccount).toHaveLength(2);
      const acct1 = report.byAccount.find((a) => a.accountId === "acct-1");
      expect(acct1!.total).toBe(150);
      expect(acct1!.qualified).toBe(100);
      const acct2 = report.byAccount.find((a) => a.accountId === "acct-2");
      expect(acct2!.total).toBe(50);
      expect(acct2!.qualified).toBe(0);

      // bySymbol sorted by total desc
      expect(report.bySymbol[0].symbol).toBe("AAPL");
      expect(report.bySymbol[0].total).toBe(130);
      expect(report.bySymbol[0].qualified).toBe(100);
    });

    it("should return zeros when no dividends for the year", async () => {
      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: [], error: null },
        }),
      );

      const report = await service.getTaxReport("user-1", 2025);

      expect(report.year).toBe(2025);
      expect(report.totalDividends).toBe(0);
      expect(report.qualifiedDividends).toBe(0);
      expect(report.ordinaryDividends).toBe(0);
      expect(report.returnOfCapital).toBe(0);
      expect(report.capitalGainDistributions).toBe(0);
      expect(report.byAccount).toEqual([]);
      expect(report.bySymbol).toEqual([]);
    });

    it("should sort bySymbol by total descending", async () => {
      const rows = [
        makePaymentRow({
          id: "d1",
          symbol: "LOW",
          total_amount: 10,
          pay_date: "2026-06-01T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d2",
          symbol: "HIGH",
          total_amount: 500,
          pay_date: "2026-06-01T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d3",
          symbol: "MID",
          total_amount: 100,
          pay_date: "2026-06-01T00:00:00.000Z",
        }),
      ];

      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: rows, error: null },
        }),
      );

      const report = await service.getTaxReport("user-1", 2026);

      expect(report.bySymbol[0].symbol).toBe("HIGH");
      expect(report.bySymbol[1].symbol).toBe("MID");
      expect(report.bySymbol[2].symbol).toBe("LOW");
    });

    it("should handle multiple dividends for same symbol", async () => {
      const rows = [
        makePaymentRow({
          id: "d1",
          symbol: "AAPL",
          total_amount: 80,
          dividend_type: "qualified",
          pay_date: "2026-03-15T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d2",
          symbol: "AAPL",
          total_amount: 85,
          dividend_type: "qualified",
          pay_date: "2026-06-15T00:00:00.000Z",
        }),
        makePaymentRow({
          id: "d3",
          symbol: "AAPL",
          total_amount: 90,
          dividend_type: "ordinary",
          pay_date: "2026-09-15T00:00:00.000Z",
        }),
      ];

      mockFrom.mockReturnValue(
        buildPaymentsChain({
          selectResult: { data: rows, error: null },
        }),
      );

      const report = await service.getTaxReport("user-1", 2026);

      expect(report.bySymbol).toHaveLength(1);
      expect(report.bySymbol[0].symbol).toBe("AAPL");
      expect(report.bySymbol[0].total).toBe(255);
      expect(report.bySymbol[0].qualified).toBe(165); // 80 + 85
    });
  });

  // =========================================================================
  // getFrequencyMultiplier (tested indirectly via calendar amounts)
  // =========================================================================
  describe("getFrequencyMultiplier (via calendar)", () => {
    const startDate = new Date("2026-03-01");
    const endDate = new Date("2026-06-30");
    const exDate = new Date("2026-04-01");

    async function getCalendarAmountForFrequency(
      frequency: string,
      annualDividend: number,
    ): Promise<number> {
      mockFrom.mockReset();

      mockFrom.mockImplementation((table: string) => {
        if (table === "holdings") {
          return buildHoldingsChain({
            data: [makeHoldingRow({ shares: 1, current_price: 100 })],
            error: null,
          });
        }
        if (table === "stock_dividends") {
          return buildStockDividendsChain([
            {
              data: makeDividendInfoRow({
                annual_dividend: annualDividend,
                frequency,
                next_ex_date: exDate.toISOString(),
                next_pay_date: null,
              }),
              error: null,
            },
          ]);
        }
        return {};
      });

      const entries = await service.getDividendCalendar(
        "user-1",
        startDate,
        endDate,
      );

      return entries.length > 0 ? entries[0].amount : 0;
    }

    it("monthly => 1/12 multiplier", async () => {
      const amount = await getCalendarAmountForFrequency("monthly", 12);
      expect(amount).toBeCloseTo(1.0, 5);
    });

    it("quarterly => 1/4 multiplier", async () => {
      const amount = await getCalendarAmountForFrequency("quarterly", 4);
      expect(amount).toBeCloseTo(1.0, 5);
    });

    it("semi-annual => 1/2 multiplier", async () => {
      const amount = await getCalendarAmountForFrequency("semi-annual", 2);
      expect(amount).toBeCloseTo(1.0, 5);
    });

    it("annual => 1 multiplier", async () => {
      const amount = await getCalendarAmountForFrequency("annual", 5);
      expect(amount).toBeCloseTo(5.0, 5);
    });

    it("irregular (default) => 1/4 multiplier", async () => {
      const amount = await getCalendarAmountForFrequency("irregular", 8);
      expect(amount).toBeCloseTo(2.0, 5);
    });
  });

  // =========================================================================
  // mapRowToPayment (comprehensive field mapping)
  // =========================================================================
  describe("mapRowToPayment (via recordDividendPayment)", () => {
    it("should map all fields correctly", async () => {
      const row = makePaymentRow({
        id: "div-999",
        user_id: "user-42",
        account_id: "acct-7",
        symbol: "JNJ",
        company_name: "Johnson & Johnson",
        ex_date: "2026-05-10T00:00:00.000Z",
        pay_date: "2026-05-20T00:00:00.000Z",
        record_date: "2026-05-12T00:00:00.000Z",
        amount: 1.19,
        shares_held: 50,
        total_amount: 59.5,
        dividend_type: "ordinary",
        reinvested: true,
        reinvested_shares: 0.3,
        reinvested_price: 198.33,
        created_at: "2026-05-20T12:00:00.000Z",
      });

      mockFrom.mockReturnValue(
        buildPaymentsChain({
          insertResult: { data: row, error: null },
        }),
      );

      const result = await service.recordDividendPayment({
        userId: "user-42",
        accountId: "acct-7",
        symbol: "JNJ",
        companyName: "Johnson & Johnson",
        exDate: new Date("2026-05-10"),
        payDate: new Date("2026-05-20"),
        recordDate: new Date("2026-05-12"),
        amount: 1.19,
        sharesHeld: 50,
        totalAmount: 59.5,
        dividendType: "ordinary",
        reinvested: true,
        reinvestedShares: 0.3,
        reinvestedPrice: 198.33,
      });

      expect(result.id).toBe("div-999");
      expect(result.userId).toBe("user-42");
      expect(result.accountId).toBe("acct-7");
      expect(result.symbol).toBe("JNJ");
      expect(result.companyName).toBe("Johnson & Johnson");
      expect(result.exDate).toBeInstanceOf(Date);
      expect(result.payDate).toBeInstanceOf(Date);
      expect(result.recordDate).toBeInstanceOf(Date);
      expect(result.amount).toBe(1.19);
      expect(result.sharesHeld).toBe(50);
      expect(result.totalAmount).toBe(59.5);
      expect(result.dividendType).toBe("ordinary");
      expect(result.reinvested).toBe(true);
      expect(result.reinvestedShares).toBe(0.3);
      expect(result.reinvestedPrice).toBe(198.33);
      expect(result.createdAt).toBeInstanceOf(Date);
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
