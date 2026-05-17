/**
 * Tests for /api/payment/checkout (TASK-AUTH-03f + TASK-WBH-06)
 *
 * TASK-WBH-06: server-authoritative checkout inputs (FND-019, FND-020, FND-021)
 * - priceId must be validated against SUBSCRIPTION_PLANS
 * - successUrl/cancelUrl are server-built; client values are ignored
 * - trialDays are server-controlled; client values are ignored
 * - 500 errors must not leak raw error.message to client
 */

import { NextRequest } from "next/server";

const mockValidateFromHeaders = jest.fn();
const mockResolveRoleFromDb = jest.fn();
const mockGetUserProfile = jest.fn();
const mockCreateCustomer = jest.fn();
const mockCreateCheckoutSession = jest.fn();

// Supabase mock: plain function (not jest.fn) so clearAllMocks cannot wipe the implementation.
// The route calls getSupabase().from("profiles").update(...).eq(...) — model that chain.
jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
}));

jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: unknown[]) => mockValidateFromHeaders(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: (...args: unknown[]) => mockResolveRoleFromDb(...args),
}));
jest.mock("@/lib/subscriptions/subscription-service", () => ({
  subscriptionService: { getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args) },
}));
jest.mock("@/lib/payment/stripe-service", () => ({
  stripeService: {
    createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
    createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
  },
  SUBSCRIPTION_PLANS: [
    { id: "free",       priceId: "price_free",     price: 0,      name: "Free" },
    { id: "standard",   priceId: "price_standard",  price: 29.99,  name: "Standard" },
    { id: "pro",        priceId: "price_pro",        price: 99.99,  name: "Pro" },
  ],
}));
jest.mock("@/lib/supabase/types", () => ({}));

import { POST } from "../route";

const BASE_URL = "http://localhost:3000";

function createMockRequest(body: Record<string, unknown> = {}, method = "POST"): NextRequest {
  const url = `${BASE_URL}/api/payment/checkout`;
  return {
    url,
    method,
    json: jest.fn().mockResolvedValue(body),
    formData: jest.fn().mockResolvedValue(new Map()),
    headers: new Headers(),
    nextUrl: new URL(url),
    signal: { addEventListener: jest.fn() },
  } as unknown as NextRequest;
}

describe("/api/payment/checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Provide the required env var so happy-path tests reach createCheckoutSession.
    // The misconfiguration test deletes this and restores it in a try/finally.
    process.env.NEXT_PUBLIC_APP_URL = "https://app.fynvita.com";

    mockValidateFromHeaders.mockResolvedValue({
      valid: true,
      user: { id: "user-1", email: "user@example.com" },
    });
    mockResolveRoleFromDb.mockResolvedValue("user");
    mockGetUserProfile.mockResolvedValue({ stripeCustomerId: "cus_existing" });
    mockCreateCheckoutSession.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test" });
  });

  // ── Existing negative-auth test (TASK-AUTH-03f) ─────────────────────────────

  it("POST returns 401 when not authenticated", async () => {
    mockValidateFromHeaders.mockResolvedValue({ valid: false, user: null });
    const res = await POST(createMockRequest({ priceId: "price_standard" }));
    expect(res.status).toBe(401);
  });

  // ── WBH-06: priceId validation (FND-019) ────────────────────────────────────

  it("returns 400 when priceId is missing", async () => {
    const res = await POST(createMockRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when priceId is not in SUBSCRIPTION_PLANS", async () => {
    const res = await POST(createMockRequest({ priceId: "price_evil_injection" }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBeDefined();
  });

  it("accepts a valid priceId that exists in SUBSCRIPTION_PLANS", async () => {
    const res = await POST(createMockRequest({ priceId: "price_standard" }));
    expect(res.status).toBe(200);
  });

  it("accepts the free-tier priceId (price_free)", async () => {
    const res = await POST(createMockRequest({ priceId: "price_free" }));
    expect(res.status).toBe(200);
  });

  // ── WBH-06: server-authoritative URLs (FND-020) ──────────────────────────────
  // Client-supplied successUrl/cancelUrl must be completely ignored.
  // The server must build URLs from its own base — client values must NOT
  // reach createCheckoutSession.

  it("ignores client successUrl — createCheckoutSession receives server-built URL", async () => {
    const clientSuccessUrl = "https://evil.com/steal-tokens";
    await POST(
      createMockRequest({ priceId: "price_standard", successUrl: clientSuccessUrl }),
    );

    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    const [,, actualSuccessUrl] = mockCreateCheckoutSession.mock.calls[0] as [unknown, unknown, string];
    expect(actualSuccessUrl).not.toBe(clientSuccessUrl);
    expect(actualSuccessUrl).not.toContain("evil.com");
  });

  it("ignores client cancelUrl — createCheckoutSession receives server-built URL", async () => {
    const clientCancelUrl = "https://evil.com/redirect";
    await POST(
      createMockRequest({ priceId: "price_standard", cancelUrl: clientCancelUrl }),
    );

    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    const [,,, actualCancelUrl] = mockCreateCheckoutSession.mock.calls[0] as [unknown, unknown, unknown, string];
    expect(actualCancelUrl).not.toBe(clientCancelUrl);
    expect(actualCancelUrl).not.toContain("evil.com");
  });

  it("server-built successUrl contains expected path", async () => {
    await POST(createMockRequest({ priceId: "price_pro" }));

    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    const [,, actualSuccessUrl] = mockCreateCheckoutSession.mock.calls[0] as [unknown, unknown, string];
    expect(actualSuccessUrl).toContain("/payment/success");
  });

  it("server-built cancelUrl contains expected path", async () => {
    await POST(createMockRequest({ priceId: "price_pro" }));

    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    const [,,, actualCancelUrl] = mockCreateCheckoutSession.mock.calls[0] as [unknown, unknown, unknown, string];
    expect(actualCancelUrl).toContain("/pricing");
  });

  // ── WBH-06: trialDays dropped (FND-021) ─────────────────────────────────────
  // Client-supplied trialDays must never reach createCheckoutSession.

  it("ignores client-supplied trialDays — 5th arg to createCheckoutSession is undefined", async () => {
    await POST(
      createMockRequest({ priceId: "price_standard", trialDays: 9999 }),
    );

    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    const callArgs = mockCreateCheckoutSession.mock.calls[0] as unknown[];
    // 5th positional arg (index 4) must not be the client value
    expect(callArgs[4]).not.toBe(9999);
    expect(callArgs[4]).toBeUndefined();
  });

  // ── WBH-06 review Fix 1: NEXT_PUBLIC_APP_URL must be set — no Host-spoofable fallback ──

  it("returns 500 with generic message when NEXT_PUBLIC_APP_URL is unset", async () => {
    const saved = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    try {
      const res = await POST(createMockRequest({ priceId: "price_standard" }));
      expect(res.status).toBe(500);
      const json = await res.json() as { error: string };
      // Generic message only — no env var name, no internal detail leaked to client
      expect(json.error).toBe("Failed to create checkout session");
      expect(json.error).not.toContain("NEXT_PUBLIC_APP_URL");
      // createCheckoutSession must NOT have been called with a Host-derived URL
      expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.NEXT_PUBLIC_APP_URL = saved;
    }
  });

  // ── WBH-06 review Fix 2: priceId must be a string before plan lookup ────────

  it("returns 400 when priceId is a number (not a string)", async () => {
    const res = await POST(createMockRequest({ priceId: 42 }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBeDefined();
  });

  it("returns 400 when priceId is an object (not a string)", async () => {
    const res = await POST(createMockRequest({ priceId: { id: "price_standard" } }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBeDefined();
  });

  // ── WBH-06: no raw error message leak on 500 ────────────────────────────────

  it("does not leak internal error.message in 500 response", async () => {
    const internalError = new Error("DB_CONNECTION_LOST: host=db.internal port=5432");
    mockCreateCheckoutSession.mockRejectedValueOnce(internalError);

    const res = await POST(createMockRequest({ priceId: "price_standard" }));
    expect(res.status).toBe(500);

    const json = await res.json() as { error: string };
    expect(json.error).not.toContain("DB_CONNECTION_LOST");
    expect(json.error).not.toContain("db.internal");
    // Must return a generic message
    expect(json.error).toBeTruthy();
  });

  // ── Happy path: creates new Stripe customer when none exists ─────────────────

  it("creates a Stripe customer when profile has no stripeCustomerId", async () => {
    mockGetUserProfile.mockResolvedValue({ stripeCustomerId: null, fullName: "Test User" });
    mockCreateCustomer.mockResolvedValue({ id: "cus_new" });

    const res = await POST(createMockRequest({ priceId: "price_standard" }));
    expect(res.status).toBe(200);
    expect(mockCreateCustomer).toHaveBeenCalledWith(
      "user@example.com",
      "Test User",
      { userId: "user-1" },
    );
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      "price_standard",
      "cus_new",
      expect.stringContaining("/payment/success"),
      expect.stringContaining("/pricing"),
      undefined,
    );
  });

  it("returns sessionId and url on success", async () => {
    const res = await POST(createMockRequest({ priceId: "price_pro" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { sessionId: string; url: string };
    expect(json.sessionId).toBe("cs_test");
    expect(json.url).toBe("https://checkout.stripe.com/test");
  });
});
