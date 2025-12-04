/**
 * useRealtimeEvents Hook
 * 
 * React hook for subscribing to real-time events via Server-Sent Events (SSE)
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { RealtimeEvent, EventType } from '@/lib/monitoring/real-time-monitoring';

interface UseRealtimeEventsOptions {
  eventTypes?: EventType[];
  onEvent?: (event: RealtimeEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

interface UseRealtimeEventsReturn {
  events: RealtimeEvent[];
  isConnected: boolean;
  error: Error | null;
  clearEvents: () => void;
  reconnect: () => void;
}

export function useRealtimeEvents(
  options: UseRealtimeEventsOptions = {}
): UseRealtimeEventsReturn {
  const {
    eventTypes,
    onEvent,
    onError,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectDelay = 3000
  } = options;
  
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  
  const connect = useCallback(() => {
    // Clear any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Build URL with event types
    const url = new URL('/api/monitoring/events', window.location.origin);
    if (eventTypes && eventTypes.length > 0) {
      url.searchParams.set('event_types', eventTypes.join(','));
    }
    
    try {
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('📡 SSE connection opened');
        setIsConnected(true);
        setError(null);
        onConnect?.();
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip connection and heartbeat messages
          if (data.type === 'connected') {
            console.log('📡 SSE connected:', data.userId);
            return;
          }
          
          // Handle real-time event
          const realtimeEvent = data as RealtimeEvent;
          setEvents(prev => [...prev, realtimeEvent]);
          onEvent?.(realtimeEvent);
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('📡 SSE error:', err);
        setIsConnected(false);
        
        const error = new Error('SSE connection error');
        setError(error);
        onError?.(error);
        onDisconnect?.();
        
        // Auto-reconnect if enabled
        if (autoReconnect && shouldReconnectRef.current) {
          console.log(`📡 Reconnecting in ${reconnectDelay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect');
      console.error('📡 Failed to create SSE connection:', error);
      setError(error);
      onError?.(error);
    }
  }, [eventTypes, onEvent, onError, onConnect, onDisconnect, autoReconnect, reconnectDelay]);
  
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    console.log('📡 SSE connection closed');
  }, []);
  
  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    connect();
  }, [connect, disconnect]);
  
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);
  
  // Connect on mount
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    events,
    isConnected,
    error,
    clearEvents,
    reconnect
  };
}

/**
 * Hook for specific event types
 */
export function useWorkflowEvents() {
  return useRealtimeEvents({
    eventTypes: ['workflow_started', 'workflow_step_completed', 'workflow_completed', 'workflow_failed']
  });
}

export function useJobEvents() {
  return useRealtimeEvents({
    eventTypes: ['job_started', 'job_completed', 'job_failed']
  });
}

export function useDisputeEvents() {
  return useRealtimeEvents({
    eventTypes: ['dispute_created', 'dispute_updated', 'dispute_resolved']
  });
}

export function useDocumentEvents() {
  return useRealtimeEvents({
    eventTypes: ['document_uploaded', 'document_processed']
  });
}

export function useAIEvents() {
  return useRealtimeEvents({
    eventTypes: ['ai_processing_started', 'ai_processing_completed', 'ai_processing_failed']
  });
}

