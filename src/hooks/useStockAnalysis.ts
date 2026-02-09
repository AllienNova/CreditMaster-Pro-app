'use client';

/**
 * useStockAnalysis Hook
 *
 * Provides AI-powered stock analysis data for client components
 * Features:
 * - Comprehensive stock analysis (technical, fundamental, sentiment, AI)
 * - Individual analysis type fetching
 * - Caching to reduce API calls
 * - Error handling and retry logic
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import type {
  ComprehensiveStockAnalysis,
  TechnicalAnalysis,
  FundamentalAnalysis,
  SentimentAnalysis,
  StockRecommendation,
} from '@/lib/investments/types/stock-analysis.types';

export interface UseStockAnalysisOptions {
  symbol: string;
  enabled?: boolean;
  cacheTime?: number; // milliseconds
}

export interface UseStockAnalysisReturn {
  analysis: ComprehensiveStockAnalysis | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTechnical: () => Promise<TechnicalAnalysis | null>;
  getFundamental: () => Promise<FundamentalAnalysis | null>;
  getSentiment: () => Promise<SentimentAnalysis | null>;
  getRecommendation: () => Promise<StockRecommendation | null>;
}

export function useStockAnalysis(
  options: UseStockAnalysisOptions
): UseStockAnalysisReturn {
  const { symbol, enabled = true, cacheTime = 3600000 } = options; // 1 hour cache default

  const { user, loading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<ComprehensiveStockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  const getCachedData = useCallback(
    (key: string) => {
      const cached = cacheRef.current.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data;
      }
      return null;
    },
    [cacheTime]
  );

  const setCachedData = useCallback((key: string, data: any) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const fetchAnalysis = useCallback(async () => {
    if (!user || !enabled || !symbol) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first
      const cacheKey = `analysis-${symbol}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        setAnalysis(cached);
        setLoading(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/investments/analyze/${symbol}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analysis');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setAnalysis(result.data);
        setCachedData(cacheKey, result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Invalid analysis data');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis';
      setError(errorMessage);
      // Error already captured in state
    } finally {
      setLoading(false);
    }
  }, [user, enabled, symbol, getCachedData, setCachedData]);

  const refresh = useCallback(async () => {
    // Clear cache for this symbol
    cacheRef.current.delete(`analysis-${symbol}`);
    await fetchAnalysis();
  }, [symbol, fetchAnalysis]);

  const getTechnical = useCallback(async (): Promise<TechnicalAnalysis | null> => {
    if (!user || !symbol) return null;

    const cacheKey = `technical-${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/investments/analyze/${symbol}/technical`);
      if (!response.ok) throw new Error('Failed to fetch technical analysis');

      const result = await response.json();
      if (result.success && result.data) {
        setCachedData(cacheKey, result.data);
        return result.data;
      }
    } catch (err) {
      // Silently fail - return null
    }
    return null;
  }, [user, symbol, getCachedData, setCachedData]);

  const getFundamental = useCallback(async (): Promise<FundamentalAnalysis | null> => {
    if (!user || !symbol) return null;

    const cacheKey = `fundamental-${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/investments/analyze/${symbol}/fundamental`);
      if (!response.ok) throw new Error('Failed to fetch fundamental analysis');

      const result = await response.json();
      if (result.success && result.data) {
        setCachedData(cacheKey, result.data);
        return result.data;
      }
    } catch (err) {
      // Silently fail - return null
    }
    return null;
  }, [user, symbol, getCachedData, setCachedData]);

  const getSentiment = useCallback(async (): Promise<SentimentAnalysis | null> => {
    if (!user || !symbol) return null;

    const cacheKey = `sentiment-${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/investments/analyze/${symbol}/sentiment`);
      if (!response.ok) throw new Error('Failed to fetch sentiment analysis');

      const result = await response.json();
      if (result.success && result.data) {
        setCachedData(cacheKey, result.data);
        return result.data;
      }
    } catch (err) {
      // Silently fail - return null
    }
    return null;
  }, [user, symbol, getCachedData, setCachedData]);

  const getRecommendation = useCallback(async (): Promise<StockRecommendation | null> => {
    if (!user || !symbol) return null;

    const cacheKey = `recommendation-${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/investments/analyze/${symbol}/recommendation`);
      if (!response.ok) throw new Error('Failed to fetch recommendation');

      const result = await response.json();
      if (result.success && result.data) {
        setCachedData(cacheKey, result.data);
        return result.data;
      }
    } catch (err) {
      // Silently fail - return null
    }
    return null;
  }, [user, symbol, getCachedData, setCachedData]);

  // Initial fetch
  useEffect(() => {
    if (!authLoading && enabled && symbol) {
      void fetchAnalysis();
    }
  }, [authLoading, enabled, symbol, fetchAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    analysis,
    loading,
    error,
    refresh,
    getTechnical,
    getFundamental,
    getSentiment,
    getRecommendation,
  };
}

