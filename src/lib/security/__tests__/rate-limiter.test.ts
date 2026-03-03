/**
 * @jest-environment node
 */

// Must use fake timers BEFORE importing the module because rate-limiter.ts
// has a top-level setInterval for cleanup
jest.useFakeTimers();

import {
  checkRateLimit,
  getRateLimitHeaders,
  defaultLimits,
} from "../rate-limiter";

afterAll(() => {
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  defaultLimits
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiter — defaultLimits", () => {
  it("should define api limits", () => {
    expect(defaultLimits.api).toBeDefined();
    expect(defaultLimits.api.maxRequests).toBe(100);
    expect(defaultLimits.api.windowMs).toBe(60 * 1000);
  });

  it("should define auth limits (stricter)", () => {
    expect(defaultLimits.auth).toBeDefined();
    expect(defaultLimits.auth.maxRequests).toBe(5);
  });

  it("should define disputes limits", () => {
    expect(defaultLimits.disputes).toBeDefined();
    expect(defaultLimits.disputes.maxRequests).toBe(20);
  });

  it("should define upload limits", () => {
    expect(defaultLimits.upload).toBeDefined();
    expect(defaultLimits.upload.maxRequests).toBe(10);
  });

  it("should define admin limits", () => {
    expect(defaultLimits.admin).toBeDefined();
    expect(defaultLimits.admin.maxRequests).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  checkRateLimit
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiter — checkRateLimit", () => {
  it("should allow the first request", () => {
    const id = `rl-test-first-${Date.now()}`;
    const result = checkRateLimit(id);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(defaultLimits.api.maxRequests - 1);
  });

  it("should decrement remaining on successive calls", () => {
    const id = `rl-test-decrement-${Date.now()}`;
    const config = { maxRequests: 5, windowMs: 60000 };

    checkRateLimit(id, config);
    const r2 = checkRateLimit(id, config);
    expect(r2.remaining).toBe(3);
  });

  it("should reject when max requests exceeded", () => {
    const id = `rl-test-exceed-${Date.now()}`;
    const config = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(id, config);
    checkRateLimit(id, config);
    const result = checkRateLimit(id, config);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should reset after window expires", () => {
    const id = `rl-test-window-${Date.now()}`;
    const config = { maxRequests: 2, windowMs: 1000 };

    checkRateLimit(id, config);
    checkRateLimit(id, config);

    // Advance past the window
    jest.advanceTimersByTime(2000);

    const result = checkRateLimit(id, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("should use custom key prefix", () => {
    const id = `rl-test-prefix-${Date.now()}`;
    const config = { maxRequests: 5, windowMs: 60000, keyPrefix: "custom" };

    const result = checkRateLimit(id, config);
    expect(result.success).toBe(true);
  });

  it("should track resetTime correctly", () => {
    const id = `rl-test-reset-time-${Date.now()}`;
    const result = checkRateLimit(id);

    expect(result.resetTime).toBeGreaterThan(Date.now());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getRateLimitHeaders
// ═══════════════════════════════════════════════════════════════════════════════
describe("Rate Limiter — getRateLimitHeaders", () => {
  it("should include standard rate limit headers", () => {
    const result = checkRateLimit(`rl-test-headers-${Date.now()}`);
    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBeDefined();
    expect(headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("should include Retry-After when rate limited", () => {
    const id = `rl-test-retry-${Date.now()}`;
    const config = { maxRequests: 1, windowMs: 60000 };

    checkRateLimit(id, config);
    const result = checkRateLimit(id, config);
    const headers = getRateLimitHeaders(result);

    expect(headers["Retry-After"]).toBeDefined();
    expect(parseInt(headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("should not include Retry-After when under limit", () => {
    const result = checkRateLimit(`rl-test-no-retry-${Date.now()}`);
    const headers = getRateLimitHeaders(result);

    expect(headers["Retry-After"]).toBeUndefined();
  });
});
