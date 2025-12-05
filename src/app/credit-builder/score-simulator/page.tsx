'use client';

/**
 * Score Simulator Page
 * 
 * Interactive tool to simulate how different actions will affect credit score.
 * Users can select scenarios and see projected score changes.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ScoreSimulatorService,
  SIMULATION_SCENARIOS,
  UserCreditProfile,
  SimulationResult,
} from '@/lib/credit-builder/score-simulator-service';

const simulatorService = new ScoreSimulatorService();

// Default profile - in production, this would come from user data
const DEFAULT_PROFILE: UserCreditProfile = {
  currentScore: 650,
  utilization: 45,
  accountAge: 36,
  onTimePayments: 92,
  totalAccounts: 5,
  openAccounts: 4,
  recentInquiries: 2,
  negativeItems: 1,
  installmentLoans: 1,
  revolvingAccounts: 3,
};

export default function ScoreSimulatorPage() {
  const [profile, setProfile] = useState<UserCreditProfile>(DEFAULT_PROFILE);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  const result = useMemo<SimulationResult | null>(() => {
    if (selectedScenarios.length === 0) return null;
    return simulatorService.simulateScenarios(profile, selectedScenarios);
  }, [profile, selectedScenarios]);

  const suggestions = useMemo(() => {
    return simulatorService.getSuggestedScenarios(profile);
  }, [profile]);

  const toggleScenario = (id: string) => {
    setSelectedScenarios(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 740) return 'text-green-600';
    if (score >= 670) return 'text-blue-600';
    if (score >= 580) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 800) return 'Exceptional';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Score Simulator</h1>
              <p className="mt-1 text-sm text-gray-600">
                See how different actions could impact your credit score
              </p>
            </div>
            <Link
              href="/credit-builder"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Credit Builder
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Score Display */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Score Projection</h2>
              
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-40 h-40 relative">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="10" fill="none" />
                      <circle
                        cx="80" cy="80" r="70"
                        stroke={result ? '#22c55e' : '#3b82f6'}
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${((result?.projectedScore || profile.currentScore) - 300) / 550 * 440} 440`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold ${getScoreColor(result?.projectedScore || profile.currentScore)}`}>
                        {result?.projectedScore || profile.currentScore}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getScoreLabel(result?.projectedScore || profile.currentScore)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {result && (
                <div className="space-y-4">
                  <div className={`text-center p-3 rounded-lg ${result.scoreChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`text-2xl font-bold ${result.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.scoreChange >= 0 ? '+' : ''}{result.scoreChange} points
                    </span>
                    <p className="text-sm text-gray-600 mt-1">Projected change</p>
                  </div>

                  {result.factorChanges.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Factor Changes</h3>
                      {result.factorChanges.map(change => (
                        <div key={change.factor} className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 capitalize">{change.factor.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={change.impact >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {change.impact >= 0 ? '+' : ''}{change.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scenarios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Profile Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Current Profile</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Current Score', value: profile.currentScore },
                  { label: 'Utilization', value: `${profile.utilization}%` },
                  { label: 'Account Age', value: `${Math.floor(profile.accountAge / 12)}y ${profile.accountAge % 12}m` },
                  { label: 'On-Time Rate', value: `${profile.onTimePayments}%` },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Scenarios */}
            {suggestions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Suggested for You</h2>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => toggleScenario(scenario.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedScenarios.includes(scenario.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {scenario.icon} {scenario.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Scenarios */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Scenarios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SIMULATION_SCENARIOS.map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => toggleScenario(scenario.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedScenarios.includes(scenario.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{scenario.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className={`font-medium ${scenario.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {scenario.impact >= 0 ? '+' : ''}{scenario.impact} pts
                          </span>
                          <span className="text-gray-400">⏱ {scenario.timeframe}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            scenario.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            scenario.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {scenario.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result && result.recommendations.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h2>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline */}
            {result && result.timeline.length > 1 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Projected Timeline</h2>
                <div className="flex items-end gap-2 h-40">
                  {result.timeline.map((point, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <span className="text-xs font-medium text-gray-700 mb-1">{point.score}</span>
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all"
                        style={{ height: `${((point.score - 300) / 550) * 100}%` }}
                      />
                      <span className="text-xs text-gray-500 mt-2">
                        {point.month === 0 ? 'Now' : `+${point.month}mo`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

