/**
 * Negative-auth tests for /api/chat/financial/sessions/[id] (TASK-AUTH-03f)
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
// supabaseAdmin, not createClient. The ownership read used the cookie-scoped
// client while chat_sessions is under RLS with `auth.uid() = user_id`, so it
// 404'd every real session for a bearer-token caller — see
// src/lib/ai/chat-session-access.ts. These negative-auth cases assert the same
// 403 as before; only the client behind them changed.
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: (...args: unknown[]) => mockSingle(...args),
        }),
      }),
    }),
  },
}));
jest.mock("@/lib/ai/financial-chat-engine", () => ({
  FinancialChatEngine: jest.fn().mockImplementation(() => ({
    deleteSession: jest.fn(),
  })),
}));

import { GET, DELETE } from "../route";

const VICTIM_SESSION = "11111111-1111-1111-1111-111111111111";

function createMockRequest(method = "GET"): NextRequest {
  const url = `http://localhost:3000/api/chat/financial/sessions/${VICTIM_SESSION}`;
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/chat/financial/sessions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "attacker-1", email: "attacker@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("GET returns 401 when the request is not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 401 when the request is not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await DELETE(createMockRequest("DELETE"));
    expect(res.status).toBe(401);
  });

  it("GET returns 403 (IDOR) when reading another user's session", async () => {
    mockSingle.mockResolvedValue({
      data: { id: VICTIM_SESSION, user_id: "victim-1" },
      error: null,
    });
    const res = await GET(createMockRequest("GET"));
    expect(res.status).toBe(403);
  });

  it("DELETE returns 403 (IDOR) when deleting another user's session", async () => {
    mockSingle.mockResolvedValue({
      data: { user_id: "victim-1" },
      error: null,
    });
    const res = await DELETE(createMockRequest("DELETE"));
    expect(res.status).toBe(403);
  });
});
