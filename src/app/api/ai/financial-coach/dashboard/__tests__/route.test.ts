/**
 * Negative-auth tests for /api/ai/financial-coach/dashboard (TASK-AUTH-03f)
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
jest.mock("@/lib/financial/financial-context-engine", () => ({
  financialContextEngine: { getFinancialContext: jest.fn() },
}));
jest.mock("@/lib/financial/recommendation-engine", () => ({
  recommendationEngine: { generateRecommendations: jest.fn() },
}));
jest.mock("@/lib/financial/goal-planner", () => ({
  goalPlanner: { getUserGoals: jest.fn() },
}));

import { GET } from "../route";

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/ai/financial-coach/dashboard";
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/financial-coach/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const res = await GET(createMockRequest());
    expect(res.status).toBe(401);
  });
});
