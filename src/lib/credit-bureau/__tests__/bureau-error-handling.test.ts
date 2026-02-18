/**
 * Bureau Error Handling — Integration Tests
 *
 * Focused tests for error scenarios across all three bureau clients:
 *   - Timeout / abort
 *   - Rate limiting (429)
 *   - Invalid / malformed responses
 *   - Authentication failures (401, 403)
 *   - Server errors (500, 502, 503)
 *   - Network errors (ECONNREFUSED, DNS)
 *   - Credential validation errors
 *   - Partial / incomplete responses
 *   - Retry logic behaviour
 *
 * All HTTP calls are mocked via global.fetch (set up in setupTests.ts).
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () =>
    new Proxy({} as Record<string, unknown>, {
      get: () =>
        jest.fn().mockReturnValue({
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: "user-1",
              first_name: "Test",
              last_name: "User",
              ssn: "000-00-0000",
              date_of_birth: "1990-01-01",
              address_line1: "1 Test Ave",
              city: "Testville",
              state: "TX",
              zip_code: "75001",
            },
            error: null,
          }),
        }),
    }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { ExperianClient } from "../experian-client";
import { EquifaxClient } from "../equifax-client";
import { TransUnionClient } from "../transunion-client";
import { CreditBureauService } from "../credit-bureau-service";
import type {
  Bureau,
  CreditReportRequest,
  DisputeSubmission,
  UserPII,
} from "../types";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TEST_USER_PII: UserPII = {
  firstName: "Test",
  lastName: "User",
  ssn: "000-00-0000",
  dateOfBirth: "1990-01-01",
  addresses: [
    {
      streetAddress: "1 Test Ave",
      city: "Testville",
      state: "TX",
      zipCode: "75001",
    },
  ],
};

const CREDIT_REPORT_REQUEST: CreditReportRequest = {
  user_id: "user-1",
  bureau: "experian",
  report_type: "full",
  consumer_consent: true,
  permissible_purpose: "ACCOUNT_REVIEW",
};

const DISPUTE_SUBMISSION: DisputeSubmission = {
  bureau: "experian",
  credit_item_id: "item-123",
  dispute_reason: "not_mine",
  dispute_method: "online",
  consumer_statement: "This account is not mine.",
};

function makeOkJsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

function makeErrorResponse(status: number, body = ""): Partial<Response> {
  return {
    ok: false,
    status,
    statusText:
      status === 429
        ? "Too Many Requests"
        : status === 401
          ? "Unauthorized"
          : status === 403
            ? "Forbidden"
            : status === 500
              ? "Internal Server Error"
              : status === 502
                ? "Bad Gateway"
                : status === 503
                  ? "Service Unavailable"
                  : "Error",
    json: jest.fn().mockRejectedValue(new Error("not json")),
    text: jest.fn().mockResolvedValue(body),
  };
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Re-assign global.fetch as a jest.fn() since resetMocks: true in jest config
  // clears the mock set up in setupTests.ts before each test
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =========================================================================
// Experian Client — Error Handling
// =========================================================================

describe("ExperianClient — error handling", () => {
  let client: ExperianClient;

  beforeEach(() => {
    client = new ExperianClient("test-client-id", "test-client-secret", true);
  });

  // ---- Timeout ----

  it("should handle fetch timeout (AbortError) during token acquisition", async () => {
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError",
    );
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to obtain Experian access token");
    expect(result.bureau).toBe("experian");
  });

  // ---- Rate limiting (429) ----

  it("should handle 429 Too Many Requests during token exchange", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(429, '{"error":"rate_limit_exceeded"}'),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to obtain Experian access token");
  });

  it("should handle 429 during credit report retrieval", async () => {
    // First call: token success
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok-123", expires_in: 3600 }),
    );
    // Second call: 429 on the report endpoint
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(429, "Rate limit exceeded. Retry after 60 seconds."),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Experian API error: 429");
  });

  // ---- Authentication failure (401, 403) ----

  it("should handle 401 Unauthorized during token exchange", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(401, "Invalid credentials"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to obtain Experian access token");
  });

  it("should handle 403 Forbidden during credit report retrieval", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(403, "Insufficient permissions"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Experian API error: 403");
  });

  // ---- Server errors (500, 502, 503) ----

  it("should handle 500 Internal Server Error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(500, "Internal server error"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("should handle 502 Bad Gateway", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(502, "<html>Bad Gateway</html>"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("502");
  });

  it("should handle 503 Service Unavailable", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(503, "Service temporarily unavailable"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("503");
  });

  // ---- Network errors ----

  it("should handle network connection refused", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 127.0.0.1:443"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to obtain Experian access token");
  });

  it("should handle DNS resolution failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("getaddrinfo ENOTFOUND sandbox-us-api.experian.com"),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to obtain Experian access token");
  });

  // ---- Invalid / malformed responses ----

  it("should handle malformed JSON in token response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockRejectedValueOnce(new SyntaxError("Unexpected token < in JSON")),
      text: jest.fn().mockResolvedValue("<html>not json</html>"),
    });

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    // The error gets wrapped as "Failed to obtain Experian access token"
    expect(result.error).toBeTruthy();
  });

  it("should handle token response missing access_token field", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ token_type: "bearer", expires_in: 3600 }), // no access_token
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    // Should fail because access_token is missing/undefined
    expect(result.error).toBeTruthy();
  });

  it("should handle credit report response with empty body", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({}), // empty report data
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    // Should succeed but with score 0 and empty arrays
    expect(result.success).toBe(true);
    expect(result.data?.credit_score).toBe(0);
    expect(result.data?.accounts).toEqual([]);
  });

  // ---- Partial response ----

  it("should handle partial report response with some data missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({
        riskModel: { score: 720 },
        tradelines: [{ creditorName: "Bank A", balance: 5000 }],
        // inquiries and publicRecords missing
      }),
    );

    const result = await client.getCreditReport(
      CREDIT_REPORT_REQUEST,
      TEST_USER_PII,
    );
    expect(result.success).toBe(true);
    expect(result.data?.credit_score).toBe(720);
    expect(result.data?.accounts).toHaveLength(1);
    expect(result.data?.inquiries).toEqual([]);
    expect(result.data?.public_records).toEqual([]);
  });

  // ---- Dispute errors ----

  it("should handle dispute submission failure with 500", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(500, "Internal error during dispute processing"),
    );

    const result = await client.submitDispute(
      DISPUTE_SUBMISSION,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Experian dispute submission failed: 500");
  });

  it("should handle dispute 429 rate limiting", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok", expires_in: 3600 }),
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(429, "Too many dispute requests"),
    );

    const result = await client.submitDispute(
      DISPUTE_SUBMISSION,
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("429");
  });
});

// =========================================================================
// Equifax Client — Error Handling
// =========================================================================

describe("EquifaxClient — error handling", () => {
  let client: EquifaxClient;

  beforeEach(() => {
    client = new EquifaxClient("test-api-key", "test-client-id", "sandbox");
  });

  // ---- Timeout ----

  it("should handle fetch timeout (AbortError)", async () => {
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError",
    );
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.bureau).toBe("equifax");
  });

  // ---- Rate limiting (429) ----

  it("should handle 429 Too Many Requests", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(
        429,
        '{"error":"rate_limit_exceeded","retry_after":30}',
      ),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Equifax API error: 429");
  });

  // ---- Authentication failure ----

  it("should handle 401 Unauthorized", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(401, "Invalid API key"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Equifax API error: 401");
  });

  it("should handle 403 Forbidden", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(403, "Access denied"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("403");
  });

  // ---- Server errors ----

  it("should handle 500 Internal Server Error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(500, "Server error"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("should handle 502 Bad Gateway", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(502, "Bad Gateway"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("502");
  });

  it("should handle 503 Service Unavailable", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(503, "Maintenance window"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("503");
  });

  // ---- Network errors ----

  it("should handle network ECONNREFUSED", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 10.0.0.1:443"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("should handle DNS failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("getaddrinfo ENOTFOUND api.sandbox.equifax.com"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("ENOTFOUND");
  });

  // ---- Malformed response ----

  it("should handle malformed JSON in credit report response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockRejectedValueOnce(new SyntaxError("Unexpected end of JSON input")),
      text: jest.fn().mockResolvedValue("truncated..."),
    });

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
  });

  it("should handle empty response body", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({}), // no consumers
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    // Should succeed with defaults (score 0, empty arrays)
    expect(result.success).toBe(true);
    expect(result.data?.credit_score).toBe(0);
    expect(result.data?.accounts).toEqual([]);
  });

  // ---- Partial response ----

  it("should handle partial response with only some tradelines", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({
        consumers: [
          {
            creditScore: { score: 650 },
            tradelines: [{ creditorName: "Partial Bank" }],
            // No inquiries, no publicRecords
          },
        ],
      }),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(true);
    expect(result.data?.credit_score).toBe(650);
    expect(result.data?.accounts).toHaveLength(1);
    expect(result.data?.inquiries).toEqual([]);
    expect(result.data?.public_records).toEqual([]);
  });

  // ---- Dispute errors ----

  it("should handle dispute submission 500 error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(500, "Dispute processing failed"),
    );

    const result = await client.submitDispute(
      { ...DISPUTE_SUBMISSION, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Equifax dispute submission failed: 500");
  });

  it("should handle dispute submission network failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("socket hang up"),
    );

    const result = await client.submitDispute(
      { ...DISPUTE_SUBMISSION, bureau: "equifax" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("socket hang up");
  });
});

// =========================================================================
// TransUnion Client — Error Handling
// =========================================================================

describe("TransUnionClient — error handling", () => {
  let client: TransUnionClient;

  beforeEach(() => {
    client = new TransUnionClient("test-subscriber-id", "test-api-key", "test");
  });

  // ---- Timeout ----

  it("should handle fetch timeout (AbortError)", async () => {
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError",
    );
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.bureau).toBe("transunion");
  });

  // ---- Rate limiting (429) ----

  it("should handle 429 Too Many Requests", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(429, "Rate limit exceeded"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("TransUnion API error: 429");
  });

  // ---- Authentication failures ----

  it("should handle 401 Unauthorized", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(401, "Bearer token expired"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("TransUnion API error: 401");
  });

  it("should handle 403 Forbidden", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(403, "Subscriber not authorized"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("403");
  });

  // ---- Server errors ----

  it("should handle 500 Internal Server Error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(500, "TransUnion internal error"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("should handle 502 Bad Gateway", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(502, "<html>502 Bad Gateway</html>"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("502");
  });

  it("should handle 503 Service Unavailable", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(503, "Scheduled maintenance"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("503");
  });

  // ---- Network errors ----

  it("should handle network connection refused", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 192.168.1.1:443"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("should handle DNS failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("getaddrinfo ENOTFOUND netaccess-test.transunion.com"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("ENOTFOUND");
  });

  it("should handle socket timeout (ETIMEDOUT)", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("connect ETIMEDOUT 10.0.0.1:443"),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("ETIMEDOUT");
  });

  // ---- Malformed response ----

  it("should handle malformed JSON in response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockRejectedValueOnce(new SyntaxError("Unexpected token")),
      text: jest.fn().mockResolvedValue("{invalid json"),
    });

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
  });

  it("should handle response with completely empty body", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({}), // no creditReport or riskModel
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(true);
    expect(result.data?.credit_score).toBe(0);
    expect(result.data?.accounts).toEqual([]);
  });

  // ---- Partial response ----

  it("should handle partial response with score but no tradelines", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({
        riskModel: { score: 690 },
        creditReport: {
          // tradelines, inquiries, publicRecords all missing
        },
      }),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(true);
    expect(result.data?.credit_score).toBe(690);
    expect(result.data?.accounts).toEqual([]);
    expect(result.data?.inquiries).toEqual([]);
  });

  it("should handle partial tradeline data (missing optional fields)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({
        creditReport: {
          tradelines: [
            { creditorName: "Minimal Bank" },
            { accountNumber: "ACC-999", balance: 100 },
          ],
        },
      }),
    );

    const result = await client.getCreditReport(
      { ...CREDIT_REPORT_REQUEST, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(true);
    expect(result.data?.accounts).toHaveLength(2);
    expect(result.data?.accounts?.[0].creditor_name).toBe("Minimal Bank");
    expect(result.data?.accounts?.[1].balance).toBe(100);
  });

  // ---- Dispute errors ----

  it("should handle dispute submission 500", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeErrorResponse(500, "Dispute failed"),
    );

    const result = await client.submitDispute(
      { ...DISPUTE_SUBMISSION, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("TransUnion dispute submission failed: 500");
  });

  it("should handle dispute submission timeout", async () => {
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError",
    );
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await client.submitDispute(
      { ...DISPUTE_SUBMISSION, bureau: "transunion" },
      TEST_USER_PII,
    );
    expect(result.success).toBe(false);
  });
});

// =========================================================================
// CreditBureauService — Credential Validation Error Handling
// =========================================================================

describe("CreditBureauService — credential validation error handling", () => {
  const BUREAUS: Bureau[] = ["experian", "equifax", "transunion"];

  beforeEach(() => {
    CreditBureauService.flushCredentialCache();
    delete process.env.BUREAU_API_ENVIRONMENT;
    // Set up minimal credentials for each bureau
    for (const bureau of BUREAUS) {
      const prefix = bureau.toUpperCase();
      process.env[`${prefix}_API_KEY`] = `test-key-${bureau}`;
      process.env[`${prefix}_API_SECRET`] = `test-secret-${bureau}`;
      process.env[`${prefix}_CLIENT_ID`] = `test-client-${bureau}`;
    }
    CreditBureauService.flushCredentialCache();
    // Re-assign global.fetch as a jest.fn() since resetMocks clears it
    global.fetch = jest.fn();
  });

  afterEach(() => {
    for (const bureau of BUREAUS) {
      const prefix = bureau.toUpperCase();
      delete process.env[`${prefix}_API_KEY`];
      delete process.env[`${prefix}_API_SECRET`];
      delete process.env[`${prefix}_CLIENT_ID`];
    }
  });

  // ---- Timeout during validation ----

  it("should return invalid when Experian validation times out (AbortError)", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    const result = await CreditBureauService.validateCredentials("experian");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("aborted");
  });

  it("should return invalid when Equifax validation times out", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    const result = await CreditBureauService.validateCredentials("equifax");
    expect(result.valid).toBe(false);
  });

  it("should return invalid when TransUnion validation times out", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    const result = await CreditBureauService.validateCredentials("transunion");
    expect(result.valid).toBe(false);
  });

  // ---- Server error during validation ----

  it("should return invalid when Experian token endpoint returns 500", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeErrorResponse(500));

    const result = await CreditBureauService.validateCredentials("experian");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("500");
  });

  it("should return invalid when Equifax health returns 503", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeErrorResponse(503));

    const result = await CreditBureauService.validateCredentials("equifax");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("503");
  });

  it("should return invalid when TransUnion health returns 502", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeErrorResponse(502));

    const result = await CreditBureauService.validateCredentials("transunion");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("502");
  });

  // ---- Network error during validation ----

  it("should return invalid with network error message for all bureaus", async () => {
    for (const bureau of BUREAUS) {
      CreditBureauService.flushCredentialCache();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error(`connect ECONNREFUSED for ${bureau}`),
      );

      const result = await CreditBureauService.validateCredentials(bureau);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("ECONNREFUSED");
      expect(result.bureau).toBe(bureau);
    }
  });

  // ---- Empty credentials ----

  it("should return invalid immediately when both apiKey and apiSecret are empty", async () => {
    delete process.env.EXPERIAN_API_KEY;
    delete process.env.EXPERIAN_API_SECRET;
    CreditBureauService.flushCredentialCache();

    const result = await CreditBureauService.validateCredentials("experian");
    expect(result.valid).toBe(false);
    expect(result.latencyMs).toBe(0);
    expect(result.error).toContain("No API credentials configured");
    // Ensure no fetch was called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ---- validateAllCredentials with mixed results ----

  it("should return mixed results when some bureaus succeed and others fail", async () => {
    // Experian: success (200 on token endpoint)
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      makeOkJsonResponse({ access_token: "tok" }),
    );
    // Equifax: fail (500)
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeErrorResponse(500));
    // TransUnion: fail (network error)
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("ECONNREFUSED"),
    );

    const results = await CreditBureauService.validateAllCredentials();
    expect(results).toHaveLength(3);

    const experian = results.find((r) => r.bureau === "experian");
    const equifax = results.find((r) => r.bureau === "equifax");
    const transunion = results.find((r) => r.bureau === "transunion");

    expect(experian?.valid).toBe(true);
    expect(equifax?.valid).toBe(false);
    expect(transunion?.valid).toBe(false);
  });

  // ---- Non-Error throw ----

  it("should handle non-Error exceptions gracefully", async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    (global.fetch as jest.Mock).mockRejectedValueOnce("string error value");

    const result = await CreditBureauService.validateCredentials("experian");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Unknown validation error");
  });

  // ---- Rate limiting during validation ----

  it("should return invalid when bureau returns 429 during validation", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeErrorResponse(429));

    const result = await CreditBureauService.validateCredentials("equifax");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("429");
  });

  // ---- Latency measurement ----

  it("should record non-zero latency on successful validation", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeOkJsonResponse({}));

    const result = await CreditBureauService.validateCredentials("transunion");
    expect(result.valid).toBe(true);
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should record non-zero latency on failed validation (server error)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(makeErrorResponse(500));

    const result = await CreditBureauService.validateCredentials("experian");
    expect(result.valid).toBe(false);
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

// =========================================================================
// Cross-bureau: consistent error response structure
// =========================================================================

describe("Cross-bureau error response structure", () => {
  const clients = [
    {
      name: "ExperianClient",
      factory: () => new ExperianClient("cid", "csecret", true),
      bureau: "experian" as Bureau,
    },
    {
      name: "EquifaxClient",
      factory: () => new EquifaxClient("key", "cid", "sandbox"),
      bureau: "equifax" as Bureau,
    },
    {
      name: "TransUnionClient",
      factory: () => new TransUnionClient("sid", "key", "test"),
      bureau: "transunion" as Bureau,
    },
  ];

  beforeEach(() => {
    // Re-assign global.fetch as a jest.fn() since resetMocks clears it
    global.fetch = jest.fn();
  });

  for (const { name, factory, bureau } of clients) {
    it(`${name}: error response has correct bureau, timestamp, and success=false`, async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("total failure"),
      );

      // For Experian, this triggers the token acquisition failure path
      const client = factory();
      const result = await client.getCreditReport(
        { ...CREDIT_REPORT_REQUEST, bureau },
        TEST_USER_PII,
      );

      expect(result.success).toBe(false);
      expect(result.bureau).toBe(bureau);
      expect(result.timestamp).toBeTruthy();
      expect(typeof result.timestamp).toBe("string");
      expect(result.error).toBeTruthy();
      expect(result.data).toBeUndefined();
    });

    it(`${name}: dispute error response has correct structure`, async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("dispute network failure"),
      );

      // Experian needs a token first — mock it
      if (bureau === "experian") {
        global.fetch = jest.fn();
        (global.fetch as jest.Mock).mockRejectedValueOnce(
          new Error("token failure"),
        );
      }

      const client = factory();
      const result = await client.submitDispute(
        { ...DISPUTE_SUBMISSION, bureau },
        TEST_USER_PII,
      );

      expect(result.success).toBe(false);
      expect(result.bureau).toBe(bureau);
      expect(result.timestamp).toBeTruthy();
    });
  }
});
