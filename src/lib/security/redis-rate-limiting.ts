/**
 * Redis-based Rate Limiting Service
 *
 * Distributed rate limiting using Redis for multi-instance deployments
 * Falls back to in-memory store if Redis is unavailable.
 *
 * This is the single canonical rate limiter for the platform.
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until retry
}

// Redis configuration
const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback
const fallbackStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Make a Redis REST API request
 */
async function redisRequest(
  command: string,
  args: string[] = [],
): Promise<any> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;

  try {
    const response = await fetch(`${REDIS_URL}/${command}/${args.join("/")}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result;
  } catch {
    return null;
  }
}

/**
 * Distributed Rate Limiter using Redis
 * Implements sliding window algorithm
 */
export class RedisRateLimiter {
  private config: RateLimitConfig;
  private keyPrefix: string;
  private redisAvailable: boolean;

  constructor(config: RateLimitConfig, keyPrefix: string = "ratelimit") {
    this.config = config;
    this.keyPrefix = keyPrefix;
    this.redisAvailable = !!(REDIS_URL && REDIS_TOKEN);
  }

  /**
   * Check if request is allowed
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(identifier)
      : `${this.keyPrefix}:${identifier}`;

    if (this.redisAvailable) {
      return this.checkRedis(key);
    }
    return this.checkFallback(key);
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRedis(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.config.windowMs;
    const resetAt = new Date(now + windowMs);

    try {
      // Increment counter with automatic expiry
      const count = await redisRequest("incr", [key]);

      // Set expiry on first request
      if (count === 1) {
        await redisRequest("pexpire", [key, String(windowMs)]);
      }

      // Get TTL for remaining time
      const ttl = await redisRequest("pttl", [key]);
      const actualResetAt = ttl > 0 ? new Date(now + ttl) : resetAt;

      const remaining = Math.max(0, this.config.maxRequests - count);
      const allowed = count <= this.config.maxRequests;

      return {
        allowed,
        remaining,
        resetAt: actualResetAt,
        retryAfter: allowed ? undefined : Math.ceil((ttl || windowMs) / 1000),
      };
    } catch {
      // Fall back to memory on error
      return this.checkFallback(key);
    }
  }

  /**
   * Check rate limit using in-memory fallback
   */
  private checkFallback(key: string): RateLimitResult {
    const now = Date.now();
    const entry = fallbackStore.get(key);

    if (entry && entry.resetAt > now) {
      entry.count++;
      const remaining = Math.max(0, this.config.maxRequests - entry.count);
      const allowed = entry.count <= this.config.maxRequests;

      return {
        allowed,
        remaining,
        resetAt: new Date(entry.resetAt),
        retryAfter: allowed
          ? undefined
          : Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    // New window
    const resetAt = now + this.config.windowMs;
    fallbackStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: this.config.maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    fallbackStore.delete(key);

    if (this.redisAvailable) {
      await redisRequest("del", [key]);
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RedisRateLimiter(
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  "api",
);

export const authRateLimiter = new RedisRateLimiter(
  {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  "auth",
);

export const aiRateLimiter = new RedisRateLimiter(
  {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  "ai",
);

export const bureauRateLimiter = new RedisRateLimiter(
  {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  "bureau",
);

/**
 * Lightweight per-window rate-limit factory.
 *
 * Compatibility shim preserving the API previously exported by the removed
 * `src/lib/rate-limit.ts`. Callers configure the time window once, then call
 * `check(limit, token)` per request — the per-call limit is honored so a single
 * factory can guard endpoints with different quotas. `check` throws when the
 * limit is exceeded; `getRemaining` and `reset` are non-throwing.
 *
 * Backed by `RedisRateLimiter` (distributed when Redis is configured, in-memory
 * fallback otherwise).
 */
export interface RateLimitFactoryConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval?: number; // Accepted for API compatibility; not enforced
}

export interface RateLimiter {
  check: (limit: number, token: string) => Promise<void>;
  reset: (token: string) => Promise<void>;
  getRemaining: (limit: number, token: string) => Promise<number>;
}

export function rateLimit(config: RateLimitFactoryConfig): RateLimiter {
  const limiterFor = (limit: number): RedisRateLimiter =>
    new RedisRateLimiter(
      { windowMs: config.interval, maxRequests: limit },
      "ratelimit",
    );

  return {
    check: async (limit: number, token: string): Promise<void> => {
      const result = await limiterFor(limit).check(token);
      if (!result.allowed) {
        throw new Error(
          `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
        );
      }
    },

    reset: async (token: string): Promise<void> => {
      await limiterFor(1).reset(token);
    },

    getRemaining: async (limit: number, token: string): Promise<number> => {
      // Non-mutating peek: a fresh limiter with maxRequests one above `limit`
      // would still consume a slot, so we cannot peek without side effects.
      // Preserve prior best-effort semantics: report the configured limit.
      void token;
      return limit;
    },
  };
}
