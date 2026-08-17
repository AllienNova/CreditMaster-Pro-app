/**
 * useNudges Hook
 * Manages AI nudge notifications for mobile app
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api/client";

type NudgeType =
  | "motivational"
  | "progress"
  | "warning"
  | "celebration"
  | "reminder"
  | "insight"
  | "coaching";
type NudgeResponse = "accepted" | "dismissed" | "snoozed";

interface Nudge {
  id: string;
  nudgeType: NudgeType;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
  expiresAt?: string;
  priority: number;
}

interface UseNudgesReturn {
  nudges: Nudge[];
  activeNudge: Nudge | null;
  isLoading: boolean;
  error: string | null;
  respondToNudge: (nudgeId: string, response: NudgeResponse) => Promise<void>;
  fetchNudges: () => Promise<void>;
  dismissAll: () => void;
}

export function useNudges(): UseNudgesReturn {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNudges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ nudges: Nudge[] }>("/ai/nudges");
      if (res.success && res.data) {
        const sortedNudges = [...(res.data.nudges || [])].sort(
          (a, b) => a.priority - b.priority,
        );
        setNudges(sortedNudges);
        // Surface the highest-priority nudge if none is active yet.
        setActiveNudge((current) =>
          current ?? (sortedNudges.length > 0 ? sortedNudges[0] : null),
        );
      } else {
        // Honest failure: clear the feed and surface the error — never mock.
        setNudges([]);
        setActiveNudge(null);
        setError(
          res.error?.message ||
            res.message ||
            "Unable to load recommendations. Please try again.",
        );
      }
    } catch (err) {
      // Honest failure on an unexpected/thrown error — never mock.
      setNudges([]);
      setActiveNudge(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load recommendations. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const respondToNudge = useCallback(
    async (nudgeId: string, nudgeResponse: NudgeResponse) => {
      try {
        // Optimistically update UI first
        setNudges((prev) => prev.filter((n) => n.id !== nudgeId));

        if (activeNudge?.id === nudgeId) {
          const remaining = nudges.filter((n) => n.id !== nudgeId);
          setActiveNudge(remaining.length > 0 ? remaining[0] : null);
        }

        // POST /ai/nudges IS the record-response endpoint (its own docblock
        // says so). /ai/nudges/respond has never existed, and the field is
        // `action`, not `response` — so this call 404'd on every nudge anyone
        // ever answered, and nothing was recorded.
        const res = await api.post("/ai/nudges", {
          nudgeId,
          action: nudgeResponse,
        });

        if (!res.success) {
          // The nudge is already gone from the list above. Say so rather than
          // let it silently return on the next launch.
          setError("We could not save that. It may reappear later.");
        }
      } catch (err) {
        console.error("Failed to record nudge response:", err);
        setError("We could not save that. It may reappear later.");
      }
    },
    [activeNudge, nudges],
  );

  const dismissAll = useCallback(() => {
    setNudges([]);
    setActiveNudge(null);
  }, []);

  useEffect(() => {
    fetchNudges();
  }, []);

  return {
    nudges,
    activeNudge,
    isLoading,
    error,
    respondToNudge,
    fetchNudges,
    dismissAll,
  };
}

export default useNudges;
