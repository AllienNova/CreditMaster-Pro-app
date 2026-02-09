'use client';


import { Icon } from '@/components/ui/Icon';
/**
 * Credit Mix Analyzer
 *
 * Analyzes and optimizes credit account diversity.
 * Helps users understand ideal mix of installment and revolving credit.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface AccountType {
  name: string;
  current: number;
  ideal: number;
  icon: string;
  color: string;
}

interface Recommendation {
  type: string;
  product: string;
  description: string;
  impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeline: string;
  provider?: string;
  link?: string;
}

export default function CreditMixPage() {
  const { user, loading: authLoading } = useAuth();
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([
    { name: 'Credit Cards', current: 2, ideal: 3, icon: "credit-card", color: 'bg-blue-500' },
    { name: 'Installment Loans', current: 1, ideal: 2, icon: "banknotes", color: 'bg-blue-500' },
    { name: 'Mortgage', current: 0, ideal: 1, icon: "home", color: 'bg-green-500' },
    { name: 'Auto Loan', current: 0, ideal: 1, icon: "truck", color: 'bg-red-500' },
    { name: 'Student Loan', current: 0, ideal: 0, icon: "academic-cap", color: 'bg-yellow-500' },
  ]);

  const totalCurrent = accountTypes.reduce((sum, type) => sum + type.current, 0);
  const totalIdeal = accountTypes.reduce((sum, type) => sum + type.ideal, 0);
  const mixScore = totalIdeal === 0 ? 0 : Math.min(100, Math.round((totalCurrent / totalIdeal) * 100));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  const recommendations: Recommendation[] = [
    {
      type: 'add_revolving',
      product: 'Secured Credit Card',
      description: 'Add another revolving account to improve diversity',
      impact: 12,
      difficulty: 'easy',
      timeline: '2 weeks',
      provider: 'Discover, Capital One',
      link: '/credit-builder/secured-card',
    },
    {
      type: 'add_installment',
      product: 'Credit Builder Loan',
      description: 'Add an installment loan to balance your credit mix',
      impact: 15,
      difficulty: 'easy',
      timeline: '1 month',
      provider: 'Self, MoneyLion',
      link: '/credit-builder/loan',
    },
    {
      type: 'add_installment',
      product: 'Personal Loan',
      description: 'Personal installment loan improves mix diversity',
      impact: 18,
      difficulty: 'medium',
      timeline: '1-2 weeks',
      provider: 'SoFi, Marcus',
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200';
    }
  };

  const updateAccountCount = (index: number, newCount: number) => {
    const updated = [...accountTypes];
    updated[index].current = Math.max(0, Math.min(10, newCount));
    setAccountTypes(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/credit-builder" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Credit Builder
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Credit Mix Analyzer</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Optimize your portfolio diversity for maximum score impact
          </p>
        </div>
      </div>

      {/* Score Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{mixScore}</div>
              <div className="text-sm text-blue-100">Mix Diversity Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{totalCurrent} / {totalIdeal}</div>
              <div className="text-sm text-blue-100">Current vs Ideal Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">+{recommendations.reduce((sum, rec) => sum + rec.impact, 0)}</div>
              <div className="text-sm text-blue-100">Potential Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Why Credit Mix Matters</h2>
              <p className="text-gray-700 dark:text-slate-200 mb-4">
                Credit mix accounts for 10% of your FICO score. Having a diverse mix of credit types
                (revolving credit like credit cards AND installment loans) shows lenders you can
                responsibly manage different types of credit.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Revolving Credit</h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Credit cards</li>
                    <li>• Lines of credit</li>
                    <li>• Home equity lines (HELOC)</li>
                    <li>• No fixed payment, variable balance</li>
                  </ul>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Installment Credit</h3>
                  <ul className="text-sm text-gray-700 dark:text-slate-200 space-y-1">
                    <li>• Mortgages</li>
                    <li>• Auto loans</li>
                    <li>• Personal loans</li>
                    <li>• Fixed payment, decreasing balance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Mix Visualization */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Credit Mix</h2>

          <div className="space-y-6">
            {accountTypes.map((type, index) => (
              <div key={type.name} className="border-2 border-gray-200 dark:border-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center`}>
                      <Icon name={type.icon} className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{type.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        {type.current} account{type.current !== 1 ? 's' : ''} (Ideal: {type.ideal})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateAccountCount(index, type.current - 1)}
                      className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="w-12 text-center text-xl font-bold text-gray-900 dark:text-white">{type.current}</span>
                    <button
                      onClick={() => updateAccountCount(index, type.current + 1)}
                      className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-slate-300 mb-2">Current</div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                      <div
                        className={`${type.color} h-3 rounded-full transition-all`}
                        style={{ width: `${(type.current / Math.max(type.current, type.ideal, 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-slate-300 mb-2">Ideal</div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${(type.ideal / Math.max(type.current, type.ideal, 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Current Mix */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Current Mix</h3>
            <div className="space-y-3">
              {accountTypes.map((type) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon name={type.icon} className="w-5 h-5 inline-block" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{type.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`${type.color} h-2 rounded-full`}
                        style={{ width: `${(type.current / totalCurrent || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8">{type.current}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ideal Mix */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Ideal Mix</h3>
            <div className="space-y-3">
              {accountTypes.map((type) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon name={type.icon} className="w-5 h-5 inline-block" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{type.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(type.ideal / totalIdeal) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white w-8">{type.ideal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">AI-Powered Recommendations</h2>

          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{rec.product}</h3>
                    <p className="text-sm text-gray-700 dark:text-slate-200">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">+{rec.impact}</div>
                    <div className="text-xs text-gray-600 dark:text-slate-300">points</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white dark:bg-slate-800 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">Timeline</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{rec.timeline}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">Difficulty</div>
                    <div className={`text-sm font-bold ${getDifficultyColor(rec.difficulty)} px-2 py-1 rounded capitalize inline-block`}>
                      {rec.difficulty}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded p-3">
                    <div className="text-xs text-gray-600 dark:text-slate-300">Impact</div>
                    <div className="text-sm font-bold text-green-600">+{rec.impact} pts</div>
                  </div>
                  {rec.provider && (
                    <div className="bg-white dark:bg-slate-800 rounded p-3">
                      <div className="text-xs text-gray-600 dark:text-slate-300">Providers</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{rec.provider}</div>
                    </div>
                  )}
                </div>

                {rec.link ? (
                  <Link
                    href={rec.link}
                    className="block w-full py-2 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Explore Options →
                  </Link>
                ) : (
                  <button className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Learn More
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Guide */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Credit Mix Strategy</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              <div className="text-3xl mb-3"></div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Beginner Strategy</h3>
              <p className="text-sm text-gray-700 dark:text-slate-200 mb-4">
                Start with 2-3 credit cards and 1 credit builder loan
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600"></span>
                  <span>Low risk, easy to manage</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600"></span>
                  <span>Builds foundation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600"></span>
                  <span>+20-30 point impact</span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="text-3xl mb-3"></div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Intermediate Strategy</h3>
              <p className="text-sm text-gray-700 dark:text-slate-200 mb-4">
                3+ credit cards, 1-2 installment loans, consider auto loan
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600"></span>
                  <span>Balanced portfolio</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600"></span>
                  <span>Moderate management</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600"></span>
                  <span>+30-40 point impact</span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="text-3xl mb-3"></div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Advanced Strategy</h3>
              <p className="text-sm text-gray-700 dark:text-slate-200 mb-4">
                Full mix: cards, installment loans, mortgage, diversified
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-200">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600"></span>
                  <span>Optimal diversity</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600"></span>
                  <span>Requires discipline</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600"></span>
                  <span>+40-50 point impact</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Important Note</h4>
                <p className="text-sm text-yellow-800">
                  Don't open accounts just for credit mix. Only get credit you actually need and can manage responsibly.
                  Quality matters more than quantity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
