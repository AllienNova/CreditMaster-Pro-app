/**
 * Tests for the /api/privacy/* shared audit-logging helper.
 *
 * The route test files mock this module entirely (to assert call sites
 * without touching Supabase), so the REAL implementation here had zero
 * coverage until this file. Exercises writeAuditLog's success/DB-error/
 * thrown-exception paths and getClientIp's header fallback chain directly.
 */

import { NextRequest } from "next/server";

const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { writeAuditLog, getClientIp } from "../audit";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe("getClientIp", () => {
  it("prefers x-forwarded-for when present", () => {
    const req = makeRequest({ "x-forwarded-for": "203.0.113.1", "x-real-ip": "198.51.100.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "198.51.100.1" });
    expect(getClientIp(req)).toBe("198.51.100.1");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const req = makeRequest();
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("writeAuditLog", () => {
  const originalEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // jest.config.js sets BOTH `resetMocks: true` (wipes every jest.fn()'s
    // implementation before each test) AND `restoreMocks: true` (fully
    // un-spies jest.spyOn targets, detaching the reference from the real
    // method it replaced). A `jest.spyOn` created once at describe-scope is
    // restored to the native console.error before test #2 even runs, so it
    // must be re-created fresh here every test, not just re-implemented.
    // See feedback_jest-resetmocks-and-postgrest-errors.md.
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    mockFrom.mockImplementation(() => ({ insert: mockInsert }));
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    };
    mockInsert.mockResolvedValue({ error: null });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("inserts the expected row shape on the happy path, with resource_type always set", async () => {
    const req = makeRequest({ "x-forwarded-for": "203.0.113.1", "user-agent": "TestAgent/1.0" });

    await writeAuditLog({
      userId: "user-1",
      action: "gdpr_export_completed",
      resourceType: "user_data_export",
      request: req,
      details: { format: "json" },
    });

    expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        action: "gdpr_export_completed",
        resource_type: "user_data_export",
        details: { format: "json" },
        ip_address: "203.0.113.1",
        user_agent: "TestAgent/1.0",
      }),
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("writes details:null when no details are supplied", async () => {
    await writeAuditLog({
      userId: "user-1",
      action: "gdpr_erasure_api_requested",
      resourceType: "user_account",
      request: makeRequest(),
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ details: null }),
    );
  });

  it("logs to console.error but does not throw when the insert returns a DB error", async () => {
    mockInsert.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      writeAuditLog({
        userId: "user-1",
        action: "gdpr_export_failed",
        resourceType: "user_data_export",
        request: makeRequest(),
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[privacy-audit] failed to persist audit event",
      expect.objectContaining({ action: "gdpr_export_failed", code: "42501" }),
    );
  });

  it("logs to console.error but does not throw when the client construction/insert throws", async () => {
    mockInsert.mockRejectedValue(new Error("network unreachable"));

    await expect(
      writeAuditLog({
        userId: "user-1",
        action: "gdpr_erasure_api_failed",
        resourceType: "user_account",
        request: makeRequest(),
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[privacy-audit] unexpected error persisting audit event",
      expect.objectContaining({
        action: "gdpr_erasure_api_failed",
        error: "network unreachable",
      }),
    );
  });
});
