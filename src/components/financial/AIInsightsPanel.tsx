'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'tip' | 'prediction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface PredictiveMetric {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface AIInsightsData {
  insights: AIInsight[];
  predictions: PredictiveMetric[];
  healthScore: number;
  healthTrend: 'improving' | 'declining' | 'stable';
  topRecommendation: string;
}

export default function AIInsightsPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/financial/ai-insights');
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      toast.error('Failed to load AI insights', 'Please try again later');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      void fetchInsights();
    }
  }, [user, fetchInsights]);

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'opportunity': return '';
      case 'warning': return '';
      case 'tip': return '';
      case 'prediction': return '';
      default: return '';
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-red-50 border-red-200 text-red-800';
      case 'tip': return 'bg-green-50 border-green-200 text-green-800';
      case 'prediction': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100';
    }
  };

  const getImpactBadge = (impact: AIInsight['impact']) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[impact];
  };

  const getTrendIcon = (trend: PredictiveMetric['trend']) => {
    switch (trend) {
      case 'up': return '';
      case 'down': return '';
      case 'stable': return '';
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

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-white dark:bg-slate-800/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-full"></div>
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-5/6"></div>
          <div className="h-4 bg-white dark:bg-slate-800/20 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl"></div>
          <div>
            <h3 className="text-xl font-bold">AI Financial Insights</h3>
            <p className="text-sm opacity-90">Powered by advanced AI analysis</p>
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
          {/* Health Score & Top Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Health Score */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Financial Health Score</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  data.healthTrend === 'improving' ? 'bg-green-500/30' :
                  data.healthTrend === 'declining' ? 'bg-red-500/30' :
                  'bg-yellow-500/30'
                }`}>
                  {data.healthTrend === 'improving' ? '↗️ Improving' :
                   data.healthTrend === 'declining' ? '↘️ Declining' :
                   '→ Stable'}
                </span>
              </div>
              <div className="text-4xl font-bold">{data.healthScore}/100</div>
              <div className="mt-2 w-full bg-white dark:bg-slate-800/20 rounded-full h-2">
                <div
                  className="bg-white dark:bg-slate-800 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.healthScore}%` }}
                ></div>
              </div>
            </div>

            {/* Top Recommendation */}
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">Top Recommendation</div>
              <div className="text-lg font-semibold leading-tight">
                {data.topRecommendation}
              </div>
              <button
                onClick={() => window.location.href = '/financial/coach'}
                className="mt-3 text-sm font-medium underline hover:no-underline"
              >
                View Action Plan →
              </button>
            </div>
          </div>

          {/* Predictive Metrics */}
          {data.predictions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">Predictive Analytics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.predictions.slice(0, 3).map((prediction, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium opacity-75">{prediction.metric}</span>
                      <span className="text-lg">{getTrendIcon(prediction.trend)}</span>
                    </div>
                    <div className="text-xl font-bold mb-1">
                      {formatCurrency(prediction.predictedValue)}
                    </div>
                    <div className="text-xs opacity-75">
                      {prediction.timeframe} • {prediction.confidence}% confidence
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      Current: {formatCurrency(prediction.currentValue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {data.insights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 opacity-90">Smart Insights</h4>
              <div className="space-y-3">
                {data.insights.slice(0, 4).map((insight) => (
                  <div
                    key={insight.id}
                    className="bg-white dark:bg-slate-800 rounded-lg p-4 text-gray-900 dark:text-white"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold">{insight.title}</h5>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getImpactBadge(insight.impact)}`}>
                            {insight.impact} impact
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{insight.description}</p>
                        {insight.actionable && insight.actionUrl && (
                          <a
                            href={insight.actionUrl}
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {insight.actionLabel || 'Take Action'} →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View All Link */}
          <div className="mt-6 text-center">
            <a
              href="/financial/coach"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors"
            >
              <span>View Full AI Analysis</span>
              <span>→</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

