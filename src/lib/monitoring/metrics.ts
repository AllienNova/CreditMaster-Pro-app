/**
 * Metrics and Monitoring Service
 * 
 * Tracks and reports:
 * - Application performance metrics
 * - Business metrics
 * - System health
 * - Custom metrics
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  timestamp: Date;
  responseTime?: number;
}

/**
 * Metrics collector
 */
class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  
  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      timestamp: new Date(),
      tags,
      type: 'counter',
    });
  }
  
  /**
   * Decrement a counter
   */
  decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }
  
  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value);
    
    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'gauge',
    });
  }
  
  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'histogram',
    });
  }
  
  /**
   * Record a timer value (duration in milliseconds)
   */
  timer(name: string, duration: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value: duration,
      timestamp: new Date(),
      tags,
      type: 'timer',
    });
  }
  
  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    const existing = this.metrics.get(metric.name) || [];
    existing.push(metric);
    
    // Keep only last 1000 metrics per name
    if (existing.length > 1000) {
      existing.shift();
    }
    
    this.metrics.set(metric.name, existing);
  }
  
  /**
   * Get counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }
  
  /**
   * Get gauge value
   */
  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }
  
  /**
   * Get metrics for a name
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }
  
  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, Metric[]> {
    const result: Record<string, Metric[]> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
  }
  
  /**
   * Get statistics for a metric
   */
  getStats(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return null;
    }
    
    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

/**
 * Application metrics
 */
export const AppMetrics = {
  // API metrics
  apiRequestTotal: 'api.request.total',
  apiRequestDuration: 'api.request.duration',
  apiRequestErrors: 'api.request.errors',
  
  // AI metrics
  aiRequestTotal: 'ai.request.total',
  aiRequestDuration: 'ai.request.duration',
  aiRequestTokens: 'ai.request.tokens',
  aiRequestCost: 'ai.request.cost',
  aiRequestErrors: 'ai.request.errors',
  
  // Security metrics
  authAttempts: 'auth.attempts',
  authFailures: 'auth.failures',
  rateLimitExceeded: 'rate_limit.exceeded',
  inputValidationFailed: 'input.validation.failed',
  outputValidationFailed: 'output.validation.failed',
  
  // Business metrics
  disputesGenerated: 'disputes.generated',
  analysesCompleted: 'analyses.completed',
  loansCalculated: 'loans.calculated',
  
  // System metrics
  memoryUsage: 'system.memory.usage',
  cpuUsage: 'system.cpu.usage',
  activeConnections: 'system.connections.active',
};

/**
 * Track API request
 */
export function trackAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void {
  metrics.increment(AppMetrics.apiRequestTotal, 1, { method, path, status: statusCode.toString() });
  metrics.timer(AppMetrics.apiRequestDuration, duration, { method, path });
  
  if (statusCode >= 400) {
    metrics.increment(AppMetrics.apiRequestErrors, 1, { method, path, status: statusCode.toString() });
  }
}

/**
 * Track AI request
 */
export function trackAIRequest(
  model: string,
  duration: number,
  tokens: number,
  cost: number,
  success: boolean
): void {
  metrics.increment(AppMetrics.aiRequestTotal, 1, { model, success: success.toString() });
  metrics.timer(AppMetrics.aiRequestDuration, duration, { model });
  metrics.histogram(AppMetrics.aiRequestTokens, tokens, { model });
  metrics.histogram(AppMetrics.aiRequestCost, cost, { model });
  
  if (!success) {
    metrics.increment(AppMetrics.aiRequestErrors, 1, { model });
  }
}

/**
 * Track security event
 */
export function trackSecurityEvent(
  event: 'auth_attempt' | 'auth_failure' | 'rate_limit' | 'input_validation' | 'output_validation',
  details?: Record<string, string>
): void {
  switch (event) {
    case 'auth_attempt':
      metrics.increment(AppMetrics.authAttempts, 1, details);
      break;
    case 'auth_failure':
      metrics.increment(AppMetrics.authFailures, 1, details);
      break;
    case 'rate_limit':
      metrics.increment(AppMetrics.rateLimitExceeded, 1, details);
      break;
    case 'input_validation':
      metrics.increment(AppMetrics.inputValidationFailed, 1, details);
      break;
    case 'output_validation':
      metrics.increment(AppMetrics.outputValidationFailed, 1, details);
      break;
  }
}

/**
 * Track business metric
 */
export function trackBusinessMetric(
  metric: 'dispute' | 'analysis' | 'loan',
  details?: Record<string, string>
): void {
  switch (metric) {
    case 'dispute':
      metrics.increment(AppMetrics.disputesGenerated, 1, details);
      break;
    case 'analysis':
      metrics.increment(AppMetrics.analysesCompleted, 1, details);
      break;
    case 'loan':
      metrics.increment(AppMetrics.loansCalculated, 1, details);
      break;
  }
}

/**
 * Track system metrics
 */
export function trackSystemMetrics(): void {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage();
    metrics.gauge(AppMetrics.memoryUsage, memory.heapUsed / 1024 / 1024); // MB
  }
}

/**
 * Health check registry
 */
class HealthCheckRegistry {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  
  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<HealthCheck>): void {
    this.checks.set(name, check);
  }
  
  /**
   * Run all health checks
   */
  async runAll(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];
    const promises: Promise<void>[] = [];
    
    this.checks.forEach((check, name) => {
      promises.push(
        check()
          .then(result => { results.push(result); })
          .catch(error => {
            results.push({
              name,
              status: 'unhealthy',
              message: error instanceof Error ? error.message : 'Health check failed',
              timestamp: new Date(),
            });
          })
      );
    });
    
    await Promise.all(promises);
    return results;
  }
  
  /**
   * Get overall health status
   */
  async getOverallStatus(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    const checks = await this.runAll();
    
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;
    
    if (unhealthy > 0) {
      return 'unhealthy';
    }
    if (degraded > 0) {
      return 'degraded';
    }
    return 'healthy';
  }
}

// Export singleton instance
export const healthChecks = new HealthCheckRegistry();

/**
 * Register default health checks
 */
export function registerDefaultHealthChecks(): void {
  // Database health check
  healthChecks.register('database', async () => {
    const start = Date.now();
    try {
      // In production, check database connection
      // For now, return healthy
      return {
        name: 'database',
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database check failed',
        timestamp: new Date(),
        responseTime: Date.now() - start,
      };
    }
  });
  
  // AIML API health check
  healthChecks.register('aiml_api', async () => {
    const start = Date.now();
    try {
      // In production, ping AIML API
      // For now, return healthy
      return {
        name: 'aiml_api',
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'aiml_api',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'AIML API check failed',
        timestamp: new Date(),
        responseTime: Date.now() - start,
      };
    }
  });
  
  // Memory health check
  healthChecks.register('memory', async () => {
    const start = Date.now();
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memory = process.memoryUsage();
        const heapUsedMB = memory.heapUsed / 1024 / 1024;
        const heapTotalMB = memory.heapTotal / 1024 / 1024;
        const usagePercent = (heapUsedMB / heapTotalMB) * 100;
        
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (usagePercent > 90) {
          status = 'unhealthy';
        } else if (usagePercent > 75) {
          status = 'degraded';
        }
        
        return {
          name: 'memory',
          status,
          message: `Heap usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`,
          timestamp: new Date(),
          responseTime: Date.now() - start,
        };
      }
      
      return {
        name: 'memory',
        status: 'healthy',
        timestamp: new Date(),
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Memory check failed',
        timestamp: new Date(),
        responseTime: Date.now() - start,
      };
    }
  });
}

// Auto-register default health checks
registerDefaultHealthChecks();

// Auto-track system metrics every minute
setInterval(trackSystemMetrics, 60 * 1000);

