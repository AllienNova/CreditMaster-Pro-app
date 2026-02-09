'use client';

/**
 * AI Insights Page
 * Personalized financial insights and coaching
 */

import React, { useEffect, useState } from 'react';
import { InsightCard, NudgeToast } from '@/components/ai';
import { useAIInsights } from '@/hooks/useAIInsights';
import type { CoachingInsight } from '@/lib/ai-personalization';

export default function InsightsPage() {
  const {
    insights,
    nudges,
    spendingAnalysis,
    loading,
    error,
    respondToNudge,
    refreshInsights,
  } = useAIInsights();

  const [dismissedInsights, setDismissedInsights] = useState<Set<number>>(
    new Set()
  );

  const handleDismissInsight = (index: number) => {
    setDismissedInsights((prev) => new Set([...prev, index]));
  };

  const handleNudgeAction = async (
    nudgeId: string,
    action: 'accepted' | 'dismissed' | 'snoozed'
  ) => {
    await respondToNudge(nudgeId, action);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-300">
            Analyzing your finances...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-slate-700/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-gray-200"
            >
              ← Back to Dashboard
            </a>
            <div className="flex items-center space-x-2">
              <span className="text-2xl"></span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Insights
              </h1>
            </div>
            <button
              onClick={refreshInsights}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Financial Personality Card */}
        {insights?.personality?.type && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl p-6 text-white mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl"></span>
              <div>
                <h2 className="text-xl font-bold">
                  Your Financial Personality
                </h2>
                <p className="text-blue-200 capitalize">
                  {insights.personality.type.replace('_', ' ')}
                </p>
              </div>
            </div>
            {insights.personality.riskScore !== null && (
              <div className="mt-4">
                <p className="text-sm text-blue-200 mb-1">
                  Risk Tolerance Score
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-white dark:bg-slate-800/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white dark:bg-slate-800 rounded-full transition-all duration-500"
                      style={{
                        width: `${insights.personality.riskScore * 10}%`,
                      }}
                    />
                  </div>
                  <span className="font-bold">
                    {insights.personality.riskScore}/10
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Nudges */}
        {nudges.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span></span> Action Items
            </h2>
            <div className="space-y-3">
              {nudges.map((nudge) => (
                <NudgeToast
                  key={nudge.id}
                  nudge={nudge}
                  onAccept={() => handleNudgeAction(nudge.id, 'accepted')}
                  onDismiss={() => handleNudgeAction(nudge.id, 'dismissed')}
                  onSnooze={() => handleNudgeAction(nudge.id, 'snoozed')}
                />
              ))}
            </div>
          </section>
        )}

        {/* AI Insights */}
        {insights?.insights && insights.insights.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span></span> Personalized Insights
            </h2>
            <div className="space-y-4">
              {insights.insights
                .filter((_, i) => !dismissedInsights.has(i))
                .map((insight, index) => (
                  <InsightCard
                    key={index}
                    insight={insight}
                    onDismiss={() => handleDismissInsight(index)}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Spending Analysis */}
        {spendingAnalysis && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span></span> Spending Analysis
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Total Analyzed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${spendingAnalysis.totalSpending?.toLocaleString() ?? '0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {spendingAnalysis.transactionCount ?? 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Avg Transaction
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${spendingAnalysis.averageTransaction?.toFixed(0) ?? '0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Risk Score
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      (spendingAnalysis.overallRiskScore ?? 0) > 7
                        ? 'text-red-500'
                        : (spendingAnalysis.overallRiskScore ?? 0) > 4
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  >
                    {spendingAnalysis.overallRiskScore?.toFixed(1) ?? '0'}/10
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {spendingAnalysis.recommendations &&
                spendingAnalysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {spendingAnalysis.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300"
                        >
                          <span className="text-green-500 mt-0.5"></span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* Coaching Actions */}
        {insights?.coaching?.suggestedActions &&
          insights.coaching.suggestedActions.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span></span> Suggested Actions
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="space-y-3">
                  {insights.coaching.suggestedActions.map((action, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            action.priority === 'high'
                              ? 'bg-red-500'
                              : action.priority === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {action.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      {action.estimatedImpact && (
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {action.estimatedImpact}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

        {/* Empty State */}
        {!insights && !error && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block"></span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Insights Yet
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              Start tracking your finances to get personalized AI insights.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block"></span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={refreshInsights}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
