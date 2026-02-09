/**
 * Connector Registry
 *
 * Central registry for all external service connectors.
 * Provides:
 * - Multi-provider registration and discovery
 * - Automatic fallback on failure
 * - Health monitoring and status tracking
 * - Region-based provider selection
 * - Rate limiting coordination
 */

import {
  BaseConnector,
  ConnectorConfig,
  ConnectorHealth,
  ConnectorResult,
  ConnectorError,
  ConnectorType,
  ConnectorEvent,
  ConnectorEventHandler,
  ExecutionOptions,
  HealthStatus,
  HealthCheckResult,
  REGION_GROUPS,
} from './types';

// Circuit breaker check interface - avoids circular dependency
type CircuitBreakerCheck = (provider: string) => boolean;

// =============================================================================
// Registry Configuration
// =============================================================================

interface RegistryConfig {
  healthCheckIntervalMs: number;
  unhealthyThreshold: number; // Consecutive failures before marking unhealthy
  recoveryThreshold: number; // Consecutive successes before marking healthy
  defaultTimeout: number;
  enableAutoHealthCheck: boolean;
}

const DEFAULT_REGISTRY_CONFIG: RegistryConfig = {
  healthCheckIntervalMs: 60000, // 1 minute
  unhealthyThreshold: 3,
  recoveryThreshold: 2,
  defaultTimeout: 30000,
  enableAutoHealthCheck: true,
};

// =============================================================================
// Connector Registry
// =============================================================================

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;

  private connectors: Map<string, Map<string, BaseConnector>> = new Map();
  private healthStatus: Map<string, ConnectorHealth> = new Map();
  private eventHandlers: ConnectorEventHandler[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private config: RegistryConfig;
  private circuitBreakerCheck: CircuitBreakerCheck | null = null;

  private constructor(config: Partial<RegistryConfig> = {}) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
  }

  /**
   * Set the circuit breaker check function
   * Called by HealthMonitor to integrate circuit breaker enforcement
   */
  setCircuitBreakerCheck(check: CircuitBreakerCheck): void {
    this.circuitBreakerCheck = check;
  }

  static getInstance(config?: Partial<RegistryConfig>): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry(config);
    }
    return ConnectorRegistry.instance;
  }

  // For testing - reset singleton
  static resetInstance(): void {
    if (ConnectorRegistry.instance) {
      ConnectorRegistry.instance.shutdown();
      ConnectorRegistry.instance = null as any;
    }
  }

  // =============================================================================
  // Registration
  // =============================================================================

  /**
   * Register a connector with the registry
   */
  register<T extends ConnectorConfig>(
    type: ConnectorType,
    connector: BaseConnector<T>
  ): void {
    if (!this.connectors.has(type)) {
      this.connectors.set(type, new Map());
    }

    const typeConnectors = this.connectors.get(type)!;
    const providerName = connector.name;

    if (typeConnectors.has(providerName)) {
      // Registry warning: Connector already registered, replacing
    }

    typeConnectors.set(providerName, connector);

    // Initialize health status
    this.healthStatus.set(providerName, {
      provider: providerName,
      status: 'unknown',
      latencyMs: 0,
      lastCheck: new Date(),
      lastSuccess: null,
      consecutiveFailures: 0,
    });

    // Registry: Registered connector
  }

  /**
   * Unregister a connector
   */
  unregister(type: ConnectorType, providerName: string): boolean {
    const typeConnectors = this.connectors.get(type);
    if (!typeConnectors) return false;

    const connector = typeConnectors.get(providerName);
    if (connector) {
      connector.disconnect().catch(() => { /* Registry: disconnect error */ });
      typeConnectors.delete(providerName);
      this.healthStatus.delete(providerName);
      return true;
    }
    return false;
  }

  // =============================================================================
  // Provider Discovery
  // =============================================================================

  /**
   * Get all registered connectors of a type
   */
  getConnectors(type: ConnectorType): BaseConnector[] {
    const typeConnectors = this.connectors.get(type);
    if (!typeConnectors) return [];
    return Array.from(typeConnectors.values());
  }

  /**
   * Get a specific connector by name
   */
  getConnector<T extends BaseConnector = BaseConnector>(
    type: ConnectorType,
    providerName: string
  ): T | undefined {
    const typeConnectors = this.connectors.get(type);
    if (!typeConnectors) return undefined;
    return typeConnectors.get(providerName) as T | undefined;
  }

  /**
   * Get available providers for a type, sorted by priority
   * Enforces circuit breaker if configured
   */
  getAvailableProviders(type: ConnectorType, region?: string): string[] {
    const typeConnectors = this.connectors.get(type);
    if (!typeConnectors) return [];

    let connectors = Array.from(typeConnectors.values());

    // Filter by region if specified
    if (region) {
      const expandedRegions = this.expandRegion(region);
      connectors = connectors.filter((c) =>
        c.getRegions().some((r) => r === '*' || expandedRegions.includes(r))
      );
    }

    // Filter by health (exclude 'down' providers)
    connectors = connectors.filter((c) => {
      const health = this.healthStatus.get(c.name);
      return !health || health.status !== 'down';
    });

    // Enforce circuit breaker - exclude providers with open circuits
    if (this.circuitBreakerCheck) {
      connectors = connectors.filter((c) => {
        const allowed = this.circuitBreakerCheck!(c.name);
        if (!allowed) {
          this.emit({
            type: 'circuit_open',
            connector: c.name,
            timestamp: new Date(),
            data: { reason: 'circuit_breaker_open' },
          });
        }
        return allowed;
      });
    }

    // Sort by priority (lower = higher priority)
    connectors.sort((a, b) => a.getPriority() - b.getPriority());

    return connectors.map((c) => c.name);
  }

  /**
   * Get the best provider for a type and region
   */
  getBestProvider(type: ConnectorType, region?: string): string | undefined {
    const providers = this.getAvailableProviders(type, region);
    return providers[0];
  }

  /**
   * Expand region wildcards to specific regions
   */
  private expandRegion(region: string): string[] {
    if (REGION_GROUPS[region]) {
      return [region, ...REGION_GROUPS[region]];
    }
    return [region];
  }

  // =============================================================================
  // Execution with Fallback
  // =============================================================================

  /**
   * Execute a method on a connector with automatic fallback
   */
  async executeWithFallback<T>(
    type: ConnectorType,
    method: string,
    args: unknown[],
    options: ExecutionOptions = {}
  ): Promise<ConnectorResult<T>> {
    const {
      preferredProvider,
      region,
      timeout = this.config.defaultTimeout,
      skipCache = false,
      maxRetries = 2,
      fallbackEnabled = true,
    } = options;

    // Get providers in order
    let providers = this.getAvailableProviders(type, region);

    // Prioritize preferred provider if specified
    if (preferredProvider && providers.includes(preferredProvider)) {
      providers = [preferredProvider, ...providers.filter((p) => p !== preferredProvider)];
    }

    if (providers.length === 0) {
      return {
        success: false,
        provider: 'none',
        cached: false,
        latencyMs: 0,
        error: {
          code: 'NO_PROVIDERS',
          message: `No available providers for type: ${type}${region ? ` in region: ${region}` : ''}`,
          provider: 'registry',
          retryable: false,
        },
      };
    }

    let lastError: ConnectorError | undefined;

    for (const providerName of providers) {
      const connector = this.getConnector(type, providerName);
      if (!connector) continue;

      // Check if connector is initialized
      if (!connector.isInitialized()) {
        try {
          await connector.initialize();
        } catch (initError) {
          // Registry error: Failed to initialize connector
          continue;
        }
      }

      // Try to execute
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();

        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(
            connector,
            method,
            args,
            timeout
          );

          const latencyMs = Date.now() - startTime;

          // Update health status on success
          this.recordSuccess(providerName, latencyMs);

          // Cache check happens at connector level - this response is fresh from provider
          return {
            success: true,
            data: result as T,
            provider: providerName,
            cached: false,
            latencyMs,
          };
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          const connectorError = this.normalizeError(error, providerName);

          // Update health status on failure
          this.recordFailure(providerName, connectorError);

          lastError = connectorError;

          // If error is not retryable, break retry loop
          if (!connectorError.retryable) {
            break;
          }

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await this.delay(Math.min(1000 * Math.pow(2, attempt), 10000));
          }
        }
      }

      // If fallback is disabled, stop after first provider
      if (!fallbackEnabled) {
        break;
      }

      // Emit fallback event
      this.emit({
        type: 'fallback_triggered',
        connector: providerName,
        timestamp: new Date(),
        data: { nextProvider: providers[providers.indexOf(providerName) + 1] },
      });
    }

    return {
      success: false,
      provider: providers[0],
      cached: false,
      latencyMs: 0,
      error: lastError || {
        code: 'ALL_PROVIDERS_FAILED',
        message: 'All providers failed to execute the request',
        provider: 'registry',
        retryable: true,
      },
    };
  }

  /**
   * Execute a method with timeout
   */
  private async executeWithTimeout(
    connector: BaseConnector,
    method: string,
    args: unknown[],
    timeout: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms`));
      }, timeout);

      const connectorMethod = (connector as any)[method];
      if (typeof connectorMethod !== 'function') {
        clearTimeout(timer);
        reject(new Error(`Method ${method} not found on connector ${connector.name}`));
        return;
      }

      connectorMethod
        .apply(connector, args)
        .then((result: unknown) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // =============================================================================
  // Health Monitoring
  // =============================================================================

  /**
   * Start automatic health checking
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkAllHealth().catch(() => { /* Registry: health check error */ });
    }, this.config.healthCheckIntervalMs);

    // Registry: Started health checks
  }

  /**
   * Stop automatic health checking
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      // Registry: Stopped health checks
    }
  }

  /**
   * Check health of all connectors
   */
  async checkAllHealth(): Promise<Map<string, ConnectorHealth>> {
    const results = new Map<string, ConnectorHealth>();

    for (const [type, typeConnectors] of this.connectors) {
      for (const [name, connector] of typeConnectors) {
        const health = await this.checkHealth(name, connector);
        results.set(name, health);
      }
    }

    return results;
  }

  /**
   * Check health of a specific connector
   */
  private async checkHealth(
    name: string,
    connector: BaseConnector
  ): Promise<ConnectorHealth> {
    const startTime = Date.now();
    const currentHealth = this.healthStatus.get(name) || {
      provider: name,
      status: 'unknown' as HealthStatus,
      latencyMs: 0,
      lastCheck: new Date(),
      lastSuccess: null,
      consecutiveFailures: 0,
    };

    try {
      const result = await connector.healthCheck();
      const latencyMs = Date.now() - startTime;

      if (result.success) {
        this.recordSuccess(name, latencyMs);
      } else {
        this.recordFailure(name, {
          code: 'HEALTH_CHECK_FAILED',
          message: result.error?.message || 'Health check failed',
          provider: name,
          retryable: true,
        });
      }
    } catch (error) {
      this.recordFailure(name, this.normalizeError(error, name));
    }

    return this.healthStatus.get(name)!;
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(name: string, latencyMs: number): void {
    const current = this.healthStatus.get(name);
    if (!current) return;

    const wasUnhealthy = current.status === 'down' || current.status === 'degraded';

    current.latencyMs = latencyMs;
    current.lastCheck = new Date();
    current.lastSuccess = new Date();

    if (current.consecutiveFailures > 0) {
      current.consecutiveFailures = 0;
    }

    // Update status
    if (current.status !== 'healthy') {
      current.status = 'healthy';
      current.errorMessage = undefined;

      if (wasUnhealthy) {
        this.emit({
          type: 'health_recovered',
          connector: name,
          timestamp: new Date(),
          data: { previousStatus: current.status },
        });
      }
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(name: string, error: ConnectorError): void {
    const current = this.healthStatus.get(name);
    if (!current) return;

    current.lastCheck = new Date();
    current.consecutiveFailures++;
    current.errorMessage = error.message;

    // Update status based on consecutive failures
    if (current.consecutiveFailures >= this.config.unhealthyThreshold) {
      if (current.status !== 'down') {
        current.status = 'down';
        this.emit({
          type: 'health_degraded',
          connector: name,
          timestamp: new Date(),
          data: { error, consecutiveFailures: current.consecutiveFailures },
        });
      }
    } else if (current.consecutiveFailures >= 1) {
      if (current.status === 'healthy') {
        current.status = 'degraded';
      }
    }
  }

  /**
   * Get health status for a provider
   */
  getHealth(providerName: string): ConnectorHealth | undefined {
    return this.healthStatus.get(providerName);
  }

  /**
   * Get health status for all providers
   */
  getAllHealth(): Map<string, ConnectorHealth> {
    return new Map(this.healthStatus);
  }

  // =============================================================================
  // Event Handling
  // =============================================================================

  /**
   * Subscribe to connector events
   */
  on(handler: ConnectorEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit a connector event
   */
  private emit(event: ConnectorEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        // Registry error: Error in event handler
      }
    }
  }

  // =============================================================================
  // Lifecycle
  // =============================================================================

  /**
   * Initialize all registered connectors
   */
  async initializeAll(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (const [type, typeConnectors] of this.connectors) {
      for (const [name, connector] of typeConnectors) {
        if (!connector.isInitialized()) {
          initPromises.push(
            connector.initialize().catch(() => {
              // Registry error: Failed to initialize connector
            })
          );
        }
      }
    }

    await Promise.all(initPromises);

    if (this.config.enableAutoHealthCheck) {
      this.startHealthChecks();
    }
  }

  /**
   * Shutdown the registry and all connectors
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();

    const disconnectPromises: Promise<void>[] = [];

    for (const [type, typeConnectors] of this.connectors) {
      for (const [name, connector] of typeConnectors) {
        disconnectPromises.push(
          connector.disconnect().catch(() => {
            // Registry error: Failed to disconnect connector
          })
        );
      }
    }

    await Promise.all(disconnectPromises);

    this.connectors.clear();
    this.healthStatus.clear();
    this.eventHandlers = [];
  }

  // =============================================================================
  // Utilities
  // =============================================================================

  /**
   * Normalize an error to ConnectorError format
   */
  private normalizeError(error: unknown, provider: string): ConnectorError {
    if (error instanceof Error) {
      const isRetryable =
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('rate limit');

      return {
        code: 'CONNECTOR_ERROR',
        message: error.message,
        provider,
        retryable: isRetryable,
        details: { stack: error.stack },
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      provider,
      retryable: true,
    };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalConnectors: number;
    connectorsByType: Record<string, number>;
    healthSummary: Record<HealthStatus, number>;
  } {
    const connectorsByType: Record<string, number> = {};
    let totalConnectors = 0;

    for (const [type, typeConnectors] of this.connectors) {
      connectorsByType[type] = typeConnectors.size;
      totalConnectors += typeConnectors.size;
    }

    const healthSummary: Record<HealthStatus, number> = {
      healthy: 0,
      degraded: 0,
      down: 0,
      unknown: 0,
    };

    for (const health of this.healthStatus.values()) {
      healthSummary[health.status]++;
    }

    return {
      totalConnectors,
      connectorsByType,
      healthSummary,
    };
  }
}

// Export singleton getter
export const getConnectorRegistry = ConnectorRegistry.getInstance;

export default ConnectorRegistry;
