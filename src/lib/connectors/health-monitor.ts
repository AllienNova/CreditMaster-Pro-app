/**
 * Health Monitor Service
 *
 * Advanced health monitoring for all connectors with:
 * - Configurable health check strategies
 * - Alerting and notifications
 * - Metrics collection
 * - Circuit breaker pattern
 */

import { ConnectorRegistry, getConnectorRegistry } from './registry';
import {
  ConnectorHealth,
  HealthStatus,
  ConnectorEvent,
  ConnectorType,
} from './types';

// =============================================================================
// Types
// =============================================================================

interface HealthMonitorConfig {
  checkIntervalMs: number;
  alertThresholds: {
    degradedLatencyMs: number;
    criticalLatencyMs: number;
    errorRatePercent: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenRequests: number;
  };
  notifications: {
    enabled: boolean;
    channels: ('console' | 'webhook' | 'email')[];
    webhookUrl?: string;
  };
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: Date | null;
  lastStateChange: Date;
  halfOpenAttempts: number;
}

interface HealthMetrics {
  provider: string;
  period: {
    start: Date;
    end: Date;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  uptime: number; // Percentage
  errorRate: number; // Percentage
}

interface HealthAlert {
  id: string;
  provider: string;
  severity: 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: HealthMonitorConfig = {
  checkIntervalMs: 30000, // 30 seconds
  alertThresholds: {
    degradedLatencyMs: 2000, // 2 seconds
    criticalLatencyMs: 5000, // 5 seconds
    errorRatePercent: 10, // 10% error rate
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeoutMs: 30000, // 30 seconds
    halfOpenRequests: 3,
  },
  notifications: {
    enabled: true,
    channels: ['console'],
  },
};

// =============================================================================
// Health Monitor
// =============================================================================

export class HealthMonitor {
  private registry: ConnectorRegistry;
  private config: HealthMonitorConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private latencyHistory: Map<string, number[]> = new Map();
  private requestCounts: Map<string, { success: number; failure: number }> = new Map();
  private alerts: HealthAlert[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = getConnectorRegistry();
  }

  // =============================================================================
  // Lifecycle
  // =============================================================================

  /**
   * Start the health monitor
   */
  start(): void {
    if (this.checkInterval) {
      // Health monitor:('Health monitor already running');
      return;
    }

    // Subscribe to registry events
    this.unsubscribe = this.registry.on((event) => this.handleEvent(event));

    // Register circuit breaker check with registry for enforcement
    if (this.config.circuitBreaker.enabled) {
      this.registry.setCircuitBreakerCheck((provider: string) => this.isRequestAllowed(provider));
    }

    // Start periodic health checks
    this.checkInterval = setInterval(() => {
      this.performHealthCheck().catch(() => {
        // Health monitor error silently caught
      });
    }, this.config.checkIntervalMs);

    // Perform initial health check
    this.performHealthCheck().catch(() => {
      // Health monitor error silently caught
    });

    // Health monitor started
  }

  /**
   * Stop the health monitor
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Health monitor:('Health monitor stopped');
  }

  // =============================================================================
  // Health Checks
  // =============================================================================

  /**
   * Perform health check on all connectors
   */
  async performHealthCheck(): Promise<Map<string, ConnectorHealth>> {
    const healthResults = await this.registry.checkAllHealth();

    for (const [provider, health] of healthResults) {
      // Record metrics
      this.recordLatency(provider, health.latencyMs);

      // Check thresholds and create alerts
      this.evaluateHealth(provider, health);

      // Update circuit breaker
      if (this.config.circuitBreaker.enabled) {
        this.updateCircuitBreaker(provider, health);
      }
    }

    return healthResults;
  }

  /**
   * Record latency for percentile calculations
   */
  private recordLatency(provider: string, latencyMs: number): void {
    if (!this.latencyHistory.has(provider)) {
      this.latencyHistory.set(provider, []);
    }

    const history = this.latencyHistory.get(provider)!;
    history.push(latencyMs);

    // Keep last 1000 samples
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Record request outcome
   */
  recordRequest(provider: string, success: boolean): void {
    if (!this.requestCounts.has(provider)) {
      this.requestCounts.set(provider, { success: 0, failure: 0 });
    }

    const counts = this.requestCounts.get(provider)!;
    if (success) {
      counts.success++;
    } else {
      counts.failure++;
    }
  }

  /**
   * Evaluate health and create alerts if needed
   */
  private evaluateHealth(provider: string, health: ConnectorHealth): void {
    const { alertThresholds } = this.config;

    // Check latency thresholds
    if (health.latencyMs > alertThresholds.criticalLatencyMs) {
      this.createAlert(provider, 'critical', 'high_latency',
        `Latency is critically high: ${health.latencyMs}ms`);
    } else if (health.latencyMs > alertThresholds.degradedLatencyMs) {
      this.createAlert(provider, 'warning', 'high_latency',
        `Latency is elevated: ${health.latencyMs}ms`);
    } else {
      // Resolve latency alerts
      this.resolveAlerts(provider, 'high_latency');
    }

    // Check error rate
    const counts = this.requestCounts.get(provider);
    if (counts) {
      const total = counts.success + counts.failure;
      if (total > 10) {
        const errorRate = (counts.failure / total) * 100;
        if (errorRate > alertThresholds.errorRatePercent) {
          this.createAlert(provider, 'error', 'high_error_rate',
            `Error rate is high: ${errorRate.toFixed(1)}%`);
        } else {
          this.resolveAlerts(provider, 'high_error_rate');
        }
      }
    }

    // Check health status
    if (health.status === 'down') {
      this.createAlert(provider, 'critical', 'provider_down',
        `Provider is down: ${health.errorMessage || 'Unknown error'}`);
    } else if (health.status === 'degraded') {
      this.createAlert(provider, 'warning', 'provider_degraded',
        `Provider is degraded: ${health.consecutiveFailures} consecutive failures`);
    } else {
      this.resolveAlerts(provider, 'provider_down');
      this.resolveAlerts(provider, 'provider_degraded');
    }
  }

  // =============================================================================
  // Circuit Breaker
  // =============================================================================

  /**
   * Update circuit breaker state based on health
   */
  private updateCircuitBreaker(provider: string, health: ConnectorHealth): void {
    const state = this.getCircuitBreakerState(provider);
    const { circuitBreaker } = this.config;

    switch (state.state) {
      case 'closed':
        if (health.status === 'down' || health.consecutiveFailures >= circuitBreaker.failureThreshold) {
          this.openCircuit(provider);
        }
        break;

      case 'open':
        // Check if reset timeout has passed
        if (state.lastStateChange &&
            Date.now() - state.lastStateChange.getTime() >= circuitBreaker.resetTimeoutMs) {
          this.halfOpenCircuit(provider);
        }
        break;

      case 'half-open':
        if (health.status === 'healthy') {
          state.halfOpenAttempts++;
          if (state.halfOpenAttempts >= circuitBreaker.halfOpenRequests) {
            this.closeCircuit(provider);
          }
        } else {
          this.openCircuit(provider);
        }
        break;
    }
  }

  /**
   * Get circuit breaker state for a provider
   */
  private getCircuitBreakerState(provider: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(provider)) {
      this.circuitBreakers.set(provider, {
        state: 'closed',
        failures: 0,
        lastFailure: null,
        lastStateChange: new Date(),
        halfOpenAttempts: 0,
      });
    }
    return this.circuitBreakers.get(provider)!;
  }

  private openCircuit(provider: string): void {
    const state = this.getCircuitBreakerState(provider);
    state.state = 'open';
    state.lastStateChange = new Date();
    state.halfOpenAttempts = 0;
    // Health monitor warning:(`Circuit breaker OPENED for ${provider}`);
    this.notify('warning', `Circuit breaker opened for ${provider}`);
  }

  private halfOpenCircuit(provider: string): void {
    const state = this.getCircuitBreakerState(provider);
    state.state = 'half-open';
    state.lastStateChange = new Date();
    state.halfOpenAttempts = 0;
    // Health monitor:(`Circuit breaker HALF-OPEN for ${provider}`);
  }

  private closeCircuit(provider: string): void {
    const state = this.getCircuitBreakerState(provider);
    state.state = 'closed';
    state.lastStateChange = new Date();
    state.failures = 0;
    state.halfOpenAttempts = 0;
    // Health monitor:(`Circuit breaker CLOSED for ${provider}`);
    this.notify('info', `Circuit breaker closed for ${provider}`);
  }

  /**
   * Check if requests are allowed for a provider
   */
  isRequestAllowed(provider: string): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return true;
    }

    const state = this.getCircuitBreakerState(provider);

    switch (state.state) {
      case 'closed':
        return true;
      case 'half-open':
        return state.halfOpenAttempts < this.config.circuitBreaker.halfOpenRequests;
      case 'open':
        return false;
      default:
        return true;
    }
  }

  /**
   * Get circuit breaker status for all providers
   */
  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  // =============================================================================
  // Alerts
  // =============================================================================

  /**
   * Create a new alert
   */
  private createAlert(
    provider: string,
    severity: 'warning' | 'error' | 'critical',
    type: string,
    message: string
  ): void {
    // Check if alert already exists
    const existing = this.alerts.find(
      (a) => a.provider === provider && a.type === type && !a.resolved
    );

    if (existing) {
      return; // Don't duplicate alerts
    }

    const alert: HealthAlert = {
      id: `${provider}-${type}-${Date.now()}`,
      provider,
      severity,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Notify
    this.notify(severity, message);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Resolve alerts of a specific type
   */
  private resolveAlerts(provider: string, type: string): void {
    for (const alert of this.alerts) {
      if (alert.provider === provider && alert.type === type && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
      }
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): HealthAlert[] {
    return [...this.alerts];
  }

  // =============================================================================
  // Metrics
  // =============================================================================

  /**
   * Get health metrics for a provider
   */
  getMetrics(provider: string): HealthMetrics | null {
    const latency = this.latencyHistory.get(provider);
    const counts = this.requestCounts.get(provider);

    if (!latency && !counts) {
      return null;
    }

    const sortedLatency = [...(latency || [])].sort((a, b) => a - b);
    const total = (counts?.success || 0) + (counts?.failure || 0);

    return {
      provider,
      period: {
        start: new Date(Date.now() - 3600000), // Last hour approximation
        end: new Date(),
      },
      requests: {
        total,
        successful: counts?.success || 0,
        failed: counts?.failure || 0,
      },
      latency: {
        avg: sortedLatency.length > 0
          ? sortedLatency.reduce((a, b) => a + b, 0) / sortedLatency.length
          : 0,
        p50: this.percentile(sortedLatency, 50),
        p95: this.percentile(sortedLatency, 95),
        p99: this.percentile(sortedLatency, 99),
        max: sortedLatency.length > 0 ? Math.max(...sortedLatency) : 0,
      },
      uptime: total > 0 ? ((counts?.success || 0) / total) * 100 : 100,
      errorRate: total > 0 ? ((counts?.failure || 0) / total) * 100 : 0,
    };
  }

  /**
   * Get metrics for all providers
   */
  getAllMetrics(): Map<string, HealthMetrics> {
    const allMetrics = new Map<string, HealthMetrics>();

    const providers = new Set([
      ...this.latencyHistory.keys(),
      ...this.requestCounts.keys(),
    ]);

    for (const provider of providers) {
      const metrics = this.getMetrics(provider);
      if (metrics) {
        allMetrics.set(provider, metrics);
      }
    }

    return allMetrics;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  // =============================================================================
  // Notifications
  // =============================================================================

  /**
   * Send notification
   */
  private notify(
    level: 'info' | 'warning' | 'error' | 'critical',
    message: string
  ): void {
    if (!this.config.notifications.enabled) return;

    for (const channel of this.config.notifications.channels) {
      switch (channel) {
        case 'console':
          this.notifyConsole(level, message);
          break;
        case 'webhook':
          this.notifyWebhook(level, message).catch(() => {
            // Webhook notification error silently caught
          });
          break;
        case 'email':
          // Email notifications require RESEND_API_KEY configuration
          // Integration available via notification-service when configured
          if (level === 'critical' || level === 'error') {
            // Health monitor:(`[HealthMonitor] Email notification queued: ${level} - ${message}`);
          }
          break;
      }
    }
  }

  private notifyConsole(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = `[HealthMonitor] [${level.toUpperCase()}]`;

    switch (level) {
      case 'critical':
      case 'error':
        // Health monitor error:(`${prefix} ${timestamp}: ${message}`);
        break;
      case 'warning':
        // Health monitor warning:(`${prefix} ${timestamp}: ${message}`);
        break;
      default:
        // Health monitor:(`${prefix} ${timestamp}: ${message}`);
    }
  }

  private async notifyWebhook(level: string, message: string): Promise<void> {
    if (!this.config.notifications.webhookUrl) return;

    try {
      await fetch(this.config.notifications.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          service: 'fynvita-health-monitor',
        }),
      });
    } catch (error) {
      // Health monitor error:('Failed to send webhook notification:', error);
    }
  }

  // =============================================================================
  // Event Handling
  // =============================================================================

  /**
   * Handle connector events
   */
  private handleEvent(event: ConnectorEvent): void {
    switch (event.type) {
      case 'health_degraded':
        this.notify('warning', `Connector ${event.connector} health degraded`);
        break;
      case 'health_recovered':
        this.notify('info', `Connector ${event.connector} health recovered`);
        break;
      case 'error':
        this.recordRequest(event.connector, false);
        break;
      case 'fallback_triggered':
        this.notify('warning',
          `Fallback triggered from ${event.connector} to ${event.data.nextProvider}`);
        break;
    }
  }

  // =============================================================================
  // Dashboard Data
  // =============================================================================

  /**
   * Get comprehensive dashboard data
   */
  getDashboardData(): {
    health: Map<string, ConnectorHealth>;
    circuitBreakers: Map<string, CircuitBreakerState>;
    metrics: Map<string, HealthMetrics>;
    activeAlerts: HealthAlert[];
    summary: {
      totalProviders: number;
      healthy: number;
      degraded: number;
      down: number;
      avgLatencyMs: number;
      errorRate: number;
    };
  } {
    const health = this.registry.getAllHealth();
    const metrics = this.getAllMetrics();

    // Calculate summary
    let healthy = 0;
    let degraded = 0;
    let down = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let totalRequests = 0;
    let failedRequests = 0;

    for (const [, h] of health) {
      switch (h.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'down':
          down++;
          break;
      }
      if (h.latencyMs > 0) {
        totalLatency += h.latencyMs;
        latencyCount++;
      }
    }

    for (const [, m] of metrics) {
      totalRequests += m.requests.total;
      failedRequests += m.requests.failed;
    }

    return {
      health,
      circuitBreakers: this.getCircuitBreakerStatus(),
      metrics,
      activeAlerts: this.getActiveAlerts(),
      summary: {
        totalProviders: health.size,
        healthy,
        degraded,
        down,
        avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
        errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      },
    };
  }
}

// Export singleton
let healthMonitorInstance: HealthMonitor | null = null;

export function getHealthMonitor(config?: Partial<HealthMonitorConfig>): HealthMonitor {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor(config);
  }
  return healthMonitorInstance;
}

export default HealthMonitor;
