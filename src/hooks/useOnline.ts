/**
 * useOnline Hook
 *
 * Detects online/offline status and provides network connectivity information
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

export interface UseOnlineReturn extends OnlineStatus {
  checkConnection: () => Promise<boolean>;
}

/**
 * Hook to detect and monitor online/offline status
 *
 * @returns Online status and connection checker
 */
export function useOnline(): UseOnlineReturn {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null);

  /**
   * Check actual network connectivity by pinging a reliable endpoint
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return true;

    try {
      // Try to fetch a small resource with no-cache to verify real connectivity
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial state
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastOnlineAt(new Date());
    } else {
      setLastOfflineAt(new Date());
      setWasOffline(true);
    }

    // Handle online event
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());

      // Verify actual connectivity
      checkConnection().then((connected) => {
        if (!connected) {
          // False positive - still offline
          setIsOnline(false);
        }
      });
    };

    // Handle offline event
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setLastOfflineAt(new Date());
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(async () => {
      const connected = await checkConnection();
      if (connected !== isOnline) {
        if (connected) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnection, isOnline]);

  return {
    isOnline,
    wasOffline,
    lastOnlineAt,
    lastOfflineAt,
    checkConnection,
  };
}
