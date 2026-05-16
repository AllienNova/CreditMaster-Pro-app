/**
 * Negative-auth tests for /api/ai/financial-coach/goals/[goalId] (TASK-AUTH-03f)
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
  goalPlanner: {
    getUserGoals: jest.fn(),
    getAdjustmentSuggestions: jest.fn(),
    updateGoalProgress: jest.fn(),
  },
}));

import { GET, PATCH } from "../route";

function createMockRequest(method = "GET"): NextRequest {
  const url = "http://localhost:3000/api/ai/financial-coach/goals/goal-123";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/financial-coach/goals/[goalId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 401 when the request is not authenticated", async () => {
    const res = await PATCH(createMockRequest("PATCH"));
    expect(res.status).toBe(401);
  });
});
