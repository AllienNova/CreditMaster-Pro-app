/**
 * Negative-auth tests for /api/chat/financial (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockSingle = jest.fn();

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
  createClient: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: (...args: unknown[]) => mockSingle(...args),
          }),
        }),
      }),
    }),
}));
jest.mock("@/lib/ai/financial-chat-engine", () => ({
  FinancialChatEngine: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
  })),
}));

import { POST } from "../route";

function createMockRequest(body: unknown): NextRequest {
  const url = "http://localhost:3000/api/chat/financial";
  return {
    url,
    method: "POST",
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/chat/financial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "attacker-1", email: "attacker@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("POST returns 401 when the request is not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(
      createMockRequest({ sessionId: "s-1", message: "hi" }),
    );
    expect(res.status).toBe(401);
  });

  it("POST returns 403 (IDOR) when posting to another user's session", async () => {
    mockSingle.mockResolvedValue({
      data: { user_id: "victim-1" },
      error: null,
    });
    const res = await POST(
      createMockRequest({ sessionId: "victim-session", message: "hi" }),
    );
    expect(res.status).toBe(403);
  });
});
