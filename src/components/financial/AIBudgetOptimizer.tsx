'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

interface BudgetRecommendation {
  id: string;
  category: string;
  currentAmount: number;
  recommendedAmount: number;
  reason: string;
  potentialSavings: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

interface SpendingPrediction {
  category: string;
  predictedAmount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

interface AIBudgetData {
  recommendations: BudgetRecommendation[];
  predictions: SpendingPrediction[];
  totalPotentialSavings: number;
  optimizationScore: number;
}

export default function AIBudgetOptimizer() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AIBudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);

  const fetchOptimizations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/financial/budgets/recommendations');

      if (!response.ok) {
        throw new Error('Failed to fetch budget recommendations');
      }

      const result = await response.json();

      // Transform budget recommendations to match our component format
      interface ApiRecommendation {
        id: string;
        category?: string;
        currentAmount: number;
        suggestedAmount: number;
        reason: string;
        potentialSavings?: number;
        impact: 'high' | 'medium' | 'low';
      }
      const recommendations: BudgetRecommendation[] = (result.data || []).map((rec: ApiRecommendation) => ({
        id: rec.id,
        category: rec.category || 'Other',
        currentAmount: rec.currentAmount,
        recommendedAmount: rec.suggestedAmount,
        reason: rec.reason,
        potentialSavings: rec.potentialSavings || Math.abs(rec.currentAmount - rec.suggestedAmount),
        confidence: rec.impact === 'high' ? 90 : rec.impact === 'medium' ? 75 : 60,
        priority: rec.impact,
      }));

      // Mock predictions (in production, this would come from spending analyzer)
      const predictions: SpendingPrediction[] = [
        { category: 'Food & Dining', predictedAmount: 450, trend: 'increasing', confidence: 85 },
        { category: 'Transportation', predictedAmount: 320, trend: 'stable', confidence: 80 },
        { category: 'Shopping', predictedAmount: 280, trend: 'decreasing', confidence: 75 },
      ];

      const totalPotentialSavings = recommendations.reduce((sum, r) => sum + (r.potentialSavings || 0), 0);
      const optimizationScore = Math.min(100, Math.max(0, 100 - (recommendations.length * 10)));

      setData({
        recommendations,
        predictions,
        totalPotentialSavings,
        optimizationScore,
      });
    } catch (_error) {
      // Error logged
      toast.error('Failed to load AI recommendations', 'Please try again later');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      void fetchOptimizations();
    }
  }, [user, fetchOptimizations]);

  const handleApplyRecommendation = async (recommendation: BudgetRecommendation) => {
    setApplyingRecommendation(recommendation.id);
    
    try {
      const response = await fetch('/api/financial/budgets/apply-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: recommendation.category,
          amount: recommendation.recommendedAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply recommendation');
      }

      toast.success('Budget updated!', `${recommendation.category} budget optimized`);
      
      // Refresh recommendations
      await fetchOptimizations();
    } catch (_error) {
      // Error logged
      toast.error('Failed to apply recommendation', 'Please try again');
    } finally {
      setApplyingRecommendation(null);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-200 dark:border-slate-700';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '';
      case 'decreasing': return '';
      case 'stable': return '';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-white dark:bg-slate-800/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-full"></div>
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!data || data.recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl"></div>
          <div>
            <h3 className="text-xl font-bold">AI Budget Optimizer</h3>
            <p className="text-sm opacity-90">Smart recommendations to optimize your spending</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-white hover:bg-white dark:bg-slate-800/30 rounded-lg transition-colors text-sm font-medium"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Optimization Score & Potential Savings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Optimization Score */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">Optimization Score</div>
              <div className="text-4xl font-bold">{data.optimizationScore}/100</div>
              <div className="mt-2 w-full bg-white dark:bg-slate-800/20 rounded-full h-2">
                <div
                  className="bg-white dark:bg-slate-800 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.optimizationScore}%` }}
                ></div>
              </div>
              <div className="text-xs opacity-75 mt-2">
                {data.optimizationScore >= 80 ? 'Excellent!' :
                 data.optimizationScore >= 60 ? 'Good progress' :
                 'Room for improvement'}
              </div>
            </div>

            {/* Potential Savings */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">Potential Monthly Savings</div>
              <div className="text-4xl font-bold">{formatCurrency(data.totalPotentialSavings)}</div>
              <div className="text-xs opacity-75 mt-2">
                By applying all recommendations
              </div>
            </div>
          </div>

          {/* Spending Predictions */}
          {data.predictions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">Next Month Predictions</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.predictions.slice(0, 3).map((prediction, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium opacity-75">{prediction.category}</span>
                      <span className="text-lg">{getTrendIcon(prediction.trend)}</span>
                    </div>
                    <div className="text-xl font-bold mb-1">
                      {formatCurrency(prediction.predictedAmount)}
                    </div>
                    <div className="text-xs opacity-75">
                      {prediction.confidence}% confidence • {prediction.trend}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Recommendations */}
          <div>
            <h4 className="text-sm font-semibold mb-3 opacity-90">Smart Recommendations</h4>
            <div className="space-y-3">
              {data.recommendations.slice(0, 4).map((recommendation) => (
                <div
                  key={recommendation.id}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4 text-gray-900 dark:text-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold">{recommendation.category}</h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(recommendation.priority)}`}>
                          {recommendation.priority} priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{recommendation.reason}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">Current:</span>{' '}
                          <span className="font-semibold">{formatCurrency(recommendation.currentAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">Recommended:</span>{' '}
                          <span className="font-semibold text-green-600">{formatCurrency(recommendation.recommendedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-slate-400">Save:</span>{' '}
                          <span className="font-semibold text-emerald-600">{formatCurrency(recommendation.potentialSavings)}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        {recommendation.confidence}% confidence
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyRecommendation(recommendation)}
                      disabled={applyingRecommendation === recommendation.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                    >
                      {applyingRecommendation === recommendation.id ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View All Link */}
          <div className="mt-6 text-center">
            <button
              onClick={fetchOptimizations}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <span>Refresh Recommendations</span>
              <span></span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

