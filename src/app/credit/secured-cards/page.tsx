'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Shield,
  Star,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Info,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

type CreditBuildingGoal =
  | 'first_credit'
  | 'rebuild_credit'
  | 'increase_score'
  | 'graduation_path'
  | 'maximize_rewards';

interface SecuredCard {
  id: string;
  name: string;
  issuer: string;
  annualFee: number;
  depositMin: number;
  depositMax: number;
  rewardsRate?: number;
  rewardsType?: string;
  graduationEligible: boolean;
  graduationTimeMonths?: number;
  noCreditCheckRequired: boolean;
  features: string[];
  pros: string[];
  cons: string[];
  rating: number;
  applicationUrl: string;
}

interface CardRecommendation {
  card: SecuredCard;
  matchScore: number;
  approvalLikelihood: 'high' | 'medium' | 'low';
  reasons: string[];
  warnings?: string[];
  projectedScoreImpact: number;
}

const MOCK_RECOMMENDATIONS: CardRecommendation[] = [
  {
    card: {
      id: 'discover-it-secured',
      name: 'Discover it® Secured Credit Card',
      issuer: 'Discover',
      annualFee: 0,
      depositMin: 200,
      depositMax: 2500,
      rewardsRate: 2,
      rewardsType: '2% at gas stations and restaurants, 1% all else',
      graduationEligible: true,
      graduationTimeMonths: 8,
      noCreditCheckRequired: false,
      features: [
        'Cashback Match first year',
        'Free FICO score',
        'No foreign transaction fees',
      ],
      pros: [
        'Best rewards for a secured card',
        'No annual fee',
        'Quick graduation potential',
      ],
      cons: ['Requires credit check'],
      rating: 4.8,
      applicationUrl: '#',
    },
    matchScore: 95,
    approvalLikelihood: 'high',
    reasons: [
      'Excellent match for your goal: Path to unsecured card',
      'Can graduate to unsecured card in ~8 months',
      'No annual fee',
      'Reports to all 3 credit bureaus',
    ],
    projectedScoreImpact: 45,
  },
  {
    card: {
      id: 'capital-one-quicksilver',
      name: 'Capital One Quicksilver Secured',
      issuer: 'Capital One',
      annualFee: 0,
      depositMin: 200,
      depositMax: 1000,
      rewardsRate: 1.5,
      rewardsType: '1.5% unlimited cashback',
      graduationEligible: true,
      graduationTimeMonths: 6,
      noCreditCheckRequired: false,
      features: ['Automatic credit line reviews', 'CreditWise monitoring'],
      pros: ['Good rewards rate', 'Fast graduation possible'],
      cons: ['Higher APR', 'Lower maximum credit line'],
      rating: 4.5,
      applicationUrl: '#',
    },
    matchScore: 88,
    approvalLikelihood: 'high',
    reasons: [
      'Good rewards rate of 1.5%',
      'Fast graduation possible in 6 months',
      'No annual fee',
    ],
    projectedScoreImpact: 40,
  },
  {
    card: {
      id: 'opensky-secured',
      name: 'OpenSky® Secured Visa®',
      issuer: 'OpenSky',
      annualFee: 35,
      depositMin: 200,
      depositMax: 3000,
      graduationEligible: false,
      noCreditCheckRequired: true,
      features: ['No credit check required', 'No bank account required'],
      pros: [
        'Guaranteed approval',
        'No bank account needed',
        'Higher credit line available',
      ],
      cons: ['Annual fee', 'No rewards', 'No graduation path'],
      rating: 4.0,
      applicationUrl: '#',
    },
    matchScore: 75,
    approvalLikelihood: 'high',
    reasons: [
      'No credit check - guaranteed approval',
      'Higher credit line available up to $3,000',
    ],
    warnings: ['$35 annual fee', 'No graduation to unsecured card'],
    projectedScoreImpact: 35,
  },
];

const GOALS: { id: CreditBuildingGoal; label: string; description: string }[] =
  [
    {
      id: 'first_credit',
      label: 'Build First Credit',
      description: 'No credit history yet',
    },
    {
      id: 'rebuild_credit',
      label: 'Rebuild Credit',
      description: 'Recovering from past issues',
    },
    {
      id: 'graduation_path',
      label: 'Path to Unsecured',
      description: 'Want to graduate to regular card',
    },
    {
      id: 'maximize_rewards',
      label: 'Maximize Rewards',
      description: 'Earn while building credit',
    },
  ];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function SecuredCardsPage() {
  const [recommendations] =
    useState<CardRecommendation[]>(MOCK_RECOMMENDATIONS);
  const [selectedGoal, setSelectedGoal] =
    useState<CreditBuildingGoal>('graduation_path');
  const [depositAmount, setDepositAmount] = useState(500);

  const getApprovalColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Secured Card Finder
            </h1>
          </div>
          <p className="text-gray-600 dark:text-slate-400">
            Find the best secured credit card for your credit building journey
          </p>
        </div>

        {/* Goal Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            What's your goal?
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedGoal === goal.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {goal.label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {goal.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label
              htmlFor="deposit"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
            >
              Available Deposit Amount
            </label>
            <div className="flex items-center gap-4">
              <input
                id="deposit"
                type="range"
                min="200"
                max="3000"
                step="100"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
              />
              <span className="text-lg font-semibold text-gray-900 dark:text-white w-24 text-right">
                {formatCurrency(depositAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Top Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-8 text-white"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium text-blue-100">
              Top Recommendation
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {recommendations[0].card.name}
              </h2>
              <p className="text-blue-100 mb-4">
                {recommendations[0].card.issuer}
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendations[0].reasons.slice(0, 3).map((reason, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white dark:bg-slate-800/20 rounded-full text-sm"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold">
                  {recommendations[0].matchScore}
                </div>
                <div className="text-blue-200 text-sm">Match Score</div>
              </div>
              <a
                href={recommendations[0].card.applicationUrl}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Apply Now
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* All Recommendations */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          All Recommended Cards
        </h2>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rec.card.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getApprovalColor(rec.approvalLikelihood)}`}
                      >
                        {rec.approvalLikelihood.charAt(0).toUpperCase() +
                          rec.approvalLikelihood.slice(1)}{' '}
                        Approval
                      </span>
                      {rec.card.noCreditCheckRequired && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium">
                          No Credit Check
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
                      {rec.card.issuer}
                    </p>

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Annual Fee
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {rec.card.annualFee === 0
                            ? '$0'
                            : formatCurrency(rec.card.annualFee)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Deposit
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(rec.card.depositMin)} -{' '}
                          {formatCurrency(rec.card.depositMax)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Rewards
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {rec.card.rewardsRate
                            ? `${rec.card.rewardsRate}%`
                            : 'None'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Graduation
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {rec.card.graduationEligible
                            ? `~${rec.card.graduationTimeMonths} months`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-2">
                      {rec.reasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-slate-400">
                            {reason}
                          </span>
                        </div>
                      ))}
                      {rec.warnings?.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-amber-600 dark:text-amber-400">
                            {warning}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score & Apply */}
                  <div className="flex flex-row lg:flex-col items-center gap-4 lg:min-w-[140px]">
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {rec.card.rating}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Rating</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">
                          +{rec.projectedScoreImpact}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Score Impact</div>
                    </div>
                    <a
                      href={rec.card.applicationUrl}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Apply
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Tips for Success
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Keep your utilization below 30% of your credit limit
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Set up autopay to never miss a payment
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Use your card for at least one small purchase monthly
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Pay your balance in full each month to avoid interest
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Request credit limit increases after 6 months of good behavior
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
