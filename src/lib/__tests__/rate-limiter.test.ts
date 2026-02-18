/**
 * @jest-environment node
 */
describe("Rate Limiter", () => {
  describe("Token Bucket Algorithm", () => {
    interface TokenBucket {
      tokens: number;
      maxTokens: number;
      refillRate: number; // tokens per second
      lastRefill: number;
    }

    const createBucket = (
      maxTokens: number,
      refillRate: number,
    ): TokenBucket => ({
      tokens: maxTokens,
      maxTokens,
      refillRate,
      lastRefill: Date.now(),
    });

    const refillBucket = (bucket: TokenBucket): TokenBucket => {
      const now = Date.now();
      const elapsed = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = elapsed * bucket.refillRate;

      return {
        ...bucket,
        tokens: Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd),
        lastRefill: now,
      };
    };

    const consumeToken = (
      bucket: TokenBucket,
    ): { success: boolean; bucket: TokenBucket } => {
      const refilled = refillBucket(bucket);

      if (refilled.tokens >= 1) {
        return {
          success: true,
          bucket: { ...refilled, tokens: refilled.tokens - 1 },
        };
      }

      return { success: false, bucket: refilled };
    };

    it("should create bucket with max tokens", () => {
      const bucket = createBucket(10, 1);
      expect(bucket.tokens).toBe(10);
      expect(bucket.maxTokens).toBe(10);
    });

    it("should consume tokens successfully", () => {
      const bucket = createBucket(10, 1);
      const result = consumeToken(bucket);
      expect(result.success).toBe(true);
      expect(result.bucket.tokens).toBeLessThan(10);
    });

    it("should reject when no tokens available", () => {
      let bucket = createBucket(10, 1);
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        const result = consumeToken(bucket);
        bucket = result.bucket;
      }
      const result = consumeToken(bucket);
      expect(result.success).toBe(false);
    });
  });

  describe("Sliding Window", () => {
    interface WindowCounter {
      requests: number[];
      windowMs: number;
      maxRequests: number;
    }

    const createWindow = (
      windowMs: number,
      maxRequests: number,
    ): WindowCounter => ({
      requests: [],
      windowMs,
      maxRequests,
    });

    const isAllowed = (
      counter: WindowCounter,
      now: number,
    ): { allowed: boolean; counter: WindowCounter } => {
      // Remove old requests
      const cutoff = now - counter.windowMs;
      const validRequests = counter.requests.filter((t) => t > cutoff);

      if (validRequests.length < counter.maxRequests) {
        return {
          allowed: true,
          counter: {
            ...counter,
            requests: [...validRequests, now],
          },
        };
      }

      return {
        allowed: false,
        counter: { ...counter, requests: validRequests },
      };
    };

    it("should allow requests within limit", () => {
      let counter = createWindow(60000, 10);
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        const result = isAllowed(counter, now + i);
        expect(result.allowed).toBe(true);
        counter = result.counter;
      }
    });

    it("should reject requests over limit", () => {
      let counter = createWindow(60000, 5);
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        const result = isAllowed(counter, now + i);
        counter = result.counter;
      }

      const result = isAllowed(counter, now + 100);
      expect(result.allowed).toBe(false);
    });

    it("should allow requests after window expires", () => {
      let counter = createWindow(1000, 2); // 1 second window
      const now = Date.now();

      // Fill window
      for (let i = 0; i < 2; i++) {
        const result = isAllowed(counter, now);
        counter = result.counter;
      }

      // After window expires
      const result = isAllowed(counter, now + 2000);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Rate Limit Headers", () => {
    const generateHeaders = (
      remaining: number,
      limit: number,
      resetTime: number,
    ) => ({
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetTime),
      "Retry-After":
        remaining === 0
          ? String(Math.ceil((resetTime - Date.now()) / 1000))
          : undefined,
    });

    it("should generate correct headers", () => {
      const headers = generateHeaders(5, 10, Date.now() + 60000);
      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("5");
    });

    it("should include Retry-After when exhausted", () => {
      const headers = generateHeaders(0, 10, Date.now() + 30000);
      expect(headers["Retry-After"]).toBeDefined();
    });

    it("should not include Retry-After when not exhausted", () => {
      const headers = generateHeaders(5, 10, Date.now() + 60000);
      expect(headers["Retry-After"]).toBeUndefined();
    });
  });

  describe("IP-based Rate Limiting", () => {
    const ipLimits: Map<string, { count: number; resetAt: number }> = new Map();

    const checkIpLimit = (ip: string, limit: number, windowMs: number) => {
      const now = Date.now();
      const existing = ipLimits.get(ip);

      if (!existing || existing.resetAt < now) {
        ipLimits.set(ip, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1 };
      }

      if (existing.count >= limit) {
        return { allowed: false, remaining: 0 };
      }

      existing.count++;
      return { allowed: true, remaining: limit - existing.count };
    };

    beforeEach(() => {
      ipLimits.clear();
    });

    it("should track requests per IP", () => {
      const result1 = checkIpLimit("192.168.1.1", 10, 60000);
      const result2 = checkIpLimit("192.168.1.1", 10, 60000);

      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(8);
    });

    it("should track IPs independently", () => {
      checkIpLimit("192.168.1.1", 10, 60000);
      const result = checkIpLimit("192.168.1.2", 10, 60000);
      expect(result.remaining).toBe(9);
    });
  });
});
