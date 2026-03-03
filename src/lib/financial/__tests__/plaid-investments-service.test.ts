/**
 * @jest-environment node
 */

/**
 * Plaid Investments Service Unit Tests
 *
 * Tests for investment holdings, transactions, and securities retrieval via Plaid SDK.
 */

// Environment variables
process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";

// Plaid SDK mocks
const mockInvestmentsHoldingsGet = jest.fn();
const mockInvestmentsTransactionsGet = jest.fn();

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({
    investmentsHoldingsGet: mockInvestmentsHoldingsGet,
    investmentsTransactionsGet: mockInvestmentsTransactionsGet,
  }),
}));

import {
  plaidInvestmentsService,
  PlaidHolding,
  PlaidSecurity,
  PlaidInvestmentTransaction,
} from "../plaid-investments-service";

// ==========================================================================
// Mock Data
// ==========================================================================

const mockHoldingsResponse = {
  data: {
    accounts: [
      {
        account_id: "acc-inv-1",
        name: "Brokerage Account",
        official_name: "Individual Brokerage",
        type: "investment",
        subtype: "brokerage",
        mask: "5678",
        balances: {
          current: 150000,
          available: null,
          iso_currency_code: "USD",
        },
      },
    ],
    holdings: [
      {
        account_id: "acc-inv-1",
        security_id: "sec-aapl",
        institution_price: 175.5,
        institution_price_as_of: "2026-02-28",
        institution_value: 17550,
        cost_basis: 15000,
        quantity: 100,
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        vested_quantity: 80,
        vested_value: 14040,
      },
      {
        account_id: "acc-inv-1",
        security_id: "sec-msft",
        institution_price: 420.0,
        institution_price_as_of: null,
        institution_value: 42000,
        cost_basis: null,
        quantity: 100,
        iso_currency_code: null,
        unofficial_currency_code: "BTC",
        vested_quantity: null,
        vested_value: null,
      },
    ],
    securities: [
      {
        security_id: "sec-aapl",
        name: "Apple Inc",
        ticker_symbol: "AAPL",
        isin: "US0378331005",
        cusip: "037833100",
        type: "equity",
        close_price: 174.8,
        close_price_as_of: "2026-02-27",
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        is_cash_equivalent: false,
        sector: "Technology",
        industry: "Consumer Electronics",
      },
      {
        security_id: "sec-msft",
        name: "Microsoft Corporation",
        ticker_symbol: "MSFT",
        isin: null,
        cusip: null,
        type: "equity",
        close_price: 418.5,
        close_price_as_of: "2026-02-27",
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        is_cash_equivalent: false,
        sector: "Technology",
        industry: "Software",
      },
    ],
    item: { item_id: "item-123" },
    request_id: "req-123",
  },
};

const mockTransactionsResponse = {
  data: {
    item: { item_id: "item-123" },
    accounts: [
      {
        account_id: "acc-inv-1",
        name: "Brokerage",
        official_name: null,
        type: "investment",
      },
    ],
    securities: [
      {
        security_id: "sec-aapl",
        name: "Apple Inc",
        ticker_symbol: "AAPL",
        isin: null,
        cusip: null,
        type: "equity",
        close_price: 174.8,
        close_price_as_of: "2026-02-27",
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        is_cash_equivalent: false,
        sector: "Technology",
        industry: "Consumer Electronics",
      },
    ],
    investment_transactions: [
      {
        investment_transaction_id: "inv-txn-1",
        account_id: "acc-inv-1",
        security_id: "sec-aapl",
        date: "2026-02-15",
        name: "BUY AAPL",
        quantity: 10,
        amount: 1755.0,
        price: 175.5,
        fees: 4.99,
        type: "buy",
        subtype: "buy",
        iso_currency_code: "USD",
        unofficial_currency_code: null,
      },
      {
        investment_transaction_id: "inv-txn-2",
        account_id: "acc-inv-1",
        security_id: null,
        date: "2026-02-10",
        name: "DIVIDEND AAPL",
        quantity: 0,
        amount: -12.5,
        price: 0,
        fees: null,
        type: "cash",
        subtype: "dividend",
        iso_currency_code: null,
        unofficial_currency_code: "BTC",
      },
    ],
    total_investment_transactions: 2,
    request_id: "req-456",
  },
};

// ==========================================================================
// TESTS
// ==========================================================================

describe("PlaidInvestmentsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // getHoldings
  // ========================================================================
  describe("getHoldings", () => {
    it("should call investmentsHoldingsGet with the access token", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(mockInvestmentsHoldingsGet).toHaveBeenCalledTimes(1);
      expect(mockInvestmentsHoldingsGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
      });
    });

    it("should return mapped holdings", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.holdings).toHaveLength(2);
      const h1: PlaidHolding = result.holdings[0];
      expect(h1.accountId).toBe("acc-inv-1");
      expect(h1.securityId).toBe("sec-aapl");
      expect(h1.institutionPrice).toBe(175.5);
      expect(h1.institutionPriceAsOf).toBe("2026-02-28");
      expect(h1.institutionValue).toBe(17550);
      expect(h1.costBasis).toBe(15000);
      expect(h1.quantity).toBe(100);
      expect(h1.currency).toBe("USD");
      expect(h1.vestedQuantity).toBe(80);
      expect(h1.vestedValue).toBe(14040);
    });

    it("should handle null costBasis and vested fields", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      const h2: PlaidHolding = result.holdings[1];
      expect(h2.costBasis).toBeNull();
      expect(h2.vestedQuantity).toBeNull();
      expect(h2.vestedValue).toBeNull();
    });

    it("should use unofficial_currency_code when iso_currency_code is null", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.holdings[1].currency).toBe("BTC");
    });

    it("should default currency to USD when both currency codes are null", async () => {
      const response = {
        data: {
          ...mockHoldingsResponse.data,
          holdings: [
            {
              account_id: "acc-1",
              security_id: "sec-1",
              institution_price: 100,
              institution_price_as_of: null,
              institution_value: 1000,
              cost_basis: 900,
              quantity: 10,
              iso_currency_code: null,
              unofficial_currency_code: null,
              vested_quantity: null,
              vested_value: null,
            },
          ],
        },
      };
      mockInvestmentsHoldingsGet.mockResolvedValue(response);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.holdings[0].currency).toBe("USD");
    });

    it("should return mapped securities", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.securities).toHaveLength(2);
      const s1: PlaidSecurity = result.securities[0];
      expect(s1.securityId).toBe("sec-aapl");
      expect(s1.name).toBe("Apple Inc");
      expect(s1.tickerSymbol).toBe("AAPL");
      expect(s1.isin).toBe("US0378331005");
      expect(s1.cusip).toBe("037833100");
      expect(s1.type).toBe("equity");
      expect(s1.closePrice).toBe(174.8);
      expect(s1.closePriceAsOf).toBe("2026-02-27");
      expect(s1.currency).toBe("USD");
      expect(s1.isCashEquivalent).toBe(false);
      expect(s1.sector).toBe("Technology");
      expect(s1.industry).toBe("Consumer Electronics");
    });

    it("should handle null security fields", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      const s2: PlaidSecurity = result.securities[1];
      expect(s2.isin).toBeNull();
      expect(s2.cusip).toBeNull();
    });

    it("should return mapped accounts", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].accountId).toBe("acc-inv-1");
      expect(result.accounts[0].name).toBe("Individual Brokerage");
      expect(result.accounts[0].type).toBe("investment");
    });

    it("should use name when official_name is null", async () => {
      const response = {
        data: {
          ...mockHoldingsResponse.data,
          accounts: [
            {
              account_id: "acc-1",
              name: "My Account",
              official_name: null,
              type: "investment",
            },
          ],
        },
      };
      mockInvestmentsHoldingsGet.mockResolvedValue(response);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.accounts[0].name).toBe("My Account");
    });

    it("should handle empty holdings", async () => {
      const response = {
        data: {
          accounts: [],
          holdings: [],
          securities: [],
          item: { item_id: "item-123" },
          request_id: "req-123",
        },
      };
      mockInvestmentsHoldingsGet.mockResolvedValue(response);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.holdings).toEqual([]);
      expect(result.securities).toEqual([]);
      expect(result.accounts).toEqual([]);
    });

    it("should throw when access token is empty", async () => {
      await expect(plaidInvestmentsService.getHoldings("")).rejects.toThrow(
        "Access token is required",
      );
      expect(mockInvestmentsHoldingsGet).not.toHaveBeenCalled();
    });

    it("should throw when SDK call rejects", async () => {
      mockInvestmentsHoldingsGet.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidInvestmentsService.getHoldings("access-token-abc"),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should propagate Plaid API errors", async () => {
      const plaidError = new Error("INVALID_ACCESS_TOKEN");
      (plaidError as unknown as Record<string, unknown>).response = {
        status: 400,
        data: {
          error_type: "INVALID_INPUT",
          error_code: "INVALID_ACCESS_TOKEN",
        },
      };
      mockInvestmentsHoldingsGet.mockRejectedValue(plaidError);

      await expect(
        plaidInvestmentsService.getHoldings("bad-token"),
      ).rejects.toThrow("INVALID_ACCESS_TOKEN");
    });

    it("should handle null institution_price_as_of", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const result = await plaidInvestmentsService.getHoldings("access-token-abc");

      expect(result.holdings[1].institutionPriceAsOf).toBeNull();
    });
  });

  // ========================================================================
  // getTransactions
  // ========================================================================
  describe("getTransactions", () => {
    it("should call investmentsTransactionsGet with correct params", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(mockInvestmentsTransactionsGet).toHaveBeenCalledTimes(1);
      expect(mockInvestmentsTransactionsGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
        start_date: "2026-02-01",
        end_date: "2026-02-28",
      });
    });

    it("should return mapped investment transactions", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(result.transactions).toHaveLength(2);
      const t1: PlaidInvestmentTransaction = result.transactions[0];
      expect(t1.investmentTransactionId).toBe("inv-txn-1");
      expect(t1.accountId).toBe("acc-inv-1");
      expect(t1.securityId).toBe("sec-aapl");
      expect(t1.date).toBe("2026-02-15");
      expect(t1.name).toBe("BUY AAPL");
      expect(t1.quantity).toBe(10);
      expect(t1.amount).toBe(1755.0);
      expect(t1.price).toBe(175.5);
      expect(t1.fees).toBe(4.99);
      expect(t1.type).toBe("buy");
      expect(t1.subtype).toBe("buy");
      expect(t1.currency).toBe("USD");
    });

    it("should handle null security_id in transactions", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      const t2: PlaidInvestmentTransaction = result.transactions[1];
      expect(t2.securityId).toBeNull();
    });

    it("should handle null fees", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(result.transactions[1].fees).toBeNull();
    });

    it("should use unofficial_currency_code when iso is null", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(result.transactions[1].currency).toBe("BTC");
    });

    it("should return total_investment_transactions", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(result.totalTransactions).toBe(2);
    });

    it("should return securities with transactions", async () => {
      mockInvestmentsTransactionsGet.mockResolvedValue(mockTransactionsResponse);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(result.securities).toHaveLength(1);
      expect(result.securities[0].securityId).toBe("sec-aapl");
    });

    it("should handle empty transactions", async () => {
      const response = {
        data: {
          item: { item_id: "item-123" },
          accounts: [],
          securities: [],
          investment_transactions: [],
          total_investment_transactions: 0,
          request_id: "req-789",
        },
      };
      mockInvestmentsTransactionsGet.mockResolvedValue(response);

      const result = await plaidInvestmentsService.getTransactions(
        "access-token-abc",
        "2026-02-01",
        "2026-02-28",
      );

      expect(result.transactions).toEqual([]);
      expect(result.totalTransactions).toBe(0);
    });

    it("should throw when access token is empty", async () => {
      await expect(
        plaidInvestmentsService.getTransactions("", "2026-02-01", "2026-02-28"),
      ).rejects.toThrow("Access token is required");
      expect(mockInvestmentsTransactionsGet).not.toHaveBeenCalled();
    });

    it("should throw when start_date is empty", async () => {
      await expect(
        plaidInvestmentsService.getTransactions("access-token-abc", "", "2026-02-28"),
      ).rejects.toThrow("Start date and end date are required");
    });

    it("should throw when end_date is empty", async () => {
      await expect(
        plaidInvestmentsService.getTransactions("access-token-abc", "2026-02-01", ""),
      ).rejects.toThrow("Start date and end date are required");
    });

    it("should throw when SDK call rejects", async () => {
      mockInvestmentsTransactionsGet.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidInvestmentsService.getTransactions(
          "access-token-abc",
          "2026-02-01",
          "2026-02-28",
        ),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should propagate rate limit errors", async () => {
      const rateLimitError = new Error("RATE_LIMIT_EXCEEDED");
      (rateLimitError as unknown as Record<string, unknown>).response = {
        status: 429,
        data: { error_type: "RATE_LIMIT_EXCEEDED" },
      };
      mockInvestmentsTransactionsGet.mockRejectedValue(rateLimitError);

      await expect(
        plaidInvestmentsService.getTransactions(
          "access-token-abc",
          "2026-02-01",
          "2026-02-28",
        ),
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
  });

  // ========================================================================
  // getSecurities
  // ========================================================================
  describe("getSecurities", () => {
    it("should return securities from holdings", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      const securities = await plaidInvestmentsService.getSecurities("access-token-abc");

      expect(securities).toHaveLength(2);
      expect(securities[0].securityId).toBe("sec-aapl");
      expect(securities[0].tickerSymbol).toBe("AAPL");
      expect(securities[1].securityId).toBe("sec-msft");
      expect(securities[1].tickerSymbol).toBe("MSFT");
    });

    it("should throw when access token is empty", async () => {
      await expect(plaidInvestmentsService.getSecurities("")).rejects.toThrow(
        "Access token is required",
      );
    });

    it("should return empty array when no securities", async () => {
      const response = {
        data: {
          accounts: [],
          holdings: [],
          securities: [],
          item: { item_id: "item-123" },
          request_id: "req-123",
        },
      };
      mockInvestmentsHoldingsGet.mockResolvedValue(response);

      const securities = await plaidInvestmentsService.getSecurities("access-token-abc");

      expect(securities).toEqual([]);
    });

    it("should delegate to getHoldings internally", async () => {
      mockInvestmentsHoldingsGet.mockResolvedValue(mockHoldingsResponse);

      await plaidInvestmentsService.getSecurities("access-token-abc");

      expect(mockInvestmentsHoldingsGet).toHaveBeenCalledTimes(1);
      expect(mockInvestmentsHoldingsGet).toHaveBeenCalledWith({
        access_token: "access-token-abc",
      });
    });
  });

  // ========================================================================
  // Module Exports
  // ========================================================================
  describe("Module Exports", () => {
    it("should export plaidInvestmentsService as a singleton", () => {
      expect(plaidInvestmentsService).toBeDefined();
      expect(typeof plaidInvestmentsService.getHoldings).toBe("function");
      expect(typeof plaidInvestmentsService.getTransactions).toBe("function");
      expect(typeof plaidInvestmentsService.getSecurities).toBe("function");
    });

    it("should export default as the same singleton", () => {
      const defaultExport = require("../plaid-investments-service").default;
      expect(defaultExport).toBe(plaidInvestmentsService);
    });
  });
});
