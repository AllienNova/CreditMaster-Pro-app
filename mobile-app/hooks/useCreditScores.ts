import { useEffect, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import { creditAPI } from '../services/api';

export function useCreditScores() {
  const { creditScores, setCreditScores, updateScore } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await creditAPI.getScores();

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    if (data?.scores) {
      setCreditScores(data.scores);
    }
    setLoading(false);
  }, [setCreditScores]);

  const refreshScores = useCallback(async () => {
    await fetchScores();
  }, [fetchScores]);

  // Calculate aggregate stats
  const averageScore = creditScores.length > 0
    ? Math.round(creditScores.reduce((sum, s) => sum + s.score, 0) / creditScores.length)
    : 0;

  const highestScore = creditScores.length > 0
    ? Math.max(...creditScores.map((s) => s.score))
    : 0;

  const lowestScore = creditScores.length > 0
    ? Math.min(...creditScores.map((s) => s.score))
    : 0;

  const totalChange = creditScores.reduce((sum, s) => sum + s.change, 0);

  // Get score by bureau
  const getScoreByBureau = useCallback(
    (bureau: 'experian' | 'equifax' | 'transunion') => {
      return creditScores.find((s) => s.bureau === bureau);
    },
    [creditScores]
  );

  // Get score rating
  const getScoreRating = useCallback((score: number): { label: string; color: string } => {
    if (score >= 800) return { label: 'Exceptional', color: '#00AA00' };
    if (score >= 740) return { label: 'Very Good', color: '#4CAF50' };
    if (score >= 670) return { label: 'Good', color: '#8BC34A' };
    if (score >= 580) return { label: 'Fair', color: '#FF9800' };
    return { label: 'Poor', color: '#CC0000' };
  }, []);

  return {
    creditScores,
    loading,
    error,
    fetchScores,
    refreshScores,
    updateScore,
    averageScore,
    highestScore,
    lowestScore,
    totalChange,
    getScoreByBureau,
    getScoreRating,
  };
}

