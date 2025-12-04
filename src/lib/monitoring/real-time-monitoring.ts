/**
 * Real-time Monitoring Service
 * 
 * Provides real-time updates for:
 * - Workflow execution status
 * - Job execution status
 * - Dispute processing updates
 * - Document upload progress
 * - AI processing status
 * - System health metrics
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EventType =
  | 'workflow_started'
  | 'workflow_step_completed'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'job_started'
  | 'job_completed'
  | 'job_failed'
  | 'dispute_created'
  | 'dispute_updated'
  | 'dispute_resolved'
  | 'document_uploaded'
  | 'document_processed'
  | 'ai_processing_started'
  | 'ai_processing_completed'
  | 'ai_processing_failed'
  | 'system_health_update'
  | 'notification_received';

type EventMetadata = Record<string, unknown>;

export interface RealtimeEvent {
  id: string;
  type: EventType;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: EventMetadata;
}

export interface EventSubscription {
  id: string;
  userId: string;
  eventTypes: EventType[];
  callback: (event: RealtimeEvent) => void;
  createdAt: string;
}

export interface SystemHealthMetrics extends Record<string, number | string> {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  active_workflows: number;
  active_jobs: number;
  pending_disputes: number;
  api_response_time: number;
  error_rate: number;
}

// ============================================================================
// REAL-TIME MONITORING SERVICE
// ============================================================================

export class RealtimeMonitoringService {
  private static subscriptions: Map<string, EventSubscription> = new Map();
  private static eventHistory: Map<string, RealtimeEvent[]> = new Map();
  private static maxHistoryPerUser = 100;
  
  /**
   * Subscribe to real-time events
   */
  static subscribe(
    userId: string,
    eventTypes: EventType[],
    callback: (event: RealtimeEvent) => void
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      userId,
      eventTypes,
      callback,
      createdAt: new Date().toISOString()
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    console.log(`📡 User ${userId} subscribed to events: ${eventTypes.join(', ')}`);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from events
   */
  static unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      console.log(`📡 Unsubscribed: ${subscriptionId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Publish an event to subscribers
   */
  static publishEvent(event: Omit<RealtimeEvent, 'id' | 'timestamp'>): void {
    const fullEvent: RealtimeEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    // Add to history
    this.addToHistory(fullEvent);
    
    // Notify subscribers
    this.subscriptions.forEach(subscription => {
      if (
        subscription.userId === event.userId &&
        subscription.eventTypes.includes(event.type)
      ) {
        try {
          subscription.callback(fullEvent);
        } catch (error) {
          console.error(`Error in subscription callback: ${subscription.id}`, error);
        }
      }
    });
    
    console.log(`📡 Published event: ${event.type} for user ${event.userId}`);
  }
  
  /**
   * Add event to history
   */
  private static addToHistory(event: RealtimeEvent): void {
    const userHistory = this.eventHistory.get(event.userId) || [];
    userHistory.push(event);
    
    // Keep only last N events
    if (userHistory.length > this.maxHistoryPerUser) {
      userHistory.shift();
    }
    
    this.eventHistory.set(event.userId, userHistory);
  }
  
  /**
   * Get event history for a user
   */
  static getEventHistory(
    userId: string,
    eventTypes?: EventType[],
    limit?: number
  ): RealtimeEvent[] {
    const userHistory = this.eventHistory.get(userId) || [];
    
    let filtered = userHistory;
    
    if (eventTypes && eventTypes.length > 0) {
      filtered = userHistory.filter(event => eventTypes.includes(event.type));
    }
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered;
  }
  
  /**
   * Clear event history for a user
   */
  static clearEventHistory(userId: string): void {
    this.eventHistory.delete(userId);
    console.log(`📡 Cleared event history for user ${userId}`);
  }
  
  /**
   * Get active subscriptions for a user
   */
  static getUserSubscriptions(userId: string): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.userId === userId
    );
  }
  
  /**
   * Get all active subscriptions
   */
  static getAllSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }
  
  /**
   * Publish workflow event
   */
  static publishWorkflowEvent(
    userId: string,
    workflowId: string,
    status: 'started' | 'step_completed' | 'completed' | 'failed',
    data: Record<string, unknown>
  ): void {
    const eventTypeMap = {
      started: 'workflow_started' as EventType,
      step_completed: 'workflow_step_completed' as EventType,
      completed: 'workflow_completed' as EventType,
      failed: 'workflow_failed' as EventType
    };
    
    this.publishEvent({
      type: eventTypeMap[status],
      userId,
      data: {
        workflow_id: workflowId,
        ...data
      }
    });
  }
  
  /**
   * Publish job event
   */
  static publishJobEvent(
    userId: string,
    jobId: string,
    status: 'started' | 'completed' | 'failed',
    data: Record<string, unknown>
  ): void {
    const eventTypeMap = {
      started: 'job_started' as EventType,
      completed: 'job_completed' as EventType,
      failed: 'job_failed' as EventType
    };
    
    this.publishEvent({
      type: eventTypeMap[status],
      userId,
      data: {
        job_id: jobId,
        ...data
      }
    });
  }
  
  /**
   * Publish dispute event
   */
  static publishDisputeEvent(
    userId: string,
    disputeId: string,
    status: 'created' | 'updated' | 'resolved',
    data: Record<string, unknown>
  ): void {
    const eventTypeMap = {
      created: 'dispute_created' as EventType,
      updated: 'dispute_updated' as EventType,
      resolved: 'dispute_resolved' as EventType
    };
    
    this.publishEvent({
      type: eventTypeMap[status],
      userId,
      data: {
        dispute_id: disputeId,
        ...data
      }
    });
  }
  
  /**
   * Publish document event
   */
  static publishDocumentEvent(
    userId: string,
    documentId: string,
    status: 'uploaded' | 'processed',
    data: Record<string, unknown>
  ): void {
    const eventTypeMap = {
      uploaded: 'document_uploaded' as EventType,
      processed: 'document_processed' as EventType
    };
    
    this.publishEvent({
      type: eventTypeMap[status],
      userId,
      data: {
        document_id: documentId,
        ...data
      }
    });
  }
  
  /**
   * Publish AI processing event
   */
  static publishAIEvent(
    userId: string,
    requestId: string,
    status: 'started' | 'completed' | 'failed',
    data: Record<string, unknown>
  ): void {
    const eventTypeMap = {
      started: 'ai_processing_started' as EventType,
      completed: 'ai_processing_completed' as EventType,
      failed: 'ai_processing_failed' as EventType
    };
    
    this.publishEvent({
      type: eventTypeMap[status],
      userId,
      data: {
        request_id: requestId,
        ...data
      }
    });
  }
  
  /**
   * Publish system health update
   */
  static publishSystemHealth(metrics: SystemHealthMetrics): void {
    // Publish to all subscribed users
    const uniqueUserIds = new Set(
      Array.from(this.subscriptions.values()).map(sub => sub.userId)
    );
    
    uniqueUserIds.forEach(userId => {
      this.publishEvent({
        type: 'system_health_update',
        userId,
        data: metrics
      });
    });
  }
  
  /**
   * Get system statistics
   */
  static getStatistics(): {
    total_subscriptions: number;
    total_users: number;
    total_events: number;
    events_by_type: Record<string, number>;
  } {
    const totalEvents = Array.from(this.eventHistory.values()).reduce(
      (sum, events) => sum + events.length,
      0
    );
    
    const eventsByType: Record<string, number> = {};
    this.eventHistory.forEach(events => {
      events.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      });
    });
    
    return {
      total_subscriptions: this.subscriptions.size,
      total_users: this.eventHistory.size,
      total_events: totalEvents,
      events_by_type: eventsByType
    };
  }
  
  /**
   * Clear all subscriptions and history
   */
  static clearAll(): void {
    this.subscriptions.clear();
    this.eventHistory.clear();
    console.log('📡 Cleared all subscriptions and event history');
  }
}

export default RealtimeMonitoringService;
