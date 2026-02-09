'use client';

/**
 * useAIInsights Hook
 * React hook for AI-powered insights and nudges
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  InsightsResponse,
  NudgeHistory,
  SpendingAnalysis,
  NudgeAction,
} from '@/lib/ai-personalization';

interface UseAIInsightsReturn {
  insights: InsightsResponse | null;
  nudges: NudgeHistory[];
  spendingAnalysis: SpendingAnalysis | null;
  loading: boolean;
  error: string | null;
  respondToNudge: (
    nudgeId: string,
    action: NudgeAction,
    feedback?: string
  ) => Promise<boolean>;
  refreshInsights: () => Promise<void>;
  analyzeTransaction: (transaction: {
    amount: number;
    merchant: string;
    category: string;
    timestamp?: string;
  }) => Promise<{ riskScore: number; alertId?: string } | null>;
}

export function useAIInsights(): UseAIInsightsReturn {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [nudges, setNudges] = useState<NudgeHistory[]>([]);
  const [spendingAnalysis, setSpendingAnalysis] =
    useState<SpendingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [insightsRes, nudgesRes, analysisRes] = await Promise.all([
        fetch('/api/ai/insights'),
        fetch('/api/ai/nudges'),
        fetch('/api/ai/spending-analysis'),
      ]);

      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data);
      }

      if (nudgesRes.ok) {
        const data = await nudgesRes.json();
        setNudges(data.nudges ?? []);
      }

      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setSpendingAnalysis(data);
      }
    } catch (err) {
      setError('Failed to fetch AI insights');
      // Error captured in state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const respondToNudge = useCallback(
    async (
      nudgeId: string,
      action: NudgeAction,
      feedback?: string
    ): Promise<boolean> => {
      try {
        const res = await fetch('/api/ai/nudges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nudgeId, action, feedback }),
        });

        if (res.ok) {
          // Remove nudge from list
          setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
          return true;
        }
        return false;
      } catch (err) {
        // Failed to respond to nudge
        return false;
      }
    },
    []
  );

  const analyzeTransaction = useCallback(
    async (transaction: {
      amount: number;
      merchant: string;
      category: string;
      timestamp?: string;
    }): Promise<{ riskScore: number; alertId?: string } | null> => {
      try {
        const res = await fetch('/api/ai/spending-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            riskScore: data.riskScore,
            alertId: data.alertId,
          };
        }
        return null;
      } catch (err) {
        // Failed to analyze transaction
        return null;
      }
    },
    []
  );

  return {
    insights,
    nudges,
    spendingAnalysis,
    loading,
    error,
    respondToNudge,
    refreshInsights: fetchData,
    analyzeTransaction,
  };
}

export default useAIInsights;
