/**
 * Negative-auth tests for /api/chat/financial/sessions/[id]/messages (TASK-AUTH-03f)
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
// The ownership read moved from createClient() (cookie-scoped, and therefore
// blind to a bearer-token caller under RLS) to supabaseAdmin with the ownership
// comparison done in code. These negative-auth cases are unchanged by that —
// they assert the same 403 for the same reason — but the mock has to follow.
jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: (...args: unknown[]) => mockSingle(...args),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        }),
      }),
    }),
  },
}));
jest.mock("@/lib/ai/financial-chat-engine", () => ({
  FinancialChatEngine: jest.fn().mockImplementation(() => ({
    getSessionHistory: jest.fn(),
  })),
}));

import { GET } from "../route";

const VICTIM_SESSION = "11111111-1111-1111-1111-111111111111";

function createMockRequest(): NextRequest {
  const url = `http://localhost:3000/api/chat/financial/sessions/${VICTIM_SESSION}/messages`;
  return {
    url,
    method: "GET",
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/chat/financial/sessions/[id]/messages", () => {
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
    const res = await GET(createMockRequest());
    expect(res.status).toBe(401);
  });

  it("GET returns 403 (IDOR) when reading another user's session messages", async () => {
    mockSingle.mockResolvedValue({
      data: { user_id: "victim-1" },
      error: null,
    });
    const res = await GET(createMockRequest());
    expect(res.status).toBe(403);
  });
});
