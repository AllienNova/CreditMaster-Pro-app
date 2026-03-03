/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock rate-limiting module for type imports
jest.mock("../rate-limiting", () => ({
  // We only need the types, which are not actually imported at runtime
}));

// Mock fetch for Redis REST API calls
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Save and clear env vars to force fallback mode
const savedKVUrl = process.env.KV_REST_API_URL;
const savedKVToken = process.env.KV_REST_API_TOKEN;
const savedUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const savedUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeAll(() => {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterAll(() => {
  if (savedKVUrl) process.env.KV_REST_API_URL = savedKVUrl;
  if (savedKVToken) process.env.KV_REST_API_TOKEN = savedKVToken;
  if (savedUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = savedUpstashUrl;
  if (savedUpstashToken)
    process.env.UPSTASH_REDIS_REST_TOKEN = savedUpstashToken;
});

import {
  RedisRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  bureauRateLimiter,
} from "../redis-rate-limiting";

beforeEach(() => {
  mockFetch.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  RedisRateLimiter — fallback mode (no Redis)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Redis Rate Limiting — fallback mode", () => {
  it("should allow the first request", async () => {
    const limiter = new RedisRateLimiter(
      { windowMs: 60000, maxRequests: 5 },
      "test-fallback",
    );

    const result = await limiter.check(`fallback-first-${Date.now()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeInstanceOf(Date);
  });

  it("should decrement remaining on each request", async () => {
    const id = `fallback-decrement-${Date.now()}`;
    const limiter = new RedisRateLimiter(
      { windowMs: 60000, maxRequests: 3 },
      "test-dec",
    );

    const r1 = await limiter.check(id);
    expect(r1.remaining).toBe(2);

    const r2 = await limiter.check(id);
    expect(r2.remaining).toBe(1);

    const r3 = await limiter.check(id);
    expect(r3.remaining).toBe(0);
  });

  it("should reject when limit exceeded", async () => {
    const id = `fallback-exceed-${Date.now()}`;
    const limiter = new RedisRateLimiter(
      { windowMs: 60000, maxRequests: 1 },
      "test-exceed",
    );

    await limiter.check(id); // 1st allowed
    const result = await limiter.check(id); // 2nd denied

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should use custom keyGenerator when provided", async () => {
    const limiter = new RedisRateLimiter(
      {
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: (id) => `custom:${id}`,
      },
      "test-keygen",
    );

    const result = await limiter.check(`keygen-${Date.now()}`);
    expect(result.allowed).toBe(true);
  });

  it("should reset rate limit for an identifier", async () => {
    const id = `fallback-reset-${Date.now()}`;
    const limiter = new RedisRateLimiter(
      { windowMs: 60000, maxRequests: 1 },
      "test-reset",
    );

    await limiter.check(id);
    // Now at limit

    await limiter.reset(id);

    // After reset, should be allowed again
    const result = await limiter.check(id);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Pre-configured rate limiters
// ═══════════════════════════════════════════════════════════════════════════════
describe("Redis Rate Limiting — pre-configured instances", () => {
  it("should export apiRateLimiter with 60 req/min", async () => {
    expect(apiRateLimiter).toBeInstanceOf(RedisRateLimiter);
    const result = await apiRateLimiter.check(`api-${Date.now()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // 60 max - 1
  });

  it("should export authRateLimiter with 5 req/15min", async () => {
    expect(authRateLimiter).toBeInstanceOf(RedisRateLimiter);
    const result = await authRateLimiter.check(`auth-${Date.now()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 max - 1
  });

  it("should export aiRateLimiter with 10 req/min", async () => {
    expect(aiRateLimiter).toBeInstanceOf(RedisRateLimiter);
    const result = await aiRateLimiter.check(`ai-${Date.now()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // 10 max - 1
  });

  it("should export bureauRateLimiter with 10 req/hour", async () => {
    expect(bureauRateLimiter).toBeInstanceOf(RedisRateLimiter);
    const result = await bureauRateLimiter.check(`bureau-${Date.now()}`);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // 10 max - 1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Window expiry behavior
// ═══════════════════════════════════════════════════════════════════════════════
describe("Redis Rate Limiting — window behavior", () => {
  it("should set resetAt to the future", async () => {
    const limiter = new RedisRateLimiter(
      { windowMs: 60000, maxRequests: 5 },
      "test-window",
    );

    const result = await limiter.check(`window-${Date.now()}`);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("should report retryAfter in seconds when denied", async () => {
    const id = `window-retry-${Date.now()}`;
    const limiter = new RedisRateLimiter(
      { windowMs: 30000, maxRequests: 1 },
      "test-retry",
    );

    await limiter.check(id);
    const result = await limiter.check(id);

    expect(result.retryAfter).toBeDefined();
    // retryAfter should be roughly 30 seconds (30000ms / 1000)
    expect(result.retryAfter).toBeLessThanOrEqual(30);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should not return retryAfter when request is allowed", async () => {
    const limiter = new RedisRateLimiter(
      { windowMs: 60000, maxRequests: 10 },
      "test-no-retry",
    );

    const result = await limiter.check(`no-retry-${Date.now()}`);
    expect(result.retryAfter).toBeUndefined();
  });
});
