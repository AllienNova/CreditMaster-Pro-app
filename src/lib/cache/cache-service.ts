/**
 * Cache Service
 *
 * In-memory caching with TTL (Time To Live) support
 * Improves performance by reducing database queries and API calls
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// ============================================================================
// CACHE SERVICE CLASS
// ============================================================================

export class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private maxSize: number = 1000;

  constructor(options?: CacheOptions) {
    if (options?.ttl) {
      this.defaultTTL = options.ttl;
    }
    if (options?.maxSize) {
      this.maxSize = options.maxSize;
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Check cache size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or set value (fetch if not in cache)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      // CacheService: Cache cleanup removed expired entries
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    let removed = 0;
    const regex = new RegExp(pattern);

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Warm up cache with data
   */
  async warmUp<T>(
    keys: string[],
    fetchFn: (key: string) => Promise<T>,
    ttl?: number,
  ): Promise<void> {
    // CacheService: Warming up cache

    await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await fetchFn(key);
          this.set(key, value, ttl);
        } catch (error) {
          // CacheService error: Failed to warm up cache for key
        }
      }),
    );

    // CacheService: Cache warmed up
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

// Default cache instance (5 minute TTL)
export const cache = new CacheService();

// Short-lived cache (1 minute TTL)
export const shortCache = new CacheService({ ttl: 60 * 1000 });

// Long-lived cache (1 hour TTL)
export const longCache = new CacheService({ ttl: 60 * 60 * 1000 });

// User-specific cache (10 minute TTL)
export const userCache = new CacheService({ ttl: 10 * 60 * 1000 });

// Analytics cache (30 minute TTL)
export const analyticsCache = new CacheService({ ttl: 30 * 60 * 1000 });

export default cache;
