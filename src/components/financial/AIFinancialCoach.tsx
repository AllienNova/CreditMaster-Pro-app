'use client';

/**
 * AI Financial Coach Component
 *
 * Dave Ramsey-inspired financial coaching with AI-powered recommendations,
 * action plans, and personalized advice.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui';
import { AreaChartComponent, BarChartComponent } from '@/components/charts';

// Types
interface BabyStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  estimatedImpact: string;
  timeframe: string;
  steps: string[];
  completed: boolean;
}

interface Recommendation {
  id: string;
  type: 'opportunity' | 'warning' | 'tip';
  title: string;
  description: string;
  impact: string;
  action: string;
  priority: number;
}

interface FinancialSnapshot {
  healthScore: number;
  healthGrade: string;
  netWorth: number;
  totalDebt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  emergencyFundMonths: number;
}

interface CoachDashboardData {
  snapshot: FinancialSnapshot;
  babySteps: BabyStep[];
  actionPlans: ActionPlan[];
  recommendations: Recommendation[];
  criticalIssues: string[];
  opportunities: string[];
}

export default function AIFinancialCoach() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<CoachDashboardData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  const [askCoachOpen, setAskCoachOpen] = useState(false);
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [askingCoach, setAskingCoach] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/ai/financial-coach/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch coach dashboard');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (_error) {
      // AIFinancialCoach error: Error fetching coach dashboard
      void _error;
      toast.error('Failed to load coach dashboard', 'Please try again later');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAskCoach = async () => {
    if (!coachQuestion.trim()) return;

    try {
      setAskingCoach(true);
      const response = await fetch('/api/ai/financial-coach/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: coachQuestion }),
      });

      if (!response.ok) {
        throw new Error('Failed to get coach response');
      }

      const data = await response.json();
      setCoachResponse(data.advice);
    } catch (_error) {
      // AIFinancialCoach error: Error asking coach
      void _error;
      toast.error('Failed to get coach response', 'Please try again later');
    } finally {
      setAskingCoach(false);
    }
  };

  const handleCompleteStep = async (planId: string) => {
    try {
      const response = await fetch(`/api/ai/financial-coach/goals/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete step');
      }

      toast.success('Step completed!', 'Great progress!');
      fetchDashboardData();
    } catch (_error) {
      // AIFinancialCoach error: Error completing step
      void _error;
      toast.error('Failed to complete step', 'Please try again');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 dark:bg-slate-700 rounded-lg h-32" />
          ))}
        </div>
        <div className="bg-gray-200 dark:bg-slate-700 rounded-lg h-64" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-slate-400">No data available</p>
      </div>
    );
  }

  const { snapshot, babySteps, actionPlans, recommendations, criticalIssues, opportunities } = dashboardData;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-200 dark:border-slate-700';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome to Your AI Financial Coach</h2>
        <p className="text-blue-100 text-lg">
          Let's work together to achieve your financial goals using proven strategies
        </p>
      </div>

      {/* Financial Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 dark:text-slate-300 text-sm font-medium">Health Score</span>
            <span className={`text-2xl font-bold ${getHealthScoreColor(snapshot.healthScore)}`}>
              {snapshot.healthScore}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400">Grade: {snapshot.healthGrade}</div>
          <div className="mt-4 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${snapshot.healthScore >= 80 ? 'bg-green-500' : snapshot.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${snapshot.healthScore}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium mb-2">Net Worth</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${snapshot.netWorth.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {snapshot.netWorth >= 0 ? 'Positive' : 'Negative'} net worth
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium mb-2">Total Debt</div>
          <div className="text-2xl font-bold text-red-600">
            ${snapshot.totalDebt.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {snapshot.totalDebt > 0 ? 'Focus on payoff' : 'Debt free!'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="text-gray-600 dark:text-slate-300 text-sm font-medium mb-2">Emergency Fund</div>
          <div className="text-2xl font-bold text-blue-600">
            {snapshot.emergencyFundMonths.toFixed(1)} mo
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {snapshot.emergencyFundMonths >= 6 ? 'Fully funded' : 'Keep building'}
          </div>
        </div>
      </div>

      {/* Critical Issues & Opportunities */}
      {(criticalIssues.length > 0 || opportunities.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {criticalIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Critical Issues
              </h3>
              <ul className="space-y-2">
                {criticalIssues.map((issue, idx) => (
                  <li key={idx} className="text-red-800 text-sm flex items-start">
                    <span className="mr-2">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {opportunities.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Opportunities
              </h3>
              <ul className="space-y-2">
                {opportunities.map((opportunity, idx) => (
                  <li key={idx} className="text-green-800 text-sm flex items-start">
                    <span className="mr-2">•</span>
                    <span>{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      )}

      {/* Dave Ramsey Baby Steps */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Your Baby Steps Progress</h3>
        <div className="space-y-4">
          {babySteps.map((step) => (
            <div key={step.step} className={`border rounded-lg p-4 ${step.completed ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                      {step.step}
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{step.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-11">{step.description}</p>
                  {!step.completed && step.progress > 0 && (
                    <div className="ml-11 mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 mb-1">
                        <span>Progress</span>
                        <span>{step.progress}%</span>
                      </div>
                      <div className="bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${step.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                {step.completed && (
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Plans */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Your Action Plan</h3>
          <button
            onClick={() => setAskCoachOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Ask Your Coach
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionPlans.slice(0, 6).map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(plan.priority)}`}
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm flex-1">{plan.title}</h4>
                <span className="text-xs font-medium px-2 py-1 rounded bg-white dark:bg-slate-800 bg-opacity-50">
                  {plan.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-xs mb-3 opacity-90">{plan.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Impact: {plan.estimatedImpact}</span>
                <span>{plan.timeframe}</span>
              </div>
              {plan.completed && (
                <div className="mt-2 flex items-center text-xs font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Completed
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">AI Recommendations</h3>
        <div className="space-y-4">
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4 ${
                  rec.type === 'opportunity' ? 'bg-green-100' :
                  rec.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {rec.type === 'opportunity' && (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {rec.type === 'warning' && (
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {rec.type === 'tip' && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{rec.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">{rec.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400">Impact: {rec.impact}</span>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      {rec.action}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Plan Detail Modal */}
      {selectedPlan && (
        <Modal isOpen={!!selectedPlan} onClose={() => setSelectedPlan(null)} title={selectedPlan.title}>
          <div className="space-y-4">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedPlan.priority)}`}>
                {selectedPlan.priority.toUpperCase()} Priority
              </span>
            </div>
            <p className="text-gray-700 dark:text-slate-200">{selectedPlan.description}</p>
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200 dark:border-slate-700">
              <div>
                <div className="text-sm text-gray-500 dark:text-slate-400">Estimated Impact</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selectedPlan.estimatedImpact}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-slate-400">Timeframe</div>
                <div className="font-semibold text-gray-900 dark:text-white">{selectedPlan.timeframe}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Steps to Complete</h4>
              <ol className="space-y-2">
                {selectedPlan.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-slate-200">
                    <span className="font-semibold mr-2">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            {!selectedPlan.completed && (
              <button
                onClick={() => handleCompleteStep(selectedPlan.id)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Mark as Complete
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Ask Coach Modal */}
      {askCoachOpen && (
        <Modal isOpen={askCoachOpen} onClose={() => { setAskCoachOpen(false); setCoachQuestion(''); setCoachResponse(''); }} title="Ask Your Financial Coach">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                What would you like to know?
              </label>
              <textarea
                value={coachQuestion}
                onChange={(e) => setCoachQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="e.g., Should I pay off debt or invest? How can I save more money?"
              />
            </div>
            <button
              onClick={handleAskCoach}
              disabled={askingCoach || !coachQuestion.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {askingCoach ? 'Getting advice...' : 'Get Advice'}
            </button>
            {coachResponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Coach's Advice</h4>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{coachResponse}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

