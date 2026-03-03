/**
 * @jest-environment node
 */

/**
 * Plaid Enrich Service Unit Tests
 *
 * Tests for transaction enrichment and category taxonomy retrieval via Plaid SDK.
 */

// Environment variables
process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";

// Plaid SDK mocks
const mockTransactionsEnrich = jest.fn();
const mockCategoriesGet = jest.fn();

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({
    transactionsEnrich: mockTransactionsEnrich,
    categoriesGet: mockCategoriesGet,
  }),
}));

import {
  plaidEnrichService,
  EnrichTransactionInput,
} from "../plaid-enrich-service";

// ==========================================================================
// Mock Data
// ==========================================================================

const mockEnrichResponse = {
  data: {
    enriched_transactions: [
      {
        id: "txn-1",
        description: "STARBUCKS STORE 12345",
        amount: 5.75,
        direction: "OUTFLOW",
        iso_currency_code: "USD",
        enrichments: {
          merchant_name: "Starbucks",
          logo_url: "https://plaid.com/logos/starbucks.png",
          website: "https://starbucks.com",
          counterparties: [
            {
              name: "Starbucks",
              type: "merchant",
              entity_id: "ent-starbucks",
              logo_url: "https://plaid.com/logos/starbucks.png",
              website: "https://starbucks.com",
              phone_number: "+18007827282",
            },
          ],
          location: {
            address: "123 Coffee St",
            city: "Seattle",
            region: "WA",
            postal_code: "98101",
            country: "US",
            lat: 47.6062,
            lon: -122.3321,
            store_number: "12345",
          },
          personal_finance_category: {
            primary: "FOOD_AND_DRINK",
            detailed: "FOOD_AND_DRINK_COFFEE",
            confidence_level: "VERY_HIGH",
          },
          personal_finance_category_icon_url:
            "https://plaid.com/icons/food.png",
          payment_channel: "in store",
          phone_number: "+18007827282",
          check_number: null,
          legacy_category: ["Food and Drink", "Coffee Shop"],
          legacy_category_id: "13005043",
        },
      },
      {
        id: "txn-2",
        description: "PAYROLL DEPOSIT",
        amount: 3500.0,
        direction: "INFLOW",
        iso_currency_code: "USD",
        enrichments: {
          merchant_name: null,
          logo_url: null,
          website: null,
          counterparties: [],
          location: {},
          personal_finance_category: {
            primary: "INCOME",
            detailed: "INCOME_WAGES",
            confidence_level: "HIGH",
          },
          personal_finance_category_icon_url:
            "https://plaid.com/icons/income.png",
          payment_channel: "other",
          phone_number: null,
          check_number: null,
          legacy_category: null,
          legacy_category_id: null,
        },
      },
    ],
    request_id: "req-enrich-1",
  },
};

const mockCategoriesResponse = {
  data: {
    categories: [
      {
        category_id: "10000000",
        group: "special",
        hierarchy: ["Bank Fees"],
      },
      {
        category_id: "13005043",
        group: "place",
        hierarchy: ["Food and Drink", "Coffee Shop"],
      },
      {
        category_id: "18000000",
        group: "place",
        hierarchy: ["Shops"],
      },
    ],
    request_id: "req-categories-1",
  },
};

const sampleTransactions: EnrichTransactionInput[] = [
  {
    id: "txn-1",
    description: "STARBUCKS STORE 12345",
    amount: 5.75,
    direction: "OUTFLOW",
    iso_currency_code: "USD",
  },
  {
    id: "txn-2",
    description: "PAYROLL DEPOSIT",
    amount: 3500.0,
    direction: "INFLOW",
    iso_currency_code: "USD",
  },
];

// ==========================================================================
// TESTS
// ==========================================================================

describe("PlaidEnrichService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // enrichTransactions
  // ========================================================================
  describe("enrichTransactions", () => {
    it("should call transactionsEnrich with correct params", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      await plaidEnrichService.enrichTransactions(sampleTransactions);

      expect(mockTransactionsEnrich).toHaveBeenCalledTimes(1);
      expect(mockTransactionsEnrich).toHaveBeenCalledWith({
        account_type: "depository",
        transactions: expect.arrayContaining([
          expect.objectContaining({
            id: "txn-1",
            description: "STARBUCKS STORE 12345",
          }),
        ]),
      });
    });

    it("should pass custom account_type", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      await plaidEnrichService.enrichTransactions(
        sampleTransactions,
        "credit",
      );

      expect(mockTransactionsEnrich).toHaveBeenCalledWith(
        expect.objectContaining({
          account_type: "credit",
        }),
      );
    });

    it("should return enriched transactions with merchant info", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      expect(result.enrichedTransactions).toHaveLength(2);
      const et1 = result.enrichedTransactions[0];
      expect(et1.id).toBe("txn-1");
      expect(et1.merchantName).toBe("Starbucks");
      expect(et1.logoUrl).toBe("https://plaid.com/logos/starbucks.png");
      expect(et1.website).toBe("https://starbucks.com");
    });

    it("should return enriched counterparties", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      const cp = result.enrichedTransactions[0].counterparties;
      expect(cp).toHaveLength(1);
      expect(cp[0].name).toBe("Starbucks");
      expect(cp[0].type).toBe("merchant");
      expect(cp[0].entityId).toBe("ent-starbucks");
      expect(cp[0].logoUrl).toBe("https://plaid.com/logos/starbucks.png");
      expect(cp[0].website).toBe("https://starbucks.com");
      expect(cp[0].phoneNumber).toBe("+18007827282");
    });

    it("should return enriched location", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      const loc = result.enrichedTransactions[0].location;
      expect(loc.address).toBe("123 Coffee St");
      expect(loc.city).toBe("Seattle");
      expect(loc.region).toBe("WA");
      expect(loc.postalCode).toBe("98101");
      expect(loc.country).toBe("US");
      expect(loc.lat).toBe(47.6062);
      expect(loc.lon).toBe(-122.3321);
      expect(loc.storeNumber).toBe("12345");
    });

    it("should return personal finance category", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      const pfc = result.enrichedTransactions[0].personalFinanceCategory;
      expect(pfc).not.toBeNull();
      expect(pfc?.primary).toBe("FOOD_AND_DRINK");
      expect(pfc?.detailed).toBe("FOOD_AND_DRINK_COFFEE");
      expect(pfc?.confidenceLevel).toBe("VERY_HIGH");
    });

    it("should return legacy category data", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      expect(result.enrichedTransactions[0].legacyCategory).toEqual([
        "Food and Drink",
        "Coffee Shop",
      ]);
      expect(result.enrichedTransactions[0].legacyCategoryId).toBe("13005043");
    });

    it("should handle null merchant info for non-merchant transactions", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      const et2 = result.enrichedTransactions[1];
      expect(et2.merchantName).toBeNull();
      expect(et2.logoUrl).toBeNull();
      expect(et2.website).toBeNull();
      expect(et2.counterparties).toEqual([]);
      expect(et2.legacyCategory).toBeNull();
      expect(et2.legacyCategoryId).toBeNull();
    });

    it("should handle empty location", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      const loc = result.enrichedTransactions[1].location;
      expect(loc.address).toBeNull();
      expect(loc.city).toBeNull();
      expect(loc.region).toBeNull();
      expect(loc.lat).toBeNull();
      expect(loc.lon).toBeNull();
    });

    it("should return request ID", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      expect(result.requestId).toBe("req-enrich-1");
    });

    it("should return empty result for empty transactions array", async () => {
      const result = await plaidEnrichService.enrichTransactions([]);

      expect(result.enrichedTransactions).toEqual([]);
      expect(result.requestId).toBeNull();
      expect(mockTransactionsEnrich).not.toHaveBeenCalled();
    });

    it("should throw when more than 100 transactions provided", async () => {
      const manyTransactions: EnrichTransactionInput[] = Array.from(
        { length: 101 },
        (_, i) => ({
          id: `txn-${i}`,
          description: `Transaction ${i}`,
          amount: 10,
          direction: "OUTFLOW" as const,
          iso_currency_code: "USD",
        }),
      );

      await expect(
        plaidEnrichService.enrichTransactions(manyTransactions),
      ).rejects.toThrow("Maximum of 100 transactions per request");
      expect(mockTransactionsEnrich).not.toHaveBeenCalled();
    });

    it("should pass location data when provided", async () => {
      mockTransactionsEnrich.mockResolvedValue({
        data: { enriched_transactions: [], request_id: "req-loc" },
      });

      const txnWithLocation: EnrichTransactionInput[] = [
        {
          id: "txn-loc",
          description: "Store purchase",
          amount: 25.0,
          direction: "OUTFLOW",
          iso_currency_code: "USD",
          location: {
            country: "US",
            region: "WA",
            city: "Seattle",
            postal_code: "98101",
          },
        },
      ];

      await plaidEnrichService.enrichTransactions(txnWithLocation);

      expect(mockTransactionsEnrich).toHaveBeenCalledWith(
        expect.objectContaining({
          transactions: [
            expect.objectContaining({
              location: {
                country: "US",
                region: "WA",
                city: "Seattle",
                postal_code: "98101",
              },
            }),
          ],
        }),
      );
    });

    it("should pass optional fields when provided", async () => {
      mockTransactionsEnrich.mockResolvedValue({
        data: { enriched_transactions: [], request_id: "req-opt" },
      });

      const txnWithOptionals: EnrichTransactionInput[] = [
        {
          id: "txn-opt",
          description: "Store purchase",
          amount: 25.0,
          direction: "OUTFLOW",
          iso_currency_code: "USD",
          account_type: "depository",
          account_subtype: "checking",
          date_posted: "2026-02-28",
          mcc: "5411",
        },
      ];

      await plaidEnrichService.enrichTransactions(txnWithOptionals);

      expect(mockTransactionsEnrich).toHaveBeenCalledWith(
        expect.objectContaining({
          transactions: [
            expect.objectContaining({
              account_type: "depository",
              account_subtype: "checking",
              date_posted: "2026-02-28",
              mcc: "5411",
            }),
          ],
        }),
      );
    });

    it("should throw when SDK call rejects", async () => {
      mockTransactionsEnrich.mockRejectedValue(
        new Error("PRODUCT_NOT_READY"),
      );

      await expect(
        plaidEnrichService.enrichTransactions(sampleTransactions),
      ).rejects.toThrow("PRODUCT_NOT_READY");
    });

    it("should extract Plaid API error details", async () => {
      const plaidError = new Error("Plaid API Error");
      (plaidError as unknown as Record<string, unknown>).response = {
        status: 400,
        data: {
          error_type: "INVALID_INPUT",
          error_code: "INVALID_FIELD",
          error_message: "Invalid transaction data",
        },
      };
      mockTransactionsEnrich.mockRejectedValue(plaidError);

      await expect(
        plaidEnrichService.enrichTransactions(sampleTransactions),
      ).rejects.toThrow("INVALID_INPUT");
    });

    it("should propagate rate limit errors", async () => {
      const rateLimitError = new Error("Rate limit");
      (rateLimitError as unknown as Record<string, unknown>).response = {
        status: 429,
        data: {
          error_type: "RATE_LIMIT_EXCEEDED",
          error_code: "RATE_LIMIT",
          error_message: "Too many requests",
        },
      };
      mockTransactionsEnrich.mockRejectedValue(rateLimitError);

      await expect(
        plaidEnrichService.enrichTransactions(sampleTransactions),
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    it("should handle payment channel info", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      expect(result.enrichedTransactions[0].paymentChannel).toBe("in store");
      expect(result.enrichedTransactions[1].paymentChannel).toBe("other");
    });

    it("should handle personal_finance_category_icon_url", async () => {
      mockTransactionsEnrich.mockResolvedValue(mockEnrichResponse);

      const result =
        await plaidEnrichService.enrichTransactions(sampleTransactions);

      expect(
        result.enrichedTransactions[0].personalFinanceCategoryIconUrl,
      ).toBe("https://plaid.com/icons/food.png");
    });
  });

  // ========================================================================
  // getTransactionCategories
  // ========================================================================
  describe("getTransactionCategories", () => {
    it("should call categoriesGet", async () => {
      mockCategoriesGet.mockResolvedValue(mockCategoriesResponse);

      await plaidEnrichService.getTransactionCategories();

      expect(mockCategoriesGet).toHaveBeenCalledTimes(1);
      expect(mockCategoriesGet).toHaveBeenCalledWith({});
    });

    it("should return mapped categories", async () => {
      mockCategoriesGet.mockResolvedValue(mockCategoriesResponse);

      const result = await plaidEnrichService.getTransactionCategories();

      expect(result.categories).toHaveLength(3);
      expect(result.categories[0].categoryId).toBe("10000000");
      expect(result.categories[0].group).toBe("special");
      expect(result.categories[0].hierarchy).toEqual(["Bank Fees"]);
    });

    it("should return categories with multi-level hierarchy", async () => {
      mockCategoriesGet.mockResolvedValue(mockCategoriesResponse);

      const result = await plaidEnrichService.getTransactionCategories();

      expect(result.categories[1].categoryId).toBe("13005043");
      expect(result.categories[1].group).toBe("place");
      expect(result.categories[1].hierarchy).toEqual([
        "Food and Drink",
        "Coffee Shop",
      ]);
    });

    it("should return request ID", async () => {
      mockCategoriesGet.mockResolvedValue(mockCategoriesResponse);

      const result = await plaidEnrichService.getTransactionCategories();

      expect(result.requestId).toBe("req-categories-1");
    });

    it("should handle empty categories", async () => {
      const emptyResponse = {
        data: {
          categories: [],
          request_id: "req-empty-cat",
        },
      };
      mockCategoriesGet.mockResolvedValue(emptyResponse);

      const result = await plaidEnrichService.getTransactionCategories();

      expect(result.categories).toEqual([]);
    });

    it("should throw when SDK call rejects", async () => {
      mockCategoriesGet.mockRejectedValue(new Error("API_ERROR"));

      await expect(
        plaidEnrichService.getTransactionCategories(),
      ).rejects.toThrow("API_ERROR");
    });

    it("should extract Plaid API error details", async () => {
      const plaidError = new Error("Plaid API Error");
      (plaidError as unknown as Record<string, unknown>).response = {
        status: 500,
        data: {
          error_type: "API_ERROR",
          error_code: "INTERNAL_SERVER_ERROR",
          error_message: "An unexpected error occurred",
        },
      };
      mockCategoriesGet.mockRejectedValue(plaidError);

      await expect(
        plaidEnrichService.getTransactionCategories(),
      ).rejects.toThrow("API_ERROR");
    });
  });

  // ========================================================================
  // Module Exports
  // ========================================================================
  describe("Module Exports", () => {
    it("should export plaidEnrichService as a singleton", () => {
      expect(plaidEnrichService).toBeDefined();
      expect(typeof plaidEnrichService.enrichTransactions).toBe("function");
      expect(typeof plaidEnrichService.getTransactionCategories).toBe(
        "function",
      );
    });

    it("should export default as the same singleton", () => {
      const defaultExport = require("../plaid-enrich-service").default;
      expect(defaultExport).toBe(plaidEnrichService);
    });
  });
});
