/**
 * Tests for POST /api/financial/plaid/webhooks
 *
 * Covers:
 * - POST with valid signature -> 200
 * - POST with invalid signature -> 401
 * - POST with missing signature header -> 401
 * - POST with invalid JSON -> 400
 * - POST with invalid webhook payload (missing fields) -> 400
 * - Handler error -> 500
 * - Successful dispatch with valid event
 * - Signature verification error (throws) -> 401
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockVerifyWebhookSignature = jest.fn();
const mockHandleEvent = jest.fn();

jest.mock("@/lib/financial/plaid-webhook-handler", () => ({
  plaidWebhookService: {
    verifyWebhookSignature: (...args: unknown[]) =>
      mockVerifyWebhookSignature(...args),
    handleEvent: (...args: unknown[]) => mockHandleEvent(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock NextRequest that correctly supports .text() in the test env.
 * Uses the pattern from existing Plaid route tests: cast a plain object.
 */
function createWebhookRequest(
  body: string,
  headers?: Record<string, string>,
): NextRequest {
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  return {
    url: "http://localhost:3000/api/financial/plaid/webhooks",
    method: "POST",
    headers: requestHeaders,
    text: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

/**
 * Create a mock NextRequest where .text() rejects.
 */
function createFailingRequest(): NextRequest {
  return {
    url: "http://localhost:3000/api/financial/plaid/webhooks",
    method: "POST",
    headers: new Headers(),
    text: jest.fn().mockRejectedValue(new Error("Read failed")),
  } as unknown as NextRequest;
}

const validEvent = JSON.stringify({
  webhook_type: "TRANSACTIONS",
  webhook_code: "DEFAULT_UPDATE",
  item_id: "item-test-123",
  new_transactions: 5,
});

// ============================================================================
// TESTS
// ============================================================================

describe("POST /api/financial/plaid/webhooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 for valid webhook with valid signature", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);
    mockHandleEvent.mockResolvedValue(undefined);

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "valid-jwt-token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockVerifyWebhookSignature).toHaveBeenCalledTimes(1);
    expect(mockHandleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
        item_id: "item-test-123",
      }),
    );
  });

  it("should return 401 for invalid signature", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(false);

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "bad-jwt-token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid webhook signature");
    expect(mockHandleEvent).not.toHaveBeenCalled();
  });

  it("should return 401 when Plaid-Verification header is missing", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(false);

    const request = createWebhookRequest(validEvent);

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockHandleEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid JSON body", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);

    const request = createWebhookRequest("not valid json {{{", {
      "plaid-verification": "valid-jwt-token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
    expect(mockHandleEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for webhook payload missing required fields", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);

    // Missing item_id
    const request = createWebhookRequest(
      JSON.stringify({
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
      }),
      {
        "plaid-verification": "valid-jwt-token",
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid webhook payload");
    expect(mockHandleEvent).not.toHaveBeenCalled();
  });

  it("should return 400 for non-object JSON body", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);

    const request = createWebhookRequest('"just a string"', {
      "plaid-verification": "valid-jwt-token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid webhook payload");
  });

  it("should return 400 for null JSON body", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);

    const request = createWebhookRequest("null", {
      "plaid-verification": "valid-jwt-token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid webhook payload");
  });

  it("should return 400 when request body read fails", async () => {
    const request = createFailingRequest();

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Failed to read request body");
  });

  it("should return 500 when handler throws an error", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);
    mockHandleEvent.mockRejectedValue(
      new Error("Handler processing failed"),
    );

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation();

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "valid-jwt-token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Webhook handler error");

    consoleSpy.mockRestore();
  });

  it("should return 401 when signature verification throws", async () => {
    mockVerifyWebhookSignature.mockRejectedValue(
      new Error("Verification threw"),
    );

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "broken-jwt",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Signature verification error");
    expect(mockHandleEvent).not.toHaveBeenCalled();
  });

  it("should pass the raw body to verifyWebhookSignature", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);
    mockHandleEvent.mockResolvedValue(undefined);

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "some-jwt",
    });

    await POST(request);

    expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
      validEvent,
      expect.objectContaining({
        "plaid-verification": "some-jwt",
      }),
    );
  });

  it("should pass headers as a plain object to verifyWebhookSignature", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);
    mockHandleEvent.mockResolvedValue(undefined);

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "jwt-token",
      "x-custom-header": "custom-value",
    });

    await POST(request);

    const [, headersArg] = mockVerifyWebhookSignature.mock
      .calls[0] as [string, Record<string, string>];
    expect(typeof headersArg).toBe("object");
    expect(headersArg["plaid-verification"]).toBe("jwt-token");
    expect(headersArg["x-custom-header"]).toBe("custom-value");
  });

  it("should handle ITEM:ERROR event end-to-end", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);
    mockHandleEvent.mockResolvedValue(undefined);

    const event = JSON.stringify({
      webhook_type: "ITEM",
      webhook_code: "ERROR",
      item_id: "item-456",
      error: {
        error_type: "ITEM_ERROR",
        error_code: "ITEM_LOGIN_REQUIRED",
        error_message: "the login details have changed",
      },
    });

    const request = createWebhookRequest(event, {
      "plaid-verification": "valid-jwt",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockHandleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_type: "ITEM",
        webhook_code: "ERROR",
        item_id: "item-456",
        error: expect.objectContaining({
          error_type: "ITEM_ERROR",
          error_code: "ITEM_LOGIN_REQUIRED",
        }),
      }),
    );
  });

  it("should handle non-Error thrown values from handlers", async () => {
    mockVerifyWebhookSignature.mockResolvedValue(true);
    mockHandleEvent.mockRejectedValue("string error");

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation();

    const request = createWebhookRequest(validEvent, {
      "plaid-verification": "valid-jwt",
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("PlaidWebhookRoute"),
      "string error",
    );

    consoleSpy.mockRestore();
  });
});
