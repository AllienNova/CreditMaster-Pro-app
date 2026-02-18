/**
 * Production Rate Limiter
 * Implements token bucket algorithm for API rate limiting
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const defaultLimits: Record<string, RateLimitConfig> = {
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 req/min for auth
  disputes: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 req/min
  upload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  admin: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 req/min
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultLimits.api,
): RateLimitResult {
  const now = Date.now();
  const key = `${config.keyPrefix || "rl"}:${identifier}`;
  const existing = rateLimitStore.get(key);

  // Reset if window expired
  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000),
    };
  }

  // Increment count
  existing.count++;
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
  };
}

export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(defaultLimits.api.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetTime),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, value] of entries) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute
