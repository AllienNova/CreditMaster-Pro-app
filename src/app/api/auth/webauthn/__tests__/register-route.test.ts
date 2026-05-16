/**
 * @jest-environment node
 *
 * Integration tests for POST /api/auth/webauthn/register
 * Covers: (a) missing env config → 500, (b) no cookie → 401,
 * (c) invalid session → 401, (d) valid auth → 200 with options,
 * (e) supabase error on challenge upsert → 500.
 */

import { NextRequest } from "next/server";

// ── Shared mock state — defined before jest.mock factories ────────────────────
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockCredEq = jest.fn().mockResolvedValue({ data: [], error: null });
const mockCredSelect = jest.fn().mockReturnValue({ eq: mockCredEq });
const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockCookieGet = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() =>
    Promise.resolve({ get: mockCookieGet }),
  ),
}));

import { POST } from "../register/route";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const fakeUser = {
  id: "user-webauthn-1",
  email: "user@example.com",
  user_metadata: { name: "Test User" },
};

describe("POST /api/auth/webauthn/register", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Re-wire after clearAllMocks
    const { createClient } = jest.requireMock("@supabase/supabase-js") as {
      createClient: jest.Mock;
    };
    createClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });

    const { cookies } = jest.requireMock("next/headers") as {
      cookies: jest.Mock;
    };
    cookies.mockResolvedValue({ get: mockCookieGet });

    // Default: valid cookie
    mockCookieGet.mockImplementation((key: string) =>
      key === "sb-access-token" ? { value: "valid-access-token" } : undefined,
    );

    // Default: valid user
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    // Default: no existing credentials
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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
  });

  // ── (a) Missing env → 500 ──────────────────────────────────────────────────
  it("returns 500 when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/server configuration error/i);
  });

  // ── (b) No cookie → 401 ────────────────────────────────────────────────────
  it("returns 401 when sb-access-token cookie is absent", async () => {
    mockCookieGet.mockReturnValue(undefined);
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── (c) Invalid session → 401 ─────────────────────────────────────────────
  it("returns 401 when supabase.auth.getUser returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toMatch(/invalid session/i);
  });

  // ── (d) Valid auth → 200 with registration options ─────────────────────────
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
    expect(json.options.authenticatorSelection.authenticatorAttachment).toBe("platform");
    expect(json.credentialName).toBe("MacBook");
    expect(mockUpsert).toHaveBeenCalled();
  });

  // ── (d) cross-platform attachment ─────────────────────────────────────────
  it("sets cross-platform attachment when authenticatorType=cross-platform", async () => {
    const res = await POST(makeRequest({ authenticatorType: "cross-platform" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.options.authenticatorSelection.authenticatorAttachment).toBe(
      "cross-platform",
    );
  });

  // ── (e) Challenge upsert throws → 500 ─────────────────────────────────────
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
