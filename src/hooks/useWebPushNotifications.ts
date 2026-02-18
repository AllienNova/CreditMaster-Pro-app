/**
 * useWebPushNotifications Hook
 *
 * React hook for managing Web Push notifications in the browser:
 * - Permission management
 * - Subscription handling
 * - Service worker registration
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { webPushClient } from "@/lib/notifications/web-push-service";

export type PushPermissionStatus =
  | NotificationPermission
  | "unsupported"
  | "loading";

export interface UseWebPushNotificationsReturn {
  /** Whether push notifications are supported in this browser */
  isSupported: boolean;
  /** Current permission status */
  permission: PushPermissionStatus;
  /** Whether the user is currently subscribed */
  isSubscribed: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Request notification permission */
  requestPermission: () => Promise<NotificationPermission>;
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Check current subscription status */
  checkSubscription: () => Promise<boolean>;
}

export function useWebPushNotifications(
  userId?: string,
): UseWebPushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionStatus>("loading");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check support and initial permission on mount
  useEffect(() => {
    const supported = webPushClient.isSupported();
    setIsSupported(supported);

    if (supported) {
      setPermission(webPushClient.getPermissionStatus());
    } else {
      setPermission("unsupported");
    }
  }, []);

  // Fetch VAPID public key
  useEffect(() => {
    async function fetchVapidKey() {
      try {
        const response = await fetch("/api/notifications/push/vapid-key");
        if (response.ok) {
          const data = await response.json();
          setVapidPublicKey(data.publicKey);
        }
      } catch (err) {
        // Failed to fetch VAPID key
      }
    }

    if (isSupported) {
      fetchVapidKey();
    }
  }, [isSupported]);

  // Check subscription status when permission is granted
  useEffect(() => {
    if (permission === "granted") {
      checkSubscription();
    }
  }, [permission]);

  /**
   * Check if user is currently subscribed
   */
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const subscription = await webPushClient.getSubscription();
      const subscribed = subscription !== null;
      setIsSubscribed(subscribed);
      return subscribed;
    } catch (err) {
      // Failed to check subscription
      return false;
    }
  }, [isSupported]);

  /**
   * Request notification permission from user
   */
  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!isSupported) {
        setError("Push notifications are not supported in this browser");
        return "denied";
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await webPushClient.requestPermission();
        setPermission(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Permission request failed";
        setError(message);
        return "denied";
      } finally {
        setIsLoading(false);
      }
    }, [isSupported]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push notifications are not supported");
      return false;
    }

    if (!vapidPublicKey) {
      setError("Push notification service is not configured");
      return false;
    }

    if (permission !== "granted") {
      const newPermission = await requestPermission();
      if (newPermission !== "granted") {
        setError("Notification permission denied");
        return false;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Subscribe to push via service worker
      const subscription = await webPushClient.subscribe(vapidPublicKey);

      if (!subscription) {
        throw new Error("Failed to create push subscription");
      }

      // Register subscription with backend
      if (userId) {
        const response = await fetch("/api/notifications/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            subscription,
            userAgent: navigator.userAgent,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to register subscription with server");
        }
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Subscription failed";
      setError(message);
      // Push subscription error - state updated
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidPublicKey, permission, userId, requestPermission]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      // Get current subscription before unsubscribing
      const currentSubscription = await webPushClient.getSubscription();

      // Unsubscribe from push manager
      const success = await webPushClient.unsubscribe();

      if (!success) {
        throw new Error("Failed to unsubscribe from push notifications");
      }

      // Remove subscription from backend
      if (userId && currentSubscription?.endpoint) {
        await fetch(
          `/api/notifications/push/subscribe?userId=${userId}&endpoint=${encodeURIComponent(currentSubscription.endpoint)}`,
          { method: "DELETE" },
        );
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unsubscribe failed";
      setError(message);
      // Push unsubscribe error - state updated
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}

export default useWebPushNotifications;
