/**
 * Application Cache Layer
 * In-memory caching with TTL and LRU eviction
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessedAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

class Cache<T = unknown> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) return undefined;

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    // Update access time for LRU
    entry.accessedAt = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.store.size >= this.maxSize) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTtl),
      accessedAt: Date.now(),
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  size(): number {
    return this.store.size;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Create singleton caches for different purposes
export const apiCache = new Cache({ ttl: 60 * 1000, maxSize: 500 }); // 1 minute
export const sessionCache = new Cache({ ttl: 30 * 60 * 1000, maxSize: 1000 }); // 30 minutes
export const dataCache = new Cache({ ttl: 5 * 60 * 1000, maxSize: 2000 }); // 5 minutes

// Cache decorator for async functions
export function cached<T>(
  cache: Cache<T>,
  keyFn: (...args: unknown[]) => string,
  ttl?: number,
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = keyFn(...args);
      const cached = cache.get(key);

      if (cached !== undefined) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

// Simple memoization helper
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: CacheOptions = {},
): T {
  const cache = new Cache(options);

  return ((...args: unknown[]) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Run cleanup every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    apiCache.cleanup();
    sessionCache.cleanup();
    dataCache.cleanup();
  }, 60 * 1000);
}
