/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock Supabase before importing the module
// NOTE: jest.config has resetMocks:true, so we must re-setup implementations in beforeEach
const mockChain: Record<string, jest.Mock> = {
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  then: jest.fn(),
  catch: jest.fn(),
};

const mockFrom = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: { from: mockFrom },
}));

import {
  checkRateLimit,
  resetRateLimit,
  trackUsage,
  getUsageStats,
  checkCostLimit,
  resetUsageStats,
  rateLimitMiddleware,
  estimateCost,
  RATE_LIMITS,
  COST_ESTIMATES,
  setUserQuota,
  getUserQuota,
  checkUserQuota,
  type RateLimitConfig,
} from "../rate-limiting";

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Re-wire mock chain (resetMocks:true clears implementations between tests)
  mockChain.select.mockReturnThis();
  mockChain.eq.mockReturnThis();
  mockChain.single.mockResolvedValue({ data: null });
  mockChain.upsert.mockResolvedValue({ data: null, error: null });
  mockChain.delete.mockReturnThis();
  mockChain.then.mockImplementation((cb: (v: unknown) => void) => {
    cb(null);
    return { catch: jest.fn() };
  });
  mockChain.catch.mockReturnValue(undefined);
  mockFrom.mockReturnValue(mockChain);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  RATE_LIMITS defaults
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — RATE_LIMITS defaults", () => {
  it("should define perIP limits", () => {
    expect(RATE_LIMITS.perIP.maxRequests).toBe(100);
    expect(RATE_LIMITS.perIP.windowMs).toBe(15 * 60 * 1000);
  });

  it("should define perUser limits", () => {
    expect(RATE_LIMITS.perUser.maxRequests).toBe(500);
    expect(RATE_LIMITS.perUser.windowMs).toBe(60 * 60 * 1000);
  });

  it("should define perUserAI limits", () => {
    expect(RATE_LIMITS.perUserAI.maxRequests).toBe(100);
  });

  it("should define perAPIKey limits", () => {
    expect(RATE_LIMITS.perAPIKey.maxRequests).toBe(1000);
  });

  it("should define strict limits", () => {
    expect(RATE_LIMITS.strict.maxRequests).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  checkRateLimit
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — checkRateLimit", () => {
  it("should allow first request", () => {
    const id = `test-first-${Date.now()}`;
    const result = checkRateLimit(id);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.perIP.maxRequests - 1);
    expect(result.resetAt).toBeInstanceOf(Date);
  });

  it("should decrement remaining count on each request", () => {
    const id = `test-decrement-${Date.now()}`;
    const config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 };

    const r1 = checkRateLimit(id, config);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(id, config);
    expect(r2.remaining).toBe(3);

    const r3 = checkRateLimit(id, config);
    expect(r3.remaining).toBe(2);
  });

  it("should reject requests when limit is exceeded", () => {
    const id = `test-exceeded-${Date.now()}`;
    const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(id, config); // 1st
    checkRateLimit(id, config); // 2nd

    const result = checkRateLimit(id, config); // 3rd = over limit
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should use custom keyGenerator when provided", () => {
    const id = `test-keygen-${Date.now()}`;
    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000,
      keyGenerator: (identifier) => `custom:${identifier}`,
    };

    const result = checkRateLimit(id, config);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  resetRateLimit
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — resetRateLimit", () => {
  it("should reset rate limit counter for identifier", () => {
    const id = `test-reset-${Date.now()}`;
    const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(id, config);
    checkRateLimit(id, config);
    // Now at limit

    resetRateLimit(id);

    const result = checkRateLimit(id, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  trackUsage / getUsageStats
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — usage tracking", () => {
  it("should track usage for an identifier", () => {
    const id = `test-usage-${Date.now()}`;

    trackUsage(id, 0.05, 500);
    const stats = getUsageStats(id);

    expect(stats).toBeDefined();
    expect(stats?.requests).toBe(1);
    expect(stats?.cost).toBe(0.05);
    expect(stats?.tokens).toBe(500);
    expect(stats?.lastRequest).toBeInstanceOf(Date);
  });

  it("should accumulate usage across multiple calls", () => {
    const id = `test-accumulate-${Date.now()}`;

    trackUsage(id, 0.05, 500);
    trackUsage(id, 0.10, 1000);

    const stats = getUsageStats(id);
    expect(stats?.requests).toBe(2);
    expect(stats?.cost).toBeCloseTo(0.15);
    expect(stats?.tokens).toBe(1500);
  });

  it("should return undefined for unknown identifier", () => {
    expect(getUsageStats("nonexistent-id")).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  checkCostLimit
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — checkCostLimit", () => {
  it("should allow when under cost limit", () => {
    const id = `test-cost-under-${Date.now()}`;
    trackUsage(id, 5.0, 1000);

    const result = checkCostLimit(id, 10.0);
    expect(result.allowed).toBe(true);
    expect(result.currentCost).toBe(5.0);
    expect(result.remaining).toBe(5.0);
  });

  it("should reject when over cost limit", () => {
    const id = `test-cost-over-${Date.now()}`;
    trackUsage(id, 15.0, 5000);

    const result = checkCostLimit(id, 10.0);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow when no usage tracked yet", () => {
    const id = `test-cost-none-${Date.now()}`;
    const result = checkCostLimit(id, 10.0);
    expect(result.allowed).toBe(true);
    expect(result.currentCost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  resetUsageStats
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — resetUsageStats", () => {
  it("should clear usage stats for identifier", () => {
    const id = `test-reset-usage-${Date.now()}`;
    trackUsage(id, 5.0, 1000);
    expect(getUsageStats(id)).toBeDefined();

    resetUsageStats(id);
    expect(getUsageStats(id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  estimateCost
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — estimateCost", () => {
  it("should estimate cost for known model", () => {
    const cost = estimateCost("openai/gpt-4o", 1000);
    expect(cost).toBe(0.002);
  });

  it("should estimate cost for mini model", () => {
    const cost = estimateCost("openai/gpt-4o-mini", 1000);
    expect(cost).toBe(0.0001);
  });

  it("should use default cost for unknown model", () => {
    const cost = estimateCost("unknown-model", 1000);
    expect(cost).toBe(0.001);
  });

  it("should scale linearly with tokens", () => {
    const cost1k = estimateCost("openai/gpt-4o", 1000);
    const cost2k = estimateCost("openai/gpt-4o", 2000);
    expect(cost2k).toBeCloseTo(cost1k * 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  COST_ESTIMATES
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — COST_ESTIMATES", () => {
  it("should have entries for major AI models", () => {
    expect(COST_ESTIMATES["openai/gpt-4o"]).toBeDefined();
    expect(COST_ESTIMATES["openai/gpt-4o-mini"]).toBeDefined();
  });

  it("should have positive costs for all entries", () => {
    for (const [, cost] of Object.entries(COST_ESTIMATES)) {
      expect(cost).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  rateLimitMiddleware
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — rateLimitMiddleware", () => {
  it("should return null (allow) for first request", async () => {
    const middleware = rateLimitMiddleware({
      maxRequests: 100,
      windowMs: 60000,
    });
    const request = new Request("http://localhost:3000/api/test", {
      headers: new Headers({
        "x-forwarded-for": `test-middleware-allow-${Date.now()}`,
      }),
    });

    const result = await middleware(request);
    expect(result).toBeNull();
  });

  it("should return 429 response when limit exceeded", async () => {
    const uniqueIp = `test-middleware-deny-${Date.now()}`;
    const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
    const middleware = rateLimitMiddleware(config);

    const makeReq = () =>
      new Request("http://localhost:3000/api/test", {
        headers: new Headers({ "x-forwarded-for": uniqueIp }),
      });

    await middleware(makeReq()); // 1st (allowed)
    const result = await middleware(makeReq()); // 2nd (denied)

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);

    const body = await result?.json();
    expect(body.error).toContain("Rate limit exceeded");
  });

  it("should include rate limit headers in 429 response", async () => {
    const uniqueIp = `test-middleware-headers-${Date.now()}`;
    const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
    const middleware = rateLimitMiddleware(config);

    const makeReq = () =>
      new Request("http://localhost:3000/api/test", {
        headers: new Headers({ "x-forwarded-for": uniqueIp }),
      });

    await middleware(makeReq());
    const result = await middleware(makeReq());

    expect(result?.headers.get("Retry-After")).toBeDefined();
    expect(result?.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  User Quota Management
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiting — User Quota", () => {
  it("should set and get user quota", () => {
    const userId = `test-quota-${Date.now()}`;
    setUserQuota({
      userId,
      maxRequests: 100,
      maxCost: 10.0,
      maxTokens: 50000,
      resetPeriod: "daily",
    });

    const quota = getUserQuota(userId);
    expect(quota).toBeDefined();
    expect(quota?.maxRequests).toBe(100);
    expect(quota?.maxCost).toBe(10.0);
    expect(quota?.maxTokens).toBe(50000);
    expect(quota?.resetPeriod).toBe("daily");
  });

  it("should return undefined for unknown user", () => {
    expect(getUserQuota("nonexistent-user")).toBeUndefined();
  });

  it("checkUserQuota should allow when no quota set", () => {
    const result = checkUserQuota(`no-quota-user-${Date.now()}`);
    expect(result.allowed).toBe(true);
  });

  it("checkUserQuota should allow when under all limits", () => {
    const userId = `test-under-quota-${Date.now()}`;
    setUserQuota({
      userId,
      maxRequests: 100,
      maxCost: 10.0,
      maxTokens: 50000,
      resetPeriod: "daily",
    });
    trackUsage(userId, 1.0, 500);

    const result = checkUserQuota(userId);
    expect(result.allowed).toBe(true);
  });

  it("checkUserQuota should deny when request quota exceeded", () => {
    const userId = `test-req-exceeded-${Date.now()}`;
    setUserQuota({
      userId,
      maxRequests: 1,
      maxCost: 100.0,
      maxTokens: 100000,
      resetPeriod: "hourly",
    });
    trackUsage(userId, 0.01, 100);

    const result = checkUserQuota(userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Request quota exceeded");
  });

  it("checkUserQuota should deny when cost quota exceeded", () => {
    const userId = `test-cost-exceeded-${Date.now()}`;
    setUserQuota({
      userId,
      maxRequests: 1000,
      maxCost: 0.01,
      maxTokens: 100000,
      resetPeriod: "daily",
    });
    trackUsage(userId, 0.02, 100);

    const result = checkUserQuota(userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Cost quota exceeded");
  });

  it("checkUserQuota should deny when token quota exceeded", () => {
    const userId = `test-token-exceeded-${Date.now()}`;
    setUserQuota({
      userId,
      maxRequests: 1000,
      maxCost: 100.0,
      maxTokens: 100,
      resetPeriod: "monthly",
    });
    trackUsage(userId, 0.01, 200);

    const result = checkUserQuota(userId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Token quota exceeded");
  });
});
