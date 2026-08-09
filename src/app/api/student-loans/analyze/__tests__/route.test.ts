/**
 * Negative-auth tests for /api/student-loans/analyze (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockHasPermission = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac", () => ({
  rbac: { hasPermission: (...args: unknown[]) => mockHasPermission(...args) },
}));
jest.mock("@/lib/security/audit-logging", () => ({ logAIInteraction: jest.fn() }));

import { GET, POST } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/student-loans/analyze";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("negative-auth – /api/student-loans/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockHasPermission.mockReturnValue(true);
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(401);
  });

  it("GET returns 403 when the role lacks the required permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(403);
  });

  it("POST returns 403 when the role lacks the required permission", async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(403);
  });

});
