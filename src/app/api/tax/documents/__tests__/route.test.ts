/**
 * Negative-auth tests for /api/tax/documents (TASK-AUTH-03f)
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
jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: (...args: unknown[]) => mockSingle(...args),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

import { GET, DELETE } from "../route";

function createMockRequest(method = "GET", search = ""): NextRequest {
  const url = `http://localhost:3000/api/tax/documents${search}`;
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    headers: new Headers(),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("negative-auth – /api/tax/documents", () => {
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
    const res = await DELETE(createMockRequest("DELETE", "?id=doc-1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 403 (IDOR) when deleting another user's document", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "doc-1", user_id: "victim-1", storage_path: null },
      error: null,
    });
    const res = await DELETE(createMockRequest("DELETE", "?id=doc-1"));
    expect(res.status).toBe(403);
  });
});
