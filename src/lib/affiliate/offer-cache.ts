/**
 * Offer Cache
 *
 * In-memory TTL cache for MoneyLion offer catalog data.
 * Uses LRU eviction when max entries are reached.
 */

import type { CacheEntry } from "./types";

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ENTRIES = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Offer Cache
// =============================================================================

class OfferCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private accessOrder: Map<string, number>;
  private hits: number;
  private misses: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null;

  constructor() {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.hits = 0;
    this.misses = 0;
    this.cleanupTimer = null;
    this.startCleanup();
  }

  /**
   * Get a cached value by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    this.accessOrder.set(key, Date.now());
    return entry.data;
  }

  /**
   * Set a cached value with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= MAX_ENTRIES && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs ?? DEFAULT_TTL_MS,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Remove a specific cached entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Remove all entries whose keys contain the pattern string
   */
  invalidateByPattern(pattern: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Stop the cleanup timer (for testing/shutdown)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  private removeExpiredEntries(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.removeExpiredEntries();
    }, CLEANUP_INTERVAL_MS);

    // Prevent the timer from keeping the process alive
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }
}

// Export class and singleton
export { OfferCache };
export const offerCache = new OfferCache();
export default offerCache;
