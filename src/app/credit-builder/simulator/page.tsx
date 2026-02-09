'use client';


import { Icon } from '@/components/ui/Icon';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// Types
interface ScenarioType {
  id: string;
  name: string;
  description: string;
  category: 'payment' | 'utilization' | 'accounts' | 'inquiries' | 'negative';
  icon: string;
}

interface SimulationInput {
  scenarioId: string;
  amount?: number;
  percentage?: number;
  accounts?: number;
  months?: number;
  customDescription?: string;
}

interface ScoreImpact {
  currentScore: number;
  projectedScore: number;
  change: number;
  changePercentage: number;
  timeline: number; // months
  confidence: number; // 0-100
  factors: {
    paymentHistory: number;
    utilization: number;
    creditAge: number;
    creditMix: number;
    newCredit: number;
  };
  recommendations: string[];
  warnings: string[];
}

interface Goal {
  id: string;
  name: string;
  targetScore: number;
  timeline: number;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// Scenario Definitions
const scenarios: ScenarioType[] = [
  // Payment Scenarios
  {
    id: 'pay_card_full',
    name: 'Pay Off Credit Card',
    description: 'Pay off entire balance on one or more credit cards',
    category: 'payment',
    icon: "credit-card",
  },
  {
    id: 'pay_card_partial',
    name: 'Reduce Credit Card Balance',
    description: 'Make partial payment to reduce utilization',
    category: 'payment',
    icon: "banknotes",
  },
  {
    id: 'pay_loan',
    name: 'Pay Off Installment Loan',
    description: 'Pay off auto loan, personal loan, or mortgage',
    category: 'payment',
    icon: "scale",
  },

  // Utilization Scenarios
  {
    id: 'increase_limit',
    name: 'Increase Credit Limit',
    description: 'Request credit limit increase on existing card',
    category: 'utilization',
    icon: "credit-card",
  },
  {
    id: 'redistribute_balance',
    name: 'Redistribute Balances',
    description: 'Move balances to optimize utilization per card',
    category: 'utilization',
    icon: "arrow-path",
  },

  // Account Scenarios
  {
    id: 'open_new_card',
    name: 'Open New Credit Card',
    description: 'Apply for and open a new credit card account',
    category: 'accounts',
    icon: "sparkles",
  },
  {
    id: 'close_account',
    name: 'Close Credit Account',
    description: 'Close existing credit card or line of credit',
    category: 'accounts',
    icon: "credit-card",
  },
  {
    id: 'become_authorized',
    name: 'Become Authorized User',
    description: 'Get added to someone else\'s credit card',
    category: 'accounts',
    icon: "sparkles",
  },

  // Inquiry Scenarios
  {
    id: 'apply_credit',
    name: 'Apply for New Credit',
    description: 'Submit credit application (hard inquiry)',
    category: 'inquiries',
    icon: "document",
  },
  {
    id: 'wait_inquiries',
    name: 'Wait for Inquiries to Age',
    description: 'Time passes and inquiries become less impactful',
    category: 'inquiries',
    icon: "clock",
  },

  // Negative Item Scenarios
  {
    id: 'remove_late_payment',
    name: 'Remove Late Payment',
    description: 'Successfully dispute or goodwill remove late payment',
    category: 'negative',
    icon: "document-text",
  },
  {
    id: 'settle_collection',
    name: 'Settle Collection Account',
    description: 'Pay or settle collection account',
    category: 'negative',
    icon: "banknotes",
  },
  {
    id: 'wait_negative',
    name: 'Wait for Negative Item to Age',
    description: 'Time passes and negative item impact decreases',
    category: 'negative',
    icon: "clock",
  },
];

// Pre-defined goals
const commonGoals: Goal[] = [
  {
    id: 'good_credit',
    name: 'Reach "Good" Credit (700+)',
    targetScore: 700,
    timeline: 6,
    difficulty: 'medium',
    steps: [
      'Pay down high-utilization cards to under 30%',
      'Ensure all payments are on-time for next 6 months',
      'Dispute any inaccurate negative items',
      'Avoid new hard inquiries',
    ],
  },
  {
    id: 'excellent_credit',
    name: 'Reach "Excellent" Credit (750+)',
    targetScore: 750,
    timeline: 12,
    difficulty: 'hard',
    steps: [
      'Reduce utilization to under 10%',
      'Maintain perfect payment history for 12 months',
      'Age accounts without new applications',
      'Diversify credit mix if needed',
      'Remove all negative items',
    ],
  },
  {
    id: 'qualify_mortgage',
    name: 'Qualify for Mortgage (740+)',
    targetScore: 740,
    timeline: 9,
    difficulty: 'hard',
    steps: [
      'Pay off collections and charge-offs',
      'Reduce debt-to-income ratio',
      'Build payment history for 9+ months',
      'Avoid new credit for 6 months before application',
      'Get pre-qualified to understand requirements',
    ],
  },
  {
    id: 'qualify_auto',
    name: 'Qualify for Auto Loan (680+)',
    targetScore: 680,
    timeline: 4,
    difficulty: 'easy',
    steps: [
      'Pay down revolving debt to 50% utilization',
      'Make all payments on-time',
      'Consider credit builder loan',
      'Save for larger down payment',
    ],
  },
  {
    id: 'best_rates',
    name: 'Get Best Interest Rates (800+)',
    targetScore: 800,
    timeline: 18,
    difficulty: 'hard',
    steps: [
      'Achieve near-zero utilization (1-5%)',
      'Maintain 10+ year average account age',
      'Have diverse credit mix',
      'Zero negative items',
      'Minimal inquiries',
    ],
  },
];

export default function CreditScoreSimulator() {
  const { user, loading: authLoading } = useAuth();

  const [currentScore, setCurrentScore] = useState(650);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [scenarioInput, setScenarioInput] = useState<SimulationInput>({
    scenarioId: '',
  });
  const [impact, setImpact] = useState<ScoreImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [showGoals, setShowGoals] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparisons, setComparisons] = useState<ScoreImpact[]>([]);

  useEffect(() => {
    fetchCurrentScore();
  }, []);

  const fetchCurrentScore = async () => {
    try {
      const response = await fetch('/api/credit-builder/score');
      if (response.ok) {
        const data = await response.json();
        setCurrentScore(data.score || 650);
      }
    } catch (err) {
      console.error('Failed to fetch score:', err);
    }
  };

  const handleScenarioSelect = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setScenarioInput({ scenarioId });
    setImpact(null);
    setError(null);
  };

  const simulateScenario = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate score impact based on scenario
      const predicted = calculateScoreImpact(currentScore, scenarioInput);
      setImpact(predicted);

      if (compareMode) {
        setComparisons([...comparisons, predicted]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const calculateScoreImpact = (
    baseScore: number,
    input: SimulationInput
  ): ScoreImpact => {
    const scenario = scenarios.find((s) => s.id === input.scenarioId);
    if (!scenario) {
      throw new Error('Invalid scenario');
    }

    let scoreChange = 0;
    let timeline = 1; // months
    let confidence = 85;
    const factors = {
      paymentHistory: 0,
      utilization: 0,
      creditAge: 0,
      creditMix: 0,
      newCredit: 0,
    };
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Calculate impact based on scenario
    switch (scenario.id) {
      case 'pay_card_full':
        scoreChange = 20 + Math.floor(Math.random() * 15);
        factors.utilization = 60;
        factors.paymentHistory = 25;
        timeline = 1;
        confidence = 90;
        recommendations.push('Pay off high-utilization cards first');
        recommendations.push('Keep account open after paying off');
        recommendations.push('Continue using card for small purchases');
        break;

      case 'pay_card_partial':
        const reductionPct = input.percentage || 50;
        scoreChange = Math.floor((reductionPct / 100) * 15) + 5;
        factors.utilization = 80;
        timeline = 1;
        confidence = 85;
        recommendations.push('Aim to get below 30% utilization');
        recommendations.push('Pay before statement date for faster impact');
        break;

      case 'pay_loan':
        scoreChange = -5 + Math.floor(Math.random() * 15);
        factors.creditMix = 40;
        factors.utilization = 30;
        timeline = 1;
        confidence = 70;
        warnings.push('Closing installment loan may temporarily lower score');
        recommendations.push('Keep credit cards active to maintain mix');
        break;

      case 'increase_limit':
        const increaseAmt = input.amount || 2000;
        scoreChange = 10 + Math.floor((increaseAmt / 1000) * 3);
        factors.utilization = 90;
        timeline = 1;
        confidence = 80;
        recommendations.push('Request increases every 6-12 months');
        recommendations.push('Use soft pull requests when possible');
        warnings.push('Some issuers do hard pull for limit increase');
        break;

      case 'open_new_card':
        scoreChange = -10 + Math.floor(Math.random() * 5);
        factors.newCredit = -50;
        factors.creditAge = -30;
        factors.creditMix = 20;
        timeline = 3;
        confidence = 75;
        warnings.push('New account will lower average age');
        warnings.push('Hard inquiry will impact score temporarily');
        recommendations.push('Score typically recovers within 3-6 months');
        recommendations.push('Keep utilization low on new account');
        break;

      case 'close_account':
        scoreChange = -15 - Math.floor(Math.random() * 10);
        factors.utilization = -40;
        factors.creditAge = -35;
        timeline = 1;
        confidence = 85;
        warnings.push('Closing accounts reduces available credit');
        warnings.push('May increase overall utilization ratio');
        recommendations.push('Only close accounts with annual fees');
        recommendations.push('Keep oldest accounts open');
        break;

      case 'become_authorized':
        scoreChange = 25 + Math.floor(Math.random() * 20);
        factors.paymentHistory = 40;
        factors.utilization = 30;
        factors.creditAge = 20;
        timeline = 2;
        confidence = 80;
        recommendations.push('Choose account with perfect payment history');
        recommendations.push('Look for low utilization (under 10%)');
        recommendations.push('Older accounts provide more benefit');
        warnings.push('You inherit the account\'s payment history');
        break;

      case 'apply_credit':
        scoreChange = -5 - Math.floor(Math.random() * 5);
        factors.newCredit = -100;
        timeline = 1;
        confidence = 95;
        warnings.push('Hard inquiry will impact score for 12 months');
        recommendations.push('Space out applications by 6+ months');
        recommendations.push('Only apply when you have good approval odds');
        break;

      case 'wait_inquiries':
        const waitMonths = input.months || 12;
        scoreChange = Math.floor(waitMonths / 3) * 2;
        factors.newCredit = 100;
        timeline = waitMonths;
        confidence = 95;
        recommendations.push('Inquiries fall off after 24 months');
        recommendations.push('Impact decreases significantly after 12 months');
        break;

      case 'remove_late_payment':
        const ageInYears = (input.months || 12) / 12;
        scoreChange = 30 + Math.floor((2 - ageInYears) * 15);
        factors.paymentHistory = 100;
        timeline = 1;
        confidence = 75;
        recommendations.push('Use goodwill letter for one-time mistakes');
        recommendations.push('Dispute if payment was actually on-time');
        recommendations.push('Recent late payments have bigger impact');
        break;

      case 'settle_collection':
        scoreChange = 5 + Math.floor(Math.random() * 10);
        factors.paymentHistory = 30;
        timeline = 1;
        confidence = 65;
        warnings.push('Paid collections still show on report');
        warnings.push('Score impact may be minimal');
        recommendations.push('Request pay-for-delete if possible');
        recommendations.push('Get settlement agreement in writing');
        break;

      case 'wait_negative':
        const negativeMonths = input.months || 24;
        scoreChange = Math.floor(negativeMonths / 6) * 5;
        factors.paymentHistory = 100;
        timeline = negativeMonths;
        confidence = 90;
        recommendations.push('Most negatives fall off after 7 years');
        recommendations.push('Impact decreases over time');
        recommendations.push('Build positive history while waiting');
        break;

      default:
        scoreChange = 0;
    }

    const projectedScore = Math.max(300, Math.min(850, baseScore + scoreChange));

    return {
      currentScore: baseScore,
      projectedScore,
      change: scoreChange,
      changePercentage: (scoreChange / baseScore) * 100,
      timeline,
      confidence,
      factors,
      recommendations,
      warnings,
    };
  };

  const analyzeGoal = (goalId: string) => {
    const goal = commonGoals.find((g) => g.id === goalId);
    if (!goal) return;

    setSelectedGoal(goalId);
    setShowGoals(true);
  };

  const clearComparisons = () => {
    setComparisons([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 dark:text-slate-200 font-medium">Loading Credit Score Simulator...</p>
        </div>
      </div>
    );
  }

  const selectedScenarioData = scenarios.find((s) => s.id === selectedScenario);
  const selectedGoalData = commonGoals.find((g) => g.id === selectedGoal);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/credit-builder"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Credit Score Simulator 
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            See how different actions impact your credit score before you take them. Plan your credit improvement strategy with confidence.
          </p>
        </div>

        {/* Current Score Display */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl p-8 mb-8 text-white shadow-xl">
          <div className="text-center">
            <p className="text-blue-100 mb-2">Your Current Credit Score</p>
            <p className="text-6xl font-bold mb-4">{currentScore}</p>
            <p className="text-blue-100">
              {currentScore >= 800 && 'Exceptional'}
              {currentScore >= 740 && currentScore < 800 && 'Very Good'}
              {currentScore >= 670 && currentScore < 740 && 'Good'}
              {currentScore >= 580 && currentScore < 670 && 'Fair'}
              {currentScore < 580 && 'Poor'}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setCompareMode(false)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              !compareMode
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-2 border-gray-200 dark:border-slate-700'
            }`}
          >
            Single Scenario
          </button>
          <button
            onClick={() => setCompareMode(true)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              compareMode
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-2 border-gray-200 dark:border-slate-700'
            }`}
          >
            Compare Scenarios
          </button>
          <button
            onClick={() => setShowGoals(!showGoals)}
            className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Goal Planning
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Scenario Selection */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Select Scenario
              </h2>

              {/* Scenario Categories */}
              {['payment', 'utilization', 'accounts', 'inquiries', 'negative'].map((category) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-3 capitalize">
                    {category === 'payment' && 'Payment Actions'}
                    {category === 'utilization' && 'Utilization Management'}
                    {category === 'accounts' && 'Account Changes'}
                    {category === 'inquiries' && 'Credit Inquiries'}
                    {category === 'negative' && 'Negative Items'}
                  </h3>
                  <div className="space-y-2">
                    {scenarios
                      .filter((s) => s.category === category)
                      .map((scenario) => (
                        <button
                          key={scenario.id}
                          onClick={() => handleScenarioSelect(scenario.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedScenario === scenario.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon name={scenario.icon} className="text-2xl inline-block" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {scenario.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-slate-300">
                                {scenario.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Scenario Input */}
            {selectedScenarioData && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Scenario Details
                </h3>

                {/* Dynamic inputs based on scenario */}
                {['pay_card_full', 'pay_card_partial', 'pay_loan'].includes(selectedScenario) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      value={scenarioInput.amount || ''}
                      onChange={(e) =>
                        setScenarioInput({
                          ...scenarioInput,
                          amount: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                )}

                {['pay_card_partial', 'redistribute_balance'].includes(selectedScenario) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                      Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scenarioInput.percentage || ''}
                      onChange={(e) =>
                        setScenarioInput({
                          ...scenarioInput,
                          percentage: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter percentage"
                    />
                  </div>
                )}

                {['wait_inquiries', 'wait_negative'].includes(selectedScenario) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                      Time Period (months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="84"
                      value={scenarioInput.months || ''}
                      onChange={(e) =>
                        setScenarioInput({
                          ...scenarioInput,
                          months: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter months"
                    />
                  </div>
                )}

                <button
                  onClick={simulateScenario}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? 'Simulating...' : 'Simulate Impact'}
                </button>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div>
            {impact && !compareMode && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Projected Impact
                </h2>

                {/* Score Change */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-slate-300">Current Score</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {impact.currentScore}
                      </p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm text-gray-600 dark:text-slate-300">Change</p>
                      <p
                        className={`text-3xl font-bold ${
                          impact.change > 0
                            ? 'text-green-600'
                            : impact.change < 0
                            ? 'text-red-600'
                            : 'text-gray-600 dark:text-slate-300'
                        }`}
                      >
                        {impact.change > 0 ? '+' : ''}
                        {impact.change}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-slate-300">Projected Score</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {impact.projectedScore}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <span>Timeline: {impact.timeline} month{impact.timeline !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>Confidence: {impact.confidence}%</span>
                  </div>
                </div>

                {/* Factor Breakdown */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Impact by Factor
                  </h3>
                  {Object.entries(impact.factors)
                    .filter(([_, value]) => value !== 0)
                    .map(([factor, value]) => (
                      <div key={factor} className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-slate-200 capitalize">
                            {factor.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span
                            className={
                              value > 0
                                ? 'text-green-600'
                                : value < 0
                                ? 'text-red-600'
                                : 'text-gray-600 dark:text-slate-300'
                            }
                          >
                            {value > 0 ? '+' : ''}
                            {value}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              value > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.abs(value)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Recommendations */}
                {impact.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span></span> Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {impact.recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-200"
                        >
                          <span className="text-green-500 mt-1"></span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {impact.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <span></span> Important Warnings
                    </h3>
                    <ul className="space-y-1">
                      {impact.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-yellow-800">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {compareMode && comparisons.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Scenario Comparison
                  </h2>
                  <button
                    onClick={clearComparisons}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-4">
                  {comparisons.map((comp, idx) => (
                    <div
                      key={idx}
                      className="border-2 border-gray-200 dark:border-slate-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Scenario {idx + 1}
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            comp.change > 0
                              ? 'text-green-600'
                              : comp.change < 0
                              ? 'text-red-600'
                              : 'text-gray-600 dark:text-slate-300'
                          }`}
                        >
                          {comp.change > 0 ? '+' : ''}
                          {comp.change}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                        {comp.currentScore} → {comp.projectedScore} in{' '}
                        {comp.timeline} month{comp.timeline !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showGoals && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Goal Planning
                </h2>
                <div className="space-y-3">
                  {commonGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => analyzeGoal(goal.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedGoal === goal.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {goal.name}
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            goal.difficulty === 'easy'
                              ? 'bg-green-100 text-green-800'
                              : goal.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {goal.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        Target: {goal.targetScore} • Timeline: {goal.timeline}{' '}
                        months
                      </p>
                    </button>
                  ))}
                </div>

                {selectedGoalData && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3">
                      Steps to Reach {selectedGoalData.name}
                    </h3>
                    <ol className="space-y-2">
                      {selectedGoalData.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-sm text-blue-800"
                        >
                          <span className="font-semibold">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Gap:</strong> You need{' '}
                        {selectedGoalData.targetScore - currentScore} points
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>Timeline:</strong> Approximately{' '}
                        {selectedGoalData.timeline} months with consistent effort
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Educational Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            Understanding Score Predictions
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">Confidence Levels</p>
              <p>
                90-100%: Highly predictable<br />
                75-89%: Generally accurate<br />
                60-74%: Moderate uncertainty<br />
                Below 60%: Estimate only
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Important Notes</p>
              <p>
                • Predictions based on FICO scoring model<br />
                • Actual impact may vary by credit bureau<br />
                • Individual results depend on complete credit profile<br />
                • Combine multiple positive actions for best results
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
