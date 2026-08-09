/**
 * @jest-environment node
 *
 * Integration tests for POST /api/auth/webauthn/authenticate
 * Covers: (a) missing env → 500, (b) no email body → 200 with anonymous challenge,
 * (c) email provided, user found → allowCredentials populated,
 * (d) email provided, user not found → empty allowCredentials,
 * (e) supabase insert throws → 500.
 */

import { NextRequest } from "next/server";

// ── Shared mock state — must be defined before jest.mock factory runs ─────────
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockCredEq = jest.fn();
const mockCredSelect = jest.fn().mockReturnValue({ eq: mockCredEq });
const mockProfileEq = jest.fn();
const mockProfileLimit = jest.fn();
const mockProfileSelect = jest.fn().mockReturnValue({ eq: mockProfileEq });
const mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { POST } from "../authenticate/route";
import { createClient } from "@supabase/supabase-js";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/auth/webauthn/authenticate", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Re-wire mock after clearAllMocks
    (createClient as jest.Mock).mockReturnValue({ from: mockFrom });

    mockProfileLimit.mockResolvedValue({ data: [], error: null });
    mockProfileEq.mockReturnValue({ limit: mockProfileLimit });
    mockProfileSelect.mockReturnValue({ eq: mockProfileEq });

    mockCredEq.mockResolvedValue({ data: [], error: null });
    mockCredSelect.mockReturnValue({ eq: mockCredEq });

    mockInsert.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { select: mockProfileSelect };
      if (table === "webauthn_credentials") return { select: mockCredSelect };
      if (table === "webauthn_challenges") return { insert: mockInsert };
      return { insert: mockInsert };
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
  });

  // ── (a) Missing env → 500 ──────────────────────────────────────────────────
  it("returns 500 when NEXT_PUBLIC_SUPABASE_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await POST(makeRequest());
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/server configuration error/i);
  });

  // ── (b) No email → anonymous challenge → 200 ─────────────────────────────
  it("returns 200 with challenge and sessionId when no email provided", async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.options.challenge).toBeDefined();
    expect(json.sessionId).toBeDefined();
    expect(json.options.allowCredentials).toBeUndefined();
    expect(mockInsert).toHaveBeenCalled();
  });

  // ── (c) Email + user found → allowCredentials populated ──────────────────
  it("returns 200 with allowCredentials when email matches a user with credentials", async () => {
    const userId = "user-webauthn-99";
    mockProfileLimit.mockResolvedValue({ data: [{ id: userId }], error: null });
    mockCredEq.mockResolvedValue({
      data: [
        { credential_id: "cred-abc", transports: ["internal"] },
        { credential_id: "cred-def", transports: ["hybrid"] },
      ],
      error: null,
    });

    const res = await POST(makeRequest({ email: "alice@example.com" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.options.allowCredentials).toHaveLength(2);
    expect(json.options.allowCredentials[0].id).toBe("cred-abc");
    expect(json.sessionId).toBeUndefined();
  });

  // ── (d) Email provided but user not found → falls back to anonymous ────────
  it("returns 200 with sessionId when email has no matching user", async () => {
    mockProfileLimit.mockResolvedValue({ data: [], error: null });
    const res = await POST(makeRequest({ email: "unknown@example.com" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.options.allowCredentials).toBeUndefined();
    expect(json.sessionId).toBeDefined();
  });

  // ── (e) Insert throws → 500 ───────────────────────────────────────────────
  it("returns 500 when challenge insert throws", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { select: mockProfileSelect };
      if (table === "webauthn_credentials") return { select: mockCredSelect };
      if (table === "webauthn_challenges")
        return { insert: jest.fn().mockRejectedValue(new Error("DB error")) };
      return {};
    });
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/failed to start authentication/i);
  });
});
