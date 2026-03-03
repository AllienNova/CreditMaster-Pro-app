/**
 * Offer Cache Tests
 */

import { OfferCache } from "../offer-cache";

// =============================================================================
// Tests
// =============================================================================

describe("OfferCache", () => {
  let cache: OfferCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new OfferCache();
  });

  afterEach(() => {
    cache.destroy();
    jest.useRealTimers();
  });

  // ===========================================================================
  // get / set
  // ===========================================================================

  describe("get/set", () => {
    it("should store and retrieve a value", () => {
      cache.set("key1", { name: "test product" });
      const result = cache.get<{ name: string }>("key1");
      expect(result).toEqual({ name: "test product" });
    });

    it("should return null for non-existent key", () => {
      const result = cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should store different types of values", () => {
      cache.set("string", "hello");
      cache.set("number", 42);
      cache.set("array", [1, 2, 3]);
      cache.set("object", { a: 1, b: "two" });

      expect(cache.get("string")).toBe("hello");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("array")).toEqual([1, 2, 3]);
      expect(cache.get("object")).toEqual({ a: 1, b: "two" });
    });

    it("should overwrite existing value", () => {
      cache.set("key", "original");
      cache.set("key", "updated");
      expect(cache.get("key")).toBe("updated");
    });

    it("should store with custom TTL", () => {
      cache.set("short", "data", 1000);
      expect(cache.get("short")).toBe("data");
    });
  });

  // ===========================================================================
  // TTL Expiration
  // ===========================================================================

  describe("TTL expiration", () => {
    it("should expire entries after default TTL", () => {
      cache.set("expiring", "data");
      expect(cache.get("expiring")).toBe("data");

      // Advance past default TTL (15 minutes)
      jest.advanceTimersByTime(16 * 60 * 1000);

      expect(cache.get("expiring")).toBeNull();
    });

    it("should expire entries after custom TTL", () => {
      cache.set("custom", "data", 5000);
      expect(cache.get("custom")).toBe("data");

      jest.advanceTimersByTime(6000);

      expect(cache.get("custom")).toBeNull();
    });

    it("should not expire entries before TTL", () => {
      cache.set("still_valid", "data", 10000);

      jest.advanceTimersByTime(9000);

      expect(cache.get("still_valid")).toBe("data");
    });

    it("should handle entries with different TTLs independently", () => {
      cache.set("short", "short_data", 5000);
      cache.set("long", "long_data", 30000);

      jest.advanceTimersByTime(6000);

      expect(cache.get("short")).toBeNull();
      expect(cache.get("long")).toBe("long_data");
    });
  });

  // ===========================================================================
  // invalidate
  // ===========================================================================

  describe("invalidate", () => {
    it("should remove a specific entry", () => {
      cache.set("key1", "data1");
      cache.set("key2", "data2");

      cache.invalidate("key1");

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("data2");
    });

    it("should handle invalidating non-existent key gracefully", () => {
      expect(() => cache.invalidate("nonexistent")).not.toThrow();
    });
  });

  // ===========================================================================
  // invalidateByPattern
  // ===========================================================================

  describe("invalidateByPattern", () => {
    it("should remove entries matching pattern", () => {
      cache.set("products:credit_card:1", "data1");
      cache.set("products:credit_card:2", "data2");
      cache.set("products:loan:1", "data3");
      cache.set("users:1", "data4");

      cache.invalidateByPattern("products:credit_card");

      expect(cache.get("products:credit_card:1")).toBeNull();
      expect(cache.get("products:credit_card:2")).toBeNull();
      expect(cache.get("products:loan:1")).toBe("data3");
      expect(cache.get("users:1")).toBe("data4");
    });

    it("should handle pattern that matches nothing", () => {
      cache.set("key1", "data1");
      cache.invalidateByPattern("nonexistent");
      expect(cache.get("key1")).toBe("data1");
    });

    it("should remove all entries when pattern is empty string", () => {
      cache.set("a", "1");
      cache.set("b", "2");
      cache.invalidateByPattern("");
      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBeNull();
    });
  });

  // ===========================================================================
  // clear
  // ===========================================================================

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", "data1");
      cache.set("key2", "data2");
      cache.set("key3", "data3");

      cache.clear();

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBeNull();
    });

    it("should reset stats", () => {
      cache.set("key", "data");
      cache.get("key"); // hit
      cache.get("miss"); // miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.entries).toBe(0);
    });
  });

  // ===========================================================================
  // getStats
  // ===========================================================================

  describe("getStats", () => {
    it("should track hits", () => {
      cache.set("key", "data");
      cache.get("key");
      cache.get("key");

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it("should track misses", () => {
      cache.get("nonexistent1");
      cache.get("nonexistent2");

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it("should calculate correct hit rate", () => {
      cache.set("key", "data");
      cache.get("key"); // hit
      cache.get("key"); // hit
      cache.get("miss"); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it("should return 0 hit rate when no requests", () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it("should track entry count", () => {
      cache.set("key1", "data1");
      cache.set("key2", "data2");

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
    });

    it("should count expired entry access as miss", () => {
      cache.set("expiring", "data", 1000);

      jest.advanceTimersByTime(2000);

      cache.get("expiring"); // should be a miss

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });
  });

  // ===========================================================================
  // LRU Eviction
  // ===========================================================================

  describe("LRU eviction", () => {
    it("should evict least recently used entry when max reached", () => {
      // Fill cache to max (1000 entries), advancing time so each has a distinct access time
      for (let i = 0; i < 1000; i++) {
        cache.set(`key_${i}`, `data_${i}`);
        jest.advanceTimersByTime(1); // Each entry gets a unique timestamp
      }

      // key_0 was set earliest, so it's the LRU
      // Access key_0 to make it recently used
      jest.advanceTimersByTime(1);
      cache.get("key_0");

      // Add one more entry, should evict the actual LRU (key_1, since key_0 was just accessed)
      jest.advanceTimersByTime(1);
      cache.set("new_key", "new_data");

      // key_0 should still be there (recently accessed)
      expect(cache.get("key_0")).toBe("data_0");

      // new_key should be there
      expect(cache.get("new_key")).toBe("new_data");

      // key_1 should have been evicted (it was the LRU after key_0 was accessed)
      expect(cache.get("key_1")).toBeNull();
    });

    it("should not evict when overwriting existing key", () => {
      for (let i = 0; i < 1000; i++) {
        cache.set(`key_${i}`, `data_${i}`);
      }

      // Overwriting existing key should not trigger eviction
      cache.set("key_0", "updated_data");

      expect(cache.get("key_0")).toBe("updated_data");
      expect(cache.get("key_999")).toBe("data_999");
    });
  });

  // ===========================================================================
  // Auto-cleanup
  // ===========================================================================

  describe("auto-cleanup", () => {
    it("should remove expired entries during cleanup cycle", () => {
      cache.set("short_lived", "data", 1000);
      cache.set("long_lived", "data", 10 * 60 * 1000);

      // Advance past short TTL and trigger cleanup (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000 + 2000);

      // long_lived should still be there
      expect(cache.get("long_lived")).toBe("data");
    });
  });

  // ===========================================================================
  // Concurrent Access
  // ===========================================================================

  describe("concurrent access patterns", () => {
    it("should handle rapid set/get cycles", () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`rapid_${i}`, i);
        expect(cache.get(`rapid_${i}`)).toBe(i);
      }
    });

    it("should handle interleaved operations", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.get("a")).toBe(1);
      cache.invalidate("a");
      cache.set("c", 3);
      expect(cache.get("a")).toBeNull();
      expect(cache.get("b")).toBe(2);
      expect(cache.get("c")).toBe(3);
    });

    it("should handle set-invalidate-set cycle", () => {
      cache.set("cycle", "first");
      cache.invalidate("cycle");
      cache.set("cycle", "second");
      expect(cache.get("cycle")).toBe("second");
    });
  });

  // ===========================================================================
  // destroy
  // ===========================================================================

  describe("destroy", () => {
    it("should stop cleanup timer", () => {
      cache.destroy();
      // Should not throw when timers advance
      expect(() => jest.advanceTimersByTime(10 * 60 * 1000)).not.toThrow();
    });
  });
});
