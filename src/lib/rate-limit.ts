/**
 * Simple Rate Limiter
 *
 * Lightweight rate limiting utility for API endpoints
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens to track
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (limit: number, token: string): Promise<void> => {
      const now = Date.now();
      const key = `${token}`;
      const entry = rateLimitStore.get(key);

      // Reset if window expired
      if (!entry || entry.resetAt < now) {
        rateLimitStore.set(key, {
          count: 1,
          resetAt: now + config.interval,
        });
        return;
      }

      // Check if limit exceeded
      if (entry.count >= limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        throw new Error(
          `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        );
      }

      // Increment counter
      entry.count++;
      rateLimitStore.set(key, entry);
    },

    reset: (token: string): void => {
      rateLimitStore.delete(token);
    },

    getRemaining: (limit: number, token: string): number => {
      const entry = rateLimitStore.get(token);
      if (!entry || entry.resetAt < Date.now()) {
        return limit;
      }
      return Math.max(0, limit - entry.count);
    },
  };
}
