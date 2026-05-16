/**
 * Negative-auth tests for /api/ai/predict-outcomes (TASK-AUTH-03f)
 * Route gated by withPermission("ai:predict_outcomes").
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
  rbac: {
    hasPermission: (...args: unknown[]) => mockHasPermission(...args),
  },
}));
jest.mock("@/lib/student-loan-ai-engine", () => ({
  studentLoanAIEngine: { predictOutcomes: jest.fn() },
}));
jest.mock("@/lib/security/audit-logging", () => ({
  logAIInteraction: jest.fn(),
}));

import { GET, POST } from "../route";

function createMockRequest(method = "POST"): NextRequest {
  const url = "http://localhost:3000/api/ai/predict-outcomes";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/predict-outcomes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockHasPermission.mockReturnValue(true);
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(401);
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("POST returns 403 when the role lacks ai:predict_outcomes", async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(403);
  });

  it("GET returns 403 when the role lacks ai:predict_outcomes", async () => {
    mockHasPermission.mockReturnValue(false);
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(403);
  });
});
