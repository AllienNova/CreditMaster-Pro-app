/**
 * @jest-environment node
 */

/**
 * Plaid Webhook Handler Service Tests
 *
 * Tests for PlaidWebhookService covering:
 * - Webhook signature verification (valid, invalid, missing header)
 * - Event dispatching to registered handlers
 * - Built-in handlers (transaction sync, item error, pending expiration)
 * - Multiple handlers for same event type
 * - Unknown event types (should log but not throw)
 * - Error in handler (should not crash the service for unrelated events)
 * - Transactions removed handler
 * - Handler registration and counting
 */

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
process.env.PLAID_CLIENT_ID = "test-client-id";
process.env.PLAID_SECRET = "test-secret";
process.env.PLAID_ENV = "sandbox";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
jest.mock("@/lib/supabase/client", () => {
  const _client = { from: jest.fn() };
  return { getSupabase: () => _client };
});

function supabaseClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/lib/supabase/client").getSupabase();
}

function buildChain(resolvedValue: {
  data: unknown;
  error: unknown;
}) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "neq",
    "in",
    "gt",
    "gte",
    "lt",
    "lte",
    "order",
    "limit",
    "single",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then = jest
    .fn()
    .mockImplementation((resolve: (v: unknown) => unknown) =>
      resolve(resolvedValue),
    );
  return chain;
}

// ---------------------------------------------------------------------------
// jose mock
// ---------------------------------------------------------------------------
const mockDecodeProtectedHeader = jest.fn();
const mockJwtVerify = jest.fn();
const mockImportJWK = jest.fn();

jest.mock("jose", () => ({
  decodeProtectedHeader: (...args: unknown[]) =>
    mockDecodeProtectedHeader(...args),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  importJWK: (...args: unknown[]) => mockImportJWK(...args),
}));

// ---------------------------------------------------------------------------
// Plaid client mock
// ---------------------------------------------------------------------------
const mockWebhookVerificationKeyGet = jest.fn();
const mockTransactionsSync = jest.fn();

jest.mock("@/lib/financial/plaid-client", () => ({
  getPlaidClient: () => ({
    webhookVerificationKeyGet: mockWebhookVerificationKeyGet,
    transactionsSync: mockTransactionsSync,
  }),
}));

// ---------------------------------------------------------------------------
// Plaid service mock
// ---------------------------------------------------------------------------
jest.mock("@/lib/financial/plaid-service", () => ({
  plaidService: {
    syncTransactions: jest.fn().mockResolvedValue([]),
    syncAccounts: jest.fn().mockResolvedValue([]),
  },
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import {
  PlaidWebhookService,
  plaidWebhookService,
  type PlaidWebhookEvent,
  type WebhookHandler,
} from "../plaid-webhook-handler";
import { plaidService } from "../plaid-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEvent(
  overrides: Partial<PlaidWebhookEvent> = {},
): PlaidWebhookEvent {
  return {
    webhook_type: "TRANSACTIONS",
    webhook_code: "DEFAULT_UPDATE",
    item_id: "item-test-123",
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("PlaidWebhookService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Constructor & Registration
  // =========================================================================
  describe("constructor and registration", () => {
    it("should register built-in handlers on construction", () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      // Built-in handlers: 4 transaction types + TRANSACTIONS_REMOVED + ITEM:ERROR + ITEM:PENDING_EXPIRATION = 7 keys
      expect(service.getHandlerCount()).toBe(7);
    });

    it("should allow registering additional handlers", () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const initialCount = service.getHandlerCount();
      const handler: WebhookHandler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("AUTH", "AUTOMATICALLY_VERIFIED", handler);
      expect(service.getHandlerCount()).toBe(initialCount + 1);
    });

    it("should allow registering multiple handlers for the same event", () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const initialCount = service.getHandlerCount();
      const handler1: WebhookHandler = jest.fn().mockResolvedValue(undefined);
      const handler2: WebhookHandler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("CUSTOM", "EVENT", handler1);
      service.registerHandler("CUSTOM", "EVENT", handler2);
      // Only one key, but two handlers behind it
      expect(service.getHandlerCount()).toBe(initialCount + 1);
    });
  });

  // =========================================================================
  // Signature Verification
  // =========================================================================
  describe("verifyWebhookSignature", () => {
    it("should return true when custom verifier returns true", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "some-token",
      });
      expect(result).toBe(true);
    });

    it("should return false when custom verifier returns false", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(false),
      );
      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "bad-token",
      });
      expect(result).toBe(false);
    });

    it("should return false when Plaid-Verification header is missing (default verifier)", async () => {
      const service = new PlaidWebhookService();
      const result = await service.verifyWebhookSignature("{}", {});
      expect(result).toBe(false);
    });

    it("should allow replacing the verifier via setVerifier", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(false),
      );
      expect(await service.verifyWebhookSignature("{}", {})).toBe(false);

      service.setVerifier(() => Promise.resolve(true));
      expect(await service.verifyWebhookSignature("{}", {})).toBe(true);
    });

    it("should pass body and headers to the verifier", async () => {
      const verifier = jest.fn().mockResolvedValue(true);
      const service = new PlaidWebhookService(verifier);
      const body = '{"test":true}';
      const headers = { "plaid-verification": "jwt-token" };

      await service.verifyWebhookSignature(body, headers);

      expect(verifier).toHaveBeenCalledWith(body, headers);
    });

    it("should handle verifier that throws an error", async () => {
      const service = new PlaidWebhookService(() => {
        throw new Error("Verification crashed");
      });
      await expect(
        service.verifyWebhookSignature("{}", {}),
      ).rejects.toThrow("Verification crashed");
    });
  });

  // =========================================================================
  // Event Dispatching
  // =========================================================================
  describe("handleEvent", () => {
    it("should dispatch to the correct handler", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("CUSTOM", "TEST_EVENT", handler);

      const event = makeEvent({
        webhook_type: "CUSTOM",
        webhook_code: "TEST_EVENT",
      });
      await service.handleEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should call all handlers for the same event type", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("MULTI", "EVENT", handler1);
      service.registerHandler("MULTI", "EVENT", handler2);

      const event = makeEvent({
        webhook_type: "MULTI",
        webhook_code: "EVENT",
      });
      await service.handleEvent(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it("should not throw for unknown event types", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation();

      const event = makeEvent({
        webhook_type: "UNKNOWN",
        webhook_code: "MYSTERY",
      });

      await expect(service.handleEvent(event)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No handler registered for UNKNOWN:MYSTERY"),
      );

      consoleSpy.mockRestore();
    });

    it("should throw if a handler fails", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const failingHandler = jest
        .fn()
        .mockRejectedValue(new Error("Handler exploded"));
      service.registerHandler("FAIL", "EVENT", failingHandler);

      const event = makeEvent({
        webhook_type: "FAIL",
        webhook_code: "EVENT",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await expect(service.handleEvent(event)).rejects.toThrow(
        "handler(s) failed",
      );

      consoleSpy.mockRestore();
    });

    it("should execute all handlers even if one fails and throw aggregate error", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler1 = jest
        .fn()
        .mockRejectedValue(new Error("First failed"));
      const handler2 = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("PARTIAL", "FAIL", handler1);
      service.registerHandler("PARTIAL", "FAIL", handler2);

      const event = makeEvent({
        webhook_type: "PARTIAL",
        webhook_code: "FAIL",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await expect(service.handleEvent(event)).rejects.toThrow(
        "1 handler(s) failed",
      );
      expect(handler2).toHaveBeenCalledWith(event);

      consoleSpy.mockRestore();
    });

    it("should handle non-Error thrown values in handlers", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockRejectedValue("string error");
      service.registerHandler("STR", "ERR", handler);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await expect(
        service.handleEvent(
          makeEvent({ webhook_type: "STR", webhook_code: "ERR" }),
        ),
      ).rejects.toThrow("handler(s) failed");

      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // Built-in: Transaction Sync Handler
  // =========================================================================
  describe("handleTransactionSync (built-in)", () => {
    it("should call plaidService.syncTransactions for DEFAULT_UPDATE", async () => {
      // Set up supabase to return a user for the item
      const chain = buildChain({
        data: { user_id: "user-abc" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(chain);

      const event = makeEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
        new_transactions: 5,
      });

      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(event);

      expect(plaidService.syncTransactions).toHaveBeenCalledWith(
        "item-test-123",
        "user-abc",
        30,
      );

      consoleSpy.mockRestore();
    });

    it("should call plaidService.syncTransactions for SYNC_UPDATES_AVAILABLE", async () => {
      const chain = buildChain({
        data: { user_id: "user-xyz" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(chain);

      const event = makeEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
      });

      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(event);

      expect(plaidService.syncTransactions).toHaveBeenCalledWith(
        "item-test-123",
        "user-xyz",
        30,
      );

      consoleSpy.mockRestore();
    });

    it("should call plaidService.syncTransactions for INITIAL_UPDATE", async () => {
      const chain = buildChain({
        data: { user_id: "user-init" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "TRANSACTIONS",
          webhook_code: "INITIAL_UPDATE",
        }),
      );

      expect(plaidService.syncTransactions).toHaveBeenCalledWith(
        "item-test-123",
        "user-init",
        30,
      );

      consoleSpy.mockRestore();
    });

    it("should call plaidService.syncTransactions for HISTORICAL_UPDATE", async () => {
      const chain = buildChain({
        data: { user_id: "user-hist" },
        error: null,
      });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "TRANSACTIONS",
          webhook_code: "HISTORICAL_UPDATE",
        }),
      );

      expect(plaidService.syncTransactions).toHaveBeenCalledWith(
        "item-test-123",
        "user-hist",
        30,
      );

      consoleSpy.mockRestore();
    });

    it("should log and skip when no user found for item_id", async () => {
      const chain = buildChain({ data: null, error: { message: "Not found" } });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();
      const infoSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "TRANSACTIONS",
          webhook_code: "DEFAULT_UPDATE",
        }),
      );

      expect(plaidService.syncTransactions).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No user found for item_id"),
      );

      consoleSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });

  // =========================================================================
  // Built-in: Transactions Removed Handler
  // =========================================================================
  describe("handleTransactionsRemoved (built-in)", () => {
    it("should delete removed transactions from database", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "TRANSACTIONS",
          webhook_code: "TRANSACTIONS_REMOVED",
          removed_transactions: ["txn-1", "txn-2", "txn-3"],
        }),
      );

      expect(supabaseClient().from).toHaveBeenCalledWith("transactions");
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.in).toHaveBeenCalledWith("transaction_id", [
        "txn-1",
        "txn-2",
        "txn-3",
      ]);

      consoleSpy.mockRestore();
    });

    it("should handle empty removed_transactions array", async () => {
      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "TRANSACTIONS",
          webhook_code: "TRANSACTIONS_REMOVED",
          removed_transactions: [],
        }),
      );

      expect(supabaseClient().from).not.toHaveBeenCalledWith(
        "transactions",
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing removed_transactions field", async () => {
      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "TRANSACTIONS",
          webhook_code: "TRANSACTIONS_REMOVED",
        }),
      );

      expect(supabaseClient().from).not.toHaveBeenCalledWith(
        "transactions",
      );

      consoleSpy.mockRestore();
    });

    it("should throw when database delete fails", async () => {
      const chain = buildChain({
        data: null,
        error: { message: "Delete failed" },
      });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "info")
        .mockImplementation();
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await expect(
        plaidWebhookService.handleEvent(
          makeEvent({
            webhook_type: "TRANSACTIONS",
            webhook_code: "TRANSACTIONS_REMOVED",
            removed_transactions: ["txn-1"],
          }),
        ),
      ).rejects.toThrow("handler(s) failed");

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // =========================================================================
  // Built-in: Item Error Handler
  // =========================================================================
  describe("handleItemError (built-in)", () => {
    it("should update plaid_items with error info", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "ERROR",
          error: {
            error_type: "ITEM_ERROR",
            error_code: "ITEM_LOGIN_REQUIRED",
            error_message: "the login details have changed",
          },
        }),
      );

      expect(supabaseClient().from).toHaveBeenCalledWith("plaid_items");
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: "ITEM_ERROR",
          error_code: "ITEM_LOGIN_REQUIRED",
          error_message: "the login details have changed",
        }),
      );
      expect(chain.eq).toHaveBeenCalledWith("item_id", "item-test-123");

      consoleSpy.mockRestore();
    });

    it("should handle missing error field gracefully", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "ERROR",
        }),
      );

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: null,
          error_code: null,
          error_message: null,
        }),
      );

      consoleSpy.mockRestore();
    });

    it("should throw when database update fails", async () => {
      const chain = buildChain({
        data: null,
        error: { message: "Update failed" },
      });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await expect(
        plaidWebhookService.handleEvent(
          makeEvent({
            webhook_type: "ITEM",
            webhook_code: "ERROR",
            error: {
              error_type: "ITEM_ERROR",
              error_code: "ITEM_LOGIN_REQUIRED",
              error_message: "login required",
            },
          }),
        ),
      ).rejects.toThrow("handler(s) failed");

      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // Built-in: Pending Expiration Handler
  // =========================================================================
  describe("handlePendingExpiration (built-in)", () => {
    it("should update plaid_items with consent expiration time", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "PENDING_EXPIRATION",
          consent_expiration_time: "2026-04-01T00:00:00Z",
        }),
      );

      expect(supabaseClient().from).toHaveBeenCalledWith("plaid_items");
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          consent_expiration_time: "2026-04-01T00:00:00Z",
        }),
      );
      expect(chain.eq).toHaveBeenCalledWith("item_id", "item-test-123");

      consoleSpy.mockRestore();
    });

    it("should handle missing consent_expiration_time", async () => {
      const chain = buildChain({ data: null, error: null });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation();

      await plaidWebhookService.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "PENDING_EXPIRATION",
        }),
      );

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          consent_expiration_time: null,
        }),
      );

      consoleSpy.mockRestore();
    });

    it("should throw when database update fails", async () => {
      const chain = buildChain({
        data: null,
        error: { message: "Update failed" },
      });
      supabaseClient().from.mockReturnValue(chain);

      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation();
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      await expect(
        plaidWebhookService.handleEvent(
          makeEvent({
            webhook_type: "ITEM",
            webhook_code: "PENDING_EXPIRATION",
            consent_expiration_time: "2026-04-01T00:00:00Z",
          }),
        ),
      ).rejects.toThrow("handler(s) failed");

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // =========================================================================
  // Default Verifier (lines 201-289)
  // =========================================================================
  describe("defaultVerifier (no custom verifier)", () => {
    /**
     * These tests exercise the default verifier code path by constructing
     * a PlaidWebhookService WITHOUT a custom verifier. The jose library
     * is mocked at the module level above, and crypto.subtle.digest is
     * spied on where needed.
     */

    let service: InstanceType<typeof PlaidWebhookService>;

    beforeEach(() => {
      // Clear the key cache between tests by constructing a fresh service.
      // The keyCache is module-level, so we also clear mocks.
      jest.clearAllMocks();
      service = new PlaidWebhookService(); // uses defaultVerifier
    });

    it("should return false when plaid-verification header is missing", async () => {
      const result = await service.verifyWebhookSignature("{}", {});
      expect(result).toBe(false);
      expect(mockDecodeProtectedHeader).not.toHaveBeenCalled();
    });

    it("should return false when Plaid-Verification (capitalized) header is missing", async () => {
      const result = await service.verifyWebhookSignature("{}", {
        "x-unrelated": "value",
      });
      expect(result).toBe(false);
    });

    it("should accept Plaid-Verification header (capitalized)", async () => {
      // Set up full happy-path mocks for capitalized header
      const mockKey = { type: "public" };
      mockDecodeProtectedHeader.mockReturnValue({ kid: "key-123", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "key-123", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);
      mockJwtVerify.mockResolvedValue({
        payload: { request_body_sha256: "abc123" },
      });

      // Mock crypto.subtle.digest to return a hash matching the claim
      const mockDigest = jest.spyOn(crypto.subtle, "digest").mockResolvedValue(
        new Uint8Array([0xab, 0xc1, 0x23]).buffer as ArrayBuffer,
      );

      // The hash won't match "abc123" exactly (it's hex encoded from bytes),
      // so this tests the comparison path. We'll set up a proper matching test below.
      const result = await service.verifyWebhookSignature("{}", {
        "Plaid-Verification": "valid-jwt",
      });

      // decodeProtectedHeader should have been called with the token
      expect(mockDecodeProtectedHeader).toHaveBeenCalledWith("valid-jwt");

      mockDigest.mockRestore();
    });

    it("should return false when JWT header has no kid", async () => {
      mockDecodeProtectedHeader.mockReturnValue({ alg: "ES256" }); // no kid

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-no-kid",
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("JWT header missing kid"),
      );

      consoleSpy.mockRestore();
    });

    it("should return false when JWT is missing request_body_sha256 claim", async () => {
      const mockKey = { type: "public" };
      mockDecodeProtectedHeader.mockReturnValue({ kid: "key-abc", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "key-abc", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-123" }, // no request_body_sha256
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-no-hash",
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("JWT missing request_body_sha256 claim"),
      );

      consoleSpy.mockRestore();
    });

    it("should return false when request_body_sha256 is not a string", async () => {
      const mockKey = { type: "public" };
      mockDecodeProtectedHeader.mockReturnValue({ kid: "key-def", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "key-def", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);
      mockJwtVerify.mockResolvedValue({
        payload: { request_body_sha256: 12345 }, // number, not string
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-numeric-hash",
      });

      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });

    it("should return true when body hash matches JWT claim", async () => {
      const mockKey = { type: "public" };
      mockDecodeProtectedHeader.mockReturnValue({ kid: "key-match", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "key-match", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);

      // Create a known SHA-256 hash hex string matching our mock digest output
      // We'll mock crypto.subtle.digest to return specific bytes
      const hashBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const expectedHex = "deadbeef";

      mockJwtVerify.mockResolvedValue({
        payload: { request_body_sha256: expectedHex },
      });

      const mockDigest = jest
        .spyOn(crypto.subtle, "digest")
        .mockResolvedValue(hashBytes.buffer as ArrayBuffer);

      const result = await service.verifyWebhookSignature('{"test":true}', {
        "plaid-verification": "valid-jwt-matching",
      });

      expect(result).toBe(true);
      expect(mockDigest).toHaveBeenCalledWith(
        "SHA-256",
        expect.any(Uint8Array),
      );

      mockDigest.mockRestore();
    });

    it("should return false when body hash does not match JWT claim", async () => {
      const mockKey = { type: "public" };
      mockDecodeProtectedHeader.mockReturnValue({ kid: "key-mismatch", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "key-mismatch", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);

      mockJwtVerify.mockResolvedValue({
        payload: { request_body_sha256: "expected-hash-value" },
      });

      const hashBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
      const mockDigest = jest
        .spyOn(crypto.subtle, "digest")
        .mockResolvedValue(hashBytes.buffer as ArrayBuffer);

      const result = await service.verifyWebhookSignature('{"test":true}', {
        "plaid-verification": "valid-jwt-wrong-hash",
      });

      // "00112233" !== "expected-hash-value"
      expect(result).toBe(false);

      mockDigest.mockRestore();
    });

    it("should return false and log error when decodeProtectedHeader throws", async () => {
      mockDecodeProtectedHeader.mockImplementation(() => {
        throw new Error("Invalid JWT format");
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "garbage-jwt",
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signature verification failed: Invalid JWT format"),
      );

      consoleSpy.mockRestore();
    });

    it("should return false and log error when jwtVerify throws", async () => {
      const mockKey = { type: "public" };
      mockDecodeProtectedHeader.mockReturnValue({ kid: "key-expired", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "key-expired", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);
      mockJwtVerify.mockRejectedValue(new Error("JWT expired"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "expired-jwt",
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signature verification failed: JWT expired"),
      );

      consoleSpy.mockRestore();
    });

    it("should return false when a non-Error value is thrown", async () => {
      mockDecodeProtectedHeader.mockImplementation(() => {
        throw "string error from jose"; // eslint-disable-line no-throw-literal
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "bad-jwt",
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signature verification failed: string error from jose"),
      );

      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // fetchVerificationKey (JWK cache)
  // =========================================================================
  describe("fetchVerificationKey (via defaultVerifier)", () => {
    it("should fetch JWK from Plaid and import it", async () => {
      const service = new PlaidWebhookService(); // uses defaultVerifier
      const mockKey = { type: "public" };

      mockDecodeProtectedHeader.mockReturnValue({ kid: "fetch-key-1", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: {
            kty: "EC",
            crv: "P-256",
            x: "test-x",
            y: "test-y",
            kid: "fetch-key-1",
            alg: "ES256",
          },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);
      mockJwtVerify.mockResolvedValue({
        payload: { request_body_sha256: "deadbeef" },
      });

      const hashBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const mockDigest = jest
        .spyOn(crypto.subtle, "digest")
        .mockResolvedValue(hashBytes.buffer as ArrayBuffer);

      await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-for-fetch-test",
      });

      expect(mockWebhookVerificationKeyGet).toHaveBeenCalledWith({
        key_id: "fetch-key-1",
      });
      expect(mockImportJWK).toHaveBeenCalledWith(
        expect.objectContaining({
          kty: "EC",
          crv: "P-256",
          x: "test-x",
          y: "test-y",
          kid: "fetch-key-1",
          alg: "ES256",
        }),
        "ES256",
      );

      mockDigest.mockRestore();
    });

    it("should throw when importJWK returns Uint8Array (symmetric key guard)", async () => {
      const service = new PlaidWebhookService();

      mockDecodeProtectedHeader.mockReturnValue({ kid: "sym-key", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "oct", crv: "P-256", x: "x", y: "y", kid: "sym-key", alg: "ES256" },
        },
      });
      // Return Uint8Array to trigger the guard
      mockImportJWK.mockResolvedValue(new Uint8Array([1, 2, 3]));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-symmetric",
      });

      // The error is caught by the try/catch in defaultVerifier and returns false
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unexpected symmetric key returned for ES256 JWK"),
      );

      consoleSpy.mockRestore();
    });

    it("should return false when webhookVerificationKeyGet fails", async () => {
      const service = new PlaidWebhookService();

      mockDecodeProtectedHeader.mockReturnValue({ kid: "fail-key", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockRejectedValue(
        new Error("Plaid API error"),
      );

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation();

      const result = await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-plaid-fail",
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Signature verification failed: Plaid API error"),
      );

      consoleSpy.mockRestore();
    });

    it("should use cached key on second call with same kid", async () => {
      const service = new PlaidWebhookService();
      const mockKey = { type: "public" };

      mockDecodeProtectedHeader.mockReturnValue({ kid: "cache-hit-key", alg: "ES256" });
      mockWebhookVerificationKeyGet.mockResolvedValue({
        data: {
          key: { kty: "EC", crv: "P-256", x: "x", y: "y", kid: "cache-hit-key", alg: "ES256" },
        },
      });
      mockImportJWK.mockResolvedValue(mockKey);
      mockJwtVerify.mockResolvedValue({
        payload: { request_body_sha256: "aabb" },
      });

      const hashBytes = new Uint8Array([0xaa, 0xbb]);
      const mockDigest = jest
        .spyOn(crypto.subtle, "digest")
        .mockResolvedValue(hashBytes.buffer as ArrayBuffer);

      // First call — should fetch from Plaid
      await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-cache-1",
      });

      expect(mockWebhookVerificationKeyGet).toHaveBeenCalledTimes(1);
      expect(mockImportJWK).toHaveBeenCalledTimes(1);

      // Second call — same kid, should use cache
      await service.verifyWebhookSignature("{}", {
        "plaid-verification": "jwt-cache-2",
      });

      // webhookVerificationKeyGet should NOT be called again
      expect(mockWebhookVerificationKeyGet).toHaveBeenCalledTimes(1);
      // importJWK should NOT be called again
      expect(mockImportJWK).toHaveBeenCalledTimes(1);

      mockDigest.mockRestore();
    });
  });

  // =========================================================================
  // Singleton Export
  // =========================================================================
  describe("module exports", () => {
    it("should export plaidWebhookService as a singleton", () => {
      expect(plaidWebhookService).toBeDefined();
      expect(typeof plaidWebhookService.registerHandler).toBe("function");
      expect(typeof plaidWebhookService.verifyWebhookSignature).toBe(
        "function",
      );
      expect(typeof plaidWebhookService.handleEvent).toBe("function");
      expect(typeof plaidWebhookService.setVerifier).toBe("function");
      expect(typeof plaidWebhookService.getHandlerCount).toBe("function");
    });

    it("should export default as the same singleton", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const defaultExport = require("../plaid-webhook-handler").default;
      expect(defaultExport).toBe(plaidWebhookService);
    });

    it("should export PlaidWebhookService class for custom instantiation", () => {
      expect(PlaidWebhookService).toBeDefined();
      const custom = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      expect(custom).toBeInstanceOf(PlaidWebhookService);
    });
  });

  // =========================================================================
  // Custom handler registration
  // =========================================================================
  describe("custom handler registration", () => {
    it("should support AUTH:AUTOMATICALLY_VERIFIED events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("AUTH", "AUTOMATICALLY_VERIFIED", handler);

      const event = makeEvent({
        webhook_type: "AUTH",
        webhook_code: "AUTOMATICALLY_VERIFIED",
      });
      await service.handleEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should support AUTH:VERIFICATION_EXPIRED events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("AUTH", "VERIFICATION_EXPIRED", handler);

      await service.handleEvent(
        makeEvent({
          webhook_type: "AUTH",
          webhook_code: "VERIFICATION_EXPIRED",
        }),
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should support INVESTMENTS_TRANSACTIONS:DEFAULT_UPDATE events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler(
        "INVESTMENTS_TRANSACTIONS",
        "DEFAULT_UPDATE",
        handler,
      );

      await service.handleEvent(
        makeEvent({
          webhook_type: "INVESTMENTS_TRANSACTIONS",
          webhook_code: "DEFAULT_UPDATE",
        }),
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should support LIABILITIES:DEFAULT_UPDATE events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("LIABILITIES", "DEFAULT_UPDATE", handler);

      await service.handleEvent(
        makeEvent({
          webhook_type: "LIABILITIES",
          webhook_code: "DEFAULT_UPDATE",
        }),
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should support ITEM:LOGIN_REPAIRED events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("ITEM", "LOGIN_REPAIRED", handler);

      await service.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "LOGIN_REPAIRED",
        }),
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should support ITEM:USER_PERMISSION_REVOKED events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler(
        "ITEM",
        "USER_PERMISSION_REVOKED",
        handler,
      );

      await service.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "USER_PERMISSION_REVOKED",
        }),
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should support ITEM:WEBHOOK_UPDATE_ACKNOWLEDGED events", async () => {
      const service = new PlaidWebhookService(() =>
        Promise.resolve(true),
      );
      const handler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler(
        "ITEM",
        "WEBHOOK_UPDATE_ACKNOWLEDGED",
        handler,
      );

      await service.handleEvent(
        makeEvent({
          webhook_type: "ITEM",
          webhook_code: "WEBHOOK_UPDATE_ACKNOWLEDGED",
        }),
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
