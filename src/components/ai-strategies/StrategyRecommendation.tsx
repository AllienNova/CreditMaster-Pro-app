'use client';

import type { AIStrategySummary } from '@/types/ai-strategy';

interface StrategyRecommendationProps {
  strategy: AIStrategySummary;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  onGenerateExecutionPlan: () => void;
}

export default function StrategyRecommendation({
  strategy,
  rank,
  isSelected,
  onSelect,
  onGenerateExecutionPlan,
}: StrategyRecommendationProps) {
  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 border-gray-300 dark:border-slate-600';
      case 3:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAutomationLevelLabel = (level: number) => {
    if (level >= 0.8) return 'Highly Automated';
    if (level >= 0.5) return 'Partially Automated';
    return 'Manual Process';
  };

  return (
    <div
      className={`border-2 rounded-lg transition-all cursor-pointer ${ isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white dark:bg-slate-800 hover:border-gray-300 dark:border-slate-600' }`}
      onClick={onSelect}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${getRankBadgeColor(rank)}`}>
              #{rank}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {strategy.strategy_orchestration?.primary_strategy?.strategy_name || 'Strategy Recommendation'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                ID: {strategy.recommendation_id}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getConfidenceColor(strategy.ai_confidence_score)}`}>
              {Math.round(strategy.ai_confidence_score * 100)}%
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">Confidence</p>
          </div>
        </div>

        {/* Strategy Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Automation Level</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${strategy.automation_level * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(strategy.automation_level * 100)}%
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">{getAutomationLevelLabel(strategy.automation_level)}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Strategy Type</h4>
            <p className="text-sm text-gray-900 dark:text-white">
              {strategy.strategy_orchestration?.strategy_type || 'Multi-faceted Approach'}
            </p>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
              {strategy.strategy_orchestration?.parallel_strategies?.length || 0} parallel actions
            </p>
          </div>
        </div>

        {/* Expected Outcomes */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Expected Outcomes</h4>
          <div className="space-y-2">
            {strategy.expected_outcomes.slice(0, 3).map((outcome, index) => (
              <div key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-slate-200">{outcome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Mitigation */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Risk Mitigation</h4>
          <div className="space-y-2">
            {strategy.risk_mitigation.slice(0, 2).map((risk, index) => (
              <div key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-slate-200">{risk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Metrics */}
        {strategy.predictive_analysis && (
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Success Rate</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {Math.round(strategy.predictive_analysis.predicted_success_rate * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Timeline</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {strategy.predictive_analysis.predicted_timeline} days
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Credit Impact</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                +{strategy.predictive_analysis.predicted_credit_impact} pts
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateExecutionPlan();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Generate Execution Plan
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle view details
            }}
            className="px-4 py-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors text-sm font-medium"
          >
            View Details
          </button>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-blue-900">Currently Selected Strategy</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
