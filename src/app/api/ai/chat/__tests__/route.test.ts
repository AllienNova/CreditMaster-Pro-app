/**
 * Negative-auth tests for /api/ai/chat (TASK-AUTH-03f)
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
jest.mock("@/lib/aiml-service", () => ({
  getAIMLService: jest.fn(),
  ChatMessage: class {},
}));
jest.mock("@/lib/credits", () => ({
  creditService: {
    checkSufficientCredits: jest.fn(),
    deductCredits: jest.fn(),
  },
  CREDIT_COSTS: { chat_message: 1 },
}));

import { GET, POST } from "../route";

function createMockRequest(method = "POST"): NextRequest {
  const url = "http://localhost:3000/api/ai/chat";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/chat", () => {
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
