/**
 * Fynvita Push Notifications Hook
 * React hook for managing push notifications
 */

import { useEffect, useState, useCallback } from 'react';
import { pushNotificationService } from '../services/notifications';

interface UsePushNotificationsReturn {
  isEnabled: boolean;
  isInitialized: boolean;
  token: string | null;
  badgeCount: number;
  initialize: () => Promise<boolean>;
  setBadgeCount: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
  scheduleNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => Promise<string>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [badgeCount, setBadgeCountState] = useState(0);

  useEffect(() => {
    // Check initial state
    const checkStatus = async () => {
      const enabled = await pushNotificationService.areNotificationsEnabled();
      setIsEnabled(enabled);
      
      const count = await pushNotificationService.getBadgeCount();
      setBadgeCountState(count);
      
      const currentToken = pushNotificationService.getToken();
      setToken(currentToken);
    };

    checkStatus();

    // Cleanup on unmount
    return () => {
      pushNotificationService.cleanup();
    };
  }, []);

  const initialize = useCallback(async () => {
    const success = await pushNotificationService.initialize();
    setIsInitialized(true);
    setIsEnabled(success);
    
    if (success) {
      setToken(pushNotificationService.getToken());
    }
    
    return success;
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    await pushNotificationService.setBadgeCount(count);
    setBadgeCountState(count);
  }, []);

  const clearBadge = useCallback(async () => {
    await pushNotificationService.clearBadge();
    setBadgeCountState(0);
  }, []);

  const scheduleNotification = useCallback(
    async (title: string, body: string, data?: Record<string, unknown>) => {
      return await pushNotificationService.scheduleLocalNotification(title, body, data);
    },
    []
  );

  return {
    isEnabled,
    isInitialized,
    token,
    badgeCount,
    initialize,
    setBadgeCount,
    clearBadge,
    scheduleNotification,
  };
}

