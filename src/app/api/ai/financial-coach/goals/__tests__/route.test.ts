/**
 * Negative-auth tests for /api/ai/financial-coach/goals (TASK-AUTH-03f)
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
jest.mock("@/lib/financial/goal-planner", () => ({
  goalPlanner: { getUserGoals: jest.fn(), createGoalPlan: jest.fn() },
}));

import { GET, POST } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/ai/financial-coach/goals";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/financial-coach/goals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(401);
  });
});
