'use client';

import { useState, useEffect } from 'react';

interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  targetScore: number;
  estimatedDays: number;
  actions: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'completed' | 'in_progress' | 'upcoming';
  successProbability: number; // 0-100
}

interface TimelinePrediction {
  milestone: string;
  currentScore: number;
  targetScore: number;
  estimatedDate: string;
  confidence: number; // 0-100
  requiredActions: number;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  impact: number; // credit score points
  difficulty: 'easy' | 'medium' | 'hard';
  timeToComplete: string;
  priority: 'high' | 'medium' | 'low';
  category: 'utilization' | 'payment_history' | 'credit_age' | 'credit_mix' | 'inquiries';
  completed: boolean;
}

interface ProgressMetrics {
  currentScore: number;
  startingScore: number;
  targetScore: number;
  pointsGained: number;
  daysElapsed: number;
  estimatedDaysRemaining: number;
  completionPercentage: number;
  onTrack: boolean;
}

interface StrategyRecommendation {
  id: string;
  strategy: string;
  description: string;
  expectedImpact: number; // points
  timeframe: string;
  difficulty: 'easy' | 'medium' | 'hard';
  steps: string[];
}

interface AICreditRoadmapData {
  milestones: RoadmapMilestone[];
  timelinePredictions: TimelinePrediction[];
  prioritizedActions: ActionItem[];
  progressMetrics: ProgressMetrics;
  strategyRecommendations: StrategyRecommendation[];
  roadmapScore: number; // 0-100 - how well user is following the roadmap
  nextSteps: string[];
}

export default function AICreditRoadmap() {
  const [data, setData] = useState<AICreditRoadmapData | null>(null);
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
      const response = await fetch('/api/financial/credit-builder/ai-roadmap');
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI credit roadmap');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
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

  const getStatusIcon = (status: 'completed' | 'in_progress' | 'upcoming') => {
    switch (status) {
      case 'completed': return <span className="text-green-400"></span>;
      case 'in_progress': return <span className="text-yellow-400">⏳</span>;
      case 'upcoming': return <span className="text-blue-400">○</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg p-6 mb-6 animate-pulse">
        <div className="h-8 bg-white dark:bg-slate-800/20 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-white dark:bg-slate-800/20 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
        <p className="text-red-800 font-medium">Error loading AI roadmap</p>
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
    <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg p-6 mb-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white dark:bg-slate-800/20 rounded-lg flex items-center justify-center text-2xl">
                      </div>
          <div>
            <h2 className="text-xl font-bold">AI Credit Building Roadmap</h2>
            <p className="text-green-100 text-sm">Personalized path to your credit goals</p>
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
          {/* Progress Metrics */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center space-x-2">
                <span className="text-xl"></span>
                <span>Roadmap Progress</span>
              </h3>
              <span className="text-2xl font-bold">{data.roadmapScore}/100</span>
            </div>
            <div className="w-full bg-white dark:bg-slate-800/20 rounded-full h-3 mb-3">
              <div
                className="bg-white dark:bg-slate-800 rounded-full h-3 transition-all duration-500"
                style={{ width: `${data.progressMetrics.completionPercentage}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-green-100">Current Score</div>
                <div className="text-xl font-bold">{data.progressMetrics.currentScore}</div>
              </div>
              <div>
                <div className="text-green-100">Target Score</div>
                <div className="text-xl font-bold">{data.progressMetrics.targetScore}</div>
              </div>
              <div>
                <div className="text-green-100">Points Gained</div>
                <div className="text-xl font-bold text-green-300">+{data.progressMetrics.pointsGained}</div>
              </div>
              <div>
                <div className="text-green-100">Days Remaining</div>
                <div className="text-xl font-bold">{data.progressMetrics.estimatedDaysRemaining}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center space-x-2">
              {data.progressMetrics.onTrack ? (
                <>
                  <span className="text-green-300"></span>
                  <span className="text-sm text-green-100">On track to reach your goal!</span>
                </>
              ) : (
                <>
                  <span className="text-yellow-300"></span>
                  <span className="text-sm text-yellow-100">Need to accelerate progress</span>
                </>
              )}
            </div>
          </div>

          {/* Roadmap Milestones */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>Credit Building Milestones</span>
            </h3>
            <div className="space-y-3">
              {data.milestones.map((milestone, idx) => (
                <div key={milestone.id} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-2">
                      {getStatusIcon(milestone.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{milestone.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(milestone.priority)}`}>
                            {milestone.priority}
                          </span>
                        </div>
                        <p className="text-sm text-green-100 mt-1">{milestone.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-medium">Score: {milestone.targetScore}</div>
                      <div className="text-xs text-green-200">{milestone.estimatedDays} days</div>
                      <div className="text-xs text-green-200">{milestone.successProbability}% success</div>
                    </div>
                  </div>
                  <div className="mt-2 pl-7">
                    <p className="text-xs text-green-200 mb-1">Required Actions:</p>
                    <ul className="space-y-1">
                      {milestone.actions.slice(0, 2).map((action, actionIdx) => (
                        <li key={actionIdx} className="text-xs text-green-100 flex items-start space-x-1">
                          <span>•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Predictions */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl">⏰</span>
              <span>Score Timeline Predictions</span>
            </h3>
            <div className="space-y-2">
              {data.timelinePredictions.map((pred, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-slate-800/10 rounded-lg p-2">
                  <div>
                    <div className="font-medium">{pred.milestone}</div>
                    <div className="text-xs text-green-200">
                      {pred.currentScore} → {pred.targetScore} ({pred.requiredActions} actions)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{pred.estimatedDate}</div>
                    <div className="text-xs text-green-200">{pred.confidence}% confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritized Actions */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <span className="text-xl"></span>
              <span>Priority Actions (Next 30 Days)</span>
            </h3>
            <div className="space-y-2">
              {data.prioritizedActions.slice(0, 4).map((action) => (
                <div key={action.id} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{action.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(action.priority)}`}>
                          {action.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(action.difficulty)}`}>
                          {action.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-green-100">{action.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-bold text-green-300">+{action.impact} pts</div>
                      <div className="text-xs text-green-200">{action.timeToComplete}</div>
                    </div>
                  </div>
                  {action.completed && (
                    <div className="flex items-center space-x-1 text-xs text-green-300">
                      <span></span>
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Recommendations */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3">Recommended Strategies</h3>
            <div className="space-y-3">
              {data.strategyRecommendations.slice(0, 2).map((strategy) => (
                <div key={strategy.id} className="bg-white dark:bg-slate-800/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{strategy.strategy}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(strategy.difficulty)}`}>
                        {strategy.difficulty}
                      </span>
                      <span className="text-sm font-bold text-green-300">+{strategy.expectedImpact} pts</span>
                    </div>
                  </div>
                  <p className="text-sm text-green-100 mb-2">{strategy.description}</p>
                  <div className="text-xs text-green-200 mb-2">Timeline: {strategy.timeframe}</div>
                  <div className="pl-3">
                    <p className="text-xs text-green-200 mb-1">Steps:</p>
                    <ul className="space-y-1">
                      {strategy.steps.slice(0, 2).map((step, idx) => (
                        <li key={idx} className="text-xs text-green-100 flex items-start space-x-1">
                          <span>{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white dark:bg-slate-800/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold mb-3">Your Next Steps</h3>
            <ul className="space-y-2">
              {data.nextSteps.map((step, idx) => (
                <li key={idx} className="text-sm text-green-100 flex items-start space-x-2">
                  <span className="text-white font-bold">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

