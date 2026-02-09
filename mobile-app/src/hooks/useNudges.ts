/**
 * useNudges Hook
 * Manages AI nudge notifications for mobile app
 */

import { useState, useEffect, useCallback } from 'react';

type NudgeType =
  | 'motivational'
  | 'progress'
  | 'warning'
  | 'celebration'
  | 'reminder'
  | 'insight'
  | 'coaching';
type NudgeResponse = 'accepted' | 'dismissed' | 'snoozed';

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

const MOCK_NUDGES: Nudge[] = [
  {
    id: '1',
    nudgeType: 'insight',
    title: 'Spending Alert',
    message:
      'Your dining spending is 35% higher than last month. Consider reviewing your food budget.',
    actionLabel: 'View Budget',
    actionRoute: '/budget',
    createdAt: new Date().toISOString(),
    priority: 1,
  },
  {
    id: '2',
    nudgeType: 'celebration',
    title: '🎉 Goal Achieved!',
    message: "You've saved $500 this month - that's 20% more than your target!",
    createdAt: new Date().toISOString(),
    priority: 2,
  },
  {
    id: '3',
    nudgeType: 'coaching',
    title: 'Quick Tip',
    message:
      'Automating your savings can help you reach goals 2x faster. Would you like to set this up?',
    actionLabel: 'Set Up Auto-Save',
    actionRoute: '/savings/automation',
    createdAt: new Date().toISOString(),
    priority: 3,
  },
  {
    id: '4',
    nudgeType: 'reminder',
    title: 'Bill Due Soon',
    message: 'Your credit card payment of $450 is due in 3 days.',
    actionLabel: 'Pay Now',
    actionRoute: '/bills',
    createdAt: new Date().toISOString(),
    priority: 1,
  },
];

export function useNudges(): UseNudgesReturn {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNudges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/nudges');
      let nudgesData: Nudge[];
      if (response.ok) {
        const data = await response.json();
        nudgesData = data.nudges || [];
      } else {
        // Fallback to mock data if API unavailable
        nudgesData = MOCK_NUDGES;
      }
      const sortedNudges = [...nudgesData].sort(
        (a, b) => a.priority - b.priority
      );
      setNudges(sortedNudges);
      if (sortedNudges.length > 0 && !activeNudge) {
        setActiveNudge(sortedNudges[0]);
      }
    } catch (err) {
      // Fallback to mock data on network error
      const sortedNudges = [...MOCK_NUDGES].sort(
        (a, b) => a.priority - b.priority
      );
      setNudges(sortedNudges);
      if (sortedNudges.length > 0 && !activeNudge) {
        setActiveNudge(sortedNudges[0]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeNudge]);

  const respondToNudge = useCallback(
    async (nudgeId: string, nudgeResponse: NudgeResponse) => {
      try {
        // Optimistically update UI first
        setNudges((prev) => prev.filter((n) => n.id !== nudgeId));

        if (activeNudge?.id === nudgeId) {
          const remaining = nudges.filter((n) => n.id !== nudgeId);
          setActiveNudge(remaining.length > 0 ? remaining[0] : null);
        }

        // Persist response to API
        await fetch('/api/ai/nudges/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nudgeId, response: nudgeResponse }),
        });
      } catch (err) {
        // Don't revert UI - response was already recorded locally
      }
    },
    [activeNudge, nudges]
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
