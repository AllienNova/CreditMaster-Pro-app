'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

interface ScorePrediction {
  timeframe: '30_days' | '90_days' | '6_months';
  predictedScore: number;
  confidence: number;
  factors: string[];
}

interface FactorImpact {
  factor: string;
  currentImpact: 'positive' | 'negative' | 'neutral';
  impactScore: number; // -100 to +100
  description: string;
  recommendation: string;
  potentialImprovement: number; // points
}

interface ImprovementOpportunity {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  potentialIncrease: number; // points
  steps: string[];
  priority: 'high' | 'medium' | 'low';
}

interface CreditAlert {
  id: string;
  type: 'new_account' | 'inquiry' | 'utilization_spike' | 'payment_missed' | 'positive_change';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  date: string;
  actionable: boolean;
}

interface AICreditData {
  predictions: ScorePrediction[];
  factorAnalysis: FactorImpact[];
  improvementOpportunities: ImprovementOpportunity[];
  alerts: CreditAlert[];
  overallHealthScore: number; // 0-100
  recommendedActions: string[];
}

export default function AICreditInsights() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AICreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/financial/credit/ai-insights');
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit insights');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching credit insights:', error);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white/20 rounded w-full"></div>
          <div className="h-4 bg-white/20 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎯</div>
          <div>
            <h3 className="text-xl font-bold">AI Credit Intelligence</h3>
            <p className="text-sm opacity-90">Score predictions and improvement strategies</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Health Score & Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Overall Health Score */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Credit Health Score</span>
                <span className="text-2xl font-bold">{data.overallHealthScore}/100</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${data.overallHealthScore}%` }}
                ></div>
              </div>
              <p className="text-xs opacity-75 mt-2">
                {data.overallHealthScore >= 80 ? 'Excellent' : data.overallHealthScore >= 60 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>

            {/* 30-Day Prediction */}
            {data.predictions[0] && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium opacity-90">30-Day Prediction</span>
                  <span className="text-2xl font-bold">{data.predictions[0].predictedScore}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="opacity-75">Confidence:</span>
                  <span className="font-semibold">{data.predictions[0].confidence}%</span>
                </div>
                <p className="text-xs opacity-75 mt-2">
                  {data.predictions[0].predictedScore > 700 ? '📈 Trending up' : '📊 Stable'}
                </p>
              </div>
            )}
          </div>

          {/* Score Predictions */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>📊</span>
              <span>Score Predictions</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.predictions.map((pred) => (
                <div key={pred.timeframe} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-xs opacity-75 mb-1">
                    {pred.timeframe === '30_days' ? '30 Days' : pred.timeframe === '90_days' ? '90 Days' : '6 Months'}
                  </div>
                  <div className="text-2xl font-bold mb-1">{pred.predictedScore}</div>
                  <div className="text-xs opacity-75">
                    {pred.confidence}% confidence
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Factor Impact Analysis */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>⚖️</span>
              <span>Factor Impact Analysis (Top 4)</span>
            </h4>
            <div className="space-y-2">
              {data.factorAnalysis.slice(0, 4).map((factor, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{factor.factor}</span>
                        <span className={`text-xs ${getImpactColor(factor.currentImpact)}`}>
                          {factor.currentImpact === 'positive' ? '↑' : factor.currentImpact === 'negative' ? '↓' : '→'}
                        </span>
                      </div>
                      <p className="text-xs opacity-75">{factor.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {factor.impactScore > 0 ? '+' : ''}{factor.impactScore}
                      </div>
                      <div className="text-xs opacity-75">
                        +{factor.potentialImprovement} pts
                      </div>
                    </div>
                  </div>
                  <p className="text-xs bg-white/10 rounded px-2 py-1 mt-2">
                    💡 {factor.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Improvement Opportunities */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🚀</span>
              <span>Top Improvement Opportunities</span>
            </h4>
            <div className="space-y-2">
              {data.improvementOpportunities.slice(0, 3).map((opp) => (
                <div key={opp.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{opp.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getDifficultyColor(opp.difficulty)}`}>
                          {opp.difficulty}
                        </span>
                      </div>
                      <p className="text-xs opacity-75">{opp.description}</p>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-lg font-bold text-green-300">+{opp.potentialIncrease}</div>
                      <div className="text-xs opacity-75">points</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs mt-2">
                    <span className="opacity-75">⏱️ {opp.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Alerts */}
          {data.alerts.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>🔔</span>
                <span>Recent Alerts ({data.alerts.length})</span>
              </h4>
              <div className="space-y-2">
                {data.alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">{alert.title}</div>
                        <p className="text-xs opacity-75">{alert.description}</p>
                        <div className="text-xs opacity-60 mt-1">{new Date(alert.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3">🎯 Recommended Actions</h4>
            <ul className="space-y-2">
              {data.recommendedActions.slice(0, 3).map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="opacity-75">{idx + 1}.</span>
                  <span className="opacity-90">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

