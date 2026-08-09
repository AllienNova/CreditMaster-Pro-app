/**
 * Negative-auth tests for /api/disputes/generate-student-loan (TASK-AUTH-03f)
 * Route gated by withPermission("disputes:create").
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockHasPermission = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/auth/rbac", () => ({
  rbac: { hasPermission: (...args: unknown[]) => mockHasPermission(...args) },
}));
jest.mock("@/lib/advanced-dispute-engine", () => ({
  advancedDisputeEngine: { generateStudentLoanDispute: jest.fn() },
}));
jest.mock("@/lib/security/audit-logging", () => ({
  logAIInteraction: jest.fn(),
}));
jest.mock("@/lib/security/input-validation", () => ({
  validateInput: jest.fn(() => ({ isValid: true, errors: [] })),
}));
jest.mock("@/lib/security/output-validation", () => ({
  validateOutput: jest.fn(() => ({ isValid: true, sanitized: "" })),
}));

import { GET, POST } from "../route";

function makeRequest(method = "POST"): NextRequest {
  const url = "http://localhost:3000/api/disputes/generate-student-loan";
  return {
    url,
    method,
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/disputes/generate-student-loan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockHasPermission.mockReturnValue(true);
  });

  it("POST returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await POST(makeRequest("POST"))).status).toBe(401);
  });

  it("GET returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    expect((await GET(makeRequest("GET"))).status).toBe(401);
  });

  it("POST returns 403 when the role lacks disputes:create", async () => {
    mockHasPermission.mockReturnValue(false);
    expect((await POST(makeRequest("POST"))).status).toBe(403);
  });

  it("GET returns 403 when the role lacks disputes:create", async () => {
    mockHasPermission.mockReturnValue(false);
    expect((await GET(makeRequest("GET"))).status).toBe(403);
  });
});
