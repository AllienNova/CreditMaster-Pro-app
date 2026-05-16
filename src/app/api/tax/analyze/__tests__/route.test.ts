/**
 * Negative-auth tests for /api/tax/analyze (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({}),
}));
jest.mock("@/lib/tax", () => ({
  taxOptimizationEngine: {
    analyzeAndRecommend: jest.fn(),
    getDisclaimers: jest.fn(),
  },
}));

import { POST } from "../route";

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/tax/analyze";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/tax/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    const res = await POST(createMockRequest());
    expect(res.status).toBe(401);
  });
});
