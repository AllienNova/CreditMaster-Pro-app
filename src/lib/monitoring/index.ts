/**
 * Monitoring Module
 * 
 * Central export for all monitoring functionality:
 * - Logger: Structured logging
 * - Metrics: Performance and usage metrics
 * - Real-time Monitoring: Live event streaming
 */

export { logger } from './logger';
export { metrics } from './metrics';
export { 
  RealtimeMonitoringService,
  type RealtimeEvent,
  type EventType,
  type EventSubscription,
  type SystemHealthMetrics
} from './real-time-monitoring';

