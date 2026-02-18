"use client";

/**
 * useGamification Hook
 * React hook for integrating gamification throughout the app
 */

import { useState, useCallback, useEffect } from "react";
import type {
  GamificationProgressResponse,
  GameEventType,
  GameEventResult,
  StreakInfo,
} from "@/lib/gamification";

interface UseGamificationReturn {
  progress: GamificationProgressResponse | null;
  loading: boolean;
  error: string | null;
  triggerEvent: (
    eventType: GameEventType,
    metadata?: Record<string, unknown>,
  ) => Promise<GameEventResult | null>;
  checkIn: () => Promise<{ streak: StreakInfo; xpEarned: number } | null>;
  refreshProgress: () => Promise<void>;
}

export function useGamification(): UseGamificationReturn {
  const [progress, setProgress] = useState<GamificationProgressResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/gamification/progress");
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      } else {
        setError("Failed to fetch progress");
      }
    } catch (err) {
      setError("Network error");
      // Error captured in state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const triggerEvent = useCallback(
    async (
      eventType: GameEventType,
      metadata?: Record<string, unknown>,
    ): Promise<GameEventResult | null> => {
      try {
        const res = await fetch("/api/gamification/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, metadata }),
        });

        if (res.ok) {
          const result = await res.json();

          // Refresh progress after event
          await fetchProgress();

          return result;
        }
        return null;
      } catch (err) {
        // Failed to trigger game event
        return null;
      }
    },
    [fetchProgress],
  );

  const checkIn = useCallback(async (): Promise<{
    streak: StreakInfo;
    xpEarned: number;
  } | null> => {
    try {
      const res = await fetch("/api/gamification/progress", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await fetchProgress();
        return data;
      }
      return null;
    } catch (err) {
      // Check-in failed
      return null;
    }
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    triggerEvent,
    checkIn,
    refreshProgress: fetchProgress,
  };
}

export default useGamification;
