/**
 * Performance Monitor
 * 
 * Monitors and tracks application performance:
 * - API response times
 * - Database query times
 * - Memory usage
 * - Cache hit rates
 */

import { cache } from '@/lib/cache/cache-service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type MetricMetadata = Record<string, unknown>;

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: MetricMetadata;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    total_requests: number;
    avg_response_time: number;
    min_response_time: number;
    max_response_time: number;
    p50: number;
    p95: number;
    p99: number;
  };
  cache_stats: {
    hits: number;
    misses: number;
    hit_rate: number;
  };
  memory: {
    used_mb: number;
    total_mb: number;
    percentage: number;
  };
}

// ============================================================================
// PERFORMANCE MONITOR CLASS
// ============================================================================

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static maxMetrics: number = 1000;
  
  /**
   * Start timing an operation
   */
  static startTimer(name: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(name, duration);
    };
  }
  
  /**
   * Record a performance metric
   */
  static recordMetric(
    name: string,
    duration: number,
    metadata?: MetricMetadata
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // Log slow operations
    if (duration > 1000) {
      // Slow operation detected - metrics recorded
    }
  }
  
  /**
   * Measure async function execution time
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: MetricMetadata
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.recordMetric(name, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }
  
  /**
   * Get performance report
   */
  static getReport(): PerformanceReport {
    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const total = durations.length;
    
    const summary = {
      total_requests: total,
      avg_response_time: total > 0 ? durations.reduce((a, b) => a + b, 0) / total : 0,
      min_response_time: total > 0 ? durations[0] : 0,
      max_response_time: total > 0 ? durations[total - 1] : 0,
      p50: this.calculatePercentile(durations, 50),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99)
    };
    
    const cacheStats = cache.getStats();

    const memoryUsage = process.memoryUsage();
    const memory = {
      used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    };

    return {
      metrics: this.metrics.slice(-100), // Last 100 metrics
      summary,
      cache_stats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hit_rate: cacheStats.hitRate
      },
      memory
    };
  }
  
  /**
   * Calculate percentile
   */
  private static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }
  
  /**
   * Get metrics by name
   */
  static getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }
  
  /**
   * Get slow operations
   */
  static getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }
  
  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * Get memory usage
   */
  static getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const usage = process.memoryUsage();
    
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024) // MB
    };
  }
  
  /**
   * Get CPU usage
   */
  static getCPUUsage(): {
    user: number;
    system: number;
  } {
    const usage = process.cpuUsage();
    
    return {
      user: Math.round(usage.user / 1000), // milliseconds
      system: Math.round(usage.system / 1000) // milliseconds
    };
  }
  
  /**
   * Create performance middleware for API routes
   */
  static createMiddleware() {
    return async (req: Request, handler: () => Promise<Response>): Promise<Response> => {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;
      
      const endTimer = this.startTimer(`${method} ${path}`);
      
      try {
        const response = await handler();
        endTimer();
        return response;
      } catch (error) {
        endTimer();
        throw error;
      }
    };
  }
  
  /**
   * Log performance summary
   */
  static logSummary(): void {
    // Performance summary is available via getReport() for monitoring dashboards
    // No console logging in production
  }
  
  /**
   * Start periodic performance logging
   */
  static startPeriodicLogging(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.logSummary();
    }, intervalMs);
  }
}

export default PerformanceMonitor;
