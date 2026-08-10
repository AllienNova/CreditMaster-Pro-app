/**
 * Redis Cache Service (Vercel KV / Upstash)
 *
 * Distributed caching using Redis for production scalability
 * Falls back to in-memory cache if Redis is unavailable
 */

import { CacheService } from "./cache-service";

// Types
export interface RedisCacheOptions {
  ttl?: number; // TTL in seconds
  prefix?: string; // Key prefix for namespacing
}

// Check if we're using Vercel KV
const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Redis Cache Service using REST API
 * Compatible with Vercel KV and Upstash Redis
 */
export class RedisCacheService {
  private prefix: string;
  private defaultTTL: number;
  private fallbackCache: CacheService;
  private redisAvailable: boolean;

  constructor(options?: RedisCacheOptions) {
    this.prefix = options?.prefix || "cache:";
    this.defaultTTL = options?.ttl || 300; // 5 minutes default
    this.fallbackCache = new CacheService({ ttl: this.defaultTTL * 1000 });
    this.redisAvailable = !!(REDIS_URL && REDIS_TOKEN);

    if (!this.redisAvailable) {
      // RedisCacheService: Redis not configured, using in-memory fallback cache
    }
  }

  private async redisRequest(
    command: string,
    args: string[] = [],
  ): Promise<any> {
    if (!this.redisAvailable) return null;

    try {
      const response = await fetch(
        `${REDIS_URL}/${command}/${args.join("/")}`,
        {
          headers: {
            Authorization: `Bearer ${REDIS_TOKEN}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Redis request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      // RedisCacheService error: Redis request failed
      return null;
    }
  }

  /**
   * Liveness probe for the health endpoint.
   *
   * Deliberately NOT built on redisRequest(): that helper swallows every error
   * and returns null, so a caller cannot tell "Redis is not configured" from
   * "Redis is configured and failing". Collapsing those two is precisely the
   * defect this method exists to avoid reporting — see gap-analysis.md G-012,
   * where a health endpoint returned "healthy" for components it never checked.
   *
   * `configured: false` is not a failure. Without Upstash credentials this
   * service falls back to an in-process cache, which works but is per-instance;
   * the health endpoint reports that as degraded rather than healthy, because on
   * serverless each instance then holds its own copy.
   */
  async ping(): Promise<{ configured: boolean; ok: boolean; error?: string }> {
    if (!this.redisAvailable) return { configured: false, ok: false };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${REDIS_URL}/PING`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          configured: true,
          ok: false,
          error: `HTTP ${response.status}`,
        };
      }
      const data = await response.json();
      return { configured: true, ok: data?.result === "PONG" };
    } catch (error) {
      return {
        configured: true,
        ok: false,
        error: error instanceof Error ? error.message : "unknown",
      };
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.prefix}${key}`;

    if (!this.redisAvailable) {
      return this.fallbackCache.get<T>(key);
    }

    try {
      const result = await this.redisRequest("get", [fullKey]);
      if (result === null) return null;
      return JSON.parse(result) as T;
    } catch {
      return this.fallbackCache.get<T>(key);
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    const expiry = ttl || this.defaultTTL;

    // Always set in fallback cache
    this.fallbackCache.set(key, value, expiry * 1000);

    if (!this.redisAvailable) return;

    try {
      const serialized = JSON.stringify(value);
      await this.redisRequest("setex", [fullKey, String(expiry), serialized]);
    } catch (error) {
      // RedisCacheService error: Redis set failed
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;

    this.fallbackCache.delete(key);

    if (!this.redisAvailable) return;

    try {
      await this.redisRequest("del", [fullKey]);
    } catch (error) {
      // RedisCacheService error: Redis delete failed
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const fullKey = `${this.prefix}${key}`;

    if (!this.redisAvailable) {
      return this.fallbackCache.has(key);
    }

    try {
      const result = await this.redisRequest("exists", [fullKey]);
      return result === 1;
    } catch {
      return this.fallbackCache.has(key);
    }
  }

  /**
   * Clear all cache with prefix
   */
  async clear(): Promise<void> {
    this.fallbackCache.clear();
    // Redis clear would need SCAN + DEL which is expensive
    // For production, use key expiry instead
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      redisAvailable: this.redisAvailable,
      fallbackStats: this.fallbackCache.getStats(),
    };
  }
}

// Export singleton instances with different TTLs
export const redisCache = new RedisCacheService({ ttl: 300, prefix: "app:" });
export const shortRedisCache = new RedisCacheService({
  ttl: 60,
  prefix: "short:",
});
export const longRedisCache = new RedisCacheService({
  ttl: 3600,
  prefix: "long:",
});
export const userRedisCache = new RedisCacheService({
  ttl: 1800,
  prefix: "user:",
});
