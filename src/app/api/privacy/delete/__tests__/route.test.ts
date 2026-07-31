/**
 * Tests for POST /api/privacy/delete (GDPR Art. 17, CCPA §1798.105)
 *
 * Coverage:
 * - Authentication (401)
 * - Confirmation gate: missing/wrong confirm token rejected (400), a bare
 *   POST with no body never triggers erasure
 * - IDOR closure: erasure always targets the authenticated user, never a
 *   client-supplied id
 * - Rate limiting (429)
 * - Honest failure: a failed erasure (service returns status!=="completed")
 *   is NEVER reported as success — this is the exact defect class
 *   (`{success:true}` on a failed operation) this route must not repeat
 * - Audit logging on request, success, and failure
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockDeleteUserData = jest.fn();
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
  gdprService: { deleteUserData: (...args: unknown[]) => mockDeleteUserData(...args) },
}));
jest.mock("@/lib/security/redis-rate-limiting", () => ({
  rateLimit: jest.fn(() => ({ check: (...args: unknown[]) => mockCheck(...args) })),
}));
jest.mock("../../_lib/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
  getClientIp: jest.fn(() => "unknown"),
}));

import { POST } from "../route";

const mockUser = { id: "user-123", email: "user@example.com" };

function createMockRequest(body?: unknown): NextRequest {
  return {
    url: "http://localhost:3000/api/privacy/delete",
    method: "POST",
    json: jest.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    nextUrl: new URL("http://localhost:3000/api/privacy/delete"),
  } as unknown as NextRequest;
}

const completedResult = {
  userId: mockUser.id,
  requestDate: new Date("2026-07-31T00:00:00Z"),
  status: "completed" as const,
  completionDate: new Date("2026-07-31T00:00:01Z"),
};

describe("POST /api/privacy/delete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: mockUser });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockCheck.mockResolvedValue(undefined);
    mockDeleteUserData.mockResolvedValue(completedResult);
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  describe("negative-auth", () => {
    it("returns 401 when unauthenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });

      const res = await POST(createMockRequest({ confirm: "DELETE" }));

      expect(res.status).toBe(401);
      expect(mockDeleteUserData).not.toHaveBeenCalled();
    });
  });

  describe("confirmation gate", () => {
    it("rejects a bare POST with no confirm field — erasure never fires", async () => {
      const res = await POST(createMockRequest({}));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(mockDeleteUserData).not.toHaveBeenCalled();
      expect(body.error).toContain("confirm");
    });

    it("rejects a non-exact confirm value", async () => {
      const res = await POST(createMockRequest({ confirm: "delete" }));

      expect(res.status).toBe(400);
      expect(mockDeleteUserData).not.toHaveBeenCalled();
    });

    it("rejects invalid JSON bodies", async () => {
      const req = {
        url: "http://localhost:3000/api/privacy/delete",
        method: "POST",
        json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
        headers: new Headers(),
        nextUrl: new URL("http://localhost:3000/api/privacy/delete"),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(mockDeleteUserData).not.toHaveBeenCalled();
    });

    it("accepts the exact confirmation token and proceeds", async () => {
      const res = await POST(createMockRequest({ confirm: "DELETE" }));
      expect(res.status).toBe(200);
      expect(mockDeleteUserData).toHaveBeenCalledTimes(1);
    });
  });

  it("IDOR: ignores a client-supplied userId and always erases the authenticated caller", async () => {
    const res = await POST(
      createMockRequest({ confirm: "DELETE", userId: "victim-user-id" }),
    );

    expect(res.status).toBe(200);
    expect(mockDeleteUserData).toHaveBeenCalledTimes(1);
    expect(mockDeleteUserData).toHaveBeenCalledWith(mockUser.id, undefined);
    expect(mockDeleteUserData).not.toHaveBeenCalledWith(
      "victim-user-id",
      expect.anything(),
    );
  });

  it("passes an optional reason through to the service", async () => {
    await POST(createMockRequest({ confirm: "DELETE", reason: "no longer using the app" }));
    expect(mockDeleteUserData).toHaveBeenCalledWith(mockUser.id, "no longer using the app");
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    mockCheck.mockRejectedValue(new Error("Rate limit exceeded"));

    const res = await POST(createMockRequest({ confirm: "DELETE" }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("Too Many Requests");
    expect(mockDeleteUserData).not.toHaveBeenCalled();
  });

  it("returns success:true with completionDate when the service reports status=completed", async () => {
    const res = await POST(createMockRequest({ confirm: "DELETE" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("completed");
    expect(body.completionDate).toBeDefined();
  });

  it("honest failure: status=failed from the service is NEVER reported as success", async () => {
    mockDeleteUserData.mockResolvedValue({
      userId: mockUser.id,
      requestDate: new Date(),
      status: "failed",
      error: "Cascade delete failed: DB constraint violation",
    });

    const res = await POST(createMockRequest({ confirm: "DELETE" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body).not.toHaveProperty("success", true);
    expect(body.detail).toContain("Cascade delete failed");
  });

  it("honest failure: an unexpected throw from the service is never reported as success", async () => {
    mockDeleteUserData.mockRejectedValue(new Error("network timeout"));

    const res = await POST(createMockRequest({ confirm: "DELETE" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it("logs the request before calling the service, and a completed outcome after", async () => {
    await POST(createMockRequest({ confirm: "DELETE" }));

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "gdpr_erasure_api_requested",
      }),
    );
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "gdpr_erasure_api_completed",
      }),
    );
  });

  it("logs a failed outcome when the service reports status=failed", async () => {
    mockDeleteUserData.mockResolvedValue({
      userId: mockUser.id,
      requestDate: new Date(),
      status: "failed",
      error: "Cascade delete failed: DB constraint violation",
    });

    await POST(createMockRequest({ confirm: "DELETE" }));

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        action: "gdpr_erasure_api_failed",
      }),
    );
  });
});
