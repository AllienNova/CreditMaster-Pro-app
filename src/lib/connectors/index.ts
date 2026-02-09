/**
 * Connectors Module
 *
 * Unified connector layer for all external service integrations.
 * Provides multi-provider support with automatic fallback, health monitoring,
 * and region-based routing.
 */

// Core types and interfaces
export * from './types';

// Registry
export { ConnectorRegistry, getConnectorRegistry } from './registry';

// Health monitoring
export { HealthMonitor, getHealthMonitor } from './health-monitor';

// Banking connectors
export * from './banking';

// Market data connectors
export * from './market-data';

// Insurance connectors
export * from './insurance';

// Payment connectors
export * from './payments';
