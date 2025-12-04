/**
 * Query Optimizer
 * 
 * Optimizes database queries for better performance:
 * - Query batching
 * - Field selection
 * - Index hints
 * - Query caching
 */

import { cache } from '@/lib/cache/cache-service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface QueryOptions {
  select?: string[];
  cache?: boolean;
  cacheTTL?: number;
  batchKey?: string;
}

interface BatchQueueEntry {
  key: string;
  execute: () => Promise<void>;
}

type SupabaseQueryLike = {
  select?: (fields: string) => SupabaseQueryLike;
};

// ============================================================================
// QUERY OPTIMIZER CLASS
// ============================================================================

export class QueryOptimizer {
  private static batchQueue: Map<string, BatchQueueEntry[]> = new Map();
  private static batchTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Execute query with caching
   */
  static async executeWithCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return cache.getOrSet(cacheKey, queryFn, ttl);
  }
  
  /**
   * Batch multiple queries together
   */
  static async batchQuery<T>(
    batchKey: string,
    queryKey: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }
      
      this.batchQueue.get(batchKey)!.push({
        key: queryKey,
        execute: async () => {
          try {
            const result = await queryFn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      });
      
      // Schedule batch execution
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeBatch(batchKey);
        }, 10); // 10ms debounce
      }
    });
  }
  
  /**
   * Execute batched queries
   */
  private static async executeBatch(batchKey: string): Promise<void> {
    const queries = this.batchQueue.get(batchKey);
    if (!queries || queries.length === 0) return;
    
    console.log(`⚡ Executing batch of ${queries.length} queries for ${batchKey}`);
    
    // Clear batch
    this.batchQueue.delete(batchKey);
    this.batchTimeout = null;
    
    // Execute all queries in parallel
    await Promise.all(queries.map((entry) => entry.execute()));
  }
  
  /**
   * Optimize field selection for Supabase queries
   */
  static selectFields(fields?: string[]): string {
    if (!fields || fields.length === 0) {
      return '*';
    }

    // Remove duplicates and join
    return Array.from(new Set(fields)).join(',');
  }
  
  /**
   * Create optimized Supabase query builder
   */
  static optimizeSupabaseQuery<T extends SupabaseQueryLike>(
    query: T,
    options: QueryOptions = {}
  ): T {
    // Select specific fields if provided
    if (options.select && options.select.length > 0 && typeof query.select === 'function') {
      query = query.select(this.selectFields(options.select)) as T;
    }
    
    return query;
  }
  
  /**
   * Generate cache key for query
   */
  static generateCacheKey(
    table: string,
    filters: Record<string, unknown>,
    options?: QueryOptions
  ): string {
    const filterStr = JSON.stringify(filters);
    const optionsStr = options ? JSON.stringify(options) : '';
    return `query:${table}:${filterStr}:${optionsStr}`;
  }
  
  /**
   * Invalidate query cache
   */
  static invalidateQueryCache(table: string): number {
    return cache.invalidatePattern(`^query:${table}:`);
  }
  
  /**
   * Prefetch related data
   */
  static async prefetch<T>(
    keys: string[],
    fetchFn: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    console.log(`🔄 Prefetching ${keys.length} items`);
    
    await Promise.all(
      keys.map(async (key) => {
        try {
          const data = await fetchFn(key);
          cache.set(key, data, ttl);
        } catch (error) {
          console.error(`Failed to prefetch ${key}:`, error);
        }
      })
    );
  }
  
  /**
   * Optimize array of IDs for IN queries
   */
  static optimizeInQuery(ids: string[]): string[] {
    // Remove duplicates
    const unique = Array.from(new Set(ids));

    // Limit to reasonable size (PostgreSQL limit is ~65535)
    if (unique.length > 1000) {
      console.warn(`⚠️ IN query with ${unique.length} items, consider pagination`);
      return unique.slice(0, 1000);
    }

    return unique;
  }
  
  /**
   * Create index hint for query
   */
  static createIndexHint(indexName: string): string {
    return `/*+ INDEX(${indexName}) */`;
  }
  
  /**
   * Analyze query performance
   */
  static async analyzeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow query detected: ${queryName} took ${duration}ms`);
    } else {
      console.log(`✅ Query ${queryName} completed in ${duration}ms`);
    }
    
    return { result, duration };
  }
  
  /**
   * Chunk large datasets for processing
   */
  static async processInChunks<T, R>(
    items: T[],
    chunkSize: number,
    processFn: (chunk: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await processFn(chunk);
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  /**
   * Debounce query execution
   */
  static debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          resolve(fn(...args) as ReturnType<T>);
        }, delay);
      });
    };
  }
  
  /**
   * Memoize query results
   */
  static memoize<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    ttl: number = 60000
  ): T {
    const memoCache = new Map<string, { value: Awaited<ReturnType<T>>; expiresAt: number }>();
    
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const key = JSON.stringify(args);
      const cached = memoCache.get(key);
      
      if (cached && Date.now() < cached.expiresAt) {
        return cached.value as ReturnType<T>;
      }
      
      const result = await fn(...args);
      memoCache.set(key, {
        value: result as Awaited<ReturnType<T>>,
        expiresAt: Date.now() + ttl
      });
      
      return result as ReturnType<T>;
    }) as T;
  }
}

export default QueryOptimizer;
