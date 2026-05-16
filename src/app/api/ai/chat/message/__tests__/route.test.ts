/**
 * Negative-auth tests for /api/ai/chat/message (TASK-AUTH-03f)
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
jest.mock("@/lib/ai/chat-engine", () => ({
  getChatEngine: jest.fn(),
}));

import { POST } from "../route";

function createMockRequest(): NextRequest {
  const url = "http://localhost:3000/api/ai/chat/message";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/ai/chat/message", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    const res = await POST(createMockRequest());
    expect(res.status).toBe(401);
  });
});
