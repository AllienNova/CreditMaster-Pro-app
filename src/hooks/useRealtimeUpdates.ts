/**
 * React Hook for Realtime Updates
 * 
 * Provides easy-to-use hooks for subscribing to real-time data changes
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  subscribeToCreditScores,
  subscribeToDisputes,
  subscribeToNotifications,
  RealtimeSubscription
} from '@/lib/realtime/supabase-realtime';

interface DisputeData {
  id: string;
  user_id: string;
  status: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface DisputeUpdate {
  dispute: DisputeData;
  eventType: string;
  timestamp: Date;
}

/**
 * Hook for real-time credit score updates
 */
export function useRealtimeCreditScore(userId: string | null) {
  const [score, setScore] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToCreditScores(userId, (newScore, scoreChange) => {
      setScore(newScore);
      setChange(scoreChange);
      setLastUpdated(new Date());
    });

    return () => subscription.unsubscribe();
  }, [userId]);

  return { score, change, lastUpdated };
}

/**
 * Hook for real-time dispute updates
 */
export function useRealtimeDisputes(userId: string | null) {
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<DisputeUpdate | null>(null);

  const handleUpdate = useCallback((dispute: DisputeData, eventType: string) => {
    setLatestUpdate({ dispute, eventType, timestamp: new Date() });
    
    setDisputes(prev => {
      if (eventType === 'INSERT') {
        return [dispute, ...prev];
      }
      if (eventType === 'UPDATE') {
        return prev.map(d => d.id === dispute.id ? dispute : d);
      }
      if (eventType === 'DELETE') {
        return prev.filter(d => d.id !== dispute.id);
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToDisputes(userId, handleUpdate);

    return () => subscription.unsubscribe();
  }, [userId, handleUpdate]);

  return { disputes, latestUpdate };
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToNotifications(userId, (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      setLatestNotification(notification);
    });

    return () => subscription.unsubscribe();
  }, [userId]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    latestNotification,
    markAsRead,
    markAllAsRead
  };
}

/**
 * Combined hook for dashboard real-time updates
 */
export function useDashboardRealtime(userId: string | null) {
  const creditScore = useRealtimeCreditScore(userId);
  const disputes = useRealtimeDisputes(userId);
  const notifications = useRealtimeNotifications(userId);

  return {
    creditScore,
    disputes,
    notifications,
    hasUpdates: !!(
      creditScore.lastUpdated ||
      disputes.latestUpdate ||
      notifications.latestNotification
    )
  };
}

/**
 * Hook for connection status
 */
export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
      setLastPing(new Date());
    };

    window.addEventListener('online', () => setIsConnected(true));
    window.addEventListener('offline', () => setIsConnected(false));

    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', () => setIsConnected(true));
      window.removeEventListener('offline', () => setIsConnected(false));
      clearInterval(interval);
    };
  }, []);

  return { isConnected, lastPing };
}

