'use client';

/**
 * Credit Utilization Optimizer
 *
 * Helps users optimize credit card utilization for maximum score impact.
 * Features interactive sliders, real-time calculations, and AI recommendations.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Card {
  id: string;
  name: string;
  balance: number;
  limit: number;
  utilization: number;
  status: 'good' | 'warning' | 'danger';
}

export default function UtilizationOptimizerPage() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<Card[]>([
    {
      id: '1',
      name: 'Chase Freedom',
      balance: 1500,
      limit: 5000,
      utilization: 30,
      status: 'good',
    },
    {
      id: '2',
      name: 'Capital One',
      balance: 2800,
      limit: 4000,
      utilization: 70,
      status: 'danger',
    },
    {
      id: '3',
      name: 'Discover it',
      balance: 500,
      limit: 3000,
      utilization: 16.7,
      status: 'good',
    },
  ]);
  const [monthlyBudget, setMonthlyBudget] = useState(800);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const totalBalance = cards.reduce((sum, card) => sum + card.balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.limit, 0);
  const currentUtilization = (totalBalance / totalLimit) * 100;
  const optimalUtilization = 10;

  const updateCardBalance = (id: string, newBalance: number) => {
    setCards(
      cards.map((card) => {
        if (card.id === id) {
          const utilization = (newBalance / card.limit) * 100;
          return {
            ...card,
            balance: newBalance,
            utilization,
            status:
              utilization < 30
                ? 'good'
                : utilization < 50
                  ? 'warning'
                  : 'danger',
          };
        }
        return card;
      })
    );
  };

  const getOptimalDistribution = () => {
    const optimalBalance = totalLimit * (optimalUtilization / 100);
    const amountToPay = totalBalance - optimalBalance;

    return cards.map((card) => {
      const targetBalance = card.limit * (optimalUtilization / 100);
      const payment = Math.max(0, card.balance - targetBalance);
      return { ...card, payment, targetBalance };
    });
  };

  const projectedScoreIncrease = Math.min(
    50,
    Math.floor((currentUtilization - optimalUtilization) * 1.2)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/credit-builder"
            className="text-sm text-yellow-600 hover:text-yellow-700 mb-2 inline-block"
          >
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Credit Utilization Optimizer
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Optimize your credit card balances for maximum score impact
          </p>
        </div>
      </div>

      {/* Score Impact Banner */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {currentUtilization.toFixed(1)}%
              </div>
              <div className="text-sm text-yellow-100">Current Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {optimalUtilization}%
              </div>
              <div className="text-sm text-yellow-100">Optimal Target</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                +{projectedScoreIncrease}
              </div>
              <div className="text-sm text-yellow-100">
                Potential Points Gained
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Overall Utilization
            </h2>
            <span
              className={`px-4 py-2 rounded-full font-semibold ${
                currentUtilization < 30
                  ? 'bg-green-100 text-green-700'
                  : currentUtilization < 50
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {currentUtilization < 30
                ? 'Excellent'
                : currentUtilization < 50
                  ? 'Fair'
                  : 'Needs Improvement'}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                ${totalBalance.toLocaleString()} / $
                {totalLimit.toLocaleString()}
              </span>
              <span className="text-lg font-bold">
                {currentUtilization.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${
                  currentUtilization < 30
                    ? 'bg-green-500'
                    : currentUtilization < 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, currentUtilization)}%` }}
              ></div>
              <div className="absolute top-0 left-[30%] w-0.5 h-4 bg-gray-400"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span className="text-green-600 font-semibold">30% (Ideal)</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Balance</div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalBalance.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">
                Total Credit Limit
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalLimit.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Available Credit</div>
              <div className="text-2xl font-bold text-green-600">
                ${(totalLimit - totalBalance).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Per-Card Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Per-Card Utilization
          </h2>

          <div className="space-y-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className="border-2 border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {card.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ${card.balance.toLocaleString()} / $
                      {card.limit.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full font-semibold ${
                      card.status === 'good'
                        ? 'bg-green-100 text-green-700'
                        : card.status === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {card.utilization.toFixed(1)}%
                  </div>
                </div>

                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        card.status === 'good'
                          ? 'bg-green-500'
                          : card.status === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, card.utilization)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Adjust Balance
                    </label>
                    <span className="text-sm text-gray-600">
                      ${card.balance.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={card.limit}
                    step="50"
                    value={card.balance}
                    onChange={(e) =>
                      updateCardBalance(card.id, parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                AI-Powered Recommendations
              </h2>
              <p className="text-gray-700">
                Optimized payment strategy to maximize your credit score
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {getOptimalDistribution()
              .filter((card) => card.payment > 0)
              .map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-lg p-4 border-2 border-blue-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {card.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Current: ${card.balance.toLocaleString()} (
                        {card.utilization.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        Pay ${card.payment.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        → ${card.targetBalance.toFixed(0)} (10%)
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2 text-sm">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">
                      Impact: +{Math.floor((card.utilization - 10) / 3)} points
                    </span>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-6 bg-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-900 font-medium">
                  Total Payment Needed
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  $
                  {getOptimalDistribution()
                    .reduce((sum, card) => sum + card.payment, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-900 font-medium">
                  Projected Score Increase
                </div>
                <div className="text-2xl font-bold text-green-600">
                  +{projectedScoreIncrease}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Budget Planner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Monthly Payment Plan
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Budget for Credit Cards
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-2xl font-bold text-gray-900 w-32 text-right">
                ${monthlyBudget}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Distribution Strategy
            </h3>

            <div className="space-y-3">
              {cards.map((card) => {
                const minPayment = Math.max(25, card.balance * 0.02);
                const remaining =
                  monthlyBudget -
                  cards.reduce(
                    (sum, c) => sum + Math.max(25, c.balance * 0.02),
                    0
                  );
                const extraPayment =
                  card.utilization > 30
                    ? Math.min(remaining, card.balance - card.limit * 0.3)
                    : 0;

                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between py-2 border-b border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {card.name}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        ${(minPayment + extraPayment).toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600">
                        ${minPayment.toFixed(0)} min + $
                        {extraPayment.toFixed(0)} extra
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-gray-300 flex items-center justify-between">
              <span className="font-semibold text-gray-900">
                Total Monthly Payment
              </span>
              <span className="text-xl font-bold text-blue-600">
                ${monthlyBudget}
              </span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Utilization Tips
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Pay Before Statement
                </h3>
                <p className="text-sm text-gray-600">
                  Make payments before your statement closes to lower reported
                  balance
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Request Limit Increases
                </h3>
                <p className="text-sm text-gray-600">
                  Higher limits with same balance = lower utilization
                  automatically
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Spread Out Purchases
                </h3>
                <p className="text-sm text-gray-600">
                  Distribute spending across cards to keep individual
                  utilization low
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Keep Old Cards Open
                </h3>
                <p className="text-sm text-gray-600">
                  Zero balance on old cards helps overall utilization ratio
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
