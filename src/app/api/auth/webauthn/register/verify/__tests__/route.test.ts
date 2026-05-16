/**
 * Negative-auth tests for /api/auth/webauthn/register/verify (TASK-AUTH-03f)
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({})) }));

import { POST } from "../route";

function createMockRequest(method = "POST"): NextRequest {
  const url = "http://localhost:3000/api/auth/webauthn/register/verify";
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue({}),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("negative-auth – /api/auth/webauthn/register/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
  });

  it("POST returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest("POST"));
    expect(res.status).toBe(401);
  });

});
