/**
 * Tests for GET /api/privacy/export (GDPR Art. 15/20, CCPA §1798.100/110)
 *
 * Coverage:
 * - Authentication (401)
 * - IDOR closure: the export always targets the authenticated user, never a
 *   client-supplied id, even when one is present in the query string
 *   (mirrors the FND-041..044 notifications IDOR class this route must not
 *   repeat)
 * - Rate limiting (429)
 * - Query validation (400)
 * - Honest failure: a failing export is never reported as success (500/501)
 * - Audit logging on both outcomes
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockExportUserData = jest.fn();
const mockCheck = jest.fn();
const mockWriteAuditLog = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/compliance/gdpr-ccpa", () => ({
  gdprService: { exportUserData: (...args: unknown[]) => mockExportUserData(...args) },
}));
jest.mock("@/lib/security/redis-rate-limiting", () => ({
  rateLimit: jest.fn(() => ({ check: (...args: unknown[]) => mockCheck(...args) })),
}));
jest.mock("../../_lib/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
  getClientIp: jest.fn(() => "unknown"),
}));

import { GET } from "../route";

const mockUser = { id: "user-123", email: "user@example.com" };

function createMockRequest(url: string): NextRequest {
  return {
    url,
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

const mockExportResult = {
  userId: mockUser.id,
  exportDate: new Date("2026-07-31T00:00:00Z"),
  format: "json",
  data: {
    profile: { id: mockUser.id, email: mockUser.email },
    creditReports: [],
    disputes: [],
    aiInteractions: [],
    logs: [],
  },
};

describe("GET /api/privacy/export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockCheck.mockResolvedValue(undefined);
    mockExportUserData.mockResolvedValue(mockExportResult);
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  describe("negative-auth", () => {
    it("returns 401 when unauthenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const res = await GET(createMockRequest("http://localhost:3000/api/privacy/export"));

      expect(res.status).toBe(401);
      expect(mockExportUserData).not.toHaveBeenCalled();
    });
  });

  it("returns the authenticated caller's export on the happy path", async () => {
    const res = await GET(createMockRequest("http://localhost:3000/api/privacy/export"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ userId: mockUser.id });
    expect(mockExportUserData).toHaveBeenCalledWith(mockUser.id, "json");
  });

  it("defaults to json format when no format query param is supplied", async () => {
    await GET(createMockRequest("http://localhost:3000/api/privacy/export"));
    expect(mockExportUserData).toHaveBeenCalledWith(mockUser.id, "json");
  });

  it("passes through a valid explicit format", async () => {
    await GET(createMockRequest("http://localhost:3000/api/privacy/export?format=xml"));
    expect(mockExportUserData).toHaveBeenCalledWith(mockUser.id, "xml");
  });

  it("IDOR: ignores a client-supplied userId and always exports the authenticated caller's data", async () => {
    const res = await GET(
      createMockRequest(
        "http://localhost:3000/api/privacy/export?userId=victim-user-id&format=json",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockExportUserData).toHaveBeenCalledTimes(1);
    expect(mockExportUserData).toHaveBeenCalledWith(mockUser.id, "json");
    expect(mockExportUserData).not.toHaveBeenCalledWith(
      "victim-user-id",
      expect.anything(),
    );
    expect(body.data.userId).toBe(mockUser.id);
  });

  it("returns 400 for an invalid format value", async () => {
    const res = await GET(
      createMockRequest("http://localhost:3000/api/privacy/export?format=pdf"),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
    expect(mockExportUserData).not.toHaveBeenCalled();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    mockCheck.mockRejectedValue(new Error("Rate limit exceeded"));

    const res = await GET(createMockRequest("http://localhost:3000/api/privacy/export"));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("Too Many Requests");
    expect(mockExportUserData).not.toHaveBeenCalled();
  });

  it("returns 501 (not 500) when the service reports an unimplemented format", async () => {
    mockExportUserData.mockRejectedValue(
      new Error(
        "GDPR Art. 20 CSV export is not yet implemented. Use format='json' until a compliant CSV serialiser is added.",
      ),
    );

    const res = await GET(
      createMockRequest("http://localhost:3000/api/privacy/export?format=csv"),
    );
    const body = await res.json();

    expect(res.status).toBe(501);
    expect(body.success).toBe(false);
  });

  it("honest failure: a failing export never reports success", async () => {
    mockExportUserData.mockRejectedValue(new Error("connection reset"));

    const res = await GET(createMockRequest("http://localhost:3000/api/privacy/export"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).not.toHaveProperty("success", true);
  });

  it("writes an audit log entry on a successful export", async () => {
    await GET(createMockRequest("http://localhost:3000/api/privacy/export"));

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "gdpr_export_completed",
      }),
    );
  });

  it("writes an audit log entry on a failed export", async () => {
    mockExportUserData.mockRejectedValue(new Error("connection reset"));

    await GET(createMockRequest("http://localhost:3000/api/privacy/export"));

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "gdpr_export_failed",
      }),
    );
  });
});
