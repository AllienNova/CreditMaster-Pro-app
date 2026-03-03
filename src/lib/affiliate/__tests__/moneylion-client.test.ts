/**
 * MoneyLion Client Tests
 */

import { MoneyLionProduct, MoneyLionProductCategory } from "../types";

// =============================================================================
// Mock Setup
// =============================================================================

// Set env vars before importing
process.env.MONEYLION_API_KEY = "test-api-key-123";
process.env.MONEYLION_API_URL = "https://test.moneylion.com/api/v1";

// Import after env setup
import { moneyLionClient } from "../moneylion-client";

// Close MSW server to avoid interference with our fetch mocks
import { server } from "@/__tests__/mocks/server";

// Fresh fetch mock per test — avoids MSW v2 interceptor interference
let mockFetch: jest.Mock;

// =============================================================================
// Test Fixtures
// =============================================================================

const mockProduct: MoneyLionProduct = {
  productId: "prod_001",
  name: "CashBack Visa",
  category: "credit_card",
  partner: "partner_001",
  description: "2% cash back on all purchases",
  terms: {
    apr: { min: 14.99, max: 24.99, type: "variable" },
    annualFee: 0,
    creditLimit: { min: 1000, max: 10000 },
    rewards: "2% cash back on all purchases",
    signupBonus: "$200 after spending $500 in first 3 months",
  },
  eligibility: {
    minCreditScore: 670,
    minIncome: 30000,
  },
  commission: { type: "cpa", amount: 50, currency: "USD" },
  clickUrl: "https://partner.com/apply?ref=fynvita",
  logoUrl: "https://cdn.partner.com/logo.png",
  featured: true,
  active: true,
};

const mockProfile = {
  userId: "user_001",
  creditScore: 720,
  annualIncome: 65000,
  age: 30,
  state: "CA",
};

// =============================================================================
// Helpers
// =============================================================================

function mockFetchResponse(data: unknown, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

function mockFetchError(status: number, body = "Error"): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: body }),
    text: async () => body,
  });
}

function mockNetworkError(message = "Network error"): void {
  mockFetch.mockRejectedValueOnce(new Error(message));
}

// =============================================================================
// Tests
// =============================================================================

describe("MoneyLionClient", () => {
  // Disable MSW for this test suite — we mock fetch directly
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===========================================================================
  // getProductCatalog
  // ===========================================================================

  describe("getProductCatalog", () => {
    it("should fetch full product catalog", async () => {
      mockFetchResponse([mockProduct]);

      const products = await moneyLionClient.getProductCatalog();

      expect(products).toEqual([mockProduct]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.moneylion.com/api/v1/products",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-Api-Key": "test-api-key-123",
          }),
        }),
      );
    });

    it("should fetch catalog filtered by category", async () => {
      mockFetchResponse([mockProduct]);

      const category: MoneyLionProductCategory = "credit_card";
      await moneyLionClient.getProductCatalog(category);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.moneylion.com/api/v1/products?category=credit_card",
        expect.any(Object),
      );
    });

    it("should return empty array when no products found", async () => {
      mockFetchResponse([]);

      const products = await moneyLionClient.getProductCatalog();
      expect(products).toEqual([]);
    });
  });

  // ===========================================================================
  // preQualify
  // ===========================================================================

  describe("preQualify", () => {
    it("should return qualified result", async () => {
      const preQualResult = {
        userId: "user_001",
        productId: "prod_001",
        qualified: true,
        offeredTerms: { apr: { min: 14.99, max: 19.99, type: "variable" as const } },
        expiresAt: new Date("2026-04-01").toISOString(),
      };
      mockFetchResponse(preQualResult);

      const result = await moneyLionClient.preQualify(
        "user_001",
        "prod_001",
        mockProfile,
      );

      expect(result.qualified).toBe(true);
      expect(result.userId).toBe("user_001");
    });

    it("should return not qualified result", async () => {
      const preQualResult = {
        userId: "user_001",
        productId: "prod_001",
        qualified: false,
        expiresAt: new Date("2026-04-01").toISOString(),
      };
      mockFetchResponse(preQualResult);

      const result = await moneyLionClient.preQualify(
        "user_001",
        "prod_001",
        { ...mockProfile, creditScore: 500 },
      );

      expect(result.qualified).toBe(false);
    });

    it("should send profile data in request body", async () => {
      mockFetchResponse({
        userId: "user_001",
        productId: "prod_001",
        qualified: true,
        expiresAt: new Date().toISOString(),
      });

      await moneyLionClient.preQualify("user_001", "prod_001", mockProfile);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.moneylion.com/api/v1/products/prod_001/prequal",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("user_001"),
        }),
      );
    });
  });

  // ===========================================================================
  // trackClick
  // ===========================================================================

  describe("trackClick", () => {
    it("should track click and return event with generated clickId", async () => {
      mockFetchResponse({ success: true });

      const event = await moneyLionClient.trackClick({
        userId: "user_001",
        productId: "prod_001",
        partnerId: "partner_001",
        timestamp: new Date(),
      });

      expect(event.clickId).toMatch(/^mlclk_/);
      expect(event.userId).toBe("user_001");
      expect(event.productId).toBe("prod_001");
    });

    it("should send click data to API", async () => {
      mockFetchResponse({ success: true });

      await moneyLionClient.trackClick({
        userId: "user_001",
        productId: "prod_001",
        partnerId: "partner_001",
        timestamp: new Date(),
        referrerUrl: "https://fynvita.com/offers",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.moneylion.com/api/v1/clicks",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("partner_001"),
        }),
      );
    });

    it("should include metadata in click event", async () => {
      mockFetchResponse({ success: true });

      const event = await moneyLionClient.trackClick({
        userId: "user_001",
        productId: "prod_001",
        partnerId: "partner_001",
        timestamp: new Date(),
        metadata: { source: "dashboard", campaign: "spring_2026" },
      });

      expect(event.metadata).toEqual({
        source: "dashboard",
        campaign: "spring_2026",
      });
    });
  });

  // ===========================================================================
  // getConversionStatus
  // ===========================================================================

  describe("getConversionStatus", () => {
    it("should return converted status", async () => {
      mockFetchResponse({
        clickId: "mlclk_abc",
        status: "converted",
        convertedAt: "2026-03-01T12:00:00Z",
      });

      const result = await moneyLionClient.getConversionStatus("mlclk_abc");

      expect(result.status).toBe("converted");
      expect(result.convertedAt).toBe("2026-03-01T12:00:00Z");
    });

    it("should return pending status", async () => {
      mockFetchResponse({
        clickId: "mlclk_def",
        status: "pending",
      });

      const result = await moneyLionClient.getConversionStatus("mlclk_def");
      expect(result.status).toBe("pending");
    });

    it("should call correct endpoint", async () => {
      mockFetchResponse({ clickId: "mlclk_xyz", status: "expired" });

      await moneyLionClient.getConversionStatus("mlclk_xyz");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.moneylion.com/api/v1/clicks/mlclk_xyz/conversion",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  // ===========================================================================
  // getPartnerProducts
  // ===========================================================================

  describe("getPartnerProducts", () => {
    it("should fetch products by partner", async () => {
      mockFetchResponse([mockProduct]);

      const products = await moneyLionClient.getPartnerProducts("partner_001");

      expect(products).toEqual([mockProduct]);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.moneylion.com/api/v1/partners/partner_001/products",
        expect.any(Object),
      );
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("error handling", () => {
    it("should throw on 401 unauthorized", async () => {
      mockFetchError(401, "Unauthorized");

      await expect(moneyLionClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({
          status: 401,
          retryable: false,
        }),
      );
    });

    it("should throw on 404 not found", async () => {
      mockFetchError(404, "Not Found");

      await expect(
        moneyLionClient.getConversionStatus("nonexistent"),
      ).rejects.toEqual(
        expect.objectContaining({
          status: 404,
          retryable: false,
        }),
      );
    });

    it("should throw on network error after retries", async () => {
      // Use real timers + zero-delay to avoid unhandled rejection warnings
      jest.useRealTimers();
      const delaySpy = jest
        .spyOn(moneyLionClient as never, "delay" as never)
        .mockResolvedValue(undefined as never);

      mockNetworkError("ECONNREFUSED");
      mockNetworkError("ECONNREFUSED");
      mockNetworkError("ECONNREFUSED");
      mockNetworkError("ECONNREFUSED");

      await expect(moneyLionClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({
          code: "NETWORK_ERROR",
        }),
      );

      expect(mockFetch).toHaveBeenCalledTimes(4);
      delaySpy.mockRestore();
    });

    it("should throw on 500 server error after retries", async () => {
      jest.useRealTimers();
      const delaySpy = jest
        .spyOn(moneyLionClient as never, "delay" as never)
        .mockResolvedValue(undefined as never);

      mockFetchError(500, "Internal Server Error");
      mockFetchError(500, "Internal Server Error");
      mockFetchError(500, "Internal Server Error");
      mockFetchError(500, "Internal Server Error");

      await expect(moneyLionClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({
          status: 500,
          retryable: true,
        }),
      );

      expect(mockFetch).toHaveBeenCalledTimes(4);
      delaySpy.mockRestore();
    });

    it("should throw on 429 rate limit after retries", async () => {
      jest.useRealTimers();
      const delaySpy = jest
        .spyOn(moneyLionClient as never, "delay" as never)
        .mockResolvedValue(undefined as never);

      mockFetchError(429, "Too Many Requests");
      mockFetchError(429, "Too Many Requests");
      mockFetchError(429, "Too Many Requests");
      mockFetchError(429, "Too Many Requests");

      await expect(moneyLionClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({
          status: 429,
          retryable: true,
        }),
      );

      expect(mockFetch).toHaveBeenCalledTimes(4);
      delaySpy.mockRestore();
    });
  });

  // ===========================================================================
  // Retry Logic
  // ===========================================================================

  describe("retry logic", () => {
    it("should succeed on retry after transient failure", async () => {
      mockFetchError(500, "Internal Server Error");
      mockFetchResponse([mockProduct]);

      const promise = moneyLionClient.getProductCatalog();

      // Advance through retry delay (1s for first retry)
      for (let i = 0; i < 3; i++) {
        await jest.advanceTimersByTimeAsync(1000);
      }

      const result = await promise;
      expect(result).toEqual([mockProduct]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 401", async () => {
      mockFetchError(401, "Unauthorized");

      await expect(moneyLionClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({ status: 401 }),
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should not retry on 400", async () => {
      mockFetchError(400, "Bad Request");

      await expect(moneyLionClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({ status: 400 }),
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Missing API Key
  // ===========================================================================

  describe("missing API key", () => {
    it("should throw when API key is not set", async () => {
      const originalKey = process.env.MONEYLION_API_KEY;
      process.env.MONEYLION_API_KEY = "";

      // Create a new instance to pick up empty key
      jest.resetModules();

      // Since the singleton is already created with the key, we test the error path
      // by temporarily modifying the env and re-importing
      const freshModule = await import("../moneylion-client");
      // The constructor reads env at instantiation; the singleton already has key
      // We need to test with a fresh instance
      process.env.MONEYLION_API_KEY = "";
      jest.resetModules();

      const { moneyLionClient: freshClient } = await import(
        "../moneylion-client"
      );

      await expect(freshClient.getProductCatalog()).rejects.toEqual(
        expect.objectContaining({
          status: 401,
          code: "MISSING_API_KEY",
        }),
      );

      process.env.MONEYLION_API_KEY = originalKey;
      jest.resetModules();
    });
  });

  // ===========================================================================
  // Request Headers
  // ===========================================================================

  describe("request headers", () => {
    it("should include X-Api-Key header", async () => {
      mockFetchResponse([]);

      await moneyLionClient.getProductCatalog();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Api-Key"]).toBe("test-api-key-123");
    });

    it("should include Content-Type and Accept headers", async () => {
      mockFetchResponse([]);

      await moneyLionClient.getProductCatalog();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].headers["Accept"]).toBe("application/json");
    });

    it("should not include body for GET requests", async () => {
      mockFetchResponse([]);

      await moneyLionClient.getProductCatalog();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBeUndefined();
    });
  });
});

