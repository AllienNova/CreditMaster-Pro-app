'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import StrategyRecommendation from '@/components/ai-strategies/StrategyRecommendation';
import ExecutionPlan from '@/components/ai-strategies/ExecutionPlan';
import PredictiveAnalysis from '@/components/ai-strategies/PredictiveAnalysis';
import type {
  AIStrategySummary,
  StrategyExecutionPlanSummary,
} from '@/types/ai-strategy';

function AIStrategiesContent() {
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loan');

  const [strategies, setStrategies] = useState<AIStrategySummary[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<AIStrategySummary | null>(null);
  const [executionPlan, setExecutionPlan] = useState<StrategyExecutionPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'execution' | 'predictions'>('recommendations');

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/recommend-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loanId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch strategies');
      }

      const data = (await response.json()) as { strategies?: AIStrategySummary[] };
      const strategyList = data.strategies ?? [];
      setStrategies(strategyList);
      if (strategyList.length > 0) {
        setSelectedStrategy(strategyList[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    if (loanId) {
      void fetchStrategies();
    }
  }, [loanId, fetchStrategies]);

  const handleGenerateExecutionPlan = async (strategy: AIStrategySummary) => {
    try {
      const response = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_id: strategy.recommendation_id,
          loan_id: strategy.loan_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate execution plan');
      }

      const data = (await response.json()) as { execution_plan: StrategyExecutionPlanSummary };
      setExecutionPlan(data.execution_plan);
      setActiveTab('execution');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate execution plan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!loanId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Loan Selected</h2>
            <p className="text-gray-600 mb-6">
              Please select a loan from your portfolio to view AI-powered strategies
            </p>
            <a
              href="/student-loans"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Student Loans
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <a href="/student-loans" className="hover:text-blue-600">Student Loans</a>
            <span>/</span>
            <span>AI Strategies</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Strategies</h1>
          <p className="text-gray-600 mt-2">
            Personalized recommendations powered by 300+ AI models
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'recommendations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Strategy Recommendations
              </button>
              <button
                onClick={() => setActiveTab('execution')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'execution'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                disabled={!executionPlan}
              >
                Execution Plan
              </button>
              <button
                onClick={() => setActiveTab('predictions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'predictions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                disabled={!selectedStrategy}
              >
                Predictive Analysis
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                {strategies.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No strategies available for this loan</p>
                  </div>
                ) : (
                  strategies.map((strategy, index) => (
                    <StrategyRecommendation
                      key={strategy.recommendation_id}
                      strategy={strategy}
                      rank={index + 1}
                      isSelected={selectedStrategy?.recommendation_id === strategy.recommendation_id}
                      onSelect={() => setSelectedStrategy(strategy)}
                      onGenerateExecutionPlan={() => handleGenerateExecutionPlan(strategy)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'execution' && executionPlan && (
              <ExecutionPlan plan={executionPlan} />
            )}

            {activeTab === 'predictions' && selectedStrategy && (
              <PredictiveAnalysis analysis={selectedStrategy.predictive_analysis} />
            )}
          </div>
        </div>

        {/* AI Confidence Badge */}
        {selectedStrategy && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {Math.round(selectedStrategy.ai_confidence_score * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">AI Confidence Score</h3>
                <p className="text-sm text-gray-700">
                  Our AI models are {Math.round(selectedStrategy.ai_confidence_score * 100)}% confident in this strategy
                  based on analysis of similar cases and federal regulations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIStrategiesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>}>
      <AIStrategiesContent />
    </Suspense>
  );
}
