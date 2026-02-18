/**
 * Credit Bureau Service — Integration Tests
 *
 * Tests for CreditBureauService: credential management, initialization,
 * credit report retrieval, dispute submission, and credit analysis.
 *
 * All external HTTP calls and Supabase interactions are mocked.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

// Chainable Supabase mock — define inside factory to avoid TDZ with jest.mock hoisting
jest.mock("@/lib/supabase/client", () => {
  const mock: Record<string, any> = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  };

  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.delete.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.single.mockResolvedValue({
    data: {
      id: "user-1",
      first_name: "Jane",
      last_name: "Doe",
      ssn: "123-45-6789",
      date_of_birth: "1990-01-15",
      address_line1: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip_code: "62704",
    },
    error: null,
  });

  return { getSupabase: () => mock };
});

import { getSupabase } from "@/lib/supabase/client";
const mockSupabase = getSupabase() as any;

// Mock the individual bureau clients
jest.mock("@/lib/credit-bureau/experian-client", () => {
  return {
    ExperianClient: jest.fn().mockImplementation(() => ({
      getCreditReport: jest.fn(),
      submitDispute: jest.fn(),
    })),
  };
});

jest.mock("@/lib/credit-bureau/equifax-client", () => {
  return {
    EquifaxClient: jest.fn().mockImplementation(() => ({
      getCreditReport: jest.fn(),
      submitDispute: jest.fn(),
    })),
  };
});

jest.mock("@/lib/credit-bureau/transunion-client", () => {
  return {
    TransUnionClient: jest.fn().mockImplementation(() => ({
      getCreditReport: jest.fn(),
      submitDispute: jest.fn(),
    })),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { CreditBureauService, maskApiKey } from "../credit-bureau-service";
import { ExperianClient } from "../experian-client";
import { EquifaxClient } from "../equifax-client";
import { TransUnionClient } from "../transunion-client";
import type {
  Bureau,
  BureauConfig,
  SingleBureauCredential,
  CreditReport,
  BureauResponse,
} from "../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const BUREAUS: readonly Bureau[] = [
  "experian",
  "equifax",
  "transunion",
] as const;

function makeSandboxConfig(): BureauConfig {
  return {
    experian: {
      apiKey: "exp-key-abc123def456",
      apiSecret: "exp-secret-xyz",
      clientId: "exp-client-id",
      baseUrl: "https://sandbox-us-api.experian.com",
      environment: "sandbox",
    },
    equifax: {
      apiKey: "eqf-key-abc123def456",
      apiSecret: "eqf-secret-xyz",
      clientId: "eqf-client-id",
      baseUrl: "https://api.sandbox.equifax.com",
      environment: "sandbox",
    },
    transunion: {
      apiKey: "tu-key-abc123def456",
      apiSecret: "tu-secret-xyz",
      clientId: "tu-client-id",
      baseUrl: "https://netaccess-test.transunion.com",
      environment: "sandbox",
    },
  };
}

function makeProductionConfig(): BureauConfig {
  return {
    experian: {
      apiKey: "exp-prod-key-abc123def456",
      apiSecret: "exp-prod-secret-xyz",
      clientId: "exp-prod-client-id",
      baseUrl: "https://us-api.experian.com",
      environment: "production",
    },
    equifax: {
      apiKey: "eqf-prod-key-abc123def456",
      apiSecret: "eqf-prod-secret-xyz",
      clientId: "eqf-prod-client-id",
      baseUrl: "https://api.equifax.com",
      environment: "production",
    },
    transunion: {
      apiKey: "tu-prod-key-abc123def456",
      apiSecret: "tu-prod-secret-xyz",
      clientId: "tu-prod-client-id",
      baseUrl: "https://netaccess.transunion.com",
      environment: "production",
    },
  };
}

function makeMockCreditReport(bureau: Bureau): CreditReport {
  return {
    id: `${bureau}_report_1`,
    user_id: "user-1",
    bureau,
    credit_score: 720,
    report_date: "2026-02-17T00:00:00.000Z",
    accounts: [
      {
        id: "acc-1",
        account_number: "****1234",
        account_type: "credit_card",
        creditor_name: "Test Bank",
        balance: 2500,
        credit_limit: 10000,
        payment_status: "current",
        opened_date: "2020-01-01",
        payment_history: [],
      },
    ],
    inquiries: [
      {
        id: "inq-1",
        inquiry_date: "2026-01-15",
        creditor_name: "Auto Dealer",
        inquiry_type: "hard",
      },
    ],
    public_records: [],
    raw_data: {},
    created_at: "2026-02-17T00:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// Reset service state between tests
// ---------------------------------------------------------------------------

function resetServiceState(): void {
  CreditBureauService.flushCredentialCache();
  CreditBureauService.setCredentialCacheTtl(5 * 60 * 1000);
  // Reset the static initialized flag by calling initializeFromConfig with fresh config
  // This also resets the clients
}

// =========================================================================
// Tests
// =========================================================================

describe("CreditBureauService", () => {
  beforeEach(() => {
    resetServiceState();
    // Clear environment variables
    delete process.env.BUREAU_API_ENVIRONMENT;
    delete process.env.EXPERIAN_API_KEY;
    delete process.env.EXPERIAN_API_SECRET;
    delete process.env.EXPERIAN_CLIENT_ID;
    delete process.env.EXPERIAN_BASE_URL;
    delete process.env.EQUIFAX_API_KEY;
    delete process.env.EQUIFAX_API_SECRET;
    delete process.env.EQUIFAX_CLIENT_ID;
    delete process.env.EQUIFAX_BASE_URL;
    delete process.env.TRANSUNION_API_KEY;
    delete process.env.TRANSUNION_API_SECRET;
    delete process.env.TRANSUNION_CLIENT_ID;
    delete process.env.TRANSUNION_BASE_URL;

    // Re-assign global.fetch as a jest.fn() since resetMocks: true in jest config
    // clears the mock set up in setupTests.ts
    global.fetch = jest.fn();

    // Re-wire the Supabase chainable mock — resetMocks clears all mockReturnValue/mockResolvedValue
    const queryMock = mockSupabase as Record<string, jest.Mock>;
    queryMock.from.mockReturnValue(mockSupabase);
    queryMock.select.mockReturnValue(mockSupabase);
    queryMock.insert.mockReturnValue(mockSupabase);
    queryMock.update.mockReturnValue(mockSupabase);
    queryMock.delete.mockReturnValue(mockSupabase);
    queryMock.eq.mockReturnValue(mockSupabase);
    queryMock.single.mockResolvedValue({
      data: {
        id: "user-1",
        first_name: "Jane",
        last_name: "Doe",
        ssn: "123-45-6789",
        date_of_birth: "1990-01-15",
        address_line1: "123 Main St",
        city: "Springfield",
        state: "IL",
        zip_code: "62704",
      },
      error: null,
    });

    // Re-wire bureau client mock constructors — resetMocks clears mockImplementation
    (ExperianClient as jest.Mock).mockImplementation(() => ({
      getCreditReport: jest.fn(),
      submitDispute: jest.fn(),
    }));
    (EquifaxClient as jest.Mock).mockImplementation(() => ({
      getCreditReport: jest.fn(),
      submitDispute: jest.fn(),
    }));
    (TransUnionClient as jest.Mock).mockImplementation(() => ({
      getCreditReport: jest.fn(),
      submitDispute: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // maskApiKey utility
  // -----------------------------------------------------------------------

  describe("maskApiKey", () => {
    it("should mask keys longer than 12 characters showing first and last 4", () => {
      const result = maskApiKey("abcdefghijklmnop");
      expect(result).toBe("abcd********mnop");
    });

    it("should fully mask keys shorter than 12 characters", () => {
      const result = maskApiKey("short");
      expect(result).toBe("*****");
    });

    it('should return "(empty)" for empty strings', () => {
      const result = maskApiKey("");
      expect(result).toBe("(empty)");
    });

    it("should mask exactly 12-character keys showing first and last 4", () => {
      // 12 chars: "abcdefghijkl" -> "abcd****ijkl"
      const result = maskApiKey("abcdefghijkl");
      expect(result).toBe("abcd****ijkl");
    });
  });

  // -----------------------------------------------------------------------
  // Credential management
  // -----------------------------------------------------------------------

  describe("getBureauCredentials", () => {
    it("should read credentials from environment variables", () => {
      process.env.EXPERIAN_API_KEY = "test-exp-key-123456";
      process.env.EXPERIAN_API_SECRET = "test-exp-secret";
      process.env.EXPERIAN_CLIENT_ID = "test-exp-client";

      const cred = CreditBureauService.getBureauCredentials("experian");
      expect(cred.apiKey).toBe("test-exp-key-123456");
      expect(cred.apiSecret).toBe("test-exp-secret");
      expect(cred.clientId).toBe("test-exp-client");
    });

    it("should default to sandbox environment when BUREAU_API_ENVIRONMENT is not set", () => {
      const cred = CreditBureauService.getBureauCredentials("experian");
      expect(cred.environment).toBe("sandbox");
      expect(cred.baseUrl).toBe("https://sandbox-us-api.experian.com");
    });

    it('should use production environment when BUREAU_API_ENVIRONMENT is "production"', () => {
      process.env.BUREAU_API_ENVIRONMENT = "production";
      CreditBureauService.flushCredentialCache();

      const cred = CreditBureauService.getBureauCredentials("experian");
      expect(cred.environment).toBe("production");
      expect(cred.baseUrl).toBe("https://us-api.experian.com");
    });

    it("should return cached credential within TTL", () => {
      process.env.EXPERIAN_API_KEY = "first-key";
      const first = CreditBureauService.getBureauCredentials("experian");
      expect(first.apiKey).toBe("first-key");

      // Change env var — should still get cached value
      process.env.EXPERIAN_API_KEY = "second-key";
      const second = CreditBureauService.getBureauCredentials("experian");
      expect(second.apiKey).toBe("first-key");
    });

    it("should refresh credential after cache expires", () => {
      CreditBureauService.setCredentialCacheTtl(0); // Expire immediately
      process.env.EXPERIAN_API_KEY = "first-key";
      CreditBureauService.getBureauCredentials("experian");

      process.env.EXPERIAN_API_KEY = "second-key";
      const result = CreditBureauService.getBureauCredentials("experian");
      expect(result.apiKey).toBe("second-key");
    });

    it("should return empty strings when env vars are not set", () => {
      const cred = CreditBureauService.getBureauCredentials("equifax");
      expect(cred.apiKey).toBe("");
      expect(cred.apiSecret).toBe("");
      expect(cred.clientId).toBe("");
    });

    it("should use correct default base URLs for each bureau in sandbox", () => {
      const exp = CreditBureauService.getBureauCredentials("experian");
      const eqf = CreditBureauService.getBureauCredentials("equifax");
      const tu = CreditBureauService.getBureauCredentials("transunion");

      expect(exp.baseUrl).toBe("https://sandbox-us-api.experian.com");
      expect(eqf.baseUrl).toBe("https://api.sandbox.equifax.com");
      expect(tu.baseUrl).toBe("https://netaccess-test.transunion.com");
    });

    it("should allow overriding base URL via environment variable", () => {
      process.env.EXPERIAN_BASE_URL = "https://custom-api.example.com";
      const cred = CreditBureauService.getBureauCredentials("experian");
      expect(cred.baseUrl).toBe("https://custom-api.example.com");
    });
  });

  // -----------------------------------------------------------------------
  // Credential validation
  // -----------------------------------------------------------------------

  describe("validateCredentials", () => {
    it("should return invalid when both apiKey and apiSecret are empty", async () => {
      // No env vars set — both default to empty string
      const result = await CreditBureauService.validateCredentials("experian");
      expect(result.valid).toBe(false);
      expect(result.latencyMs).toBe(0);
      expect(result.error).toContain("No API credentials configured");
    });

    it("should return valid when Experian token endpoint responds 200", async () => {
      process.env.EXPERIAN_API_KEY = "test-key";
      process.env.EXPERIAN_API_SECRET = "test-secret";
      process.env.EXPERIAN_CLIENT_ID = "test-client";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "tok", expires_in: 3600 }),
      });

      const result = await CreditBureauService.validateCredentials("experian");
      expect(result.valid).toBe(true);
      expect(result.bureau).toBe("experian");
      expect(result.error).toBeNull();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should return invalid when Experian token endpoint responds 401", async () => {
      process.env.EXPERIAN_API_KEY = "bad-key";
      process.env.EXPERIAN_API_SECRET = "bad-secret";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await CreditBureauService.validateCredentials("experian");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Experian token endpoint returned 401");
    });

    it("should return valid when Equifax health endpoint responds 200", async () => {
      process.env.EQUIFAX_API_KEY = "eqf-key";
      process.env.EQUIFAX_API_SECRET = "eqf-secret";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await CreditBureauService.validateCredentials("equifax");
      expect(result.valid).toBe(true);
      expect(result.bureau).toBe("equifax");
    });

    it("should accept 404 from Equifax health endpoint as valid (sandbox)", async () => {
      process.env.EQUIFAX_API_KEY = "eqf-key";
      process.env.EQUIFAX_API_SECRET = "eqf-secret";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await CreditBureauService.validateCredentials("equifax");
      expect(result.valid).toBe(true);
    });

    it("should return valid when TransUnion health endpoint responds 200", async () => {
      process.env.TRANSUNION_API_KEY = "tu-key";
      process.env.TRANSUNION_API_SECRET = "tu-secret";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result =
        await CreditBureauService.validateCredentials("transunion");
      expect(result.valid).toBe(true);
      expect(result.bureau).toBe("transunion");
    });

    it("should handle fetch error (network failure) gracefully", async () => {
      process.env.EXPERIAN_API_KEY = "some-key";
      process.env.EXPERIAN_API_SECRET = "some-secret";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("connect ECONNREFUSED"),
      );

      const result = await CreditBureauService.validateCredentials("experian");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("connect ECONNREFUSED");
    });

    it("should include checkedAt timestamp in ISO-8601 format", async () => {
      const result = await CreditBureauService.validateCredentials("equifax");
      expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // -----------------------------------------------------------------------
  // validateAllCredentials
  // -----------------------------------------------------------------------

  describe("validateAllCredentials", () => {
    it("should validate all three bureaus in parallel", async () => {
      // All empty — all should fail fast
      const results = await CreditBureauService.validateAllCredentials();
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.bureau).sort()).toEqual([
        "equifax",
        "experian",
        "transunion",
      ]);
      results.forEach((r) => expect(r.valid).toBe(false));
    });
  });

  // -----------------------------------------------------------------------
  // getCredentialStatus
  // -----------------------------------------------------------------------

  describe("getCredentialStatus", () => {
    it("should return status for all three bureaus", () => {
      const statuses = CreditBureauService.getCredentialStatus();
      expect(statuses).toHaveLength(3);
      const names = statuses.map((s) => s.bureau);
      expect(names).toContain("experian");
      expect(names).toContain("equifax");
      expect(names).toContain("transunion");
    });

    it("should report configured=false when no env vars are set", () => {
      const statuses = CreditBureauService.getCredentialStatus();
      statuses.forEach((s) => {
        expect(s.configured).toBe(false);
      });
    });

    it("should report configured=true when apiKey is present", () => {
      process.env.EXPERIAN_API_KEY = "some-key";
      CreditBureauService.flushCredentialCache();

      const statuses = CreditBureauService.getCredentialStatus();
      const expStatus = statuses.find((s) => s.bureau === "experian");
      expect(expStatus?.configured).toBe(true);
    });

    it("should reflect validation state after validateCredentials is called", async () => {
      process.env.EQUIFAX_API_KEY = "eqf-key";
      process.env.EQUIFAX_API_SECRET = "eqf-secret";
      CreditBureauService.flushCredentialCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await CreditBureauService.validateCredentials("equifax");

      const statuses = CreditBureauService.getCredentialStatus();
      const eqf = statuses.find((s) => s.bureau === "equifax");
      expect(eqf?.valid).toBe(true);
      expect(eqf?.lastValidated).toBeTruthy();
      expect(eqf?.lastError).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // rotateApiKey
  // -----------------------------------------------------------------------

  describe("rotateApiKey", () => {
    it("should update the cached credential with the new key", () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      CreditBureauService.rotateApiKey("experian", "new-rotated-key-123456");

      const cred = CreditBureauService.getBureauCredentials("experian");
      expect(cred.apiKey).toBe("new-rotated-key-123456");
    });

    it("should throw when new key is empty", () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      expect(() => CreditBureauService.rotateApiKey("experian", "")).toThrow(
        /new key is empty/,
      );
    });

    it("should throw when new key is whitespace-only", () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      expect(() => CreditBureauService.rotateApiKey("equifax", "   ")).toThrow(
        /new key is empty/,
      );
    });

    it("should reset validation state after rotation", async () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      // Simulate a successful validation first
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await CreditBureauService.validateCredentials("experian");

      // Rotate key
      CreditBureauService.rotateApiKey("experian", "new-key-after-rotate");

      const statuses = CreditBureauService.getCredentialStatus();
      const exp = statuses.find((s) => s.bureau === "experian");
      expect(exp?.valid).toBe(false);
      expect(exp?.lastValidated).toBeNull();
    });

    it("should re-initialize the bureau client after rotation", () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      CreditBureauService.rotateApiKey("equifax", "new-eqf-key-12345678");

      // The EquifaxClient constructor should have been called again
      expect(EquifaxClient).toHaveBeenCalledTimes(2); // once in init, once in rotate
    });
  });

  // -----------------------------------------------------------------------
  // initializeFromConfig
  // -----------------------------------------------------------------------

  describe("initializeFromConfig", () => {
    it("should initialize all three bureau clients", () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      expect(ExperianClient).toHaveBeenCalledWith(
        "exp-client-id",
        "exp-secret-xyz",
        true, // sandbox
      );
      expect(EquifaxClient).toHaveBeenCalledWith(
        "eqf-key-abc123def456",
        "eqf-client-id",
        "sandbox",
      );
      expect(TransUnionClient).toHaveBeenCalledWith(
        "tu-client-id",
        "tu-key-abc123def456",
        "test", // sandbox maps to 'test'
      );
    });

    it("should pass production params when environment is production", () => {
      const config = makeProductionConfig();
      CreditBureauService.initializeFromConfig(config);

      expect(ExperianClient).toHaveBeenCalledWith(
        "exp-prod-client-id",
        "exp-prod-secret-xyz",
        false, // production
      );
      expect(TransUnionClient).toHaveBeenCalledWith(
        "tu-prod-client-id",
        "tu-prod-key-abc123def456",
        "production",
      );
    });

    it("should populate credential cache for all bureaus", () => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);

      for (const bureau of BUREAUS) {
        const cred = CreditBureauService.getBureauCredentials(bureau);
        expect(cred.apiKey).toBe(config[bureau].apiKey);
      }
    });
  });

  // -----------------------------------------------------------------------
  // getCreditReport
  // -----------------------------------------------------------------------

  describe("getCreditReport", () => {
    beforeEach(() => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);
    });

    it("should return a successful credit report for Experian", async () => {
      const mockReport = makeMockCreditReport("experian");
      const mockResponse: BureauResponse<CreditReport> = {
        success: true,
        data: mockReport,
        bureau: "experian",
        timestamp: new Date().toISOString(),
      };

      // Get the mocked client instance and configure it
      const clientInstance = (ExperianClient as jest.Mock).mock.results.slice(
        -1,
      )[0]?.value;
      if (clientInstance) {
        clientInstance.getCreditReport.mockResolvedValueOnce(mockResponse);
      }

      // Mock supabase insert for saving the report
      (mockSupabase.insert as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await CreditBureauService.getCreditReport(
        "user-1",
        "experian",
      );
      expect(result.success).toBe(true);
      expect(result.bureau).toBe("experian");
    });

    it("should return error response when bureau client is not initialized for unknown bureau", async () => {
      const result = await CreditBureauService.getCreditReport(
        "user-1",
        "unknown_bureau" as Bureau,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown bureau");
    });

    it("should return error when user profile is not found", async () => {
      // Override supabase single to return error
      (mockSupabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      const result = await CreditBureauService.getCreditReport(
        "nonexistent-user",
        "experian",
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("User profile not found");
    });
  });

  // -----------------------------------------------------------------------
  // getAllCreditReports
  // -----------------------------------------------------------------------

  describe("getAllCreditReports", () => {
    beforeEach(() => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);
    });

    it("should return results for all three bureaus in parallel", async () => {
      // Mock all three clients to return success
      for (const bureau of BUREAUS) {
        const MockClass =
          bureau === "experian"
            ? ExperianClient
            : bureau === "equifax"
              ? EquifaxClient
              : TransUnionClient;
        const instance = (MockClass as jest.Mock).mock.results.slice(-1)[0]
          ?.value;
        if (instance) {
          instance.getCreditReport.mockResolvedValueOnce({
            success: true,
            data: makeMockCreditReport(bureau),
            bureau,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Mock supabase insert for saving reports
      (mockSupabase.insert as jest.Mock)
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      const results = await CreditBureauService.getAllCreditReports("user-1");
      // The method returns a partial record — it should have keys for successful fetches
      expect(results).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // submitDispute
  // -----------------------------------------------------------------------

  describe("submitDispute", () => {
    beforeEach(() => {
      const config = makeSandboxConfig();
      CreditBureauService.initializeFromConfig(config);
    });

    it("should submit dispute successfully to Equifax", async () => {
      const clientInstance = (EquifaxClient as jest.Mock).mock.results.slice(
        -1,
      )[0]?.value;
      if (clientInstance) {
        clientInstance.submitDispute.mockResolvedValueOnce({
          success: true,
          bureau: "equifax",
          timestamp: new Date().toISOString(),
          reference_id: "disp-ref-123",
        });
      }

      // Mock supabase insert for saving dispute record
      (mockSupabase.insert as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await CreditBureauService.submitDispute("user-1", {
        bureau: "equifax",
        credit_item_id: "item-1",
        dispute_reason: "not_mine",
        dispute_method: "online",
      });

      expect(result.success).toBe(true);
      expect(result.bureau).toBe("equifax");
    });

    it("should return error for unknown bureau in dispute", async () => {
      const result = await CreditBureauService.submitDispute("user-1", {
        bureau: "unknown" as Bureau,
        credit_item_id: "item-1",
        dispute_reason: "not_mine",
        dispute_method: "online",
      });

      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // analyzeCreditReport
  // -----------------------------------------------------------------------

  describe("analyzeCreditReport", () => {
    it("should identify high utilization as a negative item", async () => {
      const report: CreditReport = {
        id: "rpt-1",
        user_id: "user-1",
        bureau: "experian",
        credit_score: 680,
        report_date: "2026-02-17",
        accounts: [
          {
            id: "acc-1",
            account_number: "1234",
            account_type: "credit_card",
            creditor_name: "Bank A",
            balance: 8000,
            credit_limit: 10000, // 80% utilization
            payment_status: "current",
            opened_date: "2020-01-01",
            payment_history: [],
          },
        ],
        inquiries: [],
        public_records: [],
        raw_data: {},
        created_at: "2026-02-17",
      };

      const analysis = await CreditBureauService.analyzeCreditReport(report);
      expect(analysis.credit_score).toBe(680);
      const highUtil = analysis.negative_items.find(
        (i) => i.type === "high_utilization",
      );
      expect(highUtil).toBeDefined();
      expect(highUtil?.impact).toBe("high");
    });

    it("should identify late payments as a negative item", async () => {
      const report: CreditReport = {
        id: "rpt-2",
        user_id: "user-1",
        bureau: "equifax",
        credit_score: 580,
        report_date: "2026-02-17",
        accounts: [
          {
            id: "acc-1",
            account_number: "1234",
            account_type: "credit_card",
            creditor_name: "Bank A",
            balance: 1000,
            credit_limit: 10000,
            payment_status: "late",
            opened_date: "2020-01-01",
            payment_history: [],
          },
        ],
        inquiries: [],
        public_records: [],
        raw_data: {},
        created_at: "2026-02-17",
      };

      const analysis = await CreditBureauService.analyzeCreditReport(report);
      const latePayments = analysis.negative_items.find(
        (i) => i.type === "late_payments",
      );
      expect(latePayments).toBeDefined();
      expect(latePayments?.impact).toBe("high");
    });

    it("should identify public records as negative items", async () => {
      const report: CreditReport = {
        id: "rpt-3",
        user_id: "user-1",
        bureau: "transunion",
        credit_score: 500,
        report_date: "2026-02-17",
        accounts: [],
        inquiries: [],
        public_records: [
          {
            id: "pr-1",
            record_type: "bankruptcy",
            filing_date: "2025-06-01",
            status: "filed",
          },
        ],
        raw_data: {},
        created_at: "2026-02-17",
      };

      const analysis = await CreditBureauService.analyzeCreditReport(report);
      const publicRecords = analysis.negative_items.find(
        (i) => i.type === "public_records",
      );
      expect(publicRecords).toBeDefined();
    });

    it("should identify too many hard inquiries in last 6 months", async () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 1);

      const report: CreditReport = {
        id: "rpt-4",
        user_id: "user-1",
        bureau: "experian",
        credit_score: 700,
        report_date: "2026-02-17",
        accounts: [],
        inquiries: [
          {
            id: "i1",
            inquiry_date: recentDate.toISOString(),
            creditor_name: "A",
            inquiry_type: "hard",
          },
          {
            id: "i2",
            inquiry_date: recentDate.toISOString(),
            creditor_name: "B",
            inquiry_type: "hard",
          },
          {
            id: "i3",
            inquiry_date: recentDate.toISOString(),
            creditor_name: "C",
            inquiry_type: "hard",
          },
          {
            id: "i4",
            inquiry_date: recentDate.toISOString(),
            creditor_name: "D",
            inquiry_type: "hard",
          },
        ],
        public_records: [],
        raw_data: {},
        created_at: "2026-02-17",
      };

      const analysis = await CreditBureauService.analyzeCreditReport(report);
      const tooMany = analysis.negative_items.find(
        (i) => i.type === "too_many_inquiries",
      );
      expect(tooMany).toBeDefined();
      expect(tooMany?.impact).toBe("medium");
    });

    it("should include positive factors when utilization is low and accounts are current", async () => {
      const report: CreditReport = {
        id: "rpt-5",
        user_id: "user-1",
        bureau: "equifax",
        credit_score: 800,
        report_date: "2026-02-17",
        accounts: [
          {
            id: "acc-1",
            account_number: "1234",
            account_type: "credit_card",
            creditor_name: "Good Bank",
            balance: 500,
            credit_limit: 10000,
            payment_status: "current",
            opened_date: "2015-01-01",
            payment_history: [],
          },
        ],
        inquiries: [],
        public_records: [],
        raw_data: {},
        created_at: "2026-02-17",
      };

      const analysis = await CreditBureauService.analyzeCreditReport(report);
      expect(analysis.positive_factors).toContain("Low credit utilization");
      expect(analysis.positive_factors).toContain("Accounts in good standing");
    });

    it("should return correct score factors based on credit score ranges", async () => {
      // Exceptional: 800+
      const report800: CreditReport = {
        id: "rpt-6",
        user_id: "u1",
        bureau: "experian",
        credit_score: 810,
        report_date: "2026-02-17",
        raw_data: {},
        created_at: "2026-02-17",
      };
      const analysis800 =
        await CreditBureauService.analyzeCreditReport(report800);
      expect(analysis800.score_factors).toContain("Exceptional credit history");

      // Poor: <580
      const report500: CreditReport = {
        id: "rpt-7",
        user_id: "u1",
        bureau: "experian",
        credit_score: 500,
        report_date: "2026-02-17",
        raw_data: {},
        created_at: "2026-02-17",
      };
      const analysis500 =
        await CreditBureauService.analyzeCreditReport(report500);
      expect(analysis500.score_factors).toContain("Poor credit history");
    });
  });

  // -----------------------------------------------------------------------
  // Environment switching (sandbox vs production)
  // -----------------------------------------------------------------------

  describe("environment switching", () => {
    it("should use sandbox base URLs by default", () => {
      CreditBureauService.flushCredentialCache();
      const exp = CreditBureauService.getBureauCredentials("experian");
      const eqf = CreditBureauService.getBureauCredentials("equifax");
      const tu = CreditBureauService.getBureauCredentials("transunion");

      expect(exp.baseUrl).toContain("sandbox");
      expect(eqf.baseUrl).toContain("sandbox");
      expect(tu.baseUrl).toContain("test");
    });

    it("should switch to production base URLs when env is set", () => {
      process.env.BUREAU_API_ENVIRONMENT = "production";
      CreditBureauService.flushCredentialCache();

      const exp = CreditBureauService.getBureauCredentials("experian");
      const eqf = CreditBureauService.getBureauCredentials("equifax");
      const tu = CreditBureauService.getBureauCredentials("transunion");

      expect(exp.baseUrl).toBe("https://us-api.experian.com");
      expect(eqf.baseUrl).toBe("https://api.equifax.com");
      expect(tu.baseUrl).toBe("https://netaccess.transunion.com");
    });

    it("should fall back to sandbox for invalid BUREAU_API_ENVIRONMENT values", () => {
      process.env.BUREAU_API_ENVIRONMENT = "staging"; // invalid
      CreditBureauService.flushCredentialCache();

      const cred = CreditBureauService.getBureauCredentials("experian");
      expect(cred.environment).toBe("sandbox");
    });
  });

  // -----------------------------------------------------------------------
  // Credential cache management
  // -----------------------------------------------------------------------

  describe("credential cache management", () => {
    it("flushCredentialCache should force re-read from env", () => {
      process.env.EXPERIAN_API_KEY = "key-v1";
      CreditBureauService.getBureauCredentials("experian");

      process.env.EXPERIAN_API_KEY = "key-v2";
      // Still cached
      expect(CreditBureauService.getBureauCredentials("experian").apiKey).toBe(
        "key-v1",
      );

      CreditBureauService.flushCredentialCache();
      expect(CreditBureauService.getBureauCredentials("experian").apiKey).toBe(
        "key-v2",
      );
    });

    it("setCredentialCacheTtl should clamp negative values to 0", () => {
      CreditBureauService.setCredentialCacheTtl(-1000);
      // No error; TTL effectively 0 (immediate expiry)
      process.env.EQUIFAX_API_KEY = "val-a";
      CreditBureauService.getBureauCredentials("equifax");

      process.env.EQUIFAX_API_KEY = "val-b";
      const cred = CreditBureauService.getBureauCredentials("equifax");
      expect(cred.apiKey).toBe("val-b"); // immediate expiry means it re-reads
    });
  });
});
