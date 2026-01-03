/**
 * Analysis Cache Service
 *
 * Provides in-memory caching for investment analysis results to reduce redundant API calls
 * and improve performance. Uses LRU (Least Recently Used) eviction strategy.
 *
 * Features:
 * - In-memory caching with configurable TTL
 * - LRU eviction when cache size limit is reached
 * - Separate caches for different analysis types
 * - Cache statistics and monitoring
 * - Automatic cache invalidation
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

/**
 * Analysis Cache Service
 */
export class AnalysisCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private hits: number = 0;
  private misses: number = 0;
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return `${type}:${sortedParams}`;
  }

  /**
   * Get cached data
   */
  get<T>(type: string, params: Record<string, any>): T | null {
    const key = this.generateKey(type, params);
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

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(type: string, params: Record<string, any>, data: T, ttl?: number): void {
    const key = this.generateKey(type, params);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(type: string, params: Record<string, any>): void {
    const key = this.generateKey(type, params);
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries of a specific type
   */
  invalidateType(type: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${type}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Remove expired entries
   */
  cleanupExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry details (for debugging)
   */
  getEntry(type: string, params: Record<string, any>): CacheEntry<any> | null {
    const key = this.generateKey(type, params);
    return this.cache.get(key) || null;
  }
}

// Singleton instance
let analysisCacheServiceInstance: AnalysisCacheService | null = null;

/**
 * Get singleton instance of AnalysisCacheService
 */
export function getAnalysisCacheService(options?: CacheOptions): AnalysisCacheService {
  if (!analysisCacheServiceInstance) {
    analysisCacheServiceInstance = new AnalysisCacheService(options);
  }
  return analysisCacheServiceInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetAnalysisCacheService(): void {
  analysisCacheServiceInstance = null;
}

