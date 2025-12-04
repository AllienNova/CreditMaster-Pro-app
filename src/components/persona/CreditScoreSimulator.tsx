'use client';

import { useState } from 'react';
import { CircularProgress, InfoTooltip } from '@/components/ui';

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  impact: number; // Points change
  timeframe: string;
}

const scenarios: SimulationScenario[] = [
  {
    id: 'pay-off-card',
    name: 'Pay Off Credit Card',
    description: 'Pay off a credit card with $5,000 balance',
    impact: 25,
    timeframe: 'Immediate',
  },
  {
    id: 'remove-collection',
    name: 'Remove Collection Account',
    description: 'Successfully dispute and remove a collection',
    impact: 35,
    timeframe: '30-60 days',
  },
  {
    id: 'reduce-utilization',
    name: 'Reduce Credit Utilization',
    description: 'Lower utilization from 80% to 30%',
    impact: 40,
    timeframe: 'Immediate',
  },
  {
    id: 'add-tradeline',
    name: 'Add Authorized User Tradeline',
    description: 'Become authorized user on aged account',
    impact: 20,
    timeframe: '30 days',
  },
  {
    id: 'remove-late-payment',
    name: 'Remove Late Payment',
    description: 'Successfully remove a 30-day late payment',
    impact: 15,
    timeframe: '30-60 days',
  },
  {
    id: 'pay-down-debt',
    name: 'Pay Down 50% of Debt',
    description: 'Reduce total debt by half',
    impact: 30,
    timeframe: 'Immediate',
  },
];

export default function CreditScoreSimulator() {
  const [currentScore, setCurrentScore] = useState(650);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  const calculateProjectedScore = () => {
    const totalImpact = selectedScenarios.reduce((sum, scenarioId) => {
      const scenario = scenarios.find((s) => s.id === scenarioId);
      return sum + (scenario?.impact || 0);
    }, 0);

    return Math.min(850, currentScore + totalImpact);
  };

  const projectedScore = calculateProjectedScore();
  const scoreChange = projectedScore - currentScore;

  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 740) return 'text-green-600';
    if (score >= 670) return 'text-blue-600';
    if (score >= 580) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 740) return 'Excellent';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Credit Score Simulator</h2>
        <InfoTooltip content="See how different actions could impact your credit score" />
      </div>

      {/* Current Score Input */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Credit Score
        </label>
        <input
          type="number"
          min="300"
          max="850"
          value={currentScore}
          onChange={(e) => setCurrentScore(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Score Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Current Score */}
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Current Score</h3>
          <CircularProgress progress={(currentScore / 850) * 100} size={150} />
          <div className="mt-4 text-center">
            <div className={`text-4xl font-bold ${getScoreColor(currentScore)}`}>
              {currentScore}
            </div>
            <div className="text-sm text-gray-500 mt-1">{getScoreLabel(currentScore)}</div>
          </div>
        </div>

        {/* Projected Score */}
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Projected Score</h3>
          <CircularProgress progress={(projectedScore / 850) * 100} size={150} />
          <div className="mt-4 text-center">
            <div className={`text-4xl font-bold ${getScoreColor(projectedScore)}`}>
              {projectedScore}
            </div>
            <div className="text-sm text-gray-500 mt-1">{getScoreLabel(projectedScore)}</div>
            {scoreChange > 0 && (
              <div className="text-green-600 font-semibold mt-2">
                +{scoreChange} points
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Actions to Simulate
        </h3>
        <div className="space-y-3">
          {scenarios.map((scenario) => {
            const isSelected = selectedScenarios.includes(scenario.id);
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => toggleScenario(scenario.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 ml-7">
                      {scenario.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 ml-7">
                      <span className="text-sm text-green-600 font-medium">
                        +{scenario.impact} points
                      </span>
                      <span className="text-sm text-gray-500">
                        {scenario.timeframe}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Plan */}
      {selectedScenarios.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Your Action Plan</h4>
          <p className="text-sm text-blue-800 mb-3">
            By completing these {selectedScenarios.length} action{selectedScenarios.length > 1 ? 's' : ''}, you could increase your score by{' '}
            <span className="font-bold">{scoreChange} points</span> to reach{' '}
            <span className="font-bold">{projectedScore}</span>.
          </p>
          <button
            type="button"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Action Plan
          </button>
        </div>
      )}
    </div>
  );
}

