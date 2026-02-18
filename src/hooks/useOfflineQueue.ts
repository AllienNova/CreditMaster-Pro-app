/**
 * useOfflineQueue Hook
 *
 * React hook for managing offline action queue
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getOfflineQueue, QueuedAction } from "@/lib/offline/OfflineQueue";
import { useOnline } from "./useOnline";

export interface UseOfflineQueueReturn {
  queue: QueuedAction[];
  pendingCount: number;
  isProcessing: boolean;
  addToQueue: (
    action: Omit<QueuedAction, "id" | "timestamp" | "retryCount" | "status">,
  ) => string;
  processQueue: () => Promise<void>;
  clearCompleted: () => void;
}

/**
 * Hook to manage offline action queue
 *
 * Automatically processes queue when coming back online
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline, wasOffline } = useOnline();

  const offlineQueue = getOfflineQueue();

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
    });

    // Initialize with current queue
    setQueue(offlineQueue.getQueue());

    return unsubscribe;
  }, [offlineQueue]);

  // Auto-process queue when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && offlineQueue.getPendingCount() > 0) {
      processQueue();
    }
  }, [isOnline, wasOffline]);

  const addToQueue = useCallback(
    (
      action: Omit<QueuedAction, "id" | "timestamp" | "retryCount" | "status">,
    ): string => {
      return offlineQueue.add(action);
    },
    [offlineQueue],
  );

  const processQueue = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await offlineQueue.processQueue();
    } finally {
      setIsProcessing(false);
    }
  }, [offlineQueue, isProcessing]);

  const clearCompleted = useCallback(() => {
    offlineQueue.clearCompleted();
  }, [offlineQueue]);

  const pendingCount = queue.filter((a) => a.status === "pending").length;

  return {
    queue,
    pendingCount,
    isProcessing,
    addToQueue,
    processQueue,
    clearCompleted,
  };
}
