'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

interface GoalOptimization {
  goalId: string;
  goalName: string;
  currentContribution: number;
  recommendedContribution: number;
  projectedCompletion: string;
  optimizedCompletion: string;
  monthsSaved: number;
  confidence: number;
}

interface AutoSaveRule {
  id: string;
  name: string;
  type: 'round_up' | 'percentage' | 'fixed';
  amount: number;
  linkedGoalId?: string;
  linkedGoalName?: string;
  isActive: boolean;
  estimatedMonthlySavings: number;
}

interface AIGoalsData {
  autoSaveEnabled: boolean;
  autoSaveRules: AutoSaveRule[];
  totalAutoSavings: number;
  optimizations: GoalOptimization[];
  achievementPredictions: {
    goalId: string;
    goalName: string;
    probability: number;
    projectedDate: string;
    riskFactors: string[];
  }[];
}

export default function AIGoalsOptimizer() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AIGoalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [enablingAutoSave, setEnablingAutoSave] = useState(false);

  const fetchOptimizations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/financial/goals/optimizations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch goal optimizations');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching goal optimizations:', error);
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

  const handleToggleAutoSave = async () => {
    setEnablingAutoSave(true);
    
    try {
      const response = await fetch('/api/financial/savings/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !data?.autoSaveEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle auto-save');
      }

      toast.success(
        data?.autoSaveEnabled ? 'Auto-save disabled' : 'Auto-save enabled!',
        data?.autoSaveEnabled ? 'You can re-enable it anytime' : 'Your savings will grow automatically'
      );
      
      await fetchOptimizations();
    } catch (error) {
      console.error('Error toggling auto-save:', error);
      toast.error('Failed to update auto-save', 'Please try again');
    } finally {
      setEnablingAutoSave(false);
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 animate-pulse">
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
    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎯</div>
          <div>
            <h3 className="text-xl font-bold">AI Goals Optimizer</h3>
            <p className="text-sm opacity-90">Auto-save and smart goal recommendations</p>
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
          {/* Auto-Save Toggle & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Auto-Save Toggle */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium opacity-90 mb-1">Auto-Save</div>
                  <div className="text-xs opacity-75">
                    {data.autoSaveEnabled ? 'Actively saving' : 'Not enabled'}
                  </div>
                </div>
                <button
                  onClick={handleToggleAutoSave}
                  disabled={enablingAutoSave}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    data.autoSaveEnabled ? 'bg-green-500' : 'bg-white/30'
                  } ${enablingAutoSave ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      data.autoSaveEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {data.autoSaveEnabled && (
                <div className="text-sm">
                  <span className="opacity-75">Active rules:</span>{' '}
                  <span className="font-semibold">{data.autoSaveRules.filter(r => r.isActive).length}</span>
                </div>
              )}
            </div>

            {/* Monthly Auto-Savings */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm font-medium opacity-90 mb-2">Estimated Monthly Auto-Savings</div>
              <div className="text-4xl font-bold">{formatCurrency(data.totalAutoSavings)}</div>
              <div className="text-xs opacity-75 mt-2">
                Based on your spending patterns
              </div>
            </div>
          </div>

          {/* Auto-Save Rules */}
          {data.autoSaveEnabled && data.autoSaveRules.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">💰 Active Auto-Save Rules</h4>
              <div className="space-y-2">
                {data.autoSaveRules.filter(r => r.isActive).slice(0, 3).map((rule) => (
                  <div key={rule.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{rule.name}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {rule.type === 'round_up' && 'Round up purchases'}
                          {rule.type === 'percentage' && `${rule.amount}% of income`}
                          {rule.type === 'fixed' && `${formatCurrency(rule.amount)} per month`}
                          {rule.linkedGoalName && ` → ${rule.linkedGoalName}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(rule.estimatedMonthlySavings)}</div>
                        <div className="text-xs opacity-75">per month</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal Optimizations */}
          {data.optimizations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 opacity-90">🎯 Goal Optimization Recommendations</h4>
              <div className="space-y-3">
                {data.optimizations.slice(0, 3).map((optimization) => (
                  <div key={optimization.goalId} className="bg-white rounded-lg p-4 text-gray-900">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h5 className="font-semibold mb-2">{optimization.goalName}</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div>
                            <span className="text-gray-500">Current:</span>{' '}
                            <span className="font-semibold">{formatCurrency(optimization.currentContribution)}/mo</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Recommended:</span>{' '}
                            <span className="font-semibold text-purple-600">{formatCurrency(optimization.recommendedContribution)}/mo</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Current completion:</span>{' '}
                            <span className="font-semibold">{formatDate(optimization.projectedCompletion)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Optimized:</span>{' '}
                            <span className="font-semibold text-green-600">{formatDate(optimization.optimizedCompletion)}</span>
                          </div>
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          ⚡ Achieve {optimization.monthsSaved} months faster!
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {optimization.confidence}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievement Predictions */}
          {data.achievementPredictions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 opacity-90">📊 Achievement Predictions</h4>
              <div className="space-y-2">
                {data.achievementPredictions.slice(0, 3).map((prediction) => (
                  <div key={prediction.goalId} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{prediction.goalName}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs opacity-75">Probability:</div>
                        <div className={`text-sm font-bold ${
                          prediction.probability >= 80 ? 'text-green-300' :
                          prediction.probability >= 60 ? 'text-yellow-300' :
                          'text-red-300'
                        }`}>
                          {prediction.probability}%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs opacity-75">
                      Projected: {formatDate(prediction.projectedDate)}
                    </div>
                    {prediction.riskFactors.length > 0 && (
                      <div className="mt-2 text-xs opacity-75">
                        ⚠️ Risk: {prediction.riskFactors[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 justify-center">
            <a
              href="/financial/savings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              <span>Manage Auto-Save Rules</span>
              <span>→</span>
            </a>
            <button
              onClick={fetchOptimizations}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
            >
              <span>Refresh</span>
              <span>🔄</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

