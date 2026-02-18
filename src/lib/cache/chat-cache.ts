/**
 * Chat Cache Service
 * Phase 6.5.2: Caching strategy for chat API responses
 *
 * Implements in-memory caching with TTL for chat sessions and messages
 * Can be extended to use Redis for production
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  archived: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class ChatCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private stats: { hits: number; misses: number };
  private maxSize: number;

  // Default TTL values (in milliseconds)
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly SESSION_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly MESSAGE_TTL = 3 * 60 * 1000; // 3 minutes
  private static readonly USER_SESSIONS_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
    this.maxSize = maxSize;
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl: number = ChatCache.DEFAULT_TTL): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    const entriesToEvict = Math.floor(this.maxSize * 0.1); // Evict 10%
    let count = 0;

    for (const key of this.cache.keys()) {
      if (count >= entriesToEvict) break;
      this.cache.delete(key);
      count++;
    }
  }

  // ============================================================================
  // HELPER METHODS FOR SPECIFIC CACHE KEYS
  // ============================================================================

  /**
   * Cache user sessions
   */
  cacheUserSessions(userId: string, sessions: ChatSession[]): void {
    const key = `user:${userId}:sessions`;
    this.set(key, sessions, ChatCache.USER_SESSIONS_TTL);
  }

  /**
   * Get cached user sessions
   */
  getUserSessions(userId: string): ChatSession[] | null {
    const key = `user:${userId}:sessions`;
    return this.get<ChatSession[]>(key);
  }

  /**
   * Cache session messages
   */
  cacheSessionMessages(sessionId: string, messages: ChatMessage[]): void {
    const key = `session:${sessionId}:messages`;
    this.set(key, messages, ChatCache.MESSAGE_TTL);
  }

  /**
   * Get cached session messages
   */
  getSessionMessages(sessionId: string): ChatMessage[] | null {
    const key = `session:${sessionId}:messages`;
    return this.get<ChatMessage[]>(key);
  }

  /**
   * Cache session details
   */
  cacheSession(sessionId: string, session: ChatSession): void {
    const key = `session:${sessionId}`;
    this.set(key, session, ChatCache.SESSION_TTL);
  }

  /**
   * Get cached session
   */
  getSession(sessionId: string): ChatSession | null {
    const key = `session:${sessionId}`;
    return this.get<ChatSession>(key);
  }

  /**
   * Invalidate all caches for a user
   */
  invalidateUser(userId: string): void {
    this.invalidatePattern(`^user:${userId}:`);
  }

  /**
   * Invalidate all caches for a session
   */
  invalidateSession(sessionId: string): void {
    this.invalidatePattern(`^session:${sessionId}`);
  }
}

// Singleton instance
export const chatCache = new ChatCache();
