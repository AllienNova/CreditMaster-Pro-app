'use client';

import { useState, useEffect } from 'react';

interface RepairAction {
  id: string;
  title: string;
  description: string;
  category: 'dispute' | 'negotiation' | 'utilization' | 'payment_history' | 'credit_building';
  impact: number; // credit score points
  successProbability: number; // 0-100
  timeframe: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: string[];
  estimatedCost: string;
}

interface ImpactPrediction {
  action: string;
  currentScore: number;
  predictedScore: number;
  scoreIncrease: number;
  confidence: number; // 0-100
  timeToImpact: string;
}

interface TimelineEstimate {
  phase: string;
  duration: string;
  actions: string[];
  expectedScoreRange: {
    min: number;
    max: number;
  };
  milestones: string[];
}

interface SuccessMetrics {
  overallSuccessProbability: number; // 0-100
  estimatedScoreIncrease: number;
  estimatedTimeframe: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
}

interface StrategyOptimization {
  id: string;
  strategy: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  expectedOutcome: string;
  successRate: number; // 0-100
}

interface AICreditRepairData {
  prioritizedActions: RepairAction[];
  impactPredictions: ImpactPrediction[];
  timelineEstimates: TimelineEstimate[];
  successMetrics: SuccessMetrics;
  strategyOptimizations: StrategyOptimization[];
  repairScore: number; // 0-100 - overall repair strategy effectiveness
  quickWins: string[];
}

export default function AICreditRepairStrategy() {
  const [data, setData] = useState<AICreditRepairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/financial/credit-repair/ai-strategy');
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI credit repair strategy');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: 'critical' | 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dispute': return '';
      case 'negotiation': return '';
      case 'utilization': return '';
      case 'payment_history': return '';
      case 'credit_building': return '';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 mb-6 animate-pulse">
        <div className="h-8 bg-white dark:bg-slate-800/20 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-white dark:bg-slate-800/20 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
        <p className="text-red-800 font-medium">Error loading AI repair strategy</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 mb-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center text-2xl">
                      </div>
          <div>
            <h2 className="text-xl font-bold">AI Credit Repair Strategy</h2>
            <p className="text-blue-100 text-sm">Optimized plan for maximum score improvement</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white dark:bg-slate-800/10 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Repair Score & Success Metrics */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center space-x-2">
                <span className="text-xl"></span>
                <span>Repair Strategy Effectiveness</span>
              </h3>
              <span className="text-2xl font-bold">{data.repairScore}/100</span>
            </div>
            <div className="w-full bg-white dark:bg-slate-800/20 rounded-full h-3 mb-4">
              <div
                className="bg-white dark:bg-slate-800 rounded-full h-3 transition-all duration-500"
                style={{ width: `${data.repairScore}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-blue-100">Success Probability</div>
                <div className="text-xl font-bold">{data.successMetrics.overallSuccessProbability}%</div>
              </div>
              <div>
                <div className="text-blue-100">Expected Increase</div>
                <div className="text-xl font-bold text-green-300">+{data.successMetrics.estimatedScoreIncrease} pts</div>
              </div>
              <div>
                <div className="text-blue-100">Timeframe</div>
                <div className="text-xl font-bold">{data.successMetrics.estimatedTimeframe}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                data.successMetrics.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
                data.successMetrics.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {data.successMetrics.confidenceLevel.toUpperCase()} CONFIDENCE
              </span>
            </div>
          </div>

          {/* Quick Wins */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl text-yellow-300"></span>
              <span>Quick Wins (Start Today)</span>
            </h3>
            <ul className="space-y-2">
              {data.quickWins.map((win, idx) => (
                <li key={idx} className="text-sm text-blue-100 flex items-start space-x-2 bg-white dark:bg-slate-800/10 rounded-lg p-2">
                  <span className="text-green-300 flex-shrink-0"></span>
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prioritized Repair Actions */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>Priority Repair Actions</span>
            </h3>
            <div className="space-y-3">
              {data.prioritizedActions.slice(0, 4).map((action) => (
                <div key={action.id} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className="text-xl">{getCategoryIcon(action.category)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span className="font-semibold">{action.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(action.priority)}`}>
                            {action.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(action.difficulty)}`}>
                            {action.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-blue-100">{action.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-bold text-green-300">+{action.impact} pts</div>
                      <div className="text-xs text-blue-200">{action.successProbability}% success</div>
                      <div className="text-xs text-blue-200">{action.timeframe}</div>
                    </div>
                  </div>
                  <div className="mt-2 pl-7">
                    <p className="text-xs text-blue-200 mb-1">Steps:</p>
                    <ul className="space-y-1">
                      {action.steps.slice(0, 2).map((step, idx) => (
                        <li key={idx} className="text-xs text-blue-100 flex items-start space-x-1">
                          <span>{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-blue-200 mt-2">Cost: {action.estimatedCost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Predictions */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>Score Impact Predictions</span>
            </h3>
            <div className="space-y-2">
              {data.impactPredictions.slice(0, 4).map((pred, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{pred.action}</span>
                    <span className="text-sm font-bold text-green-300">+{pred.scoreIncrease} pts</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-blue-200">
                    <span>{pred.currentScore} → {pred.predictedScore}</span>
                    <span>{pred.confidence}% confidence</span>
                    <span>{pred.timeToImpact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Estimates */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl">⏰</span>
              <span>Repair Timeline</span>
            </h3>
            <div className="space-y-3">
              {data.timelineEstimates.map((timeline, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{timeline.phase}</span>
                    <span className="text-sm text-blue-200">{timeline.duration}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-xs text-blue-200">Expected Score Range: </span>
                    <span className="text-sm font-medium">
                      {timeline.expectedScoreRange.min} - {timeline.expectedScoreRange.max}
                    </span>
                  </div>
                  <div className="text-xs text-blue-100">
                    <p className="mb-1">Key Actions:</p>
                    <ul className="space-y-1 pl-3">
                      {timeline.actions.slice(0, 2).map((action, actionIdx) => (
                        <li key={actionIdx}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Optimizations */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3">Recommended Strategies</h3>
            <div className="space-y-3">
              {data.strategyOptimizations.slice(0, 2).map((strategy) => (
                <div key={strategy.id} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{strategy.strategy}</span>
                    <span className="text-sm font-bold text-green-300">{strategy.successRate}% success</span>
                  </div>
                  <p className="text-sm text-blue-100 mb-2">{strategy.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-blue-200 mb-1">Pros:</p>
                      <ul className="space-y-1 text-blue-100">
                        {strategy.pros.slice(0, 2).map((pro, idx) => (
                          <li key={idx}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-blue-200 mb-1">Best For:</p>
                      <ul className="space-y-1 text-blue-100">
                        {strategy.bestFor.slice(0, 2).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="text-xs text-blue-200 mt-2">Expected: {strategy.expectedOutcome}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Factors */}
          {data.successMetrics.riskFactors.length > 0 && (
            <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center space-x-2">
                <span className="text-xl text-yellow-300"></span>
                <span>Risk Factors to Consider</span>
              </h3>
              <ul className="space-y-2">
                {data.successMetrics.riskFactors.map((risk, idx) => (
                  <li key={idx} className="text-sm text-blue-100 flex items-start space-x-2">
                    <span className="text-yellow-300"></span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

