/**
 * @jest-environment node
 *
 * Integration tests for POST /api/auth/webauthn/register.
 * Route wrapped in withAuth (TASK-AUTH-03f); auth resolves via
 * jwtValidation.validateFromHeaders + resolveRoleFromDb. DB access uses a
 * service-role supabase client, every query scoped to the authed user id.
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockCredEq = jest.fn().mockResolvedValue({ data: [], error: null });
const mockCredSelect = jest.fn().mockReturnValue({ eq: mockCredEq });
const mockFrom = jest.fn();

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) =>
      mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { POST } from "../register/route";

const fakeUser = { id: "user-webauthn-1", email: "user@example.com" };

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  const url = "http://localhost:3000/api/auth/webauthn/register";
  return {
    url,
    method: "POST",
    headers: new Headers(),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/auth/webauthn/register", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    mockValidateFromHeaders.mockResolvedValue({ valid: true, user: fakeUser });
    mockResolveRoleFromDb.mockResolvedValue("user");

    mockCredEq.mockResolvedValue({ data: [], error: null });
    mockCredSelect.mockReturnValue({ eq: mockCredEq });
    mockUpsert.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "webauthn_credentials") return { select: mockCredSelect };
      if (table === "webauthn_challenges") return { upsert: mockUpsert };
      return { select: mockCredSelect };
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });

  describe("negative-auth", () => {
    it("returns 401 when the request is not authenticated", async () => {
      mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  it("returns 200 with WebAuthn registration options for authenticated user", async () => {
    const res = await POST(
      makeRequest({ authenticatorType: "platform", credentialName: "MacBook" }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.options).toBeDefined();
    expect(json.options.challenge).toBeDefined();
    expect(json.options.rp.name).toBe("Fynvita");
    expect(json.options.user.name).toBe(fakeUser.email);
    expect(json.options.authenticatorSelection.authenticatorAttachment).toBe(
      "platform",
    );
    expect(json.credentialName).toBe("MacBook");
    expect(mockUpsert).toHaveBeenCalled();
  });

  it("sets cross-platform attachment when authenticatorType=cross-platform", async () => {
    const res = await POST(makeRequest({ authenticatorType: "cross-platform" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.options.authenticatorSelection.authenticatorAttachment).toBe(
      "cross-platform",
    );
  });

  it("returns 500 when the challenge upsert throws", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "webauthn_credentials") return { select: mockCredSelect };
      if (table === "webauthn_challenges")
        return {
          upsert: jest.fn().mockRejectedValue(new Error("DB write failed")),
        };
      return { select: mockCredSelect };
    });
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed to start registration/i);
  });
});
